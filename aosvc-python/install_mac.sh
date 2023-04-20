#!/bin/bash
set -xe

launch_config_dir="$HOME/Library/LaunchAgents"
launch_config_path="$launch_config_dir/com.github.ilyatbn.aws_alwayson.plist"
service_path="$HOME/.local/share/aosvc/bin"
user_uid=$(id -u)

mkdir -p "$service_path"
cp aosvc "$service_path"
cp aosvc.plist "$launch_config_path"
launchctl bootstrap "gui/$user_uid" "$launch_config_path"
launchctl start aosvc
