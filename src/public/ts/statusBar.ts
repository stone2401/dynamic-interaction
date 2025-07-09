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

type ConnectionStatus = 'connected' | 'disconnected' | 'high-latency' | 'reconnecting';
type MessageStatus = 'idle' | 'sending' | 'waiting' | 'received' | 'timeout';

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
        connectionStatusElement.classList.remove('connected', 'disconnected', 'high-latency', 'reconnecting');
        statusPulseElement.classList.remove('connected', 'disconnected', 'high-latency', 'reconnecting');

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
            case 'reconnecting':
                connectionStatusElement.textContent = '正在重连...';
                break;
        }

        // 如果连接断开或正在重连，重置延迟显示
        if (status === 'disconnected' || status === 'reconnecting') {
            if (latencyValueElement) {
                latencyValueElement.textContent = '-- ms';
                latencyValueElement.classList.remove('normal', 'medium', 'high');
            }
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
        messageStatusElement.classList.remove('idle', 'sending', 'waiting', 'received', 'timeout');

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
            case 'timeout':
                messageStatusElement.textContent = '会话已超时';
                break;
        }
    }
}

let sessionTimerInterval: number | null = null;

/**
 * 格式化秒数为 mm:ss 格式
 * @param totalSeconds 总秒数
 * @returns 格式化后的字符串
 */
function formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 启动会话超时倒计时
 * @param durationSeconds 倒计时时长（秒）
 */
export function startSessionTimer(sessionStartTime: number, totalDurationSeconds: number): void {
    const timerElement = document.getElementById('session-timer');
    const timerValueElement = document.getElementById('session-timer-value');

    if (!timerElement || !timerValueElement) return;

    stopSessionTimer(); // 先停止任何正在运行的计时器

    const sessionEndTime = sessionStartTime + totalDurationSeconds * 1000;

    const updateTimer = () => {
        const now = Date.now();
        const remainingMilliseconds = sessionEndTime - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMilliseconds / 1000));

        timerValueElement.textContent = formatTime(remainingSeconds);

        if (remainingSeconds <= 0) {
            stopSessionTimer();
            // 可以在这里添加一个更明确的“超时”状态更新
            updateMessageStatus('timeout');
        }
    };

    timerElement.style.display = 'flex'; // 确保计时器可见
    updateTimer(); // 立即更新一次
    sessionTimerInterval = window.setInterval(updateTimer, 1000);
}

/**
 * 停止并隐藏会话超时倒计时
 */
export function stopSessionTimer(): void {
    if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    }

    const timerElement = document.getElementById('session-timer');
    const timerValueElement = document.getElementById('session-timer-value');

    if (timerElement && timerValueElement) {
        // 仅在非超时状态下隐藏，超时后应保持可见
        if (messageStatus !== 'timeout') {
            timerElement.style.display = 'none';
            timerValueElement.textContent = '--:--';
        } else {
            timerElement.style.display = 'flex';
            timerValueElement.textContent = '超时';
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
    sendPing();

    pingInterval = window.setInterval(() => {
        sendPing();
    }, 5000); // 每5秒发送一次ping
}

/**
 * 停止定期发送ping请求
 */
function stopPingInterval(): void {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = 0;
    }
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
    }
}

/**
 * 处理pong响应
 * @param data 服务器返回的数据，包含 timestamp
 */
export function handlePong(data?: { timestamp?: number }): void {
    // 如果服务器返回了时间戳，使用它来计算延迟
    // 否则回退到基于本地时间的计算
    const now = Date.now();
    const latency = data?.timestamp ? now - data.timestamp : now - lastPingSent;

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
            startSessionTimer: typeof startSessionTimer;
            stopSessionTimer: typeof stopSessionTimer;
            startPingInterval: typeof startPingInterval;
            stopPingInterval: typeof stopPingInterval;
        }
    }
}

// 将函数附加到window对象，方便全局访问
window.statusBar = {
    updateSystemInfo,
    updateConnectionStatus,
    updateLatency,
    updateMessageStatus,
    handlePong,
    startSessionTimer,
    stopSessionTimer,
    startPingInterval,
    stopPingInterval
};

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeStatusBar);
