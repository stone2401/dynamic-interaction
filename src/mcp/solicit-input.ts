/**
 * MCP solicit-input 工具实现
 * 此模块现在负责调用服务器来启动用户交互，并等待结果。
 */

import { webSocketManager } from '../server/websocket/connection';
import { messageProcessor } from '../server/messaging/processor';
import { sessionQueue } from '../server/session/queue';
import { UserFeedback } from '../types/feedback'; // 引入共用的用户反馈类型定义
import { SessionMode } from '../types/session'; // 引入会话模式枚举
import { PORT, ELECTRON_CONFIG } from '../config'; // 新增：导入 PORT 和 ELECTRON_CONFIG
import { logger } from '../logger';

/**
 * Agent 调用此函数来请求用户输入或发送通知。
 * 它会与服务器通信，启动一个 UI 会话。
 * 如果已有活动的WebSocket连接，则复用该连接；否则打开新的浏览器窗口。
 * @param projectDirectory 需要用户审核的项目目录的绝对路径。
 * @param summary 向用户展示的 AI 工作摘要。
 * @param mode 会话模式，默认为交互模式。通知模式不等待用户响应。
 * @returns 一个 Promise，解析为用户提供的反馈或通知确认。
 */
export async function solicitUserInput(
    projectDirectory: string,
    summary: string,
    mode: SessionMode = SessionMode.INTERACTIVE
): Promise<UserFeedback> {

    const url = `http://localhost:${PORT}`;

    // 检查是否有活动的WebSocket连接
    const hasActiveConnections = webSocketManager.getConnectionCount() > 0;

    // 创建会话请求
    const sessionRequest = {
        id: require('crypto').randomUUID(),
        summary,
        projectDirectory,
        createdAt: Date.now(),
        mode,
        resolve: null as any,
        reject: null as any,
        retryCount: 0
    };

    if (!hasActiveConnections) {
        // 根据配置选择启动方式
        if (ELECTRON_CONFIG.enabled) {
            logger.info(`MCP: 没有活动的WebSocket连接，启动 Electron GUI`);
            await launchElectronUI(sessionRequest.id);
        } else {
            // 仅在没有活动连接时才打开新的浏览器窗口
            logger.info(`MCP: 没有活动的WebSocket连接，指导用户在浏览器中打开: ${url}`);
            await launchBrowserUI(url);
        }
    } else {
        logger.info(`MCP: 检测到${webSocketManager.getConnectionCount()}个活动WebSocket连接，复用现有连接`);
    }

    try {
        // 创建Promise并设置resolve/reject
        const feedbackPromise = new Promise<UserFeedback>((resolve, reject) => {
            sessionRequest.resolve = resolve;
            sessionRequest.reject = reject;
        });

        // 将请求入队
        sessionQueue.enqueue(sessionRequest);
        logger.info(`MCP: ${mode}模式会话已启动，ID: ${sessionRequest.id}`);

        // 触发队列处理
        messageProcessor.checkQueueAndProcess();

        const feedback = await feedbackPromise;

        // 会话完成后，如果是 Electron 模式，通知 launcher 会话结束
        if (ELECTRON_CONFIG.enabled) {
            try {
                const { shutdownElectron } = await import('../electron/launcher.js');
                await shutdownElectron(sessionRequest.id);
            } catch (error) {
                logger.warn('MCP: 通知 Electron 会话结束时出错:', error);
            }
        }

        logger.debug(`MCP: 从服务器收到反馈 (${mode}模式):`, feedback);
        return feedback;
    } catch (error) {
        logger.error(`MCP: 获取用户反馈时出错 (${mode}模式):`, error);

        // 错误情况下也要清理会话
        if (ELECTRON_CONFIG.enabled) {
            try {
                const { shutdownElectron } = await import('../electron/launcher.js');
                await shutdownElectron(sessionRequest.id);
            } catch (cleanupError) {
                logger.warn('MCP: 清理 Electron 会话时出错:', cleanupError);
            }
        }

        return { error: (error instanceof Error ? error.message : String(error)) };
    }
}

/**
 * 启动 Electron GUI
 * @param sessionId 会话ID
 */
async function launchElectronUI(sessionId?: string): Promise<void> {
    try {
        // 动态导入 Electron launcher 以避免在浏览器模式下加载 Electron
        const { launchElectron } = await import('../electron/launcher.js');
        await launchElectron(sessionId);
        logger.info(`MCP: Electron GUI 启动成功${sessionId ? ` (会话: ${sessionId})` : ''}`);
    } catch (error) {
        logger.error('MCP: Electron GUI 启动失败，回退到浏览器模式:', error);
        // 回退到浏览器模式
        const url = `http://localhost:${PORT}`;
        await launchBrowserUI(url);
    }
}

/**
 * 启动浏览器 UI
 * @param url 要打开的 URL
 */
async function launchBrowserUI(url: string): Promise<void> {
    try {
        const open = (await import('open')).default;
        await open(url);
        logger.info(`MCP: 浏览器 UI 启动成功: ${url}`);
    } catch (error) {
        logger.warn(`MCP: 自动打开浏览器失败，请用户手动访问: ${url}`, error);
    }
}

/**
 * 专用的通知工具接口，立即返回成功状态
 * @param projectDirectory 项目目录的绝对路径
 * @param summary 通知摘要
 * @returns 立即返回成功的Promise
 */
export async function notifyUser(
    projectDirectory: string,
    summary: string
): Promise<UserFeedback> {
    logger.info(`MCP: 调用通知模式`);
    return solicitUserInput(projectDirectory, summary, SessionMode.NOTIFICATION);
}
