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
- Uses Vercel AI SDK `streamText()` with `claude-haiku-4-5` (falls back to `MockLanguageModel` if no `ANTHROPIC_API_KEY`)
- Claude has two tools defined in `src/lib/tools/`: `str_replace_editor` (view/create/str_replace/insert) and `file_manager` (delete/rename)
- System prompt lives in `src/lib/prompts/generation.tsx` — instructs Claude to use `/App.jsx` as entrypoint, Tailwind CSS only, realistic placeholder data, responsive + accessible output
- Max 120s timeout, 40 agentic steps (4 for mock)
- On finish, saves messages + VFS to DB if `projectId` provided and user is authenticated

### Virtual file system (`src/lib/file-system.ts`)
- In-memory only — no disk writes
- State managed via `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`)
- Tool calls from Claude are intercepted in `ChatContext` via `onToolCall`, dispatched to `FileSystemContext.handleToolCall()`
- Serialized as JSON and stored in the `Project.data` DB column for authenticated users
- Anonymous users: session state tracked via `src/lib/anon-work-tracker.ts` using `sessionStorage` with key prefix `uigen_`

### JSX live preview (`src/lib/transform/jsx-transformer.ts`)
- Converts VFS files to blob URLs using `@babel/standalone` (auto-detects JS vs TS by filename)
- Generates import maps for inter-component imports and third-party packages via `esm.sh`
- Resolves `@/` alias, strips CSS imports, injects collected styles
- `PreviewFrame.tsx` auto-detects entrypoint via fallback sequence: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.*`
- Preview iframe includes Tailwind CSS via CDN; sandbox allows scripts, same-origin, forms

### Auth & persistence
- JWT sessions via `jose`, passwords hashed with `bcrypt`, stored in HTTP-only cookies (7-day expiry)
- Server actions in `src/actions/index.ts`: `signUp`, `signIn`, `signOut`, `getUser`, `createProject`, `getProject`, `getProjects`
- `src/middleware.ts` protects auth-required routes; auth components live in `src/components/auth/`
- Authenticated users are redirected from `/` to `/{projectId}` automatically

### Key contexts
- `FileSystemContext` — VFS state, selected file, tool-call handling
- `ChatContext` — conversation messages, streaming connection to `/api/chat`

## Code Style

Use comments sparingly. Only comment complex code.

## Environment

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI generation. Without it, mock responses stream pre-built example components (Counter, ContactForm, Card) with simulated delay.

## Database

Schema: `prisma/schema.prisma` — `User` (email/password) → `Project` (name, messages JSON, data JSON).
Migrations live in `prisma/migrations/`.

The database schema for the project is in `prisma/schema.prisma`. Whenever you need information about the database, reference it from there.
