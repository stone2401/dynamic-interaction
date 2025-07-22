/**
 * 前端状态管理器
 * 负责管理通知模式和交互模式的状态同步
 */

import { NotificationDisplay, NotificationData } from './NotificationDisplay.js';
import { InteractiveSession, SessionData } from './InteractiveSession.js';

export type SessionMode = 'interactive' | 'notification';

export interface WebSocketMessage {
  type: string;
  data?: any;
  sessionId?: string;
  timestamp?: number;
}

export interface StateManagerConfig {
  notificationContainer: HTMLElement;
  sessionContainer: HTMLElement;
  onWebSocketMessage?: (message: WebSocketMessage) => void;
  onFeedbackSubmit?: (feedback: any) => void;
  onNotificationAcknowledge?: (notificationId: string) => void;
}

export class StateManager {
  private notificationDisplay!: NotificationDisplay;
  private interactiveSession!: InteractiveSession;
  private currentMode: SessionMode | null = null;
  private config: StateManagerConfig;

  // 状态存储
  private latestNotification: NotificationData | null = null;
  private currentSession: SessionData | null = null;

  constructor(config: StateManagerConfig) {
    this.config = config;
    this.initializeComponents();
    this.bindEvents();
  }

  private initializeComponents(): void {
    // 初始化通知显示组件
    this.notificationDisplay = new NotificationDisplay({
      container: this.config.notificationContainer,
      className: 'notification-component',
      onAcknowledge: (notificationId: string) => {
        if (this.config.onNotificationAcknowledge) {
          this.config.onNotificationAcknowledge(notificationId);
        }
      }
    });

    // 初始化交互会话组件
    this.interactiveSession = new InteractiveSession({
      container: this.config.sessionContainer,
      className: 'session-component',
      onFeedbackSubmit: (feedback: any) => {
        if (this.config.onFeedbackSubmit) {
          this.config.onFeedbackSubmit(feedback);
        }
      },
      onSessionTimeout: (sessionId: string) => {
        console.warn('会话超时:', sessionId);
        this.handleSessionTimeout(sessionId);
      }
    });

    // 初始状态下都隐藏
    this.notificationDisplay.hide();
    this.interactiveSession.hide();
  }

  private bindEvents(): void {
    // 监听页面刷新事件，尝试恢复状态
    window.addEventListener('beforeunload', this.saveState.bind(this));
    window.addEventListener('load', this.restoreState.bind(this));
  }

  /**
   * 处理WebSocket消息
   */
  public handleWebSocketMessage(message: WebSocketMessage): void {
    console.log('StateManager 收到消息:', message);

    switch (message.type) {
      case 'notification':
        this.handleNotificationMessage(message);
        break;
      
      case 'session_request':
        this.handleSessionRequestMessage(message);
        break;
      
      case 'system_info':
        this.handleSystemInfoMessage(message);
        break;
      
      case 'session_complete':
        this.handleSessionCompleteMessage(message);
        break;
      
      default:
        console.log('未处理的消息类型:', message.type);
        if (this.config.onWebSocketMessage) {
          this.config.onWebSocketMessage(message);
        }
    }
  }

  private handleNotificationMessage(message: WebSocketMessage): void {
    const data = message.data;
    if (!data) return;

    const notificationData: NotificationData = {
      notificationId: data.notificationId,
      summary: data.summary,
      projectDirectory: data.projectDirectory,
      createdAt: data.createdAt || Date.now(),
      acknowledged: false
    };

    this.switchToNotificationMode(notificationData);
  }

  private handleSessionRequestMessage(message: WebSocketMessage): void {
    const data = message.data;
    if (!data) return;

    const sessionData: SessionData = {
      sessionId: data.sessionId,
      summary: data.summary,
      projectDirectory: data.projectDirectory,
      startTime: data.startTime || Date.now(),
      timeoutSeconds: data.timeoutSeconds || 300,
      mode: 'interactive'
    };

    this.switchToInteractiveMode(sessionData);
  }

  private handleSystemInfoMessage(message: WebSocketMessage): void {
    const data = message.data;
    console.log('系统信息:', data);
    
    // 更新状态栏等系统信息
    this.updateSystemInfo(data);
  }

  private handleSessionCompleteMessage(message: WebSocketMessage): void {
    const data = message.data;
    console.log('会话完成:', data);
    
    if (this.currentMode === 'interactive') {
      this.clearInteractiveMode();
    }
  }

  private handleSessionTimeout(sessionId: string): void {
    console.warn('会话超时处理:', sessionId);
    this.clearInteractiveMode();
  }

  /**
   * 切换到通知模式
   */
  private switchToNotificationMode(notificationData: NotificationData): void {
    console.log('切换到通知模式:', notificationData);
    
    // 隐藏交互会话
    this.interactiveSession.hide();
    
    // 显示通知
    this.notificationDisplay.update(notificationData);
    this.notificationDisplay.show();
    
    // 更新状态
    this.currentMode = 'notification';
    this.latestNotification = notificationData;
    
    // 更新页面标题
    this.updatePageTitle('通知模式');
  }

  /**
   * 切换到交互模式
   */
  private switchToInteractiveMode(sessionData: SessionData): void {
    console.log('切换到交互模式:', sessionData);
    
    // 隐藏通知显示
    this.notificationDisplay.hide();
    
    // 显示交互会话
    this.interactiveSession.update(sessionData);
    this.interactiveSession.show();
    
    // 更新状态
    this.currentMode = 'interactive';
    this.currentSession = sessionData;
    
    // 更新页面标题
    this.updatePageTitle('交互模式');
  }

  /**
   * 清除交互模式
   */
  private clearInteractiveMode(): void {
    this.interactiveSession.clear();
    this.interactiveSession.hide();
    this.currentSession = null;
    
    if (this.currentMode === 'interactive') {
      this.currentMode = null;
      this.updatePageTitle('等待中');
    }
  }

  /**
   * 清除通知模式
   */
  private clearNotificationMode(): void {
    this.notificationDisplay.clear();
    this.notificationDisplay.hide();
    this.latestNotification = null;
    
    if (this.currentMode === 'notification') {
      this.currentMode = null;
      this.updatePageTitle('等待中');
    }
  }

  /**
   * 更新系统信息
   */
  private updateSystemInfo(data: any): void {
    // 更新工作区目录
    const workspaceElement = document.getElementById('workspace-directory-value');
    if (workspaceElement && data.workspaceDirectory) {
      workspaceElement.textContent = data.workspaceDirectory;
    }

    // 更新会话ID
    const sessionIdElement = document.getElementById('session-id-value');
    if (sessionIdElement && data.sessionId) {
      sessionIdElement.textContent = data.sessionId;
    }

    // 更新模式指示
    if (data.mode) {
      this.updateModeIndicator(data.mode);
    }
  }

  /**
   * 更新模式指示器
   */
  private updateModeIndicator(mode: SessionMode): void {
    // 可以在状态栏添加模式指示器
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.classList.remove('notification-mode', 'interactive-mode');
      statusBar.classList.add(`${mode}-mode`);
    }
  }

  /**
   * 更新页面标题
   */
  private updatePageTitle(status: string): void {
    document.title = `交互式反馈系统 - ${status}`;
  }

  /**
   * 保存状态到本地存储
   */
  private saveState(): void {
    const state = {
      currentMode: this.currentMode,
      latestNotification: this.latestNotification,
      currentSession: this.currentSession,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('dynamic-interaction-state', JSON.stringify(state));
    } catch (error) {
      console.warn('保存状态失败:', error);
    }
  }

  /**
   * 从本地存储恢复状态
   */
  private restoreState(): void {
    try {
      const stateStr = localStorage.getItem('dynamic-interaction-state');
      if (!stateStr) return;

      const state = JSON.parse(stateStr);
      const age = Date.now() - (state.timestamp || 0);
      
      // 状态超过5分钟就不恢复了
      if (age > 5 * 60 * 1000) {
        localStorage.removeItem('dynamic-interaction-state');
        return;
      }

      // 恢复通知状态
      if (state.currentMode === 'notification' && state.latestNotification) {
        this.switchToNotificationMode(state.latestNotification);
      }

      // 交互会话不恢复，因为可能已经超时
      
    } catch (error) {
      console.warn('恢复状态失败:', error);
      localStorage.removeItem('dynamic-interaction-state');
    }
  }

  /**
   * 获取当前模式
   */
  public getCurrentMode(): SessionMode | null {
    return this.currentMode;
  }

  /**
   * 获取最新通知
   */
  public getLatestNotification(): NotificationData | null {
    return this.latestNotification;
  }

  /**
   * 获取当前会话
   */
  public getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * 手动清除所有状态
   */
  public clearAll(): void {
    this.clearNotificationMode();
    this.clearInteractiveMode();
    this.currentMode = null;
    this.updatePageTitle('等待中');
    localStorage.removeItem('dynamic-interaction-state');
  }

  /**
   * 销毁状态管理器
   */
  public destroy(): void {
    this.notificationDisplay.destroy();
    this.interactiveSession.destroy();
    window.removeEventListener('beforeunload', this.saveState.bind(this));
    window.removeEventListener('load', this.restoreState.bind(this));
  }
}
