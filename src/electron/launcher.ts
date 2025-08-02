/**
 * Electron 应用程序启动器服务
 * 负责启动、状态检查和关闭 Electron 应用程序
 */
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { logger } from '../logger.js';
import { ELECTRON_CONFIG } from '../config.js';

export class ElectronLauncher {
    private electronProcess: ChildProcess | null = null;
    private isLaunching = false;
    private isShuttingDown = false;
    private activeSessions = new Set<string>();
    private launchPromise: Promise<void> | null = null;

    /**
     * 启动 Electron 应用程序
     * @param sessionId 会话ID（可选）
     * @returns Promise，在应用程序启动后解析
     */
    async launch(sessionId?: string): Promise<void> {
        // 如果已经在启动过程中，等待启动完成
        if (this.isLaunching && this.launchPromise) {
            logger.info('Electron launch already in progress, waiting...');
            await this.launchPromise;
            if (sessionId) {
                this.activeSessions.add(sessionId);
            }
            return;
        }

        // 如果已经运行，只需添加会话
        if (this.isRunning()) {
            logger.info('Electron already running, adding session');
            if (sessionId) {
                this.activeSessions.add(sessionId);
            }
            await this.focusWindow();
            return;
        }

        // 开始启动过程
        this.isLaunching = true;
        this.launchPromise = this.doLaunch();

        try {
            await this.launchPromise;
            if (sessionId) {
                this.activeSessions.add(sessionId);
            }
            logger.info(`Electron launched successfully${sessionId ? ` for session ${sessionId}` : ''}`);
        } finally {
            this.isLaunching = false;
            this.launchPromise = null;
        }
    }

    /**
     * 关闭 Electron 应用程序
     * @param sessionId 会话ID（可选）
     * @param force 是否强制关闭
     * @returns Promise，在应用程序关闭后解析
     */
    async shutdown(sessionId?: string, force = false): Promise<void> {
        if (sessionId) {
            this.activeSessions.delete(sessionId);
            logger.debug(`Removed session ${sessionId}, remaining: ${this.activeSessions.size}`);

            // 如果还有活跃会话且不是强制关闭，不关闭应用程序
            if (this.activeSessions.size > 0 && !force) {
                logger.info('Other sessions still active, keeping Electron running');
                return;
            }
        }

        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress');
            return;
        }

        if (!this.isRunning()) {
            logger.info('Electron not running, nothing to shutdown');
            return;
        }

        logger.info('Shutting down Electron application');
        this.isShuttingDown = true;

        try {
            await this.doShutdown();
            this.activeSessions.clear();
            logger.info('Electron shutdown completed');
        } catch (error) {
            logger.error('Error during Electron shutdown:', error);
            throw error;
        } finally {
            this.isShuttingDown = false;
        }
    }

    /**
     * 检查 Electron 应用程序是否正在运行
     * @returns 是否正在运行
     */
    isRunning(): boolean {
        return this.electronProcess !== null && !this.electronProcess.killed;
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
     * 将窗口带到前台
     * @returns Promise
     */
    async focusWindow(): Promise<void> {
        if (!this.isRunning()) {
            logger.warn('Cannot focus window: Electron not running');
            return;
        }

        try {
            // 这里可以通过 IPC 或其他方式通知 Electron 主进程将窗口带到前台
            // 由于我们使用子进程启动，这里暂时只记录日志
            logger.info('Requesting window focus');
        } catch (error) {
            logger.error('Failed to focus window:', error);
        }
    }

    /**
     * 执行实际的启动逻辑
     * @returns Promise
     */
    private async doLaunch(): Promise<void> {
        try {
            // 检查 Electron 是否可用
            if (!await this.isElectronAvailable()) {
                throw new Error('Electron is not available');
            }

            logger.info('Starting Electron process');

            // 构建 Electron 启动参数
            const electronPath = await this.getElectronPath();
            const mainScript = path.join(__dirname, 'main.js');

            const args = [mainScript];

            // 添加开发环境参数
            if (process.env.NODE_ENV === 'development') {
                args.push('--enable-logging');
                args.push('--log-level=0');
            }

            // 启动 Electron 进程
            this.electronProcess = spawn(electronPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    ELECTRON_IS_DEV: process.env.NODE_ENV === 'development' ? '1' : '0',
                    ELECTRON_DISABLE_SECURITY_WARNINGS: process.env.NODE_ENV === 'development' ? '1' : '0',
                },
                detached: false,
            });

            // 设置进程事件处理器
            this.setupProcessHandlers();

            // 等待进程启动
            await this.waitForProcessReady();

            logger.info('Electron process started successfully');

        } catch (error) {
            logger.error('Failed to launch Electron:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * 执行实际的关闭逻辑
     * @returns Promise
     */
    private async doShutdown(): Promise<void> {
        if (!this.electronProcess) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const process = this.electronProcess!;
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    this.cleanup();
                    resolve();
                }
            };

            // 监听进程退出
            process.once('exit', cleanup);
            process.once('close', cleanup);

            // 设置超时
            const timeout = setTimeout(() => {
                if (!resolved) {
                    logger.warn('Electron process did not exit gracefully, killing');
                    process.kill('SIGKILL');
                    cleanup();
                }
            }, 10000); // 10秒超时

            // 尝试优雅关闭
            try {
                process.kill('SIGTERM');
            } catch (error) {
                logger.error('Failed to send SIGTERM to Electron process:', error);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * 检查 Electron 是否可用
     * @returns Promise<boolean>
     */
    private async isElectronAvailable(): Promise<boolean> {
        try {
            // 尝试动态导入 Electron
            await import('electron');
            return true;
        } catch (error) {
            logger.warn('Electron is not available:', error);
            return false;
        }
    }

    /**
     * 获取 Electron 可执行文件路径
     * @returns Promise<string>
     */
    private async getElectronPath(): Promise<string> {
        try {
            // 尝试使用 electron 包的路径
            const electron = await import('electron');
            return electron.app?.getPath('exe') || 'electron';
        } catch (error) {
            // 回退到系统路径中的 electron
            return 'electron';
        }
    }

    /**
     * 设置进程事件处理器
     */
    private setupProcessHandlers(): void {
        if (!this.electronProcess) {
            return;
        }

        const process = this.electronProcess;

        // 处理标准输出
        if (process.stdout) {
            process.stdout.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                if (output) {
                    logger.debug(`Electron stdout: ${output}`);
                }
            });
        }

        // 处理标准错误
        if (process.stderr) {
            process.stderr.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                if (output) {
                    logger.warn(`Electron stderr: ${output}`);
                }
            });
        }

        // 处理进程退出
        process.on('exit', (code, signal) => {
            logger.info(`Electron process exited with code ${code}, signal ${signal}`);
            this.cleanup();
        });

        // 处理进程错误
        process.on('error', (error) => {
            logger.error('Electron process error:', error);
            this.cleanup();
        });

        // 处理进程关闭
        process.on('close', (code, signal) => {
            logger.info(`Electron process closed with code ${code}, signal ${signal}`);
            this.cleanup();
        });
    }

    /**
     * 等待进程准备就绪
     * @returns Promise
     */
    private async waitForProcessReady(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.electronProcess) {
                reject(new Error('Electron process not started'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for Electron process to be ready'));
            }, 30000); // 30秒超时

            // 简单的等待逻辑 - 等待一段时间后认为进程已准备就绪
            // 在实际实现中，可以通过 IPC 或其他方式确认进程状态
            setTimeout(() => {
                clearTimeout(timeout);
                if (this.electronProcess && !this.electronProcess.killed) {
                    resolve();
                } else {
                    reject(new Error('Electron process failed to start'));
                }
            }, 3000); // 3秒后认为启动成功
        });
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        if (this.electronProcess) {
            this.electronProcess.removeAllListeners();
            this.electronProcess = null;
        }
        this.activeSessions.clear();
        this.isLaunching = false;
        this.isShuttingDown = false;
        this.launchPromise = null;
    }
}

// 单例实例
let launcherInstance: ElectronLauncher | null = null;

/**
 * 获取 ElectronLauncher 单例实例
 * @returns ElectronLauncher 实例
 */
export function getElectronLauncher(): ElectronLauncher {
    if (!launcherInstance) {
        launcherInstance = new ElectronLauncher();
    }
    return launcherInstance;
}

/**
 * 启动 Electron 应用程序（便捷方法）
 * @param sessionId 会话ID
 * @returns Promise
 */
export async function launchElectron(sessionId?: string): Promise<void> {
    const launcher = getElectronLauncher();
    return launcher.launch(sessionId);
}

/**
 * 关闭 Electron 应用程序（便捷方法）
 * @param sessionId 会话ID
 * @param force 是否强制关闭
 * @returns Promise
 */
export async function shutdownElectron(sessionId?: string, force = false): Promise<void> {
    const launcher = getElectronLauncher();
    return launcher.shutdown(sessionId, force);
}

/**
 * 检查 Electron 是否正在运行（便捷方法）
 * @returns 是否正在运行
 */
export function isElectronRunning(): boolean {
    if (!launcherInstance) {
        return false;
    }
    return launcherInstance.isRunning();
}