import { sget, sset }  from './storageapi.js';

const samlRegex = /name="SAMLResponse" value="([\s\S]+?)"/i;
const accountSelectionRegex = `tabindex="\\d" jsname="\\S\*" data-authuser="\\d" data-identifier="(\\S\*@DOMAIN)" data-item-index="(\\S)"`;
const google_account_chooser_url = 'https://accounts.google.com/AccountChooser'
const aws_saml_url = 'https://signin.aws.amazon.com/saml'
const aws_sts_url = 'https://sts.amazonaws.com'
const arn_prefix = 'arn:aws:iam::'
const google_sso_url = 'https://accounts.google.com/o/saml2/initsso?idpid=IDPID&spid=SPID&forceauthn=false&authuser='

var alarms = chrome.alarms;
var props,role;

async function main() {
    chrome.extension.onConnect.addListener(function(port) {
        port.onMessage.addListener(async function(msg) {
            console.log('received '+msg)
            if (msg==='syncoff'){
                console.log('turning off sync');
                sset({'checked':'0'});
                alarms.clear("refreshToken");
                alarms.onAlarm.removeListener(refreshAwsTokensInit);
                port.postMessage("OK");
            }
            if (msg==='syncon')
            {
                props = await sget(['checked','role_one','role_two','refresh_interval'
                ,'google_spid','google_idpid','organization_domain', 'session_duration']);
                if (props.checked === '1'){role = props.role_one;} else{role = props.role_two;}
                alarms.create('refreshToken', { periodInMinutes: parseInt(props.refresh_interval) });
                
                chrome.alarms.onAlarm.addListener(function( alarm ) {
                    refreshAwsTokensInit();
                });
                refreshAwsTokensInit();
            }
        });
    });    
}
main()


  function refreshAwsTokensInit(){
    fetch(google_account_chooser_url).then(response=> {
        response.text().then(accounts=> {
            var re = new RegExp(accountSelectionRegex.replace("DOMAIN",props.organization_domain),"i");
            console.log(`Refreshing credentials for ${accounts.match(re)[1]}`)
            let accountIndex = accounts.match(re)[2]
            fetch(`${google_sso_url.replace('IDPID',props.google_idpid).replace('SPID',props.google_spid)}${accountIndex}`).then(response => {   
                response.text().then(result => {
                    let SAMLReponse=result.match(samlRegex)[1]
            
                    let roleArn=arn_prefix+role
                    let awsAccount=(roleArn.split(":"))[4]
                    let principalArn=`${arn_prefix}${awsAccount}:saml-provider/gsuite`
                    let data = "RelayState="+"&SAMLResponse="+encodeURIComponent(SAMLReponse)+"&name=&portal=&roleIndex="+encodeURIComponent(roleArn);
                    fetch(aws_saml_url, {
                        method: "POST",
                        body: data,
                        headers: {
                            "Upgrade-Insecure-Requests": "1",
                            "Cache-Control": "max-age=0",
                            "Content-Type": "application/x-www-form-urlencoded",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                        +"(KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
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
            
                    //GET STS Credentials
                    let STSUrl = `${aws_sts_url}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(SAMLReponse.trim())}&AUTHPARAMS&DurationSeconds=${props.session_duration}`
                    fetch(STSUrl, {
                        method: "GET",
                        headers: {
                            "Upgrade-Insecure-Requests": "1",
                            "Cache-Control": "max-age=0",
                            "Content-Type": "application/x-www-form-urlencoded",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                        +"(KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,"+
                                    "image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                            "Sec-GPC": "1",
                            "Sec-Fetch-Site": "cross-site",
                            "Sec-Fetch-Mode": "navigate",
                            "Sec-Fetch-Dest": "document",
                            "Accept-Encoding": "gzip, deflate, br",
                            "Accept-Language": "en-US,en;q=0.9"
                        }
                    }).then(r => r.text()).then(str => new window.DOMParser().parseFromString(str, "text/xml")).then(result => {
                        let accessKeyId=result.getElementsByTagName("AccessKeyId")[0].innerHTML
                        let secretAccessKey=result.getElementsByTagName("SecretAccessKey")[0].innerHTML
                        let sessionToken=result.getElementsByTagName("SessionToken")[0].innerHTML
                        let sessionExpiration=result.getElementsByTagName("Expiration")[0].innerHTML
                        let stsToken = `export AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} AWS_SESSION_TOKEN=${sessionToken} AWS_SESSION_EXPIRATION=${sessionExpiration}`
                        sset({'aws_sts_token':stsToken})
                    });
                });
            });
        });
    });
  };


