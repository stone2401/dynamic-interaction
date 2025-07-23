/**
 * 会话管理器
 * 重构和改进的会话管理功能
 */

import { WebSocket } from 'ws';
import { logger } from '../../logger';
import { SessionContext, SessionContextBuilder, SessionStats } from './context';
import { sessionQueue } from './queue';
import { transport } from '../websocket/transport';
import { SESSION_TIMEOUT } from '../../config';
import { SessionMode, PendingSessionRequest } from '../../types/session';
import { SessionError, ErrorCodes } from '../utils/errors';

export class SessionManager {
  private static instance: SessionManager;
  private activeSessions: Map<WebSocket, SessionContext> = new Map();
  private sessionById: Map<string, SessionContext> = new Map();

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public createSession(ws: WebSocket, request: PendingSessionRequest): SessionContext {
    if (this.activeSessions.has(ws)) {
      const existing = this.activeSessions.get(ws)!;
      logger.warn(`WebSocket连接已存在会话，ID: ${existing.id}`);
      return existing;
    }

    const timeout = parseInt(process.env.SESSION_TIMEOUT || '300', 10);
    const session = new SessionContextBuilder()
      .setId(request.id)
      .setWebSocket(ws)
      .setRequest(request)
      .setStartTime(request.createdAt)
      .setTimeout(timeout)
      .setMode(request.mode)
      .build();

    // 设置超时处理
    session.timeoutId = setTimeout(() => {
      this.handleTimeout(session);
    }, SESSION_TIMEOUT * 1000);

    // 存储会话
    this.activeSessions.set(ws, session);
    this.sessionById.set(session.id, session);

    logger.info(
      `会话已创建，ID: ${session.id}，模式: ${session.mode}，活跃会话数: ${this.activeSessions.size}`
    );

    // 发送会话初始化信息
    this.initializeSession(session);

    return session;
  }

  private initializeSession(session: SessionContext): void {
    // 发送摘要信息
    transport.send(session.ws, {
      type: 'summary',
      data: session.request.summary
    });

    // 发送系统信息
    transport.sendSystemInfo(
      session.ws,
      session.id,
      session.request.projectDirectory || process.cwd(),
      session.startTime,
      session.timeout,
      session.mode
    );
  }

  public endSession(ws: WebSocket): void {
    const session = this.activeSessions.get(ws);
    if (!session) {
      logger.warn('尝试结束不存在的会话');
      return;
    }

    this.cleanup(session);
    logger.info(
      `会话已结束，ID: ${session.id}，剩余活跃会话: ${this.activeSessions.size}`
    );
  }

  public endSessionById(sessionId: string): void {
    const session = this.sessionById.get(sessionId);
    if (!session) {
      logger.warn(`尝试结束不存在的会话，ID: ${sessionId}`);
      return;
    }

    this.cleanup(session);
  }

  private cleanup(session: SessionContext): void {
    // 清理超时定时器
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
      session.timeoutId = null;
    }

    // 从映射中移除
    this.activeSessions.delete(session.ws);
    this.sessionById.delete(session.id);
  }

  private handleTimeout(session: SessionContext): void {
    logger.warn(`会话超时，ID: ${session.id}`);

    // 发送超时通知
    transport.send(session.ws, {
      type: 'timeout',
      data: { message: '会话因长时间未活动已超时' }
    });

    transport.send(session.ws, {
      type: 'stop_timer'
    });

    // 解析会话Promise，返回超时标识
    session.request.resolve({
      text: '__SESSION_TIMEOUT__',
      imageData: []
    });

    // 确认队列中的请求
    sessionQueue.acknowledge(session.request.id);

    // 清理会话
    this.cleanup(session);
  }

  public handleDisconnection(ws: WebSocket): void {
    const session = this.activeSessions.get(ws);
    if (!session) {
      return;
    }

    logger.info(`客户端断开连接，会话ID: ${session.id}`);

    // 将请求重新入队
    sessionQueue.requeue(session.request.id, new Error('WebSocket连接在反馈完成前关闭'));

    // 清理会话
    this.cleanup(session);

    // 通知生命周期管理器检查空闲状态
    const { lifecycleManager } = require('../core/lifecycle');
    lifecycleManager.checkAndStopIfIdle();
  }

  public getSessionByWs(ws: WebSocket): SessionContext | undefined {
    return this.activeSessions.get(ws);
  }

  public getSessionById(sessionId: string): SessionContext | undefined {
    return this.sessionById.get(sessionId);
  }

  public hasSession(ws: WebSocket): boolean {
    return this.activeSessions.has(ws);
  }

  public getSessionCount(): number {
    return this.activeSessions.size;
  }

  public getSessionStats(sessionId: string): SessionStats | null {
    const session = this.sessionById.get(sessionId);
    if (!session) {
      return null;
    }

    const now = Date.now();
    const elapsedTime = now - session.startTime;
    const remainingTime = Math.max(0, (session.timeout * 1000) - elapsedTime);

    return {
      id: session.id,
      startTime: session.startTime,
      elapsedTime,
      remainingTime: Math.floor(remainingTime / 1000),
      mode: session.mode,
      projectDirectory: session.request.projectDirectory
    };
  }

  public getAllSessions(): SessionContext[] {
    return Array.from(this.activeSessions.values());
  }

  public clearAll(): void {
    logger.info(`清理所有会话 (${this.activeSessions.size}个)`);

    for (const session of this.activeSessions.values()) {
      // 清理超时定时器
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }

      // 拒绝未完成的请求
      session.request.reject(new SessionError(
        '服务器正在关闭',
        ErrorCodes.SERVER_STOP_ERROR
      ));
    }

    this.activeSessions.clear();
    this.sessionById.clear();
  }

  public extendSession(sessionId: string, additionalTime: number): boolean {
    const session = this.sessionById.get(sessionId);
    if (!session) {
      return false;
    }

    // 清除当前超时定时器
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // 设置新的超时定时器
    session.timeoutId = setTimeout(() => {
      this.handleTimeout(session);
    }, additionalTime * 1000);

    logger.info(`会话时间已延长，ID: ${sessionId}，延长时间: ${additionalTime}秒`);
    return true;
  }
}

export const sessionManager = SessionManager.getInstance();