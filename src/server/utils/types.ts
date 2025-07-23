/**
 * 共享类型定义
 */

import { WebSocket } from 'ws';

export interface ServerConfig {
  port: number;
  sessionTimeout: number;
  shutdownDelay: number;
  logEnabled: boolean;
}

export enum ServerState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping'
}

export interface ConnectionInfo {
  id: string;
  ws: WebSocket;
  connectedAt: number;
  lastActivity: number;
}

export interface ServerStats {
  activeConnections: number;
  activeSessions: number;
  queuedRequests: number;
  uptime: number;
}