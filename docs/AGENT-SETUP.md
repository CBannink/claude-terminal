# Agent Setup for Building ClaudeTerminal + AgentHub

This document describes the exact Claude Code configuration used to build this project.
It serves as both documentation AND as the first real-world test of "agent configs" — we're
dogfooding the concept.

---

## Root CLAUDE.md Strategy

The root CLAUDE.md should be **short and opinionated**. Claude Code loads it every session —
bloated instructions waste context window and dilute the important stuff.

**Principles:**
1. Tell Claude WHAT the project is (so it doesn't have to figure it out)
2. Tell Claude WHERE things live (save exploration time)
3. Tell Claude HOW to work (conventions, not tutorials)
4. Tell Claude what NOT to do (prevent common mistakes)
5. Link to detailed docs rather than inlining them

**Anti-patterns to avoid:**
- Don't paste entire API docs into CLAUDE.md
- Don't explain how TypeScript works
- Don't list every file in the project
- Don't write paragraphs when a bullet point suffices

---

## The Actual CLAUDE.md (Root)

```markdown
# ClaudeTerminal + AgentHub

## What is this
Monorepo with 2 products: (1) AgentHub — community registry for Claude Code agent
configs, (2) ClaudeTerminal — desktop terminal for Claude Code. Both MIT licensed.

## Structure
apps/web         — Next.js 15 (App Router) + Convex. The AgentHub website.
apps/desktop     — Tauri 2.0. The ClaudeTerminal desktop app.
apps/cli         — Rust CLI. The `agenthub` command-line tool.
packages/shared  — Shared TS types, validation logic, constants.
docs/            — Proposal, decisions, architecture docs.

## Stack
- Backend: Convex (schema in apps/web/convex/schema.ts)
- Frontend: Next.js 15, Tailwind CSS, shadcn/ui
- Desktop: Tauri 2.0 (Rust backend + React frontend)
- CLI: Rust with clap, reqwest, tokio
- Storage: Cloudflare R2 for config packages
- Auth: GitHub OAuth (for publish/vote/comment only)

## Conventions
- TS: strict, no any, explicit return types on exports
- Rust: cargo clippy -- -D warnings, cargo fmt
- Commits: conventional (feat: fix: chore: docs:)
- Tests: vitest (TS), cargo test (Rust). Tests required for new features.
- Components: shadcn/ui. Do NOT install other component libraries.
- Styling: Tailwind only. No CSS modules, no styled-components.
- Imports: use @/ alias for apps/web/src/. Absolute imports only.

## Do NOT
- Add console.log to committed code
- Use `any` type in TypeScript
- Install packages without asking first
- Modify convex/schema.ts without considering migration impact
- Add new dependencies to packages/shared (keep it dependency-free)

## Commands
npm run dev          — turbo dev (all apps)
npm run build        — turbo build
npm run test         — turbo test
npm run lint         — turbo lint
npx convex dev       — convex dev server (run in apps/web/)
cargo tauri dev      — desktop dev (run in apps/desktop/)
```

---

## App-Level CLAUDE.md Files

### apps/web/CLAUDE.md

```markdown
# AgentHub Web

Next.js 15 App Router + Convex backend. Deployed on Vercel.

## Key directories
src/app/                — App Router pages and layouts
src/app/(browse)/       — Public browsing pages (no auth required)
src/app/(auth)/         — Auth-related pages (login callback)
src/app/(dashboard)/    — Authenticated user pages (publish, settings)
src/components/ui/      — shadcn/ui primitives (DO NOT EDIT)
src/components/         — Our custom components
src/lib/                — Utilities, hooks, types
convex/                 — Convex schema, functions, and helpers

## Convex patterns
- Queries: convex/configs.ts for read operations
- Mutations: convex/configs.ts for write operations
- Actions: convex/actions/ for external API calls (R2, OpenRouter)
- Use `useQuery` and `useMutation` from "convex/react" in components
- Convex functions are automatically typed — don't duplicate types

## Auth pattern
- GitHub OAuth via Convex's built-in auth or custom implementation
- useAuth() hook returns { isAuthenticated, user, login, logout }
- Protect write operations at the Convex function level, not just UI
- All Convex mutations that modify data must verify auth

## Component conventions
- Server Components by default. Add "use client" only when needed.
- Data fetching: useQuery() in client components, preload in server components
- Loading states: use Suspense + skeleton components
- Error states: use error.tsx boundary files
```

### apps/cli/CLAUDE.md

```markdown
# AgentHub CLI

Rust CLI tool distributed as a single binary. Uses clap for args, reqwest for HTTP,
tokio for async, tar + flate2 for package handling.

## Structure
src/main.rs              — Entry point, clap command definitions
src/commands/             — One file per command (search, install, publish, vote, login)
src/client.rs             — HTTP client for Convex HTTP API
src/config.rs             — Local config (~/.agenthub/)
src/compose.rs            — Config composition engine (merging CLAUDE.md files)
src/validation.rs         — Manifest and config validation
src/package.rs            — Tarball creation and extraction

## Patterns
- All commands are async (tokio)
- Error handling: use anyhow for internal, thiserror for public errors
- User-facing output: use colored crate for terminal colors
- Progress indicators: use indicatif crate for download progress bars
- HTTP: all requests go through client.rs, never raw reqwest in commands

## Local storage
~/.agenthub/
  credentials.json       — GitHub OAuth token
  config.toml            — CLI settings (default registry URL, etc.)
  cache/                 — Cached config metadata
  installed.json         — Manifest of installed configs
```

### apps/desktop/CLAUDE.md

```markdown
# ClaudeTerminal Desktop

Tauri 2.0 app. Rust backend for PTY management + system integration.
React frontend (shared Tailwind/shadcn setup with apps/web).

## Structure
src-tauri/src/main.rs    — Tauri app setup, command registration
src-tauri/src/pty.rs     — PTY spawn/management for claude CLI
src-tauri/src/session.rs — SQLite session storage
src-tauri/src/config.rs  — App settings (theme, font, keybindings)
src/                     — React frontend
src/components/          — UI components
src/components/Editor.tsx    — CodeMirror 6 input editor
src/components/Output.tsx    — Rich output renderer
src/components/Sidebar.tsx   — Session list + AgentHub browser
src/stores/              — Zustand stores for state management

## Tauri patterns
- Use #[tauri::command] for Rust → JS bridge functions
- Frontend calls invoke("command_name", { args }) to call Rust
- Events: use Tauri event system for PTY output streaming (Rust → JS)
- File system access: use Tauri's fs plugin, not raw Node fs

## PTY integration
- Spawn claude via portable-pty crate
- Stream stdout/stderr to frontend via Tauri events
- Send stdin from frontend via Tauri commands
- Handle resize events (frontend window resize → PTY resize)
```

---

## Hooks Configuration

### .claude/settings.json (project-level)

```json
{
  "hooks": {
    "preCommit": [
      {
        "command": "npm run lint",
        "description": "Lint all packages before commit"
      }
    ],
    "postEditFile": [
      {
        "pattern": "**/*.ts",
        "command": "npx prettier --write $FILE",
        "description": "Format TypeScript files after edit"
      },
      {
        "pattern": "**/*.tsx",
        "command": "npx prettier --write $FILE",
        "description": "Format TSX files after edit"
      },
      {
        "pattern": "**/*.rs",
        "command": "rustfmt $FILE",
        "description": "Format Rust files after edit"
      }
    ]
  }
}
```

---

## How to Use This Setup for Phase-by-Phase Development

### Starting a new Claude Code session for Phase 1 (Web):

```
cd C:\ClaudeTerminal
claude

> "I'm working on Phase 1 of the project. Read docs/PROPOSAL.md section 11
> (Development Phases, Phase 1) for the task list. Start with Week 1 tasks."
```

Claude will:
1. Read the root CLAUDE.md (automatic)
2. Read the proposal for Phase 1 details
3. Have full context on stack, conventions, and structure
4. Know not to install random packages or deviate from the plan

### Resuming work:

```
claude --resume

> "Continue where we left off. Check what's done and pick up the next task."
```

### Working on a specific app:

```
cd C:\ClaudeTerminal/apps/web
claude

> "I need to implement the config search page. Use Convex's built-in
> search index on the configs table."
```

Claude reads both root CLAUDE.md and apps/web/CLAUDE.md, getting full context.
