/**
 * 可靠的会话请求队列模块
 * 支持租约、确认和超时自动重新入队机制，确保消息不会因客户端处理失败而丢失。
 */

import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { UserFeedback } from '../types/feedback';
import { SessionMode } from '../types/session';
import { SESSION_TIMEOUT } from '../config';
import { logger } from '../logger';
import { notificationStore } from './notificationStore';

/**
 * 定义待处理会话请求的结构，增加了唯一ID
 */
export interface PendingSessionRequest {
    id: string; // 每个请求的唯一标识符
    summary: string;
    projectDirectory: string;
    createdAt: number; // 消息创建时间戳
    resolve: (feedback: UserFeedback) => void;
    reject: (error: any) => void;
    ws?: WebSocket; // 关联的 WebSocket 连接
    mode: SessionMode; // 会话模式：交互或通知
}

/**
 * 正在处理中的请求的记录结构
 */
interface InFlightRequest {
    request: PendingSessionRequest;
    leaseTimestamp: number;
}

/**
 * 可靠的会话队列，实现了租约模式
 */
class ReliableSessionQueue {
    private waitingQueue: PendingSessionRequest[] = [];
    private inFlightRequests: Map<string, InFlightRequest> = new Map();

    /**
     * 将新请求加入等待队列
     * @param summary 会话摘要
     * @param projectDirectory 项目目录
     * @param mode 会话模式，默认为交互模式
     * @returns 返回Promise，解析为用户反馈
     */
    enqueue(summary: string, projectDirectory: string, mode: SessionMode = SessionMode.INTERACTIVE): Promise<UserFeedback> {
        return new Promise<UserFeedback>((resolve, reject) => {
            const id = randomUUID();
            const newRequest: PendingSessionRequest = {
                id,
                summary,
                projectDirectory,
                createdAt: Date.now(),
                resolve,
                reject,
                mode,
            };
            this.waitingQueue.push(newRequest);
            logger.debug(`新会话已入队，ID: ${id}，模式: ${mode}。等待队列长度: ${this.waitingQueue.length}`);
        });
    }

    /**
     * 专用的通知入队方法，立即返回成功状态
     * @param summary 通知摘要
     * @param projectDirectory 项目目录
     * @returns 立即返回成功的Promise
     */
    enqueueNotification(summary: string, projectDirectory: string): Promise<UserFeedback> {
        // 将通知添加到通知存储
        const notificationId = notificationStore.addNotification({
            summary,
            projectDirectory,
            createdAt: Date.now(),
        });

        logger.info(`通知已添加到存储，通知ID: ${notificationId}`);

        // 将通知请求加入队列，但不等待用户响应
        return this.enqueue(summary, projectDirectory, SessionMode.NOTIFICATION);
    }

    /**
     * 租用下一个等待中的请求进行处理
     * @returns 如果有等待的请求，则返回该请求；否则返回 null
     */
    leaseNext(): PendingSessionRequest | null {
        if (this.waitingQueue.length === 0) {
            return null;
        }
        const request = this.waitingQueue.shift()!;
        
        // 如果是通知模式，不设置超时，立即返回成功状态
        if (request.mode === SessionMode.NOTIFICATION) {
            // 通知模式不需要等待用户响应，立即解析
            setTimeout(() => {
                request.resolve({ text: '通知已发送' });
            }, 0);
            
            logger.debug(`通知模式会话已处理，ID: ${request.id}。等待中: ${this.waitingQueue.length}`);
            return request;
        }

        // 交互模式设置超时
        const leaseTimeout = SESSION_TIMEOUT * 1000;
        const timeoutId = setTimeout(() => {
            this.requeue(request.id, new Error(`会话处理超时 (>${SESSION_TIMEOUT}s)`));
        }, leaseTimeout);

        this.inFlightRequests.set(request.id, {
            request,
            leaseTimestamp: Date.now(),
        });

        logger.debug(`交互模式会话已租用，ID: ${request.id}。处理中: ${this.inFlightRequests.size}，等待中: ${this.waitingQueue.length}`);
        return request;
    }

    /**
     * 确认一个请求已成功处理，将其从系统中移除
     * @param id 要确认的请求ID
     * @returns 成功返回 true，否则 false
     */
    acknowledge(id: string): boolean {
        const inFlight = this.inFlightRequests.get(id);
        if (inFlight) {
            this.inFlightRequests.delete(id);
            logger.debug(`会话已成功确认，ID: ${id}。处理中: ${this.inFlightRequests.size}`);
            return true;
        }
        return false;
    }

    /**
     * 将一个处理失败或超时的请求重新放回等待队列的头部
     * @param id 要重新入队的请求ID
     * @param reason 失败原因
     */
    requeue(id: string, reason: Error): void {
        const inFlight = this.inFlightRequests.get(id);
        if (inFlight) {
            this.inFlightRequests.delete(id);
            this.waitingQueue.unshift(inFlight.request); // 放回队列头部，优先处理
            logger.warn(`会话已重新入队，ID: ${id}。原因: ${reason.message}。等待队列长度: ${this.waitingQueue.length}`);
            // 注意：我们不在这里调用 reject，因为请求将被重新尝试。
            // 只有当决定彻底放弃一个请求时才应该调用 reject。
        }
    }

    /**
     * 检查等待队列是否为空
     */
    isWaitingQueueEmpty(): boolean {
        return this.waitingQueue.length === 0;
    }

    /**
     * 获取等待队列的长度
     */
    waitingQueueSize(): number {
        return this.waitingQueue.length;
    }
}

// 导出单例队列实例
export const sessionQueue = new ReliableSessionQueue();
