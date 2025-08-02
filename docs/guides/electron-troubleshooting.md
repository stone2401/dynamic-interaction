# Electron Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Electron GUI mode in Dynamic Interaction MCP.

## Quick Diagnostics

### Check System Status

```bash
# Verify Node.js version (18+ required)
node --version

# Check if Electron is installed
electron --version

# Test basic functionality
UI_MODE=browser dynamic-interaction  # Should work
UI_MODE=electron dynamic-interaction # Test Electron mode
```

### Enable Debug Logging

```bash
# Enable detailed logging
LOG_ENABLED=true LOG_LEVEL=debug UI_MODE=electron dynamic-interaction
```

Look for these key log messages:
- `[INFO] UI Mode: electron` - Confirms Electron mode is active
- `[INFO] Electron launcher initialized` - Electron components loaded
- `[DEBUG] Electron window created` - Window creation successful

## Common Issues and Solutions

### 1. Electron Mode Not Starting

**Symptoms:**
- Application opens in browser instead of Electron window
- Warning message: "Electron not available, falling back to browser mode"

**Causes and Solutions:**

#### Electron Not Installed
```bash
# Check if Electron is installed
electron --version

# If not installed, install globally
npm install -g electron

# Or install locally (if using from source)
pnpm install electron --save-optional
```

#### Incorrect Environment Variable
```bash
# Check current setting
echo $UI_MODE

# Set correctly (case-sensitive)
export UI_MODE=electron  # Correct
export UI_MODE=Electron  # Wrong - case matters
export ui_mode=electron  # Wrong - variable name matters
```

#### Path Issues
```bash
# Check if electron is in PATH
which electron

# If not found, add to PATH or use full path
export PATH=$PATH:/usr/local/bin
```

### 2. Window Size Issues

**Symptoms:**
- Window appears too small or too large
- Window doesn't fit on screen
- Configuration values ignored

**Solutions:**

#### Invalid Configuration Values
```bash
# Check current values
echo $ELECTRON_WINDOW_WIDTH
echo $ELECTRON_WINDOW_HEIGHT

# Set valid values (numbers only, no units)
export ELECTRON_WINDOW_WIDTH=1200    # Correct
export ELECTRON_WINDOW_WIDTH=1200px  # Wrong - no units
export ELECTRON_WINDOW_WIDTH="1200"  # Correct - quotes optional
```

#### Screen Resolution Conflicts
```bash
# Get screen resolution (macOS)
system_profiler SPDisplaysDataType | grep Resolution

# Get screen resolution (Linux)
xrandr | grep '*'

# Adjust window size accordingly
export ELECTRON_WINDOW_WIDTH=1200  # For 1920x1080 screens
export ELECTRON_WINDOW_HEIGHT=800
```

#### Configuration Not Loading
```bash
# Create .env file for persistent configuration
cat > .env << EOF
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1200
ELECTRON_WINDOW_HEIGHT=800
EOF

# Verify .env file is in correct directory
ls -la .env
```

### 3. Window Focus Issues

**Symptoms:**
- Window doesn't come to foreground when interaction starts
- Window opens behind other applications
- Multiple windows opening instead of reusing existing one

**Solutions:**

#### macOS Permission Issues
```bash
# Grant accessibility permissions to Terminal/iTerm
# System Preferences > Security & Privacy > Privacy > Accessibility
# Add your terminal application
```

#### Window Manager Conflicts
```bash
# Check for window manager conflicts (Linux)
ps aux | grep -i window

# Try disabling window manager focus stealing prevention
# This varies by desktop environment
```

#### Session Management Issues
```bash
# Clear any stuck sessions
rm -rf ~/.dynamic-interaction/sessions/*

# Restart with clean state
UI_MODE=electron dynamic-interaction
```

### 4. Performance Issues

**Symptoms:**
- Slow window opening
- High CPU/memory usage
- Laggy interface

**Solutions:**

#### Hardware Acceleration
```bash
# Disable hardware acceleration if causing issues
export ELECTRON_DISABLE_GPU=true
UI_MODE=electron dynamic-interaction
```

#### Memory Issues
```bash
# Check available memory
free -h  # Linux
vm_stat # macOS

# Reduce window size if memory constrained
export ELECTRON_WINDOW_WIDTH=1000
export ELECTRON_WINDOW_HEIGHT=700
```

#### Multiple Instances
```bash
# Check for multiple processes
ps aux | grep electron
ps aux | grep dynamic-interaction

# Kill stuck processes
pkill -f "dynamic-interaction"
pkill -f "electron"
```

### 5. Security and Permission Issues

**Symptoms:**
- Window opens but shows blank screen
- JavaScript errors in console
- Features not working properly

**Solutions:**

#### Context Isolation Issues
```bash
# Enable debug mode to see console errors
NODE_ENV=development UI_MODE=electron dynamic-interaction
```

#### File Permission Issues
```bash
# Check file permissions
ls -la ~/.dynamic-interaction/
ls -la /usr/local/lib/node_modules/dynamic-interaction/

# Fix permissions if needed
chmod -R 755 ~/.dynamic-interaction/
```

#### Preload Script Issues
```bash
# Check if preload script exists
ls -la dist/src/electron/preload.js

# Rebuild if missing
pnpm run build
```

### 6. Network and WebSocket Issues

**Symptoms:**
- Window opens but doesn't connect to server
- "Connection failed" messages
- Interface doesn't update

**Solutions:**

#### Port Conflicts
```bash
# Check if port is in use
lsof -i :10086  # Default port
netstat -an | grep 10086

# Use different port
PORT=10087 UI_MODE=electron dynamic-interaction
```

#### Firewall Issues
```bash
# Check firewall status (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Check firewall status (Linux)
sudo ufw status

# Allow port if needed
sudo ufw allow 10086
```

#### WebSocket Connection Issues
```bash
# Test WebSocket connection manually
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:10086/ws
```

## Platform-Specific Issues

### macOS

#### Gatekeeper Issues
```bash
# If Electron is blocked by Gatekeeper
sudo spctl --master-disable  # Temporarily disable
# Or go to System Preferences > Security & Privacy and allow

# Re-enable after installation
sudo spctl --master-enable
```

#### Code Signing Issues
```bash
# Remove quarantine attribute if needed
xattr -d com.apple.quarantine /usr/local/bin/electron
```

### Windows

#### Windows Defender Issues
```bash
# Add exclusion for Electron in Windows Defender
# Windows Security > Virus & threat protection > Exclusions
# Add folder: C:\Users\[username]\AppData\Roaming\npm\node_modules\electron
```

#### PowerShell Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Linux

#### Display Server Issues
```bash
# For Wayland users
export ELECTRON_OZONE_PLATFORM_HINT=wayland

# For X11 users (if having issues)
export ELECTRON_OZONE_PLATFORM_HINT=x11
```

#### Missing Dependencies
```bash
# Install missing libraries (Ubuntu/Debian)
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2-dev

# Install missing libraries (CentOS/RHEL)
sudo yum install nss atk at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libXScrnSaver alsa-lib
```

## Advanced Debugging

### Enable Electron Debug Mode

```bash
# Enable all debug output
DEBUG=* UI_MODE=electron dynamic-interaction

# Enable specific debug categories
DEBUG=electron:* UI_MODE=electron dynamic-interaction
```

### Inspect Electron Process

```bash
# Find Electron process
ps aux | grep electron

# Get detailed process info
lsof -p [electron-pid]

# Monitor system calls (Linux)
strace -p [electron-pid]

# Monitor system calls (macOS)
dtruss -p [electron-pid]
```

### Check Electron DevTools

```bash
# Enable development mode
NODE_ENV=development UI_MODE=electron dynamic-interaction

# Open DevTools in Electron window
# Right-click in window and select "Inspect Element"
# Or use keyboard shortcut: Cmd+Option+I (macOS) / Ctrl+Shift+I (Windows/Linux)
```

### Log Analysis

```bash
# Enable file logging
LOG_ENABLED=true LOG_TO_FILE=true UI_MODE=electron dynamic-interaction

# Check log files
tail -f ~/.dynamic-interaction/logs/combined.log
tail -f ~/.dynamic-interaction/logs/error.log

# Search for specific errors
grep -i "electron" ~/.dynamic-interaction/logs/combined.log
grep -i "error" ~/.dynamic-interaction/logs/error.log
```

## Recovery Procedures

### Complete Reset

```bash
# Stop all processes
pkill -f "dynamic-interaction"
pkill -f "electron"

# Clear cache and sessions
rm -rf ~/.dynamic-interaction/
rm -rf ~/.cache/electron/

# Reinstall if needed
npm uninstall -g dynamic-interaction electron
npm install -g dynamic-interaction electron

# Test basic functionality
UI_MODE=browser dynamic-interaction  # Should work
UI_MODE=electron dynamic-interaction # Test Electron
```

### Fallback to Browser Mode

```bash
# Temporary fallback
UI_MODE=browser dynamic-interaction

# Permanent fallback (remove from .env)
sed -i '/UI_MODE=electron/d' .env
echo "UI_MODE=browser" >> .env
```

### Rebuild from Source

```bash
# If installed from source
cd dynamic-interaction
git pull origin main
pnpm install
pnpm run build
make link
```

## Getting Help

### Collect Debug Information

Before seeking help, collect this information:

```bash
# System information
echo "OS: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Electron: $(electron --version 2>/dev/null || echo 'Not installed')"

# Configuration
echo "UI_MODE: $UI_MODE"
echo "ELECTRON_WINDOW_WIDTH: $ELECTRON_WINDOW_WIDTH"
echo "ELECTRON_WINDOW_HEIGHT: $ELECTRON_WINDOW_HEIGHT"

# Process information
ps aux | grep -E "(electron|dynamic-interaction)"

# Port usage
lsof -i :10086 2>/dev/null || echo "Port 10086 not in use"

# Recent logs (if logging enabled)
tail -20 ~/.dynamic-interaction/logs/error.log 2>/dev/null || echo "No error logs"
```

### Support Channels

1. **Check existing documentation:**
   - [Setup Guide](./electron-setup-guide.md)
   - [Configuration Reference](./electron-configuration.md)

2. **Search for similar issues:**
   - GitHub Issues
   - Community forums

3. **Create a bug report with:**
   - System information (from above)
   - Steps to reproduce
   - Expected vs actual behavior
   - Log files (if available)

## Prevention Tips

1. **Keep dependencies updated:**
   ```bash
   npm update -g dynamic-interaction electron
   ```

2. **Use stable configuration:**
   ```bash
   # Stick to tested window sizes
   export ELECTRON_WINDOW_WIDTH=1200
   export ELECTRON_WINDOW_HEIGHT=800
   ```

3. **Monitor system resources:**
   ```bash
   # Check available memory before starting
   free -h
   ```

4. **Regular cleanup:**
   ```bash
   # Clean up old sessions weekly
   find ~/.dynamic-interaction/sessions/ -mtime +7 -delete
   ```

5. **Test after system updates:**
   ```bash
   # Test both modes after OS/Node.js updates
   UI_MODE=browser dynamic-interaction
   UI_MODE=electron dynamic-interaction
   ```