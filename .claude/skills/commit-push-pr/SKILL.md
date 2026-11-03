---
name: commit-push-pr
description: Commit the current changes as a conventional commit, push the branch, and open a GitHub PR with gh. Run only when the user invokes /commit-push-pr.
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
argument-hint: "[optional commit/PR intent]"
---

## Current git context
- Branch: !`git branch --show-current`
- Status:
!`git status --short --branch`
- Diff vs HEAD:
!`git diff HEAD --stat`
- Recent commits (match their style):
!`git log --oneline -8`

User intent (may be empty): $ARGUMENTS

## Procedure
1. **Sanity.** If the status above shows no changes and no unpushed commits, stop and say so.
   Never stage `.env*`, `credentials.md`, `*.csv`/`*.ods`/`*.xlsx`, `academy_admins.*`,
   `.claude/settings.local.json`, `.claude/allow-sensitive.flag`, or `CLAUDE.local.md`.
   If any appear in the diff, stop and ask.
2. **Branch.** If on `main`/`master`, create a branch first:
   `git switch -c <type>/<kebab-summary>` (e.g. `fix/fee-overdue-timezone`).
3. **Stage** only the files that belong to this change: `git add <paths>` (no `git add -A` unless every file listed is in scope).
4. **Commit** with Conventional Commits:
   - Format: `<type>(<scope>): <imperative summary ≤ 72 chars>`
   - Types: `feat fix refactor perf test docs build ci chore revert`
   - Scopes used here: `convex`, `auth`, `rbac`, `fees`, `finance`, `athletes`, `teams`, `sessions`,
     `tactical`, `kiosk`, `messages`, `ui`, `mock`, `ci`, `harness`
   - Body: what changed and why, wrapped at 72; `BREAKING CHANGE:` footer when an exported Convex function's args/return changed.
   - **No AI trailers**: no `Co-Authored-By`, `Generated with`, `Claude`, or session links. Use
     `git commit -m "<subject>" -m "<body>"`.
   - If a hook rejects the commit, fix the cause and create a new commit; never `--no-verify`, never `--amend` a pushed commit.
5. **Push:** `git push -u origin HEAD` (never `--force`; if rejected, `git fetch origin` and `git rebase origin/main`, then push again).
6. **PR:** `gh pr create --base main --head "$(git branch --show-current)" --title "<commit subject>" --body "<body>"` with this body:
   ```
   ## Summary
   - <bullet per logical change>

   ## Tenant / RBAC impact
   <guards added/changed, or "none">

   ## Test plan
   - [x] pnpm exec vitest run --changed HEAD
   - [ ] <manual check, if any>
   ```
   No AI attribution lines in the PR body. If a PR already exists for the branch (`gh pr view` succeeds), push only and print its URL.
7. Output the commit hash, branch, and PR URL — nothing else.
