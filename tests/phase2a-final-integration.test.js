import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  LEGAL_STATUS,
  EDITORIAL_STATUS,
  REJECTION_TYPE,
  createSourceIdentity,
  createInitialQualification,
  createInitialCandidate,
  markAutomatedRejection,
  markHumanRejection,
  reEvaluateCandidate,
  canTransitionTo,
  transitionCandidate,
  updateGate,
} from '../scripts/discovery/qualification-model.js';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';
import { generateDailyReport } from '../scripts/discovery/generate-report.js';
import { generateCandidateIndex } from '../scripts/discovery/generate-index.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

// ============================================================================
// 1. NEW CANDIDATE CREATION UNDER V2 MODEL
// ============================================================================

test('V2 creation: newly discovered candidates receive V2 model with all four gates UNREVIEWED', () => {
  const raw = {
    candidateId: 'gh-new-game-2026',
    name: 'Neon Velocity 2026',
    originalRepoUrl: 'https://github.com/arcade-team/neon-velocity',
    author: 'arcade-team',
    discoveryDate: '2026-11-11',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'Vanilla Canvas2D',
    licenseName: 'MIT',
    exactCommitHash: 'a1b2c3d4e5f6',
    mobileCompatibility: true,
    scores: { totalScore: 88, popularityScore: 24 },
  };

  const candidate = createInitialCandidate(raw);

  // Schema version & lifecycle status
  assert.equal(candidate.schemaVersion, '2.0');
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
  assert.equal(candidate.rejectionType, null);

  // Source Identity
  assert.equal(candidate.sourceType, 'git');
  assert.equal(candidate.exactCommitHash, 'a1b2c3d4e5f6');

  // Four gates start strictly as UNREVIEWED
  assert.ok(candidate.qualification);
  assert.equal(candidate.qualification.technical.status, TECHNICAL_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.security.status, SECURITY_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.legal.status, LEGAL_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.editorial.status, EDITORIAL_STATUS.UNREVIEWED);

  // Initial audit trail record created
  assert.ok(Array.isArray(candidate.reviewAuditTrail));
  assert.equal(candidate.reviewAuditTrail.length, 1);
  assert.equal(candidate.reviewAuditTrail[0].action, 'DISCOVERY_INBOX_ENQUEUE');
  assert.equal(candidate.reviewAuditTrail[0].newStatus, LIFECYCLE_STATUS.INBOX_PENDING);

  // Invariant: Never automatically qualified
  assert.notEqual(candidate.lifecycleStatus, LIFECYCLE_STATUS.QUALIFIED);
  const transitionCheck = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED);
  assert.equal(transitionCheck.allowed, false);
});

// ============================================================================
// 2. FOUR GATES INDEPENDENCE & QUALIFICATION ENFORCEMENT
// ============================================================================

test('V2 gates: candidate cannot transition to QUALIFIED until all four gates pass AND human approval exists', () => {
  const candidate = createInitialCandidate({
    candidateId: 'gh-gate-test',
    name: 'Gate Test Game',
    originalRepoUrl: 'https://github.com/test/gate-test',
    licenseName: 'MIT',
    author: 'tester',
  });

  // 1. Initial UNREVIEWED: blocked
  assert.equal(canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED).allowed, false);

  // 2. Pass technical gate only: still blocked
  updateGate(candidate, 'technical', { status: TECHNICAL_STATUS.PASSED }, { reviewer: 'tech-lead' });
  assert.equal(canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED).allowed, false);

  // 3. Pass security gate: still blocked
  updateGate(candidate, 'security', { status: SECURITY_STATUS.PASSED }, { reviewer: 'sec-lead' });
  assert.equal(canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED).allowed, false);

  // 4. Pass legal gate: still blocked (editorial not approved)
  updateGate(candidate, 'legal', {
    status: LEGAL_STATUS.CLEARED_COMMERCIAL,
    commercialRedistributionAllowed: true,
  }, { reviewer: 'legal-counsel' });
  assert.equal(canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED).allowed, false);

  // 5. Pass editorial gate: now all four pass, but needs human reviewer
  updateGate(candidate, 'editorial', { status: EDITORIAL_STATUS.APPROVED }, { reviewer: 'editor' });
  
  // With explicit reviewer context: allowed
  const allowedCheck = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'maintainer' });
  assert.equal(allowedCheck.allowed, true);

  // Transition succeeds and logs audit record
  transitionCandidate(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'maintainer' });
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.QUALIFIED);
});

// ============================================================================
// 3. SAFE IMPORT GATE VERIFICATION & BLOCKING
// ============================================================================

test('safe-import: blocks V2 candidate if any qualification gate is unreviewed or failed', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-import-v2-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'candidates'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'staging', 'gh-legacy-game'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'discovery', 'staging', 'gh-legacy-game', 'index.html'), '<!DOCTYPE html><html><body>Play</body></html>', 'utf-8');
    fs.mkdirSync(path.join(tmpDir, 'src', 'data'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'data', 'games.json'), '[]', 'utf-8');

    const v2Candidate = createInitialCandidate({
      candidateId: 'gh-unreviewed-v2',
      name: 'Unreviewed V2 Game',
      author: 'dev',
      licenseName: 'MIT',
      originalRepoUrl: 'https://github.com/dev/unreviewed',
      reviewerDecision: 'APPROVE', // Human tried to approve without gate clearance
    });

    fs.writeFileSync(
      path.join(tmpDir, 'discovery', 'candidates', 'gh-unreviewed-v2.json'),
      JSON.stringify(v2Candidate, null, 2),
      'utf-8'
    );

    // Attempting import must throw because gates are UNREVIEWED
    assert.throws(
      () => safeImportCandidate('gh-unreviewed-v2', { rootDir: tmpDir }),
      /failed Technical gate/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('safe-import: successfully imports V2 candidate when all 4 gates pass + human approval recorded', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-import-v2-pass-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'candidates'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'staging', 'gh-cleared-v2'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'discovery', 'staging', 'gh-cleared-v2', 'index.html'), '<!DOCTYPE html><html><body>Play</body></html>', 'utf-8');
    fs.mkdirSync(path.join(tmpDir, 'src', 'data'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'data', 'games.json'), '[]', 'utf-8');

    const v2Candidate = createInitialCandidate({
      candidateId: 'gh-cleared-v2',
      name: 'Cleared V2 Game',
      author: 'indie',
      licenseName: 'MIT',
      originalRepoUrl: 'https://github.com/indie/cleared',
      reviewerDecision: 'APPROVE',
    });

    // Pass all 4 gates
    v2Candidate.qualification.technical.status = TECHNICAL_STATUS.PASSED;
    v2Candidate.qualification.security.status = SECURITY_STATUS.PASSED;
    v2Candidate.qualification.legal.status = LEGAL_STATUS.CLEARED_COMMERCIAL;
    v2Candidate.qualification.legal.commercialRedistributionAllowed = true;
    v2Candidate.qualification.editorial.status = EDITORIAL_STATUS.APPROVED;
    v2Candidate.lifecycleStatus = LIFECYCLE_STATUS.QUALIFIED;

    fs.writeFileSync(
      path.join(tmpDir, 'discovery', 'candidates', 'gh-cleared-v2.json'),
      JSON.stringify(v2Candidate, null, 2),
      'utf-8'
    );

    const imported = safeImportCandidate('gh-cleared-v2', { rootDir: tmpDir });
    assert.equal(imported.id, 'cleared-v2');

    const catalog = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'data', 'games.json'), 'utf-8'));
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0].id, 'cleared-v2');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 4. LEGACY V1 CANDIDATE COMPATIBILITY
// ============================================================================

test('safe-import: legacy V1 candidates continue working without requiring V2 fields', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-import-v1-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'candidates'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'discovery', 'staging', 'gh-legacy-game'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'discovery', 'staging', 'gh-legacy-game', 'index.html'), '<!DOCTYPE html><html><body>Play</body></html>', 'utf-8');
    fs.mkdirSync(path.join(tmpDir, 'src', 'data'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'data', 'games.json'), '[]', 'utf-8');

    // Pure legacy V1 candidate (no schemaVersion, no qualification object)
    const legacyCandidate = {
      candidateId: 'gh-legacy-game',
      name: 'Legacy Arcade Game',
      originalRepoUrl: 'https://github.com/author/legacy-game',
      author: 'author',
      discoveryDate: '2024-01-01',
      licenseName: 'MIT',
      licensingStatus: 'VERIFIED_COMMERCIAL_USE',
      securityStatus: 'PASSED',
      publicationEligibility: 'ELIGIBLE',
      reviewerDecision: 'APPROVE', // Human approved in legacy flow
    };

    fs.writeFileSync(
      path.join(tmpDir, 'discovery', 'candidates', 'gh-legacy-game.json'),
      JSON.stringify(legacyCandidate, null, 2),
      'utf-8'
    );

    const imported = safeImportCandidate('gh-legacy-game', { rootDir: tmpDir });
    assert.equal(imported.id, 'legacy-game');

    const catalog = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'data', 'games.json'), 'utf-8'));
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0].id, 'legacy-game');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 5. PERMANENT REJECTED CANDIDATE PRESERVATION & CATEGORIZATION
// ============================================================================

test('preservation: automated screening vs human reviewer rejections are distinct and preserve dossier', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-preservation-'));

  try {
    const candidatesDir = path.join(tmpDir, 'discovery', 'candidates');
    fs.mkdirSync(candidatesDir, { recursive: true });

    // 1. Automated screening rejection
    const autoCandidate = createInitialCandidate({
      candidateId: 'gh-auto-rejected',
      name: 'Backend Heavy Game',
      originalRepoUrl: 'https://github.com/dev/backend-game',
      author: 'dev',
      licenseName: 'MIT',
    });
    markAutomatedRejection(autoCandidate, 'Requires dedicated Node.js WebSocket backend server', [
      'AST inspection detected net.Socket and ws imports',
    ]);

    const autoFile = path.join(candidatesDir, `${autoCandidate.candidateId}.json`);
    fs.writeFileSync(autoFile, JSON.stringify(autoCandidate, null, 2), 'utf-8');

    // 2. Human reviewer rejection
    const humanCandidate = createInitialCandidate({
      candidateId: 'gh-human-rejected',
      name: 'Questionable Asset Game',
      originalRepoUrl: 'https://github.com/artist/asset-game',
      author: 'artist',
      licenseName: 'CC-BY-NC-4.0',
    });
    markHumanRejection(humanCandidate, 'lead-curator', 'Non-commercial license constraint cannot be waived', [
      'CC-BY-NC-4.0 restricts commercial monetization on portal',
    ]);

    const humanFile = path.join(candidatesDir, `${humanCandidate.candidateId}.json`);
    fs.writeFileSync(humanFile, JSON.stringify(humanCandidate, null, 2), 'utf-8');

    // Verify distinctions
    assert.equal(autoCandidate.rejectionType, REJECTION_TYPE.AUTOMATED_SCREENING);
    assert.equal(humanCandidate.rejectionType, REJECTION_TYPE.HUMAN_REVIEW);

    // Verify files remain on disk (never deleted)
    assert.ok(fs.existsSync(autoFile));
    assert.ok(fs.existsSync(humanFile));

    // Verify audit trail recorded reasons
    const autoAudit = autoCandidate.reviewAuditTrail.find(r => r.action === 'SCREENING_REJECTION');
    assert.ok(autoAudit);
    assert.equal(autoAudit.reviewer, 'screening-engine');

    const humanAudit = humanCandidate.reviewAuditTrail.find(r => r.action === 'HUMAN_REVIEW_REJECTION');
    assert.ok(humanAudit);
    assert.equal(humanAudit.reviewer, 'lead-curator');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 6. REPORT & INDEX VISIBILITY
// ============================================================================

test('visibility: rejected candidates surface their category and reason in reports and index manifest', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-visibility-'));

  try {
    const candidatesDir = path.join(tmpDir, 'discovery', 'candidates');
    const reportsDir = path.join(tmpDir, 'discovery', 'reports');
    const indexPath = path.join(tmpDir, 'discovery', 'index.json');
    fs.mkdirSync(candidatesDir, { recursive: true });
    fs.mkdirSync(reportsDir, { recursive: true });

    const autoCandidate = markAutomatedRejection(
      createInitialCandidate({
        candidateId: 'gh-visible-auto',
        name: 'Auto Reject Game',
        originalRepoUrl: 'https://github.com/dev/auto',
        author: 'dev',
        licenseName: 'Proprietary',
      }),
      'Proprietary license not allowed'
    );

    const humanCandidate = markHumanRejection(
      createInitialCandidate({
        candidateId: 'gh-visible-human',
        name: 'Human Reject Game',
        originalRepoUrl: 'https://github.com/dev/human',
        author: 'dev',
        licenseName: 'GPL-3.0',
      }),
      'reviewer-alice',
      'Editorial playtest found unresponsive touch controls'
    );

    fs.writeFileSync(path.join(candidatesDir, `${autoCandidate.candidateId}.json`), JSON.stringify(autoCandidate, null, 2), 'utf-8');
    fs.writeFileSync(path.join(candidatesDir, `${humanCandidate.candidateId}.json`), JSON.stringify(humanCandidate, null, 2), 'utf-8');

    // 1. Generate Report
    const report = generateDailyReport([autoCandidate, humanCandidate], {
      date: '2026-11-11',
      rootDir: tmpDir,
      dryRun: false,
    });

    assert.ok(report.markdownContent.includes('AUTOMATED_SCREENING'));
    assert.ok(report.markdownContent.includes('Proprietary license not allowed'));
    assert.ok(report.markdownContent.includes('HUMAN_REVIEW'));
    assert.ok(report.markdownContent.includes('Editorial playtest found unresponsive touch controls'));
    assert.ok(report.markdownContent.includes('Preserved in authoritative candidate dossier'));

    // 2. Generate Index
    const manifest = generateCandidateIndex({ candidatesDir, outputPath: indexPath, dryRun: false });
    assert.equal(manifest.metrics.totalCandidates, 2);
    assert.equal(manifest.metrics.byRejectionType.AUTOMATED_SCREENING, 1);
    assert.equal(manifest.metrics.byRejectionType.HUMAN_REVIEW, 1);

    const indexedAuto = manifest.candidates.find(c => c.candidateId === 'gh-visible-auto');
    assert.equal(indexedAuto.rejectionType, 'AUTOMATED_SCREENING');
    assert.equal(indexedAuto.rejectionReason, 'Proprietary license not allowed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 7. FUTURE RE-EVALUATION
// ============================================================================

test('re-evaluation: rejected candidate can be reopened and re-evaluated without data loss or deletion', () => {
  const candidate = markHumanRejection(
    createInitialCandidate({
      candidateId: 'gh-fixable-game',
      name: 'Fixable Game',
      originalRepoUrl: 'https://github.com/author/fixable',
      author: 'author',
      licenseName: 'UNKNOWN',
    }),
    'curator',
    'License was unknown at initial discovery'
  );

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.REJECTED);
  assert.equal(candidate.rejectionType, REJECTION_TYPE.HUMAN_REVIEW);

  // Author fixes license by adding MIT license
  const reopened = reEvaluateCandidate(candidate, 'curator', 'Author added canonical MIT license in commit e4f5a6');
  assert.equal(reopened.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
  assert.equal(reopened.rejectionType, null);
  assert.equal(reopened.rejectionReason, null);

  // Update legal gate to cleared
  updateGate(reopened, 'legal', {
    status: LEGAL_STATUS.CLEARED_COMMERCIAL,
    codeLicenseSpdx: 'MIT',
    commercialRedistributionAllowed: true,
  }, { reviewer: 'curator', notes: 'Verified new LICENSE file' });

  assert.equal(reopened.qualification.legal.status, LEGAL_STATUS.CLEARED_COMMERCIAL);

  // Check audit trail contains complete lineage
  const actions = reopened.reviewAuditTrail.map(r => r.action);
  assert.ok(actions.includes('DISCOVERY_INBOX_ENQUEUE'));
  assert.ok(actions.includes('HUMAN_REVIEW_REJECTION'));
  assert.ok(actions.includes('REOPEN_FOR_REEVALUATION'));
  assert.ok(actions.includes('GATE_UPDATE_LEGAL'));
});
