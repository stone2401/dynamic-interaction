# Electron GUI Setup Guide

This guide will help you set up and configure the Electron GUI mode for Dynamic Interaction MCP.

## Overview

The Electron GUI mode provides a native desktop application experience instead of opening interactions in your web browser. This mode offers enhanced window management, better desktop integration, and improved user experience for frequent MCP interactions.

## Prerequisites

- Node.js 18+ installed
- Dynamic Interaction MCP already installed
- Basic familiarity with environment variables

## Installation

### Method 1: Install Electron Globally (Recommended)

```bash
# Install Electron globally alongside dynamic-interaction
npm install -g electron

# Verify installation
electron --version
```

### Method 2: Install Electron as Project Dependency

If you installed dynamic-interaction from source:

```bash
cd dynamic-interaction
pnpm install electron --save-optional
```

### Method 3: Using Package Managers

**Using Homebrew (macOS):**
```bash
brew install --cask electron
```

**Using Chocolatey (Windows):**
```bash
choco install electron
```

**Using apt (Ubuntu/Debian):**
```bash
# Install via npm (recommended)
sudo npm install -g electron
```

## Configuration

### Environment Variables

Create a `.env` file in your project directory or set environment variables:

```bash
# Enable Electron mode
UI_MODE=electron

# Optional: Customize window size
ELECTRON_WINDOW_WIDTH=1400
ELECTRON_WINDOW_HEIGHT=900

# Optional: Enable development tools (development only)
NODE_ENV=development
```

### Configuration Options

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `UI_MODE` | Interface mode | `browser` | `browser`, `electron` |
| `ELECTRON_WINDOW_WIDTH` | Window width in pixels | `1200` | Any positive integer |
| `ELECTRON_WINDOW_HEIGHT` | Window height in pixels | `800` | Any positive integer |

### MCP Client Configuration

Update your MCP client configuration to include environment variables:

**Claude Desktop (config.json):**
```json
{
  "mcpServers": {
    "dynamic-interaction": {
      "command": "npx",
      "args": ["-y", "dynamic-interaction@latest"],
      "env": {
        "UI_MODE": "electron",
        "ELECTRON_WINDOW_WIDTH": "1400",
        "ELECTRON_WINDOW_HEIGHT": "900"
      }
    }
  }
}
```

**Cursor/Windsurf (.cursorrules or similar):**
```json
{
  "mcp": {
    "servers": {
      "dynamic-interaction": {
        "command": "dynamic-interaction",
        "env": {
          "UI_MODE": "electron"
        }
      }
    }
  }
}
```

## Usage

### Starting in Electron Mode

**Command Line:**
```bash
# Set environment variable and start
UI_MODE=electron dynamic-interaction

# Or export the variable
export UI_MODE=electron
dynamic-interaction
```

**Using .env file:**
```bash
# Create .env file
echo "UI_MODE=electron" > .env
echo "ELECTRON_WINDOW_WIDTH=1400" >> .env

# Start normally
dynamic-interaction
```

### Development Mode

```bash
# Development with Electron
UI_MODE=electron pnpm run dev

# Or use the dedicated script
pnpm run dev:electron
```

## Features in Electron Mode

### Window Management
- **Automatic Positioning**: Windows open centered on screen
- **Focus Management**: Windows automatically come to foreground when interaction is needed
- **Session Reuse**: Multiple interactions share the same Electron instance
- **Proper Cleanup**: Windows close automatically when sessions end

### Security Features
- **Context Isolation**: Renderer process is isolated from Node.js
- **Disabled Node Integration**: Prevents security vulnerabilities
- **Secure Preload**: Safe communication between main and renderer processes
- **Navigation Restrictions**: Prevents navigation to external sites

### Enhanced User Experience
- **Native Menus**: Standard application menus (when applicable)
- **Keyboard Shortcuts**: Standard desktop application shortcuts
- **Window State**: Remembers window size and position
- **Better Performance**: Native rendering without browser overhead

## Verification

### Check if Electron Mode is Active

1. **Start the application:**
   ```bash
   UI_MODE=electron dynamic-interaction
   ```

2. **Look for log messages:**
   ```
   [INFO] UI Mode: electron
   [INFO] Electron launcher initialized
   ```

3. **Trigger an interaction:**
   - Use `solicit-input` tool from your MCP client
   - Should open in a native desktop window instead of browser

### Test Window Features

1. **Window Focus**: Window should automatically come to foreground
2. **Window Sizing**: Should respect `ELECTRON_WINDOW_WIDTH` and `ELECTRON_WINDOW_HEIGHT`
3. **Session Reuse**: Multiple interactions should use the same window
4. **Auto-close**: Window should close when session ends

## Advanced Configuration

### Custom Window Options

You can extend the Electron configuration by modifying the source code:

```typescript
// src/electron/window-manager.ts
const windowOptions: BrowserWindowConstructorOptions = {
  width: ELECTRON_CONFIG.windowWidth,
  height: ELECTRON_CONFIG.windowHeight,
  // Add custom options here
  resizable: true,
  minimizable: true,
  maximizable: true,
  alwaysOnTop: false, // Set to true for always-on-top behavior
};
```

### Development Tools

Enable Electron DevTools in development:

```bash
NODE_ENV=development UI_MODE=electron dynamic-interaction
```

This will enable:
- Chrome DevTools access
- Hot reload capabilities
- Debug logging
- Error reporting

## Integration Examples

### VS Code Extension

```json
{
  "mcp.servers": {
    "dynamic-interaction": {
      "command": "dynamic-interaction",
      "args": [],
      "env": {
        "UI_MODE": "electron",
        "ELECTRON_WINDOW_WIDTH": "1200",
        "ELECTRON_WINDOW_HEIGHT": "800"
      }
    }
  }
}
```

### Custom Launcher Script

Create a custom launcher script:

```bash
#!/bin/bash
# electron-mcp.sh

export UI_MODE=electron
export ELECTRON_WINDOW_WIDTH=1400
export ELECTRON_WINDOW_HEIGHT=900
export LOG_ENABLED=true

dynamic-interaction "$@"
```

Make it executable:
```bash
chmod +x electron-mcp.sh
./electron-mcp.sh
```

## Next Steps

- See [Troubleshooting Guide](./electron-troubleshooting.md) for common issues
- Check [Configuration Reference](./electron-configuration.md) for advanced options
- Review [Security Considerations](./electron-security.md) for production deployments

## Support

If you encounter issues with Electron mode:
1. Check the [Troubleshooting Guide](./electron-troubleshooting.md)
2. Verify Electron installation: `electron --version`
3. Check logs for error messages
4. Try browser mode as fallback: `UI_MODE=browser dynamic-interaction`