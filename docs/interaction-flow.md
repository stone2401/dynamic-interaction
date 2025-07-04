# 交互流程文档

本文档详细说明了 AI 助手与 MCP 服务之间的完整交互流程。

**适用对象:** 集成开发人员

## HTTP服务器懒启动机制

*   **目的**：避免多实例运行时的端口冲突，优化资源使用。
*   **工作流程**：
    *   **应用启动**：仅启动 MCP 服务器，不启动 HTTP 服务器。
    *   **首次调用**：当 AI 代理首次调用 `solicit-input` 工具时，检查 HTTP 服务器状态，如未启动则启动。
    *   **连接监控**：`ConnectionManager` 跟踪所有 WebSocket 连接，`SessionManager` 管理会话状态。
    *   **自动关闭**：当所有 WebSocket 连接关闭且没有活跃会话时，HTTP 服务器自动关闭，释放端口资源。
    *   **状态管理**：`serverStateManager` 单例类负责管理 HTTP 服务器的状态（`STOPPED`, `STARTING`, `RUNNING`, `STOPPING`）。
