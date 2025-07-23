/**
 * WebSocket 连接管理
 * 负责管理WebSocket连接的生命周期
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger, setWebSocketServer } from '../../logger';
import { ConnectionInfo } from '../utils/types';
import { WebSocketError, ErrorCodes } from '../utils/errors';
import { randomUUID } from 'crypto';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private connections: Map<string, ConnectionInfo> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: Server): void {
    if (this.wss) {
      logger.warn('WebSocket服务器已经初始化');
      return;
    }

    this.wss = new WebSocketServer({ server });
    setWebSocketServer(this.wss);
    logger.info('WebSocket服务器已附加到HTTP服务器');

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket) => {
      const connectionId = this.addConnection(ws);
      logger.info(`新客户端连接成功，连接ID: ${connectionId}`);

      // 设置连接事件处理器
      this.setupConnectionHandlers(ws, connectionId);
    });
  }

  private setupConnectionHandlers(ws: WebSocket, connectionId: string): void {
    ws.on('message', (message) => {
      this.updateConnectionActivity(connectionId);
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      logger.info(`客户端连接已关闭，连接ID: ${connectionId}`);
      this.removeConnection(connectionId);
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket连接出错，连接ID: ${connectionId}:`, error);
      this.removeConnection(connectionId);
      this.handleDisconnection(ws);
    });

    ws.on('pong', () => {
      this.updateConnectionActivity(connectionId);
    });
  }

  private addConnection(ws: WebSocket): string {
    const connectionId = randomUUID();
    const now = Date.now();
    
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      ws,
      connectedAt: now,
      lastActivity: now
    };

    this.connections.set(connectionId, connectionInfo);
    return connectionId;
  }

  private removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  private updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  private handleMessage(ws: WebSocket, message: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      const messageStr = Buffer.isBuffer(message) ? message.toString() : 
                        message instanceof ArrayBuffer ? Buffer.from(message).toString() :
                        Array.isArray(message) ? Buffer.concat(message).toString() :
                        String(message);
      
      const parsedMessage = JSON.parse(messageStr);
      logger.debug('收到WebSocket消息:', parsedMessage);

      // 导入消息处理器（避免循环依赖）
      const { messageProcessor } = require('../messaging/processor');
      messageProcessor.process(ws, parsedMessage);

    } catch (error) {
      logger.error('解析WebSocket消息失败:', error);
      const errorResponse = {
        type: 'error',
        data: {
          message: 'JSON解析失败',
          code: ErrorCodes.JSON_PARSE_ERROR
        }
      };
      ws.send(JSON.stringify(errorResponse));
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    // 导入会话管理器（避免循环依赖）
    const { sessionManager } = require('../session/manager');
    sessionManager.handleDisconnection(ws);

    // 检查服务器空闲状态
    const { lifecycleManager } = require('../core/lifecycle');
    lifecycleManager.checkAndStopIfIdle();
  }

  public getAvailableConnection(): WebSocket | null {
    // 导入会话管理器（避免循环依赖）
    const { sessionManager } = require('../session/manager');
    
    for (const connection of this.connections.values()) {
      if (!sessionManager.hasSession(connection.ws)) {
        return connection.ws;
      }
    }
    return null;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  public closeAll(): void {
    logger.info(`关闭所有WebSocket连接 (${this.connections.size}个)`);
    
    for (const connection of this.connections.values()) {
      try {
        connection.ws.close();
      } catch (error) {
        logger.error(`关闭WebSocket连接失败:`, error);
      }
    }
    
    this.connections.clear();
  }

  public startHeartbeat(intervalMs: number = 30000): void {
    setInterval(() => {
      for (const connection of this.connections.values()) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      }
    }, intervalMs);
  }
}

export const webSocketManager = WebSocketManager.getInstance();