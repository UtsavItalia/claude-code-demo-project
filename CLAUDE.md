# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** is an AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates code that renders live in an iframe via a virtual file system (nothing written to disk).

## Commands

```bash
npm run setup        # First-time setup: install deps + generate Prisma client + run migrations
npm run dev          # Start dev server (Turbopack) at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest tests
npm run db:reset     # Reset SQLite database
```

Run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Architecture

### Three-panel UI (`src/app/main-content.tsx`)
- **Left**: Chat interface (`src/components/chat/`) — user prompts → `/api/chat`
- **Right top**: Live preview iframe (`src/components/preview/PreviewFrame.tsx`)
- **Right bottom**: File tree + Monaco editor (`src/components/editor/`)

### AI generation pipeline (`src/app/api/chat/route.ts`)
- Uses Vercel AI SDK `streamText()` with Claude (falls back to `MockLanguageModel` if no `ANTHROPIC_API_KEY`)
- Claude has two tools: `str_replace_editor` (create/edit files) and `file_manager` (delete/rename)
- System prompt lives in `src/lib/prompts/generation.tsx`
- Max 120s timeout, 40 agentic steps

### Virtual file system (`src/lib/file-system.ts`)
- In-memory only — no disk writes
- State managed via `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`)
- Tool calls from Claude are intercepted and applied to the VFS
- Serialized as JSON and stored in the `Project.data` DB column for authenticated users

### JSX live preview (`src/lib/transform/jsx-transformer.ts`)
- Converts VFS files to executable browser code
- Uses `@babel/standalone` in the iframe for JSX parsing
- Generates import maps so components can import each other

### Auth & persistence
- JWT sessions via `jose`, passwords hashed with `bcrypt`, stored in HTTP-only cookies (7-day expiry)
- `src/lib/auth.ts` + `src/middleware.ts` protect `/api/projects` and `/api/filesystem`
- Anonymous users: state lives in memory only
- Authenticated users: `Project` model persists `messages` (JSON) and `data` (VFS JSON) to SQLite via Prisma

### Key contexts
- `FileSystemContext` — VFS state, selected file, tool-call handling
- `ChatContext` — conversation messages, streaming connection to `/api/chat`

## Code Style

Use comments sparingly. Only comment complex code.

## Environment

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI generation. Without it, mock responses are returned (static example components).

## Database

Schema: `prisma/schema.prisma` — `User` (email/password) → `Project` (name, messages JSON, data JSON).
Migrations live in `prisma/migrations/`.

The database schema for the project is in `prisma/schema.prisma`. Whenever you need information about the database, reference it from there.
