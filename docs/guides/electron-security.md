# Electron Security Guide

This document outlines security considerations and best practices for using the Electron GUI mode in Dynamic Interaction MCP.

## Security Overview

The Electron implementation follows security best practices to ensure safe operation in desktop environments. This guide explains the security measures in place and how to maintain them.

## Built-in Security Features

### 1. Context Isolation

**What it does:**
- Isolates the main world context from the isolated world context
- Prevents renderer process from accessing Node.js APIs directly
- Ensures secure communication between main and renderer processes

**Implementation:**
```typescript
webPreferences: {
  contextIsolation: true,  // Enabled by default
  nodeIntegration: false,  // Disabled by default
}
```

**Benefits:**
- Prevents malicious scripts from accessing system resources
- Protects against code injection attacks
- Maintains separation between application and web content

### 2. Disabled Node.js Integration

**What it does:**
- Prevents renderer process from directly accessing Node.js APIs
- Blocks access to `require()`, `process`, and other Node.js globals
- Forces all system interactions through secure IPC channels

**Implementation:**
```typescript
webPreferences: {
  nodeIntegration: false,        // Disabled by default
  enableRemoteModule: false,     // Remote module disabled
}
```

**Benefits:**
- Reduces attack surface
- Prevents unauthorized file system access
- Blocks network operations from renderer

### 3. Secure Preload Script

**What it does:**
- Provides controlled bridge between main and renderer processes
- Exposes only necessary APIs to the renderer
- Validates all communication between processes

**Implementation:**
```typescript
// src/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Only expose necessary functions
  closeWindow: () => ipcRenderer.invoke('close-window'),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
  // No direct file system or network access
});
```

**Benefits:**
- Controlled API surface
- Input validation at boundary
- Audit trail for all interactions

### 4. Content Security Policy (CSP)

**What it does:**
- Restricts resource loading and script execution
- Prevents XSS attacks
- Controls network requests

**Implementation:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' ws://localhost:*;
  img-src 'self' data: blob:;
">
```

**Benefits:**
- Prevents malicious script injection
- Controls external resource loading
- Limits network access to known endpoints

## Security Best Practices

### 1. Environment Configuration

**Secure Configuration:**
```bash
# Use specific versions
UI_MODE=electron
NODE_ENV=production  # Disable debug features in production

# Avoid development settings in production
# NODE_ENV=development  # Only for development
```

**Avoid:**
```bash
# Don't expose sensitive information
DEBUG=*  # Too verbose, may leak information
LOG_LEVEL=debug  # May log sensitive data
```

### 2. Network Security

**WebSocket Security:**
- Connections are limited to localhost by default
- No external network access from renderer process
- All communication goes through secure WebSocket connection

**Configuration:**
```typescript
// Secure WebSocket configuration
const wsUrl = `ws://localhost:${port}`;  // Localhost only
// Never: ws://0.0.0.0 or external hosts
```

### 3. File System Access

**Restrictions:**
- No direct file system access from renderer
- All file operations go through main process
- Input validation on all file paths

**Safe Practices:**
```typescript
// In main process only
const safePath = path.resolve(userDataPath, sanitizedFilename);
if (!safePath.startsWith(userDataPath)) {
  throw new Error('Invalid file path');
}
```

### 4. Process Isolation

**Main Process Security:**
- Minimal attack surface
- No web content execution
- Controlled IPC communication

**Renderer Process Security:**
- Sandboxed environment
- No Node.js access
- Limited system interaction

## Security Configurations

### Production Configuration

```typescript
// src/electron/window-manager.ts - Production settings
const secureWindowOptions: BrowserWindowConstructorOptions = {
  webPreferences: {
    nodeIntegration: false,           // Critical: Always false
    contextIsolation: true,           // Critical: Always true
    enableRemoteModule: false,        // Critical: Always false
    allowRunningInsecureContent: false, // Block insecure content
    experimentalFeatures: false,      // Disable experimental features
    webSecurity: true,               // Enable web security
    preload: path.join(__dirname, 'preload.js'), // Secure bridge
    sandbox: false,                  // We use contextIsolation instead
    nodeIntegrationInWorker: false,  // Disable in web workers
    nodeIntegrationInSubFrames: false, // Disable in subframes
    safeDialogs: true,              // Prevent dialog spam
    safeDialogsMessage: 'Multiple dialogs detected', // Custom message
  },
  show: false,                      // Don't show until ready
  webSecurity: true,               // Enable web security
};
```

### Development Configuration

```typescript
// Development-only additions
if (process.env.NODE_ENV === 'development') {
  windowOptions.webPreferences.devTools = true;  // Enable DevTools
  // Still maintain security restrictions
}
```

## Security Auditing

### 1. Regular Security Checks

**Automated Checks:**
```bash
# Check for security vulnerabilities
npm audit

# Update dependencies regularly
npm update

# Check Electron version
electron --version
```

**Manual Checks:**
- Review preload script for unnecessary API exposure
- Audit IPC communication channels
- Verify CSP headers are properly set
- Check for debug code in production builds

### 2. Security Testing

**Test Cases:**
```bash
# Test context isolation
# Should fail: window.require is undefined
# Should fail: window.process is undefined
# Should work: window.electronAPI (if exposed)

# Test network restrictions
# Should fail: fetch('http://external-site.com')
# Should work: WebSocket to localhost

# Test file system restrictions
# Should fail: Direct file system access
# Should work: Controlled file operations through IPC
```

### 3. Log Analysis

**Security-relevant Logs:**
```bash
# Monitor for security events
grep -i "security\|error\|unauthorized" ~/.dynamic-interaction/logs/combined.log

# Check for suspicious activity
grep -i "eval\|script\|inject" ~/.dynamic-interaction/logs/combined.log
```

## Threat Model

### 1. Potential Threats

**Malicious Web Content:**
- XSS attacks through user input
- Script injection in messages
- Malicious file uploads

**Mitigation:**
- Input sanitization
- Content Security Policy
- File type validation

**Process Exploitation:**
- Renderer process compromise
- IPC channel abuse
- Privilege escalation

**Mitigation:**
- Context isolation
- Minimal IPC surface
- Input validation

**Network Attacks:**
- Man-in-the-middle attacks
- WebSocket hijacking
- DNS spoofing

**Mitigation:**
- Localhost-only connections
- Secure WebSocket implementation
- Certificate validation

### 2. Attack Vectors

**High Risk:**
- Malicious user input
- Compromised dependencies
- Social engineering

**Medium Risk:**
- Network interception
- File system access
- Process injection

**Low Risk:**
- Physical access
- Side-channel attacks
- Timing attacks

## Incident Response

### 1. Security Incident Detection

**Warning Signs:**
- Unexpected network connections
- Unusual file system activity
- High CPU/memory usage
- Error messages about security violations

**Monitoring:**
```bash
# Monitor network connections
lsof -i | grep electron

# Monitor file access
lsof -p $(pgrep electron)

# Monitor system calls (Linux)
strace -p $(pgrep electron) 2>&1 | grep -E "(open|connect|socket)"
```

### 2. Response Procedures

**Immediate Actions:**
1. Stop the Electron process
2. Disconnect from network if necessary
3. Preserve logs for analysis
4. Switch to browser mode as fallback

**Investigation:**
```bash
# Collect evidence
cp ~/.dynamic-interaction/logs/* /secure/location/
ps aux > process-snapshot.txt
netstat -an > network-snapshot.txt

# Analyze logs
grep -i "error\|security\|unauthorized" ~/.dynamic-interaction/logs/*
```

**Recovery:**
1. Update to latest version
2. Clear cache and sessions
3. Verify configuration
4. Test in isolated environment

## Compliance Considerations

### 1. Data Protection

**User Data:**
- No persistent storage of sensitive data
- Session data cleared on exit
- Logs contain no personal information

**Network Data:**
- All communication over localhost
- No external data transmission
- WebSocket connections secured

### 2. Access Control

**User Permissions:**
- No elevated privileges required
- Standard user account sufficient
- No system-wide modifications

**File Permissions:**
- User data directory only
- No system file access
- Temporary files cleaned up

## Security Updates

### 1. Dependency Management

**Regular Updates:**
```bash
# Check for security updates
npm audit

# Update Electron
npm update electron

# Update all dependencies
npm update
```

**Version Pinning:**
```json
{
  "optionalDependencies": {
    "electron": "^28.0.0"  // Pin to secure version
  }
}
```

### 2. Security Notifications

**Stay Informed:**
- Subscribe to Electron security advisories
- Monitor Node.js security releases
- Follow security best practices updates

**Update Process:**
1. Test updates in development
2. Review security changelog
3. Deploy to production
4. Monitor for issues

## Conclusion

The Electron implementation prioritizes security through:
- Defense in depth
- Principle of least privilege
- Secure by default configuration
- Regular security updates

Following these guidelines ensures safe operation in desktop environments while maintaining the rich functionality of the Dynamic Interaction MCP system.

## Related Documentation

- [Electron Setup Guide](./electron-setup-guide.md) - Installation and configuration
- [Configuration Reference](./electron-configuration.md) - Configuration options
- [Troubleshooting Guide](./electron-troubleshooting.md) - Common issues and solutions