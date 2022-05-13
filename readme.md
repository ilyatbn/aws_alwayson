# AWS AlwaysON  
Chrome Extension that allows users that use Google Workspace (gsuite) as an IDP provier to AWS, to easily maintain sessions to the AWS console and get temporary STS credentials.  
This extension can be used as an alternative to `aws-google-auth` and doesn't require inputing credentials as long as your gmail account is logged in, nor does it suffer from constant Captcha.  
## Features
- Refresh AWS Web Console session automatically to keep user logged in. 
- Get temporary credentials for assumed role to use for CLI access.

## Installation

### Option 1
The extension is available in the Chrome Web Store and can be installed directly:  

<a href="https://chrome.google.com/webstore/detail/aws-alwayson/lfplgkokagjgodoeojaodphmjdhlpega" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/ilyatbn/aws_alwayson/master/img/chrome.png" width="48" /></a>

### Option 2
Clone this repository.  
Go to the Chrome Extensions page.  
Enable Developer Mode on the right side of the page.  
Press "Load Unpacked".  
Pick the project folder.  

## Using the extension  
First you will need to configure some properties in the Options menu. Each property has additional info that you can read to help you set it up properly.  
![Options](img/opts.png)  
When you are done, press the Save button and exit the Options menu.  
Now you can add your user's IAM role or roles.    
![Main menu](img/main.png)  

Click on the slider to start the token auto refresh procedure.  
After enabling the refresh you can also click on the CLI button to get the temporary STS credentials.  

## Changelog:
Full changelog is available [here](/changelog.md).  

## Compatibility:
Tested and working on:  
Chrome 101  
Brave 1.38.111   
## To Do:  
- add "settings are managed by an administrator" checkbox. 
    if true;
        hide all the regular options.
        add new option called "management server url"
        on save, add additional permission to fetch from management_server (once?).
        fetch settings from server(streaming connection?) and update local settings.
        add option to disable the toggle for management server url(make the options one-way).
    create a golang microservice that gets a request and responds with parameters(pass email).
    https://developers.google.com/admin-sdk/directory/v1/guides/manage-users
    create roll mapping (group(in gsuite)-role(manual/get from gsuite with api key?))
- make the IAM role session timeout fallback to 3600 if configured more than maximum allowed.
- Check if user is logged in to gmail when clicked on toggle. set back to off if logged out
https://groups.google.com/?authuser=1