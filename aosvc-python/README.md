# aosvc-python

This is an alternative for the Go-based `aosvc`. It's mainly intended for linux use via systemd (WSL2 supported), although it can be used on windows by using e.g. [NSSM](https://nssm.cc/).

## Installation
Just `cd` into this directory and run the installation script:
```sh
cd aosvc-python
./install.sh
```

The script will install the python script in `~/.local/bin/` and the service unit file in `~/.config/systemd/user/`. The service is installed as a systemd user service and will update the `default` profile in `~/.aws/credentials` for the installing user.

There's also an `uninstall.sh` for removal.
