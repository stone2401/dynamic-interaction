/**
 * Electron 预加载脚本
 * 提供安全的 IPC 通信接口，确保渲染进程无法直接访问 Node.js API
 */
import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的 API 接口
interface ElectronAPI {
    // 系统信息
    platform: string;
    isElectron: boolean;

    // 窗口控制
    window: {
        close: () => void;
        minimize: () => void;
        maximize: () => void;
        unmaximize: () => void;
        isMaximized: () => Promise<boolean>;
        focus: () => void;
        blur: () => void;
        setTitle: (title: string) => void;
    };

    // 应用程序控制
    app: {
        quit: () => void;
        getVersion: () => Promise<string>;
        getName: () => Promise<string>;
    };

    // 事件监听
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;

    // 发送消息到主进程
    send: (channel: string, ...args: any[]) => void;

    // 调用主进程方法并等待响应
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}

// 允许的 IPC 通道列表（白名单机制）
const ALLOWED_CHANNELS = {
    // 窗口相关
    'window-close': true,
    'window-minimize': true,
    'window-maximize': true,
    'window-unmaximize': true,
    'window-is-maximized': true,
    'window-focus': true,
    'window-blur': true,
    'window-set-title': true,

    // 应用程序相关
    'app-quit': true,
    'app-get-version': true,
    'app-get-name': true,

    // 自定义事件
    'session-started': true,
    'session-ended': true,
    'interaction-request': true,
    'interaction-response': true,
    'notification': true,

    // 窗口状态变化事件
    'window-maximized': true,
    'window-unmaximized': true,
    'window-focused': true,
    'window-blurred': true,
    'window-closed': true,
};

/**
 * 验证 IPC 通道是否被允许
 * @param channel 通道名称
 * @returns 是否允许
 */
function isChannelAllowed(channel: string): boolean {
    return ALLOWED_CHANNELS[channel as keyof typeof ALLOWED_CHANNELS] === true;
}

/**
 * 安全的事件监听器
 * @param channel 通道名称
 * @param callback 回调函数
 */
function safeOn(channel: string, callback: (...args: any[]) => void): void {
    if (!isChannelAllowed(channel)) {
        console.warn(`Blocked attempt to listen on unauthorized channel: ${channel}`);
        return;
    }

    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
}

/**
 * 安全的事件移除监听器
 * @param channel 通道名称
 * @param callback 回调函数
 */
function safeOff(channel: string, callback: (...args: any[]) => void): void {
    if (!isChannelAllowed(channel)) {
        console.warn(`Blocked attempt to remove listener on unauthorized channel: ${channel}`);
        return;
    }

    ipcRenderer.off(channel, callback);
}

/**
 * 安全的消息发送
 * @param channel 通道名称
 * @param args 参数
 */
function safeSend(channel: string, ...args: any[]): void {
    if (!isChannelAllowed(channel)) {
        console.warn(`Blocked attempt to send message on unauthorized channel: ${channel}`);
        return;
    }

    ipcRenderer.send(channel, ...args);
}

/**
 * 安全的方法调用
 * @param channel 通道名称
 * @param args 参数
 * @returns Promise 响应
 */
async function safeInvoke(channel: string, ...args: any[]): Promise<any> {
    if (!isChannelAllowed(channel)) {
        console.warn(`Blocked attempt to invoke method on unauthorized channel: ${channel}`);
        return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
    }

    return ipcRenderer.invoke(channel, ...args);
}

// 创建安全的 API 对象
const electronAPI: ElectronAPI = {
    // 系统信息
    platform: process.platform,
    isElectron: true,

    // 窗口控制方法
    window: {
        close: () => safeSend('window-close'),
        minimize: () => safeSend('window-minimize'),
        maximize: () => safeSend('window-maximize'),
        unmaximize: () => safeSend('window-unmaximize'),
        isMaximized: () => safeInvoke('window-is-maximized'),
        focus: () => safeSend('window-focus'),
        blur: () => safeSend('window-blur'),
        setTitle: (title: string) => safeSend('window-set-title', title),
    },

    // 应用程序控制方法
    app: {
        quit: () => safeSend('app-quit'),
        getVersion: () => safeInvoke('app-get-version'),
        getName: () => safeInvoke('app-get-name'),
    },

    // 事件处理方法
    on: safeOn,
    off: safeOff,
    send: safeSend,
    invoke: safeInvoke,
};

// 通过 contextBridge 安全地暴露 API 给渲染进程
try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('Electron API exposed successfully');
} catch (error) {
    console.error('Failed to expose Electron API:', error);
}

// 添加一些调试信息（仅开发环境）
if (process.env.NODE_ENV === 'development') {
    console.log('Preload script loaded successfully');
    console.log('Platform:', process.platform);
    console.log('Electron version:', process.versions.electron);
    console.log('Chrome version:', process.versions.chrome);
    console.log('Node version:', process.versions.node);
}

// 处理未捕获的异常
window.addEventListener('error', (event) => {
    console.error('Uncaught error in preload script:', event.error);
});

// 处理未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in preload script:', event.reason);
});

// 导出类型定义供 TypeScript 使用
export type { ElectronAPI };