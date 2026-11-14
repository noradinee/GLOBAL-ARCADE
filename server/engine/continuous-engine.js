/**
 * continuous-engine.js
 *
 * Permanent Autonomous Background Engine for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Runs as a durable, continuous background service:
 * - Operates independently of user terminals, browser sessions, or local agent interfaces.
 * - Manages the continuous loop:
 *   DISCOVER → DEDUPLICATE → ACQUIRE → INSPECT → QUALIFY → REPAIR → RUNTIME TEST → PUBLISH OR OWNER REVIEW.
 * - Controlled via Admin Dashboard (start, pause, resume, stop, source toggles, concurrency, polling rate).
 * - No arbitrary daily game limit: processes as many qualifying candidates as resources and source quotas allow.
 * - Preserves state across restarts and resumes interrupted jobs.
 */

import { ConfigManager, ENGINE_STATUS } from './config-manager.js';
import { JobQueue, JOB_STATUS } from './job-queue.js';
import { WorkerPool } from './worker-pool.js';
import { discoverFromGitHub } from '../../scripts/discovery/discover-github.js';
import { discoverFromGitLab } from '../../scripts/discovery/discover-gitlab.js';
import { discoverFromCodeberg } from '../../scripts/discovery/discover-codeberg.js';
import { discoverFromItch } from '../../scripts/discovery/discover-itch.js';
import { discoverFromCommunity } from '../../scripts/discovery/discover-community.js';
import { discoverFromOpenWeb } from '../../scripts/discovery/discover-open-web.js';
import { normalizeRepoUrl } from '../../scripts/discovery/normalizer-utils.js';
import { getCandidatePriorityScore } from '../../scripts/discovery/orchestrator.js';

export class ContinuousEngine {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.rootDir]
   */
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.configManager = new ConfigManager({ rootDir: this.rootDir });
    this.jobQueue = new JobQueue({ rootDir: this.rootDir });
    this.workerPool = new WorkerPool({
      jobQueue: this.jobQueue,
      configManager: this.configManager,
      rootDir: this.rootDir,
    });

    this.autoDiscover = options.autoDiscover !== undefined ? options.autoDiscover : true;
    this.isLoopRunning = false;
    this.loopTimer = null;
    this.lastDiscoveryTime = null;
    this.isDiscovering = false;
    this.consecutiveFailures = 0;
  }

  /**
   * Starts the continuous autonomous background engine.
   */
  start() {
    this.configManager.updateConfig({ status: ENGINE_STATUS.RUNNING });
    console.log(`🚀 [CONTINUOUS ENGINE] Background engine started in RUNNING mode.`);

    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      this.runEngineTick();
    }
  }

  /**
   * Pauses the background engine.
   * In-flight workers will finish their current job, but no new jobs will be dequeued.
   */
  pause() {
    this.configManager.updateConfig({ status: ENGINE_STATUS.PAUSED });
    console.log(`⏸️ [CONTINUOUS ENGINE] Background engine PAUSED. Active workers will finish gracefully.`);
  }

  /**
   * Resumes the paused background engine.
   */
  resume() {
    this.start();
  }

  /**
   * Stops the background engine and drains workers.
   *
   * @returns {Promise<void>}
   */
  async stop() {
    this.configManager.updateConfig({ status: ENGINE_STATUS.STOPPED });
    console.log(`🛑 [CONTINUOUS ENGINE] Stopping background engine...`);

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.isLoopRunning = false;

    await this.workerPool.drain();
    console.log(`✅ [CONTINUOUS ENGINE] Engine stopped cleanly.`);
  }

  /**
   * Main scheduler tick.
   * Dispatches queued jobs to free worker slots, or triggers discovery if queue is empty.
   */
  async runEngineTick() {
    if (!this.isLoopRunning) return;

    const config = this.configManager.getConfig();

    try {
      if (config.status === ENGINE_STATUS.RUNNING) {
        // 1. Dispatch as many queued jobs as available worker slots allow
        let dispatched = false;
        while (this.workerPool.hasAvailableSlot()) {
          const didDispatch = await this.workerPool.dispatchNext();
          if (didDispatch) {
            dispatched = true;
          } else {
            break; // No more queued jobs
          }
        }

        // 2. If queue has room or is empty, evaluate triggering fresh discovery
        const summary = this.jobQueue.getPipelineSummary();
        const queuedCount = summary.byStatus.QUEUED;

        const now = Date.now();
        const pollIntervalMs = (config.pollIntervalSec || 120) * 1000;
        const timeSinceLastDiscovery = this.lastDiscoveryTime ? now - this.lastDiscoveryTime : Infinity;

        if (this.autoDiscover && queuedCount === 0 && !this.isDiscovering && timeSinceLastDiscovery >= pollIntervalMs) {
          // Trigger autonomous discovery cycle in background
          this.triggerDiscoveryCycle().catch(err => {
            console.error(`❌ [CONTINUOUS ENGINE] Discovery cycle error: ${err.message}`);
          });
        }
      }
    } catch (err) {
      console.error(`❌ [CONTINUOUS ENGINE] Error in engine loop: ${err.message}`);
      this.consecutiveFailures++;
    }

    // Schedule next tick (with exponential backoff if consecutive failures occurred)
    const backoffMs = Math.min(30000, 2000 * Math.pow(1.5, Math.min(this.consecutiveFailures, 5)));
    this.loopTimer = setTimeout(() => {
      this.runEngineTick();
    }, backoffMs);
  }

  /**
   * Executes a discovery cycle across all enabled sources and enqueues fresh candidates.
   *
   * @param {Object} [options={}]
   * @returns {Promise<{ discovered: number, enqueued: number }>}
   */
  async triggerDiscoveryCycle(options = {}) {
    if (this.isDiscovering) {
      return { discovered: 0, enqueued: 0 };
    }

    this.isDiscovering = true;
    this.lastDiscoveryTime = Date.now();
    const config = this.configManager.getConfig();
    const enabled = config.enabledSources || {};

    console.log(`\n🔍 [CONTINUOUS ENGINE] Initiating autonomous discovery across enabled sources...`);
    const discoveredCandidates = [];

    // Query each enabled source with error isolation
    if (enabled.github) {
      try {
        const gh = await discoverFromGitHub({ maxResults: 15 });
        discoveredCandidates.push(...gh);
      } catch (e) {
        console.warn(`⚠️ GitHub source query warning: ${e.message}`);
      }
    }

    if (enabled.gitlab) {
      try {
        const gl = await discoverFromGitLab({ maxResults: 15 });
        discoveredCandidates.push(...gl);
      } catch (e) {
        console.warn(`⚠️ GitLab source query warning: ${e.message}`);
      }
    }

    if (enabled.codeberg) {
      try {
        const cb = await discoverFromCodeberg({ maxResults: 15 });
        discoveredCandidates.push(...cb);
      } catch (e) {
        console.warn(`⚠️ Codeberg source query warning: ${e.message}`);
      }
    }

    if (enabled.itch) {
      try {
        const itch = await discoverFromItch({ maxResults: 10 });
        discoveredCandidates.push(...itch);
      } catch (e) {
        console.warn(`⚠️ itch.io source query warning: ${e.message}`);
      }
    }

    if (enabled.hackernews) {
      try {
        const hn = await discoverFromCommunity({ maxResults: 10 });
        discoveredCandidates.push(...hn);
      } catch (e) {
        console.warn(`⚠️ Hacker News source query warning: ${e.message}`);
      }
    }

    if (enabled.openweb) {
      try {
        const ow = await discoverFromOpenWeb({ maxResults: 10 });
        discoveredCandidates.push(...ow);
      } catch (e) {
        console.warn(`⚠️ Open Web source query warning: ${e.message}`);
      }
    }

    // Deduplicate & rank discovered candidates
    discoveredCandidates.sort((a, b) => getCandidatePriorityScore(b) - getCandidatePriorityScore(a));

    let enqueuedCount = 0;
    const maxBatch = config.maxCandidatesPerBatch > 0 ? config.maxCandidatesPerBatch : Infinity;

    for (const cand of discoveredCandidates) {
      if (enqueuedCount >= maxBatch) break;
      const res = this.jobQueue.enqueue(cand, { priority: getCandidatePriorityScore(cand) });
      if (res.enqueued) {
        enqueuedCount++;
      }
    }

    console.log(`✨ [CONTINUOUS ENGINE] Discovery cycle complete: discovered ${discoveredCandidates.length} candidate(s), enqueued ${enqueuedCount} fresh job(s).`);
    this.isDiscovering = false;
    this.consecutiveFailures = 0;

    return {
      discovered: discoveredCandidates.length,
      enqueued: enqueuedCount,
    };
  }

  /**
   * Returns current operational engine status and metrics.
   *
   * @returns {Object}
   */
  getStatus() {
    const config = this.configManager.getConfig();
    const summary = this.jobQueue.getPipelineSummary();

    return {
      status: config.status,
      isLoopRunning: this.isLoopRunning,
      isDiscovering: this.isDiscovering,
      lastDiscoveryTime: this.lastDiscoveryTime ? new Date(this.lastDiscoveryTime).toISOString() : null,
      activeWorkers: summary.activeWorkers,
      pipelineSummary: summary,
      config,
    };
  }
}
