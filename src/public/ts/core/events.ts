/**
 * 事件系统
 * 提供应用内组件间通信的事件总线
 */

type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  /**
   * 取消订阅事件
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * 触发事件
   */
  emit<T = any>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * 一次性事件订阅
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (data) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

// 定义应用事件类型
export const APP_EVENTS = {
  // WebSocket 事件
  WS_CONNECTED: 'ws:connected',
  WS_DISCONNECTED: 'ws:disconnected',
  WS_MESSAGE_RECEIVED: 'ws:message_received',
  
  // 反馈事件
  FEEDBACK_SEND: 'feedback:send',
  FEEDBACK_SUCCESS: 'feedback:success',
  FEEDBACK_ERROR: 'feedback:error',
  
  // 通知事件
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_CLOSE: 'notification:close',
  
  // 页面可见性事件
  PAGE_VISIBILITY_CHANGED: 'page:visibility_changed',
  
  // 主题事件
  THEME_CHANGED: 'theme:changed',
  
  // 语言事件
  LANGUAGE_CHANGED: 'language:changed',
  
  // 状态事件
  STATUS_CHANGED: 'status:changed',
} as const;