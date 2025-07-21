# Debug Scripts

This directory contains development and debugging utilities for the HiFiBerry WebUI project.

## Scripts

### `debug-api-urls.sh`
Debug script for testing and validating API endpoints.

### `debug-nginx.sh`
Script for debugging nginx configuration and troubleshooting web server issues.

### `start-dev-server.bat`
Windows batch script for starting a development server (legacy).

## Usage

Make scripts executable before running:
```bash
chmod +x debug/*.sh
```

Run from the project root:
```bash
./debug/debug-api-urls.sh
./debug/debug-nginx.sh
```
