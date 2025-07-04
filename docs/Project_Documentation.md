# 项目文档

欢迎来到动态交互项目的文档中心。本文档旨在为不同角色的使用者提供清晰、全面的项目信息。

## 文档结构

为了提高文档的可读性和可维护性，我们将文档拆分成了多个独立的部分，每个部分都针对特定的受众和主题。

*   **[架构概览](./architecture-overview.md)**
    *   **内容**: 系统的高层级架构、核心功能、关键技术栈和未来的扩展性考虑。
    *   **目标受众**: 架构师、技术负责人、新加入的开发人员。

*   **[组件详细说明](./component-details.md)**
    *   **内容**: 前端和后端各个模块的详细设计、功能说明和核心逻辑。
    *   **目标受众**: 开发人员、维护人员。

*   **[交互流程](./interaction-flow.md)**
    *   **内容**: AI 代理、MCP 服务、后端和前端之间的详细数据流和交互时序。
    *   **目标受众**: 需要理解系统内部工作流程的开发人员。

*   **[API 参考](./api-reference.md)**
    *   **内容**: WebSocket API 的消息格式、MCP 工具的接口定义和使用方法。
    *   **目标受众**: API 使用者、前端开发人员、集成开发人员。

*   **[部署指南](./deployment-guide.md)**
    *   **内容**: 项目的安装、配置、构建和部署步骤，以及可用的环境变量。
    *   **目标受-众**: 运维人员、系统管理员。

## 如何使用

我们建议您根据自己的角色和需求，选择阅读相应的文档。如果您是第一次接触本项目，建议从 **[架构概览](./architecture-overview.md)** 开始，以建立对项目的整体理解。

    *   确保日志目录存在。

### `src/cli.ts`

*   **功能**：简单的命令行接口，用于启动应用程序。它主要通过 `require('./index.js')` 来执行主入口文件。

### `src/mcp/index.ts`

*   **功能**：初始化 MCP (Model Context Protocol) 服务器实例，并注册 AI 代理可用的工具。它是后端与 AI 模型通信的桥梁。
*   **核心逻辑**：
    *   创建 `MCP.Server` 实例，配置服务器名称和版本。
    *   注册 `solicit-input` 工具，该工具允许 AI 代理向用户请求反馈。
    *   启动 MCP 服务器，通过 `process.stdin` 和 `process.stdout` 进行通信。

### `src/mcp/solicit-input.ts`

*   **功能**：实现 `solicit-input` MCP 工具的具体逻辑。该工具通过 WebSocket 与前端交互，弹出一个 Web UI 界面来收集用户的多模态反馈（文本和图片）。
*   **核心逻辑**：
    *   包含 `solicitUserInput` 函数，负责向前端发送请求，等待用户反馈。
    *   在首次调用时检查并启动HTTP服务器（懒启动机制）。
    *   利用 `sessionQueue` 管理反馈请求，确保请求的可靠性和超时处理。
    *   支持在浏览器中打开指定 URL。

### `src/server/websocket.ts`

*   **功能**：配置和管理 WebSocket 服务器，是所有客户端连接的入口。它负责连接生命周期管理，并将所有传入的消息分发给消息路由器进行处理。
*   **核心逻辑**：
    *   初始化 `ws` (WebSocket) 服务器，配置为 `noServer: true` 以支持懒启动。
    *   使用 `ConnectionManager` 跟踪和管理所有活跃的 WebSocket 连接。
    *   监听 `connection` 事件，当新客户端连接时，将其交由 `ConnectionManager` 管理。
    *   监听 `message` 事件，将收到的原始消息传递给 `messageRouter` 进行路由和处理，自身不处理任何业务逻辑。
    *   监听 `close` 和 `error` 事件，并委托给 `sessionManager` 处理断开连接的后续逻辑。
    *   定期调用 `checkQueueAndProcess` 检查并处理会话请求队列。

### `src/server/sessionQueue.ts`

*   **功能**：实现一个可靠的会话请求队列。它支持租约机制、超时自动重试和请求去重，确保每个反馈请求都能被处理且不丢失。
*   **核心逻辑**：
    *   `ReliableSessionQueue` 类维护一个等待队列和正在处理的请求映射。
    *   `enqueue` 方法添加新请求到等待队列。
    *   `leaseNext` 方法从队列中获取一个请求并为其设置租约计时器。
    *   `acknowledge` 方法确认请求已成功处理并将其从系统中移除。
    *   `requeue` 方法在处理失败或超时时将请求重新放回等待队列。

### `src/server/sessionManager.ts`

*   **功能**：管理 WebSocket 会话的生命周期，是会话状态的权威来源。它不直接处理 WebSocket 消息，而是专注于会话的创建、销毁和状态转换。
*   **核心逻辑**：
    *   `SessionManager` 类维护一个活跃会话的映射。
    *   `startSession` 创建新会话，将其与一个可用的 WebSocket 连接关联。
    *   `endSession` 结束会话，并释放其占用的连接。
    *   `handleDisconnection` 处理连接断开的逻辑，确保相关会话被正确清理，并检查是否需要关闭服务器。
    *   与 `sessionQueue` 和 `mcpServer` 协作，将用户反馈传递给 AI 代理。

### `src/server/messageRouter.ts`

*   **功能**：实现一个单例的消息路由器，根据消息类型将传入的 WebSocket 消息分发给已注册的处理器。这是实现业务逻辑与通信层解耦的核心。
*   **核心逻辑**：
    *   提供 `register` 方法，允许不同的消息处理器注册自己来响特定类型的消息。
    *   提供 `route` 方法，接收来自 `websocket.ts` 的原始消息，解析消息类型，并调用相应的处理器。
    *   如果找不到处理器，会记录错误日志。

### `src/server/handlers/`

*   **功能**：存放所有模块化的消息处理器。每个处理器负责一种特定类型的消息，使其逻辑内聚且易于维护。
*   **核心逻辑**：
    *   `index.ts`：导入所有处理器并调用它们的注册函数，确保在应用启动时所有处理器都已在 `messageRouter` 中注册。
    *   `feedbackHandler.ts`：处理 `submit_feedback` 消息，负责将用户反馈传递给 `sessionManager`。
    *   `commandHandler.ts`：处理 `command` 消息。
    *   `systemInfoHandler.ts`：处理 `get_system_info` 请求。

### `src/server/express.ts`

*   **功能**：配置 Express HTTP 服务器。它主要用于提供前端静态文件服务，确保前端页面能够被正确加载。支持懒启动和停止机制。
*   **核心逻辑**：
    *   创建 Express 应用实例。
    *   使用 `express.static` 中间件服务 `src/public` 目录下的静态文件。
    *   提供 `startServer` 和 `stopServer` 方法，由 `serverStateManager` 调用以实现懒启动和自动关闭。

### `src/server/port.ts`

*   **功能**：提供端口管理工具，用于检查指定端口是否可用，并在端口被占用时尝试寻找下一个可用端口。这有助于避免开发环境下的端口冲突。
*   **核心逻辑**：
    *   `checkPortAndListen` 函数尝试在指定端口启动服务器。
    *   如果端口被占用，则递归地尝试下一个端口。

### `src/server/websocketTransport.ts`

*   **功能**：为 `winston` 日志库实现一个自定义的 WebSocket 传输器。它允许后端将日志消息实时发送到所有连接的 WebSocket 客户端，以便在前端控制台或 UI 中显示。
*   **核心逻辑**：
    *   继承 `winston.Transport` 类。
    *   `log` 方法将日志消息通过 WebSocket 广播给所有连接的客户端。

## 5. 前端模块分析

### `src/public/index.html`

*   **功能**：前端应用程序的主入口页面，定义了整个 Web UI 的结构和布局，并引入了所有必要的 CSS 样式和 JavaScript 脚本。
*   **核心逻辑**：
    *   引入 `css/main.css` 作为主样式表。
    *   引入 `marked.min.js` 和 `highlight.min.js` 用于 Markdown 渲染和代码高亮。
    *   引入 `lucide.js` 图标库。
    *   引入 `js/main.js`、`js/statusBar.js` 等编译后的前端逻辑脚本。
    *   定义了状态栏、AI 工作摘要面板、反馈输入区、图片拖放区、图片预览区和图片模态框等 UI 元素。

### `src/public/ts/main.ts`

*   **功能**：前端应用程序的主要入口文件，负责初始化所有前端模块并协调用户交互。
*   **核心逻辑**：
    *   导入 `feedback.js`, `theme.js`, `imageHandler.js` 等模块。
    *   在 `initializeApp` 函数中初始化主题切换、拖放、粘贴图片功能，并设置反馈发送的事件监听。
    *   处理页面卸载前的提示，防止用户丢失未发送内容。

### `src/public/ts/websocket.ts`

*   **功能**：处理前端与后端 WebSocket 服务器的所有通信。包括建立连接、接收和发送消息、处理连接断开和重连机制。
*   **核心逻辑**：
    *   `connectWebSocket` 函数管理 WebSocket 连接，处理 `onopen`, `onmessage`, `onclose`, `onerror` 事件。
    *   `onmessage` 处理不同类型的消息（如 `summary`, `server_log`, `pong`, `system_info`, `feedback_status`, `timeout`），并更新 UI。
    *   实现指数退避重连机制 (`scheduleReconnect`)。
    *   导出 `sendCommand` 和 `sendFeedback` 函数，供其他模块发送数据到后端。

### `src/public/ts/feedback.ts`

*   **功能**：管理用户反馈的收集和发送。它处理文本输入和图片附件，并将其组合发送到后端。
*   **核心逻辑**：
    *   `sendCompositeFeedback` 函数获取用户输入的文本和附加的图片数据。
    *   调用 `websocket.ts` 中的 `sendFeedback` 将数据发送到服务器。
    *   控制反馈输入框的启用/禁用状态，并更新消息状态。

### `src/public/ts/imageHandler.ts`

*   **功能**：处理前端的图片上传、预览和管理。支持拖放、粘贴和文件选择方式添加图片。
*   **核心逻辑**：
    *   `processFiles` 函数读取图片文件，生成 Data URL，并创建预览元素。
    *   `setupDragAndDrop` 设置拖放区域的事件监听。
    *   `setupPasteListener` 设置粘贴事件监听，处理从剪贴板粘贴图片。
    *   提供 `clearPreview` 清空预览。

### `src/public/ts/statusBar.ts`

*   **功能**：管理和更新前端界面的状态栏显示。包括连接状态、网络延迟、会话信息（工作区目录、会话 ID、会话剩余时间）和消息状态。
*   **核心逻辑**：
    *   更新连接状态 (`updateConnectionStatus`)、网络延迟 (`updateLatency`) 和消息状态 (`updateMessageStatus`)。
    *   实现心跳机制 (`startPingInterval`, `sendPing`, `handlePong`) 来测量延迟。
    *   提供会话超时倒计时 (`startSessionTimer`, `stopSessionTimer`)。

### `src/public/ts/theme.ts`

*   **功能**：提供亮色和暗色主题切换功能。允许用户根据偏好调整界面外观。
*   **核心逻辑**：
    *   `initializeThemeSwitcher` 函数管理主题切换按钮的点击事件。
    *   根据用户选择或系统偏好设置，切换 `body` 元素的 CSS 类来应用不同主题。
    *   将主题偏好保存到 `localStorage`。

### `src/public/ts/ui.ts`

*   **功能**：处理通用的 UI 交互，特别是图片预览模态框的显示和隐藏。
*   **核心逻辑**：
    *   `openModal` 函数显示模态框并加载指定图片。
    *   `closeModal` 函数隐藏模态框。
    *   处理模态框的点击事件和键盘 `Escape` 键事件，实现关闭功能。

### `src/public/ts/commands.ts`

*   **功能**：提供一个简单的命令行界面，允许用户在前端输入命令并发送到后端执行。
*   **核心逻辑**：
    *   `runCommand` 函数获取命令输入，并通过 `websocket.ts` 中的 `sendCommand` 发送到服务器。
    *   处理命令输入框的 `Enter` 键事件和执行按钮的点击事件。

## 6. 核心机制与交互

### HTTP服务器懒启动机制

*   **目的**：避免多实例运行时的端口冲突，优化资源使用。
*   **工作流程**：
    *   **应用启动**：仅启动MCP服务器，不启动HTTP服务器。
    *   **首次调用**：当AI代理首次调用 `solicit-input` 工具时，检查HTTP服务器状态，如未启动则启动。
    *   **连接监控**：`ConnectionManager` 跟踪所有WebSocket连接，`SessionManager` 管理会话状态。
    *   **自动关闭**：当所有WebSocket连接关闭且没有活跃会话时，HTTP服务器自动关闭，释放端口资源。
    *   **状态管理**：`serverStateManager` 单例类负责管理HTTP服务器的状态（`STOPPED`, `STARTING`, `RUNNING`, `STOPPING`）。
*   **关键组件**：
    *   `src/server/serverState.ts`：服务器状态管理器，控制HTTP服务器的生命周期。
    *   `src/server/websocket.ts`：连接管理器，跟踪WebSocket连接状态。
    *   `src/server/sessionManager.ts`：会话管理器，跟踪活跃会话状态。
    *   `src/mcp/index.ts`：在 `solicit-input` 工具中实现懒启动检查。

### WebSocket 通信流

*   **前端到后端**：
    *   **用户反馈**：用户在前端输入文本或粘贴/拖放图片后，`feedback.ts` 模块收集数据，并通过 `websocket.ts` 调用 `sendFeedback` 发送 `submit_feedback` 消息到后端。
    *   **命令执行**：用户在命令输入框输入命令后，`commands.ts` 模块通过 `websocket.ts` 调用 `sendCommand` 发送 `command` 消息到后端。
    *   **心跳**：`statusBar.ts` 定期发送 `ping` 消息到后端，用于测量延迟和保持连接活跃。
    *   **系统信息请求**：前端连接成功后，`websocket.ts` 会发送 `get_system_info` 消息请求系统信息。
*   **后端到前端**：
    *   **AI 摘要**：当 AI 代理生成工作摘要时，后端通过 WebSocket 发送 `summary` 消息到前端，`main.ts` 接收并使用 `marked.js` 渲染显示。
    *   **实时日志**：后端通过 `websocketTransport.ts` 将日志消息作为 `server_log` 消息实时推送到前端，显示在浏览器控制台。
    *   **系统信息**：后端响应 `get_system_info` 请求，发送 `system_info` 消息，`statusBar.ts` 接收并更新状态栏显示。
    *   **反馈状态**：后端处理完用户反馈后，发送 `feedback_status` 消息，更新前端消息状态。
    *   **会话超时**：如果会话达到超时，后端发送 `timeout` 消息，前端禁用输入并显示超时信息。
    *   **Pong 响应**：后端响应前端的 `ping` 消息，发送 `pong` 消息，`statusBar.ts` 用于计算延迟。

### MCP (Model Context Protocol) 交互

*   **AI 代理集成**：后端通过 `src/mcp/index.ts` 启动 MCP 服务器，并通过 `process.stdin` 和 `process.stdout` 与外部 AI 代理（如 Windsurf AI Agent）进行通信。
*   **`solicit-input` 工具**：AI 代理可以通过调用 `solicit-input` 工具向用户请求反馈。后端 `src/mcp/solicit-input.ts` 接收此请求，并通过 WebSocket 将其转发到前端。前端显示相应的 UI，收集用户反馈后，再通过 WebSocket 发送回后端，后端再将反馈传递给 MCP 服务器，最终返回给 AI 代理。

### 会话管理

*   **`sessionQueue.ts`**：确保用户反馈请求的可靠性。它是一个带租约机制的请求队列，防止请求丢失或重复处理。
*   **`sessionManager.ts`**：管理每个 WebSocket 连接对应的会话。它负责将传入的 WebSocket 消息路由到正确的会话，并将 `solicit-input` 工具的反馈结果与对应的会话关联起来。

### 日志系统

*   后端使用 `winston` 进行日志记录，配置了控制台、文件和 WebSocket 传输。`websocketTransport.ts` 确保所有重要的后端日志都能实时推送到前端，便于调试和监控。

## 7. 部署与运行

本项目是一个 Node.js 应用程序，可以通过以下步骤运行：

1.  **安装依赖**：
    ```bash
    npm install
    ```
2.  **构建前端** (如果直接运行 TypeScript 源文件，则需要编译)：
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

*   `PORT`：指定服务器监听的端口（默认 3000）。
*   `MCP_SERVER_NAME`：MCP 服务器的名称（默认 `mcp-feedback-enhanced`）。
*   `MCP_SERVER_VERSION`：MCP 服务器的版本（默认 `1.0.0`）。
*   `SESSION_TIMEOUT`：会话租约超时时间（默认 600 秒）。
*   `LOG_DIR`：日志文件存放目录（默认 `logs`）。
*   `LOG_LEVEL`：日志级别（默认 `info`）。

例如，要以调试模式在端口 8080 运行：

```bash
PORT=8080 LOG_LEVEL=debug npm start
```

---

**文档编写完成。**
