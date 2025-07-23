/**
 * 日志模块 (winston)
 * 提供一个全局的 logger 实例
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { LOG_CONFIG } from './config';
import DailyRotateFile from 'winston-daily-rotate-file';
import { WebSocketServer } from 'ws';
import TransportStream from 'winston-transport';

// WebSocket传输类的简化实现
class WebSocketTransport extends TransportStream {
    private clients = new Set<any>();
    
    constructor() {
        super();
    }

    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // 广播日志到所有连接的客户端
        const logMessage = JSON.stringify({
            type: 'log',
            level: info.level,
            message: info.message,
            timestamp: info.timestamp,
            ...(info.stack && { stack: info.stack }),
        });

        this.clients.forEach((client) => {
            if (client.readyState === 1) { // 1 = OPEN
                try {
                    client.send(logMessage);
                } catch (error) {
                    // 忽略发送错误，移除无效连接
                    this.clients.delete(client);
                }
            }
        });

        callback();
    }

    public addClient(client: any): void {
        this.clients.add(client);
        client.on('close', () => {
            this.clients.delete(client);
        });
    }
}

const wsTransport = new WebSocketTransport();

// 设置WebSocket服务器函数
export function setWebSocketServer(server: WebSocketServer) {
    server.on('connection', (ws) => {
        wsTransport.addClient(ws);
    });
};

let logger: winston.Logger;

if (!LOG_CONFIG.enabled) {
    // 如果日志系统被禁用，创建一个静默的 logger
    logger = winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })]
    });
    console.log('日志系统已禁用，WebSocket 日志传输将不会被初始化。')
} else {
    // 确保日志目录存在
    let logDir = LOG_CONFIG.dir;

    if (LOG_CONFIG.fileLogging) {
        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        } catch (error) {
            console.warn(`无法创建日志目录: ${logDir}，将使用临时目录`, error);
            try {
                const os = require('os');
                logDir = path.join(os.tmpdir(), 'dynamic-interaction-logs');
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                console.info(`已切换到临时日志目录: ${logDir}`);
            } catch (fallbackError) {
                console.error(`无法创建临时日志目录，将禁用文件日志`, fallbackError);
                LOG_CONFIG.fileLogging = false;
            }
        }
    }

    // 准备传输器列表
    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                LOG_CONFIG.colorize ? winston.format.colorize() : winston.format.simple(),
                winston.format.simple()
            ),
        }),
        new WebSocketTransport(),
    ];

    if (LOG_CONFIG.fileLogging) {
        try {
            transports.push(
                new DailyRotateFile({
                    filename: path.join(logDir, LOG_CONFIG.combinedFile),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    handleExceptions: true,
                }) as unknown as winston.transport,
                new DailyRotateFile({
                    filename: path.join(logDir, LOG_CONFIG.errorFile),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    level: 'error',
                    handleExceptions: true,
                }) as unknown as winston.transport
            );
        } catch (error) {
            console.error('添加文件日志传输器失败，将只使用控制台日志', error);
        }
    }

    logger = winston.createLogger({
        level: LOG_CONFIG.level,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        transports,
        exitOnError: false,
    });

    logger.info('日志系统已初始化', {
        logLevel: LOG_CONFIG.level,
        logDir: LOG_CONFIG.fileLogging ? logDir : 'disabled',
        fileLogging: LOG_CONFIG.fileLogging,
    });
}

export { logger };
