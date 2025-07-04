/**
 * 处理 ping 消息，用于心跳检测。
 */
import { SessionContext } from '../../types/session';
import { messageRouter } from '../messageRouter';

function handlePing(session: SessionContext, data: any): void {
  session.ws.send(JSON.stringify({
    type: 'pong',
    data: { timestamp: Date.now() },
  }));
}

messageRouter.register('ping', handlePing);
