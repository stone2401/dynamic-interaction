/**
 * Express 服务器配置
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { PORT } from '../config';
import { logger } from '../logger';
import { serverStateManager } from './serverState';

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
  // 如果服务器已经在运行，直接返回
  if (serverStateManager.state === 'running' || serverStateManager.state === 'starting') {
    logger.info('服务器已经在运行或正在启动中');
    return;
  }

  // 使用服务器状态管理器启动服务器
  return serverStateManager.startServer();
}

/**
 * 停止 HTTP 服务器
 * @param immediate 是否立即停止，不等待延迟
 * @returns 停止成功的 Promise
 */
export async function stopExpressServer(immediate: boolean = false): Promise<void> {
  return serverStateManager.stopServer(immediate);
}
