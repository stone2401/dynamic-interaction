/**
 * 状态栏模块
 * 处理工作区目录、会话ID、连接状态、延迟和消息状态的显示
 */

// 类型定义
interface SystemInfo {
    workspaceDirectory: string;
    sessionId: string;
    serverVersion?: string;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'high-latency';
type MessageStatus = 'idle' | 'sending' | 'waiting' | 'received';

// 延迟阈值（毫秒）
const LATENCY_THRESHOLD = {
    NORMAL: 100, // 低于100ms视为正常
    HIGH: 300    // 高于300ms视为高延迟
};

// 状态栏元素引用
let workspaceDirectoryElement: HTMLElement;
let sessionIdElement: HTMLElement;
let connectionStatusElement: HTMLElement;
let latencyValueElement: HTMLElement;
let messageStatusElement: HTMLElement;
let statusPulseElement: HTMLElement;

// 状态变量
let lastPingSent = 0;
let pingInterval: number;
let currentLatency = 0;
let systemInfo: SystemInfo = {
    workspaceDirectory: '未知目录',
    sessionId: '未知',
};
let connectionStatus: ConnectionStatus = 'disconnected';
let messageStatus: MessageStatus = 'idle';

/**
 * 初始化状态栏
 */
export function initializeStatusBar(): void {
    // 获取DOM元素
    workspaceDirectoryElement = document.getElementById('workspace-directory-value')!;
    sessionIdElement = document.getElementById('session-id-value')!;
    connectionStatusElement = document.getElementById('connection-status-value')!;
    latencyValueElement = document.getElementById('latency-value')!;
    messageStatusElement = document.getElementById('message-status-value')!;
    statusPulseElement = document.getElementById('status-pulse')!;

    // 初始状态
    updateConnectionStatus('disconnected');
    updateMessageStatus('idle');

    // 开始心跳检测
    if (typeof window.ws !== 'undefined') {
        startPingInterval();
    }
}

/**
 * 更新系统信息
 */
export function updateSystemInfo(info: SystemInfo): void {
    systemInfo = { ...systemInfo, ...info };
    
    if (workspaceDirectoryElement) {
        workspaceDirectoryElement.textContent = systemInfo.workspaceDirectory;
        // 添加工具提示，鼠标悬停时显示完整路径
        workspaceDirectoryElement.title = systemInfo.workspaceDirectory;
    }
    
    if (sessionIdElement) {
        sessionIdElement.textContent = systemInfo.sessionId;
    }
}

/**
 * 更新连接状态
 */
export function updateConnectionStatus(status: ConnectionStatus): void {
    connectionStatus = status;
    
    if (connectionStatusElement) {
        // 移除所有状态类
        connectionStatusElement.classList.remove('connected', 'disconnected', 'high-latency');
        statusPulseElement.classList.remove('connected', 'disconnected', 'high-latency');
        
        // 添加当前状态类
        connectionStatusElement.classList.add(status);
        statusPulseElement.classList.add(status);
        
        // 更新显示文本
        switch (status) {
            case 'connected':
                connectionStatusElement.textContent = '已连接';
                break;
            case 'disconnected':
                connectionStatusElement.textContent = '未连接';
                break;
            case 'high-latency':
                connectionStatusElement.textContent = '延迟高';
                break;
        }
    }
}

/**
 * 更新延迟显示
 */
export function updateLatency(latency: number): void {
    currentLatency = latency;
    
    if (latencyValueElement) {
        // 移除所有状态类
        latencyValueElement.classList.remove('normal', 'medium', 'high');
        
        // 添加当前状态类并更新文本
        if (latency < LATENCY_THRESHOLD.NORMAL) {
            latencyValueElement.classList.add('normal');
        } else if (latency < LATENCY_THRESHOLD.HIGH) {
            latencyValueElement.classList.add('medium');
        } else {
            latencyValueElement.classList.add('high');
        }
        
        latencyValueElement.textContent = `${latency}ms`;
        
        // 更新连接状态
        if (latency >= LATENCY_THRESHOLD.HIGH) {
            updateConnectionStatus('high-latency');
        } else if (connectionStatus !== 'disconnected') {
            updateConnectionStatus('connected');
        }
    }
}

/**
 * 更新消息状态
 */
export function updateMessageStatus(status: MessageStatus): void {
    messageStatus = status;
    
    if (messageStatusElement) {
        // 移除所有状态类
        messageStatusElement.classList.remove('idle', 'sending', 'waiting', 'received');
        
        // 添加当前状态类
        messageStatusElement.classList.add(status);
        
        // 更新显示文本
        switch (status) {
            case 'idle':
                messageStatusElement.textContent = '暂无新消息';
                break;
            case 'sending':
                messageStatusElement.textContent = '正在发送...';
                break;
            case 'waiting':
                messageStatusElement.textContent = '等待AI响应...';
                break;
            case 'received':
                messageStatusElement.textContent = '已收到回复';
                break;
        }
    }
}

/**
 * 开始定期发送ping请求
 */
function startPingInterval(): void {
    // 清除现有计时器
    if (pingInterval) {
        clearInterval(pingInterval);
    }
    
    pingInterval = window.setInterval(() => {
        sendPing();
    }, 5000); // 每5秒发送一次ping
}

/**
 * 发送ping请求
 */
function sendPing(): void {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        lastPingSent = Date.now();
        window.ws.send(JSON.stringify({
            type: 'ping'
        }));
    } else {
        updateConnectionStatus('disconnected');
    }
}

/**
 * 处理pong响应
 */
export function handlePong(): void {
    const latency = Date.now() - lastPingSent;
    updateLatency(latency);
    
    // 如果延迟在正常范围内，更新连接状态为已连接
    if (latency < LATENCY_THRESHOLD.HIGH) {
        updateConnectionStatus('connected');
    }
}

// 导出全局类型定义
declare global {
    interface Window {
        ws: WebSocket;
        statusBar: {
            updateSystemInfo: typeof updateSystemInfo;
            updateConnectionStatus: typeof updateConnectionStatus;
            updateLatency: typeof updateLatency;
            updateMessageStatus: typeof updateMessageStatus;
            handlePong: typeof handlePong;
        }
    }
}

// 将函数附加到window对象，方便全局访问
window.statusBar = {
    updateSystemInfo,
    updateConnectionStatus,
    updateLatency,
    updateMessageStatus,
    handlePong
};

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeStatusBar);
