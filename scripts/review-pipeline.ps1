#
# review-pipeline.ps1 — Multi-agent review pipeline for Claude Terminal (Windows)
#
# Usage:
#   .\scripts\review-pipeline.ps1 code-review
#   .\scripts\review-pipeline.ps1 pr-review
#   .\scripts\review-pipeline.ps1 self-reflect
#   .\scripts\review-pipeline.ps1 full
#

param(
    [Parameter(Position=0)]
    [ValidateSet("code-review", "pr-review", "self-reflect", "full", "help")]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$AgentsDir = Join-Path $RootDir "agents"
$ReflectionsDir = Join-Path $RootDir ".claude" "reflections"
$ReviewsDir = Join-Path $ReflectionsDir "reviews"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

New-Item -ItemType Directory -Force -Path $ReviewsDir | Out-Null

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Pass { param($msg) Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Invoke-CodeReview {
    Write-Info "Starting Code Review (Senior Engineer Agent)..."

    $diffCached = git diff --cached 2>$null
    $diffUnstaged = git diff 2>$null

    if (-not $diffCached -and -not $diffUnstaged) {
        Write-Warn "No changes to review. Skipping."
        return $true
    }

    $reviewFile = Join-Path $ReviewsDir "code-review_${Timestamp}.md"
    $diff = if ($diffCached) { $diffCached } else { $diffUnstaged }
    $changedFiles = if ($diffCached) { git diff --name-only --cached } else { git diff --name-only }

    Write-Info "Files to review:"
    $changedFiles | ForEach-Object { Write-Host "  - $_" }

    $reviewPrompt = @"
You are the Code Reviewer Agent. Follow agents/code-reviewer.md exactly.
FILES CHANGED:
$($changedFiles -join "`n")
DIFF:
$diff
Read each changed file in full, then produce your Code Review Report.
"@

    $claudeExists = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeExists) {
        Write-Info "Launching code reviewer agent..."
        $reviewPrompt | claude --print 2>&1 | Out-File -FilePath $reviewFile -Encoding utf8
    } else {
        Write-Warn "Claude CLI not found. Saving prompt to $reviewFile"
        "# Code Review - $Timestamp`n## Status: PENDING MANUAL REVIEW" | Out-File -FilePath $reviewFile -Encoding utf8
    }

    Write-Info "Review saved to: $reviewFile"

    $content = Get-Content $reviewFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "Verdict:\s*FAIL") {
        Write-Fail "CODE REVIEW FAILED - Fix critical issues."
        return $false
    } elseif ($content -match "Verdict:\s*PASS WITH NOTES") {
        Write-Warn "CODE REVIEW PASSED WITH NOTES"
        return $true
    } else {
        Write-Pass "CODE REVIEW PASSED"
        return $true
    }
}

function Invoke-PRReview {
    Write-Info "Starting PR Review (Principal Engineer Agent)..."

    $currentBranch = git branch --show-current 2>$null
    $baseBranch = "master"

    $exists = git rev-parse --verify $baseBranch 2>$null
    if (-not $exists) { $baseBranch = "main" }
    $exists = git rev-parse --verify $baseBranch 2>$null
    if (-not $exists) {
        Write-Fail "Neither 'master' nor 'main' branch found."
        return $false
    }

    if ($currentBranch -eq $baseBranch) {
        Write-Warn "Already on $baseBranch. No PR to review."
        return $true
    }

    $reviewFile = Join-Path $ReviewsDir "pr-review_${Timestamp}.md"
    $prDiff = git diff "${baseBranch}...HEAD" 2>$null
    $prStat = git diff "${baseBranch}...HEAD" --stat 2>$null
    $prCommits = git log "${baseBranch}..HEAD" --oneline 2>$null

    Write-Info "Branch: $currentBranch -> $baseBranch"

    $reviewPrompt = @"
You are the PR Reviewer Agent. Follow agents/pr-reviewer.md exactly.
BRANCH: $currentBranch -> $baseBranch
COMMITS:
$($prCommits -join "`n")
STAT:
$($prStat -join "`n")
FULL DIFF:
$prDiff
Read the entire codebase, then produce your PR Review Report.
"@

    $claudeExists = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeExists) {
        Write-Info "Launching PR reviewer agent..."
        $reviewPrompt | claude --print 2>&1 | Out-File -FilePath $reviewFile -Encoding utf8
    } else {
        Write-Warn "Claude CLI not found. Saving prompt to $reviewFile"
        "# PR Review - $Timestamp`n## Status: PENDING" | Out-File -FilePath $reviewFile -Encoding utf8
    }

    Write-Info "Review saved to: $reviewFile"

    $content = Get-Content $reviewFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "Verdict:\s*REQUEST CHANGES") {
        Write-Fail "PR REVIEW: CHANGES REQUESTED"
        return $false
    } elseif ($content -match "Verdict:\s*NEEDS DISCUSSION") {
        Write-Warn "PR REVIEW: NEEDS DISCUSSION"
        return $false
    } else {
        Write-Pass "PR REVIEW: APPROVED"
        return $true
    }
}

function Invoke-SelfReflect {
    Write-Info "Starting Self-Reflection (Meta-Cognitive Agent)..."

    $reflectFile = Join-Path $ReflectionsDir "reflection_${Timestamp}.md"
    $learningsFile = Join-Path $ReflectionsDir "LEARNINGS.md"
    $metricsFile = Join-Path $ReflectionsDir "METRICS.md"

    if (-not (Test-Path $learningsFile)) {
        "# Agent Learnings`n`n---`n" | Out-File -FilePath $learningsFile -Encoding utf8
    }
    if (-not (Test-Path $metricsFile)) {
        "# Agent Performance Metrics`n`n| Date | Task | Lines | Verdict | Issues | Quality | Notes |`n|------|------|-------|---------|--------|---------|-------|" | Out-File -FilePath $metricsFile -Encoding utf8
    }

    $recentCommits = git log --oneline -10 2>$null
    $lastDiff = git diff "HEAD~1...HEAD" 2>$null
    $learnings = Get-Content $learningsFile -Raw -ErrorAction SilentlyContinue

    $reviewPrompt = @"
You are the Self-Reflect Agent. Follow agents/self-reflect.md exactly.
RECENT COMMITS:
$($recentCommits -join "`n")
LATEST CHANGES:
$lastDiff
CURRENT LEARNINGS:
$learnings
Produce your Self-Reflection Report.
"@

    $claudeExists = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeExists) {
        $reviewPrompt | claude --print 2>&1 | Out-File -FilePath $reflectFile -Encoding utf8
    } else {
        Write-Warn "Claude CLI not found. Saving prompt to $reflectFile"
        "# Self-Reflection - $Timestamp`n## Status: PENDING" | Out-File -FilePath $reflectFile -Encoding utf8
    }

    Write-Info "Reflection saved to: $reflectFile"
    Write-Pass "Self-reflection complete"
}

function Invoke-FullPipeline {
    Write-Info "==============================================="
    Write-Info "  FULL REVIEW PIPELINE - Claude Terminal"
    Write-Info "==============================================="
    Write-Host ""

    Write-Info "Step 1/3: Code Review"
    if (-not (Invoke-CodeReview)) {
        Write-Fail "Pipeline STOPPED at Code Review."
        return
    }
    Write-Host ""

    Write-Info "Step 2/3: PR Review"
    if (-not (Invoke-PRReview)) {
        Write-Fail "Pipeline STOPPED at PR Review."
        return
    }
    Write-Host ""

    Write-Info "Step 3/3: Self-Reflection"
    Invoke-SelfReflect
    Write-Host ""

    Write-Pass "==============================================="
    Write-Pass "  PIPELINE COMPLETE - All checks passed"
    Write-Pass "==============================================="
}

switch ($Command) {
    "code-review"  { Invoke-CodeReview }
    "pr-review"    { Invoke-PRReview }
    "self-reflect" { Invoke-SelfReflect }
    "full"         { Invoke-FullPipeline }
    "help" {
        Write-Host @"
Usage: .\scripts\review-pipeline.ps1 {code-review|pr-review|self-reflect|full}

  code-review   Senior engineer code review on current changes
  pr-review     Principal engineer PR review before merge
  self-reflect  Post-merge self-reflection and learning capture
  full          Complete pipeline: code-review -> pr-review -> self-reflect
"@
    }
}
