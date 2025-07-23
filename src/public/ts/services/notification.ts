/**
 * 通知服务模块
 * 封装 Web Notifications API 的核心功能
 */

import type { NotificationOptions, NotificationPermission } from '../core/types.js';
import { NOTIFICATION_CONFIG } from '../config/constants.js';
import { truncateText } from '../utils/helpers.js';
import { eventBus, APP_EVENTS } from '../core/events.js';

/**
 * 通知服务类
 * 提供通知权限管理和通知显示功能
 */
class NotificationService {
  private static instance: NotificationService;
  private isSupported: boolean;

  private constructor() {
    this.isSupported = 'Notification' in window;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('当前浏览器不支持通知功能');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('请求通知权限时出错:', error);
      return 'denied';
    }
  }

  public showNotification(options: NotificationOptions): Notification | null {
    if (!this.isSupported) {
      console.warn('当前浏览器不支持通知功能');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('通知权限未授予，无法显示通知');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        eventBus.emit(APP_EVENTS.NOTIFICATION_CLOSE, { tag: options.tag });
      };

      setTimeout(() => {
        notification.close();
      }, NOTIFICATION_CONFIG.AUTO_CLOSE_DELAY);

      eventBus.emit(APP_EVENTS.NOTIFICATION_SHOW, options);
      return notification;
    } catch (error) {
      console.error('创建通知时出错:', error);
      return null;
    }
  }

  public showAINotification(summary: string): Notification | null {
    return this.showNotification({
      title: 'AI 通知',
      body: truncateText(summary, NOTIFICATION_CONFIG.MAX_TEXT_LENGTH),
      icon: '/img/notification-icon.png',
      tag: 'ai-notification'
    });
  }

  public showSessionRequestNotification(summary: string): Notification | null {
    return this.showNotification({
      title: '会话请求',
      body: `您有一个新的交互会话请求: ${truncateText(summary, NOTIFICATION_CONFIG.MAX_SUMMARY_LENGTH)}`,
      icon: '/img/session-icon.png',
      tag: 'session-request',
      requireInteraction: true
    });
  }
}

export const notificationService = NotificationService.getInstance();