# Technology Stack

## Core Technologies
- **Runtime**: Node.js 18+ (required)
- **Language**: TypeScript 5.x with strict mode enabled
- **Package Manager**: pnpm (recommended), npm supported
- **Protocol**: Model Context Protocol (MCP) via `@modelcontextprotocol/sdk`

## Backend Stack
- **Framework**: Express.js 5.x
- **WebSocket**: ws library for real-time communication
- **Logging**: Winston with daily rotate file support
- **Validation**: Zod for schema validation
- **File Upload**: Multer for multipart/form-data handling
- **Environment**: dotenv for configuration management

## Frontend Stack
- **Language**: TypeScript (ES2022 target)
- **Module System**: ESNext modules
- **APIs**: Web Notifications API, Page Visibility API, WebSocket API
- **UI Libraries**: Lucide icons, marked.js for markdown, highlight.js for syntax highlighting
- **Styling**: Pure CSS3 with CSS custom properties, responsive design

## Build System
- **Compiler**: TypeScript compiler (tsc)
- **Dual Compilation**: Separate configs for backend (NodeNext) and frontend (ESNext)
- **Asset Pipeline**: Custom build script with asset copying
- **Output**: `dist/` directory with compiled JavaScript

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm run dev

# Build for production
pnpm run build

# Start built application
pnpm start
```

### Build Process
```bash
# Full build (recommended)
make build

# Manual build steps
pnpm run build          # Compiles TS + builds frontend + copies assets
pnpm run build:frontend # Frontend-only compilation
pnpm run copy-assets    # Asset copying only
```

### Deployment
```bash
# Global installation
npm install -g dynamic-interaction

# Link for development
make link

# Start server
make start
```

## Configuration
- Environment variables via `.env` file or process.env
- Default port: 10086
- Configurable logging, session timeouts, and language settings
- Lazy server initialization to avoid port conflicts

## Architecture Patterns
- **Modular Design**: Clean separation between MCP, HTTP server, and WebSocket layers
- **Singleton Pattern**: Application instance management
- **Event-Driven**: WebSocket-based real-time communication
- **Lazy Loading**: HTTP server starts only when needed
- **Session Management**: Centralized session handling with timeouts