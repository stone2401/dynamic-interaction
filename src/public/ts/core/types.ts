/**
 * 全局类型声明
 */

/**
 * WebSocket 消息类型
 */
export interface WebSocketMessage {
  type: string;
  data?: any;
}

/**
 * 命令结果消息
 */
export interface CommandResultMessage extends WebSocketMessage {
  type: 'command_result';
  data: string;
}

/**
 * 摘要消息
 */
export interface SummaryMessage extends WebSocketMessage {
  type: 'summary';
  data: string;
}

/**
 * 服务器日志消息
 */
export interface ServerLogMessage extends WebSocketMessage {
  type: 'server_log';
  data: {
    level: 'log' | 'info' | 'warn' | 'error';
    text: string;
  };
}

/**
 * 会话信息消息
 */
export interface SessionInfoMessage extends WebSocketMessage {
  type: 'session_info';
  data: {
    sessionId: string;
    timeout: number;
  };
}

/**
 * 自定义图片数据接口
 */
export interface CustomImageData {
  name: string;
  data?: string;
  id?: string;
  dataUrl?: string;
}

/**
 * 反馈数据接口
 */
export interface FeedbackData {
  text: string;
  imageData: CustomImageData[];
}

/**
 * 系统信息接口
 */
export interface SystemInfo {
  workspaceDirectory: string;
  sessionId: string;
  serverVersion?: string;
  leaseTimeoutSeconds?: number;
  sessionStartTime?: number;
}

/**
 * 消息状态类型
 */
export type MessageStatus = 'idle' | 'sending' | 'waiting' | 'received' | 'timeout';

/**
 * 连接状态类型
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'high-latency';

/**
 * 通知权限状态类型
 */
export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * 通知配置接口
 */
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}