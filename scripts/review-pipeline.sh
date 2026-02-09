#!/usr/bin/env bash
set -euo pipefail

#
# review-pipeline.sh — Multi-agent review pipeline for Claude Terminal
#
# Usage:
#   ./scripts/review-pipeline.sh code-review    # Run code review on staged/unstaged changes
#   ./scripts/review-pipeline.sh pr-review      # Run PR review before merge
#   ./scripts/review-pipeline.sh self-reflect   # Run self-reflection after merge
#   ./scripts/review-pipeline.sh full           # Run full pipeline
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
AGENTS_DIR="$ROOT_DIR/agents"
REFLECTIONS_DIR="$ROOT_DIR/.claude/reflections"
REVIEWS_DIR="$REFLECTIONS_DIR/reviews"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$REVIEWS_DIR"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

run_code_review() {
    log_info "Starting Code Review (Senior Engineer Agent)..."

    if git diff --quiet && git diff --cached --quiet; then
        log_warn "No changes to review. Skipping."
        return 0
    fi

    local review_file="$REVIEWS_DIR/code-review_${TIMESTAMP}.md"
    local diff_output
    diff_output=$(git diff --cached 2>/dev/null || git diff 2>/dev/null || echo "No diff")
    local changed_files
    changed_files=$(git diff --name-only --cached 2>/dev/null || git diff --name-only 2>/dev/null || echo "None")

    log_info "Files to review:"
    echo "$changed_files" | while read -r file; do [ -n "$file" ] && echo "  - $file"; done

    local review_prompt="You are the Code Reviewer Agent. Follow agents/code-reviewer.md exactly.

FILES CHANGED:
${changed_files}

DIFF:
${diff_output}

Read each changed file in full, then produce your Code Review Report."

    if command -v claude &> /dev/null; then
        log_info "Launching code reviewer agent..."
        echo "$review_prompt" | claude --print > "$review_file" 2>&1 || true
    else
        log_warn "Claude CLI not found. Saving review prompt to $review_file"
        echo "# Code Review — ${TIMESTAMP}" > "$review_file"
        echo "## Status: PENDING MANUAL REVIEW" >> "$review_file"
        echo "### Files: ${changed_files}" >> "$review_file"
    fi

    log_info "Review saved to: $review_file"

    if grep -qi "Verdict: FAIL" "$review_file" 2>/dev/null; then
        log_error "CODE REVIEW FAILED — Fix critical issues before proceeding."
        return 1
    elif grep -qi "Verdict: PASS WITH NOTES" "$review_file" 2>/dev/null; then
        log_warn "CODE REVIEW PASSED WITH NOTES — Check review for recommendations."
        return 0
    else
        log_success "CODE REVIEW PASSED"
        return 0
    fi
}

run_pr_review() {
    log_info "Starting PR Review (Principal Engineer Agent)..."

    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local base_branch="master"

    if ! git rev-parse --verify "$base_branch" &>/dev/null; then
        base_branch="main"
    fi
    if ! git rev-parse --verify "$base_branch" &>/dev/null; then
        log_error "Neither 'master' nor 'main' branch found."
        return 1
    fi

    if [ "$current_branch" = "$base_branch" ]; then
        log_warn "Already on $base_branch. No PR to review."
        return 0
    fi

    local review_file="$REVIEWS_DIR/pr-review_${TIMESTAMP}.md"
    local pr_diff pr_stat pr_commits
    pr_diff=$(git diff "${base_branch}...HEAD" 2>/dev/null || echo "No diff")
    pr_stat=$(git diff "${base_branch}...HEAD" --stat 2>/dev/null || echo "No stat")
    pr_commits=$(git log "${base_branch}..HEAD" --oneline 2>/dev/null || echo "No commits")

    log_info "Branch: $current_branch → $base_branch"

    local review_prompt="You are the PR Reviewer Agent. Follow agents/pr-reviewer.md exactly.

BRANCH: ${current_branch} → ${base_branch}
COMMITS:
${pr_commits}
STAT:
${pr_stat}
FULL DIFF:
${pr_diff}

Read the entire codebase for context, then produce your PR Review Report."

    if command -v claude &> /dev/null; then
        log_info "Launching PR reviewer agent..."
        echo "$review_prompt" | claude --print > "$review_file" 2>&1 || true
    else
        log_warn "Claude CLI not found. Saving review prompt to $review_file"
        echo "# PR Review — ${TIMESTAMP}" > "$review_file"
        echo "## Status: PENDING MANUAL REVIEW" >> "$review_file"
    fi

    log_info "Review saved to: $review_file"

    if grep -qi "Verdict: REQUEST CHANGES" "$review_file" 2>/dev/null; then
        log_error "PR REVIEW: CHANGES REQUESTED"
        return 1
    elif grep -qi "Verdict: NEEDS DISCUSSION" "$review_file" 2>/dev/null; then
        log_warn "PR REVIEW: NEEDS DISCUSSION"
        return 1
    else
        log_success "PR REVIEW: APPROVED"
        return 0
    fi
}

run_self_reflect() {
    log_info "Starting Self-Reflection (Meta-Cognitive Agent)..."

    local reflect_file="$REFLECTIONS_DIR/reflection_${TIMESTAMP}.md"
    local learnings_file="$REFLECTIONS_DIR/LEARNINGS.md"
    local metrics_file="$REFLECTIONS_DIR/METRICS.md"

    [ ! -f "$learnings_file" ] && echo -e "# Agent Learnings\n\n---\n" > "$learnings_file"
    [ ! -f "$metrics_file" ] && echo "# Agent Performance Metrics" > "$metrics_file"

    local recent_commits last_diff
    recent_commits=$(git log --oneline -10 2>/dev/null || echo "No commits")
    last_diff=$(git diff HEAD~1...HEAD 2>/dev/null || echo "No diff")

    local review_prompt="You are the Self-Reflect Agent. Follow agents/self-reflect.md exactly.

RECENT COMMITS:
${recent_commits}
LATEST CHANGES:
${last_diff}
CURRENT LEARNINGS:
$(cat "$learnings_file" 2>/dev/null || echo "None yet")

Produce your Self-Reflection Report."

    if command -v claude &> /dev/null; then
        echo "$review_prompt" | claude --print > "$reflect_file" 2>&1 || true
    else
        log_warn "Claude CLI not found. Saving prompt to $reflect_file"
        echo "# Self-Reflection — ${TIMESTAMP}" > "$reflect_file"
        echo "## Status: PENDING" >> "$reflect_file"
    fi

    log_info "Reflection saved to: $reflect_file"
    log_success "Self-reflection complete"
}

run_full_pipeline() {
    log_info "═══════════════════════════════════════════════"
    log_info "  FULL REVIEW PIPELINE — Claude Terminal"
    log_info "═══════════════════════════════════════════════"
    echo ""

    log_info "Step 1/3: Code Review"
    if ! run_code_review; then
        log_error "Pipeline STOPPED at Code Review."
        return 1
    fi
    echo ""

    log_info "Step 2/3: PR Review"
    if ! run_pr_review; then
        log_error "Pipeline STOPPED at PR Review."
        return 1
    fi
    echo ""

    log_info "Step 3/3: Self-Reflection"
    run_self_reflect
    echo ""

    log_success "═══════════════════════════════════════════════"
    log_success "  PIPELINE COMPLETE — All checks passed"
    log_success "═══════════════════════════════════════════════"
}

case "${1:-help}" in
    code-review)  run_code_review ;;
    pr-review)    run_pr_review ;;
    self-reflect) run_self_reflect ;;
    full)         run_full_pipeline ;;
    help|*)
        echo "Usage: $0 {code-review|pr-review|self-reflect|full}"
        echo ""
        echo "  code-review   Senior engineer code review on current changes"
        echo "  pr-review     Principal engineer PR review before merge"
        echo "  self-reflect  Post-merge self-reflection and learning capture"
        echo "  full          Complete pipeline: code-review → pr-review → self-reflect"
        ;;
esac
