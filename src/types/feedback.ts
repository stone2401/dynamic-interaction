/**
 * 通用类型定义：用户反馈
 * 此接口被前端 MCP solicit-input 与后端 WebSocket 服务器共用，
 * 以保持类型一致性并避免重复定义。
 */
export interface UserFeedback {
  text?: string;
  imageData?: string | string[];
  mimeType?: string | string[];
  commandOutput?: string;
  error?: string;
}
