/**
 * Window Focus Manager
 * Manages browser window focusing across different platforms
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { WINDOW_FOCUS_CONFIG, WindowFocusConfig, WindowFocusStrategy } from '../config';
import { logger } from '../logger';
import { TabInfo } from './browserDetector';

const execAsync = promisify(exec);

// Platform types
export type Platform = 'darwin' | 'win32' | 'linux';

// Window state enumeration
export enum WindowState {
    ACTIVE = 'active',
    MINIMIZED = 'minimized',
    HIDDEN = 'hidden',
    NOT_FOUND = 'not_found'
}

// Window state detection result
export interface WindowStateResult {
    state: WindowState;
    windowId?: string;
    processId?: number;
    windowTitle?: string;
    error?: string;
}

// Window focus result interface
export interface WindowFocusResult {
    success: boolean;
    method: 'applescript' | 'powershell' | 'wmctrl' | 'xdotool' | 'fallback';
    browser: string;
    error?: string;
    timestamp: number;
    restored?: boolean; // Whether window was restored from minimized state
}

// Focus strategy interface
export interface FocusStrategy {
    name: string;
    platform: Platform;
    command: (browser: string, url?: string) => string;
    validate: () => Promise<boolean>;
}

/**
 * WindowFocusManager class
 * Handles browser window focusing operations across different platforms
 */
export class WindowFocusManager {
    private config: WindowFocusConfig;
    private platform: Platform;

    constructor(config?: WindowFocusConfig) {
        this.config = config || {
            enabled: WINDOW_FOCUS_CONFIG.enabled,
            strategy: WINDOW_FOCUS_CONFIG.strategy as WindowFocusStrategy,
            browsers: WINDOW_FOCUS_CONFIG.browsers,
            fallbackNotification: WINDOW_FOCUS_CONFIG.fallbackNotification,
            retryAttempts: WINDOW_FOCUS_CONFIG.retryAttempts,
            retryDelay: WINDOW_FOCUS_CONFIG.retryDelay
        };
        this.platform = this.detectPlatform();

        logger.debug('WindowFocusManager initialized', {
            platform: this.platform,
            enabled: this.config.enabled,
            strategy: this.config.strategy
        });
    }

    /**
     * Detect the current platform
     * @returns Platform identifier
     */
    public detectPlatform(): Platform {
        const platform = process.platform;

        switch (platform) {
            case 'darwin':
                return 'darwin';
            case 'win32':
                return 'win32';
            case 'linux':
                return 'linux';
            default:
                logger.warn(`Unsupported platform: ${platform}, defaulting to linux`);
                return 'linux';
        }
    }

    /**
     * Check if window focus is enabled in configuration
     * @returns True if window focus is enabled
     */
    public isWindowFocusEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Get the current configuration
     * @returns Current window focus configuration
     */
    public getConfig(): WindowFocusConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param newConfig New configuration to merge
     */
    public updateConfig(newConfig: Partial<WindowFocusConfig>): void {
        this.config = { ...this.config, ...newConfig };
        logger.info('WindowFocusManager configuration updated', newConfig);
    }

    /**
     * Execute a system command with error handling
     * @param command Command to execute
     * @param timeout Timeout in milliseconds (default: 5000)
     * @returns Promise resolving to execution success
     */
    public async executeSystemCommand(command: string, timeout: number = 5000): Promise<boolean> {
        try {
            logger.debug('Executing system command', { command, timeout });

            const { stdout, stderr } = await execAsync(command, {
                timeout,
                encoding: 'utf8'
            });

            if (stderr && stderr.trim()) {
                logger.warn('Command executed with warnings', { command, stderr });
            }

            logger.debug('Command executed successfully', { command, stdout: stdout?.trim() });
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to execute system command', {
                command,
                error: errorMessage,
                timeout
            });
            return false;
        }
    }

    /**
     * Validate if the current platform supports window focusing
     * @returns Promise resolving to validation result
     */
    public async validatePlatformSupport(): Promise<boolean> {
        try {
            switch (this.platform) {
                case 'darwin':
                    // Check if osascript is available
                    return await this.executeSystemCommand('which osascript');

                case 'win32':
                    // Check if PowerShell is available
                    return await this.executeSystemCommand('powershell -Command "Get-Host"');

                case 'linux':
                    // Check if wmctrl or xdotool is available
                    const wmctrlAvailable = await this.executeSystemCommand('which wmctrl');
                    const xdotoolAvailable = await this.executeSystemCommand('which xdotool');
                    return wmctrlAvailable || xdotoolAvailable;

                default:
                    return false;
            }
        } catch (error) {
            logger.error('Platform validation failed', {
                platform: this.platform,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Get the appropriate focus strategy for the current platform
     * @returns Focus strategy name
     */
    public getFocusStrategy(): string {
        if (this.config.strategy !== 'auto') {
            return this.config.strategy;
        }

        // Auto-detect strategy based on platform
        switch (this.platform) {
            case 'darwin':
                return 'applescript';
            case 'win32':
                return 'powershell';
            case 'linux':
                return 'wmctrl';
            default:
                return 'wmctrl';
        }
    }

    /**
     * Sanitize browser name to prevent command injection
     * @param browserName Browser name to sanitize
     * @returns Sanitized browser name
     */
    private sanitizeBrowserName(browserName: string): string {
        // Remove any potentially dangerous characters, keep only alphanumeric, hyphens, underscores
        return browserName.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
    }

    /**
     * Sanitize URL to prevent command injection
     * @param url URL to sanitize
     * @returns Sanitized URL
     */
    private sanitizeUrl(url?: string): string | undefined {
        if (!url) return undefined;

        // Basic URL validation and sanitization
        try {
            const urlObj = new URL(url);
            return urlObj.toString();
        } catch (error) {
            logger.warn('Invalid URL provided, ignoring', { url });
            return undefined;
        }
    }

    /**
     * Log focus attempt result
     * @param result Window focus result
     */
    private logFocusResult(result: WindowFocusResult): void {
        if (result.success) {
            logger.info('Browser window focus successful', {
                browser: result.browser,
                method: result.method,
                timestamp: result.timestamp
            });
        } else {
            logger.warn('Browser window focus failed', {
                browser: result.browser,
                method: result.method,
                error: result.error,
                timestamp: result.timestamp
            });
        }
    }

    /**
     * Create a focus result object
     * @param success Whether the focus operation succeeded
     * @param method Method used for focusing
     * @param browser Browser name
     * @param error Error message if failed
     * @returns WindowFocusResult object
     */
    private createFocusResult(
        success: boolean,
        method: WindowFocusResult['method'],
        browser: string,
        error?: string
    ): WindowFocusResult {
        return {
            success,
            method,
            browser,
            error,
            timestamp: Date.now()
        };
    }

    /**
     * Generate AppleScript command for macOS browser focusing
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns AppleScript command string
     */
    private generateMacOSAppleScript(browser: string, url?: string): string {
        const sanitizedBrowser = this.sanitizeBrowserName(browser);
        const sanitizedUrl = this.sanitizeUrl(url);

        // Map common browser names to their actual application names
        const browserAppNames: Record<string, string> = {
            'chrome': 'Google Chrome',
            'safari': 'Safari',
            'firefox': 'Firefox',
            'edge': 'Microsoft Edge'
        };

        const appName = browserAppNames[sanitizedBrowser.toLowerCase()] || sanitizedBrowser;

        if (sanitizedUrl) {
            // Try to focus specific tab with URL
            switch (sanitizedBrowser.toLowerCase()) {
                case 'chrome':
                    return `osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "Google Chrome" to set index of window (first window whose tabs contain tab whose URL contains "${sanitizedUrl}") to 1'`;

                case 'safari':
                    return `osascript -e 'tell application "Safari" to activate' -e 'tell application "Safari" to set current tab of window 1 to (first tab of window 1 whose URL contains "${sanitizedUrl}")'`;

                case 'firefox':
                    // Firefox AppleScript support is limited, fall back to general activation
                    return `osascript -e 'tell application "Firefox" to activate'`;

                case 'edge':
                    return `osascript -e 'tell application "Microsoft Edge" to activate' -e 'tell application "Microsoft Edge" to set index of window (first window whose tabs contain tab whose URL contains "${sanitizedUrl}") to 1'`;

                default:
                    return `osascript -e 'tell application "${appName}" to activate'`;
            }
        } else {
            // General browser activation
            return `osascript -e 'tell application "${appName}" to activate'`;
        }
    }

    /**
     * Focus browser window on macOS using AppleScript
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async focusMacOSBrowser(browser: string, url?: string): Promise<WindowFocusResult> {
        try {
            const command = this.generateMacOSAppleScript(browser, url);
            logger.debug('Executing macOS AppleScript command', { browser, command });

            const success = await this.executeSystemCommand(command, 10000); // 10 second timeout for AppleScript

            const result = this.createFocusResult(
                success,
                'applescript',
                browser,
                success ? undefined : 'AppleScript execution failed'
            );

            this.logFocusResult(result);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('macOS browser focus failed', {
                browser,
                url,
                error: errorMessage
            });

            const result = this.createFocusResult(
                false,
                'applescript',
                browser,
                errorMessage
            );

            this.logFocusResult(result);
            return result;
        }
    }

    /**
     * Generate PowerShell command for Windows browser focusing
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns PowerShell command string
     */
    private generateWindowsPowerShell(browser: string, url?: string): string {
        const sanitizedBrowser = this.sanitizeBrowserName(browser);
        const sanitizedUrl = this.sanitizeUrl(url);

        // Map common browser names to their process names and window titles
        const browserProcessNames: Record<string, { process: string; windowTitle: string }> = {
            'chrome': { process: 'chrome', windowTitle: 'Google Chrome' },
            'edge': { process: 'msedge', windowTitle: 'Microsoft Edge' },
            'firefox': { process: 'firefox', windowTitle: 'Mozilla Firefox' }
        };

        const browserInfo = browserProcessNames[sanitizedBrowser.toLowerCase()];

        if (!browserInfo) {
            // Fallback for unknown browsers
            return `powershell -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('${sanitizedBrowser}')"`;
        }

        const { process: processName, windowTitle } = browserInfo;

        if (sanitizedUrl) {
            // Try to focus specific window with URL-based title matching
            // This is a best-effort approach since exact tab focusing is complex on Windows
            return `powershell -Command "
                Add-Type -AssemblyName Microsoft.VisualBasic;
                Add-Type -AssemblyName System.Windows.Forms;
                $processes = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue;
                if ($processes) {
                    foreach ($proc in $processes) {
                        if ($proc.MainWindowTitle -and $proc.MainWindowTitle -ne '') {
                            try {
                                [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id);
                                [System.Windows.Forms.SendKeys]::SendWait('^l');
                                Start-Sleep -Milliseconds 100;
                                [System.Windows.Forms.SendKeys]::SendWait('${sanitizedUrl}');
                                [System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
                                exit 0;
                            } catch {
                                continue;
                            }
                        }
                    }
                    # Fallback to activating first browser window
                    [Microsoft.VisualBasic.Interaction]::AppActivate($processes[0].Id);
                } else {
                    # Try by window title if process not found
                    [Microsoft.VisualBasic.Interaction]::AppActivate('${windowTitle}');
                }"`.replace(/\s+/g, ' ').trim();
        } else {
            // General browser activation by process or window title
            return `powershell -Command "
                Add-Type -AssemblyName Microsoft.VisualBasic;
                $processes = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue;
                if ($processes) {
                    [Microsoft.VisualBasic.Interaction]::AppActivate($processes[0].Id);
                } else {
                    [Microsoft.VisualBasic.Interaction]::AppActivate('${windowTitle}');
                }"`.replace(/\s+/g, ' ').trim();
        }
    }

    /**
     * Focus browser window on Windows using PowerShell
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async focusWindowsBrowser(browser: string, url?: string): Promise<WindowFocusResult> {
        try {
            const command = this.generateWindowsPowerShell(browser, url);
            logger.debug('Executing Windows PowerShell command', { browser, command });

            const success = await this.executeSystemCommand(command, 15000); // 15 second timeout for PowerShell

            const result = this.createFocusResult(
                success,
                'powershell',
                browser,
                success ? undefined : 'PowerShell execution failed'
            );

            this.logFocusResult(result);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Windows browser focus failed', {
                browser,
                url,
                error: errorMessage
            });

            const result = this.createFocusResult(
                false,
                'powershell',
                browser,
                errorMessage
            );

            this.logFocusResult(result);
            return result;
        }
    }

    /**
     * Generate wmctrl command for Linux browser focusing
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns wmctrl command string
     */
    private generateLinuxWmctrl(browser: string, url?: string): string {
        const sanitizedBrowser = this.sanitizeBrowserName(browser);
        const sanitizedUrl = this.sanitizeUrl(url);

        // Map common browser names to their window titles
        const browserWindowTitles: Record<string, string[]> = {
            'chrome': ['Google Chrome', 'Chrome'],
            'firefox': ['Mozilla Firefox', 'Firefox'],
            'edge': ['Microsoft Edge', 'Edge'],
            'safari': ['Safari'] // Less common on Linux but possible
        };

        const windowTitles = browserWindowTitles[sanitizedBrowser.toLowerCase()] || [sanitizedBrowser];

        if (sanitizedUrl) {
            // Try to focus window containing the URL in title
            // Many browsers show part of the URL or page title in window title
            const urlDomain = sanitizedUrl.replace(/^https?:\/\//, '').split('/')[0];
            return `wmctrl -a "${urlDomain}" || wmctrl -a "${windowTitles[0]}"`;
        } else {
            // Try each possible window title
            const commands = windowTitles.map(title => `wmctrl -a "${title}"`);
            return commands.join(' || ');
        }
    }

    /**
     * Generate xdotool command for Linux browser focusing
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns xdotool command string
     */
    private generateLinuxXdotool(browser: string, url?: string): string {
        const sanitizedBrowser = this.sanitizeBrowserName(browser);
        const sanitizedUrl = this.sanitizeUrl(url);

        // Map common browser names to their process names and window classes
        const browserProcessInfo: Record<string, { process: string; windowClass: string }> = {
            'chrome': { process: 'chrome', windowClass: 'Google-chrome' },
            'firefox': { process: 'firefox', windowClass: 'Firefox' },
            'edge': { process: 'msedge', windowClass: 'Microsoft-edge' },
            'safari': { process: 'safari', windowClass: 'Safari' }
        };

        const processInfo = browserProcessInfo[sanitizedBrowser.toLowerCase()];

        if (!processInfo) {
            // Fallback for unknown browsers
            return `xdotool search --name "${sanitizedBrowser}" windowactivate || xdotool search --class "${sanitizedBrowser}" windowactivate`;
        }

        const { process: processName, windowClass } = processInfo;

        if (sanitizedUrl) {
            // Try to focus window containing URL in title, then fallback to general browser focus
            const urlDomain = sanitizedUrl.replace(/^https?:\/\//, '').split('/')[0];
            return `xdotool search --name "${urlDomain}" windowactivate || xdotool search --class "${windowClass}" windowactivate || xdotool search --name "${processName}" windowactivate`;
        } else {
            // General browser activation by window class or name
            return `xdotool search --class "${windowClass}" windowactivate || xdotool search --name "${processName}" windowactivate`;
        }
    }

    /**
     * Focus browser window on Linux using wmctrl
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async focusLinuxBrowserWmctrl(browser: string, url?: string): Promise<WindowFocusResult> {
        try {
            const command = this.generateLinuxWmctrl(browser, url);
            logger.debug('Executing Linux wmctrl command', { browser, command });

            const success = await this.executeSystemCommand(command, 10000); // 10 second timeout

            const result = this.createFocusResult(
                success,
                'wmctrl',
                browser,
                success ? undefined : 'wmctrl execution failed'
            );

            this.logFocusResult(result);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Linux wmctrl browser focus failed', {
                browser,
                url,
                error: errorMessage
            });

            const result = this.createFocusResult(
                false,
                'wmctrl',
                browser,
                errorMessage
            );

            this.logFocusResult(result);
            return result;
        }
    }

    /**
     * Focus browser window on Linux using xdotool
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async focusLinuxBrowserXdotool(browser: string, url?: string): Promise<WindowFocusResult> {
        try {
            const command = this.generateLinuxXdotool(browser, url);
            logger.debug('Executing Linux xdotool command', { browser, command });

            const success = await this.executeSystemCommand(command, 10000); // 10 second timeout

            const result = this.createFocusResult(
                success,
                'xdotool',
                browser,
                success ? undefined : 'xdotool execution failed'
            );

            this.logFocusResult(result);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Linux xdotool browser focus failed', {
                browser,
                url,
                error: errorMessage
            });

            const result = this.createFocusResult(
                false,
                'xdotool',
                browser,
                errorMessage
            );

            this.logFocusResult(result);
            return result;
        }
    }

    /**
     * Focus browser window on Linux with fallback between wmctrl and xdotool
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async focusLinuxBrowser(browser: string, url?: string): Promise<WindowFocusResult> {
        // Determine which tool to try first based on configuration
        const strategy = this.getFocusStrategy();

        if (strategy === 'xdotool') {
            // Try xdotool first, then wmctrl as fallback
            const xdotoolResult = await this.focusLinuxBrowserXdotool(browser, url);
            if (xdotoolResult.success) {
                return xdotoolResult;
            }

            logger.debug('xdotool failed, trying wmctrl fallback', { browser });
            const wmctrlResult = await this.focusLinuxBrowserWmctrl(browser, url);
            return wmctrlResult;
        } else {
            // Try wmctrl first (default), then xdotool as fallback
            const wmctrlResult = await this.focusLinuxBrowserWmctrl(browser, url);
            if (wmctrlResult.success) {
                return wmctrlResult;
            }

            logger.debug('wmctrl failed, trying xdotool fallback', { browser });
            const xdotoolResult = await this.focusLinuxBrowserXdotool(browser, url);
            return xdotoolResult;
        }
    }

    /**
     * Try to focus browser window with retry mechanism
     * @param browser Browser name
     * @param url Optional URL for tab-specific focusing
     * @returns Promise resolving to focus result
     */
    private async tryFocusBrowserWithRetry(browser: string, url?: string): Promise<WindowFocusResult> {
        let lastResult: WindowFocusResult | null = null;

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            logger.debug('Attempting browser focus', { browser, attempt, maxAttempts: this.config.retryAttempts });

            let result: WindowFocusResult;

            switch (this.platform) {
                case 'darwin':
                    result = await this.focusMacOSBrowser(browser, url);
                    break;

                case 'win32':
                    result = await this.focusWindowsBrowser(browser, url);
                    break;

                case 'linux':
                    result = await this.focusLinuxBrowser(browser, url);
                    break;

                default:
                    result = this.createFocusResult(
                        false,
                        'fallback',
                        browser,
                        `Platform ${this.platform} not supported`
                    );
                    break;
            }

            if (result.success) {
                logger.info('Browser focus successful', { browser, attempt });
                return result;
            }

            lastResult = result;

            // Wait before retry (except on last attempt)
            if (attempt < this.config.retryAttempts) {
                logger.debug('Browser focus failed, retrying', {
                    browser,
                    attempt,
                    retryDelay: this.config.retryDelay
                });
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            }
        }

        logger.warn('All browser focus attempts failed', {
            browser,
            attempts: this.config.retryAttempts
        });

        return lastResult || this.createFocusResult(
            false,
            'fallback',
            browser,
            'All retry attempts failed'
        );
    }

    /**
     * Focus browser window (main public method)
     * @param url URL that should be focused
     * @returns Promise resolving to focus success
     */
    public async focusBrowserWindow(url: string): Promise<boolean> {
        if (!this.isWindowFocusEnabled()) {
            logger.debug('Window focus is disabled, skipping');
            return false;
        }

        const sanitizedUrl = this.sanitizeUrl(url);
        if (!sanitizedUrl) {
            logger.warn('Invalid URL provided for window focus', { url });
            return false;
        }

        // Validate platform support
        const platformSupported = await this.validatePlatformSupport();
        if (!platformSupported) {
            logger.warn('Platform does not support window focusing', { platform: this.platform });
            return false;
        }

        // First try tab-specific focusing
        const tabFocusSuccess = await this.focusSpecificTab(sanitizedUrl);
        if (tabFocusSuccess) {
            logger.info('Successfully focused specific tab', { url: sanitizedUrl });
            return true;
        }

        logger.debug('Tab-specific focus failed, falling back to general browser focus');

        // Fallback to general browser focusing
        for (const browser of this.config.browsers) {
            logger.debug('Attempting to focus browser', { browser, url: sanitizedUrl });

            const result = await this.tryFocusBrowserWithRetry(browser, sanitizedUrl);

            if (result.success) {
                logger.info('Successfully focused browser window', {
                    browser,
                    method: result.method,
                    url: sanitizedUrl
                });
                return true;
            }

            logger.debug('Failed to focus browser, trying next', {
                browser,
                error: result.error
            });
        }

        logger.warn('Failed to focus any configured browser', {
            browsers: this.config.browsers,
            url: sanitizedUrl
        });

        return false;
    }

    /**
     * Focus a specific tab containing the target URL
     * @param url URL to focus
     * @returns Promise resolving to focus success
     */
    public async focusSpecificTab(url: string): Promise<boolean> {
        try {
            // Import browserDetector dynamically to avoid circular dependencies
            const { browserDetector } = await import('./browserDetector.js');

            // Check each configured browser for the target URL
            for (const browser of this.config.browsers) {
                logger.debug('Checking for tab in browser', { browser, url });

                const tabResult = await browserDetector.getBrowserTabs(browser, url);

                if (tabResult.hasMatchingTab && tabResult.activeTab) {
                    logger.debug('Found matching tab, attempting to focus', {
                        browser,
                        tab: tabResult.activeTab
                    });

                    const focusResult = await this.focusTabInBrowser(browser, tabResult.activeTab, url);

                    if (focusResult.success) {
                        logger.info('Successfully focused specific tab', {
                            browser,
                            tabTitle: tabResult.activeTab.title,
                            url
                        });
                        return true;
                    }
                }
            }

            logger.debug('No matching tabs found in any browser', { url });
            return false;

        } catch (error) {
            logger.error('Error during tab-specific focusing', {
                url,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Focus a specific tab within a browser
     * @param browser Browser name
     * @param tab Tab information
     * @param targetUrl Target URL for focusing
     * @returns Promise resolving to focus result
     */
    private async focusTabInBrowser(browser: string, tab: TabInfo, targetUrl: string): Promise<WindowFocusResult> {
        try {
            let command = '';
            let method: WindowFocusResult['method'] = 'fallback';

            switch (this.platform) {
                case 'darwin':
                    ({ command, method } = this.generateMacOSTabFocusCommand(browser, tab, targetUrl));
                    break;

                case 'win32':
                    ({ command, method } = this.generateWindowsTabFocusCommand(browser, tab, targetUrl));
                    break;

                case 'linux':
                    ({ command, method } = this.generateLinuxTabFocusCommand(browser, tab, targetUrl));
                    break;

                default:
                    return this.createFocusResult(
                        false,
                        'fallback',
                        browser,
                        `Platform ${this.platform} not supported for tab focusing`
                    );
            }

            if (command) {
                logger.debug('Executing tab focus command', { browser, command });
                const success = await this.executeSystemCommand(command, 15000);

                const result = this.createFocusResult(
                    success,
                    method,
                    browser,
                    success ? undefined : 'Tab focus command failed'
                );

                this.logFocusResult(result);
                return result;
            }

            return this.createFocusResult(
                false,
                'fallback',
                browser,
                'No tab focus command generated'
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Tab focus failed', {
                browser,
                tab: tab.title,
                error: errorMessage
            });

            const result = this.createFocusResult(
                false,
                'fallback',
                browser,
                errorMessage
            );

            this.logFocusResult(result);
            return result;
        }
    }

    /**
     * Generate macOS tab focus command
     * @param browser Browser name
     * @param tab Tab information
     * @param targetUrl Target URL
     * @returns Command and method
     */
    private generateMacOSTabFocusCommand(browser: string, tab: TabInfo, targetUrl: string): { command: string; method: WindowFocusResult['method'] } {
        const sanitizedUrl = this.sanitizeUrl(targetUrl);

        switch (browser.toLowerCase()) {
            case 'chrome':
                return {
                    command: `osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "Google Chrome" to repeat with w from 1 to count of windows repeat with t from 1 to count of tabs of window w if URL of tab t of window w contains "${sanitizedUrl}" then set active tab index of window w to t set index of window w to 1 return end if end repeat end repeat end tell'`,
                    method: 'applescript'
                };

            case 'safari':
                return {
                    command: `osascript -e 'tell application "Safari" to activate' -e 'tell application "Safari" to repeat with w from 1 to count of windows repeat with t from 1 to count of tabs of window w if URL of tab t of window w contains "${sanitizedUrl}" then set current tab of window w to tab t of window w set index of window w to 1 return end if end repeat end repeat end tell'`,
                    method: 'applescript'
                };

            case 'edge':
                return {
                    command: `osascript -e 'tell application "Microsoft Edge" to activate' -e 'tell application "Microsoft Edge" to repeat with w from 1 to count of windows repeat with t from 1 to count of tabs of window w if URL of tab t of window w contains "${sanitizedUrl}" then set active tab index of window w to t set index of window w to 1 return end if end repeat end repeat end tell'`,
                    method: 'applescript'
                };

            case 'firefox':
            default:
                // Firefox and other browsers: fallback to general activation
                return {
                    command: this.generateMacOSAppleScript(browser),
                    method: 'applescript'
                };
        }
    }

    /**
     * Generate Windows tab focus command
     * @param browser Browser name
     * @param tab Tab information
     * @param targetUrl Target URL
     * @returns Command and method
     */
    private generateWindowsTabFocusCommand(browser: string, tab: TabInfo, targetUrl: string): { command: string; method: WindowFocusResult['method'] } {
        // Windows tab focusing is complex, use window title matching and keyboard shortcuts
        const sanitizedUrl = this.sanitizeUrl(targetUrl);

        switch (browser.toLowerCase()) {
            case 'chrome':
            case 'edge':
                return {
                    command: `powershell -Command "
                        Add-Type -AssemblyName Microsoft.VisualBasic;
                        Add-Type -AssemblyName System.Windows.Forms;
                        $processes = Get-Process -Name '${browser === 'chrome' ? 'chrome' : 'msedge'}' -ErrorAction SilentlyContinue;
                        if ($processes) {
                            foreach ($proc in $processes) {
                                if ($proc.MainWindowTitle -and $proc.MainWindowTitle -match '${sanitizedUrl?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}') {
                                    [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id);
                                    Start-Sleep -Milliseconds 500;
                                    exit 0;
                                }
                            }
                            # Fallback: activate first browser window and use Ctrl+L to navigate
                            [Microsoft.VisualBasic.Interaction]::AppActivate($processes[0].Id);
                            Start-Sleep -Milliseconds 500;
                            [System.Windows.Forms.SendKeys]::SendWait('^l');
                            Start-Sleep -Milliseconds 200;
                            [System.Windows.Forms.SendKeys]::SendWait('${sanitizedUrl}');
                            [System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
                        }"`.replace(/\s+/g, ' ').trim(),
                    method: 'powershell'
                };

            case 'firefox':
            default:
                // Firefox and other browsers: fallback to general activation
                return {
                    command: this.generateWindowsPowerShell(browser),
                    method: 'powershell'
                };
        }
    }

    /**
     * Generate Linux tab focus command
     * @param browser Browser name
     * @param tab Tab information
     * @param targetUrl Target URL
     * @returns Command and method
     */
    private generateLinuxTabFocusCommand(browser: string, tab: TabInfo, targetUrl: string): { command: string; method: WindowFocusResult['method'] } {
        // Linux tab focusing using window management tools
        if (tab.windowId) {
            // Use specific window ID if available
            return {
                command: `wmctrl -i -a ${tab.windowId} || xdotool windowactivate ${tab.windowId}`,
                method: 'wmctrl'
            };
        }

        // Fallback to URL-based window matching
        const sanitizedUrl = this.sanitizeUrl(targetUrl);
        const urlDomain = sanitizedUrl?.replace(/^https?:\/\//, '').split('/')[0] || '';

        return {
            command: `wmctrl -a "${urlDomain}" || wmctrl -a "${tab.title}" || xdotool search --name "${urlDomain}" windowactivate || xdotool search --name "${tab.title}" windowactivate`,
            method: 'wmctrl'
        };
    }
}