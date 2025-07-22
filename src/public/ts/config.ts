/**
 * 配置模块
 * 提供应用全局配置参数
 */

// 通知配置
export const NotificationConfig = {
  // 通知图标
  icons: {
    default: '/favicon.ico',
    notification: '/img/notification-icon.png',
    session: '/img/session-icon.png'
  },

  // 通知显示时间（毫秒）
  displayTime: 10000,

  // 通知内容最大长度
  maxBodyLength: {
    notification: 100,
    session: 80
  },

  // 通知标题
  titles: {
    notification: 'AI 通知',
    session: '会话请求'
  },

  // 通知设置
  options: {
    notification: {
      requireInteraction: false,
      silent: false
    },
    session: {
      requireInteraction: true,
      silent: false
    }
  }
};

// WebSocket配置
export const WebSocketConfig = {
  reconnectAttempts: 10,
  initialReconnectDelay: 2000,
  maxReconnectDelay: 10000
};

// 导出默认配置
export default {
  notification: NotificationConfig,
  websocket: WebSocketConfig
};
