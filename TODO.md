## todo for sso beta
- automate account chooser using the domain. (inject script). if working, can hide the window.

## todo for sso release
- remove all new manual permission. 
    - add tabs+all urls permissions programatically when selecting AWS SSO as the 
    - figure out if you can work without all hosts, like say, add the relevant aws sites only + make the user add the idp url
    - add/remove host permissions every time the user selects a new prefix/idp
- handle all relevant exceptions and shit