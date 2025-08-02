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

// 默认语言配置
export const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || 'zh';

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

/**
 * 验证 UI 模式配置
 * @param mode UI 模式字符串
 * @returns 验证后的 UI 模式，无效时返回 'browser'
 */
function validateUIMode(mode: string | undefined): 'browser' | 'electron' {
    if (mode === 'electron' || mode === 'browser') {
        return mode;
    }
    return 'browser';
}

/**
 * 验证窗口尺寸配置
 * @param value 尺寸值
 * @param defaultValue 默认值
 * @param min 最小值
 * @param max 最大值
 * @returns 验证后的尺寸值
 */
function validateWindowSize(value: string | undefined, defaultValue: number, min: number = 400, max: number = 4000): number {
    if (!value) return defaultValue;

    const parsed = Number(value);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        return defaultValue;
    }

    return parsed;
}

// Electron GUI 配置
export const ELECTRON_CONFIG = {
    // UI 模式：'browser' 或 'electron'
    uiMode: validateUIMode(process.env.UI_MODE),
    // 是否启用 Electron 模式
    enabled: validateUIMode(process.env.UI_MODE) === 'electron',
    // 窗口宽度
    windowWidth: validateWindowSize(process.env.ELECTRON_WINDOW_WIDTH, 1200),
    // 窗口高度
    windowHeight: validateWindowSize(process.env.ELECTRON_WINDOW_HEIGHT, 800),
    // 是否启用开发者工具
    devTools: process.env.NODE_ENV === 'development',
    // 窗口标题
    windowTitle: 'Dynamic Interaction MCP',
    // 窗口是否可调整大小
    resizable: true,
    // 窗口是否居中显示
    center: true,
    // 最小窗口尺寸
    minWidth: 800,
    minHeight: 600
};
