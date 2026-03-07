export const SESSIONS_KEY = 'agentdock.sessions';
export const COHORTS_KEY = 'agentdock.cohorts';

export interface PersistedSession {
    name: string;
    cohortId: string;
    note: string;
    status: string;
    claudeLogFile?: string;
}