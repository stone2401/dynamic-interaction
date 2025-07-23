/**
 * 系统信息处理器
 * 处理客户端请求系统信息的消息
 */

import { WebSocket } from 'ws';
import { logger } from '../../../logger';
import { messageRouter } from '../router';
import { transport } from '../../websocket/transport';
import { SessionContext } from '../../session/context';
import { notificationStore } from '../../notifications/store';

function handleClientReady(
  session: SessionContext | null, 
  data: any, 
  ws: WebSocket
): void {
  logger.debug('收到客户端就绪消息');

  if (session) {
    // 发送包含会话信息的系统信息
    transport.sendSystemInfo(
      ws,
      session.id,
      session.request.projectDirectory || process.cwd(),
      session.startTime,
      session.timeout,
      session.mode
    );
  } else {
    // 发送通用系统信息
    transport.sendSystemInfo(ws);
  }

  // 检查并处理等待队列中的消息
  const { messageProcessor } = require('../processor');
  messageProcessor.checkQueueAndProcess();
}

function handleSessionAcknowledge(
  session: SessionContext | null, 
  data: any, 
  ws: WebSocket
): void {
  logger.debug('收到会话确认消息');

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

function handleSystemInfoRequest(
  session: SessionContext | null, 
  data: any, 
  ws: WebSocket
): void {
  logger.debug('收到系统信息请求');

  const { lifecycleManager } = require('../../core/lifecycle');
  const stats = lifecycleManager.getServerStats();

  transport.send(ws, {
    type: 'system_info',
    data: {
      sessionId: session?.id || '无',
      workspaceDirectory: session?.request.projectDirectory || process.cwd(),
      sessionStartTime: session?.startTime,
      leaseTimeoutSeconds: session?.timeout || 0,
      mode: session?.mode,
      serverVersion: process.env.npm_package_version || '1.0.0',
      serverStats: stats,
      timestamp: Date.now()
    }
  });
}

// 注册处理器
messageRouter.register('client_ready', handleClientReady);
messageRouter.register('session_acknowledge', handleSessionAcknowledge);
messageRouter.register('system_info_request', handleSystemInfoRequest);

export { 
  handleClientReady, 
  handleSessionAcknowledge, 
  handleSystemInfoRequest 
};