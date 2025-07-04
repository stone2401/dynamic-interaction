import { WebSocket } from 'ws';
import { logger } from '../logger';
import { sessionManager } from './sessionManager';
import { SessionContext } from '../types/session';

// 定义处理器函数的类型
type MessageHandler = (session: SessionContext, data: any) => void;

class MessageRouter {
  private static instance: MessageRouter;
  private handlers = new Map<string, MessageHandler>();

  private constructor() {}

  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter();
    }
    return MessageRouter.instance;
  }

  /**
   * 注册消息处理器
   * @param type 消息类型
   * @param handler 处理器函数
   */
  public register(type: string, handler: MessageHandler): void {
    if (this.handlers.has(type)) {
      logger.warn(`消息类型 "${type}" 的处理器已被覆盖。`);
    }
    this.handlers.set(type, handler);
    logger.info(`已注册消息类型 "${type}" 的处理器。`);
  }

  /**
   * 路由消息到对应的处理器
   * @param ws WebSocket 连接实例
   * @param message 解析后的消息对象
   */
  public route(ws: WebSocket, message: { type: string; data: any }): void {
    const handler = this.handlers.get(message.type);
    const session = sessionManager.getSessionByWs(ws);

    if (!session) {
      logger.warn(`收到来自无会话连接的消息，类型: ${message.type}。将忽略此消息。`);
      // 对于某些无会话也可处理的消息（如ping），可以添加特殊逻辑
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
      }
      return;
    }

    if (handler) {
      try {
        handler(session, message.data);
      } catch (error) {
        logger.error(`处理消息类型 "${message.type}" 时出错 (会话 ID: ${session.id}):`, error);
        ws.send(JSON.stringify({ type: 'error', data: '处理您的请求时发生内部错误。' }));
      }
    } else {
      logger.warn(`未找到消息类型 "${message.type}" 的处理器。`);
    }
  }
}

export const messageRouter = MessageRouter.getInstance();
