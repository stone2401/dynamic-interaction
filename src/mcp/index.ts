/**
 * MCP 服务器配置
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_CONFIG, SESSION_TIMEOUT, TIMEOUT_PROMPT } from '../config';
import { solicitUserInput, notifyUser } from './solicit-input';
import { normalizeImageFeedback } from '../utils/image';
import { SessionMode } from '../types/session';
import { logger } from '../logger';
import { z } from 'zod';
import { lifecycleManager } from '../server/core/lifecycle';
import { startServer } from '../server/core/app';
import { freePortIfOccupied } from '../server/port';
import { PORT } from '../config';

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
* \`summary\` (str, 必填): 向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。内容为 Markdown 格式。
* \`timeout\` (int, 无效值): 等待用户反馈的超时时间（秒）。默认值: ${SESSION_TIMEOUT}。

**用户交互流程:**
1.  UI 界面会显示 \`summary\` 中的工作摘要。
2.  用户可以通过执行命令、输入文本、上传图片等方式提供反馈。

**返回值 (Returns):**
一个包含用户所有反馈的列表 (List)。每个元素都是一个对象，如 \`{ type: "text", text: "..." }\` 或 \`{ type: "image", data: "..." }\`。超时或无反馈则返回空列表 \`{type: "text", text: "用户未提供反馈"}\`。
`,
            inputSchema: {
                summary: z.string().describe("向用户展示的 AI 工作摘要。应清晰说明 AI 完成了什么，并引导用户反馈。内容为 Markdown 格式。"),
                project_directory: z.string().describe("需要用户审核的项目目录的绝对路径。"),
                timeout: z.number().optional().describe(`等待用户反馈的超时时间（秒）。默认值: ${SESSION_TIMEOUT}。`).default(SESSION_TIMEOUT)
            },
            annotations: {
                displayName: "用户反馈收集器"
            }
        },
        async ({ summary, project_directory, timeout }) => {
            logger.info(`MCP: 请求用户输入。项目目录: ${project_directory}, 摘要: ${summary}`);
            try {
                // 检查HTTP服务器是否已启动，如果未启动则启动它
                if (lifecycleManager.state === 'stopped') {
                    logger.info('HTTP服务器未启动，正在启动...');
                    try {
                        await freePortIfOccupied(PORT);
                        await startServer();
                        logger.info(`HTTP服务器已懒启动，监听地址: http://localhost:${PORT}`);
                    } catch (error) {
                        logger.error('启动HTTP服务器失败:', error);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `错误: 启动HTTP服务器失败: ${error instanceof Error ? error.message : String(error)}`,
                                },
                            ],
                        };
                    }
                }

                // 调用实际的 solicitUserInput 函数，与前端 UI 建立会话并等待反馈
                const feedback = await solicitUserInput(project_directory, summary, SessionMode.INTERACTIVE);

                // 将反馈转换为 MCP 期望的返回格式（List<any>）
                const content: any[] = [];

                if (feedback.text) {
                    // 检测特殊的会话状态标记
                    if (feedback.text === '__SESSION_TIMEOUT__') {
                        content.push({ type: "text", text: TIMEOUT_PROMPT });
                        logger.warn("MCP: 会话超时标记被检测到，返回超时消息");
                    } else if (feedback.text === '__SESSION_CLOSED__') {
                        // 用户主动关闭会话，同样返回 continue
                        content.push({ type: "text", text: TIMEOUT_PROMPT });
                        logger.warn("MCP: 会话关闭标记被检测到，返回 continue");
                    } else {
                        content.push({ type: "text", text: `用户反馈: ${feedback.text}` });
                    }
                }

                if (feedback.imageData) {
                    logger.debug("MCP: 收到图片反馈:", feedback.imageData);
                    const datas = Array.isArray(feedback.imageData)
                      ? feedback.imageData
                      : [feedback.imageData];

                    datas.forEach((img) => {
                      try {
                        const { data, mimeType } = normalizeImageFeedback(img);
                        content.push({ type: "image", data, mimeType });
                      } catch (e) {
                        logger.error("图片解析失败", e);
                      }
                    });
                  }

                if (feedback.commandOutput) {
                    content.push({ type: "command_output", text: `命令输出: ${feedback.commandOutput}` });
                }

                // 如果没有内容（例如超时或空反馈），返回默认 continue
                if (content.length === 0) {
                    content.push({ type: "text", text: "用户未提供反馈，继续执行" });
                }

                logger.info(`MCP: 准备返回给 Agent 的最终内容: ${JSON.stringify(content, null, 2)}`);

                return { content };
            } catch (error) {
                // 发生错误时通知调用方
                return {
                    content: [
                        {
                            type: "text",
                            text: `错误: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
    );

    // 配置 notify-user 工具（通知模式）
    mcpServer.registerTool(
        "notify-user",
        {
            description: `
# 工具名称: notify-user

**功能描述:**
发送通知消息给用户，不等待用户响应。适用于 AI 需要告知用户工作进展或状态更新，但不需要用户反馈的场景。

**参数 (Args):**

* \`project_directory\` (str, 必填): 相关项目目录的绝对路径。
* \`summary\` (str, 必填): 通知内容。应清晰说明 AI 的工作状态或进展。内容为 Markdown 格式。

**用户交互流程:**
1.  通知消息会在用户界面中显示。
2.  系统不会等待用户响应，立即返回成功状态。

**返回值 (Returns):**
立即返回通知发送成功的确认信息。
`,
            inputSchema: {
                summary: z.string().describe("通知内容。应清晰说明 AI 的工作状态或进展。内容为 Markdown 格式。"),
                project_directory: z.string().describe("相关项目目录的绝对路径。")
            },
            annotations: {
                displayName: "用户通知器"
            }
        },
        async ({ summary, project_directory }) => {
            logger.info(`MCP: 发送通知。项目目录: ${project_directory}, 摘要: ${summary}`);
            try {
                // 检查HTTP服务器是否已启动，如果未启动则启动它
                if (lifecycleManager.state === 'stopped') {
                    logger.info('HTTP服务器未启动，正在启动...');
                    try {
                        await freePortIfOccupied(PORT);
                        await startServer();
                        logger.info(`HTTP服务器已懒启动，监听地址: http://localhost:${PORT}`);
                    } catch (error) {
                        logger.error('启动HTTP服务器失败:', error);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `错误: 启动HTTP服务器失败: ${error instanceof Error ? error.message : String(error)}`,
                                },
                            ],
                        };
                    }
                }

                // 调用通知函数，立即返回
                const feedback = await notifyUser(project_directory, summary);

                logger.info(`MCP: 通知已发送: ${JSON.stringify(feedback)}`);

                return {
                    content: [
                        {
                            type: "text",
                            text: `通知已成功发送: ${feedback.text || '通知已显示在用户界面'}`,
                        },
                    ],
                };
            } catch (error) {
                // 发生错误时通知调用方
                return {
                    content: [
                        {
                            type: "text",
                            text: `错误: ${error instanceof Error ? error.message : String(error)}`,
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
}
