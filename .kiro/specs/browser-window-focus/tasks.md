# Implementation Plan

- [x] 1. Add window focus configuration options to config.ts
  - Extend the existing config.ts file with WINDOW_FOCUS_CONFIG object
  - Include all configuration options: enabled, strategy, browsers, fallbackNotification, retryAttempts, retryDelay
  - Add proper TypeScript types and environment variable parsing
  - _Requirements: 3.1, 3.4_

- [x] 2. Create browser detection utility module
  - Create src/server/browserDetector.ts with BrowserDetector class
  - Implement getRunningBrowsers() method to detect active browser processes
  - Implement getBrowserProcessInfo() method to get process details
  - Add platform-specific process detection logic using child_process
  - Write unit tests for browser detection functionality
  - _Requirements: 2.1, 2.2, 2.3, 4.3_

- [x] 3. Implement core WindowFocusManager class
  - Create src/server/windowFocusManager.ts with WindowFocusManager class
  - Implement platform detection method (detectPlatform)
  - Implement configuration loading and validation (isWindowFocusEnabled)
  - Add basic error handling and logging infrastructure
  - Create interfaces for WindowFocusResult and FocusStrategy
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

- [x] 4. Implement macOS window focus strategy
  - Add macOS-specific focus commands using AppleScript in WindowFocusManager
  - Implement browser-specific AppleScript commands for Safari, Chrome, Firefox, Edge
  - Add command execution logic using child_process.exec
  - Implement error handling for AppleScript execution failures
  - Write unit tests for macOS focus strategy
  - _Requirements: 2.1, 4.1, 4.2_

- [x] 5. Implement Windows window focus strategy
  - Add Windows-specific focus commands using PowerShell in WindowFocusManager
  - Implement browser-specific PowerShell commands for Chrome, Edge, Firefox
  - Add command execution logic with proper PowerShell parameter handling
  - Implement error handling for PowerShell execution failures
  - Write unit tests for Windows focus strategy
  - _Requirements: 2.2, 4.1, 4.2_

- [x] 6. Implement Linux window focus strategy
  - Add Linux-specific focus commands using wmctrl and xdotool in WindowFocusManager
  - Implement fallback logic between wmctrl and xdotool
  - Add browser window detection using window titles and process names
  - Implement error handling for X11 window management failures
  - Write unit tests for Linux focus strategy
  - _Requirements: 2.3, 4.1, 4.2_

- [x] 7. Implement main focusBrowserWindow method
  - Create the main focusBrowserWindow method in WindowFocusManager
  - Implement platform-specific strategy selection logic
  - Add retry mechanism with configurable attempts and delays
  - Implement browser priority logic (try multiple browsers if first fails)
  - Add comprehensive logging for all focus attempts and results
  - _Requirements: 1.1, 1.2, 1.3, 4.4, 4.5_

- [ ] 8. Integrate window focus into solicit-input workflow
  - Modify src/mcp/solicit-input.ts to use WindowFocusManager
  - Add window focus attempt before checking active connections
  - Implement fallback logic: focus existing window → open new window if focus fails
  - Add configuration check to skip focus when disabled
  - Update logging to include focus operation results
  - _Requirements: 1.1, 1.2, 1.3, 3.2, 4.4_

- [x] 9. Add comprehensive error handling and logging
  - Enhance error handling in WindowFocusManager for all failure scenarios
  - Add structured logging with appropriate log levels (info, warn, error, debug)
  - Implement graceful degradation when focus operations fail
  - Add timeout handling for long-running focus commands
  - Create error recovery mechanisms for common failure cases
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 10. Create integration tests for window focus functionality
  - Write integration tests for complete focus workflow in tests/windowFocus.test.ts
  - Test focus behavior with different browser configurations
  - Test configuration changes and their effects on focus behavior
  - Test error scenarios and fallback mechanisms
  - Mock system commands for reliable testing across platforms
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 11. Add window restoration for minimized windows
  - Extend platform-specific commands to handle minimized windows
  - Implement window state detection (minimized, hidden, active)
  - Add restoration commands before focus commands
  - Test window restoration across different platforms and browsers
  - _Requirements: 4.1, 4.4_

- [x] 12. Implement tab-specific focusing for multi-tab scenarios
  - Add URL-based tab detection logic to browser detection utility
  - Implement tab activation commands for supported browsers
  - Add fallback to general browser focus when tab-specific focus fails
  - Test tab focusing with multiple tabs open in same browser
  - _Requirements: 1.4, 4.3_