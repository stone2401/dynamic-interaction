/**
 * MCP solicit-input 工具实现
 * 此模块现在负责调用服务器来启动用户交互，并等待结果。
 */

import { connectionManager, checkQueueAndProcess } from '../server/websocket';
import { sessionQueue } from '../server/sessionQueue';
import { UserFeedback } from '../types/feedback'; // 引入共用的用户反馈类型定义
import { PORT } from '../config'; // 新增：导入 PORT
import { logger } from '../logger';
import { WindowFocusManager } from '../server/windowFocusManager';

/**
 * Agent 调用此函数来请求用户输入。
 * 它会与服务器通信，启动一个 UI 会话，并等待用户反馈。
 * 首先尝试聚焦现有浏览器窗口，如果失败则打开新的浏览器窗口。
 * @param projectDirectory 需要用户审核的项目目录的绝对路径。
 * @param summary 向用户展示的 AI 工作摘要。
 * @returns 一个 Promise，解析为用户提供的反馈。
 */
export async function solicitUserInput(
    projectDirectory: string,
    summary: string
): Promise<UserFeedback> {

    const url = `http://localhost:${PORT}`;
    const windowFocusManager = new WindowFocusManager();

    // 检查是否有活动的WebSocket连接
    const hasActiveConnections = connectionManager.getActiveConnectionCount() > 0;

    // 始终尝试聚焦浏览器窗口（无论是否有活动连接）
    let focusSuccessful = false;

    if (windowFocusManager.isWindowFocusEnabled()) {
        logger.info('MCP: 尝试聚焦浏览器窗口', { url, hasActiveConnections });

        try {
            focusSuccessful = await windowFocusManager.focusBrowserWindow(url);

            if (focusSuccessful) {
                logger.info('MCP: 浏览器窗口聚焦成功');
            } else {
                logger.warn('MCP: 浏览器窗口聚焦失败，将尝试其他方法');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('MCP: 浏览器窗口聚焦过程中出错', { error: errorMessage });
        }
    } else {
        logger.debug('MCP: 窗口聚焦功能已禁用，跳过聚焦尝试');
    }

    // 实现回退逻辑：如果聚焦失败且没有活动连接，则打开新浏览器窗口
    if (!focusSuccessful && !hasActiveConnections) {
        logger.info(`MCP: 聚焦失败且没有活动的WebSocket连接，打开新的浏览器窗口: ${url}`);
        try {
            const open = (await import('open')).default;
            await open(url);
            logger.info('MCP: 成功打开新的浏览器窗口');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`MCP: 自动打开浏览器失败，请用户手动访问: ${url}`, { error: errorMessage });
        }
    } else if (focusSuccessful) {
        logger.info('MCP: 使用现有浏览器窗口（聚焦成功）');
    } else if (hasActiveConnections) {
        logger.info(`MCP: 检测到${connectionManager.getActiveConnectionCount()}个活动WebSocket连接，复用现有连接（聚焦失败但有活动连接）`);
    }

    try {
        const feedbackPromise = sessionQueue.enqueue(summary, projectDirectory);
        checkQueueAndProcess(); // 触发队列处理
        const feedback = await feedbackPromise;
        logger.debug('MCP: 从服务器收到反馈:', feedback);
        return feedback;
    } catch (error) {
        logger.error('MCP: 获取用户反馈时出错:', error);
        return { error: (error instanceof Error ? error.message : String(error)) };
    }
}
