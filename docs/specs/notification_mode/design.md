# 通知模式设计文档

## 概述
本设计实现了一个双模式的MCP交互系统，支持传统的等待响应模式和新的通知模式。通知模式允许Agent发送消息而不阻塞等待用户响应，提高了系统的灵活性和效率。

## 系统架构
```
MCP工具层 -> 会话管理层 -> WebSocket通信层 -> 前端界面层
```

### 核心组件关系
- MCP工具通过模式参数决定调用行为
- 会话管理层根据模式类型处理消息流转
- WebSocket层负责消息传输和状态同步
- 前端界面层根据消息类型渲染不同的UI组件

## 模块设计

### 模块1: MCP工具接口扩展 (MCP Interface Extension)
**文件路径**: `src/mcp/solicit-input.ts`
**主要功能/接口**:
- `solicitUserInput(projectDirectory, summary, mode?)` - 扩展现有接口支持模式参数
- `notifyUser(projectDirectory, summary)` - 新增专用通知接口

**错误处理与日志策略**: 
- 记录模式选择和执行结果
- 对无效模式参数进行验证和错误提示
- 通知模式失败时记录警告但不中断流程

// 此模块实现 R1, R5

### 模块2: 会话队列模式管理 (Session Queue Mode Management)
**文件路径**: `src/server/sessionQueue.ts`
**主要功能/接口**:
- `PendingSessionRequest` 接口扩展，增加 `mode` 字段
- `enqueue(summary, projectDirectory, mode)` - 支持模式参数的入队方法
- `enqueueNotification(summary, projectDirectory)` - 专用通知入队方法

**错误处理与日志策略**:
- 区分不同模式的日志记录
- 通知模式的队列处理异常不影响系统稳定性
- 记录模式统计信息用于监控

// 此模块实现 R1, R2

### 模块3: WebSocket消息处理扩展 (WebSocket Message Handler Extension)  
**文件路径**: `src/server/websocket.ts`
**主要功能/接口**:
- `processNotificationRequest(request)` - 处理通知类型请求
- `processInteractiveRequest(request)` - 处理交互类型请求（原有逻辑）
- 消息类型定义扩展，增加通知消息类型

**错误处理与日志策略**:
- WebSocket连接异常时的降级处理
- 消息发送失败的重试机制
- 连接状态变化的详细日志记录

// 此模块实现 R1, R2

### 模块4: 前端界面模式区分 (Frontend Mode Differentiation)
**文件路径**: `src/frontend/components/` (新增组件目录)
**主要功能/接口**:
- `NotificationDisplay` 组件 - 显示通知消息
- `InteractiveSession` 组件 - 显示交互会话（现有逻辑重构）
- `ModeIndicator` 组件 - 模式标识器

**错误处理与日志策略**:
- 组件渲染异常的边界处理
- 用户操作异常的友好提示
- 前端状态变化的调试日志

// 此模块实现 R3, R4

### 模块5: 通知状态管理 (Notification State Management)
**文件路径**: `src/server/notificationStore.ts` (新增)
**主要功能/接口**:
- `NotificationStore` 类 - 管理通知历史
- `addNotification(notification)` - 添加新通知
- `getLatestNotifications(limit)` - 获取最新通知列表
- `clearOldNotifications()` - 清理过期通知

**错误处理与日志策略**:
- 内存使用监控和自动清理
- 存储操作异常的恢复机制
- 通知数据的持久化考虑（可选）

// 此模块实现 R4

### 模块6: 前端状态同步 (Frontend State Synchronization)
**文件路径**: `src/frontend/js/app.js` (修改现有)
**主要功能/接口**:
- WebSocket消息监听器扩展，支持通知消息类型
- 界面状态管理，区分通知和交互模式
- 页面刷新时的状态恢复逻辑

**错误处理与日志策略**:
- WebSocket断线重连的状态保持
- 界面渲染异常的用户提示
- 状态同步失败的降级显示

// 此模块实现 R3, R4
