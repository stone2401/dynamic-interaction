/**
 * 主 TypeScript 文件
 * 初始化所有模块并处理用户交互
 */

// 导入模块
import { sendCompositeFeedback } from './feedback.js';
import { processFiles, clearPreview, setupDragAndDrop, setupPasteListener } from './imageHandler.js';
import { initializeThemeSwitcher } from './theme.js';
// 导入原有的WebSocket模块
import './websocket.js';

// 告诉 TypeScript marked 是一个全局变量 (从CDN加载)
// 更明确的类型声明，而不是使用any
declare namespace marked {
  function parse(markdown: string, options?: any): string;
}

// 全局变量和函数
declare global {
  interface Window {
    sendCompositeFeedback: typeof sendCompositeFeedback;
    processFiles: typeof processFiles;
    clearPreview: typeof clearPreview;
  }
}

/**
 * 确认通知函数
 */
function acknowledgeNotification(): void {
  console.log('通知已确认');
  const notificationPanel = document.getElementById('notification-panel');
  const feedbackPanel = document.getElementById('feedback-panel');
  
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

// 将函数附加到 window 对象，以便在 HTML 中调用
window.sendCompositeFeedback = sendCompositeFeedback;
window.processFiles = processFiles;
window.clearPreview = clearPreview;
(window as any).acknowledgeNotification = acknowledgeNotification;

/**
 * 初始化状态管理器
 */
function initializeStateManager(): void {
  console.log('状态管理器初始化跳过，使用原有功能');
  // 暂时禁用StateManager，保持原有功能
}

/**
 * 初始化WebSocket连接
 */
function initializeWebSocket(): void {
  console.log('WebSocket初始化跳过，使用websocket.js中的实现');
  // websocket.js 已经处理了WebSocket连接
}

/**
 * 绑定事件监听器
 */
function bindEventListeners(): void {
  const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;
  const sendFeedbackBtn = document.getElementById('send-feedback-btn') as HTMLButtonElement;
  
  if (feedbackInput && sendFeedbackBtn) {
    // 发送反馈按钮事件
    sendFeedbackBtn.addEventListener('click', () => {
      sendCompositeFeedback();
    });

    // Ctrl+Enter / Cmd+Enter 快捷键发送反馈
    feedbackInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendCompositeFeedback();
      }
    });
  }

  // 添加页面卸载前的提示
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;
    const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
    
    if (feedbackInput && imagePreviewContainer) {
      const hasText = feedbackInput.innerText.trim().length > 0;
      const hasImages = imagePreviewContainer.childElementCount > 0;

      if (hasText || hasImages) {
        e.preventDefault();
        e.returnValue = '您有未发送的内容，确定要离开吗？';
        return e.returnValue;
      }
    }
  });
}

/**
 * 初始化拖拽功能
 */
function initializeDragAndDrop(): void {
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
  const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
  const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;

  if (dropZone && imagePreviewContainer) {
    // 设置拖放区域和点击上传
    setupDragAndDrop(dropZone, imagePreviewContainer);
  }
  
  if (feedbackInput && imagePreviewContainer) {
    // 设置粘贴图片功能
    setupPasteListener(feedbackInput, imagePreviewContainer);
  }
}

/**
 * 初始化应用程序
 */
function initializeApp(): void {
  console.log('初始化交互式反馈系统...');
  
  // 初始化主题切换器
  initializeThemeSwitcher();

  // 初始化状态管理器
  initializeStateManager();
  
  // 初始化WebSocket连接
  initializeWebSocket();
  
  // 绑定事件监听器
  bindEventListeners();
  
  // 初始化拖拽功能
  initializeDragAndDrop();
  
  console.log('系统初始化完成');
}

// 当DOM加载完成后初始化应用程序
document.addEventListener('DOMContentLoaded', initializeApp);

