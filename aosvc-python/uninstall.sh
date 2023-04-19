#!/bin/bash
set -xe
systemctl --user disable --now aosvc.service
rm -f ~/.local/bin/aosvc ~/.config/systemd/user/aosvc.service
systemctl --user daemon-reload
