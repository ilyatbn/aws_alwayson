const googleSsoRegex = /name="SAMLResponse" value="([\s\S]+?)"/i;
const accountSelectionRegex = `tabindex="\\d" jsname="\\S\*" data-authuser="(\\d)" data-identifier="(\\S\*@DOMAIN)"`;
const stsTokenRegex = /<AccessKeyId>(\S+)<.*\n.*<SecretAccessKey>(\S+)<.*\n.*<SessionToken>(\S+)<.*\n.*<Expiration>(\S+)</i
const samlFetchErrorRegex = /var problems = {"main": "([\S\s]+)"};/i
const googleAccountChooserUrl = 'https://accounts.google.com/AccountChooser'
const awsSamlUrl = 'https://signin.aws.amazon.com/saml'
const awsStsUrl = 'https://sts.amazonaws.com'
const arnPrefix = 'arn:aws:iam::'
const googleSsoUrl = 'https://accounts.google.com/o/saml2/initsso?idpid=IDPID&spid=SPID&forceauthn=false&authuser='
const storage = chrome.storage.local
const requestHeaders = {
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
    "Content-Type": "application/x-www-form-urlencoded",    
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,"+
            "image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Sec-GPC": "1",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Dest": "document",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9"
}


class portWithExceptions {
    constructor(port) {
        this.postMessage = function (message) {
            try{
                port.postMessage(message)
            } catch(err) {
                console.log(`Error while posting message back to menu. ${err}`)
            }
        };
    }
}

chrome.runtime.onStartup.addListener(function() {
    storage.get(null, function(props) {
        refreshAwsTokensInit(props);
    })
})

chrome.alarms.onAlarm.addListener(function( alarm ) {
    storage.get(null, function(props) {
        refreshAwsTokensInit(props);
    })
});

async function main() {
    chrome.runtime.onConnect.addListener(function(port) {
        let portEx = new portWithExceptions(port);
        port.onMessage.addListener(async function(msg) {
            console.log('received '+msg)
            if (msg==='refreshoff'){
                console.log('turning off background refresh');
                storage.set({'checked':'0'});
                chrome.alarms.clear("refreshToken");
            }
            if (msg==='refreshon')
            {
                storage.get(null, function(props) {
                    chrome.alarms.create('refreshToken', { periodInMinutes: parseInt(props.refresh_interval) });
                    refreshAwsTokensInit(props, portEx);
                })

            }
        });
    });    
}
main()

function refreshAwsTokensInit(props, port=null){
    fetch(googleAccountChooserUrl).then(response=> {
        response.text().then(accounts=> {
            var re = new RegExp(accountSelectionRegex.replace("DOMAIN",props.organization_domain),"i");
            console.log(`Refreshing credentials for ${accounts.match(re)[2]}`)
            let accountIndex = accounts.match(re)[1]
            fetch(`${googleSsoUrl.replace('IDPID',props.google_idpid).replace('SPID',props.google_spid)}${accountIndex}`).then(response => {   
                response.text().then(result => {
                    let SAMLReponse=result.match(googleSsoRegex)[1]                    
                    let role = props[props.checked]
                    let roleArn=arnPrefix+role
                    let awsAccount=(roleArn.split(":"))[4]
                    let principalArn=`${arnPrefix}${awsAccount}:saml-provider/gsuite`
                    let data = "RelayState=&SAMLResponse="+encodeURIComponent(SAMLReponse)+"&name=&portal=&roleIndex="+encodeURIComponent(roleArn);
                    fetch(awsSamlUrl, {
                        method: "POST",
                        body: data,
                        headers: requestHeaders
                    }).then(response => response.text())
                    .then((response) => {
                        let errorCheck=response.match(samlFetchErrorRegex)
                        if (errorCheck){
                            console.error('Error in saml fetech:', errorCheck[1]);
                            storage.set({'last_msg':'saml_err'});
                            if (port) port.postMessage('saml_err');
                        } else {
                            let date = new Date().toLocaleString();
                            console.log(`AWS AlwaysON refreshed tokens successfuly at ${date}`);
                            fetchSts(roleArn, principalArn,SAMLReponse, props, port)
                        }
                    });
                }).catch((error) => {
                    storage.set({'last_msg':'sso_process_err'});
                    if (port) port.postMessage('sso_process_err');
                    console.error('Error processing sso url:', error);
                });
            }).catch((error) => {
                storage.set({'last_msg':'sso_fetch_err'});
                console.error('Error fetching sso url:', error);
                if (port) port.postMessage('sso_fetch_err');
            });
        });
    }).catch((error) => {
        storage.set({'last_msg':'account_chooser_err'});
        console.error('Error finding google account:', error);
        if (port) port.postMessage('account_chooser_err');
    });;
};


function fetchSts(roleArn, principalArn,SAMLReponse, props, port){
    let STSUrl = `${awsStsUrl}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(SAMLReponse.trim())}&AUTHPARAMS&DurationSeconds=${props.session_duration}`
    fetch(STSUrl, {
        method: "GET",
        headers: requestHeaders
    }).then((response) => response.text()).then((data) => {
        data = data.match(stsTokenRegex)
        let accessKeyId=data[1]
        let secretAccessKey=data[2]
        let sessionToken=data[3]
        let sessionExpiration=data[4]
        let stsToken
        switch (props.platform.toLowerCase()) {
            case 'windows':
            case 'win32':
              stsToken = `set AWS_ACCESS_KEY_ID=${accessKeyId} && set AWS_SECRET_ACCESS_KEY=${secretAccessKey} && set AWS_SESSION_TOKEN=${sessionToken} && set AWS_SESSION_EXPIRATION=${sessionExpiration}`
              break;
            default:
              stsToken = `export AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} AWS_SESSION_TOKEN=${sessionToken} AWS_SESSION_EXPIRATION=${sessionExpiration}`
          }
        storage.set({'aws_sts_token':stsToken,'last_msg':'success'});
        if (port) port.postMessage('sts_ready');
    }).catch((error) => {
        storage.set({'last_msg':'sts_err'});
        if (port) port.postMessage('sts_err');
        console.error('Error gettings sts:', error);
    });
}
