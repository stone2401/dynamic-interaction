/**
 * WebSocket 通信模块
 * 处理与服务器的 WebSocket 连接和消息传递
 */

// 创建 WebSocket 连接
// 注意: 与服务器约定使用 ws://<host> (同源)
const ws = new WebSocket(`ws://${window.location.host}`);
const summaryDiv = document.getElementById('summary');

// WebSocket 事件处理
ws.onopen = () => {
    console.log('客户端: WebSocket 连接已成功打开 (onopen 事件触发)。');
    summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
};

ws.onmessage = (event) => {
    console.log('收到消息:', event.data);
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'summary') {
            if (data.data !== undefined && data.data !== null) {
                summaryDiv.innerHTML = data.data;
            } else {
                summaryDiv.innerHTML = 'AI Agent 正在准备摘要...'; // 或者其他合适的占位符
                console.warn('收到的摘要消息格式不完整，缺少 "data" 字段。服务器发送的消息:', event.data);
            }
        } else if (data.type === 'command_result') {
            const resultsDiv = document.getElementById('results');
            resultsDiv.textContent = data.data;

            // 如果用户在命令标签页，保持当前标签页
            // 否则自动切换到命令标签页显示结果
            if (!document.getElementById('command-tab').classList.contains('active')) {
                switchTab('command-tab');
            }
        } else if (data.type === 'server_log') {
            // 服务端日志
            const { level, text } = data.data;
            console[level]('%c[Server] ' + text, 'color: grey');
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
            data: command
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
            data: {
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
