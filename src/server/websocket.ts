/**
 * WebSocket 服务器配置
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { exec } from 'child_process';
import { server } from './express';
import { logger } from '../logger';
import { sessionQueue, PendingSessionRequest } from './sessionQueue';
import { UserFeedback } from '../types/feedback';

export const wss = new WebSocketServer({ server });
export const activeSockets = new Set<WebSocket>();

// 初始化日志记录器的 WebSocket 服务器
import { setWebSocketServer } from './websocketTransport';
setWebSocketServer(wss);

// 原_handleWebSocketConnectionLogic函数被拆分并重构为setupWebSocketSessionHandlers，已在上方实现

export function requestFeedbackSession(summary: string, projectDirectory: string): Promise<UserFeedback> {
    return new Promise((resolve, reject) => {
        const requestData = { summary, projectDirectory, resolve, reject };
        sessionQueue.enqueue(requestData);
    });
}

// 添加一个函数来检查队列并分配消息给可用的WebSocket连接
function checkQueueAndProcess(): void {
    // 如果没有活跃的连接或队列为空，不执行任何操作
    if (activeSockets.size === 0 || sessionQueue.isWaitingQueueEmpty()) {
        return;
    }

    // 尝试从队列中获取一个请求
    const sessionRequest = sessionQueue.leaseNext();
    if (!sessionRequest) {
        return; // 没有可用的请求
    }

    // 从活跃连接中选择一个（这里简单地选择第一个连接）
    const ws = Array.from(activeSockets)[0];

    logger.info(`分配会话 ID: ${sessionRequest.id} 到现有WebSocket连接`);

    // 发送摘要到这个连接
    ws.send(JSON.stringify({ type: 'summary', data: sessionRequest.summary }));

    // 将会话与此WebSocket关联
    sessionRequest.ws = ws;

    // 设置会话处理逻辑
    setupWebSocketSessionHandlers(ws, sessionRequest);
}

// 为连接设置会话处理逻辑
function setupWebSocketSessionHandlers(ws: WebSocket, sessionRequest: PendingSessionRequest): void {
    // 创建消息处理函数
    const messageHandler = (message: string) => {
        try {
            const parsedMessage = JSON.parse(message);
            logger.info(`服务器收到消息 (会话 ID: ${sessionRequest.id}):`, parsedMessage);

            switch (parsedMessage.type) {
                case 'client_ready':
                    logger.info(`客户端准备就绪，确认摘要已显示 (会话 ID: ${sessionRequest.id})`);
                    break;

                case 'command':
                    if (typeof parsedMessage.data === 'string') {
                        exec(parsedMessage.data, { cwd: sessionRequest.projectDirectory }, (error, stdout, stderr) => {
                            if (error) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `错误: ${error.message}` }));
                                return;
                            }
                            if (stderr) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `标准错误: ${stderr}` }));
                                return;
                            }
                            ws.send(JSON.stringify({ type: 'command_result', data: stdout }));
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', data: '无效的命令格式。' }));
                    }
                    break;

                case 'submit_feedback':
                    const { text, imageData } = parsedMessage.data;
                    const collectedFeedback: UserFeedback = {
                        text,
                        imageData
                    };

                    logger.info(`最终反馈已提交 (会话 ID: ${sessionRequest.id}):`, collectedFeedback);

                    // 解析会话Promise并确认会话完成
                    sessionRequest.resolve(collectedFeedback);
                    sessionQueue.acknowledge(sessionRequest.id);

                    // 移除消息处理函数，准备处理下一个会话
                    ws.removeListener('message', messageHandler);

                    // 检查队列中是否有更多任务要处理
                    process.nextTick(checkQueueAndProcess);
                    break;

                default:
                    logger.warn(`收到未知类型的消息 (会话 ID: ${sessionRequest.id}):`, parsedMessage.type);
                    break;
            }
        } catch (error) {
            logger.error(`处理消息时出错 (会话 ID: ${sessionRequest.id}):`, error);
            ws.send(JSON.stringify({ type: 'error', data: '无效的消息格式。' }));
        }
    };

    // 添加消息处理函数
    ws.on('message', messageHandler);

    // 处理连接关闭和错误
    const closeHandler = () => {
        logger.info(`客户端已断开连接 (会话 ID: ${sessionRequest.id})`);
        activeSockets.delete(ws);
        // 移除所有特定于此会话的事件处理程序
        ws.removeListener('message', messageHandler);
        ws.removeListener('close', closeHandler);
        ws.removeListener('error', errorHandler);
        // 将任务重新排队
        sessionQueue.requeue(sessionRequest.id, new Error('WebSocket 连接在反馈完成前关闭。'));
    };

    const errorHandler = (error: Error) => {
        logger.error(`WebSocket 错误 (会话 ID: ${sessionRequest.id}):`, error);
        activeSockets.delete(ws);
        // 移除所有特定于此会话的事件处理程序
        ws.removeListener('message', messageHandler);
        ws.removeListener('close', closeHandler);
        ws.removeListener('error', errorHandler);
        // 将任务重新排队
        sessionQueue.requeue(sessionRequest.id, error);
    };

    ws.on('close', closeHandler);
    ws.on('error', errorHandler);
}

export function configureWebSocketServer(): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        // 将新的WebSocket连接添加到活跃连接池
        activeSockets.add(ws);
        logger.info(`新的WebSocket客户端已连接，当前活跃连接数: ${activeSockets.size}`);

        // 设置基本的心跳检测，保持连接活跃
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000); // 30秒发送一次ping

        // 处理连接关闭
        ws.on('close', () => {
            activeSockets.delete(ws);
            clearInterval(pingInterval);
            logger.info(`WebSocket客户端已断开连接，当前活跃连接数: ${activeSockets.size}`);
        });

        // 处理连接错误
        ws.on('error', (error) => {
            activeSockets.delete(ws);
            clearInterval(pingInterval);
            logger.error(`WebSocket客户端连接出错:`, error);
            logger.info(`当前活跃连接数: ${activeSockets.size}`);
        });

        // 发送初始状态通知
        ws.send(JSON.stringify({ type: 'info', data: '已连接到反馈服务器，等待任务分配。' }));

        // 检查是否有待处理的会话可以立即分配给这个新连接
        const sessionRequest = sessionQueue.leaseNext();
        if (sessionRequest) {
            logger.info(`客户端已连接，立即分配会话 ID: ${sessionRequest.id}`);
            ws.send(JSON.stringify({ type: 'summary', data: sessionRequest.summary }));
            sessionRequest.ws = ws;
            setupWebSocketSessionHandlers(ws, sessionRequest);
        }
    });

    logger.info('WebSocket 服务器已配置并监听连接。');

    // 设置定期检查队列的计时器，尝试分配消息给可用连接
    setInterval(() => {
        if (!sessionQueue.isWaitingQueueEmpty() && activeSockets.size > 0) {
            checkQueueAndProcess();
        }
    }, 1000); // 每秒检查一次
}
