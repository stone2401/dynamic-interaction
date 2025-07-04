# API 参考文档

本文档包含了 MCP 工具接口和 WebSocket API 的详细规范。

**适用对象:** API 使用者、前端开发

## WebSocket 通信流

*   **前端到后端**：
    *   所有来自前端的消息（如 `submit_feedback`, `ping`, `get_system_info`）都由 `websocket.ts` 接收。
    *   `websocket.ts` **不解析消息内容**，而是直接将消息和 WebSocket 连接实例传递给 `messageRouter.route()` 方法。
    *   `messageRouter` 根据消息的 `type` 字段，调用在相应 `handler`（例如 `feedbackHandler`）中预先注册的处理函数。
*   **后端到前端**：
    *   **AI 摘要**：后端通过 WebSocket 发送 `summary` 消息。
    *   **实时日志**：`websocketTransport.ts` 将日志作为 `server_log` 消息推送。
    *   **系统信息**：`systemInfoHandler` 响应 `get_system_info` 请求，发送 `system_info` 消息。
    *   **反馈状态**：`feedbackHandler` 处理完用户反馈后，发送 `feedback_status` 消息。
    *   **会话超时**：如果会话达到超时，后端发送 `timeout` 消息。
    *   **Pong 响应**：`pingHandler` 响应 `ping` 消息，发送 `pong` 消息。

## MCP (Model Context Protocol) 交互

*   **AI 代理集成**：后端通过 `src/mcp/index.ts` 启动 MCP 服务器，并通过 `process.stdin` 和 `process.stdout` 与外部 AI 代理进行通信。
*   **`solicit-input` 工具**：AI 代理调用 `solicit-input` 工具向用户请求反馈。后端 `src/mcp/solicit-input.ts` 接收请求，通过 WebSocket 转发到前端。前端收集反馈后，再通过 WebSocket 发送回后端，后端将反馈传递给 MCP 服务器，最终返回给 AI 代理。
