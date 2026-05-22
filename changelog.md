# Changelog

Merged historical source: `F:\CODEX\CC\rollback-backups\github-clean-20260522-023029\changelog.md`

## 2026-05-23 - Workspace root convention

- Goal: Keep Codex git status visible without losing awareness of outer workspace backups and logs.
- Changed: Recorded the convention that `F:\CODEX\CC\claude-code` is the git/repo root, while `F:\CODEX\CC` is the outer workspace root containing rollback backups, conversation logs, MCP extension files, and root-level notes.
- Tried: Confirmed `F:\CODEX\CC` is not a git worktree and `F:\CODEX\CC\claude-code` is the actual repository with `main...origin/main [ahead 2]`.
- Verified: Checked the repo status from `F:\CODEX\CC\claude-code` and listed the outer workspace directories that still need to be considered when debugging or recovering work.
- Follow-up: Start future sessions from the repo root for git visibility, but explicitly inspect the outer workspace when searching for backups, logs, or downloaded tooling.

## 2026-05-23 - Merge worklogs into repo root

- Goal: Move the backup worklog memory into the project root so future sessions find it without searching rollback backups.
- Changed: Merged the rollback backup `changelog.md` entries into this root `changelog.md` while preserving the newer MCP entry.
- Tried: Checked `F:\CODEX\CC\rollback-backups\github-clean-20260522-023029` for structured worklog files and read the backup `changelog.md`, `pitfall.md`, incident log, and handoff note.
- Verified: Confirmed this root file now contains both the 2026-05-22 rollback/context entries and the 2026-05-23 MCP entries.
- Follow-up: Keep future AI worklog entries in the repo-root `changelog.md` and `pitfall.md`.

## 2026-05-23 - MCP status and mcp-chrome auth UI

- Goal: Fix misleading MCP status/auth display while debugging `mcp-chrome` on Windows.
- Changed: `src/utils/status.tsx` now counts `disabled` MCP servers separately from `failed`; `src/components/mcp/MCPSettings.tsx` and `src/components/mcp/MCPRemoteServerMenu.tsx` no longer show OAuth auth state/actions for local static-header HTTP MCP servers like `mcp-chrome`.
- Changed: Added `src/utils/__tests__/status.test.ts` to cover disabled MCP summary reporting.
- Tried: Verified `computer-use` could start, checked `mcp-chrome` bridge registration with `node scripts/setup-chrome-mcp.mjs doctor`, tested `127.0.0.1:12306`, and downloaded/unpacked the `hangwin/mcp-chrome` release outside the repo to verify the expected extension ID.
- Verified: `bun test src\utils\__tests__\status.test.ts`, `bun run typecheck`, and `bun run build` all passed.
- Follow-up: Load/start the Chrome companion extension with ID `hbdgbgagpkpjffpklnamcljpakneikee`; after port `12306` is listening, use `/mcp` reconnect for `mcp-chrome`.

## 2026-05-22 - Claude Code 1M context rollback and narrow restore

- Goal: Make `deepseek-v4-pro` use a 1M-token context budget in Claude Code while keeping `ccb` startup stable.
- Changed: Reintroduced a narrow 1M-context patch for `deepseek-v4-pro` after restoring the repo to GitHub `main`.
- Changed files:
  - `src/utils/context.ts`
  - `src/services/compact/apiMicrocompact.ts`
  - `src/services/api/claude.ts`
- Added tests:
  - `src/utils/__tests__/context.test.ts`
  - `src/services/compact/__tests__/apiMicrocompact.test.ts`
- Result: `/context` showed `deepseek-v4-pro - 15.6k/1m tokens (2%)` after rebuild and interactive verification.
- Verified:
  - `bun test src\utils\__tests__\context.test.ts`
  - `bun test src\services\compact\__tests__\apiMicrocompact.test.ts`
  - `bun run typecheck`
  - `bun run build`
  - `ccb --version`

## 2026-05-22 - First safe rollback

- Goal: Preserve all local work before reverting unstable source changes.
- Changed: Created backup folder `F:\CODEX\CC\rollback-backups\20260522-022029`.
- Backed up:
  - `repo-worktree.patch`
  - `browser-open-fix.patch`
  - `C:\Users\13186\.claude\settings.json`
  - `C:\Users\13186\.claude\settings.local.json`
  - `C:\Users\13186\.claude\scripts\extract_conversation.py`
  - `C:\Users\13186\.claude\skills`
- Changed: Restored source files to `HEAD`, removed added 1M-context test files, and rebuilt `dist`.
- Verified:
  - `bun run build:vite`
  - `bun run typecheck`
  - `node .\dist\cli-node.js --version`
  - `bun test` produced 5304 passes and 5 known sandbox-related `perf-issue command` failures.
- Follow-up: Interactive `ccb` still showed a runtime problem after this first rollback.

## 2026-05-22 - Final GitHub clean restore

- Goal: Return the repository to the GitHub `main` source before reapplying only safe changes.
- Changed: Created backup folder `F:\CODEX\CC\rollback-backups\github-clean-20260522-023029`.
- Changed: Backed up current worktree diff and `.claude` runtime files.
- Changed: Fetched `main` from `https://github.com/caizhirong486-lab/claude-code.git`.
- Confirmed base commit:
  - `HEAD = 66c892521b11e572e82a54bb6da701f4f16178d2`
  - `origin/main = 66c892521b11e572e82a54bb6da701f4f16178d2`
  - `FETCH_HEAD = 66c892521b11e572e82a54bb6da701f4f16178d2`
- Changed: Restored tracked source files from `FETCH_HEAD`.
- Removed attempted changes:
  - Windows browser open fixes.
  - Vite singleton alias experiment.
- Verified:
  - `git status --short --branch` returned only `## main...origin/main`.
  - `ccb --version` returned `2.6.0 (Claude Code)`.
  - `node .\dist\cli-node.js --version` returned `2.6.0 (Claude Code)`.
  - `bun run typecheck` passed.

## 2026-05-22 - Conversation-to-Markdown hook preserved

- Goal: Keep automatic Claude Code conversation export to Markdown while source rollback happened.
- Changed: Preserved global Stop hook configuration and script under `C:\Users\13186\.claude`.
- Hook command: `python "C:\Users\13186\.claude\scripts\extract_conversation.py"`.
- Behavior: Reads hook JSON from stdin, converts JSONL transcript text to Markdown, skips raw tool output and system metadata, and writes `<project_dir>\conversation-logs\<session_id>.md`.
- Manual usage: `python "C:\Users\13186\.claude\scripts\extract_conversation.py" --transcript <path-to-transcript.jsonl>`.
- Follow-up: Investigate any recurring `Failed to parse stdin as JSON` hook failures separately from source rollback.

## 2026-05-22 - Attempted changes left as historical context only

- Tried: Broad import rewrites from `src/*` aliases to relative paths for singleton-sensitive modules.
- Tried: Vite aliases for `AppState`, `notifications`, and `config`.
- Tried: Windows browser open fallback changes using `rundll32 url.dll,FileProtocolHandler` and `explorer`.
- Result: These changes were abandoned or removed during the GitHub-clean restore.
- Guidance: Use backup patches only as reference; do not apply them blindly.
