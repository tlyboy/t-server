# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

t Server is an instant messaging backend service built on the [Nitro](https://nitro.unjs.io/) framework, using MySQL as the database with WebSocket real-time communication support.

## Common Commands

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Prepare Nitro types
pnpm prepare
```

## Environment Configuration

Copy `.env.example` to `.env` and configure the following environment variables:

- `NITRO_JWT_SECRET` - JWT secret key
- `MYSQL_USER/PASSWORD/DATABASE/HOST/PORT` - MySQL database connection

## Code Architecture

```
server/
├── middleware/     # Middleware (CORS, JWT authentication)
├── routes/         # API routes (file-system based)
│   ├── _ws.ts      # WebSocket handler
│   └── v1/         # v1 API
│       ├── user/   # User-related (login, registration)
│       ├── chat/   # Chat sessions
│       └── message/# Messages
└── utils/          # Utility functions (JWT generation/verification)
```

### Key Architecture Points

- **Routing System**: Nitro file-system routing, files under `server/routes/` are automatically mapped to API endpoints
- **Middleware Execution Order**: Middleware under `server/middleware/` executes in filename order (cors -> auth)
- **Authentication Mechanism**: JWT Bearer Token, whitelisted routes (`/`, `/v1/user/login`, `/v1/user/register`) do not require authentication
- **Accessing Auth Info**: Get the current user ID via `event.context.auth.userId`
- **Database Access**: Uses Nitro's experimental database feature, obtain a connection via `useDatabase()`, supports SQL template strings
- **WebSocket**: WebSocket handler defined via the `_ws.ts` file (experimental feature)

## Technical Requirements

- Node.js >= 22
- pnpm 10.22.0 (enabled via corepack)
