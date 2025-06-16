/**
 * 应用程序配置
 */

// 服务器端口配置
export const PORT = Number(process.env.PORT) || 10086;

// 超时提示词语
export const TIMEOUT_PROMPT = String(process.env.TIMEOUT_PROMPT) || "continue";

// MCP 服务器配置
export const MCP_CONFIG = {
    name: "dynamic-interaction",
    version: "1.0.0",
};

// 默认超时设置（秒） - 这看起来是 MCP 工具的默认超时，与 WebSocket 会话超时不同
export const DEFAULT_TIMEOUT = 600;

// 新增：WebSocket 会话等待客户端连接的超时时间（秒）
export const WEBSOCKET_SESSION_TIMEOUT_SECONDS = Number(process.env.WEBSOCKET_SESSION_TIMEOUT_SECONDS) || 30;
