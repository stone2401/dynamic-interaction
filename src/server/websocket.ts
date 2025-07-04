/**
 * WebSocket 服务器配置
 * 统一管理WebSocket连接与会话生命周期
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { server } from './express';
import { logger } from '../logger';
import { sessionQueue } from './sessionQueue';
import { UserFeedback } from '../types/feedback';
import { sessionManager } from './sessionManager';
import { serverStateManager } from './serverState';

// 创建 WebSocketServer 实例，但不立即启动
export const wss = new WebSocketServer({ server, noServer: true });

// 连接管理器类
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

  /**
   * 添加新的WebSocket连接
   */
  public addConnection(ws: WebSocket): void {
    this._activeSockets.add(ws);
    logger.info(`新的WebSocket客户端已连接，当前活跃连接数: ${this.getActiveConnectionCount()}`);
  }

  /**
   * 移除WebSocket连接
   */
  public removeConnection(ws: WebSocket): void {
    this._activeSockets.delete(ws);
    logger.info(`WebSocket客户端已断开连接，当前活跃连接数: ${this.getActiveConnectionCount()}`);

    // 当所有连接关闭时，检查是否应该关闭服务器
    if (this.getActiveConnectionCount() === 0) {
      logger.info('所有WebSocket连接已关闭，准备关闭HTTP服务器');
      serverStateManager.checkAndStopIfIdle();
    }
  }

  /**
   * 获取所有活跃的WebSocket连接
   */
  public getActiveSockets(): Set<WebSocket> {
    return this._activeSockets;
  }

  /**
   * 获取活跃连接数量
   */
  public getActiveConnectionCount(): number {
    return this._activeSockets.size;
  }

  /**
   * 获取可用于新会话的WebSocket连接
   */
  public getAvailableConnection(): WebSocket | null {
    // 查找没有活跃会话的连接
    for (const ws of this._activeSockets) {
      if (!sessionManager.hasSession(ws)) {
        return ws;
      }
    }
    return null;
  }

  /**
   * 检查是否有空闲连接可用
   */
  public hasAvailableConnection(): boolean {
    return this.getAvailableConnection() !== null;
  }
}

// 导出连接管理器实例
export const connectionManager = ConnectionManager.getInstance();

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

// 导出会话分配函数
export function checkQueueAndProcess(): void {
  if (sessionQueue.isWaitingQueueEmpty()) return;

  // 使用连接管理器获取可用连接
  const availableSocket = connectionManager.getAvailableConnection();

  if (availableSocket) {
    const sessionRequest = sessionQueue.leaseNext();
    if (sessionRequest) {
      logger.info(`为新的WebSocket连接分配会话 ID: ${sessionRequest.id}`);
      sessionManager.startSession(availableSocket, sessionRequest);
    }
  }
}

export function configureWebSocketServer(): void {
  // 配置 WebSocket 服务器连接事件
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // 使用连接管理器添加新连接
    connectionManager.addConnection(ws);

    ws.on('close', () => {
      // 使用连接管理器移除连接
      connectionManager.removeConnection(ws);
      sessionManager.endSession(ws);
      logger.info(`WebSocket客户端已断开连接`);
    });

    ws.on('error', (error) => {
      // 使用连接管理器移除连接
      connectionManager.removeConnection(ws);
      sessionManager.endSession(ws);
      logger.error(`WebSocket客户端连接出错:`, error);
    });

    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        switch (parsedMessage.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
            break;
        }
      } catch (error) {
        logger.error('解析WebSocket消息失败:', error);
      }
    });

    ws.send(JSON.stringify({ type: 'info', data: '已连接到反馈服务器，等待任务分配。' }));

    // 检查是否有等待的会话可以分配给这个新连接
    checkQueueAndProcess();
  });

  // 处理服务器升级事件，允许WebSocket在HTTP服务器懒启动时正确工作
  server.on('upgrade', (request, socket, head) => {
    if (!serverStateManager.httpServer) {
      logger.error('HTTP服务器未启动，无法处理WebSocket升级请求');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  logger.info('WebSocket 服务器已配置。');

  setInterval(checkQueueAndProcess, 1000); // 每秒检查一次队列
}
