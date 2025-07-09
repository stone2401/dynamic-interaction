/**
 * 会话管理器模块
 * 负责管理活动的 WebSocket 会话，包括生命周期和空闲超时。
 */

/**
 * 会话管理器模块
 * 负责管理活动的 WebSocket 会话状态。
 */

import { WebSocket } from 'ws';
import { logger } from '../logger';
import { sessionQueue } from './sessionQueue';
import { SESSION_TIMEOUT } from '../config';
import { serverStateManager } from './serverState';
import { SessionContext, PendingSessionRequest } from '../types/session';

class SessionManager {
  private static instance: SessionManager;
  private activeSessions: Map<WebSocket, SessionContext> = new Map();

  private constructor() { }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 启动一个新会话，创建会话上下文并设置超时。
   */
  public startSession(ws: WebSocket, request: PendingSessionRequest): SessionContext {
    if (this.activeSessions.has(ws)) {
      logger.warn(`此 WebSocket 连接 (${request.id}) 已存在一个活动会话。`);
      return this.activeSessions.get(ws)!;
    }

    const session: SessionContext = {
      id: request.id,
      ws: ws,
      request: request,
      timeoutId: null, // 初始化时没有超时计时器
      startTime: request.createdAt, // 使用消息创建时间作为会话开始时间
      timeout: parseInt(process.env.SESSION_TIMEOUT || '300', 10), // 存储总超时时长
    };

    session.timeoutId = setTimeout(() => this.onTimeout(session), SESSION_TIMEOUT * 1000);
    this.activeSessions.set(ws, session);

    logger.info(`会话 ${session.id} 已启动。当前活跃会话数: ${this.getSessionCount()}`);

    // 发送初始信息
    ws.send(JSON.stringify({ type: 'summary', data: request.summary }));
    this.sendSystemInfo(session);

    return session;
  }

  /**
   * 结束一个会话，清理资源。
   */

  public endSession(ws: WebSocket): void {
    const session = this.activeSessions.get(ws);
    if (session) {
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
        session.timeoutId = null;
      }
      this.activeSessions.delete(ws);
      logger.info(`会话 ${session.id} 已结束。剩余活动会话: ${this.getSessionCount()}`);
    }
  }

  /**
   * 处理 WebSocket 连接断开的情况。
   */
  public handleDisconnection(ws: WebSocket): void {
    const session = this.activeSessions.get(ws);
    if (session) {
      logger.info(`客户端断开连接 (会话 ID: ${session.id})`);
      // 将会话请求重新放入队列，以便其他客户端可以接管
      sessionQueue.requeue(session.request.id, new Error('WebSocket 连接在反馈完成前关闭。'));
      this.endSession(ws);
    }
    // 检查是否应该关闭服务器
    serverStateManager.checkAndStopIfIdle();
  }

  /**
   * 会话超时处理逻辑。
   */
  private onTimeout(session: SessionContext): void {
    logger.warn(`会话 ${session.id} 因不活动而超时。`);
    session.ws.send(JSON.stringify({ type: 'timeout', data: '会话因长时间未活动已超时。' }));
    session.ws.send(JSON.stringify({ type: 'stop_timer' }));

    // 返回默认超时反馈
    session.request.resolve({
      text: '__SESSION_TIMEOUT__',
      imageData: [],
    });
    sessionQueue.acknowledge(session.request.id);
    this.endSession(session.ws);
  }

  /**
   * 发送系统信息。
   */
  private sendSystemInfo(session: SessionContext): void {
    const projectRoot = process.cwd();
    session.ws.send(JSON.stringify({
      type: 'system_info',
      data: {
        workspaceDirectory: session.request.projectDirectory || projectRoot,
        sessionId: session.id,
        serverVersion: process.env.npm_package_version || '1.0.0',
        sessionStartTime: session.startTime,
      leaseTimeoutSeconds: session.timeout ?? SESSION_TIMEOUT,
      },
    }));
  }

  public getSessionByWs(ws: WebSocket): SessionContext | undefined {
    return this.activeSessions.get(ws);
  }

  /**
   * 获取会话的剩余超时时间（秒）
   * @param session 会话上下文
   * @returns 剩余的秒数，如果会话无效则返回 0
   */
  public getSessionRemainingTime(session: SessionContext): number {
    if (!session || !session.startTime) {
      return 0;
    }

    const elapsedTime = Date.now() - session.startTime;
    const remainingTime = (SESSION_TIMEOUT * 1000) - elapsedTime;

    return Math.max(0, Math.floor(remainingTime / 1000));
  }

  public hasSession(ws: WebSocket): boolean {
    return this.activeSessions.has(ws);
  }

  public getSessionCount(): number {
    return this.activeSessions.size;
  }
}

export const sessionManager = SessionManager.getInstance();

