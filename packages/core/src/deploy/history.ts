import fs from 'fs-extra';
import path from 'path';

export interface DeployRecord {
    id: string;
    version: string;
    imageTag: string;
    environment: 'staging' | 'production';
    timestamp: string;
    duration: number;
    status: 'success' | 'failure' | 'rolled-back';
    gitSha: string;
    deployedBy: string;
    servers?: string[];
    notes?: string;
}

export class DeployHistory {
    private historyPath: string;

    constructor(cwd: string, historyFile = '.kode/deploy-history.json') {
        this.historyPath = path.join(cwd, historyFile);
    }

    async load(): Promise<DeployRecord[]> {
        try {
            if (!(await fs.pathExists(this.historyPath))) return [];
            return await fs.readJson(this.historyPath);
        } catch {
            return [];
        }
    }

    async append(record: DeployRecord): Promise<void> {
        const records = await this.load();
        records.unshift(record); // newest first
        await fs.ensureDir(path.dirname(this.historyPath));
        await fs.writeJson(this.historyPath, records, { spaces: 2 });
    }

    async getLatest(
        environment: 'staging' | 'production',
        count = 5
    ): Promise<DeployRecord[]> {
        const records = await this.load();
        return records
            .filter((r) => r.environment === environment)
            .slice(0, count);
    }

    async updateStatus(
        id: string,
        status: DeployRecord['status']
    ): Promise<void> {
        const records = await this.load();
        const idx = records.findIndex((r) => r.id === id);
        if (idx !== -1) {
            records[idx].status = status;
            await fs.writeJson(this.historyPath, records, { spaces: 2 });
        }
    }

    generateId(): string {
        return `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
}