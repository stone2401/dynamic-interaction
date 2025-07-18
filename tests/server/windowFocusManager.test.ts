/**
 * Unit tests for WindowFocusManager - macOS focus strategy
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WindowFocusManager, WindowFocusResult } from '../../src/server/windowFocusManager';
import { WindowFocusConfig } from '../../src/config';

// Mock child_process.exec
vi.mock('child_process', () => ({
    exec: vi.fn()
}));

// Mock logger
vi.mock('../../src/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('WindowFocusManager - Cross-Platform Focus Strategy', () => {
    let windowFocusManager: WindowFocusManager;
    let mockConfig: WindowFocusConfig;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock process.platform to be darwin
        Object.defineProperty(process, 'platform', {
            value: 'darwin',
            configurable: true
        });

        mockConfig = {
            enabled: true,
            strategy: 'applescript',
            browsers: ['chrome', 'safari', 'firefox', 'edge'],
            fallbackNotification: true,
            retryAttempts: 2,
            retryDelay: 100
        };

        windowFocusManager = new WindowFocusManager(mockConfig);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Platform Detection', () => {
        it('should detect macOS platform correctly', () => {
            expect(windowFocusManager.detectPlatform()).toBe('darwin');
        });
    });

    describe('AppleScript Command Generation', () => {
        it('should generate correct AppleScript for Chrome without URL', () => {
            // Access private method for testing
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'chrome');

            expect(command).toBe('osascript -e \'tell application "Google Chrome" to activate\'');
        });

        it('should generate correct AppleScript for Safari without URL', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'safari');

            expect(command).toBe('osascript -e \'tell application "Safari" to activate\'');
        });

        it('should generate correct AppleScript for Firefox without URL', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'firefox');

            expect(command).toBe('osascript -e \'tell application "Firefox" to activate\'');
        });

        it('should generate correct AppleScript for Edge without URL', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'edge');

            expect(command).toBe('osascript -e \'tell application "Microsoft Edge" to activate\'');
        });

        it('should generate correct AppleScript for Chrome with URL', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'chrome', 'http://localhost:3000');

            expect(command).toContain('Google Chrome');
            expect(command).toContain('http://localhost:3000');
            expect(command).toContain('activate');
        });

        it('should generate correct AppleScript for Safari with URL', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'safari', 'http://localhost:3000');

            expect(command).toContain('Safari');
            expect(command).toContain('http://localhost:3000');
            expect(command).toContain('activate');
        });

        it('should handle unknown browser names', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'unknown-browser');

            expect(command).toBe('osascript -e \'tell application "unknown-browser" to activate\'');
        });

        it('should sanitize browser names', () => {
            const generateCommand = (windowFocusManager as any).generateMacOSAppleScript;
            const command = generateCommand.call(windowFocusManager, 'chrome; rm -rf /');

            // The dangerous characters should be removed from the browser name
            expect(command).toContain('chromerm-rf'); // Spaces and special chars removed
            expect(command).not.toContain('chrome; rm -rf /'); // Original malicious input should not be present
            expect(command).toContain('osascript'); // Should still be a valid AppleScript command
        });
    });

    describe('macOS Browser Focus', () => {
        it('should successfully focus Chrome browser', async () => {
            // Mock successful command execution
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(true);

            const focusMethod = (windowFocusManager as any).focusMacOSBrowser;
            const result: WindowFocusResult = await focusMethod.call(windowFocusManager, 'chrome');

            expect(result.success).toBe(true);
            expect(result.method).toBe('applescript');
            expect(result.browser).toBe('chrome');
            expect(result.error).toBeUndefined();
        });

        it('should handle AppleScript execution failure', async () => {
            // Mock failed command execution
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(false);

            const focusMethod = (windowFocusManager as any).focusMacOSBrowser;
            const result: WindowFocusResult = await focusMethod.call(windowFocusManager, 'chrome');

            expect(result.success).toBe(false);
            expect(result.method).toBe('applescript');
            expect(result.browser).toBe('chrome');
            expect(result.error).toBe('AppleScript execution failed');
        });

        it('should handle exceptions during focus', async () => {
            // Mock exception during command execution
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockRejectedValue(new Error('Command failed'));

            const focusMethod = (windowFocusManager as any).focusMacOSBrowser;
            const result: WindowFocusResult = await focusMethod.call(windowFocusManager, 'safari');

            expect(result.success).toBe(false);
            expect(result.method).toBe('applescript');
            expect(result.browser).toBe('safari');
            expect(result.error).toBe('Command failed');
        });
    });

    describe('Retry Mechanism', () => {
        it('should retry failed focus attempts', async () => {
            let attemptCount = 0;

            // Mock first attempt to fail, second to succeed
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockImplementation(async () => {
                attemptCount++;
                return attemptCount > 1;
            });

            const retryMethod = (windowFocusManager as any).tryFocusBrowserWithRetry;
            const result: WindowFocusResult = await retryMethod.call(windowFocusManager, 'chrome');

            expect(attemptCount).toBe(2);
            expect(result.success).toBe(true);
            expect(result.method).toBe('applescript');
        });

        it('should fail after all retry attempts', async () => {
            // Mock all attempts to fail
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(false);

            const retryMethod = (windowFocusManager as any).tryFocusBrowserWithRetry;
            const result: WindowFocusResult = await retryMethod.call(windowFocusManager, 'chrome');

            expect(result.success).toBe(false);
            expect(result.method).toBe('applescript');
            expect(result.error).toBe('AppleScript execution failed');
        });
    });

    describe('Main Focus Method', () => {
        it('should successfully focus browser window', async () => {
            // Mock successful command execution and platform validation
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(true);
            vi.spyOn(windowFocusManager, 'validatePlatformSupport').mockResolvedValue(true);

            const result = await windowFocusManager.focusBrowserWindow('http://localhost:3000');

            expect(result).toBe(true);
        });

        it('should return false when window focus is disabled', async () => {
            const disabledConfig = { ...mockConfig, enabled: false };
            const disabledManager = new WindowFocusManager(disabledConfig);

            const result = await disabledManager.focusBrowserWindow('http://localhost:3000');

            expect(result).toBe(false);
        });

        it('should return false for invalid URL', async () => {
            const result = await windowFocusManager.focusBrowserWindow('invalid-url');

            expect(result).toBe(false);
        });

        it('should return false when platform is not supported', async () => {
            // Mock platform validation to fail
            vi.spyOn(windowFocusManager, 'validatePlatformSupport').mockResolvedValue(false);

            const result = await windowFocusManager.focusBrowserWindow('http://localhost:3000');

            expect(result).toBe(false);
        });

        it('should try multiple browsers in order', async () => {
            let callCount = 0;

            // Mock first browser to fail, second to succeed
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockImplementation(async () => {
                callCount++;
                return callCount > 2; // Fail first browser (2 attempts), succeed on second browser
            });

            // Mock platform validation
            vi.spyOn(windowFocusManager, 'validatePlatformSupport').mockResolvedValue(true);

            const result = await windowFocusManager.focusBrowserWindow('http://localhost:3000');

            expect(result).toBe(true);
            expect(callCount).toBeGreaterThan(2);
        });
    });

    describe('Platform Validation', () => {
        it('should validate macOS platform support', async () => {
            // Mock successful osascript check
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(true);

            const result = await windowFocusManager.validatePlatformSupport();

            expect(result).toBe(true);
        });

        it('should fail validation when osascript is not available', async () => {
            // Mock failed osascript check
            vi.spyOn(windowFocusManager, 'executeSystemCommand').mockResolvedValue(false);

            const result = await windowFocusManager.validatePlatformSupport();

            expect(result).toBe(false);
        });
    });

    describe('Configuration Management', () => {
        it('should return current configuration', () => {
            const config = windowFocusManager.getConfig();

            expect(config.enabled).toBe(true);
            expect(config.strategy).toBe('applescript');
            expect(config.browsers).toEqual(['chrome', 'safari', 'firefox', 'edge']);
        });

        it('should update configuration', () => {
            const newConfig = { retryAttempts: 5, retryDelay: 200 };
            windowFocusManager.updateConfig(newConfig);

            const updatedConfig = windowFocusManager.getConfig();
            expect(updatedConfig.retryAttempts).toBe(5);
            expect(updatedConfig.retryDelay).toBe(200);
        });

        it('should check if window focus is enabled', () => {
            expect(windowFocusManager.isWindowFocusEnabled()).toBe(true);

            windowFocusManager.updateConfig({ enabled: false });
            expect(windowFocusManager.isWindowFocusEnabled()).toBe(false);
        });
    });

    describe('Focus Strategy Selection', () => {
        it('should return applescript strategy for macOS', () => {
            const strategy = windowFocusManager.getFocusStrategy();
            expect(strategy).toBe('applescript');
        });

        it('should respect manual strategy configuration', () => {
            windowFocusManager.updateConfig({ strategy: 'powershell' });
            const strategy = windowFocusManager.getFocusStrategy();
            expect(strategy).toBe('powershell');
        });

        it('should auto-detect strategy when set to auto', () => {
            windowFocusManager.updateConfig({ strategy: 'auto' });
            const strategy = windowFocusManager.getFocusStrategy();
            expect(strategy).toBe('applescript'); // Should detect macOS
        });
    });
});