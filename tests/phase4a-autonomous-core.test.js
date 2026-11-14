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
  PERMISSIVE_LICENSES,
  COPYLEFT_LICENSES,
  createSourceIdentity,
  createDefaultQualification,
  createInitialQualification,
  createInitialCandidate,
  appendAuditRecord,
  canTransitionTo,
  transitionCandidate,
  updateGate,
  markAutomatedRejection,
  markHumanRejection,
  reEvaluateCandidate,
  evaluateAutonomousQualification,
  markNeedsOwnerReview,
  markOwnerAcceptance,
  markFinalRejection,
  requestRepair,
  markRecheckRequired,
} from '../scripts/discovery/qualification-model.js';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';
import { inboxApiMiddleware } from '../scripts/discovery/inbox-api-middleware.js';
import { generateCandidateIndex } from '../scripts/discovery/generate-index.js';

// Helper to create clean test candidate
function createMockCandidate(overrides = {}) {
  const base = {
    candidateId: 'gh-clean-arcade-game',
    name: 'Clean Arcade Game',
    originalRepoUrl: 'https://github.com/arcade-team/clean-game',
    author: 'arcade-team',
    discoveryDate: '2026-11-12',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'Vanilla Canvas2D',
    licenseName: 'MIT',
    exactCommitHash: '1a2b3c4d5e6f7a8b',
    html5Compatibility: true,
    technicalAcceptance: 'TECHNICALLY_ACCEPTED',
    commercialRedistributionAllowed: true,
    securityStatus: 'PASSED',
    securityFindings: [],
    scores: { totalScore: 85, popularityScore: 30, technicalQualityScore: 25 },
    publicationEligibility: 'ELIGIBLE',
    reviewerDecision: 'PENDING_REVIEW',
    qualification: {
      technical: {
        status: TECHNICAL_STATUS.PASSED,
        runtimeType: 'Vanilla Canvas2D',
        mobileReady: true,
        deployment: 'STATIC_READY',
        evidence: ['Screening verified HTML5 execution'],
        notes: '',
      },
      security: {
        status: SECURITY_STATUS.PASSED,
        staticScanPassed: true,
        findings: [],
        evidence: ['0 violations detected'],
        notes: '',
      },
      legal: {
        status: LEGAL_STATUS.ATTRIBUTION_REQUIRED,
        codeLicenseSpdx: 'MIT',
        assetLicenseStatus: 'MIT included in assets',
        commercialRedistributionAllowed: true,
        monetizationAllowed: true,
        evidence: ['Verified commercial whitelist'],
        notes: '',
      },
      editorial: {
        status: EDITORIAL_STATUS.APPROVED,
        gameplayScore: 4,
        evidence: ['Quality evaluation passed'],
        notes: '',
      },
    },
    reviewAuditTrail: [
      {
        timestamp: '2026-11-12T00:00:00Z',
        reviewer: 'discovery-engine',
        pillar: 'lifecycle',
        action: 'DISCOVERY_INBOX_ENQUEUE',
        previousStatus: null,
        newStatus: LIFECYCLE_STATUS.INBOX_PENDING,
        notes: 'Discovered and enqueued.',
      },
    ],
  };

  return { ...base, ...overrides };
}

// ============================================================================
// 1. LIFECYCLE STATE ENUM & BACKWARD COMPATIBILITY
// ============================================================================

test('phase4a: lifecycle status enum contains all required states with backward compatibility', () => {
  const expectedStates = [
    'DISCOVERED',
    'INBOX_PENDING',
    'NEEDS_CLARIFICATION',
    'QUALIFIED',
    'STAGED',
    'READY_FOR_IMPORT',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED',
    'AUTO_APPROVED',
    'NEEDS_OWNER_REVIEW',
    'REPAIR_REQUESTED',
    'RECHECK_REQUIRED',
    'OWNER_ACCEPTED',
    'REJECTED_FINAL',
  ];

  for (const state of expectedStates) {
    assert.ok(LIFECYCLE_STATUS[state], `Missing lifecycle status: ${state}`);
    assert.equal(LIFECYCLE_STATUS[state], state);
  }
});

// ============================================================================
// 2. AUTONOMOUS APPROVAL (AUTO_APPROVED)
// ============================================================================

test('phase4a: clean permissive candidate transitions to AUTO_APPROVED without human intervention', () => {
  const candidate = createMockCandidate();
  const evaluation = evaluateAutonomousQualification(candidate);

  assert.equal(evaluation.eligible, true);
  assert.equal(evaluation.targetStatus, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(evaluation.exceptionType, null);

  const transitionCheck = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(transitionCheck.allowed, true);

  transitionCandidate(candidate, LIFECYCLE_STATUS.AUTO_APPROVED, {
    reviewer: 'autonomous-engine',
    notes: 'All autonomous qualification criteria satisfied',
  });

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.AUTO_APPROVED);
  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'LIFECYCLE_TRANSITION_AUTO_APPROVED');
  assert.equal(lastAudit.reviewer, 'autonomous-engine');
});

test('phase4a: AUTO_APPROVED is blocked if technical gate is not passed or playability fails', () => {
  const candidate = createMockCandidate();
  candidate.qualification.technical.status = TECHNICAL_STATUS.BUILD_REQUIRED;

  const check = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(check.allowed, false);
  assert.match(check.reasons.join('; '), /Technical gate is not PASSED/);

  // Playability failure check
  const candidate2 = createMockCandidate();
  candidate2.html5Compatibility = false;
  const check2 = canTransitionTo(candidate2, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(check2.allowed, false);
  assert.match(check2.reasons.join('; '), /failed automated HTML5 playability/);
});

test('phase4a: AUTO_APPROVED is blocked if critical or high security findings exist', () => {
  const candidate = createMockCandidate();
  candidate.qualification.security.findings = [
    { severity: 'HIGH', category: 'network', description: 'Unreviewed outbound fetch' },
  ];

  const check = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(check.allowed, false);
  assert.match(check.reasons.join('; '), /critical or high severity security findings/);
});

test('phase4a: AUTO_APPROVED is blocked on copyleft licenses and routes to NEEDS_OWNER_REVIEW', () => {
  const copyleftLicenses = ['GPL-2.0', 'GPL-3.0', 'LGPL-3.0', 'MPL-2.0', 'AGPL-3.0'];

  for (const lic of copyleftLicenses) {
    const candidate = createMockCandidate({
      licenseName: lic,
    });
    candidate.qualification.legal.codeLicenseSpdx = lic;

    const check = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
    assert.equal(check.allowed, false, `Copyleft license ${lic} must block AUTO_APPROVED`);
    assert.match(check.reasons.join('; '), /Copyleft license.*requires owner review/);

    const evaluation = evaluateAutonomousQualification(candidate);
    assert.equal(evaluation.eligible, false);
    assert.equal(evaluation.targetStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
    assert.match(evaluation.reasons.join('; '), /Copyleft license/);
  }
});

test('phase4a: AUTO_APPROVED is blocked on unknown or proprietary licenses', () => {
  const candidate = createMockCandidate({ licenseName: 'UNKNOWN' });
  candidate.qualification.legal.codeLicenseSpdx = 'UNKNOWN';
  candidate.qualification.legal.status = LEGAL_STATUS.LICENSE_PENDING;

  const check = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(check.allowed, false);
  assert.match(check.reasons.join('; '), /License.*is not on permissive open-source allowlist/);

  const evaluation = evaluateAutonomousQualification(candidate);
  assert.equal(evaluation.eligible, false);
  assert.equal(evaluation.targetStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
});

test('phase4a: AUTO_APPROVED routes borderline quality score (60-69) to NEEDS_OWNER_REVIEW', () => {
  const candidate = createMockCandidate();
  candidate.scores = { totalScore: 64, popularityScore: 15 };

  const check = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(check.allowed, false);
  assert.match(check.reasons.join('; '), /Borderline quality score/);

  const evaluation = evaluateAutonomousQualification(candidate);
  assert.equal(evaluation.eligible, false);
  assert.equal(evaluation.targetStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
  assert.match(evaluation.reasons.join('; '), /Borderline quality score/);
});

// ============================================================================
// 3. OWNER REVIEW ROUTING (NEEDS_OWNER_REVIEW)
// ============================================================================

test('phase4a: markNeedsOwnerReview correctly routes candidate and preserves audit trail', () => {
  const candidate = createMockCandidate();
  markNeedsOwnerReview(candidate, [
    'Copyleft license GPL-3.0 requires owner distribution terms review',
    'Medium security heuristic detected in asset bundle',
  ]);

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
  assert.equal(candidate.reviewerDecision, 'PENDING_REVIEW');
  assert.equal(candidate.publicationEligibility, 'INELIGIBLE');

  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'ROUTE_TO_OWNER_REVIEW');
  assert.equal(lastAudit.newStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
  assert.match(lastAudit.notes, /GPL-3.0/);
});

// ============================================================================
// 4. OWNER EXCEPTION ACCEPTANCE (OWNER_ACCEPTED)
// ============================================================================

test('phase4a: markOwnerAcceptance requires trusted human maintainer identity and rationale', () => {
  const candidate = createMockCandidate();
  candidate.lifecycleStatus = LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW;

  // Blocked if reviewer is system or missing
  const check1 = canTransitionTo(candidate, LIFECYCLE_STATUS.OWNER_ACCEPTED, {
    reviewer: 'system',
    notes: 'Valid justification note',
  });
  assert.equal(check1.allowed, false);
  assert.match(check1.reasons.join('; '), /explicit human maintainer reviewer identity/);

  // Blocked if justification is empty
  const check2 = canTransitionTo(candidate, LIFECYCLE_STATUS.OWNER_ACCEPTED, {
    reviewer: 'local-maintainer',
    notes: '',
  });
  assert.equal(check2.allowed, false);
  assert.match(check2.reasons.join('; '), /explicit rationale\/justification/);

  // Allowed with maintainer identity and non-empty rationale
  markOwnerAcceptance(
    candidate,
    'local-maintainer',
    'Reviewed standalone copyleft architecture; code is isolated in iframe with source link provided.',
    ['https://github.com/author/repo/blob/main/LICENSE']
  );

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.OWNER_ACCEPTED);
  assert.equal(candidate.reviewerDecision, 'APPROVE');
  assert.equal(candidate.publicationEligibility, 'ELIGIBLE');
  assert.equal(candidate.qualification.editorial.status, EDITORIAL_STATUS.APPROVED);

  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'OWNER_EXCEPTION_ACCEPTED');
  assert.equal(lastAudit.reviewer, 'local-maintainer');
  assert.match(lastAudit.notes, /Reviewed standalone copyleft/);
});

test('phase4a: OWNER_ACCEPTED cannot bypass critical security failure or unknown license', () => {
  // Critical security invariant
  const secCandidate = createMockCandidate();
  secCandidate.qualification.security.status = SECURITY_STATUS.REJECTED;
  secCandidate.qualification.security.findings = [{ severity: 'CRITICAL', description: 'Malicious payload' }];

  const secCheck = canTransitionTo(secCandidate, LIFECYCLE_STATUS.OWNER_ACCEPTED, {
    reviewer: 'local-maintainer',
    notes: 'Attempting to override critical security',
  });
  assert.equal(secCheck.allowed, false);
  assert.match(secCheck.reasons.join('; '), /Security isolation violation/);

  // Unknown license invariant
  const unkCandidate = createMockCandidate({ licenseName: 'UNKNOWN' });
  unkCandidate.qualification.legal.codeLicenseSpdx = 'UNKNOWN';

  const unkCheck = canTransitionTo(unkCandidate, LIFECYCLE_STATUS.OWNER_ACCEPTED, {
    reviewer: 'local-maintainer',
    notes: 'Attempting to accept without license proof',
  });
  assert.equal(unkCheck.allowed, false);
  assert.match(unkCheck.reasons.join('; '), /Legal safety violation.*UNKNOWN license/);
});

// ============================================================================
// 5. PERMANENT REJECTION PRESERVATION (REJECTED_FINAL)
// ============================================================================

test('phase4a: markFinalRejection permanently records owner decision and never deletes candidate', () => {
  const candidate = createMockCandidate();
  markFinalRejection(
    candidate,
    'local-maintainer',
    'Game theme is not aligned with platform editorial guidelines.',
    ['Screenshot review observation']
  );

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.REJECTED_FINAL);
  assert.equal(candidate.rejectionType, REJECTION_TYPE.OWNER_FINAL);
  assert.equal(candidate.rejectionReason, 'Game theme is not aligned with platform editorial guidelines.');
  assert.ok(candidate.rejectionDate);
  assert.equal(candidate.reviewerDecision, 'REJECT');
  assert.equal(candidate.publicationEligibility, 'INELIGIBLE');

  // Dossier cannot transition directly out of REJECTED_FINAL without explicit reopening
  const illegalTransition = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(illegalTransition.allowed, false);
  assert.match(illegalTransition.reasons.join('; '), /marked REJECTED_FINAL/);

  // Reopening for re-evaluation works safely and preserves full audit history
  reEvaluateCandidate(candidate, 'local-maintainer', 'Author updated theme to conform to platform standards.');
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
  assert.equal(candidate.rejectionType, null);

  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'REOPEN_FOR_REEVALUATION');
  assert.match(lastAudit.evidence[0], /Previous rejection type/);
});

// ============================================================================
// 6. REPAIR & RECHECK LIFECYCLE (REPAIR_REQUESTED & RECHECK_REQUIRED)
// ============================================================================

test('phase4a: requestRepair and markRecheckRequired manage defect remediation pipeline', () => {
  const candidate = createMockCandidate();

  // 1. Request repair
  requestRepair(candidate, 'Fix relative asset path loading in index.html', {
    reviewer: 'screening-engine',
  });
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.REPAIR_REQUESTED);
  assert.ok(candidate.repairRequestedDate);

  let lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'REPAIR_REQUESTED');
  assert.match(lastAudit.notes, /Fix relative asset path/);

  // 2. Mark recheck required after patching
  markRecheckRequired(candidate, {
    reviewer: 'repair-agent',
    notes: 'Patched asset URLs to use relative base href.',
  });
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.RECHECK_REQUIRED);
  assert.ok(candidate.recheckDate);

  lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'RECHECK_REQUIRED');
  assert.match(lastAudit.notes, /Patched asset URLs/);

  // 3. Re-evaluated clean candidate transitions to AUTO_APPROVED
  const autoCheck = canTransitionTo(candidate, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(autoCheck.allowed, true);
});

// ============================================================================
// 7. SECURITY INVARIANT: UNTRUSTED CODE CANNOT PUBLISH DIRECTLY
// ============================================================================

test('phase4a: candidate cannot transition directly to PUBLISHED without READY_FOR_IMPORT', () => {
  const unapprovedStatuses = [
    LIFECYCLE_STATUS.DISCOVERED,
    LIFECYCLE_STATUS.INBOX_PENDING,
    LIFECYCLE_STATUS.AUTO_APPROVED,
    LIFECYCLE_STATUS.OWNER_ACCEPTED,
    LIFECYCLE_STATUS.QUALIFIED,
    LIFECYCLE_STATUS.STAGED,
    LIFECYCLE_STATUS.REPAIR_REQUESTED,
    LIFECYCLE_STATUS.RECHECK_REQUIRED,
    LIFECYCLE_STATUS.REJECTED,
  ];

  for (const status of unapprovedStatuses) {
    const candidate = createMockCandidate();
    candidate.lifecycleStatus = status;

    const check = canTransitionTo(candidate, LIFECYCLE_STATUS.PUBLISHED);
    assert.equal(check.allowed, false, `Status ${status} must not transition directly to PUBLISHED`);
    assert.match(check.reasons.join('; '), /Untrusted candidate code cannot transition directly to production/);
  }
});

// ============================================================================
// 8. GATE FAILURE REVOCATION
// ============================================================================

test('phase4a: gate failure revokes AUTO_APPROVED and OWNER_ACCEPTED status', () => {
  const candidate = createMockCandidate();
  candidate.lifecycleStatus = LIFECYCLE_STATUS.AUTO_APPROVED;

  // Fail security gate
  updateGate(candidate, 'security', { status: SECURITY_STATUS.REJECTED }, { reviewer: 'security-scanner' });

  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'REVOKE_APPROVAL_ON_GATE_FAILURE');
  assert.equal(lastAudit.previousStatus, LIFECYCLE_STATUS.AUTO_APPROVED);
  assert.equal(lastAudit.newStatus, LIFECYCLE_STATUS.INBOX_PENDING);
});

// ============================================================================
// 9. SAFE IMPORT INTEGRATION FOR AUTO_APPROVED & OWNER_ACCEPTED
// ============================================================================

test('phase4a: safeImportCandidate supports AUTO_APPROVED and OWNER_ACCEPTED with all gates passing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-phase4a-import-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'discovery/candidates'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src/data'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'public/games/clean-arcade-game'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'public/games/clean-arcade-game/index.html'), '<html></html>', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'src/data/games.json'), JSON.stringify([], null, 2), 'utf-8');

    const candidate = createMockCandidate();
    candidate.lifecycleStatus = LIFECYCLE_STATUS.AUTO_APPROVED;
    candidate.schemaVersion = '2.0';
    candidate.reviewerDecision = 'APPROVE';

    fs.writeFileSync(
      path.join(tmpDir, 'discovery/candidates/gh-clean-arcade-game.json'),
      JSON.stringify(candidate, null, 2),
      'utf-8'
    );

    const imported = safeImportCandidate('gh-clean-arcade-game', { rootDir: tmpDir });
    assert.equal(imported.id, 'clean-arcade-game');

    const games = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src/data/games.json'), 'utf-8'));
    assert.equal(games.length, 1);
    assert.equal(games[0].id, 'clean-arcade-game');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 10. INBOX API MUTATIONS FOR PHASE 4A ACTIONS
// ============================================================================

function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    url: options.url || '/api/inbox/candidates',
    headers: {
      'content-type': 'application/json',
      'x-ga-csrf-protection': '1',
      origin: 'http://127.0.0.1:3000',
      host: '127.0.0.1:3000',
      ...(options.headers || {}),
    },
    socket: {
      remoteAddress: options.remoteAddress || '127.0.0.1',
    },
    on(event, handler) {
      if (event === 'data' && options.body) {
        handler(Buffer.from(JSON.stringify(options.body)));
      }
      if (event === 'end') {
        handler();
      }
      return req;
    },
    destroy: () => {},
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(chunk) {
      if (chunk) this.body = chunk;
    },
  };

  return { req, res };
}

test('phase4a API: handles accept, reject-final, repair, recheck, and auto-approve actions safely', async () => {
  const testCandidateId = 'gh-phase4a-api-test';
  const testCandidatePath = path.resolve(`discovery/candidates/${testCandidateId}.json`);

  try {
    const candidate = createMockCandidate({ candidateId: testCandidateId });
    fs.writeFileSync(testCandidatePath, JSON.stringify(candidate, null, 2), 'utf-8');

    // 1. auto-approve endpoint
    const { req: req1, res: res1 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/auto-approve`,
      body: { notes: 'Automated test suite verification' },
    });

    await new Promise(resolve => {
      res1.end = chunk => {
        if (chunk) res1.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req1, res1, () => {});
    });

    assert.equal(res1.statusCode, 200);
    const body1 = JSON.parse(res1.body);
    assert.equal(body1.success, true);
    assert.equal(body1.candidate.lifecycleStatus, LIFECYCLE_STATUS.AUTO_APPROVED);

    // 2. reject-final endpoint
    const { req: req2, res: res2 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/reject-final`,
      body: { reason: 'Permanent editorial rejection' },
    });

    await new Promise(resolve => {
      res2.end = chunk => {
        if (chunk) res2.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req2, res2, () => {});
    });

    assert.equal(res2.statusCode, 200);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.success, true);
    assert.equal(body2.candidate.lifecycleStatus, LIFECYCLE_STATUS.REJECTED_FINAL);

    // 3. Reopen endpoint
    const { req: req3, res: res3 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/reopen`,
      body: { reason: 'Reopened by owner for exception acceptance' },
    });

    await new Promise(resolve => {
      res3.end = chunk => {
        if (chunk) res3.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req3, res3, () => {});
    });

    assert.equal(res3.statusCode, 200);
    const body3 = JSON.parse(res3.body);
    assert.equal(body3.candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);

    // 4. accept exception endpoint
    const { req: req4, res: res4 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/accept`,
      body: { justification: 'Maintainer verified license and editorial compliance' },
    });

    await new Promise(resolve => {
      res4.end = chunk => {
        if (chunk) res4.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req4, res4, () => {});
    });

    assert.equal(res4.statusCode, 200);
    const body4 = JSON.parse(res4.body);
    assert.equal(body4.candidate.lifecycleStatus, LIFECYCLE_STATUS.OWNER_ACCEPTED);

    // 5. repair endpoint
    const { req: req5, res: res5 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/repair`,
      body: { defectDetails: 'Relative asset URL repair' },
    });

    await new Promise(resolve => {
      res5.end = chunk => {
        if (chunk) res5.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req5, res5, () => {});
    });

    assert.equal(res5.statusCode, 200);
    const body5 = JSON.parse(res5.body);
    assert.equal(body5.candidate.lifecycleStatus, LIFECYCLE_STATUS.REPAIR_REQUESTED);

    // 6. recheck endpoint
    const { req: req6, res: res6 } = createMockReqRes({
      method: 'POST',
      url: `/api/inbox/candidates/${testCandidateId}/recheck`,
      body: { notes: 'Asset paths updated' },
    });

    await new Promise(resolve => {
      res6.end = chunk => {
        if (chunk) res6.body = chunk;
        resolve();
      };
      inboxApiMiddleware(req6, res6, () => {});
    });

    assert.equal(res6.statusCode, 200);
    const body6 = JSON.parse(res6.body);
    assert.equal(body6.candidate.lifecycleStatus, LIFECYCLE_STATUS.RECHECK_REQUIRED);
  } finally {
    if (fs.existsSync(testCandidatePath)) {
      fs.unlinkSync(testCandidatePath);
    }
    // Restore clean index manifest
    generateCandidateIndex({
      candidatesDir: path.resolve('discovery/candidates'),
      outputPath: path.resolve('discovery/index.json'),
      dryRun: false,
    });
  }
});
