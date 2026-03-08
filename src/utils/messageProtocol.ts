import { SessionStatus, ToolCall } from '../models/session';

export interface SerializeSession {
    id: string;
    name: string;
    cohortId: string;
    status: SessionStatus;
    createdAt: string;
    note: string;
    framework: string;
    currentTask?: string;
    filesTouched: string[];
    toolCalls: ToolCall[];
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    contextWindowUsed: number;
    contextWindowMax: number;
    updatedAt: string;
}

export interface SerializedCohort {
    id: string;
    label: string,
}

export type ExtensionMessage =
    | { command: 'stateUpdate'; sessions: SerializeSession[], cohorts: SerializedCohort[] };


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


export function serializeSession(s: import('../models/session').Session): SerializeSession {
    return {
        id: s.id,
        name: s.name,
        cohortId: s.cohortId,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        note: s.note,
        framework: s.framework,
        currentTask: s.currentTask,
        filesTouched: s.filesTouched,
        toolCalls: s.toolCalls,
        tokensInput: s.tokensInput,
        tokensOutput: s.tokensOutput,
        costUsd: s.costUsd,
        contextWindowUsed: s.contextWindowUsed,
        contextWindowMax: s.contextWindowMax,
        updatedAt: s.updatedAt.toISOString(),
    };
}