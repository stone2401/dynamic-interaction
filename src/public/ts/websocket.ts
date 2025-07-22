/**
 * WebSocket 通信模块
 * 处理与服务器的 WebSocket 连接和消息传递
 */
import { enableFeedbackInput } from './feedback.js';
import { notificationService } from './notificationService.js';
import { NotificationConfig } from './config.js';

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
  sessionStartTime?: number; // 会话开始时间的时间戳
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

    summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
    reconnectAttempts = 0; // 连接成功，重置尝试次数

    // 连接成功后，启动心跳并通知后端客户端已就绪
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('connected');
      window.statusBar.startPingInterval();
    }

    // 发送客户端就绪消息，请求包含剩余时间的系统信息
    ws.send(JSON.stringify({ type: 'client_ready' }));

    // 检查通知权限
    checkNotificationPermission();
  };

  ws.onmessage = (event: MessageEvent) => {

    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      console.log(data);
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
            // 使用新的计时器逻辑
            if (sysInfo.sessionStartTime && sysInfo.leaseTimeoutSeconds && sysInfo.leaseTimeoutSeconds > 0) {
              window.statusBar.startSessionTimer(sysInfo.sessionStartTime, sysInfo.leaseTimeoutSeconds);
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

        case 'stop_timer':
          if (window.statusBar) {
            window.statusBar.stopSessionTimer();
          }
          break;

        case 'notification':
          // 处理通知消息
          const notificationData = data.data;
          if (notificationData && notificationData.summary) {
            // 在通知面板中显示通知
            const notificationPanel = document.getElementById('notification-panel');
            if (notificationPanel) {
              notificationPanel.style.display = 'block';
              notificationPanel.innerHTML = `
                <div class="notification-display">
                  <div class="notification-header">
                    <div class="notification-title">
                      <i data-lucide="bell" class="icon notification-icon"></i>
                      <span>AI 通知</span>
                      <span class="notification-badge">通知模式</span>
                    </div>
                  </div>
                  <hr class="notification-divider">
                  <div class="notification-content">
                    <div class="notification-summary">${marked.parse(notificationData.summary)}</div>
                    <div class="notification-meta">
                      <div class="notification-timestamp">
                        <i data-lucide="clock" class="icon"></i>
                        <span>刚刚</span>
                      </div>
                      <div class="notification-actions">
                        <button class="acknowledge-btn" onclick="acknowledgeNotification()">
                          <i data-lucide="check" class="icon"></i>
                          已知晓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              
              // 重新创建图标
              if (typeof (window as any).lucide !== 'undefined') {
                (window as any).lucide.createIcons();
              }
            }
            
            // 隐藏交互面板
            const feedbackPanel = document.getElementById('feedback-panel');
            if (feedbackPanel) {
              feedbackPanel.style.display = 'none';
            }
            
            // 如果标签页不活跃，显示浏览器通知
            if (document.hidden && notificationData.summary) {
              notificationService.showAINotification(notificationData.summary);
            }
          }
          break;

        case 'session_request':
          // 处理交互会话请求
          const sessionData = data.data;
          if (sessionData && sessionData.summary) {
            // 显示交互面板
            const feedbackPanel = document.getElementById('feedback-panel');
            const notificationPanel = document.getElementById('notification-panel');
            
            if (notificationPanel) {
              notificationPanel.style.display = 'none';
            }
            
            if (feedbackPanel) {
              feedbackPanel.style.display = 'block';
            }
            
            // 更新摘要内容
            summaryDiv.innerHTML = marked.parse(sessionData.summary);
            
            // 启动会话计时器
            if (window.statusBar && sessionData.startTime && sessionData.timeoutSeconds) {
              window.statusBar.startSessionTimer(sessionData.startTime, sessionData.timeoutSeconds);
            }
            
            // 启用输入
            enableFeedbackInput();
            
            // 如果标签页不活跃，显示浏览器通知
            if (document.hidden && sessionData.summary) {
              notificationService.showSessionRequestNotification(sessionData.summary);
            }
          }
          break;

        default:

          break;
      }
    } catch (e) {
      console.error('解析 WebSocket 消息时出错:', e);
      summaryDiv.textContent = '收到无效消息';
    }
  };

  ws.onclose = () => {

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
    let image: string[] = [];
    images.forEach(img => {
      if (img.dataUrl) {
        image.push(img.dataUrl);
      } else {
        image.push(img.name);
      }
    });

    ws.send(JSON.stringify({
      type: 'submit_feedback',
      data: {
        text: text,
        imageData: image
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

/**
 * 检查通知权限
 * 如果权限状态为默认，则请求权限
 */
async function checkNotificationPermission() {
  if (notificationService.checkSupport()) {
    const permission = notificationService.getPermissionStatus();
    
    if (permission === 'default') {
      await notificationService.requestPermission();
    }
  }
}

// 添加页面可见性变化事件监听
document.addEventListener('visibilitychange', () => {
  // 当页面变为可见时，取消所有通知
  if (!document.hidden) {
    // 在某些浏览器中，可以通过 Notification.close() 关闭通知
    // 但这不是标准API，所以我们不实现这个功能
  }
});

// 添加全局函数用于通知确认
(window as any).acknowledgeNotification = function() {
  const notificationPanel = document.getElementById('notification-panel');
  if (notificationPanel) {
    notificationPanel.style.display = 'none';
  }
};

// 初始连接
connectWebSocket();
