/**
 * 反馈组件
 * 处理用户反馈的收集和发送
 */

import type { MessageStatus, CustomImageData } from '../core/types.js';
import { getElementById } from '../utils/dom.js';
import { eventBus, APP_EVENTS } from '../core/events.js';
import { webSocketService } from '../services/websocket.js';
import { imageHandler, getAttachedImageData } from './imageHandler.js';

class FeedbackComponent {
  private elements: {
    feedbackInput?: HTMLDivElement;
    resultsDiv?: HTMLDivElement;
    dropZone?: HTMLDivElement;
    sendButton?: HTMLElement;
  } = {};

  private isEnabled = true;

  public initialize(): void {
    this.initializeElements();
    this.setupEventListeners();
    this.updateMessageStatus('idle');
  }

  public sendCompositeFeedback(): boolean {
    if (!this.elements.feedbackInput) return false;

    const text = this.elements.feedbackInput.innerText.trim();
    const images = getAttachedImageData();

    if (!text && images.length === 0) {
      this.showMessage('请输入反馈文本或添加图片');
      this.updateMessageStatus('idle');
      return false;
    }

    this.updateMessageStatus('sending');

    // 立即清空输入和预览
    const feedbackData = { text, images: [...images] };
    this.elements.feedbackInput.innerText = '';
    imageHandler.clearPreview();

    this.updateMessageStatus('waiting');
    this.disableFeedbackInput();

    const success = webSocketService.sendFeedback(feedbackData.text, feedbackData.images as CustomImageData[]);

    if (success) {
      this.showMessage('反馈已发送');
      eventBus.emit(APP_EVENTS.FEEDBACK_SEND, feedbackData);
    } else {
      this.showMessage('发送失败，请检查连接');
      this.updateMessageStatus('idle');
      this.enableFeedbackInput();
      eventBus.emit(APP_EVENTS.FEEDBACK_ERROR, { error: '发送失败' });
    }

    return success;
  }

  public disableFeedbackInput(): void {
    if (this.elements.feedbackInput && this.elements.dropZone) {
      this.elements.feedbackInput.contentEditable = 'false';
      this.elements.feedbackInput.classList.add('disabled');
      this.elements.dropZone.classList.add('disabled');
    }
    this.isEnabled = false;
  }

  private resetAndEnableInput(): void {
    if (this.elements.feedbackInput) {
      this.elements.feedbackInput.innerHTML = '';
      imageHandler.clearPreview(); // 清空图片预览
    }
    this.enableFeedbackInput();
    this.updateMessageStatus('idle');
  }

  public enableFeedbackInput(): void {
    if (this.elements.feedbackInput && this.elements.dropZone) {
      this.elements.feedbackInput.contentEditable = 'true';
      this.elements.feedbackInput.classList.remove('disabled');
      this.elements.dropZone.classList.remove('disabled');
    }
    this.isEnabled = true;
  }

  private initializeElements(): void {
    this.elements = {
      feedbackInput: getElementById<HTMLDivElement>('feedback-input') || undefined,
      resultsDiv: getElementById<HTMLDivElement>('results') || undefined,
      dropZone: getElementById<HTMLDivElement>('drop-zone') || undefined,
      sendButton: getElementById('send-feedback-btn') || undefined,
    };
  }

  private setupEventListeners(): void {
    // 发送按钮点击事件
    if (this.elements.sendButton) {
      this.elements.sendButton.addEventListener('click', () => {
        this.sendCompositeFeedback();
      });
    }

    // 监听来自AI的新消息，以重置和重新启用输入
    eventBus.on(APP_EVENTS.FEEDBACK_SEND, this.resetAndEnableInput.bind(this));

    // Ctrl+Enter 快捷键
    if (this.elements.feedbackInput) {
      this.elements.feedbackInput.addEventListener('keydown', (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          this.sendCompositeFeedback();
        }
      });
    }

    // 页面卸载前提示
    window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
      if (this.hasUnsavedContent()) {
        e.preventDefault();
        e.returnValue = '您有未发送的内容，确定要离开吗？';
        return e.returnValue;
      }
    });
  }

  private updateMessageStatus(status: MessageStatus): void {
    if (window.statusBar) {
      window.statusBar.updateMessageStatus(status);
    }
  }

  private showMessage(message: string): void {
    if (this.elements.resultsDiv) {
      this.elements.resultsDiv.textContent = message;
    }
  }

  private hasUnsavedContent(): boolean {
    const hasText = (this.elements.feedbackInput?.innerText.trim().length || 0) > 0;
    const hasImages = getAttachedImageData().length > 0;
    return hasText || hasImages;
  }
}

export const feedbackComponent = new FeedbackComponent();

// 导出向后兼容的函数
export const sendCompositeFeedback = feedbackComponent.sendCompositeFeedback.bind(feedbackComponent);
export const enableFeedbackInput = feedbackComponent.enableFeedbackInput.bind(feedbackComponent);
export const disableFeedbackInput = feedbackComponent.disableFeedbackInput.bind(feedbackComponent);