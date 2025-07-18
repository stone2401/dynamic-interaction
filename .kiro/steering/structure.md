# Project Structure

## Root Directory

```
├── src/                    # Source code
├── dist/                   # Compiled output
├── docs/                   # Project documentation
├── tests/                  # Test files
├── logs/                   # Runtime logs
├── node_modules/           # Dependencies
├── package.json            # Project configuration
├── tsconfig.json           # Backend TypeScript config
├── tsconfig.frontend.json  # Frontend TypeScript config
├── Makefile               # Build shortcuts
└── README.md              # Project documentation
```

## Source Code Organization (`src/`)

### Core Files
- `index.ts`: Main application entry point
- `cli.ts`: Command-line interface
- `config.ts`: Configuration management
- `logger.ts`: Logging setup and configuration

### Backend Structure (`src/server/`)
- `express.ts`: Express server setup
- `websocket.ts`: WebSocket server implementation
- `messageRouter.ts`: Message routing logic
- `sessionManager.ts`: Session lifecycle management
- `sessionQueue.ts`: Session queuing system
- `serverState.ts`: Server state management
- `websocketTransport.ts`: Custom Winston transport
- `handlers/`: Request handlers

### MCP Integration (`src/mcp/`)
- `index.ts`: MCP server implementation
- `solicit-input.ts`: Input solicitation tools

### Frontend (`src/public/`)
- `index.html`: Main HTML template
- `css/`: Stylesheets
- `ts/`: TypeScript frontend modules
- `assets/`: Static assets

### Type Definitions (`src/types/`)
- `session.ts`: Session-related types
- `feedback.ts`: Feedback message types

## Architecture Patterns

### Modular Design
- Clear separation between MCP, server, and frontend layers
- Each module has single responsibility
- Loose coupling between components

### Session Management
- Centralized session handling via `SessionManager`
- Queue-based session processing
- Timeout management for inactive sessions

### Communication Flow
```
AI Agent → MCP Server → Backend Server → WebSocket → Frontend UI
```

### Configuration Pattern
- Environment-based configuration
- Sensible defaults with override capability
- Runtime configuration validation

## File Naming Conventions

- **TypeScript files**: camelCase (e.g., `sessionManager.ts`)
- **Configuration files**: kebab-case (e.g., `tsconfig.frontend.json`)
- **Directories**: camelCase for code, kebab-case for config
- **Assets**: descriptive names with appropriate extensions