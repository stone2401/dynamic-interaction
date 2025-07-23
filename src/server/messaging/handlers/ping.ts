/**
 * Ping处理器
 * 处理心跳检测消息
 */

import { WebSocket } from 'ws';
import { logger } from '../../../logger';
import { messageRouter } from '../router';
import { transport } from '../../websocket/transport';
import { SessionContext } from '../../session/context';

function handlePing(
  session: SessionContext | null, 
  data: any, 
  ws: WebSocket
): void {
  logger.debug('收到ping消息');
  
  // 发送pong响应
  transport.sendPong(ws);
}

// 注册处理器
messageRouter.register('ping', handlePing);

export { handlePing };