import { SessionStatus } from '../models/session';

export interface SerializeSession {
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
    | { command: 'stateUpdate'; sessions: SerializeSession[], categories: SerializedCategory[] };


export type WebviewMessage = 
    | { command: 'ready' }
    | { command: 'newSession' }
    | { command: 'focusSession'; sessionId: string }
    | { command: 'endSession'; sessionId: string }
    | { command: 'renameSession'; sessionId: string; newName: string }
    | { command: 'moveSession'; sessionId: string; newCategoryId: string }
    | { command: 'setNote'; sessionId: string; note: string };

export function serializeSession(s: import('../models/session').Session): SerializeSession {
    return {
        id: s.id,
        name: s.name,
        categoryId: s.categoryId,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        note: s.note,
    };
}