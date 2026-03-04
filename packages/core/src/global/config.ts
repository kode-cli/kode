import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const KODE_DIR = path.join(os.homedir(), '.kode');
const CONFIG_FILE = path.join(KODE_DIR, 'config.json');

export interface GlobalConfig {
    ANTHROPIC_API_KEY?: string;
    [key: string]: string | undefined;
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
    try {
        if (!(await fs.pathExists(CONFIG_FILE))) return {};
        return await fs.readJson(CONFIG_FILE);
    } catch {
        return {};
    }
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
    await fs.ensureDir(KODE_DIR);
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    // Only current user can read — protects API keys
    await fs.chmod(CONFIG_FILE, 0o600);
    await fs.chmod(KODE_DIR, 0o700);
}

export async function setGlobalConfigValue(key: string, value: string): Promise<void> {
    const config = await readGlobalConfig();
    config[key] = value;
    await writeGlobalConfig(config);
}

export async function getGlobalConfigValue(key: string): Promise<string | undefined> {
    const config = await readGlobalConfig();
    return config[key];
}

export async function deleteGlobalConfigValue(key: string): Promise<void> {
    const config = await readGlobalConfig();
    delete config[key];
    await writeGlobalConfig(config);
}

// Called once at startup in bin/run.js — injects stored values into
// process.env so all existing code that reads process.env.X works unchanged.
// Shell always wins — only sets if the var isn't already in the environment.
export async function injectGlobalConfig(): Promise<void> {
    const config = await readGlobalConfig();
    for (const [key, value] of Object.entries(config)) {
        if (value && !process.env[key]) {
            process.env[key] = value;
        }
    }
}

export function getKodeDir(): string { return KODE_DIR; }
export function getConfigFilePath(): string { return CONFIG_FILE; }