/**
 * 状态栏组件
 * 处理工作区目录、会话ID、连接状态、延迟和消息状态的显示
 */

import type { SystemInfo, ConnectionStatus, MessageStatus } from '../core/types.js';
import { getElementById } from '../utils/dom.js';
import { eventBus, APP_EVENTS } from '../core/events.js';
import { i18nService } from '../services/i18n.js';

const LATENCY_THRESHOLD = {
  NORMAL: 100,
  HIGH: 300
} as const;

class StatusBarComponent {
  private elements: {
    workspaceDirectory?: HTMLElement;
    sessionId?: HTMLElement;
    connectionStatus?: HTMLElement;
    latencyValue?: HTMLElement;
    messageStatus?: HTMLElement;
    statusPulse?: HTMLElement;
    timer?: HTMLElement;
    timerValue?: HTMLElement;
  } = {};

  private state = {
    lastPingSent: 0,
    pingInterval: 0,
    currentLatency: 0,
    systemInfo: {
      workspaceDirectory: i18nService.t('feedback.messages.unknownDirectory'),
      sessionId: i18nService.t('feedback.messages.unknown'),
    } as SystemInfo,
    connectionStatus: 'disconnected' as ConnectionStatus,
    messageStatus: 'idle' as MessageStatus,
    sessionTimerInterval: null as number | null,
  };

  public initialize(): void {
    this.initializeElements();
    this.setupEventListeners();
    this.updateConnectionStatus('disconnected');
    this.updateMessageStatus('idle');
  }

  public updateSystemInfo(info: SystemInfo): void {
    this.state.systemInfo = { ...this.state.systemInfo, ...info };

    if (this.elements.workspaceDirectory) {
      this.elements.workspaceDirectory.textContent = this.state.systemInfo.workspaceDirectory;
      this.elements.workspaceDirectory.title = this.state.systemInfo.workspaceDirectory;
    }

    if (this.elements.sessionId) {
      this.elements.sessionId.textContent = this.state.systemInfo.sessionId;
    }
  }

  public updateConnectionStatus(status: ConnectionStatus): void {
    this.state.connectionStatus = status;

    if (this.elements.connectionStatus && this.elements.statusPulse) {
      const statusClasses = ['connected', 'disconnected', 'high-latency', 'reconnecting'];
      
      statusClasses.forEach(cls => {
        this.elements.connectionStatus!.classList.remove(cls);
        this.elements.statusPulse!.classList.remove(cls);
      });

      this.elements.connectionStatus.classList.add(status);
      this.elements.statusPulse.classList.add(status);

      const statusTexts = {
        connected: i18nService.t('status.connectionStatus.connected'),
        disconnected: i18nService.t('status.connectionStatus.disconnected'),
        'high-latency': i18nService.t('status.connectionStatus.highLatency'),
        reconnecting: i18nService.t('status.connectionStatus.reconnecting')
      };

      this.elements.connectionStatus.textContent = statusTexts[status];

      if (status === 'disconnected' || status === 'reconnecting') {
        this.resetLatencyDisplay();
      }
    }

    eventBus.emit(APP_EVENTS.STATUS_CHANGED, { type: 'connection', status });
  }

  public updateLatency(latency: number): void {
    this.state.currentLatency = latency;

    if (this.elements.latencyValue) {
      const latencyClasses = ['normal', 'medium', 'high'];
      latencyClasses.forEach(cls => this.elements.latencyValue!.classList.remove(cls));

      if (latency < LATENCY_THRESHOLD.NORMAL) {
        this.elements.latencyValue.classList.add('normal');
      } else if (latency < LATENCY_THRESHOLD.HIGH) {
        this.elements.latencyValue.classList.add('medium');
      } else {
        this.elements.latencyValue.classList.add('high');
      }

      this.elements.latencyValue.textContent = `${latency}ms`;

      if (latency >= LATENCY_THRESHOLD.HIGH) {
        this.updateConnectionStatus('high-latency');
      } else if (this.state.connectionStatus !== 'disconnected') {
        this.updateConnectionStatus('connected');
      }
    }
  }

  public updateMessageStatus(status: MessageStatus): void {
    this.state.messageStatus = status;

    if (this.elements.messageStatus) {
      const messageClasses = ['idle', 'sending', 'waiting', 'received', 'timeout'];
      messageClasses.forEach(cls => this.elements.messageStatus!.classList.remove(cls));
      
      this.elements.messageStatus.classList.add(status);

      const statusTexts = {
        idle: i18nService.t('status.messageStatus.idle'),
        sending: i18nService.t('status.messageStatus.sending'),
        waiting: i18nService.t('status.messageStatus.waiting'),
        received: i18nService.t('status.messageStatus.received'),
        timeout: i18nService.t('status.messageStatus.timeout')
      };

      this.elements.messageStatus.textContent = statusTexts[status];
    }
  }

  public startSessionTimer(sessionStartTime: number, totalDurationSeconds: number): void {
    if (!this.elements.timer || !this.elements.timerValue) return;

    this.stopSessionTimer();

    const sessionEndTime = sessionStartTime + totalDurationSeconds * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remainingMilliseconds = sessionEndTime - now;
      const remainingSeconds = Math.max(0, Math.floor(remainingMilliseconds / 1000));

      this.elements.timerValue!.textContent = this.formatTime(remainingSeconds);

      if (remainingSeconds <= 0) {
        this.stopSessionTimer();
        this.updateMessageStatus('timeout');
      }
    };

    this.elements.timer.style.display = 'flex';
    updateTimer();
    this.state.sessionTimerInterval = window.setInterval(updateTimer, 1000);
  }

  public stopSessionTimer(): void {
    if (this.state.sessionTimerInterval) {
      clearInterval(this.state.sessionTimerInterval);
      this.state.sessionTimerInterval = null;
    }

    if (this.elements.timer && this.elements.timerValue) {
      if (this.state.messageStatus !== 'timeout') {
        this.elements.timer.style.display = 'none';
        this.elements.timerValue.textContent = '--:--';
      } else {
        this.elements.timer.style.display = 'flex';
        this.elements.timerValue.textContent = i18nService.t('feedback.messages.timeout');
      }
    }
  }

  public startPingInterval(): void {
    if (this.state.pingInterval) {
      clearInterval(this.state.pingInterval);
    }
    
    this.sendPing();
    this.state.pingInterval = window.setInterval(() => this.sendPing(), 5000);
  }

  public stopPingInterval(): void {
    if (this.state.pingInterval) {
      clearInterval(this.state.pingInterval);
      this.state.pingInterval = 0;
    }
  }

  public handlePong(data?: { timestamp?: number }): void {
    const now = Date.now();
    const latency = data?.timestamp ? now - data.timestamp : now - this.state.lastPingSent;

    this.updateLatency(latency);

    if (latency < LATENCY_THRESHOLD.HIGH) {
      this.updateConnectionStatus('connected');
    }
  }

  private initializeElements(): void {
    this.elements = {
      workspaceDirectory: getElementById('workspace-directory-value') || undefined,
      sessionId: getElementById('session-id-value') || undefined,
      connectionStatus: getElementById('connection-status-value') || undefined,
      latencyValue: getElementById('latency-value') || undefined,
      messageStatus: getElementById('message-status-value') || undefined,
      statusPulse: getElementById('status-pulse') || undefined,
      timer: getElementById('session-timer') || undefined,
      timerValue: getElementById('session-timer-value') || undefined,
    };
  }

  private setupEventListeners(): void {
    eventBus.on(APP_EVENTS.WS_CONNECTED, () => {
      this.updateConnectionStatus('connected');
      this.startPingInterval();
    });

    eventBus.on(APP_EVENTS.WS_DISCONNECTED, () => {
      this.updateConnectionStatus('disconnected');
      this.stopSessionTimer();
      this.stopPingInterval();
    });
  }

  private resetLatencyDisplay(): void {
    if (this.elements.latencyValue) {
      this.elements.latencyValue.textContent = '-- ms';
      this.elements.latencyValue.classList.remove('normal', 'medium', 'high');
    }
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private sendPing(): void {
    if ((window as any).ws && (window as any).ws.readyState === WebSocket.OPEN) {
      this.state.lastPingSent = Date.now();
      (window as any).ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}

export const statusBarComponent = new StatusBarComponent();

// 扩展全局 Window 接口以保持向后兼容
declare global {
  interface Window {
    statusBar: {
      updateSystemInfo: typeof statusBarComponent.updateSystemInfo;
      updateConnectionStatus: typeof statusBarComponent.updateConnectionStatus;
      updateLatency: typeof statusBarComponent.updateLatency;
      updateMessageStatus: typeof statusBarComponent.updateMessageStatus;
      handlePong: typeof statusBarComponent.handlePong;
      startSessionTimer: typeof statusBarComponent.startSessionTimer;
      stopSessionTimer: typeof statusBarComponent.stopSessionTimer;
      startPingInterval: typeof statusBarComponent.startPingInterval;
      stopPingInterval: typeof statusBarComponent.stopPingInterval;
    };
  }
}

// 将组件方法绑定到全局对象以保持向后兼容
window.statusBar = {
  updateSystemInfo: statusBarComponent.updateSystemInfo.bind(statusBarComponent),
  updateConnectionStatus: statusBarComponent.updateConnectionStatus.bind(statusBarComponent),
  updateLatency: statusBarComponent.updateLatency.bind(statusBarComponent),
  updateMessageStatus: statusBarComponent.updateMessageStatus.bind(statusBarComponent),
  handlePong: statusBarComponent.handlePong.bind(statusBarComponent),
  startSessionTimer: statusBarComponent.startSessionTimer.bind(statusBarComponent),
  stopSessionTimer: statusBarComponent.stopSessionTimer.bind(statusBarComponent),
  startPingInterval: statusBarComponent.startPingInterval.bind(statusBarComponent),
  stopPingInterval: statusBarComponent.stopPingInterval.bind(statusBarComponent),
};