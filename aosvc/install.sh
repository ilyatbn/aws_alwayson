#!/bin/bash
sudo cp aosvc /usr/local/bin
sudp cp aosvc.service /etc/systemd/system
systemctl start aosvc.service
systemctl enable aosvc.service