/**
 * 处理用户提交的反馈消息。
 */
import { SessionContext } from '../../types/session';
import { UserFeedback } from '../../types/feedback';
import { messageRouter } from '../messageRouter';
import { sessionQueue } from '../sessionQueue';
import { sessionManager } from '../sessionManager';

function handleFeedback(session: SessionContext, data: any): void {
  const feedback: UserFeedback = {
    text: data?.text || '',
    imageData: data?.imageData || [],
  };

  // 1. 解析并处理反馈
  session.request.resolve(feedback);

  // 2. 从队列中确认并移除请求
  sessionQueue.acknowledge(session.request.id);

  // 3. 通知客户端已收到
  session.ws.send(JSON.stringify({ type: 'feedback_status', data: { status: 'received' } }));
  session.ws.send(JSON.stringify({ type: 'stop_timer' }));

  // 4. 结束会话
  sessionManager.endSession(session.ws);
}

messageRouter.register('submit_feedback', handleFeedback);
