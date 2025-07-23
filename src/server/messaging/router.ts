/**
 * 消息路由器
 * 改进的消息路由系统，支持中间件和更好的错误处理
 */

import { WebSocket } from 'ws';
import { logger } from '../../logger';
import { sessionManager } from '../session/manager';
import { transport } from '../websocket/transport';
import { middlewareManager } from '../websocket/middleware';
import { ValidationError, ErrorCodes } from '../utils/errors';
import { SessionContext } from '../session/context';

export type MessageHandler = (
  session: SessionContext | null,
  data: any,
  ws: WebSocket
) => void | Promise<void>;

export class MessageRouter {
  private static instance: MessageRouter;
  private handlers = new Map<string, MessageHandler>();

  private constructor() {}

  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter();
    }
    return MessageRouter.instance;
  }

  public register(type: string, handler: MessageHandler): void {
    if (this.handlers.has(type)) {
      logger.warn(`消息类型 "${type}" 的处理器已被覆盖`);
    }
    
    this.handlers.set(type, handler);
    logger.info(`已注册消息类型 "${type}" 的处理器`);
  }

  public async route(ws: WebSocket, message: { type: string; data: any }): Promise<void> {
    try {
      // 执行中间件
      await middlewareManager.execute(ws, message);

      const handler = this.handlers.get(message.type);
      if (!handler) {
        logger.warn(`未找到消息类型 "${message.type}" 的处理器`);
        transport.sendError(
          ws,
          `未处理的消息类型: ${message.type}`,
          ErrorCodes.UNHANDLED_MESSAGE_TYPE
        );
        return;
      }

      const session = sessionManager.getSessionByWs(ws) || null;
      
      // 对于某些消息类型，无会话也可以处理
      if (!session && !this.isSessionlessMessage(message.type)) {
        logger.warn(`收到来自无会话连接的消息，类型: ${message.type}`);
        transport.sendError(
          ws,
          '未建立会话连接',
          ErrorCodes.SESSION_NOT_FOUND
        );
        return;
      }

      // 执行处理器
      await Promise.resolve(handler(session, message.data, ws));

    } catch (error) {
      logger.error(`处理消息时出错，类型: ${message.type}:`, error);
      
      if (error instanceof ValidationError) {
        transport.sendError(ws, error.message, error.code);
      } else {
        transport.sendError(
          ws,
          '处理消息时发生内部错误',
          'INTERNAL_ERROR'
        );
      }
    }
  }

  private isSessionlessMessage(type: string): boolean {
    const sessionlessTypes = ['ping', 'client_ready'];
    return sessionlessTypes.includes(type);
  }

  public unregister(type: string): boolean {
    return this.handlers.delete(type);
  }

  public getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  public hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }
}

export const messageRouter = MessageRouter.getInstance();