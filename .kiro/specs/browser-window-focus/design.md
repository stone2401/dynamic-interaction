# Design Document

## Overview

The browser window focus enhancement addresses the issue where subsequent MCP conversations don't bring the browser window to the foreground, even though the first conversation correctly opens and focuses the browser. The current implementation uses the `open` npm package to launch the browser only when no active WebSocket connections exist, but lacks the ability to focus existing browser windows.

This design introduces a comprehensive window management system that can:
- Detect when browser windows need to be focused
- Use platform-specific APIs to bring windows to the foreground
- Provide fallback mechanisms when direct window focusing fails
- Allow configuration of focus behavior

## Architecture

### Current Flow Analysis
1. **First MCP Call**: No active WebSocket connections → `open` package launches browser → Browser opens and focuses
2. **Subsequent MCP Calls**: Active WebSocket connections exist → No browser action → Messages sent but window not focused

### Enhanced Flow
1. **Any MCP Call**: Check if window focus is needed
2. **Window Focus Logic**: Attempt to focus existing browser window using platform-specific methods
3. **Fallback Mechanisms**: If focus fails, provide visual/audio notifications
4. **Configuration Respect**: Honor user preferences for focus behavior

## Components and Interfaces

### 1. Window Focus Manager (`src/server/windowFocusManager.ts`)

**Purpose**: Central component responsible for managing browser window focus operations.

**Key Methods**:
```typescript
interface WindowFocusManager {
  focusBrowserWindow(url: string): Promise<boolean>;
  isWindowFocusEnabled(): boolean;
  detectPlatform(): 'darwin' | 'win32' | 'linux';
  executeSystemCommand(command: string): Promise<boolean>;
}
```

**Responsibilities**:
- Platform detection and command selection
- Execution of system-specific focus commands
- Error handling and logging
- Configuration management

### 2. Platform-Specific Focus Strategies

**macOS Strategy**:
- Use AppleScript to focus browser windows
- Commands: `osascript -e "tell application \"Safari\" to activate"`
- Support for multiple browsers (Safari, Chrome, Firefox, Edge)

**Windows Strategy**:
- Use PowerShell commands to focus windows
- Commands: `powershell -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('Chrome')"`
- Support for multiple browsers

**Linux Strategy**:
- Use `wmctrl` or `xdotool` for window management
- Commands: `wmctrl -a "Chrome"` or `xdotool search --name "Chrome" windowactivate`
- Fallback to `xprop` and `xwininfo` for window detection

### 3. Configuration Extension (`src/config.ts`)

**New Configuration Options**:
```typescript
export const WINDOW_FOCUS_CONFIG = {
  enabled: process.env.WINDOW_FOCUS_ENABLED !== 'false', // Default: enabled
  strategy: process.env.WINDOW_FOCUS_STRATEGY || 'auto', // auto, applescript, powershell, wmctrl
  browsers: (process.env.WINDOW_FOCUS_BROWSERS || 'chrome,safari,firefox,edge').split(','),
  fallbackNotification: process.env.WINDOW_FOCUS_FALLBACK !== 'false', // Default: enabled
  retryAttempts: Number(process.env.WINDOW_FOCUS_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.WINDOW_FOCUS_RETRY_DELAY) || 500, // milliseconds
};
```

### 4. Enhanced Solicit Input (`src/mcp/solicit-input.ts`)

**Modified Logic**:
1. Check if window focus is enabled in configuration
2. Always attempt to focus browser window (regardless of active connections)
3. If focus fails and no active connections, fall back to opening new browser window
4. Log all focus attempts and results

### 5. Browser Detection Utility (`src/server/browserDetector.ts`)

**Purpose**: Detect which browsers are currently running and can be focused.

**Key Methods**:
```typescript
interface BrowserDetector {
  getRunningBrowsers(): Promise<string[]>;
  getBrowserProcessInfo(browserName: string): Promise<ProcessInfo | null>;
  isUrlOpenInBrowser(url: string, browserName: string): Promise<boolean>;
}
```

## Data Models

### Window Focus Result
```typescript
interface WindowFocusResult {
  success: boolean;
  method: 'applescript' | 'powershell' | 'wmctrl' | 'xdotool' | 'fallback';
  browser: string;
  error?: string;
  timestamp: number;
}
```

### Browser Process Info
```typescript
interface ProcessInfo {
  pid: number;
  name: string;
  windowTitle?: string;
  isActive: boolean;
}
```

### Focus Strategy
```typescript
interface FocusStrategy {
  name: string;
  platform: NodeJS.Platform;
  command: (browser: string, url?: string) => string;
  validate: () => Promise<boolean>;
}
```

## Error Handling

### Graceful Degradation
1. **Primary Strategy Fails**: Try alternative platform commands
2. **All Platform Commands Fail**: Fall back to opening new browser window
3. **Browser Opening Fails**: Log error and continue with session
4. **Configuration Errors**: Use default settings and log warnings

### Error Categories
- **Platform Detection Errors**: Default to generic commands
- **Command Execution Errors**: Retry with different browsers/commands
- **Permission Errors**: Log warning and disable focus for session
- **Timeout Errors**: Cancel focus attempt and continue

### Logging Strategy
- **Info Level**: Successful focus operations
- **Warn Level**: Fallback operations and configuration issues
- **Error Level**: Complete failures and system errors
- **Debug Level**: Detailed command execution and timing

## Testing Strategy

### Unit Tests
- **Platform Detection**: Test correct platform identification
- **Command Generation**: Verify correct commands for each platform/browser
- **Configuration Loading**: Test various configuration scenarios
- **Error Handling**: Test graceful failure modes

### Integration Tests
- **End-to-End Focus**: Test complete focus workflow
- **Multi-Browser Support**: Test with different browsers installed
- **Configuration Changes**: Test runtime configuration updates
- **WebSocket Integration**: Test focus during active sessions

### Manual Testing Scenarios
1. **First MCP Call**: Verify browser opens and focuses
2. **Subsequent MCP Calls**: Verify existing window focuses
3. **Multiple Browsers**: Test focus with different browsers
4. **Minimized Windows**: Test restoration of minimized windows
5. **Multiple Tabs**: Test focus of correct tab
6. **Configuration Disabled**: Test that focus is skipped when disabled

### Platform-Specific Testing
- **macOS**: Test with Safari, Chrome, Firefox, Edge
- **Windows**: Test with Chrome, Edge, Firefox
- **Linux**: Test with various window managers (GNOME, KDE, XFCE)

## Implementation Phases

### Phase 1: Core Infrastructure
- Create WindowFocusManager class
- Implement platform detection
- Add configuration options
- Basic error handling

### Phase 2: Platform-Specific Commands
- Implement macOS AppleScript commands
- Implement Windows PowerShell commands
- Implement Linux wmctrl/xdotool commands
- Add browser detection logic

### Phase 3: Integration
- Modify solicit-input to use window focus
- Add comprehensive logging
- Implement retry mechanisms
- Add fallback notifications

### Phase 4: Testing and Refinement
- Comprehensive testing across platforms
- Performance optimization
- Edge case handling
- Documentation updates

## Security Considerations

### Command Injection Prevention
- Sanitize all browser names and URLs before command execution
- Use parameterized commands where possible
- Validate input against allowed browser names

### Permission Requirements
- **macOS**: May require accessibility permissions for AppleScript
- **Windows**: PowerShell execution policy considerations
- **Linux**: X11 access for window management tools

### Privacy Considerations
- Log only necessary information (avoid logging URLs with sensitive data)
- Respect user's window management preferences
- Provide clear opt-out mechanisms