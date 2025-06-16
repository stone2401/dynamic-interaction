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

// 默认超时设置（秒）
export const DEFAULT_TIMEOUT = 600;
