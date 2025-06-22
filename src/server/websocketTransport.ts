/**
 * WebSocket 日志传输模块
 * 提供将日志广播到 WebSocket 客户端的功能
 */

import TransportStream from 'winston-transport';
import { WebSocket, WebSocketServer } from 'ws';

// 全局变量，用于存储 WebSocket 服务器实例
let wss: WebSocketServer | null = null;

// 存储所有连接的 WebSocket 客户端
const clients = new Set<WebSocket>();

/**
 * 自定义 WebSocket 传输
 * 将日志消息发送到所有连接的 WebSocket 客户端
 */
export class WebSocketTransport extends TransportStream {
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

        clients.forEach((client) => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(logMessage);
            }
        });

        callback();
    }
}

/**
 * 设置 WebSocket 服务器
 * 用于监听新的 WebSocket 连接并管理客户端集合
 * @param server WebSocket 服务器实例
 */
export function setWebSocketServer(server: WebSocketServer) {
    wss = server;

    // 监听新连接
    wss.on('connection', (ws: WebSocket) => {
        clients.add(ws);

        // 监听连接关闭
        // 使用类型断言解决 WebSocket 类型问题
        (ws as unknown as WebSocket).on('close', () => {
            clients.delete(ws);
        });
    });
}
