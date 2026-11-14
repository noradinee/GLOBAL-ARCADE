/**
 * config-manager.js
 *
 * Persistent Engine Configuration Manager for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Persists autonomous background engine settings to durable storage in data/engine-config.json.
 * Allows administrators to update concurrency, polling intervals, source toggles,
 * automatic repair, and automatic publishing in real time from the Admin Dashboard.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ENGINE_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  IDLE: 'IDLE',
  STOPPED: 'STOPPED',
});

export const DEFAULT_ENGINE_CONFIG = Object.freeze({
  status: ENGINE_STATUS.RUNNING,
  workerConcurrency: 2,
  pollIntervalSec: 120,
  requestDelayMs: 1000,
  autonomousAcquisition: true,
  autonomousRepair: true,
  autonomousPublishing: true,
  enabledSources: {
    github: true,
    gitlab: true,
    codeberg: true,
    itch: true,
    hackernews: true,
    openweb: true,
  },
  maxCandidatesPerBatch: 0, // 0 = unlimited continuous discovery
  retryLimit: 3,
  backoffBaseMs: 5000,
  lastUpdated: null,
});

export class ConfigManager {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.rootDir]
   * @param {string} [options.configPath]
   */
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.configPath = options.configPath || path.join(this.rootDir, 'data/engine-config.json');
    this.config = this.loadConfig();
  }

  /**
   * Loads config from disk, or initializes defaults if not found.
   *
   * @returns {Object} Engine configuration
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_ENGINE_CONFIG,
          ...parsed,
          enabledSources: {
            ...DEFAULT_ENGINE_CONFIG.enabledSources,
            ...(parsed.enabledSources || {}),
          },
        };
      }
    } catch (err) {
      console.warn(`⚠️ [CONFIG MANAGER] Failed to load config from ${this.configPath}: ${err.message}. Using defaults.`);
    }

    const initial = {
      ...DEFAULT_ENGINE_CONFIG,
      lastUpdated: new Date().toISOString(),
    };
    this.saveConfig(initial);
    return initial;
  }

  /**
   * Persists configuration to durable disk storage.
   *
   * @param {Object} [configToSave]
   */
  saveConfig(configToSave = this.config) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error(`❌ [CONFIG MANAGER] Failed to write config to ${this.configPath}: ${err.message}`);
    }
  }

  /**
   * Returns current active engine configuration clone.
   *
   * @returns {Object}
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Updates configuration fields with runtime bounds validation.
   *
   * @param {Object} updates
   * @returns {Object} Updated configuration
   */
  updateConfig(updates = {}) {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Config updates must be an object.');
    }

    if (updates.status && !Object.values(ENGINE_STATUS).includes(updates.status)) {
      throw new Error(`Invalid engine status "${updates.status}". Valid statuses: ${Object.values(ENGINE_STATUS).join(', ')}`);
    }

    if (updates.workerConcurrency !== undefined) {
      const c = Number(updates.workerConcurrency);
      if (!Number.isInteger(c) || c < 1 || c > 10) {
        throw new Error('workerConcurrency must be an integer between 1 and 10.');
      }
      this.config.workerConcurrency = c;
    }

    if (updates.pollIntervalSec !== undefined) {
      const p = Number(updates.pollIntervalSec);
      if (!Number.isFinite(p) || p < 10 || p > 86400) {
        throw new Error('pollIntervalSec must be between 10 seconds and 86400 seconds (24h).');
      }
      this.config.pollIntervalSec = Math.round(p);
    }

    if (updates.requestDelayMs !== undefined) {
      const d = Number(updates.requestDelayMs);
      if (!Number.isFinite(d) || d < 0 || d > 60000) {
        throw new Error('requestDelayMs must be between 0 and 60000ms.');
      }
      this.config.requestDelayMs = Math.round(d);
    }

    if (updates.autonomousAcquisition !== undefined) {
      this.config.autonomousAcquisition = Boolean(updates.autonomousAcquisition);
    }

    if (updates.autonomousRepair !== undefined) {
      this.config.autonomousRepair = Boolean(updates.autonomousRepair);
    }

    if (updates.autonomousPublishing !== undefined) {
      this.config.autonomousPublishing = Boolean(updates.autonomousPublishing);
    }

    if (updates.maxCandidatesPerBatch !== undefined) {
      const m = Number(updates.maxCandidatesPerBatch);
      this.config.maxCandidatesPerBatch = Number.isFinite(m) && m >= 0 ? Math.round(m) : 0;
    }

    if (updates.enabledSources && typeof updates.enabledSources === 'object') {
      this.config.enabledSources = {
        ...this.config.enabledSources,
        ...updates.enabledSources,
      };
    }

    if (updates.status) {
      this.config.status = updates.status;
    }

    this.config.lastUpdated = new Date().toISOString();
    this.saveConfig(this.config);
    return this.getConfig();
  }
}
