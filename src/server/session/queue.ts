/**
 * 会话队列管理
 * 重构并简化原有的sessionQueue.ts
 */

import { logger } from '../../logger';
import { SessionMode, PendingSessionRequest } from '../../types/session';
import { SessionError, ErrorCodes } from '../utils/errors';

export class SessionQueue {
  private static instance: SessionQueue;
  private pendingRequests: Map<string, PendingSessionRequest> = new Map();
  private waitingQueue: PendingSessionRequest[] = [];

  private constructor() {}

  public static getInstance(): SessionQueue {
    if (!SessionQueue.instance) {
      SessionQueue.instance = new SessionQueue();
    }
    return SessionQueue.instance;
  }

  public enqueue(request: PendingSessionRequest): void {
    this.pendingRequests.set(request.id, request);
    this.waitingQueue.push(request);
    
    logger.info(
      `会话请求已入队，ID: ${request.id}，模式: ${request.mode}，队列长度: ${this.waitingQueue.length}`
    );
  }

  public dequeue(): PendingSessionRequest | null {
    const request = this.waitingQueue.shift();
    if (request) {
      logger.info(`会话请求已出队，ID: ${request.id}`);
    }
    return request || null;
  }

  public leaseNext(): PendingSessionRequest | null {
    const request = this.dequeue();
    if (request) {
      logger.info(`租用会话请求，ID: ${request.id}`);
    }
    return request;
  }

  public acknowledge(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      logger.warn(`尝试确认不存在的会话请求，ID: ${requestId}`);
      return false;
    }

    this.pendingRequests.delete(requestId);
    logger.info(`会话请求已确认完成，ID: ${requestId}`);
    return true;
  }

  public requeue(requestId: string, error: Error): void {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      logger.warn(`尝试重新入队不存在的会话请求，ID: ${requestId}`);
      return;
    }

    // 增加重试计数
    request.retryCount = (request.retryCount || 0) + 1;
    
    // 如果重试次数过多，拒绝请求
    if (request.retryCount > 3) {
      logger.error(`会话请求重试次数过多，放弃处理，ID: ${requestId}`);
      request.reject(new SessionError(
        '会话请求处理失败，重试次数过多',
        ErrorCodes.SESSION_CREATION_ERROR
      ));
      this.pendingRequests.delete(requestId);
      return;
    }

    // 重新入队
    this.waitingQueue.unshift(request);
    logger.info(`会话请求已重新入队，ID: ${requestId}，重试次数: ${request.retryCount}`);
  }

  public remove(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return false;
    }

    // 从等待队列中移除
    const index = this.waitingQueue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }

    // 从pending映射中移除
    this.pendingRequests.delete(requestId);
    
    logger.info(`会话请求已从队列中移除，ID: ${requestId}`);
    return true;
  }

  public getRequest(requestId: string): PendingSessionRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public getQueueSize(): number {
    return this.waitingQueue.length;
  }

  public getPendingCount(): number {
    return this.pendingRequests.size;
  }

  public isWaitingQueueEmpty(): boolean {
    return this.waitingQueue.length === 0;
  }

  public getQueueStats() {
    const modeStats = new Map<SessionMode, number>();
    
    for (const request of this.waitingQueue) {
      const count = modeStats.get(request.mode) || 0;
      modeStats.set(request.mode, count + 1);
    }

    return {
      total: this.waitingQueue.length,
      pending: this.pendingRequests.size,
      byMode: Object.fromEntries(modeStats)
    };
  }

  public clear(): void {
    // 拒绝所有待处理的请求
    for (const request of this.pendingRequests.values()) {
      request.reject(new SessionError(
        '服务器正在关闭',
        ErrorCodes.SERVER_STOP_ERROR
      ));
    }

    this.pendingRequests.clear();
    this.waitingQueue.length = 0;
    
    logger.info('会话队列已清空');
  }
}

export const sessionQueue = SessionQueue.getInstance();