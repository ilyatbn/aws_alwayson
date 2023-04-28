#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

cp aosvc /usr/local/bin
cp aosvc.service /etc/systemd/system
systemctl start aosvc.service
systemctl enable aosvc.service