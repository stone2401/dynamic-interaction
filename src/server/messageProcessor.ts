/**
 * WebSocket消息处理模块
 * 处理通知模式和交互模式的不同消息类型
 */

import { WebSocket } from 'ws';
import { logger } from '../logger';
import { sessionManager } from './sessionManager';
import { sessionQueue, PendingSessionRequest } from './sessionQueue';
import { notificationStore } from './notificationStore';
import { SessionMode } from '../types/session';
import { 
  createNotificationMessage, 
  createSessionRequestMessage, 
  createErrorMessage,
  isValidMessage,
  WebSocketMessage 
} from '../types/websocket';

/**
 * 处理通知类型的会话请求
 * @param ws WebSocket连接
 * @param request 会话请求
 */
export function processNotificationRequest(ws: WebSocket, request: PendingSessionRequest): void {
  try {
    logger.info(`处理通知请求，ID: ${request.id}`);

    // 创建通知消息
    const notificationMessage = createNotificationMessage(
      request.id,
      request.summary,
      request.projectDirectory
    );

    // 发送通知消息到客户端
    ws.send(JSON.stringify(notificationMessage));
    
    // 记录通知发送日志
    logger.info(`通知消息已发送到客户端，通知ID: ${request.id}`);

    // 通知模式不需要等待用户响应，立即确认处理完成
    sessionQueue.acknowledge(request.id);
    
    // 解析Promise，返回成功状态
    request.resolve({ text: '通知已成功发送' });

  } catch (error) {
    logger.error(`处理通知请求失败，ID: ${request.id}`, error);
    
    // 发送错误消息
    const errorMessage = createErrorMessage(
      '通知处理失败',
      'NOTIFICATION_ERROR',
      request.id
    );
    ws.send(JSON.stringify(errorMessage));

    // 拒绝Promise
    request.reject(error);
  }
}

/**
 * 处理交互类型的会话请求
 * @param ws WebSocket连接
 * @param request 会话请求
 */
export function processInteractiveRequest(ws: WebSocket, request: PendingSessionRequest): void {
  try {
    logger.info(`处理交互请求，ID: ${request.id}`);

    // 创建会话上下文
    const session = sessionManager.startSession(ws, request);
    
    if (!session) {
      throw new Error('无法创建会话上下文');
    }

    // 创建会话请求消息
    const sessionRequestMessage = createSessionRequestMessage(
      request.id,
      request.summary,
      request.projectDirectory,
      session.startTime || Date.now(),
      session.timeout || 300
    );

    // 发送会话请求消息到客户端
    ws.send(JSON.stringify(sessionRequestMessage));
    
    logger.info(`交互会话请求已发送到客户端，会话ID: ${request.id}`);

  } catch (error) {
    logger.error(`处理交互请求失败，ID: ${request.id}`, error);
    
    // 发送错误消息
    const errorMessage = createErrorMessage(
      '会话创建失败',
      'SESSION_ERROR',
      request.id
    );
    ws.send(JSON.stringify(errorMessage));

    // 重新入队或拒绝
    if (error instanceof Error) {
      sessionQueue.requeue(request.id, error);
    } else {
      request.reject(error);
    }
  }
}

/**
 * 根据会话模式路由处理请求
 * @param ws WebSocket连接
 * @param request 会话请求
 */
export function routeSessionRequest(ws: WebSocket, request: PendingSessionRequest): void {
  logger.debug(`路由会话请求，ID: ${request.id}，模式: ${request.mode}`);

  switch (request.mode) {
    case SessionMode.NOTIFICATION:
      processNotificationRequest(ws, request);
      break;
    
    case SessionMode.INTERACTIVE:
      processInteractiveRequest(ws, request);
      break;
    
    default:
      logger.error(`未知的会话模式: ${request.mode}，会话ID: ${request.id}`);
      const errorMessage = createErrorMessage(
        '未知的会话模式',
        'INVALID_MODE',
        request.id
      );
      ws.send(JSON.stringify(errorMessage));
      request.reject(new Error(`未知的会话模式: ${request.mode}`));
  }
}

/**
 * 处理客户端消息
 * @param ws WebSocket连接
 * @param message 解析后的消息
 */
export function processClientMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (!isValidMessage(message)) {
    logger.warn('收到无效的WebSocket消息');
    const errorMessage = createErrorMessage('无效的消息格式', 'INVALID_MESSAGE');
    ws.send(JSON.stringify(errorMessage));
    return;
  }

  logger.debug(`处理客户端消息，类型: ${message.type}`);

  switch (message.type) {
    case 'client_ready':
      handleClientReady(ws);
      break;
    
    case 'user_feedback':
    case 'submit_feedback':
      handleUserFeedback(ws, message);
      break;
    
    case 'session_acknowledge':
      handleSessionAcknowledge(ws, message);
      break;
    
    case 'ping':
      handlePing(ws);
      break;
    
    default:
      logger.warn(`未处理的消息类型: ${message.type}`);
      const errorMessage = createErrorMessage(
        `未处理的消息类型: ${message.type}`,
        'UNHANDLED_MESSAGE_TYPE'
      );
      ws.send(JSON.stringify(errorMessage));
  }
}

/**
 * 处理客户端就绪消息
 */
function handleClientReady(ws: WebSocket): void {
  const session = sessionManager.getSessionByWs(ws);
  
  if (session) {
    // 发送包含会话信息的系统信息
    ws.send(JSON.stringify({
      type: 'system_info',
      data: {
        sessionId: session.id,
        workspaceDirectory: session.request.projectDirectory,
        sessionStartTime: session.startTime,
        leaseTimeoutSeconds: session.timeout,
        mode: session.request.mode,
      }
    }));
  } else {
    // 发送通用系统信息
    ws.send(JSON.stringify({
      type: 'system_info',
      data: {
        sessionId: '无',
        workspaceDirectory: '未知',
        leaseTimeoutSeconds: 0,
      }
    }));
  }
}

/**
 * 处理用户反馈消息
 */
function handleUserFeedback(ws: WebSocket, message: WebSocketMessage): void {
  // 这里保持原有的用户反馈处理逻辑
  // 将消息路由到现有的消息路由器
  const { messageRouter } = require('./messageRouter');
  messageRouter.route(ws, message);
}

/**
 * 处理会话确认消息（主要用于通知模式）
 */
function handleSessionAcknowledge(ws: WebSocket, message: WebSocketMessage): void {
  const data = message.data || {};
  
  if (data.notificationId) {
    // 标记通知为已确认
    const success = notificationStore.acknowledgeNotification(data.notificationId);
    if (success) {
      logger.info(`通知已被用户确认，ID: ${data.notificationId}`);
    } else {
      logger.warn(`尝试确认不存在的通知，ID: ${data.notificationId}`);
    }
  }
  
  if (data.sessionId) {
    logger.info(`会话已被用户确认，ID: ${data.sessionId}`);
  }
}

/**
 * 处理ping消息
 */
function handlePing(ws: WebSocket): void {
  ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
}
