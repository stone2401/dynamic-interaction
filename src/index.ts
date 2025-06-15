import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { handleSolicitInputConnection as handleConnection } from './mcp/solicit_input';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from 'child_process';

// express
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
// ✨ 步骤 1: 创建一个集合来跟踪所有活动的 WebSocket 连接
const activeSockets = new Set<any>();

function freePortIfOccupied(port: number) {
    try {
        // Obtain PIDs listening on the given port (macOS / Linux)
        const output = execSync(`lsof -i :${port} -P -t -sTCP:LISTEN`, {
            stdio: ['pipe', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
        if (!output) {
            return; // Port is free
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
                    console.log(`Terminating previous instance (PID ${pid}) occupying port ${port}`);
                    try {
                        // Force kill the process
                        process.kill(parseInt(pid, 10), 'SIGKILL');
                        // Add a small delay to ensure the process is terminated
                        execSync('sleep 1', { stdio: 'ignore' });
                    } catch (e) {
                        console.warn(`Failed to kill process ${pid}:`, e);
                    }
                } else {
                    throw new Error(`Port ${port} is in use by another process (PID ${pid}): ${cmd}`);
                }
            } catch (err: any) {
                if (err.status !== 1) { // Ignore "process not found" errors
                    throw err;
                }
            }
        });
    } catch (err: any) {
        // lsof returns exit code 1 if no process was found; ignore this case
        if (err.status !== 1) {
            throw err;
        }
    }
}

const PORT = Number(process.env.PORT) || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    activeSockets.add(ws); // ✨ 步骤 2: 在连接建立时添加到集合
    handleConnection(ws, req);
    ws.on('close', () => {
        activeSockets.delete(ws); // ✨ 步骤 2: 在连接关闭时从集合中移除
    });
});

// 初始化 MCP 服务器
const mcpServer = new McpServer({
    name: "dynamic-interaction",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

mcpServer.tool(
    "solicit-input",
    `
# 工具名称: solicit-input

**功能描述:**
启动一个 Web UI 界面，用于收集用户的多模态反馈。当需要人类用户对 AI 的工作结果进行验证、提供修正意见或进行确认时，应调用此工具。

**参数 (Args):**

* \`project_directory\` (str, 必填): 需要用户审核的项目目录的绝对路径。
* \`summary\` (str, 必填): 向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。
* \`timeout\` (int, 选填): 等待用户反馈的超时时间（秒）。默认值: 600。

**用户交互流程:**
1.  UI 界面会显示 \`summary\` 中的工作摘要。
2.  用户可以通过执行命令、输入文本、上传图片等方式提供反馈。

**返回值 (Returns):**
一个包含用户所有反馈的列表 (List)。每个元素都是一个对象，如 \`{ type: "text", content: "..." }\` 或 \`{ type: "image", path: "..." }\`。超时或无反馈则返回空列表 \`[]\`。
    `,
    {
        summary: "AI 工作完成的摘要说明",
        timeout: 600,
        project_directory: "/path/to/project" // 建议也提供一个示例或默认值
    },
    async (res) => {
        return {
            content: [
                {
                    type: "text",
                    text: "用户输入的反馈文本",
                },
                {
                    type: "image",
                    data: "base64 encoded image data",
                    mimeType: "image/png",
                }
            ]
        }
    }
);


async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Dynamic Interaction MCP Server running on stdio");

    await freePortIfOccupied(PORT);
    await new Promise<void>((resolve, reject) => {

        server.listen(PORT, resolve);
        server.on('error', reject);
    });
    console.log(`Server is listening on http://localhost:${PORT}`);
}

main().catch(err => {
    console.error("Failed to start the server:", err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Is another instance of the server running?`);
    }
    process.exit(1);
});
