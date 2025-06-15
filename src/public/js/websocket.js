/**
 * WebSocket 通信模块
 * 处理与服务器的 WebSocket 连接和消息传递
 */

// 创建 WebSocket 连接
const ws = new WebSocket(`ws://${window.location.host}`);
const summaryDiv = document.getElementById('summary');

// WebSocket 事件处理
ws.onopen = () => {
    console.log('WebSocket 连接已建立');
    summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'summary') {
            summaryDiv.innerHTML = data.content;
        } else if (data.type === 'command_result') {
            const resultsDiv = document.getElementById('results');
            resultsDiv.textContent = data.content;
            
            // 如果用户在命令标签页，保持当前标签页
            // 否则自动切换到命令标签页显示结果
            if (!document.getElementById('command-tab').classList.contains('active')) {
                switchTab('command-tab');
            }
        }
    } catch (e) {
        console.error('解析 WebSocket 消息时出错:', e);
        summaryDiv.textContent = '收到无效消息';
    }
};

ws.onclose = () => {
    console.log('WebSocket 连接已关闭');
    summaryDiv.textContent = 'WebSocket 连接已关闭，请刷新页面重新连接。';
    summaryDiv.style.color = 'red';
};

/**
 * 发送命令到服务器
 * @param {string} command - 要执行的命令
 */
function sendCommand(command) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'command',
            content: command
        }));
        return true;
    } else {
        alert('WebSocket 连接已关闭，请刷新页面重试');
        return false;
    }
}

/**
 * 发送复合反馈（文本+图片）到服务器
 * @param {string} text - 反馈文本
 * @param {Array} images - 图片数据数组
 */
function sendFeedback(text, images) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'composite_feedback',
            content: {
                text: text,
                imageData: images
            }
        }));
        return true;
    } else {
        alert('WebSocket 连接已关闭，请刷新页面重试');
        return false;
    }
}

// 导出函数供其他模块使用
export { sendCommand, sendFeedback };
