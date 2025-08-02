/**
 * Electron 主进程入口点
 * 集成 WindowManager 和 LifecycleManager，实现应用单例模式
 */
import { app } from 'electron';
import { WindowManager } from './window-manager.js';
import { LifecycleManager } from './lifecycle.js';
import { logger } from '../logger.js';

// 全局实例
let windowManager: WindowManager | null = null;
let lifecycleManager: LifecycleManager | null = null;
let isInitialized = false;

/**
 * 初始化 Electron 应用程序
 */
async function initializeApp(): Promise<void> {
    if (isInitialized) {
        logger.warn('Electron app already initialized');
        return;
    }

    try {
        logger.info('Initializing Electron application');

        // 实现单例模式 - 防止多实例运行
        const gotTheLock = app.requestSingleInstanceLock();

        if (!gotTheLock) {
            logger.info('Another instance is already running, quitting');
            app.quit();
            return;
        }

        // 创建窗口管理器
        windowManager = new WindowManager();

        // 创建生命周期管理器
        lifecycleManager = new LifecycleManager(windowManager);

        // 初始化生命周期管理器
        await lifecycleManager.initialize();

        isInitialized = true;
        logger.info('Electron application initialized successfully');

    } catch (error) {
        logger.error('Failed to initialize Electron application:', error);
        app.exit(1);
    }
}

/**
 * 关闭 Electron 应用程序
 */
async function shutdownApp(): Promise<void> {
    if (!isInitialized) {
        return;
    }

    try {
        logger.info('Shutting down Electron application');

        if (lifecycleManager) {
            await lifecycleManager.shutdown();
        }

        // 清理全局实例
        windowManager = null;
        lifecycleManager = null;
        isInitialized = false;

        logger.info('Electron application shutdown completed');
    } catch (error) {
        logger.error('Error during Electron application shutdown:', error);
        app.exit(1);
    }
}

/**
 * 获取窗口管理器实例
 * @returns WindowManager 实例或 null
 */
export function getWindowManager(): WindowManager | null {
    return windowManager;
}

/**
 * 获取生命周期管理器实例
 * @returns LifecycleManager 实例或 null
 */
export function getLifecycleManager(): LifecycleManager | null {
    return lifecycleManager;
}

/**
 * 检查应用程序是否已初始化
 * @returns 是否已初始化
 */
export function isAppInitialized(): boolean {
    return isInitialized;
}

/**
 * 启动 Electron 应用程序
 * 这是外部调用的主要入口点
 */
export async function startElectronApp(): Promise<void> {
    if (isInitialized) {
        logger.info('Electron app already running, focusing window');
        if (windowManager) {
            windowManager.focusWindow();
        }
        return;
    }

    await initializeApp();
}

/**
 * 停止 Electron 应用程序
 */
export async function stopElectronApp(): Promise<void> {
    await shutdownApp();
}

// 设置应用程序安全策略
app.commandLine.appendSwitch('--disable-web-security'); // 仅开发环境
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in Electron main process:', error);
    shutdownApp().finally(() => {
        process.exit(1);
    });
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection in Electron main process:', reason);
    logger.error('Promise:', promise);
});

// 处理进程退出信号
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    shutdownApp().finally(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    shutdownApp().finally(() => {
        process.exit(0);
    });
});

// 如果这个文件被直接运行（而不是被导入），则启动应用程序
if (require.main === module) {
    logger.info('Starting Electron application from main.ts');
    startElectronApp().catch((error) => {
        logger.error('Failed to start Electron application:', error);
        process.exit(1);
    });
}

// 导出主要函数供外部使用
export {
    initializeApp,
    shutdownApp
};