# Agent Status Flow

## Status Values

| Status | Meaning |
|--------|---------|
| `thinking` | Agent has received a message and is processing (before or between tool calls) |
| `running` | Agent is actively executing a tool |
| `idle` | Agent has finished its turn and is waiting for the next message |

---

## Two Parallel Systems

Status is driven by two independent systems. Both can update status, and they complement each other.

### 1. Hooks (`src/hooks/hookEventHandler.ts`)

Claude Code fires HTTP POST requests to `localhost:3456/hook` at key lifecycle moments. These are real-time and precise.

| Hook Event | Status Set |
|------------|------------|
| `PreToolUse` | `running` |
| `PostToolUse` | `thinking` |
| `Stop` | `idle` |
| `SubagentStop` | `idle` |
| `PermissionRequest` | sets `waitingForPermission` flag (no status change) |

Hooks are installed into `~/.claude/settings.json` via a Python script (`agent-dock-hook.py`) at extension activation. The script silently ignores failures, so hooks are best-effort.

### 2. Transcript File Watcher (`src/watchers/claudeLogWatcher.ts` + `src/parsers/transcriptParser.ts`)

Claude Code writes a `.jsonl` log file for each session under `~/.claude/projects/<encoded-path>/<session-id>.jsonl`. The watcher monitors this file for new lines and parses them.

| JSONL Entry | Status Set | Condition |
|-------------|------------|-----------|
| `{ type: "user" }` with text content | `thinking` | Only for human messages (not tool results). Skipped during initial load. |
| `{ type: "system", subtype: "stop_hook_summary" }` | `idle` | Always, including during initial load |
| `{ type: "assistant" }` | no status change | Only updates metrics (tokens, tool calls, files touched) |

#### Distinguishing human messages from tool results

Both human messages and tool results appear as `type: "user"` in the transcript. The parser uses `isHumanTurn()` to tell them apart:
- **Human message**: `content` is a string, or an array containing at least one `{ type: "text" }` block
- **Tool result**: `content` is an array containing only `{ type: "tool_result" }` blocks

Only human messages trigger the `idle → thinking` transition.

#### `skipStatus` on initial load

When a session is loaded from a persisted or archived transcript (resume, startup), the watcher reads the full file history with `skipStatus = true`. This prevents old `user` entries from setting status to `thinking`. After the initial read completes, `skipStatus` is set to `false` so future new lines are processed normally.

---

## Full Turn Lifecycle

```
User sends a message
        │
        ▼
[Transcript] user entry (human) → thinking
        │
        ▼  (agent starts reasoning, no tool yet)
        │
        ▼
[Hook] PreToolUse → running
        │
        ▼
[Hook] PostToolUse → thinking
[Transcript] user entry (tool result) → ignored (not a human message)
        │
        │  (may repeat for multiple tool calls)
        │
        ▼
[Hook] Stop → idle
[Transcript] system stop_hook_summary → idle  (fallback if Stop hook didn't fire)
```

---

## Why Two Systems?

| Scenario | Hooks | Transcript |
|----------|-------|------------|
| Hooks installed and working | Handles `running`, `thinking`, `idle` precisely | Handles `thinking` on new message, `idle` as fallback |
| Hooks not installed / Python fails | No status updates | `thinking` on new message, `idle` via `stop_hook_summary` |
| Session resumed from history | N/A (no hooks for past turns) | Skips old entries (`skipStatus = true`), starts fresh |

The transcript's `stop_hook_summary` entry acts as a guaranteed fallback for `idle` — it is always written by Claude Code at the end of every turn regardless of hook health.

---

## Session Lifecycle

```
New session detected (new .jsonl file)
        │
        ▼
sessionManager.add() → initial status: thinking
ClaudeLogWatcher created (skipStatus = false, reads from start)
        │
        ▼
Agent runs turns (status cycles as above)
        │
        ▼
Terminal closed
        │
        ▼
sessionManager.remove() → session gone from board

── OR ──

Session persisted across restart
        │
        ▼
sessionLoader loads session → status: idle
ClaudeLogWatcher created (skipStatus = true, replays history for metrics only)
skipStatus → false, watches for new lines going forward
```

---

## Key Files

| File | Role |
|------|------|
| `src/hooks/hookServer.ts` | HTTP server on port 3456 receiving hook events |
| `src/hooks/hookEventHandler.ts` | Maps hook events to status changes |
| `src/hooks/hookInstaller.ts` | Installs Python hook script + registers events in `~/.claude/settings.json` |
| `src/parsers/transcriptParser.ts` | Parses `.jsonl` lines for status and metrics |
| `src/watchers/claudeLogWatcher.ts` | Watches the `.jsonl` file and feeds lines to the parser |
| `src/managers/sessionManager.ts` | Single source of truth for session state |
