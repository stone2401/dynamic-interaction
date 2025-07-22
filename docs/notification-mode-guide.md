# 通知模式使用指南

## 概述

通知模式是MCP动态交互项目的新功能，允许AI代理发送不需要用户响应的通知消息。

## 功能特点

- ✅ **即时通知**: 无需等待用户响应
- ✅ **双模式支持**: 通知模式和交互模式并存
- ✅ **Markdown支持**: 支持富文本格式显示
- ✅ **向后兼容**: 保持原有交互功能不变

## 使用方法

### 1. 通知模式 (notify-user)

通过MCP调用`notify-user`工具发送通知：

```json
{
  "tool": "mcp1_notify-user",
  "parameters": {
    "project_directory": "/path/to/your/project",
    "summary": "# 通知标题\n\n这是通知内容，支持**Markdown**格式。"
  }
}
```

### 2. 交互模式 (solicit-input)

通过MCP调用`solicit-input`工具请求用户反馈：

```json
{
  "tool": "mcp1_solicit-input", 
  "parameters": {
    "project_directory": "/path/to/your/project",
    "summary": "# 请求反馈\n\n请提供您的意见和建议。",
    "timeout": 300
  }
}
```

## 界面说明

### 通知面板
- 显示AI发送的通知消息
- 包含"已知晓"按钮确认通知
- 支持Markdown格式渲染

### 交互面板  
- 显示需要用户响应的消息
- 包含文本输入、文件上传等功能
- 显示倒计时和会话状态

## 技术实现

### 消息类型

1. **通知消息** (`notification`)
   ```json
   {
     "type": "notification",
     "data": {
       "notificationId": "uuid",
       "summary": "通知内容",
       "projectDirectory": "/path",
       "mode": "NOTIFICATION",
       "createdAt": 1640995200000
     }
   }
   ```

2. **会话请求** (`session_request`)
   ```json
   {
     "type": "session_request", 
     "data": {
       "sessionId": "uuid",
       "summary": "请求内容",
       "projectDirectory": "/path",
       "mode": "INTERACTIVE",
       "startTime": 1640995200000,
       "timeoutSeconds": 300
     }
   }
   ```

### 状态管理

- 通知模式：立即显示，无需等待响应
- 交互模式：启动计时器，等待用户输入
- 模式切换：自动隐藏/显示对应面板

## 测试方法

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 在浏览器中打开：http://localhost:10086

3. 通过MCP调用相应工具测试功能

4. 运行测试脚本：
   ```bash
   node test-notification.js
   ```

## 故障排除

### 常见问题

1. **通知不显示**
   - 检查WebSocket连接状态
   - 确认消息格式正确
   - 查看浏览器控制台错误

2. **样式显示异常**
   - 确认CSS文件加载正确
   - 检查lucide图标库是否加载

3. **计时器不工作**
   - 确认startTime参数正确
   - 检查StatusBar组件初始化

### 调试步骤

1. 打开浏览器开发者工具
2. 查看Network标签页确认资源加载
3. 查看Console标签页查看错误信息
4. 检查WebSocket消息收发情况

## 开发说明

### 文件结构

```
src/
├── mcp/
│   ├── notify-user.ts      # 通知工具实现
│   └── solicit-input.ts    # 交互工具实现
├── server/
│   ├── messageProcessor.ts # 消息处理器
│   └── sessionQueue.ts     # 会话队列
├── public/
│   ├── ts/
│   │   ├── websocket.ts    # WebSocket处理
│   │   └── main.ts         # 主要逻辑
│   └── css/
│       └── components.css  # 组件样式
└── types/
    ├── websocket.ts        # 消息类型定义
    └── session.ts          # 会话类型定义
```

### 扩展开发

要添加新的消息类型或功能：

1. 在`types/websocket.ts`中定义新的消息类型
2. 在`messageProcessor.ts`中添加处理逻辑
3. 在`websocket.ts`中添加前端处理
4. 更新CSS样式和UI组件

## 更新日志

### v1.0.0 (当前版本)
- ✅ 实现基础通知模式功能
- ✅ 支持双模式并存
- ✅ 添加前端UI组件
- ✅ 完成后端消息处理
- ✅ 创建测试和文档
