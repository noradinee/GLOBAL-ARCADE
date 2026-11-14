import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  LEGAL_STATUS,
  EDITORIAL_STATUS,
  createSourceIdentity,
  createDefaultQualification,
  appendAuditRecord,
  canTransitionTo,
  transitionCandidate,
  updateGate,
} from '../scripts/discovery/qualification-model.js';

// ============================================================================
// 1. INDEPENDENT QUALIFICATION GATES
// ============================================================================

test('qualification-model: creates four independent gates with isolated statuses', () => {
  const candidate = {
    candidateId: 'gh-test-game',
    name: 'Test Game',
    originalRepoUrl: 'https://github.com/author/test-game',
    html5Compatibility: true,
    securityStatus: 'PASSED',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    licenseName: 'MIT',
    reviewerDecision: 'PENDING_REVIEW',
  };

  const q = createDefaultQualification(candidate);
  assert.ok(q.technical);
  assert.ok(q.security);
  assert.ok(q.legal);
  assert.ok(q.editorial);

  assert.equal(q.technical.status, TECHNICAL_STATUS.PASSED);
  assert.equal(q.security.status, SECURITY_STATUS.PASSED);
  assert.equal(q.legal.status, LEGAL_STATUS.ATTRIBUTION_REQUIRED);
  assert.equal(q.editorial.status, EDITORIAL_STATUS.UNREVIEWED);
});

test('qualification-model: overall candidate status does not override individual gate results', () => {
  const candidate = {
    candidateId: 'gh-test-override',
    name: 'Test Override',
    lifecycleStatus: LIFECYCLE_STATUS.INBOX_PENDING,
    qualification: {
      technical: { status: TECHNICAL_STATUS.PASSED, notes: 'Tech passed' },
      security: { status: SECURITY_STATUS.PASSED, notes: 'Sec passed' },
      legal: { status: LEGAL_STATUS.LICENSE_PENDING, notes: 'Pending legal' },
      editorial: { status: EDITORIAL_STATUS.APPROVED, notes: 'Editorial ok' },
    },
    reviewAuditTrail: [],
  };

  // Update a single gate
  updateGate(candidate, 'legal', {
    status: LEGAL_STATUS.CLEARED_COMMERCIAL,
    notes: 'Author confirmed commercial permission',
  }, { reviewer: 'legal-reviewer' });

  // Other gates remain completely untouched
  assert.equal(candidate.qualification.technical.status, TECHNICAL_STATUS.PASSED);
  assert.equal(candidate.qualification.security.status, SECURITY_STATUS.PASSED);
  assert.equal(candidate.qualification.legal.status, LEGAL_STATUS.CLEARED_COMMERCIAL);
  assert.equal(candidate.qualification.editorial.status, EDITORIAL_STATUS.APPROVED);
  // Overall status did not overwrite gates
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
});

test('qualification-model: cannot become QUALIFIED unless all four gates pass AND human approval is recorded', () => {
  const candidate = {
    candidateId: 'gh-strict-gates',
    name: 'Strict Gates',
    lifecycleStatus: LIFECYCLE_STATUS.INBOX_PENDING,
    qualification: {
      technical: { status: TECHNICAL_STATUS.PASSED },
      security: { status: SECURITY_STATUS.PASSED },
      legal: { status: LEGAL_STATUS.LICENSE_PENDING }, // Failing: not cleared!
      editorial: { status: EDITORIAL_STATUS.APPROVED },
    },
    reviewAuditTrail: [{ reviewer: 'human-auditor' }],
  };

  // Transition must be blocked because legal gate is LICENSE_PENDING
  const check1 = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'human-auditor' });
  assert.equal(check1.allowed, false);
  assert.match(check1.reasons.join(' '), /Legal gate is not cleared/);

  // Transition blocked if human reviewer missing
  candidate.qualification.legal.status = LEGAL_STATUS.CLEARED_COMMERCIAL;
  candidate.reviewAuditTrail = [];
  const check2 = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: null });
  assert.equal(check2.allowed, false);
  assert.match(check2.reasons.join(' '), /Human reviewer approval is strictly mandatory/);

  // Once all 4 gates pass AND human reviewer sign-off is provided, transition is allowed
  const check3 = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'chief-editor' });
  assert.equal(check3.allowed, true);
  assert.equal(check3.reasons.length, 0);

  // Executing transition updates lifecycle status and appends audit record
  transitionCandidate(candidate, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'chief-editor', notes: 'Approved for catalog qualification' });
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.QUALIFIED);
  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.action, 'LIFECYCLE_TRANSITION_QUALIFIED');
  assert.equal(lastAudit.reviewer, 'chief-editor');
});

// ============================================================================
// 2. LEGAL SAFETY
// ============================================================================

test('legal safety: UNKNOWN licenses must never grant commercial permission', () => {
  const candidate = {
    candidateId: 'gh-unknown-lic',
    licenseName: 'UNKNOWN',
    licensingStatus: 'UNKNOWN',
  };

  const q = createDefaultQualification(candidate);
  assert.equal(q.legal.status, LEGAL_STATUS.LICENSE_PENDING);
  assert.equal(q.legal.commercialRedistributionAllowed, false);
  assert.equal(q.legal.monetizationAllowed, null);

  const check = canTransitionTo({ qualification: q }, LIFECYCLE_STATUS.QUALIFIED, { reviewer: 'auditor' });
  assert.equal(check.allowed, false, 'unknown license must block QUALIFIED');
});

test('legal safety: copyleft license is distinct from technical rejection and license rejection', () => {
  const copyleftCandidate = {
    candidateId: 'gl-copyleft-game',
    licenseName: 'GPL-3.0',
    licensingStatus: 'RESTRICTED',
    technicalAcceptance: 'TECHNICALLY_ACCEPTED',
    html5Compatibility: true,
  };

  const q = createDefaultQualification(copyleftCandidate);
  assert.equal(q.technical.status, TECHNICAL_STATUS.PASSED, 'copyleft code must not be falsely marked as technically broken');
  assert.equal(q.legal.status, LEGAL_STATUS.RESTRICTED, 'copyleft must be preserved as RESTRICTED');
  assert.notEqual(q.legal.status, LEGAL_STATUS.LICENSE_REJECTED, 'RESTRICTED must not be collapsed into LICENSE_REJECTED');
  assert.notEqual(q.legal.status, LEGAL_STATUS.LICENSE_PENDING, 'RESTRICTED must not be collapsed into LICENSE_PENDING');
  assert.equal(q.legal.commercialRedistributionAllowed, false);
});

test('legal safety: asset permissions are not inferred from code license', () => {
  const mitWithUnspecifiedAssets = {
    candidateId: 'gh-mit-game',
    licenseName: 'MIT',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    assetLicensingStatus: 'Unspecified fan art sprites',
  };

  const q = createDefaultQualification(mitWithUnspecifiedAssets);
  assert.equal(q.legal.codeLicenseSpdx, 'MIT');
  assert.equal(q.legal.assetLicenseStatus, 'Unspecified fan art sprites');
  // Asset licensing is preserved explicitly without blind clearance
  assert.match(q.legal.notes, /fan art sprites/i);
});

// ============================================================================
// 3. SOURCE VERSION IDENTITY
// ============================================================================

test('source version identity: Git repository pins exact commit SHA', () => {
  const gitCandidate = {
    sourcePlatform: 'github',
    exactCommitHash: 'e3f89a1c2b4d5e6f',
    originalRepoUrl: 'https://github.com/user/game',
  };

  const id = createSourceIdentity(gitCandidate);
  assert.equal(id.sourceType, 'git');
  assert.equal(id.exactCommitHash, 'e3f89a1c2b4d5e6f');
  assert.equal(id.sourceFingerprint, null);
});

test('source version identity: non-Git source uses SHA-256 fingerprint', () => {
  const itchCandidate = {
    sourcePlatform: 'itch.io',
    candidateId: 'itch-creator-game',
    originalRepoUrl: 'https://creator.itch.io/game',
    lastUpdateDate: '2026-11-11',
    exactCommitHash: 'latest-web-build',
  };

  const id = createSourceIdentity(itchCandidate);
  assert.equal(id.sourceType, 'web-feed');
  assert.ok(id.sourceFingerprint.startsWith('sha256:'));
  assert.equal(id.sourceFingerprint.length, 71); // 'sha256:' + 64 hex chars
  assert.equal(id.sourceVersion, '2026-11-11');
});

// ============================================================================
// 4. REVIEW AUDIT TRAIL
// ============================================================================

test('review audit trail: records complete history without replacing previous records', () => {
  const candidate = {
    candidateId: 'gh-audit-test',
    reviewAuditTrail: [],
  };

  appendAuditRecord(candidate, {
    reviewer: 'reviewer-alpha',
    pillar: 'technical',
    action: 'TEST_BROWSER_COMPATIBILITY',
    previousStatus: 'UNREVIEWED',
    newStatus: 'PASSED',
    notes: 'Tested on Chrome 130 and Firefox 131',
    evidence: ['https://example.com/test-run'],
  });

  appendAuditRecord(candidate, {
    reviewer: 'reviewer-beta',
    pillar: 'security',
    action: 'STATIC_SECURITY_SCAN',
    previousStatus: 'UNREVIEWED',
    newStatus: 'PASSED',
    notes: 'Zero critical or high severity patterns',
  });

  assert.equal(candidate.reviewAuditTrail.length, 2);
  assert.equal(candidate.reviewAuditTrail[0].reviewer, 'reviewer-alpha');
  assert.equal(candidate.reviewAuditTrail[0].pillar, 'technical');
  assert.equal(candidate.reviewAuditTrail[1].reviewer, 'reviewer-beta');
  assert.equal(candidate.reviewAuditTrail[1].pillar, 'security');
});
