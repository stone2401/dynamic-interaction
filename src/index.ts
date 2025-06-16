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
  try {
    // 配置各个模块
    configureExpress();
    configureWebSocketServer();
    configureMcpServer();
    
    // 启动 MCP 服务器
    await startMcpServer();
    
    // 检查并释放端口（如果被占用）
    await freePortIfOccupied(PORT);
    
    // 启动 Express 服务器
    await startExpressServer();
  } catch (err: any) {
    console.error('启动服务器失败:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`端口 ${PORT} 已被占用。是否有另一个服务器实例正在运行？`);
    }
    process.exit(1);
  }
}

// 启动应用程序
main();
