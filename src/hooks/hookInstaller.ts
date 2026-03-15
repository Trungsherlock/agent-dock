import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HOOK_SCRIPT_NAME = 'agent-dock-hook.py';
const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'PermissionRequest'];

const HOOK_SCRIPT = `#!/usr/bin/env python3
import sys, json
try:
    import urllib.request
    data = json.load(sys.stdin)
    req = urllib.request.Request(
        "http://localhost:3456/hook",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    urllib.request.urlopen(req, timeout=1)
except Exception:
    pass
`;

export function installHooks(): void {
    const claudeDir = path.join(os.homedir(), '.claude');
    const scriptPath = path.join(claudeDir, HOOK_SCRIPT_NAME);
    // On Windows the 'python3' alias may not exist — use 'python'.
    // On macOS/Linux, 'python3' is the correct name.
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const hookCommand = `${pythonBin} "${scriptPath}"`;

    fs.mkdirSync(claudeDir, { recursive: true });

    fs.writeFileSync(scriptPath, HOOK_SCRIPT, { mode: 0o755 });

    const settingsPath = path.join(claudeDir, 'settings.json');
    let settings: Record<string, unknown> = {};
    try {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        settings = JSON.parse(raw);
    } catch (e: unknown) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
            console.warn('[HookInstaller] settings.json is unreadable or malformed — skipping hook installation:', e);
            return;
        }
    }

    const hooks = (settings['hooks'] ?? {}) as Record<string, unknown[]>;
    let changed = false;

    for (const event of HOOK_EVENTS) {
        const existing = (hooks[event] ?? []) as Array<{ hooks?: Array<{ command?: string }> }>;
        const alreadyRegistered = existing.some(e => e.hooks?.some(h => h.command === hookCommand));
        if (!alreadyRegistered) {
            hooks[event] = [...existing, { hooks: [{ type: 'command', command: hookCommand }] }];
            changed = true;
        }
    }

    if (changed) {
        settings['hooks'] = hooks;
        const tmpPath = settingsPath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2));
        fs.renameSync(tmpPath, settingsPath);
    }
}