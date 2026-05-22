# Pitfalls

Merged historical source: `F:\CODEX\CC\rollback-backups\github-clean-20260522-023029\pitfall.md`

## 2026-05-23 - Codex workspace root vs repo root

- Symptom: Selecting `F:\CODEX\CC` keeps outer backups/logs visible but hides git status; selecting `F:\CODEX\CC\claude-code` shows git status but makes outer workspace files less obvious.
- Cause: The Codex app's git detection follows the selected workspace/repo root, while rollback backups, conversation logs, MCP Chrome extension files, and some root notes live one directory above the repo.
- Fix: Treat `F:\CODEX\CC\claude-code` as the repo root for git, builds, tests, and commits; treat `F:\CODEX\CC` as the outer workspace root for recovery files and local tooling.
- Prevent: When looking for prior work, explicitly check `F:\CODEX\CC\rollback-backups`, `F:\CODEX\CC\conversation-logs`, `F:\CODEX\CC\mcp-chrome-extension`, and root-level notes before concluding a file or log is missing.

## 2026-05-23 - Worklog location

- Symptom: Attempted to update `DEV-LOG.md` after a worklog request and initially missed the existing backup logs.
- Cause: The repo has a development log and rollback backup logs, but the active `worklog-memory` skill requires project-root `changelog.md` and `pitfall.md` for AI-written work logs.
- Fix: Merge structured backup logs into root `changelog.md` and `pitfall.md`; keep future AI worklog entries there.
- Prevent: Read `worklog-memory` and search both the repo root and known backup/memory folders before creating new worklog files.

## 2026-05-23 - mcp-chrome authentication path

- Symptom: `/mcp` showed `mcp-chrome` as failed with `Auth: not authenticated`, and choosing `Authenticate` returned an error.
- Cause: `mcp-chrome` is a local Chrome extension/native-host bridge at `http://127.0.0.1:12306/mcp`, not an OAuth MCP. The port was not listening because the companion Chrome extension was not loaded/running, even though native host registration passed doctor checks.
- Fix: Do not use OAuth for this server; load the companion extension with ID `hbdgbgagpkpjffpklnamcljpakneikee`, confirm `127.0.0.1:12306` is listening, then reconnect in `/mcp`.
- Prevent: For static-header local MCP servers, check the local port/process/extension bridge before using generic MCP OAuth actions.

## 2026-05-22 - Claude Code context budget is layered

- Symptom: After early 1M-context edits, `/context` still showed `deepseek-v4-pro ... 15.5k/200k tokens`.
- Cause: Claude Code has multiple context-budget layers, not just one display constant.
- Fix: Keep the accepted implementation narrow:
  - Map only `deepseek-v4-pro` to `1_000_000`.
  - Preserve `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` fallback to `200_000`.
  - Scale API microcompact thresholds from the active context window.
  - Pass the active model context window into API context management.
- Prevent: Treat provider model capacity, UI `/context`, API request building, token estimation, and auto-compact thresholds as separate surfaces that all need verification.

## 2026-05-22 - Fresh source changes require rebuilding dist

- Symptom: Interactive `ccb` reported runtime errors even after source changes appeared fixed.
- Cause: `ccb.cmd` runs the built `dist\cli-bun.js`; stale `dist` can keep old or inconsistent runtime code.
- Fix: Run `bun run build` after source changes before testing interactive `ccb`.
- Prevent: Do not diagnose interactive REPL startup from source state alone. Verify the built artifact and run `ccb --version`.

## 2026-05-22 - AppState Provider duplication

- Symptom: Runtime error: `useAppState/useSetAppState cannot be called outside of an <AppStateProvider />`.
- Likely cause: Vite/Bun split bundle may duplicate singleton React context modules when imports resolve through mixed alias and relative paths.
- Tried: Broad import rewrites for `src/state/AppState.js` and `src/context/notifications.js`.
- Result: Typecheck and build passed, but this strategy led into another singleton-like runtime error and was abandoned.
- Fix: For the current final state, rebuild `dist`; do not keep broad import rewrites unless the error recurs after a fresh build.
- Prevent: Before changing imports across many files, confirm the error still reproduces from a freshly rebuilt bundle.

## 2026-05-22 - Config singleton duplication

- Symptom: Runtime error: `Config accessed before allowed. Boundary: RootREPLBoundary`.
- Likely cause: Duplicate `config.ts` module instances in the built bundle, where `enableConfigs()` affected one instance and another stayed locked.
- Tried: Vite `resolve.alias` rules for `AppState`, `notifications`, and `config`.
- Result: Stopped and reverted at user request during GitHub-clean restore.
- Fix: Leave `vite.config.ts` unchanged in the accepted final state.
- Prevent: Do not add singleton alias fixes preemptively. Only revisit if the same runtime error reproduces after a clean rebuild.

## 2026-05-22 - Hook JSON parse failure is a separate problem

- Symptom: Hook failed with `Failed to parse stdin as JSON: Expecting ',' delimiter`.
- Likely cause: Malformed hook stdin, Windows quoting, or a changed Claude Code hook payload format.
- Fix: Preserve the hook and script, but debug this independently if it recurs.
- Prevent: Capture the raw hook stdin payload before changing repo source files. Do not assume a hook parse error is caused by the Claude Code source tree.

## 2026-05-22 - Backup patches are not automatically safe to reapply

- Symptom: Backup patches contain abandoned experiments alongside useful historical data.
- Cause: The rollback preserved work-in-progress diffs, including broad import rewrites, Vite alias changes, and Windows browser-open experiments.
- Fix: Treat backup patches as forensic references only.
- Prevent: Reapply individual hunks only after checking current source, reproducing the problem, and defining a focused verification command.

## 2026-05-22 - Current 1M validation is not provider-limit proof

- Symptom: Local checks proved UI budget and threshold behavior, but no real over-200K provider request was made.
- Cause: `/context` and local request-management tests do not prove that the provider will accept a >200K live request.
- Fix: Keep the current patch as local behavior validation.
- Prevent: Before claiming full end-to-end 1M support, run a controlled long-context test that proves:
  - `/context` reports the intended budget.
  - Auto-compact threshold changes with the intended budget.
  - The API provider accepts a request larger than 200K.
  - A long session does not summarize early at the old threshold.
