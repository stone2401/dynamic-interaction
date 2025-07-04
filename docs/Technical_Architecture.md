# 技术架构文档

## 1. 系统概述

本项目是一个基于 Node.js 的交互式 AI 代理系统，旨在提供一个 Web UI 界面，使用户能够与 AI 模型进行多模态（文本和图片）交互，并实时接收 AI 的工作摘要和日志输出。其核心目标是实现 AI 代理与用户之间的高效、可靠的双向通信和反馈机制。

系统的高层级视图如下：

```
+-----------------------+
|       AI Agent        |
+-----------+-----------+
            |
            | MCP (Model Context Protocol)
            |
+-----------v-----------+
|    MCP Server (Node.js) |
| (src/mcp/index.ts)    |
+-----------+-----------+
            |
            | WebSocket / HTTP
            |
+-----------v-----------+
|     Backend Server    |
|   (Node.js/Express)   |
| (src/server/*.ts)     |
+-----------+-----------+
            |
            | WebSocket / HTTP
            |
+-----------v-----------+
|      Frontend UI      |
| (HTML/CSS/TypeScript) |
| (src/public/*)        |
+-----------+-----------+
            |
            | User Interaction
            |
+-----------v-----------+
|         User          |
+-----------------------+
```

**核心功能**：

*   **多模态交互**：支持用户通过文本和图片与 AI Agent 进行交互。
*   **实时反馈**：AI Agent 的工作摘要和日志实时推送到前端。
*   **双向通信**：实现用户与 AI Agent 之间的高效双向通信。
*   **会话管理**：管理用户与 AI Agent 之间的会话生命周期。
*   **懒启动机制**：HTTP 服务器按需启动，优化资源利用。

## 2. 后端模块设计

后端主要基于 Node.js 和 Express 框架，负责处理业务逻辑、管理 WebSocket 连接、与 MCP (Model Context Protocol) 服务器交互以及日志管理。其模块设计清晰，职责明确。

### `src/index.ts`

*   **功能**：应用程序的入口文件，负责初始化和启动 MCP 服务器。它还负责**导入所有消息处理器**，以确保它们能被消息路由器正确注册。采用懒启动机制，仅在需要时启动 Express HTTP 服务器和 WebSocket 服务器。
*   **核心逻辑**：导入配置和日志，初始化 `expressApp` 和 `websocketServer`，初始化 `mcpServer` 并注册 `solicit-input` 工具。HTTP 服务器将在首次调用 MCP 工具时懒启动。

### `src/config.ts`

*   **功能**：定义应用程序的各项配置，如服务器端口、MCP 服务器信息、会话超时时间、日志设置等。支持通过环境变量覆盖默认值。
*   **核心逻辑**：从环境变量或提供默认值来设置 `PORT`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `SESSION_TIMEOUT`, `LOG_DIR`, `LOG_LEVEL` 等。

### `src/logger.ts`

*   **功能**：实现全局日志系统，基于 `winston` 库。支持控制台、文件、每日轮转文件以及自定义的 WebSocket 传输方式，将日志实时广播到所有连接的前端客户端。
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

## 4. 数据流与交互

### HTTP服务器懒启动机制

*   **目的**：避免多实例运行时的端口冲突，优化资源使用。
*   **工作流程**：
    *   **应用启动**：仅启动 MCP 服务器，不启动 HTTP 服务器。
    *   **首次调用**：当 AI 代理首次调用 `solicit-input` 工具时，检查 HTTP 服务器状态，如未启动则启动。
    *   **连接监控**：`ConnectionManager` 跟踪所有 WebSocket 连接，`SessionManager` 管理会话状态。
    *   **自动关闭**：当所有 WebSocket 连接关闭且没有活跃会话时，HTTP 服务器自动关闭，释放端口资源。
    *   **状态管理**：`serverStateManager` 单例类负责管理 HTTP 服务器的状态（`STOPPED`, `STARTING`, `RUNNING`, `STOPPING`）。
*   **关键组件**：`src/server/serverState.ts`、`src/server/websocket.ts`、`src/server/sessionManager.ts`、`src/mcp/index.ts`。

### WebSocket 通信流

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

### MCP (Model Context Protocol) 交互

*   **AI 代理集成**：后端通过 `src/mcp/index.ts` 启动 MCP 服务器，并通过 `process.stdin` 和 `process.stdout` 与外部 AI 代理进行通信。
*   **`solicit-input` 工具**：AI 代理调用 `solicit-input` 工具向用户请求反馈。后端 `src/mcp/solicit-input.ts` 接收请求，通过 WebSocket 转发到前端。前端收集反馈后，再通过 WebSocket 发送回后端，后端将反馈传递给 MCP 服务器，最终返回给 AI 代理。

### 会话管理

*   **`sessionQueue.ts`**：作为请求的入口，确保用户反馈请求的可靠性。它是一个带租约机制的请求队列。
*   **`sessionManager.ts`**：作为会话状态的管理者。当 `checkQueueAndProcess` 发现有可用的 WebSocket 连接和等待的请求时，`sessionManager.startSession` 会被调用，创建一个新的 `SessionContext` 并将其与 WebSocket 连接关联。当连接关闭时，`handleDisconnection` 会清理会话状态。
*   **`messageRouter.ts`**：作为消息处理的核心。所有与会话相关的业务逻辑（如处理反馈、响应心跳）都在注册到路由器的 `handlers` 中执行。处理器可以从 `sessionManager` 获取当前会话的上下文信息。

### 日志系统

*   后端使用 `winston` 进行日志记录，配置了控制台、文件和 WebSocket 传输。`websocketTransport.ts` 确保所有重要的后端日志都能实时推送到前端，便于调试和监控。

## 5. 关键技术栈

本项目主要基于以下关键技术构建：

*   **Node.js**：作为后端运行环境，提供高性能的 JavaScript 运行时。
*   **Express.js**：轻量级的 Node.js Web 应用框架，用于构建后端 HTTP 和 WebSocket 服务器。
*   **TypeScript**：JavaScript 的超集，提供了静态类型检查，增强了代码的可维护性和开发效率。
*   **WebSocket**：实现客户端与服务器之间的全双工通信，支持实时数据传输。
*   **Model Context Protocol (MCP)**：用于 AI Agent 与外部工具和服务进行交互的协议，本项目中用于 AI Agent 与用户界面之间的通信。
*   **Winston**：Node.js 的日志库，提供了灵活的日志记录功能，支持多种传输方式（包括自定义的 WebSocket 传输）。
*   **marked.js**：前端 Markdown 解析库，用于将 AI Agent 返回的 Markdown 格式内容渲染为 HTML。
*   **highlight.js**：前端代码高亮库，用于美化代码片段的显示。
*   **lucide**：轻量级、可定制的开源图标库，用于前端界面的图标显示。

## 6. 部署架构

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

## 7. 扩展性考虑

本项目在设计时考虑了未来的扩展性，主要体现在以下几个方面：

*   **模块化设计**：后端和前端都采用了模块化的设计，各个功能模块职责清晰，降低了耦合度。这使得新增功能或修改现有功能时，可以只关注特定模块，而不会影响整个系统。
*   **MCP 协议**：通过 MCP 协议与 AI Agent 解耦，这意味着可以轻松更换或升级底层的 AI 模型，而无需修改核心业务逻辑。只要新的 AI Agent 遵循 MCP 协议，就可以无缝集成。
*   **会话管理**：`SessionManager` 和 `SessionQueue` 的设计使得会话管理独立于具体的业务逻辑。这为未来支持多用户、多会话并发提供了基础，可以通过扩展会话存储（例如，使用 Redis 等外部存储）来支持更大量的并发会话。
*   **日志系统**：基于 Winston 的日志系统支持多种传输方式，可以方便地集成到集中式日志管理系统（如 ELK Stack）中，以应对大规模部署时的日志收集和分析需求。
*   **懒启动机制**：HTTP 服务器的懒启动机制确保了资源的高效利用，尤其是在多实例部署时，可以避免不必要的资源开销，有助于水平扩展。
*   **前端可插拔**：前端模块（如 `feedback.ts`, `imageHandler.ts`, `statusBar.ts` 等）设计为相对独立，可以根据需求进行增删改。例如，可以轻松添加新的 UI 组件或交互模式，以支持更多模态的交互。
*   **配置化**：通过环境变量进行配置，使得部署和管理更加灵活。在不同的部署环境下，只需修改环境变量即可适应，无需修改代码。

未来可以考虑的扩展方向：

*   **多租户支持**：在会话管理层增加租户隔离，支持多个独立的用户群体。
*   **持久化存储**：将会话数据、用户偏好等存储到数据库中，以便在应用重启后恢复会话状态。
*   **负载均衡**：在前端和后端之间引入负载均衡器，以支持高并发和高可用性。
*   **容器化部署**：使用 Docker 和 Kubernetes 进行容器化部署，进一步提高部署的灵活性、可伸缩性和管理效率。
*   **更丰富的交互模态**：除了文本和图片，未来可以扩展支持语音、视频等更多模态的交互。
