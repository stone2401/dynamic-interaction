/**
 * 会话上下文
 * 定义会话的数据结构和状态
 */

import { WebSocket } from 'ws';
import { SessionMode, PendingSessionRequest } from '../../types/session';

export interface SessionContext {
  id: string;
  ws: WebSocket;
  request: PendingSessionRequest;
  startTime: number;
  timeout: number;
  timeoutId: NodeJS.Timeout | null;
  mode: SessionMode;
  metadata?: Record<string, any>;
}

export interface SessionStats {
  id: string;
  startTime: number;
  elapsedTime: number;
  remainingTime: number;
  mode: SessionMode;
  projectDirectory?: string;
}

export class SessionContextBuilder {
  private context: Partial<SessionContext> = {};

  public setId(id: string): this {
    this.context.id = id;
    return this;
  }

  public setWebSocket(ws: WebSocket): this {
    this.context.ws = ws;
    return this;
  }

  public setRequest(request: PendingSessionRequest): this {
    this.context.request = request;
    return this;
  }

  public setStartTime(startTime: number): this {
    this.context.startTime = startTime;
    return this;
  }

  public setTimeout(timeout: number): this {
    this.context.timeout = timeout;
    return this;
  }

  public setMode(mode: SessionMode): this {
    this.context.mode = mode;
    return this;
  }

  public setMetadata(metadata: Record<string, any>): this {
    this.context.metadata = metadata;
    return this;
  }

  public build(): SessionContext {
    const required = ['id', 'ws', 'request', 'startTime', 'timeout', 'mode'];
    for (const field of required) {
      if (!(field in this.context)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      ...this.context,
      timeoutId: null,
      metadata: this.context.metadata || {}
    } as SessionContext;
  }
}