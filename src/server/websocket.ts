/**
 * WebSocket 服务器配置
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { exec } from 'child_process';
import { server } from './express'; // HTTP server from express.ts

// 创建 WebSocket 服务器
export const wss = new WebSocketServer({ server });

// 跟踪所有活动的 WebSocket 连接 (可选，如果 MCP <-> Server 交互模型不需要广播)
export const activeSockets = new Set<WebSocket>();

import { UserFeedback } from '../types/feedback';
import { WEBSOCKET_SESSION_TIMEOUT_SECONDS } from '../config'; // 导入新的配置

interface PendingSessionRequest {
    summary: string;
    projectDirectory: string;
    resolve: (feedback: UserFeedback) => void;
    reject: (error: any) => void;
    ws?: WebSocket; // 关联的 WebSocket 连接
}

let pendingSessionRequest: PendingSessionRequest | null = null;

// 内部函数，处理单个 WebSocket 连接的完整逻辑
function _handleWebSocketConnectionLogic(
    ws: WebSocket,
    req: IncomingMessage,
    summary: string,
    projectDirectory: string, // projectDirectory 可能用于命令执行的上下文
    resolvePromise: (feedback: UserFeedback) => void,
    rejectPromise: (error: any) => void
) {
    console.log(`客户端已连接，会话开始。项目目录: ${projectDirectory}`);
    activeSockets.add(ws);

    // 在收到客户端准备就绪的消息前，不立即发送摘要，避免消息在客户端尚未准备时丢失。
    let summarySent = false;

    let collectedFeedback: UserFeedback = {};

    ws.on('message', (message: string) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('服务器收到消息:', parsedMessage);

            switch (parsedMessage.type) {
                case 'client_ready':
                    console.log('客户端已准备就绪，发送摘要。', summary);
                    if (!summarySent) {
                        ws.send(JSON.stringify({ type: 'summary', data: summary }));
                        summarySent = true;
                    }
                    break;

                case 'command':
                    if (typeof parsedMessage.data === 'string') {
                        exec(parsedMessage.data, { cwd: projectDirectory }, (error, stdout, stderr) => {
                            if (error) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `错误: ${error.message}` }));
                                collectedFeedback.commandOutput = `Error: ${error.message}`; // Optionally collect command errors
                                return;
                            }
                            if (stderr) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `标准错误: ${stderr}` }));
                                collectedFeedback.commandOutput = `Stderr: ${stderr}`; // Optionally collect stderr
                                return;
                            }
                            ws.send(JSON.stringify({ type: 'command_result', data: stdout }));
                            collectedFeedback.commandOutput = stdout;
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', data: '无效的命令格式。' }));
                    }
                    break;

                case 'composite_feedback': // This case might be deprecated if 'submit_feedback' is used
                    const { text, imageData } = parsedMessage.data;
                    console.log('服务器收到复合反馈:');
                    if (text) {
                        console.log('  文本:', text);
                        collectedFeedback.text = text;
                    }
                    if (imageData) { // imageData can be a string or an array of strings
                        console.log('  图片数据存在');
                        collectedFeedback.imageData = imageData;
                    }

                    resolvePromise(collectedFeedback);
                    ws.close();
                    break;

                case 'submit_feedback': // Expecting frontend to send this when user is done
                    console.log('服务器收到提交反馈信号:', parsedMessage.data);
                    // parsedMessage.data should contain all feedback parts (text, imageData etc.)
                    collectedFeedback = { ...collectedFeedback, ...parsedMessage.data };
                    resolvePromise(collectedFeedback);
                    ws.send(JSON.stringify({ type: 'info', data: '反馈已提交并处理完毕。' }));
                    ws.close();
                    break;

                default:
                    ws.send(JSON.stringify({ type: 'error', data: '未知的消息类型。' }));
            }
        } catch (e: any) {
            console.error('服务器无法解析或处理消息:', e);
            ws.send(JSON.stringify({ type: 'error', data: `无效的消息格式: ${e.message}` }));
        }
    });

    ws.on('close', () => {
        console.log('客户端已断开连接');
        activeSockets.delete(ws);
        if (pendingSessionRequest && pendingSessionRequest.ws === ws) {
            rejectPromise(new Error('WebSocket 连接在反馈完成前关闭。'));
            pendingSessionRequest = null;
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
        activeSockets.delete(ws);
        if (pendingSessionRequest && pendingSessionRequest.ws === ws) {
            rejectPromise(error);
            pendingSessionRequest = null;
        }
    });
}


/**
 * 由 MCP 调用以请求一个新的用户反馈会话。
 * @param summary 要显示给用户的摘要。
 * @param projectDirectory 项目目录，用于命令执行等。
 * @returns 一个 Promise，该 Promise 将在用户反馈收集完毕后解析。
 */
export function requestFeedbackSession(summary: string, projectDirectory: string): Promise<UserFeedback> {
    return new Promise((resolve, reject) => {
        if (pendingSessionRequest && pendingSessionRequest.ws && activeSockets.has(pendingSessionRequest.ws)) {
            return reject(new Error('当前已有正在进行的反馈会话。'));
        }

        console.log(`新的反馈会话被请求: summary="${summary}", projectDir="${projectDirectory}"`);
        pendingSessionRequest = { summary, projectDirectory, resolve, reject };

        const timeoutMilliseconds = WEBSOCKET_SESSION_TIMEOUT_SECONDS * 1000; // 转换为毫秒

        const timeoutId = setTimeout(() => {
            if (pendingSessionRequest && !pendingSessionRequest.ws) {
                console.warn(`反馈会话请求超时（${WEBSOCKET_SESSION_TIMEOUT_SECONDS}秒），没有客户端连接。`);
                pendingSessionRequest.reject(new Error(`反馈会话请求超时（${WEBSOCKET_SESSION_TIMEOUT_SECONDS}秒），没有客户端连接。`));
                pendingSessionRequest = null;
            }
        }, timeoutMilliseconds); // 使用配置的超时时间

        const originalResolve = pendingSessionRequest.resolve;
        const originalReject = pendingSessionRequest.reject;

        pendingSessionRequest.resolve = (value) => {
            clearTimeout(timeoutId);
            originalResolve(value);
        };
        pendingSessionRequest.reject = (reason) => {
            clearTimeout(timeoutId);
            originalReject(reason);
        };
    });
}

/**
 * 配置 WebSocket 服务器
 */
export function configureWebSocketServer(): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        if (pendingSessionRequest && !pendingSessionRequest.ws) {
            pendingSessionRequest.ws = ws;

            _handleWebSocketConnectionLogic(
                ws,
                req,
                pendingSessionRequest.summary,
                pendingSessionRequest.projectDirectory,
                (feedback) => {
                    if (pendingSessionRequest) {
                        pendingSessionRequest.resolve(feedback);
                        pendingSessionRequest = null;
                    }
                },
                (error) => {
                    if (pendingSessionRequest) {
                        pendingSessionRequest.reject(error);
                        pendingSessionRequest = null;
                    }
                }
            );
        } else if (pendingSessionRequest && pendingSessionRequest.ws) {
            console.log('已有反馈会话正在进行中，新连接被拒绝。');
            ws.send(JSON.stringify({ type: 'error', data: '服务器正忙，请稍后再试。' }));
            ws.close();
        } else {
            console.log('没有待处理的反馈会话请求，新连接被拒绝。');
            ws.send(JSON.stringify({ type: 'info', data: '目前没有活动的反馈请求。' }));
            ws.close();
        }
    });

    console.log('WebSocket 服务器已配置并监听连接。');
}
