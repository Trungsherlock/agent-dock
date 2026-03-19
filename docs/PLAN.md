# Plan: Show Agent MD Files in SubAgent Tab

## Goal

When a user creates an agent via `AddAgentForm`, it saves a `.md` file to `.claude/agents/`.
Read all agent `.md` files from both project and global directories and display them live in the SubAgent tab.

## Data Flow

```
AgentScanner (reads .md files from disk)
  → BoardViewProvider (calls scanner, pushes agentsUpdate message)
    → BoardContext (stores subAgents state)
      → SubAgentTab (renders live agents)
```

Scanned directories:
- Project: `{workspaceRoot}/.claude/agents/*.md`
- Global: `~/.claude/agents/*.md`

---

## Files to Change

| # | File | Type | What |
|---|---|---|---|
| 1 | `src/services/AgentScanner.ts` | New | Reads & parses `.claude/agents/*.md` from project + global |
| 2 | `src/utils/messageProtocol.ts` | Edit | Add `agentsUpdate` message + `AgentInfo` type |
| 3 | `webview-ui/src/messageProtocol.ts` | Edit | Mirror `AgentInfo` interface + `agentsUpdate` message |
| 4 | `src/views/boardViewProvider.ts` | Edit | Add scanner instance, `postAgentsUpdate()` method, file watcher |
| 5 | `src/views/messageHandler.ts` | Edit | Call `postAgentsUpdate()` after agent is created |
| 6 | `webview-ui/src/context/BoardContext.tsx` | Edit | Add `subAgents` state, handle `agentsUpdate` message |
| 7 | `webview-ui/src/components/SubAgentTab.tsx` | Edit | Replace `MOCK_SUBAGENTS` with live `subAgents` from context |
| 8 | `webview-ui/src/components/SubAgentCard.tsx` | Edit | Accept `AgentInfo` directly, wire "Open" button |
| 9 | `webview-ui/src/components/mock-data.tsx` | Delete | No longer used |

---

## Step-by-Step Implementation

### Step 1 — `src/services/AgentScanner.ts` (New File)

Modeled on `SkillScanner`. Exports `AgentInfo` interface and `AgentScanner` class.

```ts
export interface AgentInfo {
    name: string;
    description: string;
    model: string;
    tools: string[];    // comma-split from inline "tools: bash, read_file"
    skills: string[];   // parsed from YAML block list under "skills:"
    scope: 'global' | 'project';
    filePath: string;   // absolute path to the .md file
}
```

`AgentScanner` methods:
- `scanAll(projectRoot: string): Promise<AgentInfo[]>` — scans both dirs concurrently, project-first, deduplicates by name
- `_scanDir(dir, scope): Promise<AgentInfo[]>` — reads each `*.md` file, calls `_parseFrontmatter`, skips entries with no `name`
- `_parseFrontmatter(content)` — reuse same regex from `SkillScanner` (`/^---\r?\n([\s\S]*?)\r?\n---/`)
  - `tools`: split on `, ` and trim
  - `skills`: second pass over raw frontmatter for lines starting with `  - ` after a `skills:` line

### Step 2 — `src/utils/messageProtocol.ts`

```ts
import type { AgentInfo } from '../services/AgentScanner';

// Add to ExtensionMessage union:
| { command: 'agentsUpdate'; agents: AgentInfo[] }
```

### Step 3 — `webview-ui/src/messageProtocol.ts`

Add parallel interface (no backend imports in webview):

```ts
export interface AgentInfo {
    name: string;
    description: string;
    model: string;
    tools: string[];
    skills: string[];
    scope: 'global' | 'project';
    filePath: string;
}

// Add to ExtensionMessage union:
| { command: 'agentsUpdate'; agents: AgentInfo[] }
```

### Step 4 — `src/views/boardViewProvider.ts`

- Add `private readonly _agentScanner = new AgentScanner()`
- Accept `projectRoot` in constructor, store as `private readonly _projectRoot: string`
- Add `public async postAgentsUpdate(): Promise<void>` — scans dirs, posts `agentsUpdate` message
- In `resolveWebviewView`: call `postAgentsUpdate()` on load
- Register `vscode.workspace.createFileSystemWatcher` on `.claude/agents/*.md`:
  - `onDidCreate`, `onDidChange`, `onDidDelete` → call `postAgentsUpdate()`

### Step 5 — `src/views/messageHandler.ts`

- Add optional 7th constructor param `_onAgentsChanged: () => Promise<void>`
- In `openAddAgentPanel` case, call `await this._onAgentsChanged()` after agent is created

In `boardViewProvider.ts`, pass `() => this.postAgentsUpdate()` as that 7th argument.

### Step 6 — `webview-ui/src/context/BoardContext.tsx`

- Import `AgentInfo` from `../messageProtocol`
- Add `subAgents: AgentInfo[]` to `BoardContextValue`
- Add `useState<AgentInfo[]>([])` for `subAgents`
- Handle new message in `useEffect`:
  ```ts
  } else if (msg.command === 'agentsUpdate') {
      setSubAgents(msg.agents);
  }
  ```
- Expose `subAgents` through context provider value

### Step 7 — `webview-ui/src/components/SubAgentTab.tsx`

Replace:
```ts
const subagents = MOCK_SUBAGENTS;
```
With:
```ts
const { subAgents } = useBoardContext();
const subagents = subAgents;
```

Remove `MOCK_SUBAGENTS` import.

### Step 8 — `webview-ui/src/components/SubAgentCard.tsx`

- Import `AgentInfo` from `../messageProtocol`
- Replace local `SubAgent` interface with `AgentInfo`
- Wire "Open" button to post `openFile` message:
  ```ts
  onClick={() => vscode.postMessage({ command: 'openFile', filePath: agent.filePath })}
  ```
- Replace framework badge with scope badge (`project` / `global`)

### Step 9 — Delete `webview-ui/src/components/mock-data.tsx`

No longer referenced after Step 7.

---

## Key Decisions

- **No `workspaceState` storage** — agents always read fresh from disk, never persisted in extension state
- **Global dir** (`~/.claude/agents/`) is not watchable via VSCode API but gets re-scanned on every trigger (startup, after create, project file change)
- **`AgentScanner`** is a direct clone of `SkillScanner` pattern — same frontmatter parser, same deduplication logic
- **`extension.ts`** passes `projectRoot` to `BoardViewProvider` at construction time
