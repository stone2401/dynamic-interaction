/**
 * 交互会话组件
 * 用于显示需要用户响应的交互会话，包含倒计时、输入控件等
 */

import { BaseComponent, ComponentConfig } from './BaseComponent.js';

export interface SessionData {
  sessionId: string;
  summary: string;
  projectDirectory: string;
  startTime: number;
  timeoutSeconds: number;
  mode: 'interactive';
}

export interface InteractiveSessionConfig extends ComponentConfig {
  onFeedbackSubmit?: (feedback: any) => void;
  onSessionTimeout?: (sessionId: string) => void;
}

export class InteractiveSession extends BaseComponent {
  private sessionData: SessionData | null = null;
  private onFeedbackSubmit?: (feedback: any) => void;
  private onSessionTimeout?: (sessionId: string) => void;
  // DOM 元素引用
  private summaryElement!: HTMLElement;
  private feedbackInput!: HTMLElement;
  private submitButton!: HTMLButtonElement;
  private timerElement!: HTMLElement;
  private dropZone!: HTMLElement;
  private imagePreviewContainer!: HTMLElement;
  
  private countdownInterval?: number;
  private timeoutTimer?: number;

  constructor(config: InteractiveSessionConfig) {
    super(config);
    this.onFeedbackSubmit = config.onFeedbackSubmit;
    this.onSessionTimeout = config.onSessionTimeout;
  }

  /**
   * 创建组件DOM元素
   */
  protected createElement(config: ComponentConfig): HTMLElement {
    const element = document.createElement('div');
    element.className = `interactive-session ${config.className || ''}`;
    if (config.id) {
      element.id = config.id;
    }

    element.innerHTML = `
      <div class="session-header">
        <div class="session-title">
          <i data-lucide="message-square" class="icon session-icon"></i>
          <span>AI 工作摘要</span>
          <span class="session-badge">交互模式</span>
        </div>
        <div class="session-timer">
          <i data-lucide="timer" class="icon"></i>
          <span class="timer-text">剩余时间: </span>
          <span class="timer-value">--:--</span>
        </div>
      </div>
      <hr class="session-divider">
      
      <div class="session-content">
        <div class="session-summary"></div>
      </div>

      <div class="feedback-section">
        <div class="feedback-header">
          <h3>
            <i data-lucide="corner-down-left" class="icon"></i>
            提供反馈
          </h3>
          <button class="submit-feedback-btn" type="button">
            <i data-lucide="send" class="icon"></i>
            提交反馈
          </button>
        </div>
        <hr class="feedback-divider">

        <div class="feedback-input-section">
          <label for="feedback-input">文字反馈</label>
          <div class="feedback-input" contenteditable="true" placeholder="请在这里输入您的指示或回复..."></div>
        </div>

        <div class="hints-section">
          <p>小提示:</p>
          <ul>
            <li>按 Ctrl+Enter (或 Cmd+Enter) 可快速提交</li>
            <li>支持 Ctrl+V (或 Cmd+V) 粘贴图片</li>
          </ul>
        </div>

        <div class="attachment-section">
          <label>图片附件 (可选)</label>
          <div class="drop-zone">
            <div class="drop-zone-text">
              <i data-lucide="paperclip" class="icon"></i>
              <p>点击选择或拖拽图片到此处</p>
              <span>支持 PNG, JPG, GIF, WebP 等格式</span>
            </div>
          </div>
          <div class="image-preview-container"></div>
        </div>
      </div>
    `;

    // 获取关键元素的引用
    this.summaryElement = element.querySelector('.session-summary')!;
    this.feedbackInput = element.querySelector('.feedback-input')!;
    this.submitButton = element.querySelector('.submit-feedback-btn')! as HTMLButtonElement;
    this.timerElement = element.querySelector('.timer-value')!;
    this.dropZone = element.querySelector('.drop-zone')!;
    this.imagePreviewContainer = element.querySelector('.image-preview-container')!;

    return element;
  }

  protected bindEvents(): void {
    this.submitButton.addEventListener('click', this.handleSubmitFeedback.bind(this));
    this.feedbackInput.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.feedbackInput.addEventListener('paste', this.handlePaste.bind(this));
    this.dropZone.addEventListener('click', this.handleDropZoneClick.bind(this));
    this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
    this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
  }

  protected unbindEvents(): void {
    this.submitButton.removeEventListener('click', this.handleSubmitFeedback.bind(this));
    this.feedbackInput.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.feedbackInput.removeEventListener('paste', this.handlePaste.bind(this));
    this.dropZone.removeEventListener('click', this.handleDropZoneClick.bind(this));
    this.dropZone.removeEventListener('dragover', this.handleDragOver.bind(this));
    this.dropZone.removeEventListener('drop', this.handleDrop.bind(this));
    
    this.clearTimers();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.handleSubmitFeedback();
    }
  }

  private handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          this.handleImageFile(file);
        }
      }
    }
  }

  private handleDropZoneClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => this.handleImageFile(file));
      }
    };
    input.click();
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dropZone.classList.add('drag-over');
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer?.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          this.handleImageFile(file);
        }
      });
    }
  }

  private handleImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.addImagePreview(result, file.name);
    };
    reader.readAsDataURL(file);
  }

  private addImagePreview(dataUrl: string, filename: string): void {
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.innerHTML = `
      <img src="${dataUrl}" alt="${filename}" class="preview-image">
      <div class="image-info">
        <span class="image-name">${filename}</span>
        <button class="remove-image-btn" type="button">
          <i data-lucide="x" class="icon"></i>
        </button>
      </div>
    `;

    const removeBtn = previewDiv.querySelector('.remove-image-btn')!;
    removeBtn.addEventListener('click', () => {
      previewDiv.remove();
    });

    this.imagePreviewContainer.appendChild(previewDiv);

    // 重新创建图标
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  private handleSubmitFeedback(): void {
    const textFeedback = this.feedbackInput.textContent?.trim() || '';
    const imageElements = this.imagePreviewContainer.querySelectorAll('.preview-image');
    const imageData: string[] = [];

    imageElements.forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src.startsWith('data:')) {
        imageData.push(src);
      }
    });

    const feedback = {
      text: textFeedback,
      imageData: imageData.length > 0 ? imageData : undefined,
      sessionId: this.sessionData?.sessionId
    };

    if (this.onFeedbackSubmit) {
      this.onFeedbackSubmit(feedback);
    }

    // 清空输入
    this.clearInput();
  }

  private clearInput(): void {
    this.feedbackInput.textContent = '';
    this.imagePreviewContainer.innerHTML = '';
  }

  /**
   * 开始倒计时
   * 修复: 使用消息创建时间而不是WebSocket连接时间
   */
  private startCountdown(): void {
    if (!this.sessionData) return;
    
    this.clearCountdown();
    
    const updateTimer = () => {
      if (!this.sessionData) return;
      
      const now = Date.now();
      // 使用消息的startTime（PendingSessionRequest的createdAt）而不是连接时间
      const messageStartTime = this.sessionData.startTime;
      const elapsed = Math.floor((now - messageStartTime) / 1000);
      const remaining = Math.max(0, this.sessionData.timeoutSeconds - elapsed);
      
      this.updateTimerDisplay(remaining);
      
      if (remaining <= 0) {
        this.handleTimeout();
        return;
      }
    };
    
    // 立即更新一次
    updateTimer();
    
    // 每秒更新
    this.countdownInterval = window.setInterval(updateTimer, 1000);
  }

  private updateTimerDisplay(remaining: number): void {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 最后30秒变红色警告
    if (remaining <= 30) {
      this.timerElement.classList.add('warning');
    }
  }

  private handleTimeout(): void {
    this.clearTimers();
    this.timerElement.textContent = '00:00';
    this.timerElement.classList.add('expired');
    
    // 禁用输入
    this.feedbackInput.contentEditable = 'false';
    this.submitButton.disabled = true;
    this.dropZone.style.pointerEvents = 'none';

    if (this.sessionData && this.onSessionTimeout) {
      this.onSessionTimeout(this.sessionData.sessionId);
    }
  }

  private clearTimers(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  private clearCountdown(): void {
    this.feedbackInput.contentEditable = 'true';
    this.submitButton.disabled = false;
    this.dropZone.style.pointerEvents = '';
    this.timerElement.classList.remove('warning', 'expired');

    // 清空之前的输入
    this.clearInput();

    // 启动倒计时
    this.clearTimers();
    this.startCountdown();

    // 显示组件
    this.show();

    // 重新创建图标
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  /**
   * 更新组件状态
   */
  public update(data: SessionData): void {
    this.sessionData = data;
    
    // 更新摘要内容
    if (typeof (window as any).marked !== 'undefined') {
      this.summaryElement.innerHTML = (window as any).marked.parse(data.summary);
    } else {
      this.summaryElement.textContent = data.summary;
    }

    // 重置输入状态
    this.feedbackInput.contentEditable = 'true';
    this.submitButton.disabled = false;
    this.dropZone.style.pointerEvents = '';
    this.timerElement.classList.remove('warning', 'expired');

    // 清空之前的输入
    this.clearInput();

    // 启动倒计时
    this.clearTimers();
    this.startCountdown();

    // 显示组件
    this.show();

    // 重新创建图标
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  public destroy(): void {
    this.clearTimers();
    super.destroy();
  }

  /**
   * 获取当前会话数据
   */
  public getSessionData(): SessionData | null {
    return this.sessionData;
  }

  /**
   * 清空会话内容
   */
  public clear(): void {
    this.sessionData = null;
    this.summaryElement.innerHTML = '';
    this.clearInput();
    this.clearTimers();
    this.timerElement.textContent = '--:--';
    this.hide();
  }
}
