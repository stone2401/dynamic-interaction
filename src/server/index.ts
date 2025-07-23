/**
 * 服务器入口文件
 * 替换原有的express.ts，使用新的架构
 */

import { app, startServer, stopServer } from './core/app';

// 导出新的API
export { startServer as startExpressServer };
export { stopServer as stopExpressServer };

// 为了向后兼容，导出应用实例
export { app };

// 导出服务器状态管理相关的API
export { lifecycleManager as serverStateManager } from './core/lifecycle';

// 导出其他常用模块
export { httpServer } from './core/server';
export { webSocketManager as connectionManager } from './websocket/connection';
export { messageProcessor } from './messaging/processor';