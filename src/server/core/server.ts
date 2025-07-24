/**
 * HTTP 服务器管理
 * 负责HTTP服务器的创建和配置
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { PORT } from '../../config';
import { logger } from '../../logger';

export class HttpServer {
  private static instance: HttpServer;
  private app: express.Application;
  private server: http.Server;

  private constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.configureMiddleware();
  }

  public static getInstance(): HttpServer {
    if (!HttpServer.instance) {
      HttpServer.instance = new HttpServer();
    }
    return HttpServer.instance;
  }

  private configureMiddleware(): void {
    // 提供静态文件服务
    const staticPath = path.join(__dirname, '..', '..', 'public');
    this.app.use(express.static(staticPath));

    // 默认语言注入中间件
    this.app.use((req, res, next) => {
      if (req.path === '/' || req.path === '/index.html') {
        const filePath = path.join(staticPath, 'index.html');
        let html = fs.readFileSync(filePath, 'utf-8');
        html = html.replace('<html>', `<html lang="${process.env.DEFAULT_LANGUAGE || 'zh'}">`);
        html = html.replace('</head>', `<script>window.__DEFAULT_LANG__ = "${process.env.DEFAULT_LANGUAGE || 'zh'}";</script></head>`);
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
        return;
      }
      next();
    });
    logger.info(`静态文件服务路径: ${staticPath}`);

    // /config 路由，提供运行时配置
    this.app.get('/config', (_req, res) => {
      res.json({ defaultLanguage: process.env.DEFAULT_LANGUAGE || 'zh' });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): http.Server {
    return this.server;
  }

  public async start(port: number = PORT): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.listen(port, () => {
        logger.info(`HTTP服务器已启动，监听地址: http://localhost:${port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('HTTP服务器启动失败:', error);
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          logger.error('关闭HTTP服务器时出错:', err);
          reject(err);
          return;
        }
        logger.info('HTTP服务器已成功关闭');
        resolve();
      });
    });
  }
}

export const httpServer = HttpServer.getInstance();