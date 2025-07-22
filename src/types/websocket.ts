/**
 * WebSocket消息类型定义
 * 支持通知模式和交互模式的消息协议
 */

import { SessionMode } from './session';

/**
 * 基础WebSocket消息接口
 */
export interface BaseWebSocketMessage {
  type: string;
  data?: any;
  sessionId?: string;
  timestamp?: number;
}

/**
 * 客户端发送的消息类型
 */
export interface ClientMessage extends BaseWebSocketMessage {
  type: 'client_ready' | 'user_feedback' | 'submit_feedback' | 'ping' | 'session_acknowledge';
}

/**
 * 服务端发送的消息类型
 */
export interface ServerMessage extends BaseWebSocketMessage {
  type: 'session_request' | 'notification' | 'system_info' | 'error' | 'pong' | 'session_complete';
}

/**
 * 会话请求消息（交互模式）
 */
export interface SessionRequestMessage extends ServerMessage {
  type: 'session_request';
  data: {
    sessionId: string;
    summary: string;
    projectDirectory: string;
    mode: SessionMode.INTERACTIVE;
    startTime: number;
    timeoutSeconds: number;
  };
}

/**
 * 通知消息（通知模式）
 */
export interface NotificationMessage extends ServerMessage {
  type: 'notification';
  data: {
    notificationId: string;
    summary: string;
    projectDirectory: string;
    mode: SessionMode.NOTIFICATION;
    createdAt: number;
  };
}

/**
 * 系统信息消息
 */
export interface SystemInfoMessage extends ServerMessage {
  type: 'system_info';
  data: {
    sessionId: string;
    workspaceDirectory: string;
    sessionStartTime?: number;
    leaseTimeoutSeconds: number;
    mode?: SessionMode;
  };
}

/**
 * 用户反馈消息
 */
export interface UserFeedbackMessage extends ClientMessage {
  type: 'user_feedback' | 'submit_feedback';
  data: {
    sessionId: string;
    text?: string;
    imageData?: string | string[];
    commandOutput?: string;
  };
}

/**
 * 会话确认消息（用于通知模式）
 */
export interface SessionAcknowledgeMessage extends ClientMessage {
  type: 'session_acknowledge';
  data: {
    sessionId?: string;
    notificationId?: string;
  };
}

/**
 * 错误消息
 */
export interface ErrorMessage extends ServerMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
    sessionId?: string;
  };
}

/**
 * 会话完成消息
 */
export interface SessionCompleteMessage extends ServerMessage {
  type: 'session_complete';
  data: {
    sessionId: string;
    success: boolean;
    message?: string;
  };
}

/**
 * 消息类型联合类型
 */
export type WebSocketMessage = 
  | ClientMessage 
  | ServerMessage 
  | SessionRequestMessage 
  | NotificationMessage 
  | SystemInfoMessage 
  | UserFeedbackMessage 
  | SessionAcknowledgeMessage 
  | ErrorMessage 
  | SessionCompleteMessage;

/**
 * 消息验证函数
 */
export function isValidMessage(message: any): message is WebSocketMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    message.type.length > 0
  );
}

/**
 * 检查是否为通知消息
 */
export function isNotificationMessage(message: WebSocketMessage): message is NotificationMessage {
  return message.type === 'notification';
}

/**
 * 检查是否为会话请求消息
 */
export function isSessionRequestMessage(message: WebSocketMessage): message is SessionRequestMessage {
  return message.type === 'session_request';
}

/**
 * 检查是否为用户反馈消息
 */
export function isUserFeedbackMessage(message: WebSocketMessage): message is UserFeedbackMessage {
  return message.type === 'user_feedback';
}

/**
 * 创建通知消息的工厂函数
 */
export function createNotificationMessage(
  notificationId: string,
  summary: string,
  projectDirectory: string
): NotificationMessage {
  return {
    type: 'notification',
    data: {
      notificationId,
      summary,
      projectDirectory,
      mode: SessionMode.NOTIFICATION,
      createdAt: Date.now(),
    },
    timestamp: Date.now(),
  };
}

/**
 * 创建会话请求消息的工厂函数
 */
export function createSessionRequestMessage(
  sessionId: string,
  summary: string,
  projectDirectory: string,
  startTime: number,
  timeoutSeconds: number
): SessionRequestMessage {
  return {
    type: 'session_request',
    data: {
      sessionId,
      summary,
      projectDirectory,
      mode: SessionMode.INTERACTIVE,
      startTime,
      timeoutSeconds,
    },
    sessionId,
    timestamp: Date.now(),
  };
}

/**
 * 创建错误消息的工厂函数
 */
export function createErrorMessage(
  message: string,
  code?: string,
  sessionId?: string
): ErrorMessage {
  return {
    type: 'error',
    data: {
      message,
      code,
      sessionId,
    },
    sessionId,
    timestamp: Date.now(),
  };
}
