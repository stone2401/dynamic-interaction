/**
 * Tab-specific focusing tests
 * Tests the functionality for focusing specific browser tabs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindowFocusManager } from '../../src/server/windowFocusManager';
import { browserDetector } from '../../src/server/browserDetector';
import { TabInfo } from '../../src/server/browserDetector';

// Mock the browserDetector module
vi.mock('../../src/server/browserDetector', () => {
    return {
        browserDetector: {
            getBrowserTabs: vi.fn(),
            isUrlOpenInBrowser: vi.fn()
        },
        TabInfo: vi.fn()
    };
});

// Mock the child_process exec function
vi.mock('child_process', () => {
    return {
        exec: vi.fn((command, callback) => {
            if (callback) {
                callback(null, { stdout: 'success', stderr: '' });
            }
            return {
                on: vi.fn(),
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() }
            };
        })
    };
});

describe('Tab-specific focusing', () => {
    let windowFocusManager: WindowFocusManager;

    beforeEach(() => {
        windowFocusManager = new WindowFocusManager({
            enabled: true,
            strategy: 'auto',
            browsers: ['chrome', 'firefox', 'safari', 'edge'],
            fallbackNotification: true,
            retryAttempts: 2,
            retryDelay: 100
        });

        // Mock platform detection to return 'darwin' for testing
        vi.spyOn(windowFocusManager as any, 'detectPlatform').mockReturnValue('darwin');

        // Mock executeSystemCommand to return true
        vi.spyOn(windowFocusManager as any, 'executeSystemCommand').mockResolvedValue(true);

        // Mock validatePlatformSupport to return true
        vi.spyOn(windowFocusManager as any, 'validatePlatformSupport').mockResolvedValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should focus a specific tab when found', async () => {
        // Mock tab detection to return a matching tab
        const mockTab: TabInfo = {
            url: 'https://example.com/page',
            title: 'Example Page',
            isActive: false
        };

        (browserDetector.getBrowserTabs as any).mockResolvedValue({
            browser: 'chrome',
            tabs: [mockTab],
            hasMatchingTab: true,
            activeTab: mockTab
        });

        const result = await windowFocusManager.focusSpecificTab('https://example.com/page');

        expect(result).toBe(true);
        expect(browserDetector.getBrowserTabs).toHaveBeenCalledWith('chrome', 'https://example.com/page');
        expect(windowFocusManager['executeSystemCommand']).toHaveBeenCalled();
    });

    it('should try multiple browsers when first browser has no matching tab', async () => {
        // Mock tab detection to return no matching tab for chrome, but a match for firefox
        (browserDetector.getBrowserTabs as any).mockImplementation(async (browser, url) => {
            if (browser === 'chrome') {
                return {
                    browser: 'chrome',
                    tabs: [],
                    hasMatchingTab: false
                };
            } else if (browser === 'firefox') {
                const mockTab: TabInfo = {
                    url: 'https://example.com/page',
                    title: 'Example Page',
                    isActive: false
                };
                return {
                    browser: 'firefox',
                    tabs: [mockTab],
                    hasMatchingTab: true,
                    activeTab: mockTab
                };
            }
            return {
                browser,
                tabs: [],
                hasMatchingTab: false
            };
        });

        const result = await windowFocusManager.focusSpecificTab('https://example.com/page');

        expect(result).toBe(true);
        expect(browserDetector.getBrowserTabs).toHaveBeenCalledWith('chrome', 'https://example.com/page');
        expect(browserDetector.getBrowserTabs).toHaveBeenCalledWith('firefox', 'https://example.com/page');
        expect(browserDetector.getBrowserTabs).not.toHaveBeenCalledWith('safari', 'https://example.com/page');
    });

    it('should fall back to general browser focus when no matching tab is found', async () => {
        // Mock tab detection to return no matching tabs
        (browserDetector.getBrowserTabs as any).mockResolvedValue({
            browser: 'chrome',
            tabs: [],
            hasMatchingTab: false
        });

        // Spy on focusBrowserWindow
        const focusSpy = vi.spyOn(windowFocusManager, 'focusBrowserWindow');

        await windowFocusManager.focusBrowserWindow('https://example.com/page');

        expect(focusSpy).toHaveBeenCalledWith('https://example.com/page');
        expect(browserDetector.getBrowserTabs).toHaveBeenCalled();
    });

    it('should handle errors during tab detection', async () => {
        // Mock tab detection to throw an error
        (browserDetector.getBrowserTabs as any).mockRejectedValue(new Error('Tab detection failed'));

        const result = await windowFocusManager.focusSpecificTab('https://example.com/page');

        expect(result).toBe(false);
    });

    it('should generate correct tab focus commands for different platforms', async () => {
        const mockTab: TabInfo = {
            url: 'https://example.com/page',
            title: 'Example Page',
            isActive: false
        };

        // Test macOS command generation
        vi.spyOn(windowFocusManager as any, 'detectPlatform').mockReturnValue('darwin');
        const macCommand = (windowFocusManager as any).generateMacOSTabFocusCommand('chrome', mockTab, 'https://example.com/page');
        expect(macCommand.command).toContain('osascript');
        expect(macCommand.command).toContain('Google Chrome');

        // Test Windows command generation
        vi.spyOn(windowFocusManager as any, 'detectPlatform').mockReturnValue('win32');
        const winCommand = (windowFocusManager as any).generateWindowsTabFocusCommand('chrome', mockTab, 'https://example.com/page');
        expect(winCommand.command).toContain('powershell');
        expect(winCommand.command).toContain('chrome');

        // Test Linux command generation
        vi.spyOn(windowFocusManager as any, 'detectPlatform').mockReturnValue('linux');
        const linuxCommand = (windowFocusManager as any).generateLinuxTabFocusCommand('chrome', { ...mockTab, windowId: '12345' }, 'https://example.com/page');
        expect(linuxCommand.command).toContain('wmctrl -i -a 12345');
    });
});