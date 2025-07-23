/**
 * 反馈处理器
 * 处理用户提交的反馈消息
 */

import { WebSocket } from 'ws';
import { logger } from '../../../logger';
import { messageRouter } from '../router';
import { sessionManager } from '../../session/manager';
import { sessionQueue } from '../../session/queue';
import { transport } from '../../websocket/transport';
import { SessionContext } from '../../session/context';
import { UserFeedback } from '../../../types/feedback';

function handleFeedback(
  session: SessionContext | null, 
  data: any, 
  ws: WebSocket
): void {
  if (!session) {
    logger.warn('收到来自无会话连接的反馈消息');
    transport.sendError(ws, '未建立会话连接', 'SESSION_NOT_FOUND');
    return;
  }

  const feedback: UserFeedback = {
    text: data?.text || '',
    imageData: data?.imageData || []
  };

  logger.info(`收到用户反馈，会话ID: ${session.id}`);

  try {
    // 解析会话Promise
    session.request.resolve(feedback);

    // 从队列中确认并移除请求
    sessionQueue.acknowledge(session.request.id);

    // 通知客户端已收到反馈
    transport.send(ws, {
      type: 'feedback_status',
      data: { status: 'received' }
    });

    transport.send(ws, {
      type: 'stop_timer'
    });

    // 结束会话
    sessionManager.endSession(ws);

    logger.info(`反馈处理完成，会话ID: ${session.id}`);

  } catch (error) {
    logger.error(`处理反馈时出错，会话ID: ${session.id}:`, error);
    transport.sendError(ws, '处理反馈时发生错误', 'FEEDBACK_ERROR');
  }
}

// 注册处理器
messageRouter.register('submit_feedback', handleFeedback);
messageRouter.register('user_feedback', handleFeedback);

export { handleFeedback };