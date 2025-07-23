/**
 * Dynamic Interaction 应用程序入口点
 * 
 * 该文件负责初始化和启动各个模块，不包含具体业务逻辑
 * 采用懒启动策略，仅在需要时启动HTTP服务器
 */

import { PORT } from './config';
import { logger } from './logger';
import { configureMcpServer, startMcpServer } from './mcp';

// 导入新的服务器架构模块
import { httpServer } from './server/core/server';
import { webSocketManager } from './server/websocket/connection';
import './server/messaging/handlers'; // 自动注册所有消息处理器

/**
 * 应用程序主函数
 */
async function main() {
    // 1. 预配置服务器组件（不启动）
    logger.info('初始化服务器组件...');

    // 2. 配置MCP服务器
    configureMcpServer();

    // 3. 仅启动 MCP 服务器，HTTP 服务器将在需要时懒启动
    try {
        await startMcpServer();
        logger.info('MCP 服务器已成功启动。HTTP 服务器将在需要时启动。');
    } catch (error: unknown) {
        logger.error('启动 MCP 服务器失败:', error);
        
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError.code === 'EADDRINUSE') {
                logger.error(`端口 ${PORT} 已被占用。是否有另一个服务器实例正在运行？`);
            }
        }
        process.exit(1);
    }
} // main function ends here

// 启动应用程序
main();
