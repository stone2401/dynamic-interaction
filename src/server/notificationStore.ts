/**
 * 通知状态管理模块
 * 负责管理通知历史记录，提供通知的添加、查询和清理功能
 */

import { logger } from '../logger';

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  id: string;
  summary: string;
  projectDirectory: string;
  createdAt: number;
  acknowledged?: boolean; // 是否已被确认查看
}

/**
 * 通知存储配置
 */
interface NotificationStoreConfig {
  maxNotifications: number; // 最大存储通知数量
  maxAge: number; // 通知最大保存时间（毫秒）
  cleanupInterval: number; // 清理检查间隔（毫秒）
}

/**
 * 通知状态管理类
 * 使用内存存储，支持自动清理过期通知
 */
export class NotificationStore {
  private notifications: NotificationMessage[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private config: NotificationStoreConfig;

  constructor(config: Partial<NotificationStoreConfig> = {}) {
    this.config = {
      maxNotifications: config.maxNotifications || 50,
      maxAge: config.maxAge || 24 * 60 * 60 * 1000, // 默认24小时
      cleanupInterval: config.cleanupInterval || 60 * 60 * 1000, // 默认1小时清理一次
    };

    // 启动自动清理定时器
    this.startCleanupTimer();
    logger.info(`通知存储已初始化，最大存储${this.config.maxNotifications}条通知，保存${this.config.maxAge / 1000 / 60 / 60}小时`);
  }

  /**
   * 添加新通知
   * @param notification 通知消息（不包含id，会自动生成）
   * @returns 生成的通知ID
   */
  addNotification(notification: Omit<NotificationMessage, 'id'>): string {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationMessage = {
      ...notification,
      id,
    };

    this.notifications.unshift(newNotification); // 添加到开头，保持最新的在前面
    
    // 如果超过最大数量，移除最旧的通知
    if (this.notifications.length > this.config.maxNotifications) {
      const removed = this.notifications.splice(this.config.maxNotifications);
      logger.debug(`通知存储已满，移除${removed.length}条旧通知`);
    }

    logger.debug(`新通知已添加，ID: ${id}，当前存储${this.notifications.length}条通知`);
    return id;
  }

  /**
   * 获取最新的通知列表
   * @param limit 返回的最大数量，默认10
   * @param acknowledgedOnly 是否只返回已确认的通知，默认false
   * @returns 通知列表，按创建时间倒序排列
   */
  getLatestNotifications(limit: number = 10, acknowledgedOnly: boolean = false): NotificationMessage[] {
    let filteredNotifications = this.notifications;
    
    if (acknowledgedOnly) {
      filteredNotifications = this.notifications.filter(n => n.acknowledged);
    }

    return filteredNotifications.slice(0, limit);
  }

  /**
   * 根据ID获取特定通知
   * @param id 通知ID
   * @returns 通知消息或undefined
   */
  getNotificationById(id: string): NotificationMessage | undefined {
    return this.notifications.find(n => n.id === id);
  }

  /**
   * 标记通知为已确认
   * @param id 通知ID
   * @returns 是否成功标记
   */
  acknowledgeNotification(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.acknowledged = true;
      logger.debug(`通知已标记为已确认，ID: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * 清理过期通知
   * @returns 清理的通知数量
   */
  clearOldNotifications(): number {
    const now = Date.now();
    const initialCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(notification => {
      const age = now - notification.createdAt;
      return age < this.config.maxAge;
    });

    const removedCount = initialCount - this.notifications.length;
    if (removedCount > 0) {
      logger.info(`已清理${removedCount}条过期通知，剩余${this.notifications.length}条`);
    }

    return removedCount;
  }

  /**
   * 获取存储统计信息
   */
  getStats(): {
    total: number;
    acknowledged: number;
    unacknowledged: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const acknowledged = this.notifications.filter(n => n.acknowledged).length;
    const timestamps = this.notifications.map(n => n.createdAt);
    
    return {
      total: this.notifications.length,
      acknowledged,
      unacknowledged: this.notifications.length - acknowledged,
      oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * 启动自动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearOldNotifications();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止自动清理定时器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    logger.info('通知存储已销毁');
  }
}

// 导出单例实例
export const notificationStore = new NotificationStore();
