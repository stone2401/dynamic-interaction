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
*   **核心逻辑**：初始化 `ws` 服务器，通过 `ConnectionManager` 管理连接生命周期。在 `connection` 事件中，为每个连接设置 `message`, `close`, `error` 事件监听器。在 `message` 事件中，增加了对 `client_ready` 消息的处理，用于实现页面刷新后的状态恢复。其他消息则交由 `messageRouter` 处理。`close` 和 `error` 事件则通知 `sessionManager` 处理断开连接的逻辑。

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
*   **核心逻辑**：`SessionManager` 类维护一个从 WebSocket 连接到 `SessionContext` 的映射。提供 `startSession`、`endSession` 和 `handleDisconnection` 方法来管理会话状态。它与 `sessionQueue` 协作，在有可用连接时启动新会话。它还维护了每个会话的 `startTime` 属性（取自请求的 `createdAt` 时间戳，避免刷新时倒计时重置），并使用 `setTimeout` 处理会话超时；同时提供计算会话剩余时间的功能，支持页面刷新后的状态恢复。

### `src/server/sessionManager.ts` (新增)

*   **功能**：作为会话管理的核心，负责跟踪所有活动的 WebSocket 会话、管理其生命周期并处理空闲超时。
*   **核心逻辑**：
    *   **会话启动与关闭**：`startSession` 方法在新的交互请求开始时创建会话上下文，并启动一个超时计时器。`endSession` 则负责清理会话资源。
    *   **超时重置（已修复）**：为了解决之前版本中会话会意外超时的问题，新增了 `resetTimeout` 方法。现在，每当从客户端收到任何消息（如心跳或用户反馈）时，都会调用此方法来重置超时计时器，确保只有在用户真正处于非活动状态时会话才会结束。
    *   **超时处理**：当会话因长时间无活动而超时时，`onTimeout` 方法会向客户端发送超时通知，并以特定的超时状态结束当前交互请求。
    *   **断线处理**：`handleDisconnection` 方法负责处理客户端意外断开连接的情况，它会将未完成的请求重新放回队列中，并确保服务器在空闲时能够正确关闭。

### `src/server/express.ts`

*   **功能**：配置 Express HTTP 服务器。它主要用于提供前端静态文件服务，确保前端页面能够被正确加载。支持懒启动和停止机制。
*   **核心逻辑**：创建 Express 应用实例，使用 `express.static` 服务静态文件，并提供 `startServer` 和 `stopServer` 方法。

### `src/server/port.ts`

*   **功能**：提供端口管理工具，用于检查指定端口是否可用，并在端口被占用时尝试寻找下一个可用端口。这有助于避免开发环境下的端口冲突。

## 3. 前端模块设计

前端负责用户界面的展示和交互，使用 TypeScript 构建，并通过 WebSocket 与后端进行实时通信。
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
*   **核心逻辑**：更新连接状态、网络延迟和消息状态。实现心跳机制来测量延迟。提供会话超时倒计时，并已修复其在连续会话请求下的重置逻辑，确保前端UI与后端超时状态精确同步。

### `src/public/ts/theme.ts`

*   **功能**：提供亮色和暗色主题切换功能。允许用户根据偏好调整界面外观。
*   **核心逻辑**：`initializeThemeSwitcher` 函数管理主题切换按钮的点击事件。根据用户选择或系统偏好设置，切换 `body` 元素的 CSS 类来应用不同主题。将主题偏好保存到 `localStorage`。

### `src/public/ts/ui.ts`

*   **功能**：处理通用的 UI 交互，特别是图片预览模态框的显示和隐藏。
*   **核心逻辑**：`openModal` 函数显示模态框并加载指定图片。`closeModal` 函数隐藏模态框。处理模态框的点击事件和键盘 `Escape` 键事件。

### `src/public/ts/commands.ts`

*   **功能**：提供一个简单的命令行界面，允许用户在前端输入命令并发送到后端执行。
*   **核心逻辑**：`runCommand` 函数获取命令输入，并通过 `websocket.ts` 中的 `sendCommand` 发送到服务器。处理命令输入框的 `Enter` 键事件和执行按钮的点击事件。

## 4. 响应式布局与样式优化

为了提升应用在不同分辨率（特别是2K及以上宽屏）下的视觉体验，我们对前端布局和关键组件样式进行了全面的响应式优化。

### 4.1. 宽屏自适应布局

*   **背景**：在初始版本中，当浏览器窗口很宽时，主内容区域两侧会出现过大的留白，导致UI比例失调。
*   **解决方案**：
    1.  **动态宽度**：在 `public/css/layout/layout.css` 和 `public/css/components/status-bar.css` 中，我们将主容器 (`.main-container`) 和状态栏容器 (`.status-bar-container`) 的宽度从固定的 `max-width` 修改为 `width: 85vw`。这使得布局能够根据视口宽度自动调整。
    2.  **最大宽度与高度限制**：为了避免在超宽屏上内容被过度拉伸，我们保留了 `max-width: 1800px` 的限制。同时，增加了 `max-height: 85vh`，确保内容区域在垂直方向上不会占据整个屏幕，并配合 `body` 的 `justify-content: center` 实现了垂直居中，优化了整体视觉平衡。

### 4.2. 统一与美化滚动条

*   **背景**：浏览器默认的滚动条样式较为突兀，与应用的深色主题不协调，且不同面板的滚动条样式不统一。
*   **解决方案**：
    1.  **创建通用样式文件**：我们创建了一个新的CSS文件 `public/css/components/common.css`，专门用于存放跨组件的通用样式。
    2.  **自定义滚动条**：在该文件中，我们为 `.panel` 和 `#summary` 元素定义了一套统一、纤细且与整体风格协调的滚动条样式。使用了半透明的背景色，并在鼠标悬停时改变颜色，以提供更好的交互反馈，同时减少了视觉干扰。
    3.  **引入主样式表**：最后，在 `public/css/main.css` 中引入了 `common.css`，以确保这些通用样式能够被全局应用。

## 5. 超时处理逻辑详解

系统中的会话超时逻辑经过重构，以确保其健壮性和精确性，其核心思想是**后端定义规则，前端负责展现**。

---

### **第一阶段：会话开始与计时器启动 (后端)**

1.  **触发点**：当AI Agent调用 `solicit-input` MCP服务时，一个新的会话周期开始。
2.  **创建会话上下文 (`sessionManager.ts`)**：
    *   `sessionManager.startSession` 方法被调用。
    *   它创建一个 `SessionContext` 对象，其中与超时最相关的三个属性被设置：
        *   `id`: 唯一的会话ID。
        *   `startTime`: 取自会话请求的 `createdAt` 时间戳（排队时由 `Date.now()` 记录），确保页面刷新时倒计时不会被重置。
        *   `timeout`: 从 `.env` 文件中读取的 `SESSION_TIMEOUT` 值，表示这个会话的**总时长（秒）**。
3.  **启动后端计时器**：
    *   `startSession` 方法内部会启动一个 `setTimeout` 计时器。
    *   这个计时器的作用是“兜底”——如果在指定的 `timeout` 时长内没有收到用户的反馈，它将触发 `onTimeout` 方法，强制结束会话。**这个计时器是后端唯一真实和权威的超时逻辑。**

---

### **第二阶段：状态同步与前端倒计时 (前后端交互)**

1.  **触发点**：用户刷新浏览器页面，或者首次加载页面时。
2.  **前端请求状态 (`websocket.ts` - 前端)**：
    *   WebSocket 连接成功后（`onopen` 事件），前端会立即向后端发送一个 `{ type: 'client_ready' }` 消息。
3.  **后端响应状态 (`websocket.ts` - 后端)**：
    *   后端收到 `client_ready` 消息后，会找到与当前WebSocket连接关联的 `SessionContext`。
    *   然后，它会构建一个 `system_info` 消息，并将 `startTime` 和 `timeout` 这两个**固定不变的**值发送给前端。
4.  **前端启动倒计时 (`statusBar.ts`)**：
    *   前端的 `websocket.ts` 收到 `system_info` 消息后，会将 `sessionStartTime` 和 `leaseTimeoutSeconds` (即 `timeout`) 这两个值传递给 `statusBar.startSessionTimer` 函数。
    *   `startSessionTimer` 的逻辑如下：
        *   它首先计算出会话的**绝对结束时间**：`sessionEndTime = sessionStartTime + totalDurationSeconds * 1000`。
        *   然后，它启动一个 `setInterval`，每秒钟执行一次，通过 `(sessionEndTime - Date.now())` 计算出精确的剩余时间并更新UI。
    *   **这种设计的优势在于**：无论何时刷新页面，前端总能根据固定的 `startTime` 和 `timeout` 计算出当前最精确的剩余时间，完全不受网络延迟或消息时序的影响。

---

### **第三阶段：用户反馈与计时器停止 (前后端交互)**

1.  **触发点**：用户在前端界面提交了反馈。
2.  **后端处理反馈 (`feedbackHandler.ts`)**：
    *   `feedbackHandler` 接收到消息后，会调用 `sessionManager.endSession` 方法。
3.  **停止后端计时器 (`sessionManager.ts`)**：
    *   `endSession` 方法会使用 `clearTimeout` 清除在第一阶段设置的那个“兜底”计时器。
    *   同时，它会向前端发送一个 `stop_timer` 消息。
4.  **停止前端倒计时 (`statusBar.ts`)**：
    *   前端的 `websocket.ts` 收到 `stop_timer` 消息后，会调用 `statusBar.stopSessionTimer`，该函数会用 `clearInterval` 清除前端的UI倒计时。
