# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js/TypeScript-based interactive AI agent system that provides a rich Web UI for real-time, multimodal interaction between AI models and users. The system implements the Model Context Protocol (MCP) and provides two main tools:

- `solicit-input`: Interactive mode that collects user feedback through a web interface
- `notify-user`: Notification mode that sends information to users without waiting for response

## Development Commands

Use pnpm as the package manager for this project:

```bash
# Install dependencies
pnpm install

# Build the project (compiles TypeScript and copies assets)
pnpm run build

# Development mode with hot reload
pnpm run dev

# Start the application (requires build first)
pnpm start

# Alternative build using Makefile
make build

# Link as global CLI tool
make link

# Run CLI directly
make start
```

## Architecture Overview

### Core Components

1. **MCP Server** (`src/mcp/`): Implements Model Context Protocol with two main tools
2. **Express Server** (`src/server/`): HTTP server with lazy-start capability to avoid port conflicts
3. **WebSocket Transport** (`src/server/websocket.ts`): Real-time communication between frontend and backend
4. **Session Management** (`src/server/sessionManager.ts`): Handles user sessions and timeouts
5. **Frontend** (`src/public/`): TypeScript-based web UI with notification services

### Key Design Patterns

- **Lazy Server Start**: HTTP server only starts when needed (when MCP tools are called)
- **Dual Architecture**: Separate TypeScript configs for backend (`tsconfig.json`) and frontend (`tsconfig.frontend.json`)
- **Modular Message Handling**: Handlers in `src/server/handlers/` are auto-imported
- **State Management**: Centralized server state management in `src/server/serverState.ts`

### Entry Points

- **Main Application**: `src/index.ts` - Configures and starts MCP server
- **CLI Interface**: `src/cli.ts` - Command-line interface for the tool
- **MCP Tools**: `src/mcp/index.ts` - Registers the two main MCP tools

## Configuration

The application uses environment variables for configuration (see `src/config.ts`):

- `PORT`: HTTP server port (default: 10086)
- `LOG_ENABLED`: Enable logging system (default: false) 
- `SESSION_TIMEOUT`: Session timeout in seconds (default: 300)
- `TIMEOUT_PROMPT`: Default prompt on session timeout (default: "continue")

## Build Process

The build process involves multiple steps:

1. TypeScript compilation for backend (`tsc`)
2. Frontend TypeScript compilation (`tsc --project tsconfig.frontend.json`)
3. Asset copying and organization (`copy-assets` script)
4. Executable permissions for CLI files

## Testing

Check the project structure for test files or scripts. This codebase doesn't appear to have a standard test setup configured.

## File Structure Notes

- `dist/`: Compiled output directory
- `src/public/`: Frontend assets (HTML, CSS, TypeScript)
- `src/server/`: Backend server components
- `src/mcp/`: MCP protocol implementation
- `src/types/`: Shared TypeScript interfaces
- `docs/`: Comprehensive project documentation
- `logs/`: Runtime log files (when logging enabled)

## Important Implementation Details

- The system uses a notification store (`src/server/notificationStore.ts`) for managing user notifications
- Image handling utilities are available in `src/utils/image.ts`
- WebSocket connections are managed through a custom transport layer
- The frontend uses vanilla TypeScript with modular component architecture
- Logging is disabled by default but can be enabled with `LOG_ENABLED=true`