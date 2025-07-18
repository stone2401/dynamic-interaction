/**
 * 应用程序配置
 */
import * as path from 'path';
import * as os from 'os';

// 窗口焦点策略类型
export type WindowFocusStrategy = 'auto' | 'applescript' | 'powershell' | 'wmctrl' | 'xdotool';

// 窗口焦点配置类型
export interface WindowFocusConfig {
    enabled: boolean;
    strategy: WindowFocusStrategy;
    browsers: string[];
    fallbackNotification: boolean;
    retryAttempts: number;
    retryDelay: number;
}

// 服务器端口配置
export const PORT = Number(process.env.PORT) || 10086;

// 超时提示词语
export const TIMEOUT_PROMPT = String(process.env.TIMEOUT_PROMPT) || "continue";

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

// 窗口焦点配置
export const WINDOW_FOCUS_CONFIG = {
    // 是否启用窗口焦点功能
    enabled: process.env.WINDOW_FOCUS_ENABLED !== 'false', // 默认启用
    // 焦点策略：auto（自动检测）、applescript（macOS）、powershell（Windows）、wmctrl（Linux）
    strategy: process.env.WINDOW_FOCUS_STRATEGY || 'auto',
    // 支持的浏览器列表，按优先级排序
    browsers: (process.env.WINDOW_FOCUS_BROWSERS || 'chrome,safari,firefox,edge').split(',').map(b => b.trim()),
    // 是否启用回退通知（当窗口焦点失败时）
    fallbackNotification: process.env.WINDOW_FOCUS_FALLBACK !== 'false', // 默认启用
    // 重试次数
    retryAttempts: Number(process.env.WINDOW_FOCUS_RETRY_ATTEMPTS) || 3,
    // 重试延迟（毫秒）
    retryDelay: Number(process.env.WINDOW_FOCUS_RETRY_DELAY) || 500,
};
