/**
 * 应用程序核心
 * 应用初始化和生命周期管理
 */

import { themeService } from '../services/theme.js';
import { notificationService } from '../services/notification.js';
import { webSocketService } from '../services/websocket.js';
import { statusBarComponent } from '../components/statusBar.js';
import { feedbackComponent } from '../components/feedback.js';
import { languageSwitcherComponent } from '../components/languageSwitcher.js';
import { i18nService, getInitialLang } from '../services/i18n.js';
import { imageHandler, setupDragAndDrop, setupPasteListener } from '../components/imageHandler.js';
import { sendCompositeFeedback } from '../components/feedback.js';
import { processFiles, clearPreview } from '../components/imageHandler.js';
import { getElementById } from '../utils/dom.js';
import { eventBus, APP_EVENTS } from './events.js';

// 告诉 TypeScript marked 是一个全局变量 (从CDN加载)
declare namespace marked {
  function parse(markdown: string, options?: any): string;
}

class Application {
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('初始化交互式反馈系统...');

    try {
      // 1. 初始化主题服务
      themeService.initializeThemeSwitcher();

      // 2. 初始化通知服务
      await this.initializeNotificationService();

      // 3. 初始化UI组件
      statusBarComponent.initialize();
      feedbackComponent.initialize();
      languageSwitcherComponent.initialize();

      // 4. 初始化拖拽和粘贴功能
      this.initializeDragAndDrop();

      // 5. 设置初始语言
      i18nService.switchLanguage(getInitialLang());

      // 6. 初始化WebSocket连接
      webSocketService.initialize();

      // 6. 设置全局函数（向后兼容）
      this.setupGlobalFunctions();

      // 7. 设置事件监听
      this.setupGlobalEventListeners();

      this.isInitialized = true;
      console.log('系统初始化完成');

    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  }

  private async initializeNotificationService(): Promise<void> {
    console.log('初始化通知服务...');

    if (notificationService.checkSupport()) {
      const permission = notificationService.getPermissionStatus();

      if (permission === 'default') {
        console.log('请求通知权限...');
        const result = await notificationService.requestPermission();
        console.log(`通知权限状态: ${result}`);
      } else {
        console.log(`当前通知权限状态: ${permission}`);
      }
    } else {
      console.warn('当前浏览器不支持通知功能');
    }
  }

  private initializeDragAndDrop(): void {
    const dropZone = getElementById('drop-zone');
    const imagePreviewContainer = getElementById('image-preview-container');
    const feedbackInput = getElementById('feedback-input');

    if (dropZone && imagePreviewContainer) {
      setupDragAndDrop(dropZone, imagePreviewContainer);
    }

    if (feedbackInput && imagePreviewContainer) {
      setupPasteListener(feedbackInput, imagePreviewContainer);
    }
  }

  private setupGlobalFunctions(): void {
    // 将函数附加到 window 对象，以便在 HTML 中调用
    window.sendCompositeFeedback = sendCompositeFeedback;
    window.processFiles = processFiles;
    window.clearPreview = clearPreview;

    // 确认通知函数
    (window as any).acknowledgeNotification = this.acknowledgeNotification;
  }

  private setupGlobalEventListeners(): void {
    // 监听应用事件
    eventBus.on(APP_EVENTS.THEME_CHANGED, (theme: string) => {
      console.log('主题已切换至:', theme);
    });

    eventBus.on(APP_EVENTS.NOTIFICATION_SHOW, (options: any) => {
      console.log('显示通知:', options.title);
    });

    eventBus.on(APP_EVENTS.FEEDBACK_SEND, (data: any) => {
      console.log('反馈已发送:', data);
    });

    eventBus.on(APP_EVENTS.WS_CONNECTED, () => {
      console.log('WebSocket 已连接');
    });

    eventBus.on(APP_EVENTS.WS_DISCONNECTED, () => {
      console.log('WebSocket 已断开');
    });
  }

  private acknowledgeNotification(): void {
    console.log('通知已确认');
    const notificationPanel = getElementById('notification-panel');
    const feedbackPanel = getElementById('feedback-panel');

    if (notificationPanel) {
      notificationPanel.style.display = 'none';
    }

    if (feedbackPanel) {
      feedbackPanel.style.display = 'block';
    }

    // 发送确认消息到服务器
    const ws = (window as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'notification_acknowledge',
        data: { acknowledged: true }
      }));
    }
  }
}

// 全局变量和函数声明
declare global {
  interface Window {
    sendCompositeFeedback: typeof sendCompositeFeedback;
    processFiles: typeof processFiles;
    clearPreview: typeof clearPreview;
  }
}

// 创建应用实例
const app = new Application();

// 当DOM加载完成后初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
  app.initialize();
});