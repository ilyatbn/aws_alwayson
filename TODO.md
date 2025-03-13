## todo for sso beta
- UI: add an amazon button (Grayish) to each account to open the console in a new tab.
- automate account chooser using the domain. (inject script) 

## todo for sso release
- remove all new manual permission. 
    - add tabs+all urls permissions programatically when selecting AWS SSO as the 
    - figure out if you can work without all hosts, like say, add the relevant aws sites only + make the user add the idp url
    - add/remove host permissions every time the user selects a new prefix/idp
- handle all relevant exceptions and shit