/**
 * 服务器生命周期管理
 * 负责管理服务器的启动、停止和状态
 */

import { Server } from 'http';
import { logger } from '../../logger';
import { httpServer } from './server';
import { webSocketManager } from '../websocket/connection';
import { sessionManager } from '../session/manager';
import { sessionQueue } from '../session/queue';
import { ServerState } from '../utils/types';
import { ServerError, ErrorCodes } from '../utils/errors';

export class LifecycleManager {
  private static instance: LifecycleManager;
  private _state: ServerState = ServerState.STOPPED;
  private _shutdownTimer: NodeJS.Timeout | null = null;
  private _shutdownDelayMs: number = 5000;
  private _startTime: number = 0;

  private constructor() {}

  public static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager();
    }
    return LifecycleManager.instance;
  }

  get state(): ServerState {
    return this._state;
  }

  get uptime(): number {
    return this._startTime > 0 ? Date.now() - this._startTime : 0;
  }

  public async startServer(): Promise<void> {
    if (this._state === ServerState.RUNNING || this._state === ServerState.STARTING) {
      logger.info('服务器已经在运行或正在启动中');
      return;
    }

    this._state = ServerState.STARTING;
    logger.info('正在启动服务器...');

    // 取消任何可能存在的关闭定时器
    this.cancelShutdownTimer();

    try {
      // 启动HTTP服务器
      await httpServer.start();
      
      // 初始化WebSocket服务器
      webSocketManager.initialize(httpServer.getServer());

      this._state = ServerState.RUNNING;
      this._startTime = Date.now();
      logger.info('服务器启动完成');

    } catch (error) {
      this._state = ServerState.STOPPED;
      logger.error('服务器启动失败:', error);
      throw new ServerError(
        '服务器启动失败',
        ErrorCodes.SERVER_START_ERROR
      );
    }
  }

  public async stopServer(immediate: boolean = false): Promise<void> {
    if (this._state === ServerState.STOPPED || this._state === ServerState.STOPPING) {
      logger.info('服务器已经停止或正在停止中');
      return;
    }

    // 检查是否还有活跃的连接或会话
    if (!immediate && this.hasActiveActivity()) {
      const stats = this.getServerStats();
      logger.info(
        `仍有活跃连接 (${stats.activeConnections}) 或会话 (${stats.activeSessions})，暂不关闭服务器`
      );
      return;
    }

    // 延迟关闭逻辑
    if (!immediate && this._shutdownDelayMs > 0) {
      this.scheduleShutdown();
      return;
    }

    // 立即关闭
    await this.performShutdown();
  }

  private scheduleShutdown(): void {
    logger.info(`计划在 ${this._shutdownDelayMs}ms 后关闭服务器`);
    
    this.cancelShutdownTimer();
    this._state = ServerState.STOPPING;

    this._shutdownTimer = setTimeout(() => {
      this.performShutdown().catch(error => {
        logger.error('定时关闭服务器失败:', error);
      });
    }, this._shutdownDelayMs);
  }

  private async performShutdown(): Promise<void> {
    logger.info('正在关闭服务器...');
    this._state = ServerState.STOPPING;

    try {
      // 关闭WebSocket连接
      webSocketManager.closeAll();

      // 清理会话
      sessionManager.clearAll();

      // 关闭HTTP服务器
      await httpServer.stop();

      this._state = ServerState.STOPPED;
      this._startTime = 0;
      logger.info('服务器已成功关闭');

    } catch (error) {
      logger.error('关闭服务器时出错:', error);
      throw new ServerError(
        '服务器关闭失败',
        ErrorCodes.SERVER_STOP_ERROR
      );
    }
  }

  private cancelShutdownTimer(): void {
    if (this._shutdownTimer) {
      clearTimeout(this._shutdownTimer);
      this._shutdownTimer = null;
      logger.info('取消了计划中的服务器关闭');
    }
  }

  private hasActiveActivity(): boolean {
    const stats = this.getServerStats();
    return stats.activeConnections > 0 || 
           stats.activeSessions > 0 || 
           stats.queuedRequests > 0;
  }

  public checkAndStopIfIdle(): void {
    if (this._state === ServerState.RUNNING && !this.hasActiveActivity()) {
      logger.info('没有活跃的连接和会话，准备关闭服务器');
      this.stopServer();
    }
  }

  public getServerStats() {
    return {
      activeConnections: webSocketManager.getConnectionCount(),
      activeSessions: sessionManager.getSessionCount(),
      queuedRequests: sessionQueue.getQueueSize(),
      uptime: this.uptime
    };
  }

  public setShutdownDelay(delayMs: number): void {
    this._shutdownDelayMs = delayMs;
  }
}

export const lifecycleManager = LifecycleManager.getInstance();