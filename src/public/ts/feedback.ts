/**
 * 反馈功能模块
 * 处理用户反馈的收集和发送
 */

import { sendFeedback } from './websocket.js';
import { clearPreview, attachedImageData } from './imageHandler.js';

const feedbackInput = document.getElementById('feedback-input') as HTMLDivElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;

// 消息状态类型（不真正导入，仅用于类型检查）
type MessageStatus = 'idle' | 'sending' | 'waiting' | 'received';

/**
 * 发送复合反馈（文本+图片）
 * @returns {boolean} 反馈是否成功发送
 */
function sendCompositeFeedback(): boolean {
    const text = feedbackInput.innerText.trim();

    // 检查是否有文本或图片
    if (!text && (!attachedImageData || attachedImageData.length === 0)) {
        resultsDiv.textContent = '请输入反馈文本或添加图片';
        updateMessageStatus('idle');
        return false;
    }

    // 更新状态为发送中
    updateMessageStatus('sending');

    // 发送反馈到服务器
    const success = sendFeedback(text, attachedImageData as CustomImageData[]);

    if (success) {
        resultsDiv.textContent = '反馈已发送';
        
        // 更新状态为等待中
        updateMessageStatus('waiting');

        // 清空反馈输入框和图片预览
        feedbackInput.innerText = '';
        clearPreview();
    } else {
        // 发送失败时恢复状态
        updateMessageStatus('idle');
    }

    return success;
}

/**
 * 更新消息状态
 * @param {MessageStatus} status - 新状态
 */
function updateMessageStatus(status: MessageStatus): void {
    // 如果状态栏模块已加载，更新状态
    if (window.statusBar) {
        window.statusBar.updateMessageStatus(status);
    }
}

/**
 * 初始化反馈功能
 */
function initializeFeedbackHandlers(): void {
    // 为发送反馈按钮添加点击事件
    const sendButton = document.getElementById('send-feedback-btn');
    if (sendButton) {
        sendButton.addEventListener('click', sendCompositeFeedback);
    }
    
    // 添加Ctrl+Enter快捷键发送反馈
    feedbackInput.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            sendCompositeFeedback();
        }
    });
    
    // 初始化时设置状态为空闲
    updateMessageStatus('idle');
}

// 当DOM加载完成后初始化反馈处理
document.addEventListener('DOMContentLoaded', initializeFeedbackHandlers);

// 使用外部定义的Window接口
// 注意：由于statusBar.ts已定义了全局Window接口，这里不需要重复声明

// 导出函数供其他模块使用
export { sendCompositeFeedback, updateMessageStatus };
