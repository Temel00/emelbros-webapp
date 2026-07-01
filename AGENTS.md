# AGENTS.md

This file describes how an autonomous agent loop works this codebase from GitHub issues. It's the workflow spec — for what the codebase *is*, see [CONTEXT.md](CONTEXT.md) and `docs/architecture/`; for coding conventions, see [CLAUDE.md](CLAUDE.md).

## Overview

The loop runs via Claude Code's `/loop` (dynamic self-pacing), periodically checking GitHub for actionable work: issues ready to start, or draft PRs with new review feedback to address. It works **one issue at a time** (single-threaded active coding), opens **draft PRs only** (never self-merges, never self-reviews), and can **propose** new issues when it notices problems, but never authorizes its own proposals.

## Issue label state machine

| Label | Meaning | Who sets it |
|---|---|---|
| `agent-proposed` | Loop noticed something worth fixing and opened an issue for it | Loop |
| `agent-ready` | Fair game to be picked up and worked | Human only (authoring an issue directly as `agent-ready`, or promoting an `agent-proposed` issue after review) |
| `agent-in-progress` | Actively being coded right now — **exclusive, at most one issue holds this label at a time** | Loop, on claiming an issue |
| `agent-review` | Draft PR is open, waiting on human review — **no limit, many issues can sit here at once** | Loop, on opening the draft PR |
| `agent-blocked` | Loop couldn't make progress and is waiting on human clarification | Loop, when stuck |

The loop never applies `agent-ready` to its own proposals — that promotion is always a human action.

## One wake cycle

Each time the loop wakes up, in priority order:

1. **Check parked PRs first.** For every open draft PR the loop authored (`agent-review` label), check for new review comments/requested changes since the loop last touched that branch. If found, resume that worktree, address the feedback, push, and stay in `agent-review`.
2. **If no PR needs a response, check for unblocked work.** Query open issues labeled `agent-ready` with no unresolved "Blocked by #N" reference (see below), skip any that are blocked. If one exists and nothing currently holds `agent-in-progress`, claim the oldest one.
3. **If nothing is actionable**, optionally look for something to propose (see "Proposing issues" below), then schedule the next wake-up — short if there was actionable work this cycle, longer (20–30 min) if the repo was quiet.

This means the loop is never idle just because a PR is under review — it picks up the next `agent-ready` issue instead, and comes back to the parked PR once you leave feedback.

## Working an issue

1. **Claim it**: swap `agent-ready` → `agent-in-progress` on the issue.
2. **Check "Blocked by"**: GitHub issues use native `Blocked by #N` task-list syntax in the body. Before claiming, verify via `gh issue view <n>` that every referenced blocking issue is closed/merged — if not, skip this issue and try the next `agent-ready` one.
3. **Create a worktree**: branch off `main`, named `agent/issue-<number>-<short-slug>` (e.g. `agent/issue-42-add-typecheck-script`).
4. **Implement the change**, following [CLAUDE.md](CLAUDE.md)'s conventions.
5. **Run verification** before opening a PR:
   - Always: `npm run build`, `npm run lint`, and `npm run typecheck` (once it exists — see below).
   - If the repo has Vitest/Playwright set up: run relevant unit tests (`npm run test`) and, for UI-affecting changes, relevant Playwright specs (`npm run test:e2e`).
   - Check every checkbox in the issue's **Exit Criteria** explicitly — don't mark the PR ready until each one is verifiably true (see "What counts as exit criteria" below).
6. **Doc-sync check (mandatory)**: does this change make any `docs/architecture/*.md` file or [CONTEXT.md](CONTEXT.md) inaccurate? If the change touches an area a doc covers, update that doc in the same PR. State explicitly in the PR description either "Docs reviewed, no update needed" or "Docs updated: `<file>`" — this is not optional, and should not be silently skipped.
7. **Open a draft PR** targeting `main`. Body includes: a link to the issue, a summary of the change, the exit-criteria checklist with each item checked off, and the doc-sync statement from step 6.
8. **Swap labels**: `agent-in-progress` → `agent-review` on the issue. The loop does **not** self-review or self-merge — a draft PR is a hard stop until a human reviews it.

## What counts as exit criteria

Exit criteria in an issue must be **concrete and checkable** — either by an automated command (build/lint/typecheck/test passing) or by a literal, unambiguous human action ("check the task box and refresh the page — box stays checked?"). Vague or subjective criteria ("looks good", "feels right", "clean up the UI") are not acceptable and should be flagged back on the issue rather than guessed at.

## Getting stuck

If the loop can't make progress on a claimed issue after a bounded, focused effort (not infinite retries):

1. Post a comment on the issue explaining specifically what's blocking it and what was tried.
2. Swap `agent-in-progress` → `agent-blocked`.
3. Leave the worktree/branch in place if partial progress is worth keeping, and reference it in the comment; otherwise abandon it.
4. Move on to the next `agent-ready` issue rather than retrying the same one.

A human reads the blocker comment, clarifies or fixes the issue, and relabels back to `agent-ready` when it's workable again.

## Proposing issues

When the loop notices something worth fixing while working (dead code, missing tests, stale docs, a real TODO, an inconsistency between docs and code) but it's out of scope for the current issue, it opens a new issue using the same template (see `.github/ISSUE_TEMPLATE/agent-task.md`) and labels it `agent-proposed`. It never labels its own proposals `agent-ready` — a human reviews proposed issues and promotes the ones worth doing.

## Issue template

Every issue the loop works from (whether human-authored or loop-proposed) should follow:

```markdown
## Description
What needs to change and why.

## Context
Optional: relevant docs/architecture/*.md links, affected routes/files if known.

## Exit Criteria
- [ ] Specific, checkable criterion 1
- [ ] Specific, checkable criterion 2

## Blocked by
(optional: #issue-number references)
```

## CI

Once `.github/workflows/ci.yml` exists, it runs build/lint/typecheck/vitest/playwright on every PR — treat a red CI check on your own draft PR the same as a failed local verification step: fix it before considering the PR ready for review, don't wait for a human to point it out.
