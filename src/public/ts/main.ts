/**
 * 主 TypeScript 文件
 * 初始化所有模块并处理用户交互
 */

// 导入模块
import { sendCompositeFeedback } from './feedback.js';
import { initializeThemeSwitcher } from './theme.js';
import { processFiles, clearPreview, setupDragAndDrop, setupPasteListener } from './imageHandler.js';

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

// 将函数附加到 window 对象，以便在 HTML 中调用
window.sendCompositeFeedback = sendCompositeFeedback;
window.processFiles = processFiles;
window.clearPreview = clearPreview;

/**
 * 初始化应用程序
 */
function initializeApp(): void {


  // 初始化主题切换器
  initializeThemeSwitcher();

  // --- START: MOCK DATA FOR MARKDOWN PREVIEW ---
  const summaryDiv = document.getElementById('summary') as HTMLDivElement;
  if (summaryDiv) {
    // 确保marked已正确加载
    if (typeof marked === 'undefined') {
      summaryDiv.textContent = '无法渲染Markdown内容，项目依赖 https://cdn.jsdelivr.net/npm/marked/marked.min.js 请检查网络连接';
    }
  }
  // --- END: MOCK DATA FOR MARKDOWN PREVIEW ---

  const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;
  const sendFeedbackBtn = document.getElementById('send-feedback-btn') as HTMLButtonElement;
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
  const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;

  if (!feedbackInput || !sendFeedbackBtn || !dropZone || !imagePreviewContainer) {
    console.error('初始化失败：一个或多个必要的 DOM 元素未找到。');
    return;
  }

  // 设置拖放区域和点击上传
  setupDragAndDrop(dropZone, imagePreviewContainer);

  // 设置粘贴图片功能
  setupPasteListener(feedbackInput, imagePreviewContainer);

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

  // 添加页面卸载前的提示
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    const hasText = feedbackInput.innerText.trim().length > 0;
    const hasImages = imagePreviewContainer.childElementCount > 0;

    if (hasText || hasImages) {
      e.preventDefault();
      e.returnValue = '您有未发送的内容，确定要离开吗？';
      return e.returnValue;
    }
  });


}

// 当DOM加载完成后初始化应用程序
document.addEventListener('DOMContentLoaded', initializeApp);

