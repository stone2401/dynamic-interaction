/**
 * 命令执行模块
 * 处理命令输入和执行
 */

import { sendCommand } from './websocket.js';

const commandInput = document.getElementById('command') as HTMLInputElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;

/**
 * 执行命令
 * @returns {boolean} 命令是否成功发送
 */
function runCommand(): boolean {
    const command = commandInput.value.trim();

    if (!command) {
        resultsDiv.textContent = '请输入要执行的命令';
        return false;
    }

    resultsDiv.textContent = `执行命令: ${command}...`;

    // 发送命令到服务器
    const success = sendCommand(command);

    if (success) {
        // 清空命令输入框
        commandInput.value = '';
    }

    return success;
}

/**
 * 初始化命令执行功能
 */
function initializeCommandHandlers(): void {
    // 为执行按钮添加点击事件
    const runButton = document.getElementById('run-command-btn');
    if (runButton) {
        runButton.addEventListener('click', runCommand);
    }

    // 为命令输入框添加回车键事件
    commandInput.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runCommand();
        }
    });
}

// 当DOM加载完成后初始化命令处理
document.addEventListener('DOMContentLoaded', initializeCommandHandlers);

// 导出函数供其他模块使用
export { runCommand };
