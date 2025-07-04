# 部署指南

本文档提供了环境配置、部署选项和故障排除的详细步骤。

**适用对象:** 运维人员、系统管理员

## 部署架构

本项目是一个 Node.js 应用程序，可以通过以下步骤进行部署和运行：

1.  **安装依赖**：
    ```bash
    npm install
    ```
2.  **构建前端** (如果直接运行 TypeScript 源文件，则需要编译，通常开发时不需要手动编译)：
    ```bash
    # 如果您修改了 src/public/ts 目录下的 TypeScript 文件，需要编译
    # npx tsc -p tsconfig.json
    ```
    *注意：本项目中，前端的 TypeScript 文件在开发时会被直接使用，并通过浏览器加载，因此通常不需要手动编译。但如果部署到生产环境，建议进行编译和打包优化。*
3.  **运行应用**：
    ```bash
    npm start
    ```
    应用程序将启动一个 HTTP 服务器和一个 WebSocket 服务器，并在控制台输出监听的端口。您可以通过浏览器访问 `http://localhost:<port>` 来使用。

**环境变量**：

以下环境变量可用于配置应用程序：

*   `PORT`：指定服务器监听的端口（默认 3000）。
*   `MCP_SERVER_NAME`：MCP 服务器的名称（默认 `mcp-feedback-enhanced`）。
*   `MCP_SERVER_VERSION`：MCP 服务器的版本（默认 `1.0.0`）。
*   `SESSION_TIMEOUT`：会话超时时间（默认 600 秒）。
*   `LOG_DIR`：日志文件存放目录（默认 `logs`）。
*   `LOG_LEVEL`：日志级别（默认 `info`）。

例如，要以调试模式在端口 8080 运行：

```bash
PORT=8080 LOG_LEVEL=debug npm start
```
