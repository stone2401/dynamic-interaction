# Product Overview

Dynamic Interaction MCP is a Node.js/TypeScript-based interactive AI agent system that provides a rich Web UI for real-time, multimodal interaction between AI models and users.

## Core Purpose
- Implements the Model Context Protocol (MCP) for AI editors like Cursor, Windsurf, and other intelligent development environments
- Enables AI agents to collect user feedback through an interactive web interface
- Supports both interactive mode (waiting for user response) and notification mode (one-way communication)

## Key Features
- **Multi-modal Interaction**: Support for text and image inputs with real-time feedback
- **Web Notifications**: Browser-native notifications for background tab awareness
- **Dual MCP Tools**:
  - `solicit-input`: Interactive mode that collects user feedback through web interface
  - `notify-user`: Notification mode that sends information without waiting for response
- **Lazy Server Start**: HTTP server only starts when needed to avoid port conflicts
- **Session Management**: Smart session handling with timeouts and auto-reconnection
- **Real-time Communication**: WebSocket-based live updates between frontend and backend

## Target Users
- AI development teams using intelligent code editors
- Developers building AI-assisted workflows
- Teams requiring human-in-the-loop AI interactions

## Deployment
- Can be installed globally via npm/pnpm
- Runs as MCP server in AI editor configurations
- Provides CLI interface for direct usage