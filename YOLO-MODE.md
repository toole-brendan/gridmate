# Claude Safe YOLO Mode Setup

This setup provides a secure environment for running Claude in YOLO mode with `--dangerously-skip-permissions`.

## What's Included

- **Secure dev-container**: Based on Anthropic's reference image
- **Outbound-only firewall**: Whitelists GitHub, npm, and api.anthropic.com only
- **Node 20 environment**: With Claude CLI pre-installed
- **Isolated workspace**: Your project is bind-mounted at `/workspace`

## Quick Start

1. **Build the image** (if not already done):
   ```bash
   docker build -t claude-safe-yolo .devcontainer
   ```

2. **Run the container**:
   ```bash
   ./run-yolo.sh
   ```
   
   This will start a bash shell inside the container.

3. **Inside the container, initialize firewall and authenticate Claude**:
   ```bash
   # Initialize firewall (if not automatically done)
   sudo /usr/local/bin/init-firewall.sh
   
   # Authenticate Claude (first time only)
   claude login
   # Paste your Anthropic API key when prompted
   ```

4. **Launch Safe YOLO mode**:
   ```bash
   claude --dangerously-skip-permissions
   ```

## Security Features

- **Network isolation**: Only approved endpoints are accessible
- **Read-only host filesystem**: Except for the mounted workspace
- **No persistent changes**: Container is removed on exit (`--rm`)
- **Audit trail**: All commands are logged

## Files Created

- `.devcontainer/devcontainer.json` - Container configuration
- `.devcontainer/Dockerfile` - Container image definition
- `.devcontainer/init-firewall.sh` - Network security script
- `run-yolo.sh` - Convenient script to launch the container

## Notes

- The `--dangerously-skip-permissions` flag allows Claude to run commands, edit files, and perform actions without asking for permission each time
- All work is confined to the container and your project directory
- Network access is restricted to essential services only