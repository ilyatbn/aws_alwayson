# aosvc-python

This is an alternative for the Go-based `aosvc`.

## Supported OS

# Linux
Supported via systemd (WSL2 supported). 

# Mac
Supported via [launchd](https://www.launchd.info/) 

# Windows
it can be used on windows by using e.g. [NSSM](https://nssm.cc/)

## Installation
### Linux

Just `cd` into this directory and run the installation script:
```sh
cd aosvc-python
./install.sh
```

The script will install the python script in `~/.local/bin/` and the service unit file in `~/.config/systemd/user/`. The service is installed as a systemd user service and will update the `default` profile in `~/.aws/credentials` for the installing user.

There's also an `uninstall.sh` for removal.

### Mac
Just `cd` into this directory and run the installation script:
```sh
cd aosvc-python
./install_mac.sh
```

The script will install the python script in `~/.local/share/aosvc/bin/` and the service unit file in `~/Library/LaunchAgents. The service is loaded as a launchd service and will update the `default` profile in `~/.aws/credentials` for the installing user.

There's also an `uninstall_mac.sh` for removal.
