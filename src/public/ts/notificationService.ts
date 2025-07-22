/**
 * 通知服务模块
 * 封装 Web Notifications API 的核心功能
 */

// 通知配置接口
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

// 通知权限状态类型
type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * 通知服务类
 * 提供通知权限管理和通知显示功能
 */
class NotificationService {
  private static instance: NotificationService;
  private isSupported: boolean;

  /**
   * 构造函数
   * 检查浏览器是否支持通知功能
   */
  private constructor() {
    this.isSupported = 'Notification' in window;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 检查浏览器是否支持通知功能
   */
  public checkSupport(): boolean {
    return this.isSupported;
  }

  /**
   * 获取当前通知权限状态
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * 请求通知权限
   * @returns Promise<NotificationPermission> 权限状态
   */
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

  /**
   * 显示通知
   * @param options 通知选项
   * @returns 创建的通知对象或null
   */
  public showNotification(options: NotificationOptions): Notification | null {
    if (!this.isSupported) {
      console.warn('当前浏览器不支持通知功能');
      return null;
    }

    // 检查权限
    if (Notification.permission !== 'granted') {
      console.warn('通知权限未授予，无法显示通知');
      return null;
    }

    try {
      // 创建通知
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });

      // 设置点击事件处理
      notification.onclick = () => {
        // 聚焦到当前窗口
        window.focus();
        // 关闭通知
        notification.close();
      };

      // 设置通知自动关闭（10秒）
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('创建通知时出错:', error);
      return null;
    }
  }

  /**
   * 显示AI通知
   * @param summary 通知摘要内容
   */
  public showAINotification(summary: string): Notification | null {
    return this.showNotification({
      title: 'AI 通知',
      body: this.truncateText(summary, 100),
      icon: '/img/notification-icon.png',
      tag: 'ai-notification'
    });
  }

  /**
   * 显示会话请求通知
   * @param summary 会话请求摘要内容
   */
  public showSessionRequestNotification(summary: string): Notification | null {
    return this.showNotification({
      title: '会话请求',
      body: `您有一个新的交互会话请求: ${this.truncateText(summary, 80)}`,
      icon: '/img/session-icon.png',
      tag: 'session-request',
      requireInteraction: true
    });
  }

  /**
   * 截断文本，确保通知内容不会过长
   * @param text 原始文本
   * @param maxLength 最大长度
   * @returns 截断后的文本
   */
  private truncateText(text: string, maxLength: number): string {
    // 移除Markdown标记
    const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1')  // 移除粗体
                          .replace(/\*(.*?)\*/g, '$1')      // 移除斜体
                          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接
                          .replace(/#{1,6}\s+/g, '')        // 移除标题
                          .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1'); // 移除代码块

    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength) + '...';
  }
}

// 导出单例实例
export const notificationService = NotificationService.getInstance();
