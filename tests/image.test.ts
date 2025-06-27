import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const transport = new StdioClientTransport(
    {
        command: process.execPath,
        args: [
            "/Users/stone2401/Desktop/project/NodeJs/dynamic-interaction/dist/src/cli.js"
        ],
        env: {
            "LOG_DIR": "/Users/stone2401/Desktop/project/NodeJs/dynamic-interaction/logs",
            "LOG_ERROR_FILE": "error.log",
            "LOG_COMBINED_FILE": "combined.log",
            "LOG_LEVEL": "info",
            "LOG_COLORIZE": "false",
            "LOG_TO_FILE": "true"
        }
    },
);
const client = new Client({
    name: 'dynamic-interaction',
    version: '1.0.0',
}, {
    capabilities: {
        sampling: {
        },
        resources: {},
        tools: {},
    },
});

client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    const {
        params: { messages },
    } = request;
    return new Promise((resolve) => {
        rl.question(`${messages[0].content.text}`, (answer) => {
            resolve({ model: '', role: 'user', content: { type: 'text', text: answer } });
        });
    });
});



async function TestImage() {
    // 连接客户端到 MCP 服务器
    await client.connect(transport);
    const tools = await client.listTools();
    console.log("tools", tools)
}


TestImage();