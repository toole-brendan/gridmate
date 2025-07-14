#!/bin/bash

# Script to set log level for the backend service
# Usage: ./set-log-level.sh [debug|info|warn|error]

LOG_LEVEL=${1:-info}

# Validate log level
case $LOG_LEVEL in
    debug|info|warn|error)
        echo "Setting log level to: $LOG_LEVEL"
        ;;
    *)
        echo "Invalid log level: $LOG_LEVEL"
        echo "Usage: $0 [debug|info|warn|error]"
        exit 1
        ;;
esac

# Export the environment variable
export LOG_LEVEL=$LOG_LEVEL

# If the backend is running, you might want to restart it
# For now, just show the export command
echo "Run the following command before starting the backend:"
echo "export LOG_LEVEL=$LOG_LEVEL"
echo ""
echo "Or start the backend with:"
echo "LOG_LEVEL=$LOG_LEVEL ./gridmate-backend" 