/**
 * Express 服务器配置
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { PORT } from '../config';
import { logger } from '../logger';

// 创建 Express 应用实例
export const app = express();
export const server = http.createServer(app);

/**
 * 配置 Express 应用
 */
export function configureExpress(): void {
  // 提供静态文件服务
  logger.info(`提供静态文件服务: ${path.join(__dirname, '..', 'public')}`)
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

/**
 * 启动 HTTP 服务器
 * @returns 启动成功的 Promise
 */
export async function startExpressServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.listen(PORT, () => {
      logger.info(`服务器已启动，监听地址: http://localhost:${PORT}`);
      resolve();
    });
    server.on('error', reject);
  });
}
