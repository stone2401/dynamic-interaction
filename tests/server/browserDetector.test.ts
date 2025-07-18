/**
 * Unit tests for BrowserDetector class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exec } from 'child_process';
import { BrowserDetector } from '../../src/server/browserDetector';

// Mock child_process
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

const mockExec = vi.mocked(exec);

describe('BrowserDetector', () => {
    let browserDetector: BrowserDetector;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Get fresh instance
        browserDetector = BrowserDetector.getInstance();
    });

    describe('Basic Functionality', () => {
        it('should be a singleton', () => {
            const instance1 = BrowserDetector.getInstance();
            const instance2 = BrowserDetector.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should detect current platform', () => {
            const platform = browserDetector.getPlatform();
            expect(platform).toBe(process.platform);
        });

        it('should return supported browsers', () => {
            const browsers = browserDetector.getSupportedBrowsers();
            expect(browsers).toBeInstanceOf(Array);
            expect(browsers.length).toBeGreaterThan(0);
        });
    });

    describe('getRunningBrowsers', () => {
        it('should return empty array when no browsers are running', async () => {
            // Mock exec to return empty process list
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    callback(null, { stdout: 'PID COMM ARGS\n', stderr: '' });
                }
            });

            const runningBrowsers = await browserDetector.getRunningBrowsers();
            expect(runningBrowsers).toEqual([]);
        });

        it('should detect running browsers', async () => {
            // Mock exec to return browser processes based on current platform
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    let stdout = '';
                    if (process.platform === 'darwin') {
                        stdout = 'PID COMM ARGS\n1234 Google\\ Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n';
                    } else if (process.platform === 'win32') {
                        stdout = 'Node,CommandLine,Name,ProcessId\nCOMPUTER,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",chrome.exe,1234\n';
                    } else {
                        stdout = 'PID COMM ARGS\n1234 chrome /usr/bin/google-chrome\n';
                    }
                    callback(null, { stdout, stderr: '' });
                }
            });

            const runningBrowsers = await browserDetector.getRunningBrowsers();
            expect(runningBrowsers).toContain('chrome');
        });

        it('should handle exec errors gracefully', async () => {
            // Mock exec to return error
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    callback(new Error('Command failed'), { stdout: '', stderr: 'Error' });
                }
            });

            const runningBrowsers = await browserDetector.getRunningBrowsers();
            expect(runningBrowsers).toEqual([]);
        });
    });

    describe('getBrowserProcessInfo', () => {
        it('should return null for unsupported browser', async () => {
            const processInfo = await browserDetector.getBrowserProcessInfo('unsupported-browser');
            expect(processInfo).toBeNull();
        });

        it('should return null when browser is not running', async () => {
            // Mock exec to return empty process list
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    callback(null, { stdout: 'PID COMM ARGS\n', stderr: '' });
                }
            });

            const processInfo = await browserDetector.getBrowserProcessInfo('chrome');
            expect(processInfo).toBeNull();
        });

        it('should return process info for running browser', async () => {
            // Mock exec to return browser process based on current platform
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    let stdout = '';
                    if (process.platform === 'darwin') {
                        stdout = 'PID COMM ARGS\n1234 Google\\ Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --title="Test Window"\n';
                    } else if (process.platform === 'win32') {
                        stdout = 'Node,CommandLine,Name,ProcessId\nCOMPUTER,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe --title=Test",chrome.exe,1234\n';
                    } else {
                        stdout = 'PID COMM ARGS\n1234 chrome /usr/bin/google-chrome --title="Test Window"\n';
                    }
                    callback(null, { stdout, stderr: '' });
                }
            });

            const processInfo = await browserDetector.getBrowserProcessInfo('chrome');

            expect(processInfo).not.toBeNull();
            expect(processInfo?.pid).toBe(1234);
            expect(processInfo?.isActive).toBe(false);
        });

        it('should handle exec errors gracefully', async () => {
            // Mock exec to return error
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    callback(new Error('Command failed'), { stdout: '', stderr: 'Error' });
                }
            });

            const processInfo = await browserDetector.getBrowserProcessInfo('chrome');
            expect(processInfo).toBeNull();
        });
    });

    describe('getAllBrowsersDetectionResult', () => {
        it('should return detection results for all supported browsers', async () => {
            // Mock exec to return Chrome process only
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    let stdout = '';
                    if (process.platform === 'darwin') {
                        stdout = 'PID COMM ARGS\n1234 Google\\ Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n';
                    } else if (process.platform === 'win32') {
                        stdout = 'Node,CommandLine,Name,ProcessId\nCOMPUTER,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",chrome.exe,1234\n';
                    } else {
                        stdout = 'PID COMM ARGS\n1234 chrome /usr/bin/google-chrome\n';
                    }
                    callback(null, { stdout, stderr: '' });
                }
            });

            const results = await browserDetector.getAllBrowsersDetectionResult();

            expect(results.length).toBeGreaterThan(0);

            const chromeResult = results.find(r => r.browser === 'chrome');
            expect(chromeResult?.isRunning).toBe(true);
            expect(chromeResult?.processes).toHaveLength(1);
        });

        it('should handle errors for individual browsers gracefully', async () => {
            // Mock exec to fail
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    callback(new Error('Command failed'), { stdout: '', stderr: 'Error' });
                }
            });

            const results = await browserDetector.getAllBrowsersDetectionResult();

            // Should still return results for all browsers, even if detection failed
            expect(results.length).toBeGreaterThan(0);

            // All should have failed gracefully
            const failedResults = results.filter(r => !r.isRunning && r.processes.length === 0);
            expect(failedResults.length).toBe(results.length);
        });
    });

    describe('Process Parsing', () => {
        it('should extract window title from command line arguments', async () => {
            // Mock exec to return process with title
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    let stdout = '';
                    if (process.platform === 'darwin') {
                        stdout = 'PID COMM ARGS\n1234 Google\\ Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --title="My Window Title"\n';
                    } else if (process.platform === 'win32') {
                        stdout = 'Node,CommandLine,Name,ProcessId\nCOMPUTER,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe --title=\\"My Window Title\\"",chrome.exe,1234\n';
                    } else {
                        stdout = 'PID COMM ARGS\n1234 chrome /usr/bin/google-chrome --title="My Window Title"\n';
                    }
                    callback(null, { stdout, stderr: '' });
                }
            });

            const processInfo = await browserDetector.getBrowserProcessInfo('chrome');

            expect(processInfo?.windowTitle).toBe('My Window Title');
        });

        it('should handle processes without window titles', async () => {
            // Mock exec to return process without title
            mockExec.mockImplementation((command, callback) => {
                if (typeof callback === 'function') {
                    let stdout = '';
                    if (process.platform === 'darwin') {
                        stdout = 'PID COMM ARGS\n1234 Google\\ Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n';
                    } else if (process.platform === 'win32') {
                        stdout = 'Node,CommandLine,Name,ProcessId\nCOMPUTER,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",chrome.exe,1234\n';
                    } else {
                        stdout = 'PID COMM ARGS\n1234 chrome /usr/bin/google-chrome\n';
                    }
                    callback(null, { stdout, stderr: '' });
                }
            });

            const processInfo = await browserDetector.getBrowserProcessInfo('chrome');

            expect(processInfo?.windowTitle).toBeUndefined();
        });
    });
});