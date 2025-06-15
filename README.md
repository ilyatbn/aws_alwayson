# AWS AlwaysON  

## Introduction
AWS AlwaysOn is a browser extension that helps users stay connected to AWS, both in the web browser and CLI.

This extension can be used as an alternative to `aws-google-auth` and doesn't require inputing credentials as long as your Google account is logged in, nor does it suffer from constant Captcha.  
The extension was developed for Chrome but works mostly fine on all major browsers except Safari which was untested.  

## Supported providers
- Google Workspace as an IDP provier to AWS, 
- AWS SSO with any IDP Provider (Only Google was tested)

## Features
- Refresh AWS Web Console session automatically to keep user logged in. 
- Get temporary credentials for assumed role (STS) to use for CLI access.
- Automatically update local aws credentials file using provded clients.

## Installation

### Option 1 (Chrome, Firefox, Edge, Opera, Brave*)
Available directly on Chrome Web Store and Add-ons for Firefox:  

<a href="https://chrome.google.com/webstore/detail/aws-alwayson/lfplgkokagjgodoeojaodphmjdhlpega" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/ilyatbn/aws_alwayson/master/img/chrome.png" width="48" /></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/aws-alwayson/" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/ilyatbn/aws_alwayson/master/img/ff.png" width="48" /></a>


\* Should technically work with any chromium based browser.
### Option 2
 **Google Chrome:**  
Clone this repository.  
Go to the Chrome Extensions page.  
Enable Developer Mode on the right side of the page.  
Press "Load Unpacked".  
Pick the project folder.  

**Mozilla Firefox:**  
Delete the regular manifest.js and rename the manifest-firefox.js to manifest.js  
Go to Addons and themes in the hamburger menu.  
Click the wheel and then Debug Add-ons.  
Click Load Temporary Add-on... and select the manifest.json file.  
## Using the extension  
First you will need to configure some properties in the Options menu. Each property has additional info that you can read to help you set it up properly. There are separate sections of configurations based on the IDP Type you use (Google Workspace or AWSSSO)

![Options](img/opts_main.png)  
When you are done, exit the Options menu.  
Now you can add your user's IAM role or roles or click the time button to fetch them automatically. On AWS SSO, only automatic is avialble at this time since it is also acts as a scheduler.    
![Main menu](img/main.png)  

Click on the slider to start the token and client auto refresh procedure. On AWS SSO, this only acts as a client token refresh since all roles are globally loaded and refreshed using the time button.
After enabling the refresh you can also click on the CLI button to get the temporary STS credentials.  

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
aChrome - v101  
Brave - v1.77.10  
Firefox - v100  


## Known issues:  
- AWS SSO uses tabs to capture credentials. if you have multiple accounts configured or something in your SSO process stops, the credential capture might fail.
- AWS SSO's auto refresh also uses a new tab. This caused issues of multiple tabs being open at once when the OS is sleeping (due to how google handles timers). We configured a
- (Edge) Options UI is smaller than the elements.  
- (Opera) Options UI opens in a full tab.  
- Sometimes when the Gmail user account is signed out (or the session expires), the error message shown in the extension is incorrect.
