# AWS AlwaysON  
Chrome Extension that allows users that use Google Workspace (gsuite) as an IDP provier to AWS, to easily maintain sessions to the AWS console and get temporary STS credentials.  
This extension can be used as an alternative to `aws-google-auth` and doesn't require inputing credentials as long as your gmail account is logged in, nor does it suffer from constant Captcha.  
## Features
- Refresh AWS Web Console session automatically to keep user logged in. 
- Get temporary credentials for assumed role to use for CLI access.

## Installation
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
Nothing..