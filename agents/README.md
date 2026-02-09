# Agent Review Pipeline — Claude Terminal

## Overview

Multi-agent review pipeline that enforces code quality before any code reaches master.
**The code review step runs automatically after every code change — no manual trigger needed.**

## Automatic Code Review (Inline)

When Claude Code is used to write or modify code in this project, it **automatically** runs the code review agent after completing changes. This is configured in `CLAUDE.md` and is mandatory.

### What happens automatically

1. TypeScript check (`npx tsc --noEmit`)
2. Rust check (`cargo check`) if Rust files changed
3. Code review subagent launched with `agents/code-reviewer.md` instructions
4. Subagent reads all changed files in full + the git diff
5. Subagent produces a Code Review Report with verdict (PASS / FAIL / PASS WITH NOTES)
6. If FAIL → issues are fixed and review re-runs
7. If PASS → verdict is reported to user

### How the subagent is invoked

Claude Code uses the Task tool with `subagent_type=Explore` and provides:
- The full code-reviewer prompt from `agents/code-reviewer.md`
- The list of changed files (`git diff --name-only`)
- The full diff (`git diff`)
- Instructions to read each changed file IN FULL and produce the report

This gives the reviewer full context without polluting the main conversation.

## Manual Pipeline (for PR review and reflection)

```bash
# PowerShell (Windows)
.\scripts\review-pipeline.ps1 code-review      # Manual code review (if needed)
.\scripts\review-pipeline.ps1 pr-review         # PR review before merge
.\scripts\review-pipeline.ps1 self-reflect       # Post-merge reflection
.\scripts\review-pipeline.ps1 full               # All three in sequence

# Bash (macOS/Linux)
./scripts/review-pipeline.sh code-review
./scripts/review-pipeline.sh pr-review
./scripts/review-pipeline.sh self-reflect
./scripts/review-pipeline.sh full
```

## Pipeline Flow

```
Agent writes code
       │
       ▼ (AUTOMATIC — runs inline, no manual trigger)
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
           ▼ (MANUAL — run script or ask Claude Code)
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
           ▼ (MANUAL — run script or ask Claude Code)
┌──────────────────────────────┐
│  3. SELF-REFLECT AGENT       │  Meta-Cognitive
│     Analyzes: what happened, │  Captures Tauri/React/PTY learnings,
│     quality, patterns        │  updates metrics, suggests config
│                              │  improvements for future sessions
└──────────────────────────────┘
```

## Agent Configs

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Code Reviewer | `agents/code-reviewer.md` | Senior/Staff Engineer | **Automatic** after code changes |
| PR Reviewer | `agents/pr-reviewer.md` | Principal Engineer | Manual before merge |
| Self-Reflect | `agents/self-reflect.md` | Meta-Cognitive | Manual after merge |

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

1. Code review runs **automatically** after every code change — never skip it
2. NEVER push to master without a passing code review
3. NEVER merge a PR without passing PR review
4. ALWAYS run self-reflect after merging
5. If review FAILS → fix issues → re-run (do NOT bypass)
