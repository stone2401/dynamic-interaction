# Technology Stack

## Runtime & Language

- **Node.js**: >=18.x required
- **TypeScript**: 5.x with strict mode enabled
- **Package Manager**: pnpm (preferred), npm supported

## Backend Technologies

- **Express.js**: Web server framework (v5.x)
- **WebSocket**: Real-time communication via `ws` library
- **Model Context Protocol (MCP)**: AI agent communication protocol
- **Winston**: Logging framework with custom WebSocket transport
- **Zod**: Runtime type validation
- **Multer**: File upload handling

## Frontend Technologies

- **Vanilla TypeScript**: No framework dependencies
- **HTML5/CSS3**: Modern web standards
- **marked.js**: Markdown parsing and rendering
- **highlight.js**: Code syntax highlighting
- **lucide**: Icon library

## Build System

### TypeScript Configuration
- **Backend**: NodeNext module resolution, ES2022 target
- **Frontend**: ESNext modules, DOM libraries included
- **Output**: Compiled to `dist/` directory

### Build Commands

```bash
# Install dependencies
pnpm install

# Development with hot reload
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm start

# Alternative build via Makefile
make build
make start
```

### Build Process

1. Clean `dist/` directory
2. Compile TypeScript (backend and frontend separately)
3. Set executable permissions on CLI files
4. Build frontend TypeScript
5. Copy static assets (CSS, HTML, JS)

## Environment Configuration

Configuration via environment variables or `.env` file:

- `PORT`: Server port (default: 10086)
- `LOG_ENABLED`: Enable logging (default: false)
- `SESSION_TIMEOUT`: Session timeout in seconds (default: 300)
- `LOG_LEVEL`: Logging level (default: info)

## Development Tools

- **nodemon**: Development server with auto-restart
- **ts-node**: Direct TypeScript execution
- **copyfiles**: Asset copying utility