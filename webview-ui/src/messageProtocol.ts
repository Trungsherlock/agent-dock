export type SessionStatus = 'running' | 'thinking' | 'idle' | 'done' | 'error';

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
    updatedAt: string;
}

export interface SerializedCohort {
    id: string;
    label: string;
}

export type ExtensionMessage =
    | { command: 'stateUpdate'; sessions: SerializedSession[]; cohorts: SerializedCohort[] };

export type WebviewMessage =
    | { command: 'ready' }
    | { command: 'newSession' }
    | { command: 'focusSession'; sessionId: string }
    | { command: 'endSession'; sessionId: string }
    | { command: 'renameSession'; sessionId: string; newName: string }
    | { command: 'moveSession'; sessionId: string; newCohortId: string }
    | { command: 'setNote'; sessionId: string; note: string }
    | { command: 'setStatus'; sessionId: string; status: SessionStatus }
    | { command: 'createCohort'; label: string }
    | { command: 'renameCohort'; cohortId: string; newLabel: string }
    | { command: 'deleteCohort'; cohortId: string }
    | { command: 'resumeSession'; sessionId: string };
