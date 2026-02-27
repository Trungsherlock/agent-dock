export type SessionStatus = 'active' | 'idle' | 'done';

export interface SerializedSession {
    id: string;
    name: string;
    categoryId: string;
    status: SessionStatus;
    createdAt: string;
    note: string;
}

export interface SerializedCategory {
    id: string;
    label: string,
    icon: string;
    color: string;
}

export type ExtensionMessage =
    | { command: 'stateUpdate'; sessions: SerializedSession[], categories: SerializedCategory[] };

export type WebviewMessage =
    | { command: 'ready' }
    | { command: 'newSession' }
    | { command: 'focusSession';   sessionId: string }
    | { command: 'endSession';     sessionId: string }
    | { command: 'renameSession';  sessionId: string; newName: string }
    | { command: 'moveSession';    sessionId: string; newCategoryId: string }
    | { command: 'setNote';        sessionId: string; note: string };
