#!/bin/bash
cp aosvc /usr/local/bin
cp aosvc.service /etc/systemd/system
systemctl start aosvc.service
systemctl enable aosvc.service
