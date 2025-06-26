/**
 * WebSocket 通信模块
 * 处理与服务器的 WebSocket 连接和消息传递
 */
import { enableFeedbackInput } from './feedback.js';

// 告诉 TypeScript marked 是一个全局变量 (从CDN加载)
declare namespace marked {
  function parse(markdown: string, options?: any): string;
}

// 定义系统信息接口
interface SystemInfo {
  workspaceDirectory: string;
  sessionId: string;
  serverVersion?: string;
  leaseTimeoutSeconds?: number;
}

// WebSocket 变量和重连配置
let ws: WebSocket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const initialReconnectDelay = 2000; // 2 seconds
const maxReconnectDelay = 10000; // 10 seconds
let reconnectTimeoutId: number | null = null;

const summaryDiv = document.getElementById('summary') as HTMLDivElement;

function connectWebSocket() {
  // 如果正在尝试重连，则清除之前的计时器
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }

  // 更新UI状态为正在连接
  if (window.statusBar) {
    // 只有在第一次之后才显示 "reconnecting"
    if (reconnectAttempts > 0) {
      window.statusBar.updateConnectionStatus('reconnecting');
    }
  }
  summaryDiv.textContent = '正在连接 WebSocket...';
  summaryDiv.style.color = 'inherit';


  ws = new WebSocket(`ws://${window.location.host}`);
  (window as any).ws = ws; // 将WebSocket实例添加到window对象，以便其他模块访问

  ws.onopen = () => {
    console.log('WebSocket 连接已建立');
    summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
    reconnectAttempts = 0; // 连接成功，重置尝试次数

    // 更新连接状态并开始心跳
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('connected');
      window.statusBar.startPingInterval();
    }

    // 告诉服务器客户端已准备就绪
    ws.send(JSON.stringify({ type: 'client_ready' }));

    // 请求系统信息
    setTimeout(requestSystemInfo, 500);
  };

  ws.onmessage = (event: MessageEvent) => {
    console.log('收到消息:', event.data);
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      switch (data.type) {
        case 'summary':
          const summaryData = data as SummaryMessage;
          if (summaryData.data !== undefined && summaryData.data !== null) {
            // 使用 marked.js 解析 Markdown
            summaryDiv.innerHTML = marked.parse(summaryData.data);

            // 更新消息状态并重新启用输入
            if (window.statusBar) {
              window.statusBar.updateMessageStatus('received');
              enableFeedbackInput();
            }
          } else {
            summaryDiv.textContent = 'AI Agent 正在准备摘要...';
            console.warn('收到的摘要消息格式不完整，缺少 "data" 字段。服务器发送的消息:', event.data);
          }
          break;

        case 'server_log':
          const logData = data as ServerLogMessage;
          const { level, text } = logData.data;
          console[level]('%c[Server] ' + text, 'color: grey');
          break;

        case 'pong':
          // 处理延迟计算，传递服务器返回的时间戳数据
          if (window.statusBar) {
            window.statusBar.handlePong(data.data);
          }
          break;

        case 'system_info':
          // 处理系统信息
          if (window.statusBar && data.data) {
            const sysInfo = data.data as SystemInfo;
            window.statusBar.updateSystemInfo(sysInfo);
            if (sysInfo.leaseTimeoutSeconds && sysInfo.leaseTimeoutSeconds > 0) {
              window.statusBar.startSessionTimer(sysInfo.leaseTimeoutSeconds);
            }
          }
          break;

        case 'feedback_status':
          // 更新消息状态并重新启用输入
          if (window.statusBar && data.data && data.data.status) {
            window.statusBar.updateMessageStatus(data.data.status);
            enableFeedbackInput();
          }
          break;

        case 'timeout':
          if (window.statusBar) {
            window.statusBar.updateConnectionStatus('connected');
            window.statusBar.stopSessionTimer();
            window.statusBar.updateMessageStatus('timeout');
          }

          // 禁用输入，因为会话已结束
          const feedbackInput = document.getElementById('feedback-input') as HTMLTextAreaElement;
          if (feedbackInput) {
            feedbackInput.disabled = true;
          }

          const sendButton = document.getElementById('send-button') as HTMLButtonElement;
          if (sendButton) {
            sendButton.disabled = true;
          }
          break;

        default:
          console.log('收到未知类型的消息:', data.type);
          break;
      }
    } catch (e) {
      console.error('解析 WebSocket 消息时出错:', e);
      summaryDiv.textContent = '收到无效消息';
    }
  };

  ws.onclose = () => {
    console.log('WebSocket 连接已关闭');
    // 更新连接状态并停止心跳
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('disconnected');
      window.statusBar.stopSessionTimer();
      window.statusBar.stopPingInterval();
    }
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error('WebSocket 错误:', err);
    // onclose 会在 error 后被调用, 所以重连逻辑会触发
  };
}

function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('已达到最大重连次数，停止重连。');
    summaryDiv.textContent = '无法连接到服务器，请检查网络并刷新页面。';
    summaryDiv.style.color = 'red';
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('disconnected');
    }
    return;
  }

  const delay = Math.min(initialReconnectDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
  console.log(`WebSocket 将在 ${delay / 1000} 秒后尝试重连... (第 ${reconnectAttempts + 1} 次)`);

  if (window.statusBar) {
    window.statusBar.updateConnectionStatus('reconnecting');
  }
  summaryDiv.textContent = '连接已断开，正在尝试重新连接...';
  summaryDiv.style.color = '#ff9500'; // Orange color for warning

  reconnectAttempts++;
  reconnectTimeoutId = window.setTimeout(connectWebSocket, delay);
}

// 导出的函数保持不变
export function sendCommand(command: string): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'command',
      data: command
    }));
    return true;
  } else {
    console.warn('WebSocket 未连接，无法发送命令。');
    // 可以在这里提示用户，或者静默失败
    return false;
  }
}

function requestSystemInfo(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'get_system_info'
    }));
  }
}

export function sendFeedback(text: string, images: CustomImageData[]): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (window.statusBar) {
      window.statusBar.updateMessageStatus('sending');
    }
    ws.send(JSON.stringify({
      type: 'submit_feedback',
      data: {
        text: text,
        imageData: images
      }
    }));
    if (window.statusBar) {
      setTimeout(() => {
        window.statusBar.updateMessageStatus('waiting');
      }, 200);
    }
    return true;
  } else {
    alert('WebSocket 连接已关闭，请刷新页面重试');
    return false;
  }
}

// 初始连接
connectWebSocket();
