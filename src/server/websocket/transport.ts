/**
 * WebSocket 传输层
 * 提供WebSocket消息的发送和接收工具
 */

import { WebSocket } from 'ws';
import { logger } from '../../logger';
import { WebSocketError, ErrorCodes } from '../utils/errors';

export class WebSocketTransport {
  
  public static send(ws: WebSocket, message: any): boolean {
    if (ws.readyState !== WebSocket.OPEN) {
      logger.warn('尝试向已关闭的WebSocket连接发送消息');
      return false;
    }

    try {
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      ws.send(messageString);
      return true;
    } catch (error) {
      logger.error('发送WebSocket消息失败:', error);
      throw new WebSocketError(
        '消息发送失败',
        ErrorCodes.CONNECTION_ERROR
      );
    }
  }

  public static sendError(
    ws: WebSocket, 
    message: string, 
    code: string,
    sessionId?: string
  ): boolean {
    const errorMessage = {
      type: 'error',
      data: {
        message,
        code,
        sessionId,
        timestamp: Date.now()
      }
    };

    return this.send(ws, errorMessage);
  }

  public static sendNotification(
    ws: WebSocket,
    notificationId: string,
    summary: string,
    projectDirectory?: string
  ): boolean {
    const notification = {
      type: 'notification',
      data: {
        notificationId,
        summary,
        projectDirectory,
        mode: 'NOTIFICATION',
        createdAt: Date.now()
      }
    };

    return this.send(ws, notification);
  }

  public static sendSessionRequest(
    ws: WebSocket,
    sessionId: string,
    summary: string,
    projectDirectory?: string,
    startTime?: number,
    timeout?: number
  ): boolean {
    const sessionRequest = {
      type: 'session_request',
      data: {
        sessionId,
        summary,
        projectDirectory,
        mode: 'INTERACTIVE',
        startTime,
        timeoutSeconds: timeout
      }
    };

    return this.send(ws, sessionRequest);
  }

  public static sendSystemInfo(
    ws: WebSocket,
    sessionId?: string,
    workspaceDirectory?: string,
    sessionStartTime?: number,
    leaseTimeoutSeconds?: number,
    mode?: string
  ): boolean {
    const systemInfo = {
      type: 'system_info',
      data: {
        sessionId: sessionId || '无',
        workspaceDirectory: workspaceDirectory || '未知',
        sessionStartTime,
        leaseTimeoutSeconds: leaseTimeoutSeconds || 0,
        mode,
        serverVersion: process.env.npm_package_version || '1.0.0',
        timestamp: Date.now()
      }
    };

    return this.send(ws, systemInfo);
  }

  public static sendPong(ws: WebSocket): boolean {
    const pong = {
      type: 'pong',
      data: {
        timestamp: Date.now()
      }
    };

    return this.send(ws, pong);
  }

  public static broadcast(connections: WebSocket[], message: any): number {
    let successCount = 0;
    
    for (const ws of connections) {
      if (this.send(ws, message)) {
        successCount++;
      }
    }

    return successCount;
  }
}

export const transport = WebSocketTransport;