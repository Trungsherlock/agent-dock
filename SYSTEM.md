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

Claude Code fires HTTP POST requests to `127.0.0.1:3456/hook` at key lifecycle moments. These are real-time but have ~100ms latency (Python startup cost).

| Hook Event | Effect |
|------------|--------|
| `PreToolUse` | `running` + sets `currentTool` |
| `PostToolUse` | `thinking` + clears `currentTool` + clears `waitingForPermission` |
| `Stop` | `idle` + clears `currentTool` + clears `waitingForPermission` |
| `SubagentStop` | `idle` + clears `currentTool` + clears `waitingForPermission` |
| `PermissionRequest` | sets `waitingForPermission = true` + sets `currentTool` if not already set |

Hooks are installed into `~/.claude/settings.json` via a Python script (`agent-dock-hook.py`) at extension activation. The script silently ignores failures, so hooks are best-effort.

> **Windows note**: The hook script uses `http://127.0.0.1:3456/hook` (not `localhost`) to avoid Windows resolving `localhost` to `::1` (IPv6) while the server listens on IPv4 only.

> **Timing caveat**: Fast tools (Edit, Read) complete in < 50ms, which is faster than hook delivery (~100ms Python startup). This means `PreToolUse` / `PostToolUse` hooks arrive too late to show `currentTool` for quick operations. `running` status and `currentTool` for tool execution are driven by the transcript instead (see below).

### 2. Transcript File Watcher (`src/watchers/claudeLogWatcher.ts` + `src/parsers/transcriptParser.ts`)

Claude Code writes a `.jsonl` log file for each session under `~/.claude/projects/<encoded-path>/<session-id>.jsonl`. The watcher monitors this file for new lines and parses them.

| JSONL Entry | Effect | Condition |
|-------------|--------|-----------|
| `{ type: "assistant" }` with `tool_use` blocks | `running` + sets `currentTool` to first tool | Only when `!skipStatus` |
| `{ type: "assistant" }` | updates metrics (tokens, tool calls, files touched) | Always |
| `{ type: "user" }` human message | `thinking` + clears `currentTool` | Only when `!skipStatus` |
| `{ type: "user" }` tool result | clears `currentTool` | Only when `!skipStatus` |
| `{ type: "system", subtype: "stop_hook_summary" }` | `idle` | Always, including during initial load |

#### Why `assistant` entries drive `running` / `currentTool`

The `assistant` entry (containing `tool_use` blocks) is written to the JSONL **before** the tool runs. This makes it the earliest reliable signal that a tool is about to execute — earlier than `PreToolUse` hooks, which have ~100ms Python startup latency. Using the transcript ensures `currentTool` is visible even for tools that complete in milliseconds.

#### Distinguishing human messages from tool results

Both human messages and tool results appear as `type: "user"` in the transcript. The parser uses `isHumanTurn()` to tell them apart:
- **Human message**: `content` is a string, or an array containing at least one `{ type: "text" }` block
- **Tool result**: `content` is an array containing only `{ type: "tool_result" }` blocks

Human messages trigger `thinking` + clear `currentTool`. Tool results only clear `currentTool`.

#### `skipStatus` on initial load

When a session is loaded from a persisted or archived transcript (resume, startup), the watcher reads the full file history with `skipStatus = true`. This prevents old entries from affecting status or `currentTool`. After the initial read completes, `skipStatus` is set to `false` so future new lines are processed normally.

---

## Full Turn Lifecycle

```
User sends a message
        │
        ▼
[Transcript] user entry (human) → thinking, currentTool cleared
        │
        ▼  (agent starts reasoning, no tool yet)
        │
        ▼
[Transcript] assistant entry (tool_use blocks) → running, currentTool set
        │
        ▼
[Hook] PermissionRequest (if approval needed) → waitingForPermission = true
        │                                        currentTool set if not already
        ▼  (user approves in terminal)
[Hook] PreToolUse → running, currentTool set (redundant but harmless)
        │
        ▼  (tool executes)
        │
[Hook] PostToolUse → thinking, currentTool cleared, waitingForPermission cleared
[Transcript] user entry (tool result) → currentTool cleared (fallback)
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
| Hooks installed and working | Handles `waitingForPermission`, `idle` precisely; `running`/`currentTool` as backup | Drives `running`/`currentTool` (earlier signal); `thinking` on new message; `idle` as fallback |
| Fast tools (Edit, Read < 50ms) | `PreToolUse`/`PostToolUse` arrive too late | `assistant` entry sets `currentTool` before tool runs ✓ |
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
| `src/hooks/hookServer.ts` | HTTP server on port 3456 bound to `127.0.0.1`, receiving hook events |
| `src/hooks/hookEventHandler.ts` | Maps hook events to status/`currentTool`/`waitingForPermission` changes |
| `src/hooks/hookInstaller.ts` | Installs Python hook script + registers events in `~/.claude/settings.json` |
| `src/parsers/transcriptParser.ts` | Parses `.jsonl` lines for status, `currentTool`, and metrics |
| `src/watchers/claudeLogWatcher.ts` | Watches the `.jsonl` file and feeds lines to the parser |
| `src/managers/sessionManager.ts` | Single source of truth for session state |
| `webview-ui/src/components/Card.tsx` | Renders `currentTool` row and "needs approval" button |
