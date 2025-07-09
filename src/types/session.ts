import { WebSocket } from 'ws';
import { UserFeedback } from './feedback';

/**
 * 代表一个待处理的会话请求，包含所有必要的信息和回调。
 */
export interface PendingSessionRequest {
  id: string;
  summary: string;
  projectDirectory: string;
  createdAt: number;
  resolve: (feedback: UserFeedback) => void;
  reject: (reason?: any) => void;
  leaseTimer?: NodeJS.Timeout;
}

/**
 * 代表一个活跃的会话上下文，存储会话的状态信息。
 */
export interface SessionContext {
  id: string;
  ws: WebSocket;
  request: PendingSessionRequest;
  timeoutId: NodeJS.Timeout | null;
  startTime?: number; // 会话开始时间的时间戳
  timeout?: number;   // 会话的完整超时时长（秒）
}
