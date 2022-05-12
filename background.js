
import { sset }  from './storageapi.js';

const samlRegex = /name="SAMLResponse" value="([\s\S]+?)"/i;
const accountSelectionRegex = `tabindex="\\d" jsname="\\S\*" data-authuser="(\\d)" data-identifier="(\\S\*@DOMAIN)"`;
const stsTokenRegex = /<AccessKeyId>(\S+)<.*\n.*<SecretAccessKey>(\S+)<.*\n.*<SessionToken>(\S+)<.*\n.*<Expiration>(\S+)</i
const googleAccountChooserUrl = 'https://accounts.google.com/AccountChooser'
const awsSamlUrl = 'https://signin.aws.amazon.com/saml'
const awsStsUrl = 'https://sts.amazonaws.com'
const arnPrefix = 'arn:aws:iam::'
const googleSsoUrl = 'https://accounts.google.com/o/saml2/initsso?idpid=IDPID&spid=SPID&forceauthn=false&authuser='

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.local.get(null, function(props) {
        refreshAwsTokensInit(props);
    })
})

chrome.alarms.onAlarm.addListener(function( alarm ) {
    chrome.storage.local.get(null, function(props) {
        refreshAwsTokensInit(props);
    })
});

async function main() {
    chrome.runtime.onConnect.addListener(function(port) {
        port.onMessage.addListener(async function(msg) {
            console.log('received '+msg)
            if (msg==='refreshoff'){
                console.log('turning off background refresh');
                sset({'checked':'0'});
                chrome.alarms.clear("refreshToken");
                port.postMessage("OK");
            }
            if (msg==='refreshon')
            {
                chrome.storage.local.get(null, function(props) {
                    chrome.alarms.create('refreshToken', { periodInMinutes: parseInt(props.refresh_interval) });
                    refreshAwsTokensInit(props, port);
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
                    let SAMLReponse=result.match(samlRegex)[1]
                    let role = props[props.checked]
                    let roleArn=arnPrefix+role
                    let awsAccount=(roleArn.split(":"))[4]
                    let principalArn=`${arnPrefix}${awsAccount}:saml-provider/gsuite`
                    let data = "RelayState="+"&SAMLResponse="+encodeURIComponent(SAMLReponse)+"&name=&portal=&roleIndex="+encodeURIComponent(roleArn);
                    fetch(awsSamlUrl, {
                        method: "POST",
                        body: data,
                        headers: {
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
                    }).then(result =>{
                        let date = new Date().toLocaleString();
                        console.log(`AWS AlwaysON refreshed tokens successfuly at ${date}`);
                    });
                    let STSUrl = `${awsStsUrl}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(SAMLReponse.trim())}&AUTHPARAMS&DurationSeconds=${props.session_duration}`
                    fetch(STSUrl, {
                        method: "GET",
                        headers: {
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
                    }).then((response) => response.text()).then((data) => {
                        data = data.match(stsTokenRegex)
                        let accessKeyId=data[1]
                        let secretAccessKey=data[2]
                        let sessionToken=data[3]
                        let sessionExpiration=data[4]
                        let platform = navigator?.userAgentData?.platform || navigator?.platform || 'unknown'
                        let stsToken
                        switch (platform) {
                            case 'Windows':
                              stsToken = `set AWS_ACCESS_KEY_ID=${accessKeyId} && set AWS_SECRET_ACCESS_KEY=${secretAccessKey} && set AWS_SESSION_TOKEN=${sessionToken} && set AWS_SESSION_EXPIRATION=${sessionExpiration}`
                              break;
                            default:
                              stsToken = `export AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} AWS_SESSION_TOKEN=${sessionToken} AWS_SESSION_EXPIRATION=${sessionExpiration}`
                          }
                          
                        sset({'aws_sts_token':stsToken});
                        if (port) port.postMessage('sts_ready');
                    }).catch((error) => {
                        console.error('Error:', error);
                    });
                });
            });
        });
    });
};


