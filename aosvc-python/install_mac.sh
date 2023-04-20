#!/bin/bash
set -xe

launch_config_dir="$HOME/Library/LaunchAgents"
launch_config_path="$launch_config_dir/com.github.ilyatbn.aws_alwayson.plist"
user_uid=$(id -u)

mkdir -p "$HOME/.local/share/aosvc/bin"
cp aosvc "$HOME/.local/share/aosvc/bin/"
cp aosvc.plist "$launch_config_path"
launchctl bootstrap "gui/$user_uid" "$launch_config_path"
launchctl start aosvc
