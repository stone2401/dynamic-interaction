/**
 * 会话管理器模块
 * 负责管理活动的 WebSocket 会话，包括生命周期和空闲超时。
 */

import { WebSocket } from 'ws';
import { logger } from '../logger';
import { sessionQueue, PendingSessionRequest } from './sessionQueue';
import { SESSION_LEASE_TIMEOUT_SECONDS } from '../config';
import { UserFeedback } from '../types/feedback';

// 发送系统信息
function sendSystemInfo(ws: WebSocket, sessionRequest: PendingSessionRequest): void {
    const projectRoot = process.cwd();
    ws.send(JSON.stringify({
        type: 'system_info',
        data: {
            workspaceDirectory: sessionRequest.projectDirectory || projectRoot,
            sessionId: sessionRequest.id,
            serverVersion: process.env.npm_package_version || '1.0.0',
            leaseTimeoutSeconds: SESSION_LEASE_TIMEOUT_SECONDS
        }
    }));
}

class Session {
    private ws: WebSocket;
    private sessionRequest: PendingSessionRequest;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(ws: WebSocket, sessionRequest: PendingSessionRequest) {
        this.ws = ws;
        this.sessionRequest = sessionRequest;
        this.initialize();
    }

    private initialize(): void {
        logger.info(`会话 ${this.sessionRequest.id} 初始化`);
        this.ws.on('message', this.handleMessage.bind(this));
        this.ws.on('close', this.handleClose.bind(this));
        this.ws.on('error', this.handleError.bind(this));

        // 发送初始信息
        this.ws.send(JSON.stringify({ type: 'summary', data: this.sessionRequest.summary }));
        sendSystemInfo(this.ws, this.sessionRequest);

        this.resetTimeout();
    }

    private handleMessage(message: string): void {
        this.resetTimeout(); // 收到任何消息都重置计时器

        try {
            const parsedMessage = JSON.parse(message);
            logger.info(`会话 ${this.sessionRequest.id} 收到消息:`, parsedMessage);

            switch (parsedMessage.type) {
                case 'submit_feedback':
                    const feedback: UserFeedback = {
                        text: parsedMessage.data?.text || '',
                        imageData: parsedMessage.data?.imageData || []
                    };
                    this.sessionRequest.resolve(feedback);
                    sessionQueue.acknowledge(this.sessionRequest.id);
                    this.ws.send(JSON.stringify({ type: 'feedback_status', data: { status: 'received' } }));
                    this.cleanup(); // 任务完成，清理会话
                    break;
                // 其他消息类型处理...
            }
        } catch (error) {
            logger.error(`处理消息时出错 (会话 ID: ${this.sessionRequest.id}):`, error);
            this.ws.send(JSON.stringify({ type: 'error', data: '无效的消息格式。' }));
        }
    }

    private handleClose(): void {
        logger.info(`客户端断开连接 (会话 ID: ${this.sessionRequest.id})`);
        sessionQueue.requeue(this.sessionRequest.id, new Error('WebSocket 连接在反馈完成前关闭。'));
        this.cleanup();
    }

    private handleError(error: Error): void {
        logger.error(`WebSocket 错误 (会话 ID: ${this.sessionRequest.id}):`, error);
        sessionQueue.requeue(this.sessionRequest.id, error);
        this.cleanup();
    }

    private onTimeout(): void {
        logger.warn(`会话 ${this.sessionRequest.id} 因不活动而超时。`);
        this.ws.send(JSON.stringify({ type: 'error', data: '会话因长时间未活动已超时。' }));
        this.sessionRequest.reject(new Error('会话超时'));
        sessionQueue.acknowledge(this.sessionRequest.id); // 从队列中移除，不再重试
        this.cleanup(true); // 清理并关闭连接
    }

    private resetTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(this.onTimeout.bind(this), SESSION_LEASE_TIMEOUT_SECONDS * 1000);
    }

    private cleanup(closeConnection: boolean = false): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.ws.removeAllListeners('message');
        this.ws.removeAllListeners('close');
        this.ws.removeAllListeners('error');
        SessionManager.getInstance().endSession(this.ws);
        if (closeConnection) {
            this.ws.close();
        }
    }
}

class SessionManager {
    private static instance: SessionManager;
    private activeSessions: Map<WebSocket, Session> = new Map();

    private constructor() {}

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    public startSession(ws: WebSocket, sessionRequest: PendingSessionRequest): void {
        if (this.activeSessions.has(ws)) {
            logger.warn('此 WebSocket 连接已存在一个活动会话。');
            return;
        }
        const session = new Session(ws, sessionRequest);
        this.activeSessions.set(ws, session);
    }

    public endSession(ws: WebSocket): void {
        if (this.activeSessions.has(ws)) {
            this.activeSessions.delete(ws);
            logger.info(`会话已结束，剩余活动会话: ${this.activeSessions.size}`);
        }
    }

    public hasSession(ws: WebSocket): boolean {
        return this.activeSessions.has(ws);
    }
}

export const sessionManager = SessionManager.getInstance();
