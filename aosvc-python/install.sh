#!/bin/bash
set -xe
mkdir -p ~/.local/bin ~/.config/systemd/user
cp aosvc ~/.local/bin/
cp aosvc.service ~/.config/systemd/user/
systemctl --user enable --now aosvc.service
systemctl --user status aosvc.service
