/**
 * WebSocket 中间件
 * 提供WebSocket连接的验证和预处理功能
 */

import { WebSocket } from 'ws';
import { logger } from '../../logger';
import { ValidationError } from '../utils/errors';
import { isValidMessage } from '../../types/websocket';

export type WebSocketMiddleware = (
  ws: WebSocket, 
  message: any, 
  next: (error?: Error) => void
) => void;

class MiddlewareManager {
  private middlewares: WebSocketMiddleware[] = [];

  public use(middleware: WebSocketMiddleware): void {
    this.middlewares.push(middleware);
  }

  public async execute(ws: WebSocket, message: any): Promise<void> {
    let index = 0;

    const next = (error?: Error): void => {
      if (error) {
        throw error;
      }

      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      middleware(ws, message, next);
    };

    next();
  }
}

// 内置中间件

export const validateMessage: WebSocketMiddleware = (ws, message, next) => {
  if (!isValidMessage(message)) {
    logger.warn('收到无效的WebSocket消息格式');
    const error = new ValidationError('无效的消息格式');
    return next(error);
  }
  next();
};

export const logMessage: WebSocketMiddleware = (ws, message, next) => {
  logger.debug(`处理WebSocket消息: ${message.type}`);
  next();
};

export const rateLimiter = (maxPerMinute: number = 60): WebSocketMiddleware => {
  const connectionRequests = new Map<WebSocket, number[]>();

  return (ws, message, next) => {
    const now = Date.now();
    const requests = connectionRequests.get(ws) || [];
    
    // 清理1分钟前的请求记录
    const recent = requests.filter(time => now - time < 60000);
    
    if (recent.length >= maxPerMinute) {
      logger.warn('WebSocket连接超过速率限制');
      return next(new ValidationError('请求频率过高'));
    }

    recent.push(now);
    connectionRequests.set(ws, recent);
    next();
  };
};

export const middlewareManager = new MiddlewareManager();

// 注册默认中间件
middlewareManager.use(validateMessage);
middlewareManager.use(logMessage);
middlewareManager.use(rateLimiter(60));