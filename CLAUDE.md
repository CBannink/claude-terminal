# Claude Terminal - Development Guide

## MANDATORY: Automatic Code Review

**After making ANY code changes, you MUST automatically run a code review before finishing.** Do not wait to be asked. This is not optional.

### How to auto-review

After writing/editing code, immediately:

1. **Run `npx tsc --noEmit`** to verify TypeScript compiles
2. **Run `cargo check`** (via `cmd.exe /c "set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd C:\claude-terminal\src-tauri && cargo check"`) if any Rust files changed
3. **Launch a code review subagent** using the Task tool with `subagent_type=Explore`. Give it the full `agents/code-reviewer.md` prompt, the list of changed files, and the `git diff` output. It must read every changed file IN FULL and produce a Code Review Report with a verdict.
4. **If the review returns FAIL**: fix all Critical Issues, then re-run the review. Do NOT proceed to commit.
5. **If the review returns PASS or PASS WITH NOTES**: report the verdict to the user and proceed.

This workflow is **blocking** — never skip it, never summarize it away, never say "I'll review later". The review happens NOW, inline, every time.

---

## Project Overview

Desktop terminal app for Claude Code, built with Tauri 2 + React + xterm.js.
Repo: https://github.com/CBannink/claude-terminal
License: MIT | Version: 0.1.0 | Platform: Windows (primary), macOS, Linux

## Quick Start

```bash
cd C:\claude-terminal
pnpm install                              # Install JS dependencies
cmd.exe /c "set PATH=%USERPROFILE%\.cargo\bin;%PATH% && pnpm tauri dev"   # Dev mode
cmd.exe /c "set PATH=%USERPROFILE%\.cargo\bin;%PATH% && pnpm tauri build" # Production build
npx tsc --noEmit                          # TypeScript type check only
```

**IMPORTANT**: On this Windows machine, Rust is at `%USERPROFILE%\.cargo\bin` and not in the default PATH. Always prepend it when running cargo/tauri commands via `cmd.exe`.

## Architecture

```
src-tauri/          Rust backend
├── src/
│   ├── main.rs         Entry point (calls lib::run)
│   ├── lib.rs          Plugin registration + command handlers
│   └── commands/
│       ├── mod.rs      Module declarations
│       └── claude.rs   CLI path resolution + session listing
├── Cargo.toml          Rust dependencies
├── tauri.conf.json     Tauri config (window, bundle, build)
└── capabilities/
    └── default.json    Permission declarations for plugins

src/                React frontend (TypeScript)
├── main.tsx            React entry
├── App.tsx             Root component (settings load, keyboard shortcuts)
├── index.css           Tailwind CSS imports + base styles
├── components/
│   ├── Layout/
│   │   ├── AppShell.tsx        Main layout (titlebar → toolbar → terminal → statusbar)
│   │   ├── TitleBar.tsx        Custom frameless title bar with window controls
│   │   └── StatusBar.tsx       Session status, model, theme indicator
│   ├── Terminal/
│   │   ├── TerminalView.tsx    xterm.js mount, Claude auto-start, resize handling
│   │   └── TerminalToolbar.tsx Toolbar buttons (New, Continue, Resume, Shell, Search, Settings)
│   ├── Search/
│   │   └── SearchBar.tsx       Ctrl+Shift+F search overlay using xterm search addon
│   ├── Session/
│   │   └── SessionPicker.tsx   Resume dialog, reads ~/.claude/projects/ via Rust command
│   └── Settings/
│       ├── SettingsDialog.tsx   Settings modal (theme, font, cursor, scrollback, model)
│       └── ThemePicker.tsx      Visual theme grid selector
├── hooks/
│   ├── useClaudeProcess.ts     Spawns Claude or shell via PTY, manages lifecycle
│   ├── usePty.ts               PTY spawn/write/resize/kill via tauri-pty
│   ├── useSettings.ts          Load/save settings via tauri-plugin-store (debounced)
│   └── useWindowResize.ts      Debounced window resize → fit terminal
├── stores/
│   ├── terminalStore.ts        Session state (status, error, UI toggles) via Zustand
│   └── settingsStore.ts        User preferences via Zustand
├── lib/
│   ├── terminal-manager.ts     **SINGLETON** xterm.js instance (init, fit, search, theme)
│   ├── claude-cli.ts           Invoke Rust resolve_claude_path, build CLI args (validated)
│   ├── themes.ts               6 built-in themes with xterm color mappings
│   └── constants.ts            App name, version, store file, default env vars
└── types/
    ├── terminal.ts             SessionStatus, TerminalSession, PtyHandle
    └── settings.ts             ThemeName, TerminalTheme, AppSettings, DEFAULT_SETTINGS
```

## Key Design Decisions

1. **terminalManager singleton** (`src/lib/terminal-manager.ts`): xterm.js Terminal instance is created once and shared globally. All components import `terminalManager` directly instead of passing refs. This avoids the React hook re-render problem with multiple components needing the same Terminal instance.

2. **PTY via tauri-plugin-pty**: Claude Code is spawned in a real PTY, not via shell exec. This gives proper ANSI rendering, interactive prompts, and permission dialogs. The `tauri-pty` npm package wraps Tauri invoke calls.

3. **No custom ANSI parsing**: xterm.js handles ALL rendering. Raw PTY bytes go straight to `term.write()`. This means Claude's full TUI (colors, cursor movement, clearing) works out of the box.

4. **Settings via tauri-plugin-store**: Persisted as JSON in Tauri's app data dir. Loaded on startup, saved with 300ms debounce on change.

5. **Claude resolution**: Rust command checks known install paths first, then falls back to `where`/`which` PATH lookup. Frontend calls `invoke("resolve_claude_path")`.

6. **ThemeName union type**: Theme names are typed as `"dark" | "light" | "monokai" | "dracula" | "tokyoNight" | "catppuccin"` — invalid themes are caught at compile time.

## Data Flow

```
User types → xterm.onData → pty.write → Claude process (stdin)
Claude output (stdout) → pty.onData → term.write → xterm renders ANSI
Window resize → fitAddon.fit → term.onResize → pty.resize
```

## Plugin Permissions (capabilities/default.json)

- `core:default` - Tauri core
- `shell:allow-open` - Open URLs in browser
- `store:default` - Settings persistence
- `os:default` - Platform detection
- `pty:default` - PTY spawn/read/write/resize/kill

## Known Issues / Not Yet Tested

- App has NOT been runtime-tested yet (only build-verified)
- Session resume (`claude --resume <id>`) untested with real sessions
- WebGL addon may fail on some systems (has canvas fallback)
- `Ctrl+Shift+N` new session shortcut mentioned in README but not wired up in App.tsx
- Only Windows build verified; macOS/Linux CI added but untested
- Error recovery after PTY crash: toolbar buttons work but terminal state may be stale

## Phase 2 Roadmap (Deferred)

- Tab support (multiple Claude instances)
- CodeMirror input editor
- Rich output overlays (markdown, diffs, code blocks)
- Sidebar (session history, file browser)
- Split panes
- Plugin system

## Agent Review Pipeline

All code changes MUST pass through the review pipeline. The code review step is **automatic** — Claude Code runs it inline after every change without being asked.

### Pipeline Steps

| Step | Agent | When | How |
|------|-------|------|-----|
| **Code Review** | Senior/Staff Engineer | After writing code (automatic) | Subagent reads changed files + diff, produces verdict |
| **PR Review** | Principal Engineer | Before merging PR | `.\scripts\review-pipeline.ps1 pr-review` |
| **Self-Reflect** | Meta-Cognitive | After merging | `.\scripts\review-pipeline.ps1 self-reflect` |

### Agent Configs
- `agents/code-reviewer.md` — Code review checklist and output format
- `agents/pr-reviewer.md` — PR review checklist and output format
- `agents/self-reflect.md` — Post-merge reflection format

### Review Artifacts
- `.claude/reflections/reviews/` — Individual review reports
- `.claude/reflections/LEARNINGS.md` — Persistent knowledge (read before starting work)
- `.claude/reflections/METRICS.md` — Quality tracking

### Pipeline Rules
- NEVER skip the automatic code review after changes
- NEVER push to master without a passing code review
- NEVER merge a PR without PR reviewer approval
- If review FAILS → fix issues → re-run (do NOT bypass)

## Code Conventions

- **Rust commands**: All `#[tauri::command]` functions in `src-tauri/src/commands/`
- **React components**: Functional components only, no class components
- **State**: Zustand stores are the single source of truth for UI state
- **Styling**: Tailwind CSS utility classes inline, no CSS modules
- **TypeScript**: Strict mode, no `any`, types in `src/types/`
- **Imports**: Absolute from `src/`, relative within same directory level
- **Do NOT**: Push to master without review pipeline, use `any`, add `console.log`

## Dependencies (key versions)

| Package | Version | Purpose |
|---------|---------|---------|
| tauri | 2.10.x | App framework |
| tauri-plugin-pty | 0.2.1 | PTY management |
| @xterm/xterm | 5.5.0 | Terminal rendering |
| tauri-pty | 0.2.1 | JS bindings for PTY plugin |
| react | 19.x | UI framework |
| zustand | 5.x | State management |
| tailwindcss | 4.x | Styling |
| vite | 6.x | Build tool |
