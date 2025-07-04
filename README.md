# 动态交互 AI 代理系统

![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg) ![License](https://img.shields.io/badge/License-MIT-yellow.svg)

一个基于 Node.js 的交互式 AI 代理系统，提供一个功能丰富的 Web UI，允许用户与 AI 模型进行实时、多模态的交互。

## ✨ 项目概述

本项目旨在构建一个高效、可靠的桥梁，连接 AI 代理与最终用户。通过一个直观的 Web 界面，用户可以发送文本和图片，实时查看 AI 的工作摘要和日志输出，从而实现无缝的人机协作。

系统采用模块化和可扩展的设计，使其易于集成、部署和维护。

## 🚀 核心功能

- **多模态交互**：支持文本和图片输入，丰富用户与 AI 的沟通方式。
- **实时反馈**：通过 WebSocket 实现 AI 工作摘要和日志的实时推送，让用户即时了解 AI 的状态。
- **懒启动服务器**：HTTP 服务器仅在需要时启动，有效避免多实例部署时的端口冲突，并节约资源。
- **模块化设计**：前后端代码高度模块化，易于扩展和维护。
- **可配置的日志系统**：集成了 Winston，**默认禁用**以保持整洁。启用后，支持多种日志输出方式，包括实时推送到前端，便于调试和监控。
- **响应式 UI**：简洁、现代化的用户界面，支持亮色和暗色主题切换。

## 🛠️ 技术栈

- **后端**: Node.js, Express.js, TypeScript, WebSocket
- **前端**: HTML5, CSS3, TypeScript
- **协议**: Model Context Protocol (MCP)
- **核心库**: Winston, marked.js, highlight.js, lucide

## ⚡ 快速上手

按照以下步骤，在您的本地环境中快速运行本项目。

### 1. 先决条件

- [Node.js](https://nodejs.org/) (建议版本 18.x 或更高)
- [npm](https://www.npmjs.com/)

### 2. 安装依赖

克隆仓库并进入项目目录，然后安装所需的依赖包：

```bash
npm install
```

### 3. 运行应用

执行以下命令启动应用程序：

```bash
npm start
```

应用启动后，您可以通过浏览器访问 `http://localhost:3000` (或您通过环境变量指定的端口) 来查看 Web UI。

### 4. 环境变量配置

您可以通过环境变量来配置应用程序。创建一个 `.env` 文件在项目根目录，或者在启动时直接提供。

| 变量名                 | 描述                                     | 默认值           |
| ---------------------- | ---------------------------------------- | ---------------- |
| `PORT`                 | 服务器监听的 HTTP 端口。                 | `10086`          |
| `LOG_ENABLED`          | 是否启用日志系统 (`'true'` 启用)。         | `false`          |
| `TIMEOUT_PROMPT`       | 会话超时后自动发送的提示词。             | `continue`       |
| `SESSION_TIMEOUT`      | 会话超时时间（秒）。                     | `300`            |
| `LOG_DIR`              | 日志文件的存储目录。                     | `~/.dynamic-interaction/logs` |
| `LOG_ERROR_FILE`       | 错误日志的文件名。                       | `error.log`      |
| `LOG_COMBINED_FILE`    | 综合日志的文件名。                       | `combined.log`   |
| `LOG_LEVEL`            | 应用的日志级别。                         | `info`           |
| `LOG_COLORIZE`         | 是否在控制台输出带颜色的日志 (`'false'` 禁用)。 | `true`           |
| `LOG_TO_FILE`          | 是否将日志输出到文件 (`'false'` 禁用，且需 `LOG_ENABLED=true`)。 | `true`           |

**示例：**

要在 `10086` 端口以 `debug` 模式运行，并禁用文件日志记录：

```bash
PORT=10086 LOG_LEVEL=debug LOG_TO_FILE=false npm start
```

## 📚 详细文档

我们提供了详细的文档，以帮助您更深入地了解项目的架构、组件和部署细节。请参阅 **[docs/Project_Documentation.md](./docs/Project_Documentation.md)** 以获取完整的文档索引。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果您有好的想法或发现了问题，请随时提交 Pull Request 或创建 Issue。

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源。
