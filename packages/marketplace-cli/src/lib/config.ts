import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Config {
  apiKey?: string;
  apiUrl?: string;
  infraUrl?: string;
  infraToken?: string;
  vendorId?: string;
  lastDeploymentId?: string;
  lastRunpodId?: string;
}

const CONFIG_DIR = join(homedir(), ".mp");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Load configuration from ~/.mp/config.json
 */
export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Save configuration to ~/.mp/config.json
 */
export async function saveConfig(config: Config): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to save config: ${error}`);
  }
}

/**
 * Update configuration with new values
 */
export async function updateConfig(updates: Partial<Config>): Promise<Config> {
  const current = await loadConfig();
  const updated = { ...current, ...updates };
  await saveConfig(updated);
  return updated;
}
