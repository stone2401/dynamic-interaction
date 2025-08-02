# Project Structure

## Root Directory
```
├── src/                    # Source code
├── dist/                   # Compiled output (generated)
├── docs/                   # Documentation and specifications
├── logs/                   # Application logs (generated)
├── node_modules/           # Dependencies (generated)
├── package.json            # Project configuration
├── tsconfig.json           # Backend TypeScript config
├── tsconfig.frontend.json  # Frontend TypeScript config
├── Makefile               # Build shortcuts
└── README.md              # Project documentation
```

## Source Code Organization (`src/`)

### Core Application
- `src/index.ts` - Main application entry point, initializes MCP server
- `src/cli.ts` - CLI interface for standalone usage
- `src/config.ts` - Centralized configuration management
- `src/logger.ts` - Winston logging setup

### MCP Integration (`src/mcp/`)
- `src/mcp/index.ts` - MCP server configuration and tool registration
- `src/mcp/solicit-input.ts` - Core interaction logic for user input collection

### Server Architecture (`src/server/`)
- `src/server/core/` - Application lifecycle and server management
  - `app.ts` - Application singleton and startup logic
  - `lifecycle.ts` - Server state management
  - `server.ts` - HTTP server configuration
- `src/server/messaging/` - Message handling system
  - `handlers/` - Individual message type handlers
  - `processor.ts` - Message processing logic
  - `router.ts` - Message routing
- `src/server/websocket/` - WebSocket communication
  - `connection.ts` - WebSocket connection management
  - `middleware.ts` - WebSocket middleware
  - `transport.ts` - Transport layer abstraction
- `src/server/session/` - Session management
  - `manager.ts` - Session lifecycle
  - `context.ts` - Session context handling
  - `queue.ts` - Session queuing system
- `src/server/notifications/` - Notification system
- `src/server/utils/` - Server utilities and error handling

### Frontend (`src/public/`)
- `src/public/index.html` - Main HTML template
- `src/public/css/` - Stylesheets with modular organization
  - `base/` - Reset, accessibility, print styles
  - `components/` - UI component styles
  - `layout/` - Layout-specific styles
  - `themes/` - Theme definitions
- `src/public/ts/` - Frontend TypeScript code
  - `main.ts` - Frontend entry point
  - `core/` - Application core, events, types
  - `components/` - UI components (modals, status bar, etc.)
  - `services/` - WebSocket, notifications, i18n, theme services
  - `utils/` - DOM utilities and helpers
  - `config/` - Frontend constants

### Shared Code
- `src/types/` - Shared TypeScript interfaces and types
- `src/utils/` - Shared utility functions

## Documentation (`docs/`)
- `docs/DEVELOPMENT.md` - Development guidelines
- `docs/README-zh.md` - Chinese documentation
- `docs/guides/` - User guides and tutorials
- `docs/specs/` - Feature specifications and design documents
- `docs/bugs/` - Bug reports and investigations

## Configuration Files
- `.kiro/` - Kiro-specific configuration and steering rules
- `.claude/` - Claude-specific agent configurations
- `.gitignore` - Git ignore patterns
- `LICENSE` - MIT license

## Build Output (`dist/`)
Generated structure mirrors `src/` with compiled JavaScript:
- `dist/src/` - Compiled backend code
- `dist/src/public/js/` - Compiled frontend code (moved from `dist/frontend/`)
- `dist/src/public/css/` - Copied stylesheets
- `dist/src/public/index.html` - Copied HTML template

## Naming Conventions
- **Files**: kebab-case for CSS, camelCase for TypeScript
- **Directories**: lowercase with hyphens where needed
- **Classes**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with descriptive names

## Import Patterns
- Use relative imports within modules
- Absolute imports from `src/` root for cross-module dependencies
- Frontend uses `.js` extensions for compiled output compatibility
- Backend uses Node.js module resolution

## File Organization Principles
- **Separation of Concerns**: Clear boundaries between MCP, server, and frontend
- **Modular Architecture**: Each directory has a single responsibility
- **Shared Resources**: Common types and utilities in dedicated directories
- **Configuration Centralization**: All config in `src/config.ts`
- **Lazy Loading**: Components initialize only when needed