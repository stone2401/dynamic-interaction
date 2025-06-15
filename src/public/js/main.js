/**
 * 主 JavaScript 文件
 * 导入和初始化所有模块
 */

// 导入模块
import { switchTab } from './ui.js';
import { runCommand } from './commands.js';
import { sendCompositeFeedback } from './feedback.js';
import { processFiles, clearPreview } from './imageHandler.js';

// 全局变量和函数
window.switchTab = switchTab;
window.runCommand = runCommand;
window.sendCompositeFeedback = sendCompositeFeedback;
window.processFiles = processFiles;
window.clearPreview = clearPreview;

/**
 * 初始化应用程序
 */
function initializeApp() {
    console.log('应用程序初始化中...');
    
    // 初始化时默认显示反馈标签页
    switchTab('feedback-tab');
    
    // 添加页面卸载前的提示
    window.addEventListener('beforeunload', (e) => {
        // 如果有未发送的反馈或命令，提示用户
        const feedbackInput = document.getElementById('feedback-input');
        const commandInput = document.getElementById('command');
        
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
