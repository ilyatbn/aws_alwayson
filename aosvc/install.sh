#!/bin/bash
sudo cp awsao /usr/local/bin
sudp cp awsao.service /etc/systemd/system
systemctl start awsao.service
systemctl enable awsao.service