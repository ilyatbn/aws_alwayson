import { sget, sset }  from './storageapi.js';

//move this to on install
sset({
     'google_sso_url':'https://accounts.google.com/o/saml2/initsso?idpid=abcde&spid=1234567&forceauthn=false',
     'aws_saml_url':'https://signin.aws.amazon.com/saml',
     'aws_sts_url': 'https://sts.amazonaws.com',
     'refresh_interval':55,
     'multi_account':0,
     'arn_prefix':'arn:aws:iam::'
});


const p_1 = /.*name="SAMLResponse" value="(.*=)"\/>/i;
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
                props = await sget(['checked','role_one','role_two','refresh_interval','arn_prefix'
                  ,'google_sso_url','multi_account','aws_saml_url','aws_sts_url']);
                if (props.checked === '1'){role = props.role_one;} else{role = props.role_two;}
                alarms.create('refreshToken', { periodInMinutes: props.refresh_interval });
                
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
    fetch(props.google_sso_url).then(r => r.text()).then(result => {
        if(props.multi_account==='1'){
            //if response is 302 to account chooser, parse data and find
            //identifier=".*@mycompany.io" data-item-index="(2)" > email_index
            //also find the as= from it. then pass it all to this bitch
            ***REMOVED***
        }
        let SAMLReponse=result.match(p_1)[1]

        let roleArn=props.arn_prefix+role
        let awsAccount=(roleArn.split(":"))[4]
        let principalArn=`${props.arn_prefix}${awsAccount}:saml-provider/gsuite`
        let data = "RelayState="+"&SAMLResponse="+SAMLReponse+"&name=&portal=&roleIndex="+encodeURIComponent(roleArn);
        fetch(props.aws_saml_url, {
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
        let STSUrl = `${props.aws_sts_url}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(SAMLReponse.trim())}&AUTHPARAMS`
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
            let stsToken = `export AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} AWS_SESSION_TOKEN=${sessionToken} AWS_SESSION_EXPIRATATION=${sessionExpiration}`
            sset({'aws_sts_token':stsToken})
        })
    });
  };


