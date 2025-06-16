/**
 * MCP solicit-input 工具实现
 */

import { WebSocket } from 'ws';
import { exec } from 'child_process';
import { IncomingMessage } from 'http';

/**
 * 处理 WebSocket 连接
 * @param ws WebSocket 连接
 * @param req HTTP 请求
 */
export function handleSolicitInputConnection(ws: WebSocket, req: IncomingMessage): void {
    console.log('客户端已连接');

    // 连接建立时向客户端发送摘要
    // 在实际场景中，此摘要将是动态的
    ws.send(JSON.stringify({ type: 'summary', data: 'AI 正在等待您的反馈。请提供文本、上传图片或运行命令。' }));

    ws.on('message', (message: string) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('收到消息:', parsedMessage);

            switch (parsedMessage.type) {
                case 'command':
                    if (typeof parsedMessage.data === 'string') {
                        // 执行命令并返回输出
                        exec(parsedMessage.data, (error, stdout, stderr) => {
                            if (error) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `错误: ${error.message}` }));
                                return;
                            }
                            if (stderr) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `标准错误: ${stderr}` }));
                                return;
                            }
                            ws.send(JSON.stringify({ type: 'command_result', data: stdout }));
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', data: '无效的命令格式。' }));
                    }
                    break;

                case 'composite_feedback':
                    const { text, imageData } = parsedMessage.data;
                    console.log('收到复合反馈:');
                    if (text) {
                        console.log('  文本:', text);
                    }
                    if (imageData) {
                        console.log('  图片(前100个字符):', imageData.substring(0, 100));
                    }
                    ws.send(JSON.stringify({ type: 'info', data: '反馈已成功接收。' }));
                    break;

                default:
                    ws.send(JSON.stringify({ type: 'error', data: '未知的消息类型。' }));
            }
        } catch (e) {
            console.error('无法解析或处理消息:', e);
            ws.send(JSON.stringify({ type: 'error', data: '无效的消息格式。' }));
        }
    });

    ws.on('close', () => {
        console.log('客户端已断开连接');
    });

    ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
    });
}
