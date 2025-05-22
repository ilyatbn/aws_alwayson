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
const credExtractors = {
    "google": googleWorkspaceExtractor,
    "awssso": awsSSOExtractor,
    "none": doNothing
}

// Add this flag to track tab processing state
let isProcessingTab = false;

function doNothing(){}

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


function confCheck(props){
    // validate relevant params for idp type
    console.log(`checking ${props['idp_type']}`)
    if (props['idp_type']==='google'){
        if((props['organization_domain']||props['google_idpid']||props['google_spid']) === ''){
            return false
        }
        return true
    } else if (props['idp_type']==='awssso'){
        if((props['awssso_subdomain']) === ''){
            return false
        }
        return true
    }
    // if nothing was selected, do not do anything
    return false
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


function refreshAwsRolesGoogleWorkspace(port,samlResponse){
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


function fetchSts(roleArn, principalArn, samlResponse, props, port){
    let STSUrl = `${awsStsUrl}/?Version=2011-06-15&Action=AssumeRoleWithSAML&RoleArn=${roleArn}&PrincipalArn=${principalArn}&SAMLAssertion=${encodeURIComponent(samlResponse.trim())}&AUTHPARAMS&DurationSeconds=${props.session_duration}`
    fetch(STSUrl, {
        method: "GET",
        headers: requestHeaders
    }).then((response) => response.text()).then((data) => {
        const parseGlobal = RegExp(stsTokenRegex, 'g');
        let matches
        let credobj = {}
        while ((matches = parseGlobal.exec(data)) !== null) {
            matches = matches.filter(function (i) {
                return i != null;
            });
            storage.set({[`aws${matches[1]}`] : matches[2]})
            credobj[`${matches[1]}`]=matches[2]
        }
        // update local client with the aws credentials
        if (props['clientupdate']) {
            updateLocalClientCreds(credobj, port)
        }

        storage.set({'last_msg':'success'});
        if (port) port.postMessage('sts_ready');
    }).catch((error) => {
        let msg = `Error getting STS credentials:${error}`
        errHandler(port, msg)
    });
}

function googleWorkspaceExtractor(props, port=null, jobType='refresh'){
    console.log("refreshing creds using Google Workspace")
    fetch(googleAccountChooserUrl).then(response=> {
        response.text().then(accounts=> {
            var re = new RegExp(accountSelectionRegex.replace("DOMAIN",props.organization_domain),"i");
            let accountData = accounts.match(re)
            if(accountData===null){
                let msg = `Organization domain not found. Please check that you have a Google Account with that domain name logged in.`
                throw msg
            }
            let accountIndex = accountData[1]
            if(accountIndex===-1){
                let msg = `${accountData[2]} is not logged in. Please login and try again.`
                throw msg
            }
            console.log(`Refreshing credentials for ${accountData[2]}`)
            fetch(`${googleSsoUrl.replace('IDPID',props.google_idpid).replace('SPID',props.google_spid)}${accountIndex}`).then(response => {   
                response.text().then(result => {
                    if(response.status===403) {
                        let msg = `Access denied from Google Workspace SSO URL. verify google workspace app is enabled for the account.`
                        throw msg
                    }
                    let samlResponse=result.match(googleSsoRegex)
                    if (samlResponse===null) {
                        let msg = `Could not parse SAMLResponse from google workspace SSO URL.`
                        throw msg
                    }
                    samlResponse=samlResponse[1]
                    switch (jobType) {
                        case 'role_refresh':
                            refreshAwsRolesGoogleWorkspace(port, samlResponse)
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
}

async function fetchSSOData(headers, region, port) {
    const baseURL = `https://portal.sso.${region}.amazonaws.com/instance`;

    // Fetch app instances
    const appInstancesResponse = await fetch(`${baseURL}/appinstances`, {
      method: "GET",
      headers: headers
    });
    const appInstancesData = await appInstancesResponse.json();
    
    // Create an array to store all roles with their account IDs
    let allRoles = [];
    
    // Iterate over each app instance
    for (const app of appInstancesData.result) {
      const accountId = app.searchMetadata.AccountId;
      const profilesResponse = await fetch(`${baseURL}/appinstance/${app.id}/profiles`, {
        method: "GET",
        headers: headers
      });
      const profilesData = await profilesResponse.json();
      
      // Add each role to the array with its account ID
      profilesData.result.forEach(profile => {
        allRoles.push({
          accountId: accountId,
          name: profile.name,
          roleString: `${accountId}:${profile.name}`
        });
      });
    }

    // Sort roles by accountId
    allRoles.sort((a, b) => a.accountId.localeCompare(b.accountId));

    // Store sorted roles in storage
    allRoles.forEach((role, index) => {
      storage.set({
        [`role${index}`]: role.roleString,
        [`role${index}_name`]: role.name,
        [`role${index}_acc`]: role.accountId,
      });
    });

    storage.set({'roleCount': allRoles.length});
    const now = new Date().toISOString();
    storage.set({'ssoLastRefresh': now});
    console.log(`sso refreshed at: ${now}`);
    if (port) port.postMessage('roles_refreshed');
}


function updateLocalClientCreds(creds, port){
    console.log("updating local client with new sts creds")
    let creds_str=JSON.stringify(creds)
    fetch("http://localhost:31339/update", {
        method: "POST",
        headers: {"Content-Type":"application/json", "Accept": "application/json"},
        body: creds_str
    }).then((response) => response.text()).then((data) => {
        if (data != "ok") {
            errHandler(port, data)
        }
    }).catch((error) => {
        let msg = `Error updating local client:${error}`
        errHandler(port, msg)
    });
}


async function extractAwsSSOToken(awssso_subdomain, port) {
    // Check if we're already processing a tab
    if (isProcessingTab) {
        console.log("Tab processing already in progress, skipping this request");
        if (port) port.postMessage('tab_already_processing');
        return;
    }

    let targetUrl = `https://${awssso_subdomain}.awsapps.com/start/`;
    let props = await storage.get(null)
    let sso_tab_visible = props.sso_tab_visible === "true"
    console.log("tab active:", sso_tab_visible)
    
    try {
        isProcessingTab = true;
        
        // Create a new tab using Chrome extension API
        const tab = await new Promise((resolve, reject) => {
            getApi().tabs.create({ url: targetUrl, active: sso_tab_visible }, (newTab) => {
                if (getApi().runtime.lastError) {
                    isProcessingTab = false;  // Reset flag on error
                    reject(new Error(getApi().runtime.lastError.message));
                } else {
                    resolve(newTab);
                }
            });
        });

        // Set up a timeout to reset the flag in case something goes wrong
        const timeoutId = setTimeout(() => {
            isProcessingTab = false;
            console.log("Tab processing timeout - resetting state");
        }, 30000); // 30 second timeout

        getApi().webRequest.onSendHeaders.addListener(
            (details) => {
                if (details.url.endsWith('/whoAmI')) {
                    console.log("whoAmI request intercepted")
                    const header = details.requestHeaders.find(h => h.name.toLowerCase() === 'x-amz-sso-bearer-token');
                    const header_auth = details.requestHeaders.find(h => h.name.toLowerCase() === 'authorization');
                    if (header||header_auth) {
                        console.log("found bearer token")
                        let headers = details.requestHeaders
                        let region = details.url.split(".")[2]
                        let headersObject = headers.reduce((acc, { name, value }) => {
                            acc[name] = value;
                            return acc;
                        }, {});    
                    
                        storage.set({ amz_hdr: headersObject });
                        storage.set({ amz_rgn: region });
                        fetchSSOData(headersObject, region, port)
                        getApi().tabs.remove(tab.id)
                        clearTimeout(timeoutId);  // Clear the timeout
                        isProcessingTab = false;  // Reset the flag after successful processing
                    }
                }
            },
            { urls: ["*://*.amazonaws.com/*"], tabId: tab.id },
            ["requestHeaders"]
        );

        // Add a listener for tab removal to reset the flag if the tab is closed manually
        getApi().tabs.onRemoved.addListener(function onTabRemoved(tabId) {
            if (tabId === tab.id) {
                isProcessingTab = false;
                clearTimeout(timeoutId);
                getApi().tabs.onRemoved.removeListener(onTabRemoved);
            }
        });

    } catch (error) {
        isProcessingTab = false;  // Reset flag on error
        let msg = `Error during fetch from awsapps.com: ${error}`
        errHandler(port, msg)
        console.error(`Error in browseAndTrackRedirects: ${error.message}`);
        throw error;
    }
}

async function getStsCredentialsFromAwsSSO(props, retry=false){
    console.log("getting STS creds from AWS SSO federation")
    let index=props.checked
    let accountId = props[`${index}_acc`]
    let role = props[`${index}_name`]
    let region = props.amz_rgn
    let headers=props.amz_hdr
    let baseUrl = `https://portal.sso.${region}.amazonaws.com/federation/credentials?account_id=${accountId}&role_name=${role}`
    // console.log(baseUrl)
    const credsResponse = await fetch(baseUrl, {
      method: "GET",
      headers: headers
    });
    const creds = await credsResponse.json();
    if (credsResponse.ok) {
      return creds.roleCredentials
    }
    else {
      console.log(`response from federation endpoint was not ok, ${creds.message}`)
      awsSSOExtractor(props, null, 'role_refresh')
      if (!retry) {
        console.log("retrying sts creds fetch")
        getStsCredentialsFromAwsSSO(props, retry=true)
      }
    }    
}

async function refreshAwsRolesAwsSSO(port) {
    let props = await storage.get(null)
    let creds=await getStsCredentialsFromAwsSSO(props)
    // console.log(creds)
    let credsObj = {
        "AccessKeyId": creds.accessKeyId,
        "SecretAccessKey": creds.secretAccessKey,
        "SessionToken": creds.sessionToken,
        "Expiration": creds.expiration.toString(),
    }
    // update local client with the aws credentials
    if (props['clientupdate']) {
        updateLocalClientCreds(credsObj, port)
    }    
    storage.set({'last_msg':'success'});
    if (port) {
        console.log(`port is ${port}`)
        port.postMessage('sts_ready');
    }
}


async function awsSSOExtractor(props, port=null, jobType='refresh'){
    console.log("refreshing creds using AWS SSO")
    // if no amz in local storage, do browseAndTrackRedirects.
    switch (jobType) {
        case 'role_refresh':
            extractAwsSSOToken(props['awssso_subdomain'], port)
            break;
        default:
            refreshAwsRolesAwsSSO(port)
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

// Handler for all alarms configured in "main"
getApi().alarms.onAlarm.addListener(function( alarm ) {
    storage.get(null, function(props) {
        if (alarm.name==='refreshToken'){
            console.log("token refresh alarm triggered")
            awsInit(props, null, 'refresh');
        }
        else if(alarm.name==='refreshSSO') {
            console.log("role refresh alarm triggered")
            awsInit(props, null, 'role_refresh');
        }
    })
});


function awsInit(props, port=null, jobType='refresh'){
    let idp_name = props['idp_type']||"none"
    const credExtractor = credExtractors[idp_name]
    credExtractor(props, port, jobType)
};


async function main() {
    getApi().runtime.onConnect.addListener(function(port) {
        let portEx = new portWithExceptions(port);
        port.onMessage.addListener(async function(msg) {
            let props = await storage.get(null)
            //Stop all background schedule jobs.
            if (msg==='refreshoff'){
                storage.set({'checked':0});
                getApi().alarms.clear("refreshToken");
            }
            //Start background role refresh
            if (msg==='refreshon')
            {
                if(confCheck(props)){
                    getApi().alarms.create('refreshToken', { periodInMinutes: parseInt(props.refresh_interval) });
                    awsInit(props, portEx);
                } else {
                    portEx.postError("One or more option isn't configured properly.")
                }
            }
            //Start role refresh
            if (msg=='role_refresh') {
                if (confCheck(props)) {
                    awsInit(props, portEx, msg)
                    if (props.idp_type === "awssso") {
                        console.log("creating alarm for role refresh")
                        getApi().alarms.create('refreshSSO', { periodInMinutes: parseInt(props.refresh_interval_sso) });
                    }
                }
            }
        });
    });
}

main()