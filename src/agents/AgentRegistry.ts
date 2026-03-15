import { AgentDriver } from './AgentDriver';

export class AgentRegistry {
    private _drivers = new Map<string, AgentDriver>();

    register(driver: AgentDriver): void {
        this._drivers.set(driver.id, driver);
    }

    getById(id: string): AgentDriver | undefined {
        return this._drivers.get(id);
    }

    detectTerminal(terminalName: string): AgentDriver | undefined {
        for (const driver of this._drivers.values()) {
            if (driver.detectTerminal(terminalName)) { return driver; }
        }
        return undefined;
    }

    getDefault(): AgentDriver | undefined {
        return this._drivers.values().next().value as AgentDriver | undefined;
    }

    getAll(): AgentDriver[] {
        return Array.from(this._drivers.values());
    }
}
