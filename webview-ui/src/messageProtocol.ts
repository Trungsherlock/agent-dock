export type SessionStatus = 'running' | 'thinking' | 'idle' | 'error';

export interface SerializedSession {
    id: string;
    name: string;
    cohortId: string;
    status: SessionStatus;
    createdAt: string;
    note: string;
    framework: string;
    currentTask?: string;
    currentTool?: { name: string; target: string };
    filesTouched: string[];
    toolCalls: {
        id: string;
        name: string;
        input: string;
        output?: string;
        status: 'running' | 'done' | 'error';
        startedAt: number;
        durationMs?: number;
    }[];
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    contextWindowUsed: number;
    contextWindowMax: number;
    waitingForPermission?: boolean;
    skills?: string[];
    updatedAt: string;
}

export interface SerializedCohort {
    id: string;
    label: string;
}

export interface ArchivedSession {
    id: string;
    name: string;
    claudeLogFile: string;
    createdAt: string;
}

export type ExtensionMessage =
    | { command: 'stateUpdate'; sessions: SerializedSession[]; cohorts: SerializedCohort[] }
    | { command: 'archivedSessionsUpdate'; sessions: ArchivedSession[] };

export type WebviewMessage =
    | { command: 'ready' }
    | { command: 'newSession'; cohortId: string }
    | { command: 'focusSession'; sessionId: string }
    | { command: 'endSession'; sessionId: string }
    | { command: 'renameSession'; sessionId: string; newName: string }
    | { command: 'moveSession'; sessionId: string; newCohortId: string }
    | { command: 'setNote'; sessionId: string; note: string }
    | { command: 'setStatus'; sessionId: string; status: SessionStatus }
    | { command: 'createCohort'; label: string }
    | { command: 'renameCohort'; cohortId: string; newLabel: string }
    | { command: 'deleteCohort'; cohortId: string }
    | { command: 'resumeSession'; sessionId: string }
    | { command: 'getArchivedSessions' }
    | { command: 'addExistingSession'; sessionId: string }
    | { command: 'openAddAgentPanel'; cohortId: string }
    | { command: 'openFile'; filePath: string };
