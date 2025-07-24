# Dynamic Interaction 开发指南

> 为开发者和 AI 提供快速上手的完整开发指南

## 🎯 项目概述

Dynamic Interaction 是一个基于 Node.js/TypeScript 的交互式 AI 代理系统，为 AI 模型和用户之间提供丰富的 Web UI 实时多模态交互。系统实现了 Model Context Protocol (MCP)，专为 Cursor、Windsurf 等智能开发环境设计。

### 核心功能
- **双模态 MCP 工具**：`solicit-input`（交互模式）和 `notify-user`（通知模式）
- **懒启动架构**：HTTP 服务器仅在需要时启动，避免端口冲突
- **实时通信**：基于 WebSocket 的前后端实时数据交换
- **会话管理**：智能会话处理，支持超时和自动重连
- **多媒体支持**：文本和图片输入，Web 通知 API 集成

## 🏗️ 系统架构

### 分层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Protocol Layer                     │
├─────────────────────────────────────────────────────────────┤
│                  Application Core Layer                    │
├─────────────────────────────────────────────────────────────┤
│    HTTP Server    │   WebSocket     │   Session Manager   │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                      │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. MCP 服务器 (`src/mcp/`)
- **入口文件**: `index.ts` - MCP 协议实现和工具注册
- **交互工具**: `solicit-input.ts` - 处理用户输入收集和通知发送
- **职责**: 实现 MCP 协议，提供 AI 代理与系统的接口

#### 2. HTTP 服务器 (`src/server/`)
```
server/
├── core/           # 核心服务管理
│   ├── app.ts      # 应用程序单例类
│   ├── lifecycle.ts # 服务器生命周期管理
│   └── server.ts   # HTTP 服务器配置
├── messaging/      # 消息处理系统
│   ├── handlers/   # 消息处理器（自动注册）
│   ├── processor.ts # 消息处理器
│   └── router.ts   # 消息路由
├── session/        # 会话管理
│   ├── manager.ts  # 会话管理器
│   ├── context.ts  # 会话上下文
│   └── queue.ts    # 消息队列
└── websocket/      # WebSocket 层
    ├── transport.ts # WebSocket 传输层
    ├── connection.ts # 连接管理
    └── middleware.ts # 中间件
```

#### 3. 前端系统 (`src/public/`)
```
public/
├── ts/             # TypeScript 前端代码
│   ├── core/       # 核心系统
│   │   ├── app.ts  # 应用程序入口
│   │   ├── events.ts # 事件总线
│   │   └── types.ts # 类型定义
│   ├── services/   # 服务层
│   │   ├── websocket.ts # WebSocket 客户端
│   │   ├── notification.ts # 通知服务
│   │   ├── i18n.ts # 国际化
│   │   └── theme.ts # 主题管理
│   ├── components/ # UI 组件
│   │   ├── feedback.ts # 反馈组件
│   │   ├── modal.ts # 模态框
│   │   ├── statusBar.ts # 状态栏
│   │   └── imageHandler.ts # 图片处理
│   └── utils/      # 工具函数
├── css/            # 样式文件
└── index.html      # 主页面
```

## 🛠️ 开发环境设置

### 环境要求
- **Node.js**: >= 18.0.0
- **包管理器**: pnpm (推荐) 或 npm
- **TypeScript**: >= 5.8.3

### 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd dynamic-interaction

# 2. 安装依赖
pnpm install

# 3. 开发模式（热重载）
pnpm run dev

# 4. 构建项目
pnpm run build

# 5. 全局安装（CLI 工具）
make link
```

### 构建流程详解

```bash
# 完整构建流程
pnpm run build
├── rm -rf dist                    # 清理输出目录
├── tsc                           # 后端 TypeScript 编译
├── chmod 755 dist/src/*.js       # 设置可执行权限
├── tsc --project tsconfig.frontend.json  # 前端编译
└── npm run copy-assets           # 复制静态资源
```

### 配置文件说明

#### TypeScript 配置
- **`tsconfig.json`**: 后端编译配置（NodeNext 模块）
- **`tsconfig.frontend.json`**: 前端编译配置

#### 构建配置
- **`Makefile`**: 简化的构建命令
- **`package.json`**: npm 脚本和依赖管理

## 🚀 核心开发模式

### 1. 懒启动模式
```typescript
// HTTP 服务器仅在 MCP 工具调用时启动
if (lifecycleManager.state === 'stopped') {
  await startServer();
  logger.info(`HTTP服务器已懒启动`);
}
```

### 2. 事件驱动架构
```typescript
// 前端事件总线
eventBus.on(APP_EVENTS.WEBSOCKET_CONNECTED, handleConnection);
eventBus.emit(APP_EVENTS.SESSION_START, sessionData);
```

### 3. 模块化消息处理
```typescript
// 消息处理器自动注册
// src/server/messaging/handlers/index.ts
import './feedback';
import './ping';
import './system';
```

## 📝 开发规范

### 🎯 核心原则

#### 1. 不破坏现有架构
- ❌ **禁止修改项目的分层架构设计**
- ❌ **禁止修改 MCP 协议实现方式**
- ❌ **禁止破坏 WebSocket 通信机制**
- ❌ **禁止修改双 TypeScript 配置**

#### 2. 保持代码一致性
- ✅ **遵循现有的命名规范**（camelCase 文件名，PascalCase 类名）
- ✅ **使用中文注释**提高团队理解
- ✅ **保持现有的导入导出结构**
- ✅ **使用项目既定的设计模式**（单例、事件总线等）

#### 3. 类型安全优先
- ✅ **严格使用 TypeScript 类型**，避免 `any`
- ✅ **所有公共 API 都要有类型定义**
- ✅ **使用类型守卫进行运行时检查**
- ✅ **处理所有可能的 null/undefined 情况**

### 🚫 严格禁止

#### 代码修改禁忌
```typescript
// ❌ 禁止
function badCode(data: any): any {
  return data.whatever;
}

// ✅ 正确
function goodCode(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as any).value);
  }
  throw new Error('数据格式不正确');
}
```

#### 架构修改禁忌
- ❌ 删除或重命名核心文件
- ❌ 修改 `package.json` 的基础配置
- ❌ 破坏现有的模块导入关系
- ❌ 引入不必要的第三方依赖

## 💡 最佳实践

### 组件开发模式
```typescript
// ✅ 标准组件结构
class MyComponent {
  private elements: { button?: HTMLElement } = {};
  private state = { isActive: false };
  
  public initialize(): void {
    this.initializeElements();
    this.setupEventListeners();
  }
  
  private initializeElements(): void {
    this.elements.button = getElementById('my-button');
  }
  
  private setupEventListeners(): void {
    eventBus.on(APP_EVENTS.SOME_EVENT, this.handleEvent.bind(this));
  }
}
```

### 错误处理标准
```typescript
// ✅ 标准错误处理
try {
  await someOperation();
  logger.info('操作成功');
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error('操作失败:', error);
  }
  throw error;
}
```

### 会话管理模式
```typescript
// 会话创建和管理
const session = sessionManager.createSession({
  projectDirectory,
  summary,
  mode: SessionMode.INTERACTIVE,
  timeout: 300
});

await session.waitForResponse();
```

## 🔧 配置管理

### 环境变量配置
```bash
# 基础配置
PORT=10086                    # HTTP 服务器端口
SESSION_TIMEOUT=300           # 会话超时时间（秒）
TIMEOUT_PROMPT="continue"     # 超时默认提示

# 日志配置
LOG_ENABLED=false            # 启用日志系统
LOG_DIR=logs                 # 日志目录
LOG_LEVEL=info              # 日志级别
LOG_COLORIZE=true           # 彩色输出
LOG_TO_FILE=true            # 输出到文件
```

### 运行时配置
```typescript
// src/config.ts
export const MCP_CONFIG = {
  name: "dynamic-interaction",
  version: "1.0.0"
};

export const PORT = parseInt(process.env.PORT || "10086");
export const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || "300");
```

## 🧪 测试和调试

### 开发命令
```bash
# 开发模式（热重载）
pnpm run dev

# 构建和启动
pnpm run build
pnpm start

# CLI 工具测试
dynamic-interaction

# 调试模式
LOG_ENABLED=true pnpm run dev
```

### 调试技巧
1. **日志查看**: `tail -f logs/combined.log`
2. **WebSocket 调试**: 浏览器开发者工具 Network > WS
3. **MCP 调试**: 查看 Claude Desktop 或 Cursor 的 MCP 日志
4. **端口检查**: `lsof -i :10086`

## 📋 提交前检查清单

### 必检项目
- [ ] 代码能正常编译 (`pnpm run build`)
- [ ] 遵循了现有的命名规范
- [ ] 没有使用 `any` 类型
- [ ] 添加了必要的错误处理
- [ ] 没有破坏现有功能
- [ ] 中文注释完整
- [ ] 类型定义完善

### 功能测试
- [ ] MCP 工具正常工作
- [ ] WebSocket 连接稳定
- [ ] 会话管理正确
- [ ] 图片上传功能
- [ ] 通知系统工作
- [ ] 国际化支持

## 🆘 常见问题解决

### 启动问题
```bash
# 端口被占用
Error: listen EADDRINUSE :::10086
→ 解决: PORT=8080 pnpm start

# 权限问题
Permission denied
→ 解决: chmod +x dist/src/cli.js
```

### 构建问题
```bash
# TypeScript 编译错误
→ 检查 tsconfig.json 配置
→ 确保类型定义正确

# 资源复制失败
→ 检查 copy-assets 脚本
→ 确保目录权限正确
```

### 运行时问题
```bash
# WebSocket 连接失败
→ 检查防火墙设置
→ 确认端口可访问

# 会话超时
→ 调整 SESSION_TIMEOUT 配置
→ 检查网络连接稳定性
```

## 🔍 项目结构快速导航

### 关键文件定位
```bash
# 主要入口点
src/index.ts          # 应用程序主入口
src/cli.ts            # CLI 命令行入口
src/mcp/index.ts      # MCP 服务器配置

# 核心配置
src/config.ts         # 环境配置
CLAUDE.md            # Claude Code 指令
package.json         # 项目配置

# 服务器核心
src/server/core/app.ts        # 应用程序类
src/server/core/lifecycle.ts  # 生命周期管理
src/server/session/manager.ts # 会话管理器

# 前端核心
src/public/ts/core/app.ts     # 前端应用
src/public/ts/services/websocket.ts # WebSocket 服务
```

### 添加新功能流程
1. **后端**: 在 `src/server/messaging/handlers/` 添加处理器
2. **前端**: 在 `src/public/ts/components/` 添加组件
3. **类型**: 在 `src/types/` 定义接口
4. **样式**: 在 `src/public/css/components/` 添加样式
5. **测试**: 确保构建和功能正常

## 🎉 开发贡献

### 代码风格
- 使用 TypeScript 严格模式
- 遵循现有的文件命名约定
- 保持中文注释和文档
- 确保类型安全

### 提交规范
```bash
# 提交信息格式
feat: 添加新功能描述
fix: 修复问题描述
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
```

---

**核心原则：一致性比完美更重要。不确定时，保持与现有代码的一致性。**

> 🚀 本文档旨在帮助开发者和 AI 快速理解项目架构，高效参与开发。如有疑问，请参考 `CLAUDE.md` 或现有代码实现。