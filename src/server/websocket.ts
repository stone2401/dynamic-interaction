import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { sessionManager } from './sessionManager';
import { sessionQueue } from './sessionQueue';
import { serverStateManager } from './serverState';
import { messageRouter } from './messageRouter';

let wss: WebSocketServer | null = null;

class ConnectionManager {
    private static instance: ConnectionManager;
    private _activeSockets: Set<WebSocket> = new Set<WebSocket>();

    private constructor() { }

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    public addConnection(ws: WebSocket): void {
        this._activeSockets.add(ws);
    }

    public removeConnection(ws: WebSocket): void {
        this._activeSockets.delete(ws);
    }

    public getAvailableConnection(): WebSocket | null {
        for (const ws of this._activeSockets) {
            if (!sessionManager.hasSession(ws)) {
                return ws;
            }
        }
        return null;
    }

    public getActiveConnectionCount(): number {
        return this._activeSockets.size;
    }
}

export const connectionManager = ConnectionManager.getInstance();

export function configureWebSocketServer(server?: Server): void {
    if (server) {
        wss = new WebSocketServer({ server });
        logger.info('WebSocket 服务器已附加到现有 HTTP 服务器。');
    } else if (!wss) {
        logger.info('WebSocket 服务器配置已加载，将在 HTTP 服务器启动时初始化。');
        return;
    }

    wss.on('connection', (ws) => {
        connectionManager.addConnection(ws);
        logger.info('新客户端连接成功。');

        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                logger.debug('收到 WebSocket 消息:', parsedMessage);
                messageRouter.route(ws, parsedMessage);
            } catch (error) {
                logger.error('解析 WebSocket 消息失败:', error);
                ws.send(JSON.stringify({ type: 'error', data: '无效的消息格式。' }));
            }
        });

        ws.on('close', () => {
            logger.info('客户端连接已关闭。');
            connectionManager.removeConnection(ws);
            sessionManager.handleDisconnection(ws);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket 连接出错:', error);
            connectionManager.removeConnection(ws);
            sessionManager.handleDisconnection(ws);
        });

        checkQueueAndProcess();
    });

    logger.info('WebSocket 服务器连接处理逻辑已配置。');
}

export function initializeWebSocketServer(server: Server): void {
    if (!wss) {
        configureWebSocketServer(server);
    } else {
        logger.warn('试图重复初始化 WebSocket 服务器。');
    }
}

export function checkQueueAndProcess(): void {
    if (sessionQueue.isWaitingQueueEmpty()) {
        serverStateManager.checkAndStopIfIdle();
        return;
    }

    const availableWs = connectionManager.getAvailableConnection();
    if (availableWs) {
        const sessionRequest = sessionQueue.leaseNext();
        if (sessionRequest) {
            logger.info(`为会话 ${sessionRequest.id} 分配了可用连接。`);
            sessionManager.startSession(availableWs, sessionRequest);
        }
    }
}
