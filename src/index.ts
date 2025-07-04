/**
 * Dynamic Interaction 应用程序入口点
 * 
 * 该文件负责初始化和启动各个模块，不包含具体业务逻辑
 * 采用懒启动策略，仅在需要时启动HTTP服务器
 */

import { PORT } from './config';
import { freePortIfOccupied } from './server/port';
import { configureExpress } from './server/express';
import { logger } from './logger';
import { configureWebSocketServer } from './server/websocket';
import { configureMcpServer, startMcpServer } from './mcp';
import { serverStateManager } from './server/serverState';

// 导入消息处理器以确保它们被注册
import './server/handlers/pingHandler';
import './server/handlers/feedbackHandler';
import './server/handlers/systemInfoHandler';

/**
 * 应用程序主函数
 */
async function main() {
    // 1. 配置 Express 应用 (例如设置静态文件目录)
    configureExpress();

    // 2. 配置 WebSocket 服务器 (设置连接处理逻辑)
    configureWebSocketServer(); // 重要：确保这在服务器监听前配置
    configureMcpServer();

    // 3. 仅启动 MCP 服务器，HTTP 服务器将在需要时懒启动
    try {
        await freePortIfOccupied(PORT);
        await startMcpServer();
        logger.info('MCP 服务器已成功启动。HTTP 服务器将在需要时启动。');
    } catch (error: unknown) { // Explicitly type error as unknown
        logger.error('启动 MCP 服务器失败:', error);
        // Type guard for error with a 'code' property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const nodeError = error as NodeJS.ErrnoException; // Cast to ErrnoException
            if (nodeError.code === 'EADDRINUSE') {
                logger.error(`端口 ${PORT} 已被占用。是否有另一个服务器实例正在运行？`);
            }
        }
        process.exit(1);
    }
} // main function ends here

// 启动应用程序
main();
