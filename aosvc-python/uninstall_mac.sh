#!/bin/bash
set -xe

launch_config_dir="$HOME/Library/LaunchAgents"
launch_config_path="$launch_config_dir/com.github.ilyatbn.aws_alwayson.plist"
service_path="$HOME/.local/share/aosvc/bin"

launchctl unload "$launch_config_path"
rm -f "$service_path/aosvc" "$launch_config_path"
