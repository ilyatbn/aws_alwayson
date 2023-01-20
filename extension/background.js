const googleSsoRegex = /name="SAMLResponse" value="([\s\S]+?)"/i;
const accountSelectionRegex = `tabindex="\\d" jsname="\\S\*" data-authuser="(-?\\d)" data-identifier="(\\S\*@DOMAIN)"`;
const stsTokenRegex = /<(AccessKeyId)>(\S+)<\/|<(SecretAccessKey)>(\S+)<\/|<(SessionToken)>(\S+)<\/|<(Expiration)>(\S+)<\//i
const samlFetchErrorRegex = /var problems = {"main": "([\S\s]+)"};/i
const roleParseRegex = /id="arn:aws:iam::([\S]+)"/
const googleAccountChooserUrl = 'https://accounts.google.com/AccountChooser'
const awsSamlUrl = 'https://signin.aws.amazon.com/saml'
const awsStsUrl = 'https://sts.amazonaws.com'
const arnPrefix = 'arn:aws:iam::'
const googleSsoUrl = 'https://accounts.google.com/o/saml2/initsso?idpid=IDPID&spid=SPID&forceauthn=false&authuser='
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

const storage = getApi().storage.local

function getApi() {
  if (typeof chrome !== "undefined") {
    if (typeof browser !== "undefined") {
      return browser;
    } else {
      return chrome;
    }
  }
}

class portWithExceptions {
    constructor(port) {
        this.postMessage = function (message) {
            try{
                port.postMessage(message)
            } catch(err) {
                console.log(`Error while posting message back to menu. ${err}`)
            } finally {
                storage.set({'last_msg_detail':message})
            }
        };
        this.postError = function (message) {
            try{
                port.postMessage(`err: ${message}`)
                console.error(message)
            } catch(err) {
                console.log(`Error while posting message back to menu. ${err}`)
            } finally {
                storage.set({'last_msg':'err','last_msg_detail':message})
            }
        };        
    }
}

getApi().runtime.onStartup.addListener(function() {
    storage.get(null, function(props) {
        if (props['autofill']===undefined) storage.set({"autofill":0})
        if (props['autofill']==1) {
            awsInit(props, null, 'role_refresh')
        }
        if (confCheck(props)) awsInit(props)
    })
})

getApi().alarms.onAlarm.addListener(function( alarm ) {
    storage.get(null, function(props) {
        awsInit(props);
    })
});

async function main() {
    getApi().runtime.onConnect.addListener(function(port) {
        let portEx = new portWithExceptions(port);
        port.onMessage.addListener(async function(msg) {
            //Stop all background schedule jobs.
            if (msg==='refreshoff'){
                storage.set({'checked':0});
                getApi().alarms.clear("refreshToken");
            }
            //Start background role refresh
            if (msg==='refreshon')
            {
                storage.get(null, function(props) {
                    if(confCheck(props)){
                        getApi().alarms.create('refreshToken', { periodInMinutes: parseInt(props.refresh_interval) });
                        awsInit(props, portEx);
                    } else {
                        portEx.postError("One or more option isn't configured properly.")
                    }
                })
            }
            //Start role refresh
            if (msg=='role_refresh') {
                storage.get(null, function(props){
                    if (confCheck(props)) awsInit(props, portEx, msg)
                })
            }
        });
    });    
}

main()

function confCheck(props){
    if((props['organization_domain']||props['google_idpid']||props['google_spid']) === ''){
        return false
    }
    return true
}

function errHandler(port, msg){
    if (port) {
        port.postError(msg);
    } else {
        console.error(msg);
        storage.set({'last_msg':'err','last_msg_detail':msg});
    }
}

function refreshAwsTokensAndStsCredentials(props,port,samlResponse){
    let role = props[props.checked]
    let roleArn=arnPrefix+role
    let awsAccount=(roleArn.split(":"))[4]
    let principalArn=`${arnPrefix}${awsAccount}:saml-provider/${props.saml_provider}`
    let data = "RelayState=&SAMLResponse="+encodeURIComponent(samlResponse)+"&name=&portal=&roleIndex="+encodeURIComponent(roleArn);
    fetch(awsSamlUrl, {
        method: "POST",
        body: data,
        headers: requestHeaders
    }).then(response => response.text())
    .then((response) => {
        let errorCheck=response.match(samlFetchErrorRegex)
        if (errorCheck){
            let msg = `SAML fetch reponse returned error: ${errorCheck[1]}`
            throw msg
        } else {
            let date = new Date().toLocaleString();
            console.log(`AWS AlwaysON refreshed tokens successfuly at ${date}`);
            fetchSts(roleArn, principalArn, samlResponse, props, port)
        }
    }).catch((error) => {
        let msg = `Error in SAML fetch:${error}`
        errHandler(port, msg)
    });
}

function refreshAwsRoles(port,samlResponse){
    let data = "RelayState=&SAMLResponse="+encodeURIComponent(samlResponse)
    fetch(awsSamlUrl, {
        method: "POST",
        body: data,
        headers: requestHeaders
    }).then(response => response.text())
    .then((response) => {
        let errorCheck=response.match(samlFetchErrorRegex)
        if (errorCheck){
            let msg = `SAML fetch reponse returned error: ${errorCheck[1]}`
            throw msg
        } else {
            let i=0
            const parseGlobal = RegExp(roleParseRegex, 'g');
            let matches
            while ((matches = parseGlobal.exec(response)) !== null) {
                storage.set({[`role${i}`] : matches[1]})
                ++i
            }
            storage.set({'roleCount': i})
            if (port) port.postMessage('roles_refreshed')
        }
    }).catch((error) => {
        let msg = `Error in SAML fetch:${error}`
        errHandler(port, msg)
    });
}

function awsInit(props, port=null, jobType='refresh'){
    fetch(googleAccountChooserUrl).then(response=> {
        response.text().then(accounts=> {
            var re = new RegExp(accountSelectionRegex.replace("DOMAIN",props.organization_domain),"i");
            let accountData = accounts.match(re)
            if(accountData===null){
                let msg = `Organization domain not found. Please check that you have a Google Account with that domain name logged in.`
                throw msg
            }
            let accountIndex = accountData[1]
            if(accountIndex==-1){
                let msg = `${accountData[2]} is not logged in. Please login and try again.`
                throw msg
            }
            console.log(`Refreshing credentials for ${accountData[2]}`)
            fetch(`${googleSsoUrl.replace('IDPID',props.google_idpid).replace('SPID',props.google_spid)}${accountIndex}`).then(response => {   
                response.text().then(result => {
                    let samlResponse=result.match(googleSsoRegex)[1]
                    switch (jobType) {
                        case 'role_refresh':
                            refreshAwsRoles(port, samlResponse)
                          break;
                        default:
                            refreshAwsTokensAndStsCredentials(props, port, samlResponse)
                    }
                }).catch((error) => {
                    let msg = `Error processing SSO URL:${error}`
                    errHandler(port, msg)
                });
            }).catch((error) => {
                let msg = `Error fetching SSO URL:${error}`
                errHandler(port, msg)
            });
        }).catch((error) => {
            let msg = `Error processing Google account chooser data:${error}`
            errHandler(port, msg)
        });
    }).catch((error) => {
        let msg = `Error finding Google account:${error}`
        errHandler(port, msg)
    });
};

function fetchSts(roleArn, principalArn, samlResponse, props, port){
    let STSUrl = `${awsStsUrl}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(samlResponse.trim())}&AUTHPARAMS&DurationSeconds=${props.session_duration}`
    fetch(STSUrl, {
        method: "GET",
        headers: requestHeaders
    }).then((response) => response.text()).then((data) => {
        const parseGlobal = RegExp(stsTokenRegex, 'g');
        let matches
        while ((matches = parseGlobal.exec(data)) !== null) {
            matches = matches.filter(function (i) {
                return i != null;
            });
            console.log(matches)
            storage.set({[`aws${matches[1]}`] : matches[2]})
        }
        storage.set({'last_msg':'success'});
        if (port) port.postMessage('sts_ready');
    }).catch((error) => {
        let msg = `Error getting STS credentials:${error}`
        errHandler(port, msg)
    });
}
