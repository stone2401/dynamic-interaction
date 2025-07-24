/**
 * WebSocket 通信服务
 * 处理与服务器的 WebSocket 连接和消息传递
 */

import type { 
  WebSocketMessage, 
  SummaryMessage, 
  ServerLogMessage, 
  SystemInfo,
  CustomImageData 
} from '../core/types.js';
import { WEBSOCKET_CONFIG } from '../config/constants.js';
import { eventBus, APP_EVENTS } from '../core/events.js';
import { notificationService } from './notification.js';

// 告诉 TypeScript marked 是一个全局变量 (从CDN加载)
declare namespace marked {
  function parse(markdown: string, options?: any): string;
}

class WebSocketService {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;

  public initialize(): void {
    this.connectWebSocket();
  }

  public sendCommand(command: string): boolean {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify({
        type: 'command',
        data: command
      }));
      return true;
    }
    console.warn('WebSocket 未连接，无法发送命令。');
    return false;
  }

  public sendFeedback(text: string, images: CustomImageData[]): boolean {
    if (this.isConnected()) {
      eventBus.emit(APP_EVENTS.STATUS_CHANGED, { type: 'message', status: 'sending' });
      
      const imageData = images.map(img => img.dataUrl || img.name);

      this.ws!.send(JSON.stringify({
        type: 'submit_feedback',
        data: { text, imageData }
      }));

      setTimeout(() => {
        eventBus.emit(APP_EVENTS.STATUS_CHANGED, { type: 'message', status: 'waiting' });
      }, 200);

      return true;
    }
    alert('WebSocket 连接已关闭，请刷新页面重试');
    return false;
  }

  private connectWebSocket(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.updateConnectionUI();
    
    this.ws = new WebSocket(`ws://${window.location.host}`);
    (window as any).ws = this.ws; // 保持向后兼容

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => this.handleOpen();
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => this.handleClose();
    this.ws.onerror = (err) => this.handleError(err);
  }

  private handleOpen(): void {
    const summaryDiv = document.getElementById('summary') as HTMLDivElement;
    summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
    
    this.reconnectAttempts = 0;
    eventBus.emit(APP_EVENTS.WS_CONNECTED);

    // 发送客户端就绪消息
    this.ws!.send(JSON.stringify({ type: 'client_ready' }));
    this.checkNotificationPermission();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      eventBus.emit(APP_EVENTS.WS_MESSAGE_RECEIVED, data);
      
      this.processMessage(data);
    } catch (e) {
      console.error('解析 WebSocket 消息时出错:', e);
      const summaryDiv = document.getElementById('summary') as HTMLDivElement;
      summaryDiv.textContent = '收到无效消息';
    }
  }

  private handleClose(): void {
    eventBus.emit(APP_EVENTS.WS_DISCONNECTED);
    this.scheduleReconnect();
  }

  private handleError(err: Event): void {
    console.error('WebSocket 错误:', err);
  }

  private processMessage(data: WebSocketMessage): void {
    const summaryDiv = document.getElementById('summary') as HTMLDivElement;

    switch (data.type) {
      case 'summary':
        this.handleSummaryMessage(data as SummaryMessage, summaryDiv);
        break;

      case 'server_log':
        this.handleServerLogMessage(data as ServerLogMessage);
        break;

      case 'pong':
        this.handlePongMessage(data);
        break;

      case 'system_info':
        this.handleSystemInfoMessage(data);
        break;

      case 'feedback_status':
        this.handleFeedbackStatusMessage(data);
        break;

      case 'timeout':
        this.handleTimeoutMessage();
        break;

      case 'stop_timer':
        this.handleStopTimerMessage();
        break;

      case 'notification':
        this.handleNotificationMessage(data);
        break;

      case 'session_request':
        this.handleSessionRequestMessage(data);
        break;
    }
  }

  private handleSummaryMessage(data: SummaryMessage, summaryDiv: HTMLDivElement): void {
    if (data.data !== undefined && data.data !== null) {
      summaryDiv.innerHTML = marked.parse(data.data);
      eventBus.emit(APP_EVENTS.STATUS_CHANGED, { type: 'message', status: 'received' });
      eventBus.emit(APP_EVENTS.FEEDBACK_SUCCESS);
    } else {
      summaryDiv.textContent = 'AI Agent 正在准备摘要...';
      console.warn('收到的摘要消息格式不完整，缺少 "data" 字段。', data);
    }
  }

  private handleServerLogMessage(data: ServerLogMessage): void {
    const { level, text } = data.data;
    console[level]('%c[Server] ' + text, 'color: grey');
  }

  private handlePongMessage(data: WebSocketMessage): void {
    if (window.statusBar) {
      window.statusBar.handlePong(data.data);
    }
  }

  private handleSystemInfoMessage(data: WebSocketMessage): void {
    if (window.statusBar && data.data) {
      const sysInfo = data.data as SystemInfo;
      window.statusBar.updateSystemInfo(sysInfo);
      
      if (sysInfo.sessionStartTime && sysInfo.leaseTimeoutSeconds && sysInfo.leaseTimeoutSeconds > 0) {
        window.statusBar.startSessionTimer(sysInfo.sessionStartTime, sysInfo.leaseTimeoutSeconds);
      }
    }
  }

  private handleFeedbackStatusMessage(data: WebSocketMessage): void {
    if (window.statusBar && data.data?.status) {
      window.statusBar.updateMessageStatus(data.data.status);
      eventBus.emit(APP_EVENTS.FEEDBACK_SUCCESS);
    }
  }

  private handleTimeoutMessage(): void {
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('connected');
      window.statusBar.stopSessionTimer();
      window.statusBar.updateMessageStatus('timeout');
    }

    // 禁用输入控件
    const feedbackInput = document.getElementById('feedback-input') as HTMLTextAreaElement;
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;
    
    if (feedbackInput) feedbackInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
  }

  private handleStopTimerMessage(): void {
    if (window.statusBar) {
      window.statusBar.stopSessionTimer();
    }
  }

  private handleNotificationMessage(data: WebSocketMessage): void {
    const notificationData = data.data;
    if (!notificationData?.summary) return;

    this.showNotificationPanel(notificationData.summary);
    this.hideInteractionPanel();

    if (notificationService.isPageHidden()) {
      notificationService.showAINotification(notificationData.summary);
    }
  }

  private handleSessionRequestMessage(data: WebSocketMessage): void {
    const sessionData = data.data;
    if (!sessionData?.summary) return;

    this.hideNotificationPanel();
    this.showInteractionPanel();

    const summaryDiv = document.getElementById('summary') as HTMLDivElement;
    summaryDiv.innerHTML = marked.parse(sessionData.summary);

    if (window.statusBar && sessionData.startTime && sessionData.timeoutSeconds) {
      window.statusBar.startSessionTimer(sessionData.startTime, sessionData.timeoutSeconds);
    }

    eventBus.emit(APP_EVENTS.FEEDBACK_SUCCESS);

    if (notificationService.isPageHidden()) {
      notificationService.showSessionRequestNotification(sessionData.summary);
    }
  }

  private showNotificationPanel(summary: string): void {
    const notificationPanel = document.getElementById('notification-panel');
    if (notificationPanel) {
      notificationPanel.style.display = 'block';
      notificationPanel.innerHTML = this.createNotificationHTML(summary);
      
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
    }
  }

  private hideInteractionPanel(): void {
    const feedbackPanel = document.getElementById('feedback-panel');
    if (feedbackPanel) {
      feedbackPanel.style.display = 'none';
    }
  }

  private hideNotificationPanel(): void {
    const notificationPanel = document.getElementById('notification-panel');
    if (notificationPanel) {
      notificationPanel.style.display = 'none';
    }
  }

  private showInteractionPanel(): void {
    const feedbackPanel = document.getElementById('feedback-panel');
    if (feedbackPanel) {
      feedbackPanel.style.display = 'block';
    }
  }

  private createNotificationHTML(summary: string): string {
    return `
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
          <div class="notification-summary">${marked.parse(summary)}</div>
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
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('已达到最大重连次数，停止重连。');
      const summaryDiv = document.getElementById('summary') as HTMLDivElement;
      summaryDiv.textContent = '无法连接到服务器，请检查网络并刷新页面。';
      summaryDiv.style.color = 'red';
      return;
    }

    const delay = Math.min(
      WEBSOCKET_CONFIG.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY
    );

    const summaryDiv = document.getElementById('summary') as HTMLDivElement;
    summaryDiv.textContent = '连接已断开，正在尝试重新连接...';
    summaryDiv.style.color = '#ff9500';

    this.reconnectAttempts++;
    this.reconnectTimeoutId = window.setTimeout(() => this.connectWebSocket(), delay);
  }

  private updateConnectionUI(): void {
    if (this.reconnectAttempts > 0 && window.statusBar) {
      window.statusBar.updateConnectionStatus('reconnecting');
    }
    
    const summaryDiv = document.getElementById('summary') as HTMLDivElement;
    summaryDiv.textContent = '正在连接 WebSocket...';
    summaryDiv.style.color = 'inherit';
  }

  private async checkNotificationPermission(): Promise<void> {
    if (notificationService.checkSupport()) {
      const permission = notificationService.getPermissionStatus();
      if (permission === 'default') {
        await notificationService.requestPermission();
      }
    }
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();

// 全局函数保持向后兼容
(window as any).acknowledgeNotification = function() {
  const notificationPanel = document.getElementById('notification-panel');
  if (notificationPanel) {
    notificationPanel.style.display = 'none';
  }
};