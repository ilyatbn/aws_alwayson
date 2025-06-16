# AWS AlwaysON  

## Introduction
AWS AlwaysON is a browser extension that helps users stay connected to AWS, both in the web browser and CLI.

This extension can be used as an alternative to `aws-google-auth` and doesn't require inputing credentials as long as your Google account is logged in, nor does it suffer from constant Captcha.  
The extension was developed for Chrome but works mostly fine on all major browsers except Safari which was untested.  

## Supported providers
- Google Workspace as an IDP provier to AWS, 
- AWS SSO with any IDP Provider (Only Google was tested)

## Features
- Refresh AWS Web Console session automatically to keep user logged in. 
- Get temporary credentials for assumed role (STS) to use for CLI access.
- Automatically update local aws credentials file using provded clients.


## How it works

This is quite easy, we fetch the data the exact same way the user would if they clicked the AWS button, then "capture" the relevant data.


### Google Workspace

Google Workspace sign in is simple and deterministic. 
You provide the Identity Provider ID (IDPID) and Service provider ID(SPID) of your "SAML App" in Google Workspace, and the SAML provider name as you configured it in AWS, and it automatically performs the relevant URL fetches exactly the same way Google does it when clicking the link from within the list of "Google Apps".  
After capturing the correct SAMLResponse token, we use AWS STS API's AssumeRoleWithSAML action to receive STS credentials to AWS.

- Supports only Google Workspace in a very specific SAML implementation.
- Works on a single role at a time.
- Fully seamless and automated. Works flawlessly.

### AWS SSO

AWS SSO works differently since the initial SSO is done from AWS itself, not from Google. This unfortunately introduced several complications due to AWS fetching data using some obfuscated javascript files with several different tokens after many, many redirects.  
This is why we went with a simpler method of browsing to the SSO url using a newly created tab, and extracting relevant data from there.  
This does work in a non deterministic way unfortunately. We've noticed several instances where opening this tab got stuck and required manually closing it and manually restarting the scheduling button.  
This also brought complications with how the automatic refresh works. We used Chrome's alarms with a timer, but if your computer is alseep, this did not stop the timers, causing many many tabs to open when you open the brower. We did not find a satisfactory solution for this, and switched to event triggers. Right now, in order for a new tab to open, the user must manually interact with the browser. It's not a serious issues since we expect users to go to their browser at elast once in a few hours timeframe, but still not perfect since it cannot work 100% of the time unattended.

- AWS SSO theoretically Supports all IDPs, not only Google, but we haven't tested it. If you want to use it, there's an option to add a custom domain (for extension permissions).
- AWS SSO is a global sign in. Meaning, after enabling it, all your accounts will have buttons to get STS credentials, as well as a link to open the Web Console.
- We kept the per-account toggles to activate the automatic client STS updates for that specific account (as default credentials in aws cli)
- AWS SSO works with fine Multi Session Web Console. 
- Works in a semi-automatic way. Requires the user to perform any form of interaction with the browser to open a new tab in order to extract new credentials.

## Installation

\* Should technically work with any chromium based browser.
 **Google Chrome:**  
Clone this repository.  
Go to the Chrome Extensions page.  
Enable Developer Mode on the right side of the page.  
Press "Load Unpacked".  
Pick the project folder.  


![Options](img/opts_main.png)  
When you are done, exit the Options menu.  
Now you can either add your user's IAM roles manually or click the blue clock button to fetch them automatically.   
**With AWS SSO, clicking the clock button is mandatory since it also acts as a scheduler to get credentials.**  
![Main menu](img/main.png)  

Click on the slider button to start the token and client auto refresh procedure.   
**With AWS SSO, this only acts as a client token refresh since all roles are globally loaded and refreshed using the clock button.**  

After enabling the refresh you can also click on the CLI button to get the temporary STS credentials.  
**With AWS SSO, you have a button to open the AWS Web Console.**
### Updater Service installation
The credentials updater service runs a minimalistic webserver on 127.0.0.1:31339 that listens requests for updates from the extension. 
To enabled this feature, click the toggle in the Options menu.  

#### Golang based service:
Pros:
- No need for extra software. Runs natively on both Windows and Linux.  
- Supports credentials updates multiple users connected to a machine concurrently.  

Cons:  
- A highly privileged account is required to run with multi-user support.

`Tested on Windows 11 22H2 and Ubuntu 20.04LTS`  
```
cd awsao
go build
sudo install.sh / install.cmd (elevated cmd shell)
```
- logs requests to a log file, located in **/var/log/aosvc.log** or **c:\ProgramData\aosvc\aosvc.log**. If run manually in windows, will create the log in the same directory it's run from.


#### Python based service
Pros:  
- Does not require privileged accounts to run.
- Easier to develop cross OS compatibility. This should theoretically run on anything that runs Python.   

Cons:  
- Requires an installation of Python.
- Cannot run on multiple user accounts logged into a machine.

More info [here](/aosvc-python/README.md).

`Currenly only Linux is officially supported.`  

## Changelog:
Full changelog is available [here](/changelog.md).  
## Compatibility:
Tested and working on:  
Chrome - v137  
Brave - v1.77


## Known issues:  
- Firefox was dropped due to their annoying MV3 optional permissions not working correctly. dont feel like solving for now.
- AWS SSO uses tabs to capture credentials. any stop that requires interaction with the login process may cause the capture to fail. nothing i can do about that you just need to rerun the process.
- AWS SSO's auto refresh caused issues of multiple tabs being open at once when the OS is sleeping (due to how google handles timers). We configured a workaround that requires the user to do any interaction with the browser. we detect that he's "active" this way and open the tab then.
- (Edge) Options UI is smaller than the elements.  
- (Opera) Options UI opens in a full tab.  
- Sometimes when the Gmail user account is signed out (or the session expires), the error message shown in the extension is incorrect.
