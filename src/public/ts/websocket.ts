/**
 * WebSocket 通信模块
 * 处理与服务器的 WebSocket 连接和消息传递
 */

// 使用正确的类型导入和引用
// 注意：statusBar模块已在全局Window上定义了类型

// 告诉 TypeScript marked 是一个全局变量 (从CDN加载)
// 更明确的类型声明，而不是使用any
declare namespace marked {
  function parse(markdown: string, options?: any): string;
}

// 定义系统信息接口
interface SystemInfo {
  workspaceDirectory: string;
  sessionId: string;
  serverVersion?: string;
}

// 创建 WebSocket 连接
// 注意: 与服务器约定使用 ws://<host> (同源)
const ws = new WebSocket(`ws://${window.location.host}`);
const summaryDiv = document.getElementById('summary') as HTMLDivElement;

// 将WebSocket实例添加到window对象，以便其他模块访问
(window as any).ws = ws;

// WebSocket 事件处理
ws.onopen = () => {
  console.log('客户端: WebSocket 连接已成功打开 (onopen 事件触发)。');
  summaryDiv.textContent = 'WebSocket 连接已建立，等待 AI 响应...';
  
  // 更新连接状态
  setTimeout(() => {
    if (window.statusBar) {
      window.statusBar.updateConnectionStatus('connected');
    }
  }, 100); // 等待状态栏初始化

  // 告诉服务器客户端已准备就绪，可安全地发送摘要数据
  ws.send(JSON.stringify({ type: 'client_ready' }));
  
  // 请求系统信息
  setTimeout(() => {
    requestSystemInfo();
  }, 500); // 短暂延迟以确保statusBar模块已加载
};

ws.onmessage = (event: MessageEvent) => {
  console.log('收到消息:', event.data);
  try {
    const data = JSON.parse(event.data) as WebSocketMessage;
    switch (data.type) {
      case 'summary':
        const summaryData = data as SummaryMessage;
        if (summaryData.data !== undefined && summaryData.data !== null) {
          // 使用 marked.js 解析 Markdown
          summaryDiv.innerHTML = marked.parse(summaryData.data);
          
          // 更新消息状态
          if (window.statusBar) {
            window.statusBar.updateMessageStatus('received');
          }
        } else {
          summaryDiv.textContent = 'AI Agent 正在准备摘要...';
          console.warn('收到的摘要消息格式不完整，缺少 "data" 字段。服务器发送的消息:', event.data);
        }
        break;
        
      case 'server_log':
        const logData = data as ServerLogMessage;
        const { level, text } = logData.data;
        console[level]('%c[Server] ' + text, 'color: grey');
        break;
        
      case 'pong':
        // 处理延迟计算
        if (window.statusBar) {
          window.statusBar.handlePong();
        }
        break;
        
      case 'system_info':
        // 处理系统信息
        if (window.statusBar && data.data) {
          window.statusBar.updateSystemInfo(data.data as SystemInfo);
        }
        break;
        
      case 'feedback_status':
        // 更新消息状态
        if (window.statusBar && data.data && data.data.status) {
          window.statusBar.updateMessageStatus(data.data.status);
        }
        break;
        
      default:
        console.log('收到未知类型的消息:', data.type);
        break;
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
  
  // 更新连接状态
  if (window.statusBar) {
    window.statusBar.updateConnectionStatus('disconnected');
  }
};

/**
 * 发送命令到服务器
 * @param {string} command - 要执行的命令
 */
export function sendCommand(command: string): boolean {
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
 * 发送ping请求到服务器
 */
export function sendPing(): boolean {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      data: { timestamp: Date.now() }
    }));
    return true;
  }
  return false;
}

/**
 * 请求系统信息
 */
function requestSystemInfo(): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'get_system_info'
    }));
  }
}

/**
 * 发送复合反馈（文本+图片）到服务器
 * @param {string} text - 反馈文本
 * @param {Array} images - 图片数据数组
 */
export function sendFeedback(text: string, images: CustomImageData[]): boolean {
  if (ws.readyState === WebSocket.OPEN) {
    // 更新消息状态
    if (window.statusBar) {
      window.statusBar.updateMessageStatus('sending');
    }
    
    ws.send(JSON.stringify({
      type: 'submit_feedback',
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
