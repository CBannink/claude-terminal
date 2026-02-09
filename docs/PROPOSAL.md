# ClaudeTerminal + AgentHub: Full Project Proposal

> An open-source desktop terminal for Claude Code with a community-driven agent configuration registry.

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [Product Overview](#2-product-overview)
3. [Product 1: ClaudeTerminal (Desktop App)](#3-product-1-claudeterminal-desktop-app)
4. [Product 2: AgentHub (Registry + Website)](#4-product-2-agenthub-registry--website)
5. [Technical Architecture](#5-technical-architecture)
6. [Infrastructure & Hosting](#6-infrastructure--hosting)
7. [Data Models & Storage](#7-data-models--storage)
8. [Config System Design](#8-config-system-design)
9. [Cost Analysis](#9-cost-analysis)
10. [Monetization & Sustainability](#10-monetization--sustainability)
11. [Development Phases](#11-development-phases)
12. [Risk Analysis](#12-risk-analysis)
13. [Agent Setup for Building This Project](#13-agent-setup-for-building-this-project)

---

## 1. Vision & Problem Statement

### The Problems

**Problem A: CLI UX is broken for AI-powered coding.**
- You cannot select text with a mouse and delete it in a standard terminal
- Copy-pasting multi-line code is fragile (paste bracketing issues, indentation loss)
- No rich rendering of markdown, code blocks, or diffs inline
- Scrollback is hard to navigate when Claude produces long outputs
- Session history is ephemeral and hard to search
- No visual affordances for tool calls, file edits, or permission prompts

**Problem B: Agent configuration is tribal knowledge.**
- Every team/developer creates their own CLAUDE.md, MCP configs, hooks from scratch
- No way to discover what works well for a given stack (React, Python ML, Rust, etc.)
- No quality signal — you can't tell if a config is good until you've tried it for days
- Configs rot — what worked for Claude 3.5 may not be optimal for Claude 4.5
- No composability — you can't layer "base TypeScript" + "React specific" + "team conventions"

### The Vision

Build two complementary open-source products:
1. **ClaudeTerminal** — A desktop app that wraps Claude Code CLI in a proper editor experience
2. **AgentHub** — A community registry where developers share, rate, and install agent configurations

Together: you download ClaudeTerminal, browse AgentHub for configs matching your stack, install them with one click, and start coding with a battle-tested setup in a polished UI.

---

## 2. Product Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClaudeTerminal                           │
│  ┌─────────────┐  ┌──────────────────────────────────────────┐  │
│  │             │  │  Rich output pane                        │  │
│  │  Session    │  │  - Markdown rendering                    │  │
│  │  Sidebar    │  │  - Syntax-highlighted code blocks        │  │
│  │             │  │  - Inline diffs                          │  │
│  │  - History  │  │  - Clickable file paths                  │  │
│  │  - Search   │  │  - Collapsible tool call details         │  │
│  │  - Configs  │  │                                          │  │
│  │  - AgentHub │  │                                          │  │
│  │    browse   │  ├──────────────────────────────────────────┤  │
│  │             │  │  CodeMirror 6 input editor               │  │
│  │             │  │  - Multi-line editing                    │  │
│  │             │  │  - File drag & drop                      │  │
│  │             │  │  - Slash command autocomplete            │  │
│  │             │  │  - History recall (up/down)              │  │
│  └─────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ IPC (Tauri commands)               │ stdin/stdout
         ▼                                    ▼
┌─────────────────┐                 ┌─────────────────────┐
│  Rust Backend   │                 │  claude CLI process  │
│  - PTY mgmt     │────spawns──────►│  (pseudo-terminal)   │
│  - Session DB   │                 └─────────────────────┘
│  - Config mgmt  │
│  - AgentHub API │──────────────►  AgentHub (Convex)
└─────────────────┘
```

---

## 3. Product 1: ClaudeTerminal (Desktop App)

### 3.1 Technology Choice: Tauri 2.0

| Consideration | Tauri | Electron | Native (Swift/C++) |
|---|---|---|---|
| Bundle size | ~15MB | ~200MB | ~5MB |
| RAM usage | ~80MB | ~300MB | ~50MB |
| Cross-platform | Yes | Yes | No (per-platform) |
| Dev speed | High (web UI) | High (web UI) | Low |
| Terminal integration | Excellent (Rust PTY) | Needs native module | Excellent |
| **Verdict** | **Best balance** | Too heavy | Too slow to ship |

### 3.2 Core Features (MVP)

**Input Editor:**
- CodeMirror 6 editor for composing prompts
- Full text selection, copy/paste, undo/redo (solving the core CLI pain)
- Multi-line editing with Shift+Enter for newlines, Enter to submit
- Drag-and-drop files to add as context (inserts file path or content)
- Slash command autocomplete (`/help`, `/compact`, `/review-pr`, etc.)
- Prompt history with Ctrl+Up/Down to recall previous inputs
- Syntax highlighting when writing code snippets in prompts

**Output Pane:**
- Parse Claude Code's terminal output (ANSI codes + structured data)
- Render markdown with proper formatting (headers, lists, bold, etc.)
- Syntax-highlighted code blocks with copy buttons
- Inline diffs with green/red highlighting for file edits
- Collapsible sections for tool calls (click to expand full details)
- Clickable file paths → open in system editor (VS Code, etc.)
- Permission prompts rendered as clear buttons (Allow / Deny / Always Allow)

**Session Management:**
- Sidebar with session history (stored in local SQLite via `rusqlite`)
- Search across all sessions (full-text search)
- Pin / star important sessions
- Resume sessions (reconnect to Claude Code's session system)
- Export session as markdown

**Settings:**
- Configure Claude Code path, API keys, default model
- Theme support (dark/light, custom themes)
- Font size, font family
- Keybinding customization
- Working directory management (quick-switch between projects)

### 3.3 Post-MVP Features

- Split panes (multiple Claude instances side by side)
- Integrated file browser (see what files Claude is editing)
- Real-time file diff viewer (watch edits as they happen)
- Voice input (whisper integration for dictating prompts)
- Plugin system (community extensions)
- Team features (share sessions, collaborative debugging)

### 3.4 Technical Details: PTY Integration

```rust
// Simplified PTY spawn for Claude Code
use portable_pty::{CommandBuilder, PtySize, native_pty_system};

fn spawn_claude(working_dir: &str) -> Result<PtyPair> {
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(PtySize {
        rows: 50,
        cols: 120,
        pixel_width: 0,
        pixel_height: 0,
    })?;

    let mut cmd = CommandBuilder::new("claude");
    cmd.cwd(working_dir);
    // Use --output-format stream-json for structured output when available
    // Otherwise parse ANSI output

    let child = pair.slave.spawn_command(cmd)?;
    Ok(pair)
}
```

**Output parsing strategy:**
1. Primary: Use Claude Code's `--output-format stream-json` (if available) for structured output
2. Fallback: Parse ANSI escape codes from raw terminal output using `vte` crate
3. Detect tool calls, file edits, permission prompts from output patterns
4. Render parsed output in the webview using React components

### 3.5 Local Storage

All local data stored in `~/.claudeterminal/`:

```
~/.claudeterminal/
├── config.toml              # App settings
├── sessions.db              # SQLite - session history, metadata
├── themes/                  # Custom themes
│   └── custom-dark.json
├── keybindings.json         # Custom keybindings
└── cache/
    └── agenthub/            # Cached registry data
```

**SQLite Schema (sessions.db):**
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    working_dir TEXT,
    claude_session_id TEXT,    -- maps to Claude Code's internal session
    created_at DATETIME,
    updated_at DATETIME,
    pinned BOOLEAN DEFAULT FALSE,
    tags TEXT                   -- JSON array
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT REFERENCES sessions(id),
    role TEXT,                  -- 'user' | 'assistant' | 'system'
    content TEXT,               -- raw content
    rendered_html TEXT,         -- pre-rendered HTML for fast display
    tool_calls TEXT,            -- JSON array of tool calls
    timestamp DATETIME
);

CREATE VIRTUAL TABLE messages_fts USING fts5(content, session_id);
```

---

## 4. Product 2: AgentHub (Registry + Website)

### 4.1 What is an "Agent Config"?

An agent config is a portable, composable package that contains everything needed to configure Claude Code for a specific use case:

```
my-react-agent/
├── manifest.json            # Metadata, dependencies, compatibility
├── CLAUDE.md                # The main agent instructions
├── mcp-servers.json         # MCP server configurations
├── hooks.json               # Pre/post hooks for tool calls
├── settings.json            # Claude Code settings overrides
├── templates/               # Optional template files
│   └── component.tsx.hbs    # Template for generating components
└── README.md                # Human-readable docs
```

**manifest.json example:**
```json
{
  "name": "react-typescript-pro",
  "version": "2.1.0",
  "description": "Production-grade React + TypeScript agent config with testing, accessibility, and performance best practices",
  "author": "jane-dev",
  "license": "MIT",
  "category": "web-frontend",
  "tags": ["react", "typescript", "testing", "a11y"],
  "compatibleWith": {
    "claudeCode": ">=1.0.0",
    "models": ["claude-sonnet-4-5", "claude-opus-4-6"]
  },
  "composableWith": ["base-typescript", "eslint-strict"],
  "conflicts": ["react-simple"],
  "installLocation": "project"
}
```

### 4.2 Config Installation & Composition

**Install locations:**
- `global` → `~/.claude/` (applies to all projects)
- `project` → `.claude/` in project root (project-specific)

**Composition model (layered):**
```
Layer 0: Claude Code defaults
Layer 1: Global configs (~/.claude/)
Layer 2: Project base config (.claude/)
Layer 3: Project stack-specific configs (.claude/agents/)
```

When composing, CLAUDE.md files are concatenated with clear section headers:
```markdown
<!-- [AgentHub: base-typescript v1.2.0] -->
## Base TypeScript Conventions
...

<!-- [AgentHub: react-typescript-pro v2.1.0] -->
## React-Specific Conventions
...

<!-- [Project-specific overrides] -->
## Our Team Conventions
...
```

MCP servers, hooks, and settings are merged (later layers override earlier ones).

**CLI commands:**
```bash
# Search the registry
agenthub search "react typescript"

# Install to current project
agenthub install react-typescript-pro

# Install globally
agenthub install base-typescript --global

# List installed configs
agenthub list

# Update all configs
agenthub update

# Publish your config
agenthub publish ./my-config/

# Vote on a config
agenthub vote react-typescript-pro up
```

### 4.3 Website Features

**Browse & Discovery:**
- Category-based browsing (Web, Backend, Data Science, DevOps, Mobile, etc.)
- Tag-based filtering (language, framework, tool)
- Full-text search across config names, descriptions, and CLAUDE.md content
- "Trending" (most installs in last 7 days)
- "Top Rated" (highest vote score per category)
- "New" (recently published)

**Config Detail Page:**
- README rendering
- Full CLAUDE.md preview
- Install count, vote score, star count
- Version history with changelogs
- Compatibility badges
- "Try it" button (copies install command)
- Comments / discussions
- Author profile link
- "Fork" button (create your own version)

**User Features:**
- GitHub OAuth login
- Profile page with published configs
- Saved/bookmarked configs
- Install analytics (how many people use your config)
- Notification when a config you use gets updated

**Quality & Trust:**
- Verified publisher badges (linked GitHub account with history)
- Automated validation on publish (lint CLAUDE.md, validate JSON schemas)
- Community moderation (flag inappropriate content)
- Curated "Staff Picks" collection
- Compatibility testing (automated: does the config parse correctly?)

### 4.4 Voting & Ranking System

**Vote mechanics:**
- Authenticated users only (GitHub OAuth)
- One vote per user per config (+1 or -1)
- Can change vote at any time
- Score = upvotes - downvotes (Wilson score interval for ranking)

**Ranking algorithm:**
```
Wilson Score Lower Bound (95% confidence):

score = (p + z²/2n - z√(p(1-p)/n + z²/4n²)) / (1 + z²/n)

where:
  p = upvotes / total_votes
  n = total_votes
  z = 1.96 (95% confidence)
```

This prevents a config with 2 upvotes / 0 downvotes from ranking above one with 500 upvotes / 50 downvotes.

**Additional signals (weighted):**
- Install count (log-scaled)
- Retention rate (% of installers who keep it after 7 days — requires opt-in telemetry)
- Recency (decay factor for old configs)
- Author reputation (based on cumulative votes across all their configs)

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         User's Machine                               │
│                                                                      │
│  ┌─────────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ ClaudeTerminal   │◄──►│ claude CLI    │    │ agenthub CLI      │   │
│  │ (Tauri app)      │    │ (spawned PTY) │    │ (Rust binary)     │   │
│  └────────┬─────────┘    └──────────────┘    └────────┬──────────┘   │
│           │                                           │              │
│           │  HTTPS                                    │ HTTPS        │
└───────────┼───────────────────────────────────────────┼──────────────┘
            │                                           │
            ▼                                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Cloud Infrastructure                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Vercel                                                        │  │
│  │  ┌──────────────────────────┐                                  │  │
│  │  │  Next.js Frontend        │  agenthub.dev                    │  │
│  │  │  - Browse configs        │                                  │  │
│  │  │  - User profiles         │                                  │  │
│  │  │  - Voting UI             │                                  │  │
│  │  │  - Config detail pages   │                                  │  │
│  │  └────────────┬─────────────┘                                  │  │
│  └───────────────┼────────────────────────────────────────────────┘  │
│                  │                                                    │
│                  ▼                                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Convex (Backend-as-a-Service)                                 │  │
│  │                                                                │  │
│  │  Functions:                     Database:                      │  │
│  │  - configs.publish()            - configs table                │  │
│  │  - configs.search()             - users table                  │  │
│  │  - configs.install()            - votes table                  │  │
│  │  - votes.cast()                 - comments table               │  │
│  │  - votes.getScore()             - installs table               │  │
│  │  - users.authenticate()         - categories table             │  │
│  │  - search.semantic()                                           │  │
│  │                                                                │  │
│  │  Real-time subscriptions:                                      │  │
│  │  - Live vote counts                                            │  │
│  │  - Live install counts                                         │  │
│  │  - New config notifications                                    │  │
│  └───────────────┬────────────────────────────────────────────────┘  │
│                  │                                                    │
│                  ▼                                                    │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐    │
│  │  Cloudflare R2      │    │  Pinecone (Vector DB)            │    │
│  │                     │    │                                  │    │
│  │  Config packages:   │    │  Semantic search index:          │    │
│  │  - Tarball storage  │    │  - Config embeddings             │    │
│  │  - Version archives │    │  - CLAUDE.md content vectors     │    │
│  │  - ~$0.015/GB/mo   │    │  - "Find configs similar to..."  │    │
│  └─────────────────────┘    └──────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  OpenRouter (via Convex functions)                             │  │
│  │                                                                │  │
│  │  Used for:                                                     │  │
│  │  - Auto-generating config descriptions from CLAUDE.md         │  │
│  │  - Config quality scoring (automated review)                   │  │
│  │  - Semantic search query expansion                             │  │
│  │  - "Suggest improvements" feature for configs                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Why These Specific Services

**Convex (Primary Backend):**
- Real-time by default — vote counts, install counters update live on the website
- Built-in database — no separate Postgres to manage
- Serverless functions — no servers to maintain
- TypeScript end-to-end — type-safe from DB to frontend
- Built-in file storage — small files (manifests, metadata)
- Built-in scheduling — for periodic tasks (recalculate rankings, etc.)
- Free tier: 1M function calls, 1GB storage — more than enough for launch
- You already have an account

**Vercel (Frontend):**
- Best-in-class Next.js hosting
- Edge functions for API routes that need low latency
- Built-in analytics
- Preview deployments for PRs
- Free tier generous for open source
- You already have an account

**Cloudflare R2 (Bulk Storage):**
- S3-compatible API (easy to integrate)
- Zero egress fees (critical — config downloads are pure egress)
- $0.015/GB/month storage
- Global CDN built-in
- Better economics than S3 for download-heavy workloads

**Pinecone (Vector Search):**
- Semantic search: "find me a config for building REST APIs with Express"
- Similar config discovery: "configs like this one"
- Free tier: 1 index, 100K vectors — sufficient for thousands of configs
- Better than building vector search from scratch

**OpenRouter (AI Features):**
- Multi-model access (use cheap models for simple tasks, powerful for complex)
- Auto-generate descriptions from CLAUDE.md content
- Automated config quality review on publish
- Power the "suggest improvements" feature
- You already have an account — no new vendor

**Railway (Reserved for future use):**
- Background workers if needed (heavy processing, webhook handling)
- Could host a dedicated search service if Pinecone becomes limiting
- Good for any stateful services that don't fit Convex's model
- You already have an account

---

## 6. Infrastructure & Hosting (Detailed)

### 6.1 Service Map

| Service | Role | Tier | Monthly Cost (Launch) | Monthly Cost (Scale: 10K users) |
|---------|------|------|----------------------|-------------------------------|
| Vercel | Frontend hosting | Free / Pro ($20) | $0 - $20 | $20 |
| Convex | Backend + DB | Free / Pro ($25) | $0 - $25 | $25 - $50 |
| Cloudflare R2 | Config storage | Pay-as-you-go | $0 - $1 | $5 - $15 |
| Pinecone | Vector search | Free / Starter ($70) | $0 | $0 - $70 |
| OpenRouter | AI features | Pay-per-token | $2 - $5 | $20 - $50 |
| Railway | Workers (if needed) | Hobby ($5) | $0 | $5 |
| Domain | agenthub.dev | Annual | ~$1/mo | ~$1/mo |
| GitHub | Code + CI/CD | Free (OSS) | $0 | $0 |
| **Total** | | | **$3 - $52** | **$51 - $211** |

### 6.2 Cost Breakdown Details

**Cloudflare R2 pricing:**
- Storage: $0.015/GB/month
- Class A operations (writes): $4.50/million
- Class B operations (reads): $0.36/million
- Egress: FREE (this is the killer feature)
- Estimate: 1000 configs × 50KB avg = 50MB → basically free at launch
- At scale: 10,000 configs × 100KB = 1GB → $0.015/mo storage, reads free

**OpenRouter usage estimate:**
- Config description generation: ~500 tokens per config → ~$0.001 per publish
- Quality scoring: ~2000 tokens per config → ~$0.005 per publish
- Search query expansion: ~200 tokens per query → ~$0.0005 per search
- Using Haiku-class models for most tasks to minimize cost
- At launch: ~$2-5/mo | At scale: ~$20-50/mo

**Convex pricing (Pro tier):**
- 25M function calls/month included
- 50GB database storage
- 50GB file storage
- This is massively more than needed even at 10K users

### 6.3 Domain & Branding Options

Preferred domains (check availability):
- `agenthub.dev`
- `agenthub.sh`
- `claudeconfigs.com`
- `agentregistry.dev`

The desktop app name: **ClaudeTerminal** or **CTerm** for short.

---

## 7. Data Models & Storage

### 7.1 Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users ──────────────────────────────────────────────
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.string(),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    reputation: v.number(),          // cumulative score
    isVerified: v.boolean(),         // verified publisher
    isModerator: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_githubId", ["githubId"])
    .index("by_username", ["username"])
    .index("by_reputation", ["reputation"]),

  // ── Configs ────────────────────────────────────────────
  configs: defineTable({
    name: v.string(),                // unique slug: "react-typescript-pro"
    displayName: v.string(),         // "React TypeScript Pro"
    description: v.string(),         // short description
    longDescription: v.optional(v.string()),  // generated from CLAUDE.md
    authorId: v.id("users"),
    category: v.string(),            // "web-frontend", "backend", etc.
    tags: v.array(v.string()),
    license: v.string(),
    repositoryUrl: v.optional(v.string()),

    // Latest version info
    currentVersion: v.string(),      // semver "2.1.0"
    claudeMdPreview: v.string(),     // first 500 chars of CLAUDE.md
    claudeMdFull: v.string(),        // full CLAUDE.md content

    // Package location
    packageStorageKey: v.string(),   // R2 key for the tarball
    packageSize: v.number(),         // bytes

    // Compatibility
    minClaudeCodeVersion: v.optional(v.string()),
    compatibleModels: v.array(v.string()),
    composableWith: v.array(v.string()),  // other config names
    conflictsWith: v.array(v.string()),

    // Stats (denormalized for fast reads)
    upvotes: v.number(),
    downvotes: v.number(),
    wilsonScore: v.number(),         // pre-computed ranking score
    installCount: v.number(),
    weeklyInstalls: v.number(),

    // Quality
    qualityScore: v.optional(v.number()),  // AI-generated 0-100
    isStaffPick: v.boolean(),
    isFeatured: v.boolean(),

    // Status
    status: v.string(),              // "published", "draft", "deprecated", "removed"
    publishedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_wilson_score", ["category", "wilsonScore"])
    .index("by_weekly_installs", ["weeklyInstalls"])
    .index("by_published", ["publishedAt"])
    .searchIndex("search_configs", {
      searchField: "description",
      filterFields: ["category", "status", "tags"],
    }),

  // ── Config Versions ────────────────────────────────────
  configVersions: defineTable({
    configId: v.id("configs"),
    version: v.string(),             // "2.1.0"
    changelog: v.string(),
    packageStorageKey: v.string(),   // R2 key for this version's tarball
    packageSize: v.number(),
    claudeMdContent: v.string(),
    publishedAt: v.number(),
  })
    .index("by_config", ["configId", "version"])
    .index("by_config_date", ["configId", "publishedAt"]),

  // ── Votes ──────────────────────────────────────────────
  votes: defineTable({
    configId: v.id("configs"),
    userId: v.id("users"),
    value: v.number(),               // +1 or -1
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_config_user", ["configId", "userId"])
    .index("by_config", ["configId"])
    .index("by_user", ["userId"]),

  // ── Installs (analytics) ───────────────────────────────
  installs: defineTable({
    configId: v.id("configs"),
    userId: v.optional(v.id("users")),  // null for anonymous
    anonymousId: v.optional(v.string()), // hashed machine ID
    version: v.string(),
    source: v.string(),              // "cli", "website", "claudeterminal"
    installedAt: v.number(),
    uninstalledAt: v.optional(v.number()),
  })
    .index("by_config", ["configId"])
    .index("by_config_date", ["configId", "installedAt"])
    .index("by_user", ["userId"]),

  // ── Comments ───────────────────────────────────────────
  comments: defineTable({
    configId: v.id("configs"),
    userId: v.id("users"),
    parentId: v.optional(v.id("comments")),  // for threading
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
  })
    .index("by_config", ["configId", "createdAt"])
    .index("by_user", ["userId"]),

  // ── Categories ─────────────────────────────────────────
  categories: defineTable({
    slug: v.string(),                // "web-frontend"
    name: v.string(),                // "Web Frontend"
    description: v.string(),
    icon: v.string(),                // emoji or icon name
    configCount: v.number(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sort", ["sortOrder"]),

  // ── Reports (moderation) ───────────────────────────────
  reports: defineTable({
    configId: v.id("configs"),
    reporterId: v.id("users"),
    reason: v.string(),              // "spam", "malicious", "inappropriate", "other"
    details: v.string(),
    status: v.string(),              // "pending", "reviewed", "resolved"
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"]),
});
```

### 7.2 Cloudflare R2 Storage Structure

```
agenthub-packages/
├── configs/
│   ├── react-typescript-pro/
│   │   ├── 2.1.0.tar.gz        # Versioned package
│   │   ├── 2.0.0.tar.gz
│   │   └── latest.tar.gz       # Symlink/copy of latest
│   ├── base-typescript/
│   │   └── 1.2.0.tar.gz
│   └── python-ml-agent/
│       └── 1.0.0.tar.gz
└── avatars/                     # User avatars (optional)
```

**Package format (.tar.gz contents):**
```
react-typescript-pro-2.1.0/
├── manifest.json
├── CLAUDE.md
├── mcp-servers.json     (optional)
├── hooks.json           (optional)
├── settings.json        (optional)
├── templates/           (optional)
└── README.md
```

### 7.3 Pinecone Index

```
Index: "agenthub-configs"
Dimension: 1536 (text-embedding-3-small)
Metric: cosine

Vector metadata:
{
  configId: string,
  name: string,
  category: string,
  tags: string[],
  description: string,
  version: string
}

Embedding sources per config:
1. Description text
2. CLAUDE.md content (chunked if >8K tokens)
3. Tags + category (concatenated)
```

---

## 8. Config System Design

### 8.1 Config Lifecycle

```
Author creates config locally
        │
        ▼
  agenthub publish ./my-config/
        │
        ├── 1. Validate manifest.json schema
        ├── 2. Validate CLAUDE.md exists and is non-empty
        ├── 3. Lint JSON files (mcp-servers, hooks, settings)
        ├── 4. Check name availability (or version bump)
        ├── 5. Generate tarball
        ├── 6. Upload to R2
        ├── 7. Generate embedding → Pinecone
        ├── 8. AI quality review → quality score (via OpenRouter)
        ├── 9. AI description generation (via OpenRouter)
        └── 10. Create/update Convex record
                │
                ▼
        Config is live on AgentHub
                │
        ┌───────┴────────┐
        ▼                ▼
  Users browse          Users install
  on website            via CLI
        │                │
        ▼                ▼
  Vote/Comment     agenthub install <name>
                         │
                         ├── 1. Fetch manifest from Convex
                         ├── 2. Check compatibility
                         ├── 3. Check conflicts with installed configs
                         ├── 4. Download tarball from R2
                         ├── 5. Extract to .claude/ or ~/.claude/
                         ├── 6. Merge CLAUDE.md (if composing)
                         ├── 7. Record install event
                         └── 8. Done
```

### 8.2 Config Validation Rules

On publish, configs are validated:

```
REQUIRED:
  ✓ manifest.json exists and matches schema
  ✓ manifest.name matches [a-z0-9-]+ (3-50 chars)
  ✓ manifest.version is valid semver
  ✓ manifest.description exists (10-200 chars)
  ✓ manifest.license is a valid SPDX identifier
  ✓ manifest.category is one of the predefined categories
  ✓ CLAUDE.md exists and is 100-50000 chars
  ✓ Total package size < 1MB

OPTIONAL VALIDATION:
  ✓ mcp-servers.json matches MCP config schema
  ✓ hooks.json matches Claude Code hooks schema
  ✓ settings.json matches Claude Code settings schema
  ✓ No secrets detected (API keys, tokens, passwords)

AI QUALITY REVIEW (informational, doesn't block publish):
  - Clarity of instructions
  - Specificity (not too vague)
  - No contradictions
  - Appropriate scope
  - Score 0-100 displayed on config page
```

### 8.3 Composition Engine

When multiple configs are installed, the CLI merges them:

**CLAUDE.md merging:**
```markdown
# Agent Configuration
<!-- Composed by AgentHub. Do not edit this section manually. -->
<!-- To modify, edit individual configs or add overrides below. -->

<!-- ═══ [base-typescript v1.2.0] ═══ -->
## TypeScript Conventions
- Use strict mode
- Prefer const over let
- Use explicit return types on public functions
...

<!-- ═══ [react-typescript-pro v2.1.0] ═══ -->
## React Conventions
- Use functional components with hooks
- Prefer named exports
...

<!-- ═══ [User Overrides] ═══ -->
<!-- Add your project-specific overrides below this line -->
```

**MCP servers merging:**
- Union of all server configurations
- If two configs define the same server name, later layer wins (with warning)

**Hooks merging:**
- Hooks are additive (all hooks from all configs run)
- Order: global configs first, then project configs, in install order

**Settings merging:**
- Deep merge, later layers override earlier values

---

## 9. Cost Analysis

### 9.1 Development Costs

**Assuming you (and Claude Code) are building this:**

| Phase | Duration | External Costs |
|-------|----------|----------------|
| Phase 1: AgentHub MVP | 3-4 weeks | $0 (your time + Claude API) |
| Phase 2: CLI Tool | 1-2 weeks | $0 |
| Phase 3: ClaudeTerminal MVP | 4-6 weeks | $0 + Apple Developer ($99/yr for Mac signing) |
| Phase 4: Polish + Launch | 2-3 weeks | ~$50 (domain, minor infra) |
| **Total** | **10-15 weeks** | **~$150 first year** |

### 9.2 Operational Costs (Monthly)

**At Launch (0-100 users):**

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $0 | Free tier (100GB bandwidth) |
| Convex | $0 | Free tier (1M function calls) |
| Cloudflare R2 | $0 | Free tier (10GB storage, 10M reads) |
| Pinecone | $0 | Free tier (100K vectors) |
| OpenRouter | $3-5 | Quality reviews + descriptions |
| Domain | $1 | Annual amortized |
| **Total** | **$4-6/mo** | |

**At Traction (100-1,000 users):**

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $0-20 | May need Pro for bandwidth |
| Convex | $0-25 | Likely still free tier |
| Cloudflare R2 | $1-3 | Hundreds of configs, thousands of downloads |
| Pinecone | $0 | Still within free tier |
| OpenRouter | $10-20 | More publishes, more searches |
| **Total** | **$12-69/mo** | |

**At Scale (1,000-10,000 users):**

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $20 | Pro tier |
| Convex | $25-50 | Pro tier |
| Cloudflare R2 | $5-15 | Large catalog, heavy downloads |
| Pinecone | $0-70 | May need Starter for performance |
| OpenRouter | $30-50 | Heavy AI feature usage |
| Railway | $5-10 | Background workers |
| **Total** | **$85-215/mo** | |

### 9.3 Break-Even Analysis

If the project remains pure open-source with no revenue:
- At launch: ~$50-70/year — trivially self-fundable
- At 1K users: ~$150-800/year — still manageable for a side project
- At 10K users: ~$1,000-2,500/year — needs sponsorship or light monetization

---

## 10. Monetization & Sustainability

### 10.1 Open Source Sustainability Model

The project is open source. Revenue covers infrastructure costs and incentivizes quality.

**Tier 1: Free forever (covers 95% of users)**
- Browse all configs
- Install unlimited configs
- Publish configs
- Vote and comment
- Use ClaudeTerminal

**Tier 2: AgentHub Pro ($5/month, optional)**
- Priority support
- Private configs (not listed publicly)
- Team workspaces (shared configs within an org)
- Advanced analytics on your published configs
- Early access to new features
- "Pro" badge on profile

**Tier 3: AgentHub Team ($15/user/month)**
- Everything in Pro
- Org-wide config management
- Private registry (host internal configs)
- SSO / SAML
- Audit logs
- Priority in search results for org-published configs

### 10.2 Other Revenue Streams

- **GitHub Sponsors** — for the open-source project itself
- **Sponsored configs** — companies pay to feature their tooling configs (clearly labeled)
- **Consulting** — help teams build custom agent configurations (your expertise)

### 10.3 Revenue Targets

| Stage | Users | MRR Target | Source |
|-------|-------|------------|--------|
| Launch | 100 | $0 | Self-funded |
| Traction | 1,000 | $100-200 | GitHub Sponsors |
| Growth | 5,000 | $500-1,000 | Pro subscriptions + Sponsors |
| Scale | 10,000+ | $2,000+ | Pro + Team + Sponsored |

---

## 11. Development Phases

### Phase 1: AgentHub Backend + Website (Weeks 1-4)

**Week 1: Foundation**
- [ ] Initialize monorepo (Turborepo: `apps/web`, `apps/cli`, `packages/shared`)
- [ ] Set up Convex project with schema
- [ ] Implement core Convex functions: configs CRUD, user auth (GitHub OAuth)
- [ ] Set up Cloudflare R2 bucket with presigned URL generation
- [ ] Set up Pinecone index

**Week 2: Publishing Pipeline**
- [ ] Implement config validation logic (shared package)
- [ ] Build publish flow: validate → upload to R2 → create Convex record
- [ ] Implement OpenRouter integration for quality scoring
- [ ] Implement embedding generation → Pinecone upsert
- [ ] Build versioning system

**Week 3: Website MVP**
- [ ] Next.js app with Convex React client
- [ ] Home page: featured, trending, new configs
- [ ] Category browsing pages
- [ ] Config detail page with CLAUDE.md preview
- [ ] Search (Convex full-text + Pinecone semantic)
- [ ] GitHub OAuth login flow

**Week 4: Voting + Polish**
- [ ] Implement voting system (Convex mutations + optimistic updates)
- [ ] Wilson score computation (Convex scheduled function)
- [ ] Comments system
- [ ] User profile pages
- [ ] Responsive design pass
- [ ] Deploy to Vercel

**Phase 1 Deliverable:** A working website where you can browse, search, and view configs. Auth and voting work. No CLI yet (publish via web upload form).

### Phase 2: AgentHub CLI (Weeks 5-6)

**Week 5: Core CLI**
- [ ] Rust CLI project setup with `clap` for argument parsing
- [ ] `agenthub login` — OAuth device flow with GitHub
- [ ] `agenthub search <query>` — search configs from Convex API
- [ ] `agenthub install <name>` — download from R2, extract, install
- [ ] `agenthub list` — show installed configs
- [ ] `agenthub uninstall <name>` — remove config files

**Week 6: Publishing + Distribution**
- [ ] `agenthub publish <dir>` — validate, pack, upload
- [ ] `agenthub vote <name> up/down` — cast vote
- [ ] `agenthub update` — update all installed configs
- [ ] Config composition engine (merge CLAUDE.md, MCP, hooks, settings)
- [ ] Build binaries for Windows, macOS, Linux (GitHub Actions + cross-compilation)
- [ ] Install script (`curl -fsSL agenthub.dev/install | sh`)

**Phase 2 Deliverable:** A working CLI that can search, install, publish, and vote. Distributed as pre-built binaries.

### Phase 3: ClaudeTerminal Desktop App (Weeks 7-12)

**Week 7-8: Tauri Shell**
- [ ] Tauri 2.0 project setup
- [ ] PTY spawning of `claude` CLI
- [ ] Basic stdin/stdout piping (raw terminal mode)
- [ ] Simple input area (textarea, not CodeMirror yet)
- [ ] Basic output rendering (just text, no rich formatting yet)
- [ ] Window management (resize, minimize, etc.)

**Week 9-10: Rich Editor Experience**
- [ ] Replace textarea with CodeMirror 6
- [ ] Implement input features: history, autocomplete, multi-line
- [ ] ANSI parser for output (using `vte` crate or JavaScript lib)
- [ ] Markdown rendering in output pane
- [ ] Syntax highlighted code blocks
- [ ] Clickable file paths
- [ ] Permission prompt buttons (Allow / Deny)

**Week 11: Session Management**
- [ ] SQLite integration for local session storage
- [ ] Session sidebar (list, search, pin)
- [ ] Session resume
- [ ] Settings panel (theme, font, keybindings)
- [ ] Drag-and-drop file support

**Week 12: AgentHub Integration**
- [ ] Browse AgentHub from within ClaudeTerminal sidebar
- [ ] One-click install from the app
- [ ] Show active configs for current project
- [ ] Auto-update notifications for installed configs

**Phase 3 Deliverable:** A working desktop app that runs Claude Code with a rich UI and AgentHub integration.

### Phase 4: Launch Prep (Weeks 13-15)

- [ ] Seed registry with 30+ high-quality configs (write them yourself)
- [ ] Write documentation site (using Starlight or Docusaurus)
- [ ] Create demo video / GIF
- [ ] Set up GitHub org, transfer repos
- [ ] Write contributing guide
- [ ] Beta test with 10-20 users
- [ ] Fix critical bugs
- [ ] Launch on Hacker News, Reddit r/programming, Twitter/X
- [ ] Submit to Product Hunt

---

## 12. Risk Analysis

### 12.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Claude Code changes output format | High | High | Abstract the parser, version the integration |
| Tauri PTY issues on Windows | Medium | High | Fall back to conpty, test early on Windows |
| Convex limitations at scale | Low | Medium | Data model is simple; can migrate if needed |
| Pinecone embedding drift | Low | Low | Re-embed periodically, model is stable |
| R2 outage affects installs | Low | Medium | Cache recent downloads locally |

### 12.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Anthropic ships their own GUI | High | Critical | Focus on AgentHub (registry) — they won't build that |
| Low community adoption | Medium | High | Seed with quality configs, market aggressively |
| Malicious configs published | Medium | Medium | Validation, AI review, community moderation |
| Configs become outdated quickly | High | Medium | Version system, automated compatibility testing |
| Competition (similar registries) | Low | Medium | First-mover advantage, focus on quality |

### 12.3 Key Insight

**The desktop app is high-risk** (Anthropic will likely improve the CLI/GUI themselves). **The registry is low-risk** and has no competition. Prioritize the registry, and build the desktop app only if there's clear demand.

---

## 13. Agent Setup for Building This Project

### 13.1 Repository Structure

```
ClaudeTerminal/
├── CLAUDE.md                    # Root agent config
├── turbo.json                   # Turborepo config
├── package.json                 # Root workspace
├── apps/
│   ├── web/                     # Next.js website (AgentHub)
│   │   ├── CLAUDE.md            # Web-specific agent instructions
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   ├── components/      # React components
│   │   │   └── lib/             # Utilities
│   │   └── convex/              # Convex functions + schema
│   │       ├── schema.ts
│   │       ├── configs.ts
│   │       ├── votes.ts
│   │       ├── users.ts
│   │       └── search.ts
│   ├── desktop/                 # Tauri app (ClaudeTerminal)
│   │   ├── CLAUDE.md
│   │   ├── src-tauri/           # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── pty.rs       # PTY management
│   │   │   │   ├── session.rs   # Session storage
│   │   │   │   └── config.rs    # App configuration
│   │   │   └── Cargo.toml
│   │   └── src/                 # Frontend (React)
│   │       ├── App.tsx
│   │       ├── components/
│   │       └── stores/
│   └── cli/                     # AgentHub CLI (Rust)
│       ├── CLAUDE.md
│       ├── src/
│       │   ├── main.rs
│       │   ├── commands/        # search, install, publish, vote
│       │   ├── client.rs        # HTTP client for Convex API
│       │   ├── config.rs        # Local config management
│       │   └── compose.rs       # Config composition engine
│       └── Cargo.toml
├── packages/
│   └── shared/                  # Shared TypeScript utilities
│       ├── src/
│       │   ├── validation.ts    # Config validation logic
│       │   ├── types.ts         # Shared types
│       │   └── constants.ts     # Categories, limits, etc.
│       └── package.json
└── docs/
    ├── PROPOSAL.md              # This document
    ├── ARCHITECTURE.md          # Technical architecture
    └── CONTRIBUTING.md          # How to contribute
```

### 13.2 Root CLAUDE.md

```markdown
# ClaudeTerminal + AgentHub

## Project Overview
A monorepo containing: (1) AgentHub — a community registry for Claude Code
agent configurations, and (2) ClaudeTerminal — a desktop terminal app for
Claude Code.

## Monorepo Structure
- `apps/web` — Next.js website (AgentHub registry), deployed on Vercel
- `apps/desktop` — Tauri 2.0 desktop app (ClaudeTerminal)
- `apps/cli` — Rust CLI tool for AgentHub
- `packages/shared` — Shared TypeScript utilities

## Conventions
- TypeScript: strict mode, explicit return types on exported functions
- Rust: clippy clean, rustfmt formatted
- Commits: conventional commits (feat:, fix:, chore:, docs:)
- Testing: all new features need tests. Use vitest for TS, cargo test for Rust.
- No console.log in production code. Use proper logging.

## Infrastructure
- Backend: Convex (convex.dev)
- Frontend: Vercel
- Storage: Cloudflare R2
- Vector search: Pinecone
- AI features: OpenRouter

## Key Commands
- `npm run dev` — start all dev servers (turbo)
- `npm run build` — build all packages
- `npm run test` — run all tests
- `cd apps/desktop && cargo tauri dev` — run desktop app in dev mode
- `cd apps/cli && cargo run -- search "react"` — test CLI locally
```

### 13.3 Phase-by-Phase Agent Instructions

For each development phase, update the relevant CLAUDE.md with specific context:

**Phase 1 (Web):** Focus `apps/web/CLAUDE.md` on Next.js App Router patterns, Convex React hooks, Tailwind CSS, and the specific component library (shadcn/ui recommended).

**Phase 2 (CLI):** Focus `apps/cli/CLAUDE.md` on Rust async patterns (tokio), clap argument parsing, reqwest HTTP client, and tar/flate2 for package handling.

**Phase 3 (Desktop):** Focus `apps/desktop/CLAUDE.md` on Tauri 2.0 commands, IPC patterns, portable-pty usage, and CodeMirror 6 integration.

---

## Appendix A: Predefined Categories

```
web-frontend       Web Frontend (React, Vue, Svelte, Angular, etc.)
web-backend         Web Backend (Express, FastAPI, Rails, etc.)
fullstack           Full-Stack (Next.js, Remix, Django, etc.)
mobile              Mobile (React Native, Flutter, Swift, Kotlin)
data-science        Data Science & ML (Python, Jupyter, PyTorch, etc.)
devops              DevOps & Infrastructure (Docker, K8s, Terraform, etc.)
systems             Systems Programming (Rust, C, C++, Go)
cli-tools           CLI Tools & Scripts (Bash, Python scripts, etc.)
api-design          API Design (REST, GraphQL, gRPC)
testing             Testing & QA (Unit, Integration, E2E)
security            Security & Compliance
documentation       Documentation & Technical Writing
database            Database & Data Modeling
general             General Purpose
```

## Appendix B: Initial Seed Configs to Write

To launch credibly, create these 15 configs before public launch:

1. `base-typescript` — Universal TypeScript conventions
2. `base-python` — Universal Python conventions
3. `base-rust` — Universal Rust conventions
4. `react-modern` — React 19 + TypeScript best practices
5. `nextjs-app-router` — Next.js App Router patterns
6. `fastapi-standard` — FastAPI with SQLAlchemy + Pydantic
7. `express-typescript` — Express.js with TypeScript
8. `rust-cli` — Rust CLI tool patterns (clap, tokio)
9. `python-ml` — Python ML/data science (PyTorch, pandas)
10. `docker-compose` — Docker + docker-compose best practices
11. `terraform-aws` — Terraform for AWS infrastructure
12. `testing-vitest` — Testing patterns with Vitest
13. `testing-pytest` — Testing patterns with pytest
14. `monorepo-turborepo` — Turborepo monorepo conventions
15. `convex-fullstack` — Convex + Next.js full-stack patterns

---

*Document version: 1.0.0*
*Last updated: 2026-02-09*
*Status: Proposal — awaiting approval to begin Phase 1*
