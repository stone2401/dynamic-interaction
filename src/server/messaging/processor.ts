/**
 * 消息处理器
 * 统一的消息处理入口，整合路由和会话处理
 */

import { WebSocket } from 'ws';
import { logger } from '../../logger';
import { messageRouter } from './router';
import { sessionManager } from '../session/manager';
import { sessionQueue } from '../session/queue';
import { transport } from '../websocket/transport';
import { webSocketManager } from '../websocket/connection';
import { notificationStore } from '../notifications/store';
import { SessionMode, PendingSessionRequest } from '../../types/session';
import { ValidationError, ErrorCodes } from '../utils/errors';
import { isValidMessage } from '../../types/websocket';

export class MessageProcessor {
  private static instance: MessageProcessor;

  private constructor() {
    this.registerDefaultHandlers();
  }

  public static getInstance(): MessageProcessor {
    if (!MessageProcessor.instance) {
      MessageProcessor.instance = new MessageProcessor();
    }
    return MessageProcessor.instance;
  }

  public async process(ws: WebSocket, message: any): Promise<void> {
    if (!isValidMessage(message)) {
      logger.warn('收到无效的WebSocket消息');
      transport.sendError(
        ws,
        '无效的消息格式',
        ErrorCodes.INVALID_MESSAGE_FORMAT
      );
      return;
    }

    logger.debug(`处理客户端消息，类型: ${message.type}`);
    await messageRouter.route(ws, { type: message.type, data: message.data || {} });
  }

  public async processSessionRequest(
    ws: WebSocket, 
    request: PendingSessionRequest
  ): Promise<void> {
    logger.debug(`处理会话请求，ID: ${request.id}，模式: ${request.mode}`);

    try {
      switch (request.mode) {
        case SessionMode.NOTIFICATION:
          await this.processNotificationRequest(ws, request);
          break;
        
        case SessionMode.INTERACTIVE:
          await this.processInteractiveRequest(ws, request);
          break;
        
        default:
          throw new ValidationError(`未知的会话模式: ${request.mode}`);
      }
    } catch (error) {
      logger.error(`处理会话请求失败，ID: ${request.id}:`, error);
      
      if (error instanceof ValidationError) {
        transport.sendError(ws, error.message, error.code, request.id);
        request.reject(error);
      } else {
        transport.sendError(
          ws,
          '会话处理失败',
          ErrorCodes.SESSION_CREATION_ERROR,
          request.id
        );
        sessionQueue.requeue(request.id, error as Error);
      }
    }
  }

  private async processNotificationRequest(
    ws: WebSocket, 
    request: PendingSessionRequest
  ): Promise<void> {
    logger.info(`处理通知请求，ID: ${request.id}`);

    // 发送通知消息
    transport.sendNotification(
      ws,
      request.id,
      request.summary,
      request.projectDirectory
    );

    // 存储通知
    notificationStore.addNotification({
      id: request.id,
      summary: request.summary,
      projectDirectory: request.projectDirectory,
      createdAt: request.createdAt,
      acknowledged: false
    });

    // 通知模式不需要等待用户响应，立即确认
    sessionQueue.acknowledge(request.id);
    request.resolve({ text: '通知已成功发送' });

    logger.info(`通知消息已发送，ID: ${request.id}`);
  }

  private async processInteractiveRequest(
    ws: WebSocket, 
    request: PendingSessionRequest
  ): Promise<void> {
    logger.info(`处理交互请求，ID: ${request.id}`);

    // 创建会话
    const session = sessionManager.createSession(ws, request);
    
    // 发送会话请求消息
    transport.sendSessionRequest(
      ws,
      request.id,
      request.summary,
      request.projectDirectory,
      session.startTime,
      session.timeout
    );

    logger.info(`交互会话已创建，ID: ${request.id}`);
  }

  private registerDefaultHandlers(): void {
    // 自动导入并注册处理器
    try {
      require('./handlers');
      logger.info('默认消息处理器已注册');
    } catch (error) {
      logger.error('注册默认消息处理器失败:', error);
    }
  }

  public checkQueueAndProcess(): void {
    if (sessionQueue.isWaitingQueueEmpty()) {
      const { lifecycleManager } = require('../core/lifecycle');
      lifecycleManager.checkAndStopIfIdle();
      return;
    }

    const availableWs = webSocketManager.getAvailableConnection();
    if (availableWs) {
      const sessionRequest = sessionQueue.leaseNext();
      if (sessionRequest) {
        logger.info(
          `为会话 ${sessionRequest.id} 分配了可用连接，模式: ${sessionRequest.mode}`
        );
        
        this.processSessionRequest(availableWs, sessionRequest).catch(error => {
          logger.error('处理会话请求时出错:', error);
        });
      }
    }
  }
}

export const messageProcessor = MessageProcessor.getInstance();