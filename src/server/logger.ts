/**
 * 简易日志广播模块
 *
 * 调用 setupLogBroadcast() 后，将覆盖 console.log/console.warn/console.error，
 * 在保持原有输出的同时，把日志通过 WebSocket 向前端推送。
 */

import { activeSockets } from './websocket';

function broadcastLog(level: 'log' | 'warn' | 'error', args: any[]) {
    // 合并消息为字符串
    const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    // 广播
    activeSockets.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'server_log', data: { level, text } }));
        }
    });
}

/**
 * 覆盖 console 方法，使其既写入原控制台，也通过 WebSocket 推送
 */
export function setupLogBroadcast(): void {
    ['log', 'warn', 'error'].forEach((method) => {
        const original = console[method as 'log'];
        console[method as 'log'] = (...args: any[]) => {
            // 先调用原始方法
            original.apply(console, args);
            // 后广播
            broadcastLog(method as 'log' | 'warn' | 'error', args);
        };
    });
}
