/**
 * 通知显示组件
 * 用于显示来自Agent的通知消息，不需要用户响应
 */

import { BaseComponent, ComponentConfig } from './BaseComponent.js';

export interface NotificationData {
  notificationId: string;
  summary: string;
  projectDirectory: string;
  createdAt: number;
  acknowledged?: boolean;
}

export interface NotificationDisplayConfig extends ComponentConfig {
  onAcknowledge?: (notificationId: string) => void;
}

export class NotificationDisplay extends BaseComponent {
  private notificationData: NotificationData | null = null;
  private onAcknowledge?: (notificationId: string) => void;
  
  // DOM 元素引用
  private summaryElement!: HTMLElement;
  private timestampElement!: HTMLElement;
  private acknowledgeButton!: HTMLButtonElement;
  private statusIndicator!: HTMLElement;

  constructor(config: NotificationDisplayConfig) {
    super(config);
    this.onAcknowledge = config.onAcknowledge;
  }

  protected createElement(config: ComponentConfig): HTMLElement {
    const element = document.createElement('div');
    element.className = `notification-display ${config.className || ''}`;
    if (config.id) {
      element.id = config.id;
    }

    element.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">
          <i data-lucide="bell" class="icon notification-icon"></i>
          <span>AI 通知</span>
          <span class="notification-badge">通知模式</span>
        </div>
        <div class="notification-status">
          <span class="status-indicator unacknowledged"></span>
          <span class="status-text">新通知</span>
        </div>
      </div>
      <hr class="notification-divider">
      <div class="notification-content">
        <div class="notification-summary"></div>
        <div class="notification-meta">
          <div class="notification-timestamp">
            <i data-lucide="clock" class="icon"></i>
            <span class="timestamp-text">--</span>
          </div>
          <div class="notification-actions">
            <button class="acknowledge-btn" type="button">
              <i data-lucide="check" class="icon"></i>
              已知晓
            </button>
          </div>
        </div>
      </div>
    `;

    // 获取关键元素的引用
    this.summaryElement = element.querySelector('.notification-summary')!;
    this.timestampElement = element.querySelector('.timestamp-text')!;
    this.acknowledgeButton = element.querySelector('.acknowledge-btn')! as HTMLButtonElement;
    this.statusIndicator = element.querySelector('.status-indicator')!;

    return element;
  }

  protected bindEvents(): void {
    this.acknowledgeButton.addEventListener('click', this.handleAcknowledge.bind(this));
  }

  protected unbindEvents(): void {
    this.acknowledgeButton.removeEventListener('click', this.handleAcknowledge.bind(this));
  }

  private handleAcknowledge(): void {
    if (this.notificationData && this.onAcknowledge) {
      this.onAcknowledge(this.notificationData.notificationId);
      this.markAsAcknowledged();
    }
  }

  private markAsAcknowledged(): void {
    if (this.notificationData) {
      this.notificationData.acknowledged = true;
      this.updateAcknowledgeStatus();
    }
  }

  private updateAcknowledgeStatus(): void {
    const statusText = this.element.querySelector('.status-text')!;
    
    if (this.notificationData?.acknowledged) {
      this.statusIndicator.className = 'status-indicator acknowledged';
      statusText.textContent = '已知晓';
      this.acknowledgeButton.disabled = true;
      this.acknowledgeButton.innerHTML = `
        <i data-lucide="check-circle" class="icon"></i>
        已确认
      `;
    } else {
      this.statusIndicator.className = 'status-indicator unacknowledged';
      statusText.textContent = '新通知';
      this.acknowledgeButton.disabled = false;
      this.acknowledgeButton.innerHTML = `
        <i data-lucide="check" class="icon"></i>
        已知晓
      `;
    }

    // 重新创建图标
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  public update(data: NotificationData): void {
    this.notificationData = data;
    
    // 更新摘要内容
    if (typeof (window as any).marked !== 'undefined') {
      this.summaryElement.innerHTML = (window as any).marked.parse(data.summary);
    } else {
      this.summaryElement.textContent = data.summary;
    }

    // 更新时间戳
    this.updateTimestamp(data.createdAt);

    // 更新确认状态
    this.updateAcknowledgeStatus();

    // 显示组件
    this.show();

    // 重新创建图标
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  private updateTimestamp(timestamp: number): void {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeText: string;
    if (diffMins < 1) {
      timeText = '刚刚';
    } else if (diffMins < 60) {
      timeText = `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      timeText = `${diffHours}小时前`;
    } else if (diffDays < 7) {
      timeText = `${diffDays}天前`;
    } else {
      timeText = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    this.timestampElement.textContent = timeText;
    this.timestampElement.title = date.toLocaleString('zh-CN');
  }

  /**
   * 获取当前通知数据
   */
  public getNotificationData(): NotificationData | null {
    return this.notificationData;
  }

  /**
   * 清空通知内容
   */
  public clear(): void {
    this.notificationData = null;
    this.summaryElement.innerHTML = '';
    this.timestampElement.textContent = '--';
    this.hide();
  }
}
