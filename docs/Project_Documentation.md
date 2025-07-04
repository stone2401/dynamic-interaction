# 项目说明文档

## 1. 项目概述

本项目是一个基于 Node.js 的交互式 AI 代理系统，旨在提供一个 Web UI 界面，使用户能够与 AI 模型进行多模态（文本和图片）交互，并实时接收 AI 的工作摘要和日志输出。其核心目标是实现 AI 代理与用户之间的高效、可靠的双向通信和反馈机制。

## 2. 架构概览

项目采用前后端分离的架构，并通过 WebSocket 实现实时通信。后端基于 Node.js 和 Express 框架，负责处理业务逻辑、管理 WebSocket 连接、与 MCP (Model Context Protocol) 服务器交互以及日志管理。前端则是一个纯静态的 Web 页面，通过 TypeScript 编写的客户端脚本与后端进行通信，并提供用户界面。

**主要组成部分：**

*   **后端 (Node.js/Express)**：
    *   **HTTP 服务器**：提供静态文件服务，用于加载前端页面。采用懒启动机制，仅在MCP调用时启动，所有WebSocket连接关闭后自动关闭，避免多实例端口冲突。
    *   **WebSocket 服务器**：实现前后端实时双向通信，用于传输 AI 摘要、日志、系统信息以及接收用户反馈和命令。
    *   **MCP 服务器**：通过标准输入/输出 (stdio) 与外部 AI 模型（如 Windsurf AI Agent）进行通信，实现 AI 工具调用和结果回传。
    *   **会话管理**：管理用户与 AI 代理之间的会话生命周期，包括请求队列和超时处理。
    *   **日志系统**：集成 Winston 日志库，支持多种日志传输方式，包括实时 WebSocket 传输到前端。
*   **前端 (HTML/CSS/TypeScript)**：
    *   **主页面 (`index.html`)**：定义页面结构，引入样式和脚本。
    *   **客户端脚本**：处理用户界面交互、WebSocket 通信、图片处理、状态显示和命令发送。
    *   **第三方库**：使用 `marked.js` 进行 Markdown 渲染，`highlight.js` 进行代码高亮，`lucide` 提供图标。

## 3. 目录结构

```
.windsurf/             # Windsurf 相关的配置和工作流
docs/                  # 项目文档 (本文档)
logs/                  # 应用日志
src/                   # 源代码目录
├── cli.ts             # 命令行入口
├── config.ts          # 应用配置
├── index.ts           # 应用主入口，启动服务器
├── logger.ts          # 日志配置和管理
├── mcp/               # MCP (Model Context Protocol) 相关模块
│   ├── index.ts       # MCP 服务器初始化和工具注册
│   └── solicit-input.ts # MCP solicit-input 工具实现
├── public/            # 前端静态资源
│   ├── css/           # 样式文件
│   │   └── main.css
│   ├── js/            # 编译后的 JavaScript 文件
│   │   ├── commands.js
│   │   ├── feedback.js
│   │   ├── imageHandler.js
│   │   ├── main.js
│   │   ├── statusBar.js
│   │   ├── theme.js
│   │   ├── ui.js
│   │   └── websocket.js
│   ├── ts/            # 前端 TypeScript 源代码
│   │   ├── commands.ts
│   │   ├── feedback.ts
│   │   ├── imageHandler.ts
│   │   ├── main.ts
│   │   ├── statusBar.ts
│   │   ├── theme.ts
│   │   ├── types.d.ts
│   │   ├── ui.ts
│   │   └── websocket.ts
│   └── index.html     # 前端主页面
└── server/            # 后端服务器相关模块
    ├── express.ts     # Express HTTP 服务器配置
    ├── port.ts        # 端口管理工具
    ├── serverState.ts # HTTP服务器状态管理器
    ├── sessionManager.ts # WebSocket 会话管理器
    ├── sessionQueue.ts  # 会话请求队列
    ├── websocket.ts     # WebSocket 服务器配置
    └── websocketTransport.ts # Winston WebSocket 日志传输
```

## 4. 后端模块分析

### `src/index.ts`

*   **功能**：应用程序的入口文件，负责初始化和启动 MCP 服务器。采用懒启动机制，仅在需要时启动 Express HTTP 服务器和 WebSocket 服务器。
*   **核心逻辑**：
    *   导入配置 (`config`) 和日志 (`logger`)。
    *   初始化 `expressApp` 和 `websocketServer`，但不立即启动HTTP服务器。
    *   初始化 `mcpServer` 并注册 `solicit-input` 工具。
    *   仅启动MCP服务器，HTTP服务器将在首次调用MCP工具时懒启动。

### `src/config.ts`

*   **功能**：定义应用程序的各项配置，如服务器端口、MCP 服务器信息、会话超时时间、日志设置等。支持通过环境变量覆盖默认值。
*   **核心逻辑**：从环境变量或提供默认值来设置 `PORT`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `SESSION_LEASE_TIMEOUT_SECONDS`, `LOG_DIR`, `LOG_LEVEL` 等。

### `src/logger.ts`

*   **功能**：实现全局日志系统，基于 `winston` 库。支持控制台、文件、每日轮转文件以及自定义的 WebSocket 传输方式，将日志实时广播到所有连接的前端客户端。
*   **核心逻辑**：
    *   创建 `winston` 日志实例，配置不同的传输器 (`transports`)。
    *   包含一个自定义的 `WebSocketTransport`，用于通过 WebSocket 发送日志。
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

*   **功能**：配置和管理 WebSocket 服务器。它处理客户端连接、消息路由、会话管理以及与 `solicit-input` 工具的集成。支持HTTP服务器懒启动机制。
*   **核心逻辑**：
    *   初始化 `ws` (WebSocket) 服务器，配置为 `noServer: true` 以支持懒启动。
    *   通过 `ConnectionManager` 单例类统一管理WebSocket连接生命周期。
    *   处理 `connection` 事件，为每个新连接创建会话。
    *   处理 `message` 事件，解析客户端消息（如 `submit_feedback`, `command`, `ping`, `get_system_info`）。
    *   与 `sessionManager` 和 `sessionQueue` 协作，管理会话状态和反馈请求。
    *   监控连接数量，当所有连接关闭时通知 `serverStateManager` 检查是否应关闭HTTP服务器。

### `src/server/sessionQueue.ts`

*   **功能**：实现一个可靠的会话请求队列。它支持租约机制、超时自动重试和请求去重，确保每个反馈请求都能被处理且不丢失。
*   **核心逻辑**：
    *   `SessionQueue` 类维护一个请求队列，每个请求都有一个唯一的 ID 和超时时间。
    *   `enqueue` 方法添加请求，`dequeue` 方法获取请求。
    *   `ack` 方法确认请求完成，`nack` 方法将请求重新放回队列。
    *   `startLeaseTimer` 和 `stopLeaseTimer` 管理请求的租约。

### `src/server/sessionManager.ts`

*   **功能**：管理 WebSocket 会话的生命周期。它负责创建、维护和销毁会话，处理会话中的消息、超时、关闭和错误，确保会话状态的一致性。
*   **核心逻辑**：
    *   `SessionManager` 类维护一个活跃会话的映射。
    *   `startSession` 创建新会话，`endSession` 结束会话。
    *   处理会话的 `message`, `close`, `error` 事件。
    *   会话结束时检查连接状态，尝试分配新会话或通知 `serverStateManager` 检查是否应关闭HTTP服务器。
    *   集成 `sessionQueue` 和 `mcpServer`，将用户反馈传递给 AI 代理。

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
*   `SESSION_LEASE_TIMEOUT_SECONDS`：会话租约超时时间（默认 600 秒）。
*   `LOG_DIR`：日志文件存放目录（默认 `logs`）。
*   `LOG_LEVEL`：日志级别（默认 `info`）。

例如，要以调试模式在端口 8080 运行：

```bash
PORT=8080 LOG_LEVEL=debug npm start
```

---

**文档编写完成。**
