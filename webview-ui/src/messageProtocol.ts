export type SessionStatus = 'active' | 'idle' | 'done';

export interface SerializedSession {
    id: string;
    name: string;
    cohortId: string;
    status: SessionStatus;
    createdAt: string;
    note: string;
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
    | { command: 'deleteCohort'; cohortId: string };
