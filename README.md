# Claude Terminal

A native desktop terminal for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that fixes the core pain of CLI interfaces: no text selection, painful copy-paste, no rich UI.

Built with [Tauri 2](https://tauri.app/) + [xterm.js](https://xtermjs.org/) + React.

## Features

- Full terminal emulation via xterm.js (the same renderer VS Code uses)
- Native text selection and copy-paste
- WebGL-accelerated rendering with canvas fallback
- Custom title bar with minimize/maximize/close
- Session management: new, continue, resume previous sessions
- Built-in search (Ctrl+Shift+F)
- 6 built-in color themes (Dark, Light, Monokai, Dracula, Tokyo Night, Catppuccin)
- Configurable font, cursor style, scrollback
- Settings persist across restarts
- Falls back to a regular shell if Claude CLI is not installed

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and available in PATH
- Windows 10/11, macOS, or Linux

## Install

Download the latest release from the [Releases](https://github.com/yourusername/claude-terminal/releases) page.

### Windows
- **MSI installer**: `Claude Terminal_x.x.x_x64_en-US.msi`
- **NSIS installer**: `Claude Terminal_x.x.x_x64-setup.exe`

## Build from Source

### Prerequisites
- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- Visual Studio Build Tools (Windows)

### Steps

```bash
git clone https://github.com/yourusername/claude-terminal.git
cd claude-terminal
pnpm install
pnpm tauri dev     # Development mode
pnpm tauri build   # Production build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+F | Search terminal |
| Ctrl+, | Open settings |
| Ctrl+Shift+N | New session |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App framework | Tauri 2.0 |
| PTY management | tauri-plugin-pty + portable-pty |
| Terminal renderer | xterm.js 5.5 + addons |
| Frontend | React 19 + TypeScript + Tailwind CSS |
| State management | Zustand |
| Settings persistence | tauri-plugin-store |
| Build | Vite + pnpm |

## Architecture

Claude Terminal spawns Claude Code in a proper PTY (pseudo-terminal) using `tauri-plugin-pty`. All terminal rendering, ANSI parsing, text selection, and copy-paste are handled natively by xterm.js. No custom ANSI parser is needed.

## License

[MIT](LICENSE)
