/**
 * 处理客户端获取系统信息的请求。
 */
import { SessionContext } from '../../types/session';
import { messageRouter } from '../messageRouter';
import { SESSION_TIMEOUT } from '../../config';

function handleGetSystemInfo(session: SessionContext, data: any): void {
  const projectRoot = process.cwd();
  session.ws.send(JSON.stringify({
    type: 'system_info',
    data: {
      workspaceDirectory: session.request.projectDirectory || projectRoot,
      sessionId: session.id,
      serverVersion: process.env.npm_package_version || '1.0.0',
      leaseTimeoutSeconds: SESSION_TIMEOUT,
    },
  }));
}

messageRouter.register('get_system_info', handleGetSystemInfo);
