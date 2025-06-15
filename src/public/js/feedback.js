/**
 * 反馈功能模块
 * 处理用户反馈的收集和发送
 */

import { sendFeedback } from './websocket.js';
import { clearPreview, attachedImageData } from './imageHandler.js';

const feedbackInput = document.getElementById('feedback-input');
const resultsDiv = document.getElementById('results');

/**
 * 发送复合反馈（文本+图片）
 * @returns {boolean} 反馈是否成功发送
 */
function sendCompositeFeedback() {
    const text = feedbackInput.innerText.trim();
    
    // 检查是否有文本或图片
    if (!text && (!attachedImageData || attachedImageData.length === 0)) {
        resultsDiv.textContent = '请输入反馈文本或添加图片';
        return false;
    }
    
    // 发送反馈到服务器
    const success = sendFeedback(text, attachedImageData);
    
    if (success) {
        resultsDiv.textContent = '反馈已发送';
        
        // 清空反馈输入框和图片预览
        feedbackInput.innerText = '';
        clearPreview();
    }
    
    return success;
}

/**
 * 初始化反馈功能
 */
function initializeFeedbackHandlers() {
    // 为发送反馈按钮添加点击事件
    const sendButton = document.getElementById('send-feedback-btn');
    if (sendButton) {
        sendButton.addEventListener('click', sendCompositeFeedback);
    }
}

// 当DOM加载完成后初始化反馈处理
document.addEventListener('DOMContentLoaded', initializeFeedbackHandlers);

// 导出函数供其他模块使用
export { sendCompositeFeedback };
