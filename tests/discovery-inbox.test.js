import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  LEGAL_STATUS,
  EDITORIAL_STATUS,
  REJECTION_TYPE,
  createInitialCandidate,
  updateGate,
  canTransitionTo,
  transitionCandidate,
  markHumanRejection,
  reEvaluateCandidate,
} from '../scripts/discovery/qualification-model.js';

import { generateCandidateIndex } from '../scripts/discovery/generate-index.js';
import { inboxApiMiddleware } from '../scripts/discovery/inbox-api-middleware.js';

// Helper to start a temporary test server with inboxApiMiddleware
function createTestServer(customMiddleware) {
  return http.createServer((req, res) => {
    customMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end('Not Found');
    });
  });
}

// Helper to make HTTP request to test server
function makeRequest(server, method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = resData ? JSON.parse(resData) : null;
          } catch {
            json = resData;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================================================
// 1. MANIFEST & STATUS COUNTS
// ============================================================================

test('inbox: manifest computes accurate status counts directly from candidate dossiers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-inbox-counts-'));

  try {
    const candidatesDir = path.join(tmpDir, 'discovery', 'candidates');
    fs.mkdirSync(candidatesDir, { recursive: true });

    // Create 3 test candidates: 1 Pending, 1 Qualified, 1 Rejected
    const pending = createInitialCandidate({
      candidateId: 'gh-pending-1',
      name: 'Pending Game',
      author: 'dev1',
      licenseName: 'MIT',
      sourcePlatform: 'github',
    });

    const qualified = createInitialCandidate({
      candidateId: 'gh-qualified-1',
      name: 'Qualified Game',
      author: 'dev2',
      licenseName: 'MIT',
      sourcePlatform: 'gitlab',
    });
    qualified.lifecycleStatus = LIFECYCLE_STATUS.QUALIFIED;
    qualified.qualification.technical.status = TECHNICAL_STATUS.PASSED;
    qualified.qualification.security.status = SECURITY_STATUS.PASSED;
    qualified.qualification.legal.status = LEGAL_STATUS.CLEARED_COMMERCIAL;
    qualified.qualification.editorial.status = EDITORIAL_STATUS.APPROVED;

    const rejected = createInitialCandidate({
      candidateId: 'gh-rejected-1',
      name: 'Rejected Game',
      author: 'dev3',
      licenseName: 'GPL-3.0',
      sourcePlatform: 'codeberg',
    });
    rejected.lifecycleStatus = LIFECYCLE_STATUS.REJECTED;
    rejected.rejectionType = REJECTION_TYPE.HUMAN_REVIEW;
    rejected.rejectionReason = 'Copyleft licensing constraint';

    fs.writeFileSync(path.join(candidatesDir, 'gh-pending-1.json'), JSON.stringify(pending, null, 2), 'utf-8');
    fs.writeFileSync(path.join(candidatesDir, 'gh-qualified-1.json'), JSON.stringify(qualified, null, 2), 'utf-8');
    fs.writeFileSync(path.join(candidatesDir, 'gh-rejected-1.json'), JSON.stringify(rejected, null, 2), 'utf-8');

    const manifest = generateCandidateIndex({
      candidatesDir,
      outputPath: path.join(tmpDir, 'discovery', 'index.json'),
      dryRun: false,
    });

    assert.equal(manifest.metrics.totalCandidates, 3);
    assert.equal(manifest.metrics.byStatus.INBOX_PENDING, 1);
    assert.equal(manifest.metrics.byStatus.QUALIFIED, 1);
    assert.equal(manifest.metrics.byStatus.REJECTED, 1);
    assert.equal(manifest.metrics.byRejectionType.HUMAN_REVIEW, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 2. FOUR GATES INDEPENDENCE & NO AUTOMATIC APPROVAL
// ============================================================================

test('inbox: never displays UNREVIEWED as PASSED and blocks qualification until all 4 gates pass', () => {
  const candidate = createInitialCandidate({
    candidateId: 'gh-unreviewed-test',
    name: 'Unreviewed Invariant Test',
    author: 'author',
    licenseName: 'MIT',
  });

  // Critical Invariant: All gates must start as UNREVIEWED
  assert.equal(candidate.qualification.technical.status, TECHNICAL_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.security.status, SECURITY_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.legal.status, LEGAL_STATUS.UNREVIEWED);
  assert.equal(candidate.qualification.editorial.status, EDITORIAL_STATUS.UNREVIEWED);

  // Status must never equal PASSED
  assert.notEqual(candidate.qualification.technical.status, TECHNICAL_STATUS.PASSED);
  assert.notEqual(candidate.qualification.security.status, SECURITY_STATUS.PASSED);
  assert.notEqual(candidate.qualification.legal.status, LEGAL_STATUS.CLEARED_COMMERCIAL);
  assert.notEqual(candidate.qualification.editorial.status, EDITORIAL_STATUS.APPROVED);

  // Attempting qualification fails
  const check = canTransitionTo(candidate, LIFECYCLE_STATUS.QUALIFIED);
  assert.equal(check.allowed, false);
  assert.ok(check.reasons.some(r => r.includes('Technical gate is not PASSED')));
  assert.ok(check.reasons.some(r => r.includes('Security gate is not PASSED')));
  assert.ok(check.reasons.some(r => r.includes('Legal gate is not cleared')));
  assert.ok(check.reasons.some(r => r.includes('Editorial gate is not APPROVED')));
});

// ============================================================================
// 3. OWNER ACTIONS: GATE UPDATES, AUDIT TRAIL, & QUALIFICATION
// ============================================================================

test('inbox: owner gate updates record reviewer notes, timestamp, and audit trail', () => {
  const candidate = createInitialCandidate({
    candidateId: 'gh-audit-test',
    name: 'Audit Trail Test',
    author: 'tester',
    licenseName: 'MIT',
  });

  const initialCount = candidate.reviewAuditTrail.length;

  // 1. Update Technical Gate
  updateGate(
    candidate,
    'technical',
    { status: TECHNICAL_STATUS.PASSED, notes: 'Vanilla HTML5 Canvas verified' },
    { reviewer: 'owner', notes: 'Vanilla HTML5 Canvas verified' }
  );

  assert.equal(candidate.qualification.technical.status, TECHNICAL_STATUS.PASSED);
  assert.equal(candidate.qualification.technical.reviewer, 'owner');
  assert.equal(candidate.reviewAuditTrail.length, initialCount + 1);

  const lastAudit = candidate.reviewAuditTrail[candidate.reviewAuditTrail.length - 1];
  assert.equal(lastAudit.pillar, 'technical');
  assert.equal(lastAudit.newStatus, TECHNICAL_STATUS.PASSED);
  assert.equal(lastAudit.reviewer, 'owner');
  assert.equal(lastAudit.notes, 'Vanilla HTML5 Canvas verified');
});

// ============================================================================
// 4. REJECTION PRESERVATION & FUTURE RE-EVALUATION
// ============================================================================

test('inbox: rejecting candidate retains findings and re-evaluation restores INBOX_PENDING', () => {
  const candidate = createInitialCandidate({
    candidateId: 'gh-reject-reopen-test',
    name: 'Reject Reopen Test',
    author: 'dev',
    licenseName: 'MIT',
  });

  // 1. Human Rejection
  markHumanRejection(candidate, 'project-owner', 'Gameplay mechanics too complex for arcade format');
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.REJECTED);
  assert.equal(candidate.rejectionType, REJECTION_TYPE.HUMAN_REVIEW);
  assert.equal(candidate.rejectionReason, 'Gameplay mechanics too complex for arcade format');
  assert.ok(candidate.rejectionDate);

  // 2. Re-evaluate
  reEvaluateCandidate(candidate, 'project-owner', 'Developer simplified touch controls and tutorial');
  assert.equal(candidate.lifecycleStatus, LIFECYCLE_STATUS.INBOX_PENDING);
  assert.equal(candidate.rejectionType, null);
  assert.equal(candidate.rejectionReason, null);

  // Lineage is completely preserved in audit trail
  const actions = candidate.reviewAuditTrail.map(r => r.action);
  assert.ok(actions.includes('DISCOVERY_INBOX_ENQUEUE'));
  assert.ok(actions.includes('HUMAN_REVIEW_REJECTION'));
  assert.ok(actions.includes('REOPEN_FOR_REEVALUATION'));
});

// ============================================================================
// 5. PREVENTION OF UNAUTHORIZED DELETION (HTTP 405)
// ============================================================================

test('inbox-api: HTTP DELETE requests are strictly forbidden and return HTTP 405', async () => {
  const server = createTestServer(inboxApiMiddleware);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, 'DELETE', '/api/inbox/candidates/gh-test-candidate');
    assert.equal(res.status, 405);
    assert.ok(res.data.error.includes('Candidate deletion is strictly forbidden'));
  } finally {
    server.close();
  }
});

// ============================================================================
// 6. LEGACY V1 CANDIDATE COMPATIBILITY IN INBOX
// ============================================================================

test('inbox: legacy V1 candidate dossiers without V2 fields load and index safely', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-inbox-legacy-'));

  try {
    const candidatesDir = path.join(tmpDir, 'discovery', 'candidates');
    fs.mkdirSync(candidatesDir, { recursive: true });

    // Pure legacy V1 file (no schemaVersion, no qualification object, no audit trail)
    const legacyDossier = {
      candidateId: 'gh-pure-legacy',
      name: 'Pure Legacy Game',
      author: 'classic-author',
      originalRepoUrl: 'https://github.com/classic/legacy-game',
      discoveryDate: '2024-05-01',
      licenseName: 'MIT',
      licensingStatus: 'VERIFIED_COMMERCIAL_USE',
      securityStatus: 'PASSED',
      html5Compatibility: true,
      reviewerDecision: 'APPROVE',
    };

    fs.writeFileSync(path.join(candidatesDir, 'gh-pure-legacy.json'), JSON.stringify(legacyDossier, null, 2), 'utf-8');

    const manifest = generateCandidateIndex({
      candidatesDir,
      outputPath: path.join(tmpDir, 'discovery', 'index.json'),
      dryRun: false,
    });

    assert.equal(manifest.metrics.totalCandidates, 1);
    const summary = manifest.candidates[0];
    assert.equal(summary.candidateId, 'gh-pure-legacy');
    assert.equal(summary.lifecycleStatus, 'QUALIFIED');
    assert.equal(summary.technicalStatus, 'PASSED');
    assert.equal(summary.securityStatus, 'PASSED');
    assert.equal(summary.legalStatus, 'CLEARED_COMMERCIAL');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
