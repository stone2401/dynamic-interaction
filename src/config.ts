/**
 * 应用程序配置
 */
import * as path from 'path';
import * as os from 'os';

// 服务器端口配置
export const PORT = Number(process.env.PORT) || 10086;

// 超时提示词语
export const TIMEOUT_PROMPT = process.env.TIMEOUT_PROMPT != undefined ? process.env.TIMEOUT_PROMPT : "continue";

// MCP 服务器配置
export const MCP_CONFIG = {
    name: "dynamic-interaction",
    version: "1.0.0",
};

// 会话租约超时时间（秒），用于处理中的任务
export const SESSION_TIMEOUT = Number(process.env.SESSION_TIMEOUT) || 300; // 默认 5 分钟

// 日志配置
export const LOG_CONFIG = {
    // 是否启用日志系统
    enabled: process.env.LOG_ENABLED === 'true', // 默认禁用
    // 日志文件存储目录，默认为用户主目录下的 .dynamic-interaction/logs
    dir: process.env.LOG_DIR || path.join(os.homedir(), '.dynamic-interaction', 'logs'),
    // 错误日志文件名（不含路径）
    errorFile: process.env.LOG_ERROR_FILE || 'error.log',
    // 综合日志文件名（不含路径）
    combinedFile: process.env.LOG_COMBINED_FILE || 'combined.log',
    // 日志级别：error, warn, info, http, verbose, debug, silly
    level: process.env.LOG_LEVEL || 'info',
    // 是否在控制台输出带颜色的日志
    colorize: process.env.LOG_COLORIZE !== 'false', // 默认启用
    // 是否将日志输出到文件
    fileLogging: process.env.LOG_TO_FILE !== 'false' && process.env.LOG_ENABLED === 'true' // 默认禁用，仅在两个开关都打开时启用
};
