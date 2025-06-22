/**
 * MCP 服务器配置
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_CONFIG, DEFAULT_TIMEOUT } from '../config';
import { solicitUserInput } from './solicit-input';
import { logger } from "../logger";
import { z } from 'zod';

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
    mcpServer.registerTool(
        "solicit-input",
        {
            description: `
# 工具名称: solicit-input

**功能描述:**
启动一个 Web UI 界面，用于收集用户的多模态反馈。当需要人类用户对 AI 的工作结果进行验证、提供修正意见或进行确认时，应调用此工具。

**参数 (Args):**

* \`project_directory\` (str, 必填): 需要用户审核的项目目录的绝对路径。
* \`summary\` (str, 必填): 向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。
* \`timeout\` (int, 无效值): 等待用户反馈的超时时间（秒）。默认值: ${DEFAULT_TIMEOUT}。

**用户交互流程:**
1.  UI 界面会显示 \`summary\` 中的工作摘要。
2.  用户可以通过执行命令、输入文本、上传图片等方式提供反馈。

**返回值 (Returns):**
一个包含用户所有反馈的列表 (List)。每个元素都是一个对象，如 \`{ type: "text", text: "..." }\` 或 \`{ type: "image", data: "..." }\`。超时或无反馈则返回空列表 \`{type: "text", text: "用户未提供反馈"}\`。
`,
            inputSchema: {
                summary: z.string().describe("向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。"),
                project_directory: z.string().describe("需要用户审核的项目目录的绝对路径。"),
                timeout: z.number().optional().describe(`等待用户反馈的超时时间（秒）。默认值: ${DEFAULT_TIMEOUT}。`).default(DEFAULT_TIMEOUT)
            },
            annotations: {
                displayName: "用户反馈收集器"
            }
        },
        async ({ summary, project_directory, timeout }) => {
            logger.info(`MCP: 请求用户输入。项目目录: ${project_directory}, 摘要: ${summary}`);
            try {
                // 调用实际的 solicitUserInput 函数，与前端 UI 建立会话并等待反馈
                const feedback = await solicitUserInput(project_directory, summary);

                // 将反馈转换为 MCP 期望的返回格式（List<any>）
                const content: any[] = [];

                if (feedback.text) {
                    content.push({ type: "text", text: `用户反馈: ${feedback.text}` });
                }

                if (feedback.imageData) {
                    if (Array.isArray(feedback.imageData)) {
                        feedback.imageData.forEach((img) =>
                            content.push({ type: "image", data: img })
                        );
                    } else {
                        content.push({ type: "image", data: feedback.imageData });
                    }
                }

                if (feedback.commandOutput) {
                    content.push({ type: "command_output", text: `命令输出: ${feedback.commandOutput}` });
                }

                // 如果没有内容（例如超时或空反馈），返回默认 continue
                if (content.length === 0) {
                    content.push({ type: "text", text: "用户未提供反馈，继续执行" });
                }

                return { content };
            } catch (error) {
                // 发生错误时通知调用方
                return {
                    content: [
                        {
                            type: "error",
                            text: (error instanceof Error ? error.message : String(error)),
                        },
                    ],
                };
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
