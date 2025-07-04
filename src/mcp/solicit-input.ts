/**
 * MCP solicit-input 工具实现
 * 此模块现在负责调用服务器来启动用户交互，并等待结果。
 */

import { connectionManager, requestFeedbackSession } from '../server/websocket'; // 从服务器模块导入
import { UserFeedback } from '../types/feedback'; // 引入共用的用户反馈类型定义
import { PORT } from '../config'; // 新增：导入 PORT
import { logger } from '../logger';

/**
 * Agent 调用此函数来请求用户输入。
 * 它会与服务器通信，启动一个 UI 会话，并等待用户反馈。
 * 如果已有活动的WebSocket连接，则复用该连接；否则打开新的浏览器窗口。
 * @param projectDirectory 需要用户审核的项目目录的绝对路径。
 * @param summary 向用户展示的 AI 工作摘要。
 * @returns 一个 Promise，解析为用户提供的反馈。
 */
export async function solicitUserInput(
    projectDirectory: string,
    summary: string
): Promise<UserFeedback> {

    const url = `http://localhost:${PORT}`;

    // 检查是否有活动的WebSocket连接
    const hasActiveConnections = connectionManager.getActiveConnectionCount() > 0;

    if (!hasActiveConnections) {
        // 仅在没有活动连接时才打开新的浏览器窗口
        logger.info(`MCP: 没有活动的WebSocket连接，指导用户在浏览器中打开: ${url}`);
        try {
            const open = (await import('open')).default;
            await open(url);
        } catch (e) {
            logger.warn(`MCP: 自动打开浏览器失败，请用户手动访问: ${url}`);
        }
    } else {
        logger.info(`MCP: 检测到${connectionManager.getActiveConnectionCount()}个活动WebSocket连接，复用现有连接`);
    }

    const feedbackPromise = requestFeedbackSession(summary, projectDirectory);
    try {
        const feedback = await feedbackPromise;
        logger.debug('MCP: 从服务器收到反馈:', feedback);
        return feedback;
    } catch (error) {
        logger.error('MCP: 获取用户反馈时出错:', error);
        return { error: (error instanceof Error ? error.message : String(error)) };
    }
}
