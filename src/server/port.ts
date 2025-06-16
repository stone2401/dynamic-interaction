/**
 * 端口管理工具
 * 负责检查和释放被占用的端口
 */

import { execSync } from 'child_process';

/**
 * 如果指定端口被占用，尝试释放它
 * @param port 要检查的端口号
 */
export function freePortIfOccupied(port: number): void {
    try {
        // 获取监听指定端口的进程 PID (macOS / Linux)
        const output = execSync(`lsof -i :${port} -P -t -sTCP:LISTEN`, {
            stdio: ['pipe', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
            
        if (!output) {
            return; // 端口未被占用
        }
        
        const pids = output.split('\n').filter(Boolean);
        pids.forEach((pid) => {
            try {
                const cmd = execSync(`ps -p ${pid} -o command=`, {
                    stdio: ['pipe', 'pipe', 'ignore'],
                })
                    .toString()
                    .trim();
                    
                const isOwn = cmd.includes('dynamic-interaction') || cmd.includes('src/index.ts');
                if (isOwn) {
                    console.log(`正在终止占用端口 ${port} 的先前实例 (PID ${pid})`);
                    try {
                        // 强制终止进程
                        process.kill(parseInt(pid, 10), 'SIGKILL');
                        // 添加小延迟确保进程已终止
                        execSync('sleep 1', { stdio: 'ignore' });
                    } catch (e) {
                        console.warn(`无法终止进程 ${pid}:`, e);
                    }
                } else {
                    throw new Error(`端口 ${port} 被另一个进程占用 (PID ${pid}): ${cmd}`);
                }
            } catch (err: any) {
                if (err.status !== 1) { // 忽略"进程未找到"错误
                    throw err;
                }
            }
        });
    } catch (err: any) {
        // lsof 在未找到进程时返回退出代码 1；忽略此情况
        if (err.status !== 1) {
            throw err;
        }
    }
}
