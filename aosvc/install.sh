#!/bin/bash
sudo cp aosvc /usr/local/bin
sudo cp aosvc.service /etc/systemd/system
systemctl start aosvc.service
systemctl enable aosvc.service
