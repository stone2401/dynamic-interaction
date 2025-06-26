/**
 * 日志模块 (winston)
 * 提供一个全局的 logger 实例
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { LOG_CONFIG } from './config';
import { WebSocketTransport } from './server/websocketTransport';
import DailyRotateFile from 'winston-daily-rotate-file';

// 确保日志目录存在
const logDir = path.isAbsolute(LOG_CONFIG.dir)
    ? LOG_CONFIG.dir
    : path.join(process.cwd(), LOG_CONFIG.dir);

// 确保日志目录存在
if (LOG_CONFIG.fileLogging && !fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
        console.error(`Failed to create log directory: ${logDir}`, error);
    }
}

// 创建基础控制台传输
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        LOG_CONFIG.colorize ? winston.format.colorize() : winston.format.simple(),
        winston.format.simple()
    ),
});



// 创建 logger 实例
export const logger = winston.createLogger({
    level: LOG_CONFIG.level,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        consoleTransport,
        new WebSocketTransport(),
        new DailyRotateFile({
            filename: path.join(logDir, LOG_CONFIG.combinedFile),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
        new DailyRotateFile({
            filename: path.join(logDir, LOG_CONFIG.errorFile),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),

    ],
    exitOnError: false // 防止程序因日志错误而崩溃
});

// 导出 WebSocketTransport 的设置函数，方便其他模块使用
export { setWebSocketServer } from './server/websocketTransport';

// 记录日志系统启动信息
logger.info('Logger initialized', {
    logLevel: LOG_CONFIG.level,
    logDir: logDir,
    fileLogging: LOG_CONFIG.fileLogging,
    errorLogFile: LOG_CONFIG.fileLogging ? path.join(logDir, LOG_CONFIG.errorFile) : 'disabled',
    combinedLogFile: LOG_CONFIG.fileLogging ? path.join(logDir, LOG_CONFIG.combinedFile) : 'disabled'
});
