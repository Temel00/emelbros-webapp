---
description: Work the emelbros-webapp GitHub issue queue autonomously per AGENTS.md
---

Work the emelbros-webapp GitHub issue queue autonomously, following AGENTS.md at the repo root exactly. If you haven't read it in this session yet, read it in full before your first action.

## Each wake cycle

1. **Check for review feedback first.** List open PRs you authored with label `agent-review` (`gh pr list --label agent-review --state open --json number,headRefName`). For each, check for new review comments/requested changes since you last touched it (`gh pr view <n> --json reviews,comments,isDraft,state,mergedAt`). If a PR was already merged or closed, skip it — nothing to do. If feedback is waiting, resume that worktree/branch and address it, then re-run verification and push.

2. **If nothing needs a response**, list open issues (`gh issue list --state open --json number,title,labels,body`) and find the oldest one labeled `agent-ready` with no unresolved "Blocked by #N" reference (check the referenced issue's actual state, not just its presence in the text) and no other issue currently holding `agent-in-progress`. Claim it: `gh issue edit <n> --remove-label agent-ready --add-label agent-in-progress`. Create a worktree off `origin/main` on branch `agent/issue-<number>-<slug>` (`git worktree add ../emelbros-agent-issue-<n> -b agent/issue-<n>-<slug> origin/main`), then implement it.

3. **Before opening a PR**, in the worktree:
   - Run `npm install`, then immediately `git checkout -- package-lock.json` unless you actually added/removed a dependency — a bare install rewrites the lockfile's top-level `"name"` field to the worktree's directory name (package.json has no `"name"` field) and that corruption must not be committed.
   - Run build, lint, typecheck, and applicable tests (`npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` if e2e is in scope for the change).
   - If lint/typecheck/tests show *pre-existing* failures unrelated to your change but your issue's exit criteria requires "all checks green," fix those failures in the same PR (call it out explicitly in the PR body) rather than treating them as out of scope — don't let inherited failures block your own exit criteria.
   - Verify every Exit Criteria checkbox in the issue is genuinely satisfied — don't check a box you haven't verified.
   - Do the mandatory doc-sync check: does this change make `docs/architecture/*.md` or `CONTEXT.md` stale? Update in the same PR if so.
   - If the change needs repo-level configuration you can't set yourself (GitHub Actions secrets, branch protection, etc.), say so explicitly in the PR body with exact names/values needed — don't guess or silently skip verification that depends on it. If you can, verify locally with equivalent env vars/values instead so you know the logic is right even if CI can't yet prove it.

4. **Open a draft PR** to `main` (`gh pr create --draft --base main --head agent/issue-<n>-<slug> --title "..." --body-file <scratchpad-path>`) with: issue link (`Closes #<n>`), summary, checked-off exit criteria, verification results, and the doc-sync note. Swap the issue label (`gh issue edit <n> --remove-label agent-in-progress --add-label agent-review`). Never self-merge or self-review.

5. **Mark a checkpoint.** Right after step 4 succeeds, call `mark_chapter` (title: `Issue #<n> → PR #<m>`) to close out this unit of work in the transcript. This is the closest available proxy for a manual `/compact`: the assistant has no tool to trigger context compaction directly (it's a user-side CLI action), so the practical equivalent is (a) keep this cycle's own tool output terse, (b) delegate heavy multi-file exploration to a subagent rather than reading everything inline, and (c) mark the chapter boundary so a human skimming the transcript — and the harness's automatic compaction, which the system already runs as context grows — has a clean cut point right after each PR lands.

6. **If you get stuck** after genuine focused effort, comment on the issue with specifics, label it `agent-blocked`, and move to the next `agent-ready` issue instead of retrying the same approach.

7. **If you notice out-of-scope work** worth doing (dead code, stale docs, missing tests, a real TODO), open a new issue via the agent-task template (`.github/ISSUE_TEMPLATE/agent-task.md`) labeled `agent-proposed` — never label your own proposals `agent-ready`.

8. **Housekeeping**: if you notice a worktree for an issue whose PR already merged/closed, remove it (`git worktree remove ../emelbros-agent-issue-<n>`) to keep the tree list clean, and delete the local branch if it still exists.

## Self-pacing

Shorter wake-ups (a few minutes) while there's active work (open draft PR awaiting your own fix, or an issue mid-implementation). Longer wake-ups (20–30 min) once the queue is quiet — i.e. every open issue is either `agent-review` (waiting on a human) or `agent-proposed`/blocked (waiting on triage), and nothing is `agent-in-progress`.
