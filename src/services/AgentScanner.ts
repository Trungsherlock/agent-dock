import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AgentInfo {
    name: string;
    description: string;
    model: string;
    tools: string[];
    skills: string[];
    scope: 'global' | 'project';
    filePath: string;
}

export class AgentScanner {
    async scanAll(projectRoot: string): Promise<AgentInfo[]> {
        console.log('[AgentScanner] scanning', projectRoot);

        const globalDir = path.join(os.homedir(), '.claude', 'agents');
        const projectDir = path.join(projectRoot, '.claude', 'agents');

        const [projectAgents, globalAgents] = await Promise.all([
            this._scanDir(projectDir, 'project'),
            this._scanDir(globalDir, 'global'),
        ]);

        const seen = new Set<string>();
        const result: AgentInfo[] = [];

        for (const agent of [...projectAgents, ...globalAgents]) {
            if (!seen.has(agent.name)) {
                seen.add(agent.name);
                result.push(agent);
            }
        }
        return result;
    }

    private async _scanDir(dir: string, scope: 'global' | 'project'): Promise<AgentInfo[]> {
        if (!fs.existsSync(dir)) { return []; }

        let entries: string[];
        try {
            entries = fs.readdirSync(dir);
        } catch (e) {
            console.warn(`[AgentScanner] Could not read agents directory: ${dir}`, e);
            return [];
        }

        const agents: AgentInfo[] = [];
        for (const entry of entries) {
            if (!entry.endsWith('.md')) { continue; }
            const filePath = path.join(dir, entry);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const parsed = this._parseFrontmatter(content);
                if (!parsed || !parsed.fields['name']) {
                    console.warn(`[AgentScanner] No name in frontmatter: ${filePath}, skipping`);
                    continue;
                }

                const fields: Record<string, string> = parsed.fields;

                agents.push({
                    name: fields['name'],
                    description: fields['description'],
                    model: fields['model'] || 'Inherit from parent',
                    tools: fields['tools'] ? fields['tools'].split(',').map(t => t.trim()).filter(Boolean) : [],
                    skills: parsed.skills,
                    scope,
                    filePath,
                });
            } catch (e) {
                console.warn(`[AgentScanner] Error reading agent at ${filePath}:`, e);
            }
        }
        return agents;
    }

    private _parseFrontmatter(content: string): {fields: Record<string, string>; skills: string[] } | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) { return null; }

        const raw = match[1];
        const fields: Record<string, string> = {};
        const result = { fields, skills: [] as string[] };

        const skillsMatch = raw.match(/^skills:\s*\n((?:[ \t]+-[^\n]*\n?)*)/m);
        if (skillsMatch) {
            result.skills = skillsMatch[1]
                .split('\n')
                .map(l => l.replace(/^\s*-\s*/, '').replace(/^"|"$/g, '').trim())
                .filter(Boolean);
        }

        for (const line of raw.split('\n')) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) { continue; }
            const key = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            if (key && key !== 'skills') { fields[key] = value.replace(/^"|"$/g, ''); }
        }

        return result;
    }
}