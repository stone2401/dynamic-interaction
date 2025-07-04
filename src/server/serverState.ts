/**
 * 服务器状态管理模块
 * 负责管理HTTP服务器的生命周期状态
 */

import { Server } from 'http';
import { logger } from '../logger';
import { server } from './express';
import { connectionManager, initializeWebSocketServer } from './websocket';
import { sessionManager } from './sessionManager';
import { PORT } from '../config';
import { sessionQueue } from './sessionQueue';

// 服务器状态
export enum ServerState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping'
}

// 服务器状态管理器
class ServerStateManager {
  private static instance: ServerStateManager;
  private _state: ServerState = ServerState.STOPPED;
  private _server: Server | null = null;
  private _shutdownTimer: NodeJS.Timeout | null = null;
  private _shutdownDelayMs: number = 5000; // 延迟关闭时间，默认5秒

  private constructor() { }

  public static getInstance(): ServerStateManager {
    if (!ServerStateManager.instance) {
      ServerStateManager.instance = new ServerStateManager();
    }
    return ServerStateManager.instance;
  }

  /**
   * 获取当前服务器状态
   */
  get state(): ServerState {
    return this._state;
  }

  /**
   * 获取HTTP服务器实例
   */
  get httpServer(): Server | null {
    return this._server;
  }

  /**
   * 设置HTTP服务器实例
   */
  set httpServer(server: Server | null) {
    this._server = server;
  }

  /**
   * 启动HTTP服务器
   * @returns Promise<void>
   */
  async startServer(): Promise<void> {
    if (this._state === ServerState.RUNNING || this._state === ServerState.STARTING) {
      logger.info('HTTP服务器已经在运行或正在启动中');
      return;
    }

    this._state = ServerState.STARTING;
    logger.info('正在启动HTTP服务器...');

    // 取消任何可能存在的关闭定时器
    if (this._shutdownTimer) {
      clearTimeout(this._shutdownTimer);
      this._shutdownTimer = null;
      logger.info('取消了计划中的服务器关闭');
    }

    return new Promise<void>((resolve, reject) => {
      server.listen(PORT, () => {
        this._state = ServerState.RUNNING;
        this._server = server;
        logger.info(`HTTP服务器已启动，监听地址: http://localhost:${PORT}`);

        // 将WebSocket服务器附加到HTTP服务器
        initializeWebSocketServer(server);

        resolve();
      });

      server.on('error', (error) => {
        this._state = ServerState.STOPPED;
        logger.error('启动HTTP服务器失败:', error);
        reject(error);
      });
    });
  }

  /**
   * 停止HTTP服务器
   * @param immediate 是否立即停止，不等待延迟
   * @returns Promise<void>
   */
  async stopServer(immediate: boolean = false): Promise<void> {
    // 如果服务器未运行，则无需操作
    if (this._state === ServerState.STOPPED || this._state === ServerState.STOPPING) {
      logger.info('HTTP服务器已经停止或正在停止中');
      return;
    }

    // 如果还有活跃的WebSocket连接或会话，则不关闭服务器
    const activeConnections = connectionManager.getActiveConnectionCount();
    const activeSessions = sessionManager.getSessionCount();
    const waitingQueueEmpty = sessionQueue.isWaitingQueueEmpty();

    if (!immediate && (activeConnections > 0 || activeSessions > 0 || !waitingQueueEmpty)) {
      logger.info(`仍有 ${activeConnections} 个活跃的WebSocket连接和 ${activeSessions} 个活跃会话，暂不关闭服务器`);
      return;
    }

    // 如果设置了延迟关闭且不是立即关闭
    if (!immediate && this._shutdownDelayMs > 0) {
      logger.info(`计划在 ${this._shutdownDelayMs}ms 后关闭HTTP服务器`);

      // 清除任何现有的关闭定时器
      if (this._shutdownTimer) {
        clearTimeout(this._shutdownTimer);
      }

      this._state = ServerState.STOPPING;

      // 设置新的关闭定时器
      this._shutdownTimer = setTimeout(() => {
        this._actuallyStopServer();
      }, this._shutdownDelayMs);

      return;
    }

    // 立即关闭
    return this._actuallyStopServer();
  }

  /**
   * 实际执行服务器关闭操作
   * @private
   */
  private async _actuallyStopServer(): Promise<void> {
    if (!this._server) {
      this._state = ServerState.STOPPED;
      return;
    }

    logger.info('正在关闭HTTP服务器...');
    this._state = ServerState.STOPPING;

    return new Promise<void>((resolve, reject) => {
      if (!this._server) {
        this._state = ServerState.STOPPED;
        resolve();
        return;
      }

      this._server.close((err) => {
        if (err) {
          logger.error('关闭HTTP服务器时出错:', err);
          reject(err);
          return;
        }

        logger.info('HTTP服务器已成功关闭');
        this._state = ServerState.STOPPED;
        this._server = null;
        resolve();
      });
    });
  }

  /**
   * 检查WebSocket连接状态，如果没有活跃连接和会话则关闭服务器
   */
  checkAndStopIfIdle(): void {
    const activeConnections = connectionManager.getActiveConnectionCount();
    const activeSessions = sessionManager.getSessionCount();
    const waitingQueueEmpty = sessionQueue.isWaitingQueueEmpty();

    if (this._state === ServerState.RUNNING && activeConnections === 0 && activeSessions === 0 && waitingQueueEmpty) {
      logger.info('没有活跃的WebSocket连接和会话，准备关闭HTTP服务器');
      this.stopServer();
    } else if (activeConnections === 0 && activeSessions > 0 && waitingQueueEmpty) {
      logger.info(`没有活跃的WebSocket连接，但仍有 ${activeSessions} 个活跃会话，暂不关闭服务器,等待队列为空`);
    }
  }

  /**
   * 设置服务器关闭延迟时间
   * @param delayMs 延迟毫秒数
   */
  setShutdownDelay(delayMs: number): void {
    this._shutdownDelayMs = delayMs;
  }
}

// 导出单例实例
export const serverStateManager = ServerStateManager.getInstance();
