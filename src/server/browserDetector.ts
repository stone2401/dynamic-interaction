/**
 * Browser Detection Utility Module
 * Provides cross-platform browser process detection and management functionality.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger';

const execAsync = promisify(exec);

/**
 * Information about a browser process
 */
export interface ProcessInfo {
    pid: number;
    name: string;
    windowTitle?: string;
    isActive: boolean;
}

/**
 * Browser detection result
 */
export interface BrowserDetectionResult {
    browser: string;
    processes: ProcessInfo[];
    isRunning: boolean;
}

/**
 * Tab information for a browser
 */
export interface TabInfo {
    url: string;
    title: string;
    windowId?: string;
    tabId?: string;
    isActive: boolean;
}

/**
 * Browser tab detection result
 */
export interface BrowserTabResult {
    browser: string;
    tabs: TabInfo[];
    hasMatchingTab: boolean;
    activeTab?: TabInfo;
}

/**
 * Platform-specific process detection commands
 */
interface PlatformCommands {
    listProcesses: string;
    getWindowInfo?: string;
    parseProcess: (output: string) => ProcessInfo[];
}

/**
 * Browser Detection Utility Class
 * Handles cross-platform browser process detection and information gathering.
 */
export class BrowserDetector {
    private static instance: BrowserDetector;
    private platform: NodeJS.Platform;
    private supportedBrowsers: Map<string, string[]>;
    private platformCommands: PlatformCommands;

    private constructor() {
        this.platform = process.platform;
        this.supportedBrowsers = this.initializeSupportedBrowsers();
        this.platformCommands = this.initializePlatformCommands();
    }

    public static getInstance(): BrowserDetector {
        if (!BrowserDetector.instance) {
            BrowserDetector.instance = new BrowserDetector();
        }
        return BrowserDetector.instance;
    }

    /**
     * Initialize supported browsers for each platform
     */
    private initializeSupportedBrowsers(): Map<string, string[]> {
        const browsers = new Map<string, string[]>();

        switch (this.platform) {
            case 'darwin': // macOS
                browsers.set('chrome', ['Google Chrome', 'chrome']);
                browsers.set('safari', ['Safari', 'safari']);
                browsers.set('firefox', ['Firefox', 'firefox']);
                browsers.set('edge', ['Microsoft Edge', 'edge']);
                break;

            case 'win32': // Windows
                browsers.set('chrome', ['chrome.exe', 'Google Chrome']);
                browsers.set('firefox', ['firefox.exe', 'Mozilla Firefox']);
                browsers.set('edge', ['msedge.exe', 'Microsoft Edge']);
                break;

            case 'linux': // Linux
                browsers.set('chrome', ['chrome', 'google-chrome', 'chromium']);
                browsers.set('firefox', ['firefox', 'firefox-esr']);
                browsers.set('edge', ['microsoft-edge', 'edge']);
                break;

            default:
                logger.warn(`Unsupported platform: ${this.platform}`);
        }

        return browsers;
    }

    /**
     * Initialize platform-specific commands
     */
    private initializePlatformCommands(): PlatformCommands {
        switch (this.platform) {
            case 'darwin':
                return {
                    listProcesses: 'ps -eo pid,comm,args',
                    getWindowInfo: 'osascript -e "tell application \\"System Events\\" to get name of every process whose background only is false"',
                    parseProcess: this.parseMacOSProcess.bind(this)
                };

            case 'win32':
                return {
                    listProcesses: 'wmic process get ProcessId,Name,CommandLine /format:csv',
                    parseProcess: this.parseWindowsProcess.bind(this)
                };

            case 'linux':
                return {
                    listProcesses: 'ps -eo pid,comm,args',
                    parseProcess: this.parseLinuxProcess.bind(this)
                };

            default:
                return {
                    listProcesses: 'ps -eo pid,comm,args',
                    parseProcess: this.parseGenericProcess.bind(this)
                };
        }
    }

    /**
     * Get list of currently running browsers
     * @returns Promise<string[]> Array of browser names that are currently running
     */
    public async getRunningBrowsers(): Promise<string[]> {
        try {
            const runningBrowsers: string[] = [];

            for (const [browserName] of this.supportedBrowsers) {
                const isRunning = await this.isBrowserRunning(browserName);
                if (isRunning) {
                    runningBrowsers.push(browserName);
                }
            }

            logger.debug(`Running browsers detected: ${runningBrowsers.join(', ')}`);
            return runningBrowsers;
        } catch (error) {
            logger.error('Error detecting running browsers:', error);
            return [];
        }
    }

    /**
     * Get detailed process information for a specific browser
     * @param browserName Name of the browser to get info for
     * @returns Promise<ProcessInfo | null> Process information or null if not found
     */
    public async getBrowserProcessInfo(browserName: string): Promise<ProcessInfo | null> {
        try {
            const processNames = this.supportedBrowsers.get(browserName.toLowerCase());
            if (!processNames) {
                logger.warn(`Unsupported browser: ${browserName}`);
                return null;
            }

            const { stdout } = await execAsync(this.platformCommands.listProcesses);
            const processes = this.platformCommands.parseProcess(stdout);

            // Find the first matching process
            for (const process of processes) {
                if (this.isProcessMatchingBrowser(process, processNames)) {
                    logger.debug(`Found process for ${browserName}:`, process);
                    return process;
                }
            }

            return null;
        } catch (error) {
            logger.error(`Error getting process info for ${browserName}:`, error);
            return null;
        }
    }

    /**
     * Check if a specific browser is currently running
     * @param browserName Name of the browser to check
     * @returns Promise<boolean> True if browser is running
     */
    private async isBrowserRunning(browserName: string): Promise<boolean> {
        const processInfo = await this.getBrowserProcessInfo(browserName);
        return processInfo !== null;
    }

    /**
     * Check if a process matches a browser based on process names
     * @param process Process information
     * @param browserProcessNames Array of possible process names for the browser
     * @returns boolean True if process matches
     */
    private isProcessMatchingBrowser(process: ProcessInfo, browserProcessNames: string[]): boolean {
        const processName = process.name.toLowerCase();
        return browserProcessNames.some(browserName =>
            processName.includes(browserName.toLowerCase()) ||
            browserName.toLowerCase().includes(processName)
        );
    }

    /**
     * Parse macOS process output
     */
    private parseMacOSProcess(output: string): ProcessInfo[] {
        const processes: ProcessInfo[] = [];
        const lines = output.split('\n').slice(1); // Skip header

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const pid = parseInt(parts[0]);
                let name = parts[1];
                const args = parts.slice(2).join(' ');

                // Handle escaped spaces in process names (e.g., "Google\ Chrome" -> "Google Chrome")
                name = name.replace(/\\/g, '');

                if (!isNaN(pid)) {
                    processes.push({
                        pid,
                        name,
                        windowTitle: this.extractWindowTitle(args),
                        isActive: false // Will be determined by window management tools
                    });
                }
            }
        }

        return processes;
    }

    /**
     * Parse Windows process output
     */
    private parseWindowsProcess(output: string): ProcessInfo[] {
        const processes: ProcessInfo[] = [];
        const lines = output.split('\n').slice(1); // Skip header

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(',');
            if (parts.length >= 4) {
                // Windows CSV format: Node,CommandLine,Name,ProcessId
                const pid = parseInt(parts[3]);
                const name = parts[2];
                const commandLine = parts[1] || '';

                if (!isNaN(pid) && name) {
                    processes.push({
                        pid,
                        name: name.trim().replace(/"/g, ''), // Remove quotes
                        windowTitle: this.extractWindowTitle(commandLine),
                        isActive: false
                    });
                }
            }
        }

        return processes;
    }

    /**
     * Parse Linux process output
     */
    private parseLinuxProcess(output: string): ProcessInfo[] {
        const processes: ProcessInfo[] = [];
        const lines = output.split('\n').slice(1); // Skip header

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const pid = parseInt(parts[0]);
                const name = parts[1];
                const args = parts.slice(2).join(' ');

                if (!isNaN(pid)) {
                    processes.push({
                        pid,
                        name,
                        windowTitle: this.extractWindowTitle(args),
                        isActive: false
                    });
                }
            }
        }

        return processes;
    }

    /**
     * Parse generic process output (fallback)
     */
    private parseGenericProcess(output: string): ProcessInfo[] {
        return this.parseLinuxProcess(output); // Use Linux parser as fallback
    }

    /**
     * Extract window title from command line arguments
     * @param args Command line arguments
     * @returns string | undefined Window title if found
     */
    private extractWindowTitle(args: string): string | undefined {
        // Look for common patterns that might indicate window titles
        const titlePatterns = [
            /--title[=\s]+"([^"]+)"/,
            /--name[=\s]+"([^"]+)"/,
            /-title\s+([^\s]+)/
        ];

        for (const pattern of titlePatterns) {
            const match = args.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return undefined;
    }

    /**
     * Get detection result for all browsers
     * @returns Promise<BrowserDetectionResult[]> Array of detection results
     */
    public async getAllBrowsersDetectionResult(): Promise<BrowserDetectionResult[]> {
        const results: BrowserDetectionResult[] = [];

        for (const [browserName] of this.supportedBrowsers) {
            try {
                const processInfo = await this.getBrowserProcessInfo(browserName);
                results.push({
                    browser: browserName,
                    processes: processInfo ? [processInfo] : [],
                    isRunning: processInfo !== null
                });
            } catch (error) {
                logger.error(`Error detecting ${browserName}:`, error);
                results.push({
                    browser: browserName,
                    processes: [],
                    isRunning: false
                });
            }
        }

        return results;
    }

    /**
     * Get the current platform
     * @returns NodeJS.Platform Current platform
     */
    public getPlatform(): NodeJS.Platform {
        return this.platform;
    }

    /**
     * Get supported browsers for current platform
     * @returns string[] Array of supported browser names
     */
    public getSupportedBrowsers(): string[] {
        return Array.from(this.supportedBrowsers.keys());
    }

    /**
     * Check if a URL is open in a specific browser
     * @param url URL to check for
     * @param browserName Name of the browser to check
     * @returns Promise<boolean> True if URL is found in browser
     */
    public async isUrlOpenInBrowser(url: string, browserName: string): Promise<boolean> {
        try {
            const tabResult = await this.getBrowserTabs(browserName, url);
            return tabResult.hasMatchingTab;
        } catch (error) {
            logger.error(`Error checking URL in ${browserName}:`, error);
            return false;
        }
    }

    /**
     * Get tabs from a specific browser
     * @param browserName Name of the browser
     * @param targetUrl Optional URL to filter tabs
     * @returns Promise<BrowserTabResult> Tab information
     */
    public async getBrowserTabs(browserName: string, targetUrl?: string): Promise<BrowserTabResult> {
        const result: BrowserTabResult = {
            browser: browserName,
            tabs: [],
            hasMatchingTab: false
        };

        try {
            switch (this.platform) {
                case 'darwin':
                    return await this.getMacOSBrowserTabs(browserName, targetUrl);
                case 'win32':
                    return await this.getWindowsBrowserTabs(browserName, targetUrl);
                case 'linux':
                    return await this.getLinuxBrowserTabs(browserName, targetUrl);
                default:
                    logger.warn(`Tab detection not supported on platform: ${this.platform}`);
                    return result;
            }
        } catch (error) {
            logger.error(`Error getting tabs for ${browserName}:`, error);
            return result;
        }
    }

    /**
     * Get browser tabs on macOS using AppleScript
     * @param browserName Name of the browser
     * @param targetUrl Optional URL to filter tabs
     * @returns Promise<BrowserTabResult> Tab information
     */
    private async getMacOSBrowserTabs(browserName: string, targetUrl?: string): Promise<BrowserTabResult> {
        const result: BrowserTabResult = {
            browser: browserName,
            tabs: [],
            hasMatchingTab: false
        };

        try {
            let command = '';

            switch (browserName.toLowerCase()) {
                case 'chrome':
                    command = `osascript -e '
                        tell application "Google Chrome"
                            set tabList to {}
                            repeat with w from 1 to count of windows
                                repeat with t from 1 to count of tabs of window w
                                    set tabURL to URL of tab t of window w
                                    set tabTitle to title of tab t of window w
                                    set isActive to (active tab index of window w = t and index of window w = 1)
                                    set end of tabList to tabURL & "|" & tabTitle & "|" & isActive
                                end repeat
                            end repeat
                            return tabList as string
                        end tell'`;
                    break;

                case 'safari':
                    command = `osascript -e '
                        tell application "Safari"
                            set tabList to {}
                            repeat with w from 1 to count of windows
                                repeat with t from 1 to count of tabs of window w
                                    set tabURL to URL of tab t of window w
                                    set tabTitle to name of tab t of window w
                                    set isActive to (current tab of window w = tab t of window w and index of window w = 1)
                                    set end of tabList to tabURL & "|" & tabTitle & "|" & isActive
                                end repeat
                            end repeat
                            return tabList as string
                        end tell'`;
                    break;

                case 'firefox':
                    // Firefox has limited AppleScript support, fallback to process-based detection
                    logger.debug('Firefox tab detection limited on macOS, using fallback');
                    return this.getFallbackTabDetection(browserName, targetUrl);

                case 'edge':
                    command = `osascript -e '
                        tell application "Microsoft Edge"
                            set tabList to {}
                            repeat with w from 1 to count of windows
                                repeat with t from 1 to count of tabs of window w
                                    set tabURL to URL of tab t of window w
                                    set tabTitle to title of tab t of window w
                                    set isActive to (active tab index of window w = t and index of window w = 1)
                                    set end of tabList to tabURL & "|" & tabTitle & "|" & isActive
                                end repeat
                            end repeat
                            return tabList as string
                        end tell'`;
                    break;

                default:
                    return this.getFallbackTabDetection(browserName, targetUrl);
            }

            if (command) {
                const { stdout } = await execAsync(command);
                result.tabs = this.parseMacOSTabOutput(stdout);

                if (targetUrl) {
                    const matchingTab = result.tabs.find(tab =>
                        tab.url.includes(targetUrl) || targetUrl.includes(tab.url)
                    );
                    result.hasMatchingTab = !!matchingTab;
                    if (matchingTab) {
                        result.activeTab = matchingTab;
                    }
                } else {
                    result.hasMatchingTab = result.tabs.length > 0;
                    result.activeTab = result.tabs.find(tab => tab.isActive);
                }
            }

        } catch (error) {
            logger.error(`Error getting macOS tabs for ${browserName}:`, error);
        }

        return result;
    }

    /**
     * Parse macOS AppleScript tab output
     * @param output Raw AppleScript output
     * @returns TabInfo[] Array of tab information
     */
    private parseMacOSTabOutput(output: string): TabInfo[] {
        const tabs: TabInfo[] = [];

        try {
            // AppleScript returns comma-separated list of "URL|Title|isActive" strings
            const tabStrings = output.trim().split(',');

            for (const tabString of tabStrings) {
                const parts = tabString.trim().split('|');
                if (parts.length >= 3) {
                    tabs.push({
                        url: parts[0].trim(),
                        title: parts[1].trim(),
                        isActive: parts[2].trim().toLowerCase() === 'true'
                    });
                }
            }
        } catch (error) {
            logger.error('Error parsing macOS tab output:', error);
        }

        return tabs;
    }

    /**
     * Get browser tabs on Windows using PowerShell and browser APIs
     * @param browserName Name of the browser
     * @param targetUrl Optional URL to filter tabs
     * @returns Promise<BrowserTabResult> Tab information
     */
    private async getWindowsBrowserTabs(browserName: string, targetUrl?: string): Promise<BrowserTabResult> {
        const result: BrowserTabResult = {
            browser: browserName,
            tabs: [],
            hasMatchingTab: false
        };

        try {
            // Windows tab detection is complex and browser-specific
            // For now, use window title-based detection as a fallback
            logger.debug(`Windows tab detection for ${browserName} using window title fallback`);
            return this.getFallbackTabDetection(browserName, targetUrl);

        } catch (error) {
            logger.error(`Error getting Windows tabs for ${browserName}:`, error);
        }

        return result;
    }

    /**
     * Get browser tabs on Linux using window management tools
     * @param browserName Name of the browser
     * @param targetUrl Optional URL to filter tabs
     * @returns Promise<BrowserTabResult> Tab information
     */
    private async getLinuxBrowserTabs(browserName: string, targetUrl?: string): Promise<BrowserTabResult> {
        const result: BrowserTabResult = {
            browser: browserName,
            tabs: [],
            hasMatchingTab: false
        };

        try {
            // Linux tab detection using window titles and wmctrl/xdotool
            const windowCommand = 'wmctrl -l -x 2>/dev/null || xdotool search --onlyvisible --class . getwindowname %@ 2>/dev/null';

            const { stdout } = await execAsync(windowCommand);
            const windows = this.parseLinuxWindowOutput(stdout, browserName);

            result.tabs = windows.map(window => ({
                url: this.extractUrlFromWindowTitle(window.title) || '',
                title: window.title,
                windowId: window.windowId,
                isActive: false // Would need additional detection for active state
            }));

            if (targetUrl) {
                const matchingTab = result.tabs.find(tab =>
                    tab.url.includes(targetUrl) ||
                    tab.title.toLowerCase().includes(targetUrl.toLowerCase()) ||
                    targetUrl.includes(tab.url)
                );
                result.hasMatchingTab = !!matchingTab;
                if (matchingTab) {
                    result.activeTab = matchingTab;
                }
            } else {
                result.hasMatchingTab = result.tabs.length > 0;
            }

        } catch (error) {
            logger.error(`Error getting Linux tabs for ${browserName}:`, error);
        }

        return result;
    }

    /**
     * Parse Linux window output for browser windows
     * @param output Raw window list output
     * @param browserName Browser name to filter for
     * @returns Array of window information
     */
    private parseLinuxWindowOutput(output: string, browserName: string): Array<{ windowId: string, title: string }> {
        const windows: Array<{ windowId: string, title: string }> = [];
        const lines = output.split('\n');

        const browserProcessNames = this.supportedBrowsers.get(browserName.toLowerCase()) || [];

        for (const line of lines) {
            if (!line.trim()) continue;

            // Parse wmctrl output format: "windowId desktop class hostname title"
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const windowId = parts[0];
                const windowClass = parts[2].toLowerCase();
                const title = parts.slice(4).join(' ');

                // Check if this window belongs to the target browser
                const isBrowserWindow = browserProcessNames.some(processName =>
                    windowClass.includes(processName.toLowerCase()) ||
                    title.toLowerCase().includes(processName.toLowerCase())
                );

                if (isBrowserWindow) {
                    windows.push({ windowId, title });
                }
            }
        }

        return windows;
    }

    /**
     * Extract URL from window title (best effort)
     * @param title Window title
     * @returns string | null Extracted URL or null
     */
    private extractUrlFromWindowTitle(title: string): string | null {
        // Common patterns for URLs in browser window titles
        const urlPatterns = [
            /https?:\/\/[^\s]+/,
            /www\.[^\s]+/,
            /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/
        ];

        for (const pattern of urlPatterns) {
            const match = title.match(pattern);
            if (match) {
                let url = match[0];
                // Ensure URL has protocol
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                return url;
            }
        }

        return null;
    }

    /**
     * Fallback tab detection using process and window information
     * @param browserName Name of the browser
     * @param targetUrl Optional URL to filter tabs
     * @returns Promise<BrowserTabResult> Tab information
     */
    private async getFallbackTabDetection(browserName: string, targetUrl?: string): Promise<BrowserTabResult> {
        const result: BrowserTabResult = {
            browser: browserName,
            tabs: [],
            hasMatchingTab: false
        };

        try {
            // Use process information and window titles as fallback
            const processInfo = await this.getBrowserProcessInfo(browserName);

            if (processInfo && processInfo.windowTitle) {
                const tab: TabInfo = {
                    url: this.extractUrlFromWindowTitle(processInfo.windowTitle) || '',
                    title: processInfo.windowTitle,
                    isActive: processInfo.isActive
                };

                result.tabs = [tab];

                if (targetUrl) {
                    const matchesUrl = tab.url.includes(targetUrl) ||
                        tab.title.toLowerCase().includes(targetUrl.toLowerCase()) ||
                        targetUrl.includes(tab.url);
                    result.hasMatchingTab = matchesUrl;
                    if (matchesUrl) {
                        result.activeTab = tab;
                    }
                } else {
                    result.hasMatchingTab = true;
                    result.activeTab = tab;
                }
            }

        } catch (error) {
            logger.error(`Error in fallback tab detection for ${browserName}:`, error);
        }

        return result;
    }
}

// Export singleton instance
export const browserDetector = BrowserDetector.getInstance();