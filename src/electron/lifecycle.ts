/**
 * Electron 应用程序生命周期管理器
 * 负责处理应用启动、关闭和窗口生命周期事件
 */
import { app, BrowserWindow } from 'electron';
import { WindowManager } from './window-manager.js';
import { logger } from '../logger.js';

export class LifecycleManager {
    private windowManager: WindowManager;
    private isInitialized = false;
    private isShuttingDown = false;
    private activeSessions = new Set<string>();

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    /**
     * 初始化生命周期管理器
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('LifecycleManager already initialized');
            return;
        }

        logger.info('Initializing Electron lifecycle manager');

        // 设置应用程序事件处理器
        this.setupAppEvents();

        // 等待 Electron 应用准备就绪
        if (!app.isReady()) {
            await app.whenReady();
        }

        this.isInitialized = true;
        logger.info('Electron lifecycle manager initialized');
    }

    /**
     * 关闭应用程序
     */
    async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress');
            return;
        }

        logger.info('Starting Electron application shutdown');
        this.isShuttingDown = true;

        try {
            // 关闭所有窗口
            await this.closeAllWindows();

            // 清理活跃会话
            this.activeSessions.clear();

            // 退出应用程序
            app.quit();

            logger.info('Electron application shutdown completed');
        } catch (error: unknown) {
            logger.error('Error during shutdown:', error);
            // 强制退出
            app.exit(1);
        }
    }

    /**
     * 处理应用程序准备就绪事件
     */
    handleAppReady(): void {
        logger.info('Electron app is ready');

        // 在 macOS 上，当应用程序被激活且没有窗口时，创建新窗口
        if (process.platform === 'darwin') {
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    logger.info('Creating window on macOS activate');
                    this.windowManager.createWindow();
                }
            });
        }

        // 创建初始窗口
        this.windowManager.createWindow();
    }

    /**
     * 处理窗口关闭事件
     */
    handleWindowClosed(): void {
        logger.info('Window closed event handled');

        // 在非 macOS 平台上，当所有窗口关闭时退出应用程序
        if (process.platform !== 'darwin') {
            const allWindows = BrowserWindow.getAllWindows();
            if (allWindows.length === 0) {
                logger.info('All windows closed, quitting application');
                this.shutdown();
            }
        }
    }

    /**
     * 添加活跃会话
     * @param sessionId 会话ID
     */
    addActiveSession(sessionId: string): void {
        this.activeSessions.add(sessionId);
        logger.debug(`Added active session: ${sessionId}, total: ${this.activeSessions.size}`);
    }

    /**
     * 移除活跃会话
     * @param sessionId 会话ID
     */
    removeActiveSession(sessionId: string): void {
        this.activeSessions.delete(sessionId);
        logger.debug(`Removed active session: ${sessionId}, total: ${this.activeSessions.size}`);

        // 如果没有活跃会话，可以考虑关闭窗口（可选）
        if (this.activeSessions.size === 0) {
            logger.debug('No active sessions remaining');
            // 这里可以添加自动关闭窗口的逻辑，但通常保持窗口打开更好
        }
    }

    /**
     * 获取活跃会话数量
     * @returns 活跃会话数量
     */
    getActiveSessionCount(): number {
        return this.activeSessions.size;
    }

    /**
     * 检查是否有活跃会话
     * @returns 是否有活跃会话
     */
    hasActiveSessions(): boolean {
        return this.activeSessions.size > 0;
    }

    /**
     * 检查是否已初始化
     * @returns 是否已初始化
     */
    isReady(): boolean {
        return this.isInitialized && app.isReady();
    }

    /**
     * 检查是否正在关闭
     * @returns 是否正在关闭
     */
    isShutdownInProgress(): boolean {
        return this.isShuttingDown;
    }

    /**
     * 设置应用程序事件处理器
     */
    private setupAppEvents(): void {
        // 应用程序准备就绪事件
        app.on('ready', () => {
            this.handleAppReady();
        });

        // 所有窗口关闭事件
        app.on('window-all-closed', () => {
            logger.info('All windows closed');
            this.handleWindowClosed();
        });

        // 应用程序激活事件（macOS）
        app.on('activate', () => {
            logger.info('Application activated');
            if (BrowserWindow.getAllWindows().length === 0) {
                this.windowManager.createWindow();
            }
        });

        // 应用程序即将退出事件
        app.on('before-quit', (event: Electron.Event) => {
            logger.info('Application before quit');

            if (!this.isShuttingDown) {
                // 如果有活跃会话，询问用户是否确认退出
                if (this.hasActiveSessions()) {
                    logger.warn(`Attempting to quit with ${this.activeSessions.size} active sessions`);
                    // 这里可以添加用户确认逻辑
                    // 暂时允许退出，但记录警告
                }

                // 开始优雅关闭流程
                event.preventDefault();
                this.shutdown();
            }
        });

        // 应用程序即将退出事件（第二次确认）
        app.on('will-quit', (event: Electron.Event) => {
            logger.info('Application will quit');

            if (!this.isShuttingDown) {
                event.preventDefault();
                this.shutdown();
            }
        });

        // 应用程序退出事件
        app.on('quit', () => {
            logger.info('Application quit');
        });

        // 证书错误处理（开发环境）
        app.on('certificate-error', (event: Electron.Event, _webContents: Electron.WebContents, _url: string, _error: string, _certificate: Electron.Certificate, callback: (isTrusted: boolean) => void) => {
            if (process.env.NODE_ENV === 'development') {
                // 开发环境下忽略证书错误
                event.preventDefault();
                callback(true);
            } else {
                // 生产环境下严格验证证书
                callback(false);
            }
        });

        // 处理第二个实例启动（单例模式）
        app.on('second-instance', (_event: Electron.Event, _commandLine: string[], _workingDirectory: string) => {
            logger.info('Second instance detected, focusing existing window');

            // 如果已有窗口，将其带到前台
            const window = this.windowManager.getWindow();
            if (window) {
                this.windowManager.focusWindow();
            } else {
                // 如果没有窗口，创建新窗口
                this.windowManager.createWindow();
            }
        });

        // GPU 进程崩溃处理 (removed - not available in current Electron version)

        // 渲染进程崩溃处理
        app.on('render-process-gone', (_event: Electron.Event, webContents: Electron.WebContents, details: any) => {
            logger.error('Render process gone:', details);

            // 尝试重新加载页面
            if (!webContents.isDestroyed()) {
                webContents.reload();
            }
        });

        // 子进程崩溃处理
        app.on('child-process-gone', (_event: Electron.Event, details: any) => {
            logger.error('Child process gone:', details);
        });
    }

    /**
     * 关闭所有窗口
     */
    private async closeAllWindows(): Promise<void> {
        logger.info('Closing all windows');

        const windows = BrowserWindow.getAllWindows();
        const closePromises = windows.map((window: BrowserWindow) => {
            return new Promise<void>((resolve) => {
                if (window.isDestroyed()) {
                    resolve();
                    return;
                }

                window.once('closed', () => resolve());
                window.close();

                // 设置超时，防止窗口无法正常关闭
                setTimeout(() => {
                    if (!window.isDestroyed()) {
                        logger.warn('Force destroying window due to timeout');
                        window.destroy();
                    }
                    resolve();
                }, 3000);
            });
        });

        // 同时关闭窗口管理器中的窗口
        await this.windowManager.closeWindow();

        // 等待所有窗口关闭
        await Promise.all(closePromises);
        logger.info('All windows closed');
    }
}