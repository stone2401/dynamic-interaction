# Dynamic Interaction MCP

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg) ![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> [中文文档](./docs/README-zh.md) | English

A Node.js/TypeScript-based interactive AI agent system that provides a rich Web UI for real-time, multimodal interaction between AI models and users. This tool implements the Model Context Protocol (MCP) and is designed for use with AI editors like Cursor, Windsurf, and other intelligent development environments.

## ✨ Features

- **Multi-modal Interaction**: Support for text and image inputs with real-time feedback
- **Web Notifications**: Browser-native notifications ensure you never miss important messages, even when the tab is in the background
- **Dual MCP Tools**:
  - `solicit-input`: Interactive mode that collects user feedback through a web interface
  - `notify-user`: Notification mode that sends information to users without waiting for response
- **Lazy Server Start**: HTTP server only starts when needed to avoid port conflicts
- **Session Management**: Smart session handling with timeouts and auto-reconnection
- **Real-time Communication**: WebSocket-based live updates between frontend and backend
- **Responsive UI**: Modern, clean interface with dark/light theme support
- **Page Visibility Detection**: Automatically detects when users switch to background tabs

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, WebSocket, Winston
- **Frontend**: TypeScript, HTML5, CSS3, Web Notifications API, Page Visibility API
- **Protocol**: Model Context Protocol (MCP)
- **Libraries**: marked.js, highlight.js, lucide icons

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ required)
- [pnpm](https://pnpm.io/) (recommended package manager)

### Installation

1. **Install the package globally:**
   ```bash
   npm install -g dynamic-interaction
   ```

2. **Or install from source:**
   ```bash
   git clone https://github.com/stone2401/dynamic-interaction.git
   cd dynamic-interaction
   pnpm install
   pnpm run build
   make link  # Links as global CLI tool
   ```

### Usage

**As MCP Server:**
Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "dynamic-interaction": {
      "command": "dynamic-interaction"
    }
  }
}
```

AI Rule add below content:

```Rule
- **Interaction Channel**: All interactions with the user must be conducted through the `dynamic-interaction` interface.
  - **Solicit Input (`solicit-input`)**: This is the **only** way for the AI to initiate any interaction. Whether it's requesting approval, reporting an obstacle, seeking guidance, or asking to conclude the conversation after a task is complete, it must be done through this interface. After calling it, the AI must pause and wait for the user's response.
  - **Notify User (`notify-user`)**: This interface is used to send one-way notifications to the user that do not require an immediate response, such as mid-task progress updates. After calling it, the AI can continue its execution without waiting.
  - **Task Closure Constraint**: The AI is **strictly prohibited** from unilaterally deciding to end the current conversation or task. After all tasks are completed, it must use the `solicit-input` interface.
```

**Direct CLI Usage:**
```bash
# Start the MCP server
dynamic-interaction

# Development mode
pnpm run dev

# Build project
pnpm run build
```

## 🔧 Configuration

Environment variables can be configured via `.env` file or direct export:

### Basic Configuration

| Variable          | Description                       | Default      |
| ----------------- | --------------------------------- | ------------ |
| `PORT`            | HTTP server port                  | `10086`      |
| `SESSION_TIMEOUT` | Session timeout in seconds        | `300`        |
| `TIMEOUT_PROMPT`  | Default prompt on session timeout | `"continue"` |

### Logging Configuration

| Variable            | Description                                                | Default                       |
| ------------------- | ---------------------------------------------------------- | ----------------------------- |
| `LOG_ENABLED`       | Enable logging system                                      | `false`                       |
| `LOG_DIR`           | Log files storage directory                                | `~/.dynamic-interaction/logs` |
| `LOG_ERROR_FILE`    | Error log filename                                         | `error.log`                   |
| `LOG_COMBINED_FILE` | Combined log filename                                      | `combined.log`                |
| `LOG_LEVEL`         | Log level (error, warn, info, http, verbose, debug, silly) | `info`                        |
| `LOG_COLORIZE`      | Colorized console output                                   | `true`                        |
| `LOG_TO_FILE`       | Output logs to file (requires LOG_ENABLED=true)            | `true`                        |

**Example:**
```bash
PORT=8080 LOG_ENABLED=true dynamic-interaction
```

## 🌟 Key Features

### Web Notifications
The system provides comprehensive notification support:
- **Browser Notifications**: Native browser notifications when the tab is in background
- **Permission Management**: Automatic permission requests and status checking
- **Page Visibility Detection**: Uses Page Visibility API to detect when users switch tabs
- **Smart Notification Logic**: Only shows browser notifications when the page is not visible

### MCP Tools

1. **solicit-input**
   - Opens interactive web interface
   - Supports text and image inputs
   - Real-time session management
   - Automatic cleanup on timeout

2. **notify-user**
   - Sends notifications without waiting for user input
   - Shows browser notifications for background users
   - Customizable notification content

### Architecture Highlights

- **Modular Design**: Clean separation between MCP server, HTTP server, and WebSocket transport
- **Session Management**: Smart session handling with timeouts and cleanup
- **State Management**: Centralized server state management
- **Error Handling**: Comprehensive error handling and graceful degradation
- **Security**: Input validation and sanitization

## 📁 Project Structure

```
src/
├── mcp/           # MCP server implementation
├── server/        # HTTP server and WebSocket handling
├── public/        # Frontend assets
│   ├── ts/        # TypeScript frontend code
│   ├── css/       # Stylesheets
│   └── index.html # Main UI
├── types/         # Shared TypeScript interfaces
├── utils/         # Utility functions
└── config.ts      # Configuration management
```

## 🚀 Development

### Build Commands

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm run dev

# Build for production
pnpm run build

# Start built application
pnpm start

# Alternative build using Makefile
make build
make start
```

### Frontend Development

The frontend uses a modular TypeScript architecture:
- **Services**: WebSocket communication, notifications, themes
- **Components**: UI components like modals, status bars, feedback forms
- **Utils**: Helper functions and DOM utilities
- **Core**: Application core, event system, and type definitions

## 📚 Documentation

For detailed documentation, see the `docs/` directory:
- Architecture overview
- API documentation
- Deployment guides
- Configuration options

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request or create an Issue.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

Built for the AI development community to enhance human-AI interaction in modern development workflows.