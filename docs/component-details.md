# 组件详细说明

本文档提供了项目中各层级组件的详细功能和实现细节。

**适用对象:** 开发人员、维护人员

## 2. 后端模块设计

后端主要基于 Node.js 和 Express 框架，负责处理业务逻辑、管理 WebSocket 连接、与 MCP (Model Context Protocol) 服务器交互以及日志管理。其模块设计清晰，职责明确。

### `src/index.ts`

*   **功能**：应用程序的入口文件，负责初始化和启动 MCP 服务器。它还负责**导入所有消息处理器**，以确保它们能被消息路由器正确注册。采用懒启动机制，仅在需要时启动 Express HTTP 服务器和 WebSocket 服务器。
*   **核心逻辑**：导入配置和日志，初始化 `expressApp` 和 `websocketServer`，初始化 `mcpServer` 并注册 `solicit-input` 工具。HTTP 服务器将在首次调用 MCP 工具时懒启动。

### `src/config.ts`

*   **功能**：定义应用程序的各项配置，如服务器端口、MCP 服务器信息、会话超时时间、日志设置等。支持通过环境变量覆盖默认值。
*   **核心逻辑**：从环境变量或提供默认值来设置 `PORT`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `SESSION_TIMEOUT`, `LOG_DIR`, `LOG_LEVEL` 等。

### `src/logger.ts`

*   **功能**：实现全局日志系统，基于 `winston` 库。**默认情况下，日志系统是禁用的**，以避免不必要的日志文件生成。可以通过设置环境变量 `LOG_ENABLED=true` 来启用。启用后，它支持控制台、文件、每日轮转文件以及自定义的 WebSocket 传输方式，可将日志实时广播到所有连接的前端客户端。
*   **核心逻辑**：创建 `winston` 日志实例，配置不同的传输器，包含一个自定义的 `WebSocketTransport`，用于通过 WebSocket 发送日志。

### `src/cli.ts`

*   **功能**：简单的命令行接口，用于启动应用程序。它主要通过 `require('./index.js')` 来执行主入口文件。

### `src/mcp/index.ts`

*   **功能**：初始化 MCP (Model Context Protocol) 服务器实例，并注册 AI 代理可用的工具。它是后端与 AI 模型通信的桥梁。
*   **核心逻辑**：创建 `MCP.Server` 实例，注册 `solicit-input` 工具，并通过 `process.stdin` 和 `process.stdout` 启动 MCP 服务器。

### `src/mcp/solicit-input.ts`

*   **功能**：实现 `solicit-input` MCP 工具的具体逻辑。该工具通过 WebSocket 与前端交互，弹出一个 Web UI 界面来收集用户的多模态反馈（文本和图片）。
*   **核心逻辑**：包含 `solicitUserInput` 函数，负责向前端发送请求，等待用户反馈。在首次调用时检查并启动 HTTP 服务器。利用 `sessionQueue` 管理反馈请求。

### `src/server/websocket.ts`

*   **功能**：配置和管理 WebSocket 服务器。它处理客户端连接的建立、关闭和错误事件。**其核心职责是将收到的消息转发给 `messageRouter` 进行统一分发**，而不再直接处理任何业务逻辑。
*   **核心逻辑**：初始化 `ws` 服务器，通过 `ConnectionManager` 管理连接生命周期。在 `connection` 事件中，为每个连接设置 `message`, `close`, `error` 事件监听器。`message` 事件将消息交由 `messageRouter` 处理，`close` 和 `error` 事件则通知 `sessionManager` 处理断开连接的逻辑。

### `src/server/messageRouter.ts` (新增)

*   **功能**：实现一个**单例的消息路由器**，作为后端消息处理的中心枢纽。它负责根据消息类型将收到的 WebSocket 消息路由到已注册的处理器函数。
*   **核心逻辑**：提供 `register` 方法用于注册消息处理器，提供 `route` 方法用于根据消息的 `type` 字段查找并执行相应的处理器。这种设计将消息的分发与具体的业务逻辑处理完全解耦。

### `src/server/handlers/` (新增)

*   **功能**：存放所有具体的业务逻辑处理器。每个文件实现一个或多个相关消息的处理逻辑，并将其注册到 `messageRouter`。
*   **核心模块**:
    *   `pingHandler.ts`: 处理心跳 `ping` 请求，响应 `pong`。
    *   `feedbackHandler.ts`: 处理 `submit_feedback` 消息，完成用户反馈的接收、处理，并结束会话。
    *   `systemInfoHandler.ts`: 处理 `get_system_info` 请求，返回服务器状态和版本信息。

### `src/server/sessionQueue.ts`

*   **功能**：实现一个可靠的会话请求队列。它支持租约机制、超时自动重试和请求去重，确保每个反馈请求都能被处理且不丢失。
*   **核心逻辑**：`ReliableSessionQueue` 类维护一个请求队列，支持 `enqueue`（入队）、`leaseNext`（租用下一个）、`acknowledge`（确认）和 `requeue`（重新入队）方法，并管理请求的租约。

### `src/server/sessionManager.ts`

*   **功能**：管理**会话上下文 (`SessionContext`)** 的生命周期。它负责创建、维护和销毁会话状态，但**不再直接处理 WebSocket 消息或事件**。
*   **核心逻辑**：`SessionManager` 类维护一个从 WebSocket 连接到 `SessionContext` 的映射。提供 `startSession`、`endSession` 和 `handleDisconnection` 方法来管理会话状态。它与 `sessionQueue` 协作，在有可用连接时启动新会话。

### `src/server/express.ts`

*   **功能**：配置 Express HTTP 服务器。它主要用于提供前端静态文件服务，确保前端页面能够被正确加载。支持懒启动和停止机制。
*   **核心逻辑**：创建 Express 应用实例，使用 `express.static` 服务静态文件，并提供 `startServer` 和 `stopServer` 方法。

### `src/server/port.ts`

*   **功能**：提供端口管理工具，用于检查指定端口是否可用，并在端口被占用时尝试寻找下一个可用端口。这有助于避免开发环境下的端口冲突。
*   **核心逻辑**：`checkPortAndListen` 函数尝试在指定端口启动服务器，如果端口被占用则尝试下一个端口。

### `src/server/websocketTransport.ts`

*   **功能**：为 `winston` 日志库实现一个自定义的 WebSocket 传输器。它允许后端将日志消息实时发送到所有连接的 WebSocket 客户端，以便在前端控制台或 UI 中显示。
*   **核心逻辑**：继承 `winston.Transport` 类，`log` 方法将日志消息通过 WebSocket 广播给所有连接的客户端。

## 3. 前端模块设计

前端是一个纯静态的 Web 页面，通过 TypeScript 编写的客户端脚本与后端进行通信，并提供用户界面。主要模块包括：

### `src/public/index.html`

*   **功能**：前端应用程序的主入口页面，定义了整个 Web UI 的结构和布局，并引入了所有必要的 CSS 样式和 JavaScript 脚本。
*   **核心逻辑**：引入 `css/main.css`、`marked.min.js`、`highlight.min.js`、`lucide.js` 以及编译后的前端逻辑脚本（如 `js/main.js`）。定义了状态栏、AI 工作摘要面板、反馈输入区、图片拖放区等 UI 元素。

### `src/public/ts/main.ts`

*   **功能**：前端应用程序的主要入口文件，负责初始化所有前端模块并协调用户交互。
*   **核心逻辑**：导入 `feedback.js`, `theme.js`, `imageHandler.js` 等模块。在 `initializeApp` 函数中初始化主题切换、拖放、粘贴图片功能，并设置反馈发送的事件监听。

### `src/public/ts/websocket.ts`

*   **功能**：处理前端与后端 WebSocket 服务器的所有通信。包括建立连接、接收和发送消息、处理连接断开和重连机制。
*   **核心逻辑**：`connectWebSocket` 函数管理 WebSocket 连接，处理 `onopen`, `onmessage`, `onclose`, `onerror` 事件。`onmessage` 处理不同类型的消息并更新 UI。实现指数退避重连机制。

### `src/public/ts/feedback.ts`

*   **功能**：管理用户反馈的收集和发送。它处理文本输入和图片附件，并将其组合发送到后端。
*   **核心逻辑**：`sendCompositeFeedback` 函数获取用户输入的文本和附加的图片数据，调用 `websocket.ts` 中的 `sendFeedback` 发送数据到服务器。控制反馈输入框的启用/禁用状态。

### `src/public/ts/imageHandler.ts`

*   **功能**：处理前端的图片上传、预览和管理。支持拖放、粘贴和文件选择方式添加图片。
*   **核心逻辑**：`processFiles` 函数读取图片文件，生成 Data URL，并创建预览元素。`setupDragAndDrop` 设置拖放区域的事件监听。`setupPasteListener` 处理从剪贴板粘贴图片。

### `src/public/ts/statusBar.ts`

*   **功能**：管理和更新前端界面的状态栏显示。包括连接状态、网络延迟、会话信息（工作区目录、会话 ID、会话剩余时间）和消息状态。
*   **核心逻辑**：更新连接状态、网络延迟和消息状态。实现心跳机制来测量延迟。提供会话超时倒计时。

### `src/public/ts/theme.ts`

*   **功能**：提供亮色和暗色主题切换功能。允许用户根据偏好调整界面外观。
*   **核心逻辑**：`initializeThemeSwitcher` 函数管理主题切换按钮的点击事件。根据用户选择或系统偏好设置，切换 `body` 元素的 CSS 类来应用不同主题。将主题偏好保存到 `localStorage`。

### `src/public/ts/ui.ts`

*   **功能**：处理通用的 UI 交互，特别是图片预览模态框的显示和隐藏。
*   **核心逻辑**：`openModal` 函数显示模态框并加载指定图片。`closeModal` 函数隐藏模态框。处理模态框的点击事件和键盘 `Escape` 键事件。

### `src/public/ts/commands.ts`

*   **功能**：提供一个简单的命令行界面，允许用户在前端输入命令并发送到后端执行。
*   **核心逻辑**：`runCommand` 函数获取命令输入，并通过 `websocket.ts` 中的 `sendCommand` 发送到服务器。处理命令输入框的 `Enter` 键事件和执行按钮的点击事件。
