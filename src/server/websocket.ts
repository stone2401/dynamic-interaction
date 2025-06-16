/**
 * WebSocket 服务器配置
 */

import { WebSocketServer } from 'ws';
import { server } from './express';
import { handleSolicitInputConnection } from '../mcp/solicit-input';

// 创建 WebSocket 服务器
export const wss = new WebSocketServer({ server });

// 跟踪所有活动的 WebSocket 连接
export const activeSockets = new Set<any>();

/**
 * 配置 WebSocket 服务器
 */
export function configureWebSocketServer(): void {
    // WebSocket 连接处理
    wss.on('connection', (ws, req) => {
        // 在连接建立时添加到集合
        activeSockets.add(ws);

        // 处理连接
        handleSolicitInputConnection(ws, req);

        // 在连接关闭时从集合中移除
        ws.on('close', () => {
            activeSockets.delete(ws);
        });
    });
}
