/**
 * 标准错误类型定义
 */

export class ServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

export class WebSocketError extends ServerError {
  constructor(message: string, code: string) {
    super(message, code, 400);
    this.name = 'WebSocketError';
  }
}

export class SessionError extends ServerError {
  constructor(message: string, code: string) {
    super(message, code, 400);
    this.name = 'SessionError';
  }
}

export class ValidationError extends ServerError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export const ErrorCodes = {
  // WebSocket errors
  INVALID_MESSAGE_FORMAT: 'INVALID_MESSAGE_FORMAT',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  SESSION_CREATION_ERROR: 'SESSION_CREATION_ERROR',
  
  // Server errors
  SERVER_START_ERROR: 'SERVER_START_ERROR',
  SERVER_STOP_ERROR: 'SERVER_STOP_ERROR',
  
  // Notification errors
  NOTIFICATION_ERROR: 'NOTIFICATION_ERROR',
  
  // General errors
  INVALID_MODE: 'INVALID_MODE',
  UNHANDLED_MESSAGE_TYPE: 'UNHANDLED_MESSAGE_TYPE'
} as const;