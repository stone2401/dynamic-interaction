import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../../logger';
import { PORT } from '../../config';

/**
 * 尝试启动 Sidecar GUI
 * 如果命令不存在或启动失败，不会抛出错误
 */
export function launchSidecar(): void {
  const url = `http://localhost:${PORT}`;
  const execName = process.platform === 'win32' ? 'sidecar.exe' : 'sidecar';
  const localPath = join(__dirname, '../../..', 'bin', execName);
  const cmd = existsSync(localPath) ? localPath : 'sidecar';
  try {
    const child = spawn(cmd, ['--url', url], {
      detached: true,
      stdio: 'ignore'
    });
    child.on('error', (err) => {
      logger.warn(`Sidecar 启动失败: ${err.message}`);
    });
    child.unref();
    logger.info(`尝试通过 Sidecar 打开 GUI: ${url}`);
  } catch (err) {
    logger.warn(`无法启动 Sidecar: ${err instanceof Error ? err.message : String(err)}`);
  }
}
