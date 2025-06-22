/**
 * Dynamic Interaction 应用程序入口点
 * 
 * 该文件负责初始化和启动各个模块，不包含具体业务逻辑
 */

import { PORT } from './config';
import { freePortIfOccupied } from './server/port';
import { configureExpress, startExpressServer } from './server/express';
import { configureWebSocketServer } from './server/websocket';
import { configureMcpServer, startMcpServer } from './mcp';

/**
 * 应用程序主函数
 */
async function main() {
    // 1. 配置 Express 应用 (例如设置静态文件目录)
    configureExpress();

    // 2. 配置 WebSocket 服务器 (设置连接处理逻辑)
    configureWebSocketServer(); // 重要：确保这在服务器监听前或同时配置
    configureMcpServer();

    // 3. 启动 HTTP 服务器 (WebSocket 服务器附加在上面)
    try {
        await freePortIfOccupied(PORT);
        await startExpressServer(); // 这会启动服务器并开始监听端口
        await startMcpServer();
        console.log('应用程序已成功启动。');
    } catch (error: unknown) { // Explicitly type error as unknown
        console.error('启动服务器失败:', error);
        // Type guard for error with a 'code' property
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const nodeError = error as NodeJS.ErrnoException; // Cast to ErrnoException
            if (nodeError.code === 'EADDRINUSE') {
                console.error(`端口 ${PORT} 已被占用。是否有另一个服务器实例正在运行？`);
            }
        }
        process.exit(1);
    }
} // main function ends here

// 启动应用程序
main();
