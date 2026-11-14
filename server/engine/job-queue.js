/**
 * job-queue.js
 *
 * Durable Persistent Job Queue Infrastructure for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Requirements:
 * - Jobs survive server restarts and power failures (persisted in data/jobs.json).
 * - Unique job identifiers.
 * - Prevents duplicate concurrent execution of the same candidate or commit.
 * - Tracks job status, execution stage, logs, duration, and error diagnostics.
 * - Automatic crash recovery: restarts interrupted in-flight jobs safely.
 * - Isolates candidate failures so a single broken candidate never halts the engine.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const JOB_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  INTERRUPTED: 'INTERRUPTED',
});

export const PIPELINE_STAGE = Object.freeze({
  DISCOVER: 'DISCOVER',
  DEDUPLICATE: 'DEDUPLICATE',
  ACQUIRE: 'ACQUIRE',
  INSPECT: 'INSPECT',
  QUALIFY: 'QUALIFY',
  REPAIR: 'REPAIR',
  RUNTIME_TEST: 'RUNTIME_TEST',
  PUBLISH: 'PUBLISH',
  OWNER_REVIEW: 'OWNER_REVIEW',
  REJECTED: 'REJECTED',
});

export class JobQueue {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.rootDir]
   * @param {string} [options.storagePath]
   */
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.storagePath = options.storagePath || path.join(this.rootDir, 'data/jobs.json');
    this.jobs = new Map();
    this._saveTimer = null;
    this.loadJobs();
    this.recoverInterruptedJobs();
  }

  /**
   * Loads persisted jobs from disk into memory.
   */
  loadJobs() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.jobs.clear();
          const activeJobs = [];
          const finishedJobs = [];
          for (const j of list) {
            if (!j || !j.id) continue;
            if (j.status === JOB_STATUS.QUEUED || j.status === JOB_STATUS.RUNNING) {
              activeJobs.push(j);
            } else {
              finishedJobs.push(j);
            }
          }
          // Retain latest 300 finished jobs in active working set to prevent memory and event loop bloat
          const recentFinished = finishedJobs.slice(-300);
          for (const j of [...recentFinished, ...activeJobs]) {
            this.jobs.set(j.id, j);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [JOB QUEUE] Failed to load jobs from ${this.storagePath}: ${err.message}. Initializing empty queue.`);
      this.jobs.clear();
    }
  }

  /**
   * Persists jobs to disk storage with debouncing to prevent event loop starvation.
   *
   * @param {boolean} [immediate=false]
   */
  saveJobs(immediate = false) {
    if (immediate) {
      if (this._saveTimer) {
        clearTimeout(this._saveTimer);
        this._saveTimer = null;
      }
      this._flushJobsToDisk();
      return;
    }

    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._flushJobsToDisk();
    }, 1500);
  }

  _flushJobsToDisk() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.jobs.values());
      // Compact JSON write to disk asynchronously
      fs.promises.writeFile(this.storagePath, JSON.stringify(list), 'utf-8')
        .catch(err => console.error(`❌ [JOB QUEUE] Async disk save error: ${err.message}`));
    } catch (err) {
      console.error(`❌ [JOB QUEUE] Failed to write jobs to ${this.storagePath}: ${err.message}`);
    }
  }

  /**
   * On startup, identifies any job left in RUNNING status when server terminated.
   * Marks it INTERRUPTED or safely re-queues it if retries remain.
   */
  recoverInterruptedJobs() {
    let recoveredCount = 0;
    const now = new Date().toISOString();

    for (const job of this.jobs.values()) {
      if (job.status === JOB_STATUS.RUNNING) {
        job.logs.push({
          timestamp: now,
          stage: job.stage || PIPELINE_STAGE.ACQUIRE,
          message: 'Server restart detected while job was RUNNING. Interrupted state safely captured.',
        });

        if (job.retryCount < job.maxRetries) {
          job.status = JOB_STATUS.QUEUED;
          job.retryCount = (job.retryCount || 0) + 1;
          job.logs.push({
            timestamp: now,
            stage: job.stage,
            message: `Auto-recovering interrupted job (attempt ${job.retryCount}/${job.maxRetries}).`,
          });
        } else {
          job.status = JOB_STATUS.INTERRUPTED;
          job.finishedAt = now;
          job.error = 'Job interrupted by server shutdown and reached maximum retry attempts.';
        }
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      console.log(`🛡️ [JOB QUEUE] Recovered ${recoveredCount} interrupted in-flight job(s) from previous session.`);
      this.saveJobs();
    }
  }

  /**
   * Enqueues a candidate for autonomous processing.
   * Prevents duplicate active jobs for the same candidate ID or commit.
   *
   * @param {Object} candidateData
   * @param {Object} [options={}]
   * @returns {Object} { enqueued: boolean, job: Object, reason?: string }
   */
  enqueue(candidateData, options = {}) {
    const candidateId = candidateData.candidateId || candidateData.id;
    if (!candidateId) {
      throw new Error('Cannot enqueue job without candidateId.');
    }

    const commitHash = candidateData.exactCommitHash;
    const repoUrl = candidateData.originalRepoUrl;

    // Check for existing active job or already evaluated candidate
    for (const j of this.jobs.values()) {
      if (j.status === JOB_STATUS.QUEUED || j.status === JOB_STATUS.RUNNING) {
        if (j.candidateId === candidateId) {
          return { enqueued: false, job: j, reason: `Candidate "${candidateId}" already has active job ${j.id}.` };
        }
        if (commitHash && j.exactCommitHash === commitHash && j.originalRepoUrl === repoUrl) {
          return { enqueued: false, job: j, reason: `Commit ${commitHash} already active in job ${j.id}.` };
        }
      } else if (j.status === JOB_STATUS.COMPLETED || j.status === JOB_STATUS.REJECTED || j.stage === PIPELINE_STAGE.OWNER_REVIEW) {
        if (j.candidateId === candidateId && (!commitHash || j.exactCommitHash === commitHash)) {
          return { enqueued: false, job: j, reason: `Candidate "${candidateId}" was already processed in job ${j.id}.` };
        }
      }
    }

    const id = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const job = {
      id,
      candidateId,
      candidateName: candidateData.name || candidateId,
      sourcePlatform: candidateData.sourcePlatform || 'web',
      originalRepoUrl: repoUrl || null,
      exactCommitHash: commitHash || null,
      priority: Number(options.priority ?? candidateData.priorityScore ?? 100),
      status: JOB_STATUS.QUEUED,
      stage: PIPELINE_STAGE.DISCOVER,
      createdAt: timestamp,
      startedAt: null,
      finishedAt: null,
      durationMs: 0,
      retryCount: 0,
      maxRetries: Number(options.maxRetries ?? 3),
      candidateData,
      error: null,
      logs: [
        {
          timestamp,
          stage: PIPELINE_STAGE.DISCOVER,
          message: `Enqueued candidate "${candidateData.name || candidateId}" for autonomous processing.`,
        },
      ],
      result: null,
    };

    this.jobs.set(id, job);
    this.saveJobs();
    return { enqueued: true, job };
  }

  /**
   * Dequeues the next highest-priority QUEUED job.
   *
   * @returns {Object|null}
   */
  dequeue() {
    let bestJob = null;

    for (const job of this.jobs.values()) {
      if (job.status === JOB_STATUS.QUEUED) {
        if (!bestJob || (job.priority || 0) > (bestJob.priority || 0)) {
          bestJob = job;
        }
      }
    }

    if (bestJob) {
      bestJob.status = JOB_STATUS.RUNNING;
      bestJob.startedAt = new Date().toISOString();
      this.saveJobs();
      return bestJob;
    }

    return null;
  }

  /**
   * Updates an existing job's stage, logs, or status.
   *
   * @param {string} jobId
   * @param {Object} updates
   * @returns {Object} Updated job
   */
  updateJob(jobId, updates = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job "${jobId}" not found.`);
    }

    if (updates.stage) {
      job.stage = updates.stage;
    }
    if (updates.status) {
      job.status = updates.status;
      if (updates.status === JOB_STATUS.COMPLETED || updates.status === JOB_STATUS.FAILED || updates.status === JOB_STATUS.CANCELLED) {
        job.finishedAt = new Date().toISOString();
        if (job.startedAt) {
          job.durationMs = Date.now() - new Date(job.startedAt).getTime();
        }
      }
    }
    if (updates.error !== undefined) {
      job.error = updates.error;
    }
    if (updates.result) {
      job.result = updates.result;
    }
    if (updates.logMessage) {
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: job.stage,
        message: updates.logMessage,
      });
    }

    this.saveJobs();
    return job;
  }

  /**
   * Cancels a pending or active job.
   *
   * @param {string} jobId
   * @param {string} [reason='Cancelled by administrator']
   * @returns {Object}
   */
  cancelJob(jobId, reason = 'Cancelled by administrator') {
    return this.updateJob(jobId, {
      status: JOB_STATUS.CANCELLED,
      error: reason,
      logMessage: `Job cancelled: ${reason}`,
    });
  }

  /**
   * Resets a failed or cancelled job back to QUEUED for retry.
   *
   * @param {string} jobId
   * @returns {Object}
   */
  retryJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job "${jobId}" not found.`);
    }

    job.status = JOB_STATUS.QUEUED;
    job.startedAt = null;
    job.finishedAt = null;
    job.error = null;
    job.retryCount = (job.retryCount || 0) + 1;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: job.stage,
      message: `Manually re-queued by administrator (retry attempt ${job.retryCount}).`,
    });

    this.saveJobs();
    return job;
  }

  /**
   * Retrieves a job by ID.
   *
   * @param {string} jobId
   * @returns {Object|null}
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Retrieves filtered and sorted jobs.
   *
   * @param {Object} [filter={}]
   * @returns {Array<Object>}
   */
  getJobs(filter = {}) {
    let list = Array.from(this.jobs.values());

    if (filter.status) {
      list = list.filter(j => j.status === filter.status);
    }
    if (filter.stage) {
      list = list.filter(j => j.stage === filter.stage);
    }
    if (filter.candidateId) {
      list = list.filter(j => j.candidateId === filter.candidateId);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = Number(filter.limit || 100);
    const offset = Number(filter.offset || 0);
    return list.slice(offset, offset + limit);
  }

  /**
   * Generates real-time pipeline status rollup across all stages.
   *
   * @returns {Object}
   */
  getPipelineSummary() {
    const summary = {
      total: this.jobs.size,
      byStatus: {
        QUEUED: 0,
        RUNNING: 0,
        COMPLETED: 0,
        FAILED: 0,
        CANCELLED: 0,
        INTERRUPTED: 0,
      },
      byStage: {
        DISCOVER: 0,
        DEDUPLICATE: 0,
        ACQUIRE: 0,
        INSPECT: 0,
        QUALIFY: 0,
        REPAIR: 0,
        RUNTIME_TEST: 0,
        PUBLISH: 0,
        OWNER_REVIEW: 0,
        REJECTED: 0,
      },
      activeWorkers: 0,
    };

    for (const j of this.jobs.values()) {
      if (summary.byStatus[j.status] !== undefined) {
        summary.byStatus[j.status]++;
      }
      if (summary.byStage[j.stage] !== undefined) {
        summary.byStage[j.stage]++;
      }
      if (j.status === JOB_STATUS.RUNNING) {
        summary.activeWorkers++;
      }
    }

    return summary;
  }
}
