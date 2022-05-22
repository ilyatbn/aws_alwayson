## Changelog
v0.1.0   
- simple interface and basic poc.  
___   
v0.2.0   
- redesigned popup menu ui.  
___   
v0.3.0   
- redesigned communications between frontend and backend. everything is now based on local storage data.  
___   
v0.3.1   
- fixed lots of bugs.  
___   
v0.4.0   
- added option to get temporary STS credentials.  
___   
v0.4.1   
- small bugfixes.  
___   
v0.4.2   
- fixed session expiration misspelled env var.
___     
v0.5.0   
- added multiple Google account support.  
___   
v0.6.0   
- added options menu.
___   
v0.6.1   
- reduced the amount of permissions to the minimum.  
___   
v0.7.0   
- upgraded to manifest V3 since apparently you can't upload it to Chrome web store otherwise.  
___   
v0.7.0.1 
- cleaned up some stuff.  
___   
v0.7.1   
- added information tooltip in options menu.
- modified the readme.
- open sourced the project.  
___   
v0.7.2   
- large refactor to support dynamic role count (part1)  
___   
v0.7.2.1 
- fixed some small issue with the account index selection. it worked fine previosuly so need to keep watching this.  
___   
v0.8.0   
- dynamic role count implemented. control in the options for now.  
___   
v0.8.0.1 
- split css files for menu and options.  
___  
v1.0.0  
- Added OS detection to set different cli environment variable set command on windows.  
- Made sure you can only get the cli credentials if you press the right cli button.  
___

v1.0.1  
- Added small check if the roleCount is undefined, to jump to Options page, assuming user has not configured it yet.  
___
v1.0.2
- Fixed alarms not firing correctly.  
- Added token refresh on browser start.  
- Made the cli button visible only for the selected role.  
- Made the cli button visible only after STS credentials are available.  
___
v1.0.3
- Added some error handling.  
- Added some progress handling for buttons.  
___
v1.0.4
- Got rid of storageapi.js and import to make the addon Firefox compatible (Sort of. Still using chrome API.)
- Added manifest-firefox.json which still works only with V2 extensions.
- Added even more error handling.
- Probably fixed a sporadic issue where an error icon is shown on menu open even though everything worked fine. This was probably due to the user closing the menu window before the refresh procedure finishing. 
- Moved platform check to run once instead of each time you get temporary credentials.
- Made platform modifiable in options.
- Reduced amount of times accessing local storage in menu. Might improve performance a little.  
- Fixed an issue where the options button wasn't centered.
___
v1.1.0
- Wrote a better error handler.
- Added option to geet role names automatically.
- Had to modify lots of stuff so, major version.
___
v1.1.1
- Added error message in UI.
- Refactored the options javascript to support dynamic menu building. 