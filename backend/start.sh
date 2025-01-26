#!/bin/bash

# Move the service file to the systemd directory
sudo mv ./daemon /etc/systemd/system/backend.service

# Reload the systemd daemon to recognize the new service
sudo systemctl daemon-reload

# Start the backend service
sudo systemctl start backend

# Enable the service to start on boot
sudo systemctl enable backend