import * as vscode from 'vscode';

export type SessionStatus = 'running' | 'thinking' | 'idle' | 'done' | 'error';

export type AgentFramework = 'claude' | 'custom';

export interface ToolCall {
    id: string;
    name: string;
    input: string;
    output?: string;
    status: 'running' | 'done' | 'error';
    startedAt: number;
    durationMs?: number;
}

export interface Session {
    id: string;
    name: string;
    cohortId: string;
    status: SessionStatus;
    createdAt: Date;
    terminal?: vscode.Terminal;
    note: string;
    framework: AgentFramework;
    parentId?: string;
    pid?: number;
    currentTask?: string;
    currentTool?: { name: string; target: string };
    filesTouched: string[];
    toolCalls: ToolCall[];
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    contextWindowUsed: number;
    contextWindowMax: number;
    updatedAt: Date;
    claudeLogFile?: string;
    waitingForPermission?: boolean;
}