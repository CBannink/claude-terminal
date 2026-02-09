# Claude Terminal - Development Guide

## Project Overview
Desktop terminal app for Claude Code, built with Tauri 2 + React + xterm.js.

## Architecture
- **src-tauri/**: Rust backend (Tauri plugins, commands)
- **src/**: React frontend (TypeScript)
- **Terminal rendering**: xterm.js singleton via `src/lib/terminal-manager.ts`
- **PTY management**: `tauri-plugin-pty` via `src/hooks/usePty.ts`
- **State**: Zustand stores in `src/stores/`
- **Settings persistence**: `tauri-plugin-store`

## Key Commands
```bash
pnpm install          # Install dependencies
pnpm tauri dev        # Development mode with hot reload
pnpm tauri build      # Production build
npx tsc --noEmit      # Type check
```

## Code Conventions
- Use the `terminalManager` singleton for all xterm.js operations
- Hooks in `src/hooks/` wrap Tauri plugin APIs
- Components use Tailwind CSS classes (no CSS modules)
- Zustand stores are the single source of truth for UI state
- TypeScript strict mode enabled

## Important Files
- `src/lib/terminal-manager.ts` - xterm.js singleton (init, dispose, search, theme)
- `src/hooks/usePty.ts` - PTY spawn, data wiring, resize
- `src/hooks/useClaudeProcess.ts` - Claude lifecycle (start, stop, shell fallback)
- `src-tauri/src/commands/claude.rs` - CLI path resolution, session listing
- `src/lib/themes.ts` - Color themes
- `src/stores/terminalStore.ts` - Session state
- `src/stores/settingsStore.ts` - User preferences
