/**
 * 应用程序主入口
 * 统一管理服务器的启动和停止
 */

import { lifecycleManager } from './lifecycle';
import { logger } from '../../logger';
import { ServerError } from '../utils/errors';

export class Application {
  private static instance: Application;

  private constructor() {}

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  public async start(): Promise<void> {
    try {
      logger.info('启动应用程序...');
      await lifecycleManager.startServer();
      logger.info('应用程序启动完成');
    } catch (error) {
      logger.error('应用程序启动失败:', error);
      throw error;
    }
  }

  public async stop(immediate: boolean = false): Promise<void> {
    try {
      logger.info('停止应用程序...');
      await lifecycleManager.stopServer(immediate);
      logger.info('应用程序已停止');
    } catch (error) {
      logger.error('应用程序停止失败:', error);
      throw error;
    }
  }

  public getStatus() {
    return {
      state: lifecycleManager.state,
      stats: lifecycleManager.getServerStats()
    };
  }
}

export const app = Application.getInstance();

// 导出便捷函数
export const startServer = () => app.start();
export const stopServer = (immediate?: boolean) => app.stop(immediate);