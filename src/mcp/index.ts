/**
 * MCP 服务器配置
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_CONFIG, DEFAULT_TIMEOUT } from '../config';

// 创建 MCP 服务器实例
export const mcpServer = new McpServer({
    name: MCP_CONFIG.name,
    version: MCP_CONFIG.version,
    capabilities: {
        resources: {},
        tools: {},
    },
});

/**
 * 配置 MCP 服务器工具
 */
export function configureMcpServer(): void {
    // 配置 solicit-input 工具
    mcpServer.tool(
        "solicit-input",
        `
# 工具名称: solicit-input

**功能描述:**
启动一个 Web UI 界面，用于收集用户的多模态反馈。当需要人类用户对 AI 的工作结果进行验证、提供修正意见或进行确认时，应调用此工具。

**参数 (Args):**

* \`project_directory\` (str, 必填): 需要用户审核的项目目录的绝对路径。
* \`summary\` (str, 必填): 向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。
* \`timeout\` (int, 选填): 等待用户反馈的超时时间（秒）。默认值: ${DEFAULT_TIMEOUT}。

**用户交互流程:**
1.  UI 界面会显示 \`summary\` 中的工作摘要。
2.  用户可以通过执行命令、输入文本、上传图片等方式提供反馈。

**返回值 (Returns):**
一个包含用户所有反馈的列表 (List)。每个元素都是一个对象，如 \`{ type: "text", text: "..." }\` 或 \`{ type: "image", data: "..." }\`。超时或无反馈则返回空列表 \`{type: "text", text: "continue"}\`。
    `,
        {
            summary: "AI 工作完成的摘要说明",
            timeout: DEFAULT_TIMEOUT,
            project_directory: "/path/to/project" // 建议提供一个示例或默认值
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
}

/**
 * 启动 MCP 服务器
 */
export async function startMcpServer(): Promise<void> {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Dynamic Interaction MCP 服务器正在通过 stdio 运行");
}
