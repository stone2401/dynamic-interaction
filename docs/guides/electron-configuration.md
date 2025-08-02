# Electron Configuration Reference

This document provides a comprehensive reference for all Electron-related configuration options in Dynamic Interaction MCP.

## Environment Variables

### Core Configuration

#### UI_MODE
- **Description**: Controls the user interface mode
- **Type**: String
- **Default**: `"browser"`
- **Valid Values**: `"browser"`, `"electron"`
- **Example**: `UI_MODE=electron`

#### ELECTRON_WINDOW_WIDTH
- **Description**: Sets the width of the Electron window in pixels
- **Type**: Number
- **Default**: `1200`
- **Range**: 400-4000 (recommended)
- **Example**: `ELECTRON_WINDOW_WIDTH=1400`

#### ELECTRON_WINDOW_HEIGHT
- **Description**: Sets the height of the Electron window in pixels
- **Type**: Number
- **Default**: `800`
- **Range**: 300-2000 (recommended)
- **Example**: `ELECTRON_WINDOW_HEIGHT=900`

### Development Configuration

#### NODE_ENV
- **Description**: Controls development features
- **Type**: String
- **Default**: `"production"`
- **Valid Values**: `"development"`, `"production"`
- **Effect**: Enables DevTools and debug logging when set to `"development"`
- **Example**: `NODE_ENV=development`

## Configuration Methods

### Method 1: Environment Variables

```bash
# Direct export
export UI_MODE=electron
export ELECTRON_WINDOW_WIDTH=1400
export ELECTRON_WINDOW_HEIGHT=900

# Run application
dynamic-interaction
```

### Method 2: .env File

Create a `.env` file in your working directory:

```env
# Electron Configuration
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1400
ELECTRON_WINDOW_HEIGHT=900

# Optional: Development mode
NODE_ENV=development

# Optional: Logging
LOG_ENABLED=true
LOG_LEVEL=info
```

### Method 3: MCP Client Configuration

**Claude Desktop:**
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

**Cursor/Windsurf:**
```json
{
  "mcp": {
    "servers": {
      "dynamic-interaction": {
        "command": "dynamic-interaction",
        "env": {
          "UI_MODE": "electron",
          "ELECTRON_WINDOW_WIDTH": "1200",
          "ELECTRON_WINDOW_HEIGHT": "800"
        }
      }
    }
  }
}
```

### Method 4: Command Line Arguments

```bash
# Inline environment variables
UI_MODE=electron ELECTRON_WINDOW_WIDTH=1400 dynamic-interaction

# Using env command
env UI_MODE=electron ELECTRON_WINDOW_WIDTH=1400 dynamic-interaction
```

## Window Configuration

### Recommended Window Sizes

| Use Case | Width | Height | Description |
|----------|-------|--------|-------------|
| Compact | 1000 | 700 | Minimal space usage |
| Standard | 1200 | 800 | Default balanced size |
| Large | 1400 | 900 | More content visibility |
| Ultrawide | 1600 | 900 | For ultrawide monitors |

### Screen Resolution Considerations

**1080p (1920x1080):**
- Recommended: 1200x800 or smaller
- Maximum: 1600x900

**1440p (2560x1440):**
- Recommended: 1400x900
- Maximum: 2000x1200

**4K (3840x2160):**
- Recommended: 1600x1000
- Maximum: 2400x1400

## Advanced Configuration

### Window Behavior

The following options are configured in the source code but can be modified:

```typescript
// src/electron/window-manager.ts
const windowOptions: BrowserWindowConstructorOptions = {
  width: ELECTRON_CONFIG.windowWidth,
  height: ELECTRON_CONFIG.windowHeight,
  center: true,                    // Center window on screen
  resizable: true,                 // Allow window resizing
  minimizable: true,               // Allow minimizing
  maximizable: true,               // Allow maximizing
  closable: true,                  // Allow closing
  alwaysOnTop: false,             // Keep window on top
  skipTaskbar: false,             // Show in taskbar
  title: 'Dynamic Interaction MCP', // Window title
  icon: undefined,                // Application icon
  show: false,                    // Don't show until ready
  autoHideMenuBar: true,          // Hide menu bar by default
  webPreferences: {
    nodeIntegration: false,        // Security: disable Node.js
    contextIsolation: true,        // Security: enable isolation
    enableRemoteModule: false,     // Security: disable remote
    preload: preloadPath          // Secure preload script
  }
};
```

### Security Configuration

The Electron application uses secure defaults:

```typescript
webPreferences: {
  nodeIntegration: false,          // Prevents renderer from accessing Node.js
  contextIsolation: true,          // Isolates context between main and renderer
  enableRemoteModule: false,       // Disables remote module access
  allowRunningInsecureContent: false, // Blocks insecure content
  experimentalFeatures: false,     // Disables experimental features
  webSecurity: true,              // Enables web security
  preload: path.join(__dirname, 'preload.js') // Secure communication bridge
}
```

## Configuration Validation

The system validates configuration values:

### Width Validation
```typescript
const width = Number(process.env.ELECTRON_WINDOW_WIDTH) || 1200;
if (width < 400 || width > 4000) {
  console.warn(`Invalid window width: ${width}. Using default: 1200`);
  width = 1200;
}
```

### Height Validation
```typescript
const height = Number(process.env.ELECTRON_WINDOW_HEIGHT) || 800;
if (height < 300 || height > 2000) {
  console.warn(`Invalid window height: ${height}. Using default: 800`);
  height = 800;
}
```

### UI Mode Validation
```typescript
const uiMode = process.env.UI_MODE || 'browser';
if (!['browser', 'electron'].includes(uiMode)) {
  console.warn(`Invalid UI mode: ${uiMode}. Using default: browser`);
  uiMode = 'browser';
}
```

## Configuration Examples

### Development Setup

```env
# .env for development
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1400
ELECTRON_WINDOW_HEIGHT=900
NODE_ENV=development
LOG_ENABLED=true
LOG_LEVEL=debug
```

### Production Setup

```env
# .env for production
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1200
ELECTRON_WINDOW_HEIGHT=800
LOG_ENABLED=true
LOG_LEVEL=info
```

### Multi-Monitor Setup

```env
# For primary monitor (1440p)
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1400
ELECTRON_WINDOW_HEIGHT=900

# For secondary monitor (1080p)
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1200
ELECTRON_WINDOW_HEIGHT=800
```

### Compact Setup

```env
# Minimal window size
UI_MODE=electron
ELECTRON_WINDOW_WIDTH=1000
ELECTRON_WINDOW_HEIGHT=700
```

## Configuration Precedence

Configuration values are resolved in the following order (highest to lowest priority):

1. **Command-line environment variables**
   ```bash
   UI_MODE=electron dynamic-interaction
   ```

2. **MCP client configuration**
   ```json
   "env": { "UI_MODE": "electron" }
   ```

3. **.env file in working directory**
   ```env
   UI_MODE=electron
   ```

4. **System environment variables**
   ```bash
   export UI_MODE=electron
   ```

5. **Default values in source code**
   ```typescript
   const DEFAULT_UI_MODE = 'browser';
   ```

## Troubleshooting Configuration

### Common Issues

1. **Configuration not taking effect:**
   - Check configuration precedence
   - Verify environment variable names (case-sensitive)
   - Restart the application after changes

2. **Invalid window size:**
   - Check console for validation warnings
   - Ensure values are within recommended ranges
   - Use numeric values only (no units)

3. **Electron mode not working:**
   - Verify Electron installation: `electron --version`
   - Check for fallback messages in logs
   - Ensure `UI_MODE=electron` is set correctly

### Debug Configuration

Enable debug logging to see configuration values:

```bash
LOG_ENABLED=true LOG_LEVEL=debug UI_MODE=electron dynamic-interaction
```

Look for log entries like:
```
[DEBUG] Configuration loaded: { uiMode: 'electron', windowWidth: 1200, windowHeight: 800 }
[DEBUG] Electron config: { enabled: true, windowWidth: 1200, windowHeight: 800 }
```

## Best Practices

1. **Use .env files** for consistent configuration across team members
2. **Set reasonable window sizes** based on your typical screen resolution
3. **Enable logging** in development for debugging
4. **Test configuration changes** before deploying to production
5. **Document custom configurations** for team members
6. **Use MCP client configuration** for deployment-specific settings

## Related Documentation

- [Electron Setup Guide](./electron-setup-guide.md) - Installation and basic setup
- [Troubleshooting Guide](./electron-troubleshooting.md) - Common issues and solutions
- [Security Guide](./electron-security.md) - Security considerations