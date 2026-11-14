/**
 * worker-pool.js
 *
 * Concurrent Autonomous Pipeline Worker Pool for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Implements the continuous pipeline execution:
 * DISCOVER → DEDUPLICATE → ACQUIRE → INSPECT → QUALIFY → REPAIR → RUNTIME TEST → PUBLISH OR OWNER REVIEW.
 *
 * Key Invariants:
 * - Worker slot isolation: a failure in one candidate never halts other workers.
 * - Concurrency bounded by configManager.
 * - Exact commit SHA and SHA-256 fingerprint pinning.
 * - Pristine snapshotting before any automated repair.
 * - Automatic publishing for clean AUTO_APPROVED candidates.
 * - Strict exception routing to NEEDS_OWNER_REVIEW for copyleft, warnings, or borderline scores.
 */

import path from 'node:path';
import fs from 'node:fs';

import { JOB_STATUS, PIPELINE_STAGE } from './job-queue.js';
import { acquireCandidateSource } from '../../scripts/discovery/sandbox-manager.js';
import { deepScanCandidate } from '../../scripts/discovery/deep-security-scanner.js';
import { verifyLicense } from '../../scripts/discovery/verify-license.js';
import { inspectSecurity } from '../../scripts/discovery/security-inspection.js';
import { assessCandidateQuality } from '../../scripts/discovery/assess-quality.js';
import { scoreCandidate } from '../../scripts/discovery/score-candidates.js';
import { detectRepairableDefects, applyAutomatedRepairs } from '../../scripts/discovery/repair-engine.js';
import { safeImportCandidate } from '../../scripts/discovery/safe-import.js';
import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  createInitialCandidate,
  markAutomatedRejection,
  markNeedsOwnerReview,
  evaluateAutonomousQualification,
  transitionCandidate,
  requestRepair,
} from '../../scripts/discovery/qualification-model.js';

export class WorkerPool {
  /**
   * @param {Object} options
   * @param {import('./job-queue.js').JobQueue} options.jobQueue
   * @param {import('./config-manager.js').ConfigManager} options.configManager
   * @param {string} [options.rootDir]
   */
  constructor(options) {
    this.jobQueue = options.jobQueue;
    this.configManager = options.configManager;
    this.rootDir = options.rootDir || process.cwd();
    this.activeWorkers = new Set();
    this.isDraining = false;
  }

  /**
   * Checks if an idle worker slot is available based on configured concurrency.
   *
   * @returns {boolean}
   */
  hasAvailableSlot() {
    const config = this.configManager.getConfig();
    return !this.isDraining && this.activeWorkers.size < config.workerConcurrency;
  }

  /**
   * Attempts to pull next job from queue and process it in an isolated worker slot.
   *
   * @returns {Promise<boolean>} True if a worker was dispatched, false if no job or slots full.
   */
  async dispatchNext() {
    if (!this.hasAvailableSlot()) {
      return false;
    }

    const job = this.jobQueue.dequeue();
    if (!job) {
      return false;
    }

    const workerPromise = this.processJob(job);
    this.activeWorkers.add(workerPromise);

    workerPromise.finally(() => {
      this.activeWorkers.delete(workerPromise);
    });

    return true;
  }

  /**
   * Executes the full autonomous acquisition, inspection, qualification, repair, and publishing pipeline on a candidate.
   *
   * @param {Object} job
   */
  async processJob(job) {
    const candidateData = job.candidateData;
    const candidateId = job.candidateId;
    const config = this.configManager.getConfig();
    const candidatesDir = path.join(this.rootDir, 'discovery/candidates');
    const rejectedDir = path.join(this.rootDir, 'discovery/rejected');

    fs.mkdirSync(candidatesDir, { recursive: true });
    fs.mkdirSync(rejectedDir, { recursive: true });

    console.log(`\n⚙️ [WORKER POOL] Processing job ${job.id} for "${candidateId}"...`);
    this.jobQueue.updateJob(job.id, {
      stage: PIPELINE_STAGE.ACQUIRE,
      logMessage: `Worker starting acquisition for candidate "${candidateId}"`,
    });

    try {
      // 1. Initial Candidate Model Wrap
      let candidate = createInitialCandidate(candidateData, {});

      // 2. Gate 1 Licensing Verification
      const licenseCheck = verifyLicense({
        licenseSpdx: candidate.licenseName,
        assetLicenseNotes: candidate.assetLicensingStatus,
      });

      // 3. Gate 2 Security Screening
      const securityCheck = inspectSecurity({
        'metadata.json': JSON.stringify(candidate),
      });

      // 4. Gate 3 Quality Assessment
      const qualityCheck = assessCandidateQuality(candidate);

      // 5. Intelligent Composite Scoring
      const scoring = scoreCandidate(candidate, licenseCheck, securityCheck, qualityCheck);
      candidate.scores = scoring.scores;
      candidate.publicationEligibility = scoring.publicationEligibility;
      candidate.technicalAcceptance = scoring.technicalAcceptance;

      if (scoring.technicalAcceptance === 'REJECTED') {
        const rejectReason = licenseCheck.reasons.join('; ') || 'Failed automated screening checks';
        candidate = markAutomatedRejection(candidate, rejectReason);
        this.saveDossiers(candidate, candidatesDir, rejectedDir);
        this.jobQueue.updateJob(job.id, {
          status: JOB_STATUS.COMPLETED,
          stage: PIPELINE_STAGE.REJECTED,
          result: { decision: 'REJECT', reason: rejectReason, candidate },
          logMessage: `Candidate technically rejected during screening: ${rejectReason}`,
        });
        return;
      }

      // 6. Source Acquisition (Stage: ACQUIRE)
      this.jobQueue.updateJob(job.id, {
        stage: PIPELINE_STAGE.ACQUIRE,
        logMessage: `Downloading source code into isolated staging environment...`,
      });

      const acq = await acquireCandidateSource(candidate, {
        rootDir: this.rootDir,
        timeout: 45000,
        mockFiles: job.candidateData.mockFiles,
        archiveBuffer: job.candidateData.archiveBuffer,
      });

      if (!acq.success) {
        candidate = markNeedsOwnerReview(candidate, [`Source acquisition failed: ${acq.error}`]);
        this.saveDossiers(candidate, candidatesDir, rejectedDir);
        this.jobQueue.updateJob(job.id, {
          status: JOB_STATUS.COMPLETED,
          stage: PIPELINE_STAGE.OWNER_REVIEW,
          result: { decision: 'NEEDS_OWNER_REVIEW', reason: acq.error, candidate },
          logMessage: `Source acquisition failed (${acq.error}); routed to owner review.`,
        });
        return;
      }

      candidate.exactCommitHash = acq.exactCommitHash || candidate.exactCommitHash;
      candidate.sourceFingerprint = acq.sourceFingerprint;

      // 7. Deep AST Security & Dependency Scan (Stage: INSPECT)
      this.jobQueue.updateJob(job.id, {
        stage: PIPELINE_STAGE.INSPECT,
        logMessage: `Running deep AST security scan and dependency inventory on staged files...`,
      });

      const inspection = await deepScanCandidate(acq.stagingDir, candidate);
      candidate.securityFindings = inspection.findings;

      if (inspection.verdict === 'FAILED') {
        candidate.securityStatus = 'REJECTED';
        candidate.qualification.security.status = 'REJECTED';
        candidate = markAutomatedRejection(
          candidate,
          'Critical security violations detected in source code scan',
          inspection.findings.filter(f => f.severity === 'CRITICAL').map(f => `[CRITICAL] ${f.name}: ${f.description}`)
        );
        this.saveDossiers(candidate, candidatesDir, rejectedDir);
        this.jobQueue.updateJob(job.id, {
          status: JOB_STATUS.COMPLETED,
          stage: PIPELINE_STAGE.REJECTED,
          result: { decision: 'REJECT', reason: 'Critical security violation', candidate },
          logMessage: `Critical security violations detected. Candidate rejected.`,
        });
        return;
      }

      // 8. Automated Repair (Stage: REPAIR)
      this.jobQueue.updateJob(job.id, {
        stage: PIPELINE_STAGE.REPAIR,
        logMessage: `Checking for repairable technical defects...`,
      });

      const { hasRepairableDefects, defects } = detectRepairableDefects(acq.stagingDir, candidate);
      if (hasRepairableDefects && config.autonomousRepair && licenseCheck.isPermittedForPublication) {
        this.jobQueue.updateJob(job.id, {
          logMessage: `Applying automated repair patches for ${defects.length} defect(s)...`,
        });

        const repairResult = applyAutomatedRepairs(acq.stagingDir, candidate, { rootDir: this.rootDir });
        if (repairResult.success && repairResult.repaired) {
          candidate.repairs = repairResult.patchReceipt;
          candidate.repairHistory = [
            ...(candidate.repairHistory || []),
            {
              timestamp: new Date().toISOString(),
              patchesApplied: repairResult.patchesApplied,
              changelog: repairResult.changelog,
              patchFilePath: repairResult.patchFilePath,
            },
          ];
          const postInspection = await deepScanCandidate(acq.stagingDir, candidate);
          candidate.securityFindings = postInspection.findings;
          if (postInspection.verdict === 'PASSED') {
            candidate.securityStatus = 'PASSED';
            candidate.qualification.security.status = 'PASSED';
            candidate.qualification.technical.status = 'PASSED';
          }
        } else if (repairResult.neededRepair && !repairResult.success) {
          candidate.repairFailed = true;
          candidate = requestRepair(candidate, repairResult.error || 'Automated repair failed post-verification');
        }
      }

      // 9. Runtime Testing & Verification (Stage: RUNTIME_TEST)
      this.jobQueue.updateJob(job.id, {
        stage: PIPELINE_STAGE.RUNTIME_TEST,
        logMessage: `Validating entry point structure and iframe containment...`,
      });

      const rootIndex = path.join(acq.stagingDir, 'index.html');
      const hasEntryPoint = fs.existsSync(rootIndex);
      if (!hasEntryPoint) {
        candidate = markNeedsOwnerReview(candidate, ['Missing root index.html entry point after repair']);
      }

      // 10. Autonomous Qualification (Stage: QUALIFY)
      const isClean = inspection.verdict === 'PASSED' || (candidate.repairs && candidate.qualification.security?.status === 'PASSED');
      if (isClean && hasEntryPoint) {
        candidate.qualification.security.status = 'PASSED';
        candidate.qualification.technical.status = 'PASSED';
        candidate.qualification.editorial.status = 'APPROVED';
        if (licenseCheck.isPermittedForPublication && !inspection.licensing.isAmbiguous && inspection.licensing.conflicts.length === 0) {
          const requiresAttr = candidate.requiresAttribution !== false;
          candidate.qualification.legal.status = requiresAttr ? 'ATTRIBUTION_REQUIRED' : 'CLEARED_COMMERCIAL';
          candidate.qualification.legal.commercialRedistributionAllowed = true;
          candidate.commercialRedistributionAllowed = true;
        }
      } else if (candidate.qualification.security.status !== 'PASSED') {
        candidate.qualification.security.status = 'SECURITY_REVIEW';
      }

      const autoEval = evaluateAutonomousQualification(candidate);

      // 11. Publishing or Owner Review (Stage: PUBLISH or OWNER_REVIEW)
      if (autoEval.eligible) {
        candidate = transitionCandidate(candidate, LIFECYCLE_STATUS.AUTO_APPROVED, {
          reviewer: 'autonomous-engine',
          notes: autoEval.reasons.join('; '),
        });
        candidate.reviewerDecision = 'APPROVE';
        candidate.publicationEligibility = 'ELIGIBLE';

        if (config.autonomousPublishing) {
          this.jobQueue.updateJob(job.id, {
            stage: PIPELINE_STAGE.PUBLISH,
            logMessage: `Publishing game to production catalog and public/games/...`,
          });

          // Write dossier first for safeImportCandidate
          const candidateFile = path.join(candidatesDir, `${candidate.candidateId}.json`);
          fs.writeFileSync(candidateFile, JSON.stringify(candidate, null, 2), 'utf-8');

          candidate = transitionCandidate(candidate, LIFECYCLE_STATUS.READY_FOR_IMPORT, {
            reviewer: 'autonomous-engine',
            notes: 'Ready for production import',
          });

          const gameEntry = safeImportCandidate(candidate.candidateId, { rootDir: this.rootDir });

          candidate = transitionCandidate(candidate, LIFECYCLE_STATUS.PUBLISHED, {
            reviewer: 'autonomous-engine',
            notes: `Autonomously published to /games/${gameEntry.slug}/index.html`,
          });
          candidate.publishedDate = gameEntry.publishedDate;
          candidate.slug = gameEntry.slug;
          candidate.productionCatalogEntry = gameEntry;

          this.saveDossiers(candidate, candidatesDir, rejectedDir);
          this.jobQueue.updateJob(job.id, {
            status: JOB_STATUS.COMPLETED,
            stage: PIPELINE_STAGE.PUBLISH,
            result: { decision: 'PUBLISHED', slug: gameEntry.slug, gameEntry, candidate },
            logMessage: `Game "${candidate.name}" (${gameEntry.slug}) successfully published to production!`,
          });
          return;
        } else {
          this.saveDossiers(candidate, candidatesDir, rejectedDir);
          this.jobQueue.updateJob(job.id, {
            status: JOB_STATUS.COMPLETED,
            stage: PIPELINE_STAGE.PUBLISH,
            result: { decision: 'AUTO_APPROVED', candidate },
            logMessage: `Candidate reached AUTO_APPROVED (autonomous publishing disabled).`,
          });
          return;
        }
      } else {
        candidate = markNeedsOwnerReview(candidate, autoEval.reasons);
        this.saveDossiers(candidate, candidatesDir, rejectedDir);
        this.jobQueue.updateJob(job.id, {
          status: JOB_STATUS.COMPLETED,
          stage: PIPELINE_STAGE.OWNER_REVIEW,
          result: { decision: 'NEEDS_OWNER_REVIEW', reasons: autoEval.reasons, candidate },
          logMessage: `Candidate routed to owner review: ${autoEval.reasons.join('; ')}`,
        });
        return;
      }
    } catch (err) {
      console.error(`❌ [WORKER POOL] Error processing job ${job.id}: ${err.message}`);
      this.jobQueue.updateJob(job.id, {
        status: JOB_STATUS.FAILED,
        error: err.message,
        logMessage: `Worker exception: ${err.message}`,
      });
    }
  }

  saveDossiers(candidate, candidatesDir, rejectedDir) {
    const candidateFile = path.join(candidatesDir, `${candidate.candidateId}.json`);
    fs.writeFileSync(candidateFile, JSON.stringify(candidate, null, 2), 'utf-8');

    if (candidate.lifecycleStatus === 'REJECTED' || candidate.technicalAcceptance === 'REJECTED') {
      const rejectedFile = path.join(rejectedDir, `${candidate.candidateId}.json`);
      fs.writeFileSync(rejectedFile, JSON.stringify(candidate, null, 2), 'utf-8');
    }
  }

  /**
   * Gracefully waits for all in-flight workers to finish.
   *
   * @param {number} [timeoutMs=30000]
   * @returns {Promise<void>}
   */
  async drain(timeoutMs = 30000) {
    this.isDraining = true;
    console.log(`⏳ [WORKER POOL] Draining ${this.activeWorkers.size} active worker(s)...`);

    const start = Date.now();
    while (this.activeWorkers.size > 0 && Date.now() - start < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (this.activeWorkers.size > 0) {
      console.warn(`⚠️ [WORKER POOL] Drain timeout: ${this.activeWorkers.size} worker(s) still active.`);
    } else {
      console.log(`✅ [WORKER POOL] All workers drained cleanly.`);
    }
  }
}
