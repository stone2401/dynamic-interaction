/**
 * 通知存储
 * 重构并移动到notifications目录
 */

import { logger } from '../../logger';

export interface Notification {
  id: string;
  summary: string;
  projectDirectory?: string;
  createdAt: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export class NotificationStore {
  private static instance: NotificationStore;
  private notifications: Map<string, Notification> = new Map();

  private constructor() {}

  public static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  public addNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
    logger.info(`通知已添加到存储，ID: ${notification.id}`);
  }

  public getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  public acknowledgeNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      logger.warn(`尝试确认不存在的通知，ID: ${id}`);
      return false;
    }

    notification.acknowledged = true;
    notification.acknowledgedAt = Date.now();
    
    logger.info(`通知已确认，ID: ${id}`);
    return true;
  }

  public removeNotification(id: string): boolean {
    const success = this.notifications.delete(id);
    if (success) {
      logger.info(`通知已从存储中移除，ID: ${id}`);
    }
    return success;
  }

  public getUnacknowledgedNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .filter(notification => !notification.acknowledged);
  }

  public getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  public getNotificationCount(): number {
    return this.notifications.size;
  }

  public getUnacknowledgedCount(): number {
    return this.getUnacknowledgedNotifications().length;
  }

  public clearOldNotifications(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (now - notification.createdAt > maxAge && notification.acknowledged) {
        this.notifications.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`已清理 ${removedCount} 个过期通知`);
    }

    return removedCount;
  }

  public clear(): void {
    const count = this.notifications.size;
    this.notifications.clear();
    logger.info(`通知存储已清空，清理了 ${count} 个通知`);
  }
}

export const notificationStore = NotificationStore.getInstance();