export const SESSIONS_KEY = 'agentdock.sessions';
export const COHORTS_KEY = 'agentdock.cohorts';
export const CLAUDE_CODE_AGENT_PREFIX = 'Claude Code';
export const NAMES_KEY = 'agentdock.sessionNames';
export const SKILLS_KEY = 'agentdock.sessionSkills';

export interface PersistedSession {
    id: string;
    name: string;
    cohortId: string;
    note: string;
    status: string;
    claudeLogFile?: string;
    terminalCreationName?: string;
    skills?: string[];
}

export interface ArchivedSession {
    id: string;
    name: string;
    claudeLogFile: string;
    createdAt: string;
    skills?: string[];
}