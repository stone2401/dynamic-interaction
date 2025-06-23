/**
 * 全局类型声明
 */

/**
 * WebSocket 消息类型
 */
interface WebSocketMessage {
  type: string;
  data?: any;
}

/**
 * 命令结果消息
 */
interface CommandResultMessage extends WebSocketMessage {
  type: 'command_result';
  data: string;
}

/**
 * 摘要消息
 */
interface SummaryMessage extends WebSocketMessage {
  type: 'summary';
  data: string;
}

/**
 * 服务器日志消息
 */
interface ServerLogMessage extends WebSocketMessage {
  type: 'server_log';
  data: {
    level: 'log' | 'info' | 'warn' | 'error';
    text: string;
  };
}

/**
 * 会话信息消息
 */
interface SessionInfoMessage extends WebSocketMessage {
  type: 'session_info';
  data: {
    sessionId: string;
    timeout: number;
  };
}

/**
 * 自定义图片数据接口
 */
interface CustomImageData {
  name: string;
  data?: string; // base64 编码的图片数据
  id?: string;
  dataUrl?: string;
}

/**
 * 反馈数据接口
 */
interface FeedbackData {
  text: string;
  imageData: CustomImageData[];
}
