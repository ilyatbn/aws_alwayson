## todo for sso beta
- when clicking the A button, this should trigger the auto refresh thingie that opens a new tab every hour instead of the toggle.
- when clicking the toggle, it currently removes and readds all the cli buttons. make it not do that.
- when clicking the toggle, create a new timer that fetches sts creds and updates the local client with them.
- UI: add an amazon button (Grayish) to each account to open the console in a new tab.
- UI: change the A button to something else?


## todo for sso release
- remove all new manual permission. 
    - add tabs+all urls permissions programatically when selecting AWS SSO as the 
    - figure out if you can work without all hosts, like say, add the relevant aws sites only + make the user add the idp url
    - add/remove host permissions every time the user selects a new prefix/idp
- work with it.
- handle all relevant exceptions and shit


check this out. may be very interesting for the tab focus shit.
https://github.com/monque/ChromeExtension-ForceBackgroundTab/issues