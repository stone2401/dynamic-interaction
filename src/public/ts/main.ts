/**
 * 主 TypeScript 文件
 * 导入和初始化所有模块
 */

// 导入模块
import { switchTab } from './ui';
import { runCommand } from './commands';
import { sendCompositeFeedback } from './feedback';
import { processFiles, clearPreview } from './imageHandler';

// 全局变量和函数
declare global {
  interface Window {
    switchTab: typeof switchTab;
    runCommand: typeof runCommand;
    sendCompositeFeedback: typeof sendCompositeFeedback;
    processFiles: typeof processFiles;
    clearPreview: typeof clearPreview;
  }
}

window.switchTab = switchTab;
window.runCommand = runCommand;
window.sendCompositeFeedback = sendCompositeFeedback;
window.processFiles = processFiles;
window.clearPreview = clearPreview;

/**
 * 初始化应用程序
 */
function initializeApp(): void {
  console.log('应用程序初始化中...');
  
  // 初始化时默认显示反馈标签页
  switchTab('feedback-tab');
  
  // 添加页面卸载前的提示
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    // 如果有未发送的反馈或命令，提示用户
    const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;
    const commandInput = document.getElementById('command') as HTMLInputElement;
    
    if (feedbackInput.innerText.trim() || commandInput.value.trim()) {
      e.preventDefault();
      e.returnValue = '您有未发送的内容，确定要离开吗？';
      return e.returnValue;
    }
  });
  
  console.log('应用程序初始化完成');
}

// 当DOM加载完成后初始化应用程序
document.addEventListener('DOMContentLoaded', initializeApp);
