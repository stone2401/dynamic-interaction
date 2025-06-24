/**
 * WebSocket 服务器配置
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { exec } from 'child_process';
import { server } from './express';
import { logger } from '../logger';
import { sessionQueue } from './sessionQueue';
import { UserFeedback } from '../types/feedback';
import { sessionManager } from './sessionManager';

export const wss = new WebSocketServer({ server });
export const activeSockets = new Set<WebSocket>();

// 初始化日志记录器的 WebSocket 服务器
import { setWebSocketServer } from './websocketTransport';
setWebSocketServer(wss);

export function requestFeedbackSession(summary: string, projectDirectory: string): Promise<UserFeedback> {
    return new Promise((resolve, reject) => {
        const requestData = { summary, projectDirectory, resolve, reject };
        sessionQueue.enqueue(requestData);
        checkQueueAndProcess(); // 立即尝试处理
    });
}

function checkQueueAndProcess(): void {
    if (sessionQueue.isWaitingQueueEmpty()) return;

    const availableSocket = Array.from(activeSockets).find(ws => !sessionManager.hasSession(ws));

    if (availableSocket) {
        const sessionRequest = sessionQueue.leaseNext();
        if (sessionRequest) {
            logger.info(`为新的WebSocket连接分配会话 ID: ${sessionRequest.id}`);
            sessionManager.startSession(availableSocket, sessionRequest);
        }
    }
}

export function configureWebSocketServer(): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        activeSockets.add(ws);
        logger.info(`新的WebSocket客户端已连接，当前活跃连接数: ${activeSockets.size}`);

        const pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);

        ws.on('close', () => {
            activeSockets.delete(ws);
            clearInterval(pingInterval);
            logger.info(`WebSocket客户端已断开连接，当前活跃连接数: ${activeSockets.size}`);
        });

        ws.on('error', (error) => {
            activeSockets.delete(ws);
            clearInterval(pingInterval);
            logger.error(`WebSocket客户端连接出错:`, error);
        });

        ws.send(JSON.stringify({ type: 'info', data: '已连接到反馈服务器，等待任务分配。' }));

        checkQueueAndProcess();
    });

    logger.info('WebSocket 服务器已配置并监听连接。');

    setInterval(checkQueueAndProcess, 1000); // 每秒检查一次队列
}
