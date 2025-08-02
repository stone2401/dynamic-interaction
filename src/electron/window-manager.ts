/**
 * Electron 窗口管理器
 * 负责创建、管理和控制 Electron 应用程序窗口
 */
import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { ELECTRON_CONFIG, PORT } from '../config.js';
import { logger } from '../logger.js';

export class WindowManager {
    private window: BrowserWindow | null = null;
    private isClosing = false;

    /**
     * 创建新的 Electron 窗口
     * @returns 创建的 BrowserWindow 实例
     */
    createWindow(): BrowserWindow {
        if (this.window && !this.window.isDestroyed()) {
            logger.info('Window already exists, focusing existing window');
            this.focusWindow();
            return this.window;
        }

        logger.info('Creating new Electron window');

        // 获取主显示器信息用于窗口居中
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

        // 计算窗口位置（居中）
        const x = Math.round((screenWidth - ELECTRON_CONFIG.windowWidth) / 2);
        const y = Math.round((screenHeight - ELECTRON_CONFIG.windowHeight) / 2);

        // 创建窗口
        this.window = new BrowserWindow({
            width: ELECTRON_CONFIG.windowWidth,
            height: ELECTRON_CONFIG.windowHeight,
            minWidth: ELECTRON_CONFIG.minWidth,
            minHeight: ELECTRON_CONFIG.minHeight,
            x: ELECTRON_CONFIG.center ? x : undefined,
            y: ELECTRON_CONFIG.center ? y : undefined,
            title: ELECTRON_CONFIG.windowTitle,
            resizable: ELECTRON_CONFIG.resizable,
            show: false, // 先不显示，等加载完成后再显示
            webPreferences: {
                // 安全配置：禁用 Node.js 集成
                nodeIntegration: false,
                // 启用上下文隔离
                contextIsolation: true,
                // 预加载脚本路径
                preload: path.join(__dirname, 'preload.js'),
                // 禁用网页安全（仅开发环境）
                webSecurity: process.env.NODE_ENV !== 'development',
                // 允许运行不安全内容（仅开发环境）
                allowRunningInsecureContent: process.env.NODE_ENV === 'development'
            },
            // 窗口图标（如果有的话）
            // icon: path.join(__dirname, '../public/assets/icon.png')
        });

        // 设置窗口事件处理
        this.setupWindowEvents();

        // 加载应用程序 URL
        const appUrl = `http://localhost:${PORT}`;
        this.window.loadURL(appUrl).catch((error: Error) => {
            logger.error('Failed to load application URL:', error);
        });

        // 窗口准备好后显示
        this.window.once('ready-to-show', () => {
            if (this.window && !this.window.isDestroyed()) {
                this.window.show();
                this.focusWindow();
                logger.info('Electron window is ready and visible');
            }
        });

        // 开发环境下打开开发者工具
        if (ELECTRON_CONFIG.devTools) {
            this.window.webContents.openDevTools();
        }

        logger.info(`Electron window created with size ${ELECTRON_CONFIG.windowWidth}x${ELECTRON_CONFIG.windowHeight}`);
        return this.window;
    }

    /**
     * 获取当前窗口实例
     * @returns 当前的 BrowserWindow 实例或 null
     */
    getWindow(): BrowserWindow | null {
        if (this.window && this.window.isDestroyed()) {
            this.window = null;
        }
        return this.window;
    }

    /**
     * 关闭窗口
     * @returns Promise，在窗口关闭后解析
     */
    async closeWindow(): Promise<void> {
        if (!this.window || this.window.isDestroyed() || this.isClosing) {
            return;
        }

        logger.info('Closing Electron window');
        this.isClosing = true;

        return new Promise<void>((resolve) => {
            if (!this.window || this.window.isDestroyed()) {
                this.isClosing = false;
                resolve();
                return;
            }

            // 监听窗口关闭事件
            this.window.once('closed', () => {
                this.window = null;
                this.isClosing = false;
                logger.info('Electron window closed');
                resolve();
            });

            // 强制关闭窗口
            this.window.close();

            // 设置超时，防止窗口无法正常关闭
            setTimeout(() => {
                if (this.window && !this.window.isDestroyed()) {
                    logger.warn('Force destroying window due to timeout');
                    this.window.destroy();
                    this.window = null;
                }
                this.isClosing = false;
                resolve();
            }, 5000); // 5秒超时
        });
    }

    /**
     * 将窗口带到前台并获得焦点
     */
    focusWindow(): void {
        if (!this.window || this.window.isDestroyed()) {
            return;
        }

        try {
            // 如果窗口最小化，先恢复
            if (this.window.isMinimized()) {
                this.window.restore();
            }

            // 将窗口带到前台
            this.window.show();
            this.window.focus();

            // 在 macOS 上，还需要将应用程序带到前台
            if (process.platform === 'darwin') {
                this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                this.window.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
            }

            logger.info('Window focused and brought to front');
        } catch (error: unknown) {
            logger.error('Failed to focus window:', error);
        }
    }

    /**
     * 检查窗口是否存在且可用
     * @returns 窗口是否可用
     */
    isWindowAvailable(): boolean {
        return this.window !== null && !this.window.isDestroyed();
    }

    /**
     * 设置窗口事件处理器
     */
    private setupWindowEvents(): void {
        if (!this.window) {
            return;
        }

        // 窗口关闭事件
        this.window.on('closed', () => {
            logger.info('Window closed event received');
            this.window = null;
            this.isClosing = false;
        });

        // 窗口最小化事件
        this.window.on('minimize', () => {
            logger.debug('Window minimized');
        });

        // 窗口恢复事件
        this.window.on('restore', () => {
            logger.debug('Window restored');
        });

        // 窗口获得焦点事件
        this.window.on('focus', () => {
            logger.debug('Window gained focus');
        });

        // 窗口失去焦点事件
        this.window.on('blur', () => {
            logger.debug('Window lost focus');
        });

        // 窗口调整大小事件
        this.window.on('resize', () => {
            const [width, height] = this.window!.getSize();
            logger.debug(`Window resized to ${width}x${height}`);
        });

        // 网页内容加载完成事件
        this.window.webContents.on('did-finish-load', () => {
            logger.info('Web content finished loading');
        });

        // 网页内容加载失败事件
        this.window.webContents.on('did-fail-load', (_event, errorCode: number, errorDescription: string, validatedURL: string) => {
            logger.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
        });

        // 处理窗口关闭前的确认
        this.window.on('close', (_event) => {
            if (!this.isClosing) {
                logger.info('Window close requested');
                // 这里可以添加关闭前的确认逻辑
                // 如果需要阻止关闭，可以调用 _event.preventDefault()
            }
        });

        // 处理网页导航事件（安全考虑）
        this.window.webContents.on('will-navigate', (event: Electron.Event, navigationUrl: string) => {
            const appUrl = `http://localhost:${PORT}`;
            if (!navigationUrl.startsWith(appUrl)) {
                logger.warn(`Blocked navigation to external URL: ${navigationUrl}`);
                event.preventDefault();
            }
        });

        // 处理新窗口打开请求（安全考虑）
        this.window.webContents.setWindowOpenHandler(({ url }) => {
            logger.warn(`Blocked attempt to open new window: ${url}`);
            return { action: 'deny' };
        });
    }
}