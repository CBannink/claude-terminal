# Agent Review Pipeline — Claude Terminal

## Overview

Multi-agent review pipeline that enforces code quality before any code reaches master.
**No agent may commit, push, or merge without passing through this pipeline.**

## Pipeline Flow

```
Agent writes code
       │
       ▼
┌──────────────────────────────┐
│  1. CODE REVIEWER AGENT      │  Senior/Staff Engineer
│     Reviews: bugs, security, │  Checks Tauri commands, React hooks,
│     memory leaks, types,     │  PTY lifecycle, xterm.js patterns,
│     cross-platform issues    │  Zustand usage, TypeScript strict
│                              │
│     Verdict: PASS / FAIL     │
└──────────┬───────────────────┘
           │ PASS only
           ▼
    Commit + Push + Create PR
           │
           ▼
┌──────────────────────────────┐
│  2. PR REVIEWER AGENT        │  Principal Engineer
│     Reviews: breaking        │  Analyzes PR against full codebase:
│     changes, Tauri command   │  Rust ↔ React contract, store shape,
│     signatures, store shape, │  build configs, cross-platform,
│     build configs, CI        │  capabilities/permissions
│                              │
│     Verdict: APPROVE /       │
│     REQUEST CHANGES          │
└──────────┬───────────────────┘
           │ APPROVE only
           ▼
       Merge to master
           │
           ▼
┌──────────────────────────────┐
│  3. SELF-REFLECT AGENT       │  Meta-Cognitive
│     Analyzes: what happened, │  Captures Tauri/React/PTY learnings,
│     quality, patterns        │  updates metrics, suggests config
│                              │  improvements for future sessions
└──────────────────────────────┘
```

## Usage

```bash
# Bash
./scripts/review-pipeline.sh code-review
./scripts/review-pipeline.sh pr-review
./scripts/review-pipeline.sh self-reflect
./scripts/review-pipeline.sh full

# PowerShell (Windows)
.\scripts\review-pipeline.ps1 code-review
.\scripts\review-pipeline.ps1 pr-review
.\scripts\review-pipeline.ps1 self-reflect
.\scripts\review-pipeline.ps1 full
```

## From within a Claude Code session

```
> "Review my changes using agents/code-reviewer.md"
> "Run PR review using agents/pr-reviewer.md"
> "Run self-reflection using agents/self-reflect.md"
```

## Review Artifacts

```
.claude/reflections/
├── reviews/                              # Individual review reports
│   ├── code-review_2026-02-09_14-30.md
│   └── pr-review_2026-02-09_14-35.md
├── reflection_2026-02-09_14-40.md        # Session reflections
├── LEARNINGS.md                          # Persistent knowledge
├── METRICS.md                            # Quality tracking
└── SUGGESTED_UPDATES.md                  # Config improvement suggestions
```

## Rules

1. NEVER push to master without passing code review
2. NEVER merge a PR without passing PR review
3. ALWAYS run self-reflect after merging
4. If review FAILS → fix issues → re-run (do NOT bypass)
