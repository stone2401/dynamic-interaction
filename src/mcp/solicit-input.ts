/**
 * MCP solicit-input 工具实现
 * 此模块现在负责调用服务器来启动用户交互，并等待结果。
 */

import { requestFeedbackSession } from '../server/websocket'; // 从服务器模块导入
import { UserFeedback } from '../types/feedback'; // 引入共用的用户反馈类型定义
import { PORT } from '../config'; // 新增：导入 PORT

/**
 * Agent 调用此函数来请求用户输入。
 * 它会与服务器通信，启动一个 UI 会话，并等待用户反馈。
 * @param projectDirectory 需要用户审核的项目目录的绝对路径。
 * @param summary 向用户展示的 AI 工作摘要。
 * @returns 一个 Promise，解析为用户提供的反馈。
 */
export async function solicitUserInput(
    projectDirectory: string,
    summary: string
): Promise<UserFeedback> {
    console.log(`MCP: 请求用户输入。项目目录: ${projectDirectory}, 摘要: ${summary}`);

    // 1. 通知服务器准备接收此会话的反馈
    // requestFeedbackSession 会立即返回一个 Promise，并在内部设置 pendingSessionRequest
    const feedbackPromise = requestFeedbackSession(summary, projectDirectory);

    // 2. 尝试为用户打开浏览器界面
    const url = `http://localhost:${PORT}`;
    console.log(`MCP: 指导用户在浏览器中打开: ${url}`);
    try {
        const open = (await import('open')).default;
        await open(url);
    } catch (e) {
        console.warn(`MCP: 自动打开浏览器失败，请用户手动访问: ${url}`);
        // 即便自动打开失败，也应继续等待反馈，用户可能手动打开
    }

    // 3. 等待服务器通过 WebSocket 收集到的反馈
    try {
        const feedback = await feedbackPromise;
        console.log('MCP: 从服务器收到反馈:', feedback);
        return feedback;
    } catch (error) {
        console.error('MCP: 获取用户反馈时出错:', error);
        return { error: (error instanceof Error ? error.message : String(error)) };
    }
}
