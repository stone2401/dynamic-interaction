# Web Notifications API 实现设计

## 概述

本设计文档详细描述了在 dynamic-interaction 项目中实现 Web Notifications API 的技术方案。该功能将使系统能够在浏览器标签页不活跃时，通过浏览器原生通知机制向用户推送通知，特别是针对 notification 和 session_request 类型的消息。

## 模块结构与职责

### 1. 通知服务模块 (NotificationService)

**文件路径**：`/src/public/ts/notificationService.ts`

**职责**：
- 封装 Web Notifications API 的核心功能
- 处理通知权限请求和状态检查
- 提供创建和显示通知的方法
- 处理通知点击事件

_Requirement: R1, R3_

### 2. WebSocket 消息处理扩展

**文件路径**：`/src/public/ts/websocket.ts`

**职责**：
- 扩展现有的 WebSocket 消息处理逻辑，集成通知服务
- 在接收到 notification 和 session_request 类型消息时，调用通知服务显示通知
- 确保在标签页不活跃时触发通知

_Requirement: R1, R2_

### 3. 通知配置模块

**文件路径**：`/src/public/ts/config.ts`

**职责**：
- 定义通知相关的配置参数
- 提供通知标题、图标等自定义选项
- 配置不同消息类型的通知显示方式

_Requirement: R2_

## 技术实现细节

### 通知权限管理

1. 应用启动时，检查通知权限状态
2. 如果权限状态为 "default"，则在适当时机请求权限
3. 根据权限状态决定是否显示通知
4. 提供权限状态变更的回调处理

_Requirement: R3_

### 通知创建与显示

1. 根据消息类型构建通知选项（标题、内容、图标等）
2. 使用 `new Notification()` 创建通知实例
3. 设置通知的点击事件处理，将焦点返回应用页面
4. 配置通知自动关闭时间

_Requirement: R1, R2_

### 消息类型处理

1. notification 类型消息：
   - 显示通知标题为 "AI 通知"
   - 通知内容为消息的 summary 字段
   - 点击通知后聚焦到应用页面

2. session_request 类型消息：
   - 显示通知标题为 "会话请求"
   - 通知内容提示用户有新的交互会话需要处理
   - 点击通知后聚焦到应用页面

_Requirement: R2_

### 浏览器兼容性处理

1. 检测浏览器是否支持 Web Notifications API
2. 对不支持的浏览器提供优雅降级处理
3. 处理不同浏览器的通知权限请求差异

_Requirement: R1_

## 安全考虑

1. 在 HTTP 和 HTTPS 环境下均支持通知功能
2. 避免在通知中显示敏感信息
3. 遵循浏览器的通知频率限制，避免通知轰炸

## 用户体验优化

1. 通知内容简洁明了，避免过长文本
2. 为不同类型的通知使用不同的图标
3. 通知显示时间适中，不干扰用户正常工作
4. 提供通知声音选项（可选）

_Requirement: R1, R2_
