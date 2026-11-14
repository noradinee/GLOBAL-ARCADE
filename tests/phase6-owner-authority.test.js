import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';
import { executeCandidateRepair, applyAutomatedRepairs, detectRepairableDefects } from '../scripts/discovery/repair-engine.js';
import {
  analyzeCandidateIssues,
  applySpecificIssueFix,
  ISSUE_CATEGORIES,
  SEVERITY_LEVELS,
  CONFIDENCE_LEVELS,
} from '../scripts/discovery/explain-and-solve.js';
import { inboxApiMiddleware } from '../scripts/discovery/inbox-api-middleware.js';

function createTempDir(prefix = 'ga-phase6-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function setupTestEnvironment(baseDir) {
  fs.mkdirSync(path.join(baseDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/staging'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/rejected'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/patches'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'public/games'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'data'), { recursive: true });

  // Initial games catalog
  fs.writeFileSync(path.join(baseDir, 'src/data/games.json'), JSON.stringify([
    { id: 'existing-game', slug: 'existing-game', title: 'Existing Game', status: 'active' }
  ], null, 2));

  // Initial audit log
  fs.writeFileSync(path.join(baseDir, 'data/audit-logs.json'), JSON.stringify([]));
}

// ============================================================================
// 1. FEATURE 1: OWNER DIRECT PUBLISH TESTS
// ============================================================================

test('phase6: owner direct publish bypasses automated gates and publishes immediately', (t) => {
  const env = createTempDir();
  t.after(() => fs.rmSync(env, { recursive: true, force: true }));
  setupTestEnvironment(env);

  // Create a candidate that failed automated qualification (Copyleft GPL-3.0, Security Review, Rejected)
  const candidateId = 'gh-test-gpl-game';
  const candidateDossier = {
    candidateId,
    name: 'GPL Test Game',
    author: 'indie-dev',
    sourcePlatform: 'github',
    originalRepoUrl: 'https://github.com/indie-dev/gpl-game',
    licenseName: 'GPL-3.0',
    lifecycleStatus: 'REJECTED',
    technicalAcceptance: 'REJECTED',
    publicationEligibility: 'INELIGIBLE',
    reviewerDecision: 'REJECT',
    scores: { totalScore: 45 },
    qualification: {
      technical: { status: 'FAILED', notes: 'Automated screening failed' },
      security: { status: 'SECURITY_REVIEW', notes: 'Suspicious dynamic constructs' },
      legal: { status: 'RESTRICTED', commercialRedistributionAllowed: false },
      editorial: { status: 'REJECTED' },
    },
    exactCommitHash: 'abc1234',
  };

  fs.writeFileSync(
    path.join(env, `discovery/candidates/${candidateId}.json`),
    JSON.stringify(candidateDossier, null, 2)
  );

  // Stage playable game files
  const stagingDir = path.join(env, `discovery/staging/${candidateId}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'index.html'), '<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>');
  fs.writeFileSync(path.join(stagingDir, 'game.js'), 'console.log("running");');

  // Verify normal safeImportCandidate WOULD throw error because gates failed
  assert.throws(() => {
    safeImportCandidate(candidateId, { rootDir: env, ownerDirectPublish: false });
  }, /CRITICAL: V2 candidate .* failed Technical gate/);

  // Now execute OWNER DIRECT PUBLISH
  const publishResult = safeImportCandidate(candidateId, {
    rootDir: env,
    ownerDirectPublish: true,
    owner: 'verified-owner-1',
  });

  assert.equal(publishResult.success, true);
  assert.equal(publishResult.ownerDirectPublish, true);
  assert.equal(publishResult.slug, 'test-gpl-game');
  assert.ok(publishResult.url.includes('/games/test-gpl-game/index.html'));

  // 1. Verify bypassed findings are explicitly recorded
  assert.ok(Array.isArray(publishResult.bypassedFindings));
  assert.ok(publishResult.bypassedFindings.length > 0);
  assert.ok(publishResult.bypassedFindings.some(f => f.includes('Technical gate')));
  assert.ok(publishResult.bypassedFindings.some(f => f.includes('Legal gate')));

  // 2. Verify registered in games.json
  const games = JSON.parse(fs.readFileSync(path.join(env, 'src/data/games.json'), 'utf-8'));
  const publishedGame = games.find(g => g.slug === 'test-gpl-game');
  assert.ok(publishedGame, 'Game should be in games.json');
  assert.equal(publishedGame.ownerOverride, true);
  assert.equal(publishedGame.publishedBy, 'verified-owner-1');
  assert.equal(publishedGame.exactCommitHash, 'abc1234');

  // 3. Verify deployed files in public/games/
  const deployedIndex = path.join(env, 'public/games/test-gpl-game/index.html');
  assert.ok(fs.existsSync(deployedIndex), 'index.html must exist in public/games/test-gpl-game/');

  // 4. Verify candidate dossier updated
  const updatedDossier = JSON.parse(fs.readFileSync(path.join(env, `discovery/candidates/${candidateId}.json`), 'utf-8'));
  assert.equal(updatedDossier.lifecycleStatus, 'PUBLISHED');
  assert.equal(updatedDossier.ownerDirectPublish, true);
  assert.equal(updatedDossier.publishedBy, 'verified-owner-1');

  // 5. Verify audit log entry
  const auditLogs = JSON.parse(fs.readFileSync(path.join(env, 'data/audit-logs.json'), 'utf-8'));
  const publishAudit = auditLogs.find(l => l.action === 'OWNER_DIRECT_PUBLISH');
  assert.ok(publishAudit, 'Audit log must record OWNER_DIRECT_PUBLISH');
  assert.equal(publishAudit.owner, 'verified-owner-1');
  assert.equal(publishAudit.candidateId, candidateId);
});

test('phase6: technical blocker prevention and transactional rollback', (t) => {
  const env = createTempDir();
  t.after(() => fs.rmSync(env, { recursive: true, force: true }));
  setupTestEnvironment(env);

  // Candidate with NO entry point (missing index.html everywhere)
  const candidateId = 'gh-broken-candidate';
  const candidateDossier = {
    candidateId,
    name: 'Broken Candidate',
    author: 'dev',
    sourcePlatform: 'github',
    licenseName: 'MIT',
    lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    exactCommitHash: 'bad999',
  };

  fs.writeFileSync(
    path.join(env, `discovery/candidates/${candidateId}.json`),
    JSON.stringify(candidateDossier, null, 2)
  );

  // Staging folder without any HTML file
  const stagingDir = path.join(env, `discovery/staging/${candidateId}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'readme.txt'), 'No game here');

  // Read original games.json
  const originalGames = fs.readFileSync(path.join(env, 'src/data/games.json'), 'utf-8');

  // Attempt OWNER DIRECT PUBLISH -> Must throw explicit TECHNICAL BLOCKER
  assert.throws(() => {
    safeImportCandidate(candidateId, {
      rootDir: env,
      ownerDirectPublish: true,
      owner: 'owner',
    });
  }, (err) => {
    assert.ok(err.message.includes('TECHNICAL BLOCKER'), 'Must throw technical blocker');
    assert.ok(err.message.includes('No playable web entry point'), 'Must explain exact cause');
    return true;
  });

  // Verify rollback: games.json was NOT modified
  const currentGames = fs.readFileSync(path.join(env, 'src/data/games.json'), 'utf-8');
  assert.equal(currentGames, originalGames, 'games.json must remain completely intact');

  // Verify no corrupt folder created in public/games/
  assert.equal(fs.existsSync(path.join(env, 'public/games/broken-candidate')), false);
});

// ============================================================================
// 2. FEATURE 2: FIX ISSUES TESTS
// ============================================================================

test('phase6: fix issues executes repairs, preserves original files, and never auto-publishes', async (t) => {
  const env = createTempDir();
  t.after(() => fs.rmSync(env, { recursive: true, force: true }));
  setupTestEnvironment(env);

  const candidateId = 'gh-repairable-game';
  const candidateDossier = {
    candidateId,
    name: 'Repairable Game',
    author: 'author',
    sourcePlatform: 'github',
    licenseName: 'MIT',
    lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    qualification: {
      technical: { status: 'UNREVIEWED' },
      security: { status: 'UNREVIEWED' },
      legal: { status: 'CLEARED_COMMERCIAL' },
      editorial: { status: 'APPROVED' },
    },
    exactCommitHash: 'rep123',
  };

  fs.writeFileSync(
    path.join(env, `discovery/candidates/${candidateId}.json`),
    JSON.stringify(candidateDossier, null, 2)
  );

  // Staged files with multiple defects:
  // 1. Entry point in subfolder dist/index.html
  // 2. Root-absolute paths: src="/assets/game.js"
  // 3. Missing viewport meta
  // 4. Missing canvas overflow reset
  // 5. Frame buster script
  const stagingDir = path.join(env, `discovery/staging/${candidateId}`);
  fs.mkdirSync(path.join(stagingDir, 'dist'), { recursive: true });
  const defectiveHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Game</title>
  <script src="/assets/game.js"></script>
</head>
<body>
  <script>if (top.location != self.location) top.location = self.location;</script>
  <canvas></canvas>
</body>
</html>`;
  fs.writeFileSync(path.join(stagingDir, 'dist/index.html'), defectiveHtml);

  // Execute candidate repair
  const result = await executeCandidateRepair(candidateId, { rootDir: env, owner: 'owner' });

  assert.equal(result.success, true);
  assert.equal(result.repairResult.repaired, true);
  assert.ok(result.repairResult.patchesApplied.length >= 2, 'Should apply multiple patches');

  // 1. Invariant: Pristine snapshot created
  assert.ok(fs.existsSync(path.join(stagingDir, '.original')), 'Must create .original/ snapshot');

  // 2. Invariant: Root entry point trampoline created
  assert.ok(fs.existsSync(path.join(stagingDir, 'index.html')), 'Must create root index.html');
  const rootContent = fs.readFileSync(path.join(stagingDir, 'index.html'), 'utf-8');
  assert.ok(rootContent.includes('iframe src="./dist/index.html"'), 'Root trampoline must embed subpath');

  // 3. Invariant: Root-absolute paths rewritten
  const distContent = fs.readFileSync(path.join(stagingDir, 'dist/index.html'), 'utf-8');
  assert.ok(distContent.includes('src="./assets/game.js"'), 'Must convert to relative path');

  // 4. Invariant: Viewport injected
  assert.ok(distContent.includes('<meta name="viewport"'), 'Must inject viewport meta tag');

  // 5. Invariant: Canvas overflow styling injected
  assert.ok(distContent.includes('overflow:hidden'), 'Must inject overflow reset');

  // 6. Invariant: Frame buster neutralized
  assert.ok(distContent.includes('/* neutral-frame */') || distContent.includes('[NEUTRALIZED FRAME BUSTER]'), 'Must neutralize top.location');

  // 7. CRITICAL INVARIANT: NEVER auto-publish after repair!
  const candidateAfter = JSON.parse(fs.readFileSync(path.join(env, `discovery/candidates/${candidateId}.json`), 'utf-8'));
  assert.equal(candidateAfter.lifecycleStatus, 'NEEDS_OWNER_REVIEW', 'Candidate must remain in owner review, NOT published');
  assert.notEqual(candidateAfter.lifecycleStatus, 'PUBLISHED');

  // Verify games.json was NOT modified
  const games = JSON.parse(fs.readFileSync(path.join(env, 'src/data/games.json'), 'utf-8'));
  assert.equal(games.some(g => g.id === 'repairable-game'), false, 'Repaired candidate must not be published into games.json');

  // 8. Patch file saved
  const patchFile = path.join(env, `discovery/patches/${candidateId}.patch.json`);
  assert.ok(fs.existsSync(patchFile), 'Patch receipt file must exist');
});

// ============================================================================
// 3. FEATURE 3: EXPLAIN & SOLVE DIAGNOSTICS TESTS
// ============================================================================

test('phase6: explain and solve diagnoses issues across required categories with full attribution', (t) => {
  const env = createTempDir();
  t.after(() => fs.rmSync(env, { recursive: true, force: true }));
  setupTestEnvironment(env);

  const candidateId = 'gh-complex-diagnosis';
  const candidate = {
    candidateId,
    name: 'Diagnostic Showcase',
    author: 'creator',
    sourcePlatform: 'github',
    licenseName: 'AGPL-3.0',
    assetLicensingStatus: 'UNSPECIFIED',
    assetLicensingNotes: 'Asset provenance unspecified. Audio origin unverified.',
    securityFindings: [
      {
        ruleId: 'SEC-EVAL-CALL',
        name: 'Dynamic Code Execution (eval)',
        severity: 'CRITICAL',
        file: 'src/loader.js',
        snippet: 'eval(untrustedPayload);',
        description: 'Direct invocation of eval() detected with dynamic string argument.',
      },
    ],
    exactCommitHash: 'diag101',
  };

  const stagingDir = path.join(env, `discovery/staging/${candidateId}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  // Add index.html with external CDN link and missing viewport
  fs.writeFileSync(path.join(stagingDir, 'index.html'), `<!DOCTYPE html><html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.55.2/phaser.min.js"></script></head><body><canvas></canvas></body></html>`);

  const diagnosis = analyzeCandidateIssues(candidate, { rootDir: env, stagingDir });

  assert.ok(diagnosis.totalIssues >= 4, 'Should detect multiple issues');
  assert.ok(diagnosis.criticalCount >= 1, 'Should detect critical security issue');

  // Verify Security Finding structure (Categories: SECURITY_FINDINGS)
  const secIssue = diagnosis.issues.find(i => i.category === ISSUE_CATEGORIES.SECURITY_FINDINGS);
  assert.ok(secIssue);
  assert.equal(secIssue.severity, SEVERITY_LEVELS.CRITICAL);
  assert.ok(secIssue.exactEvidence.includes('eval'));
  assert.ok(secIssue.explanation.plainLanguage.length > 20);
  assert.ok(secIssue.explanation.whyItMatters.length > 20);
  assert.ok(secIssue.explanation.observableImpact.length > 20);
  assert.ok(secIssue.rootCauseAnalysis.causes.length > 0);
  assert.ok(secIssue.recommendedSolutions.primary);
  assert.equal(secIssue.recommendedSolutions.primary.canAutomate, false, 'Security evaluation cannot be blindly automated');
  assert.ok(secIssue.actions.includes('SHOW_FIX_DETAILS'));

  // Verify Legal Finding (Categories: LICENSE_ATTRIBUTION)
  const legalIssue = diagnosis.issues.find(i => i.category === ISSUE_CATEGORIES.LICENSE_ATTRIBUTION && i.id.includes('commercial'));
  assert.ok(legalIssue);
  assert.equal(legalIssue.severity, SEVERITY_LEVELS.HIGH);
  assert.ok(legalIssue.title.includes('Copyleft'));
  assert.ok(legalIssue.verification.notes.includes('cannot establish legal rights'), 'Must explain technical fix cannot grant legal license');

  // Verify External Network Finding (Categories: EXTERNAL_NETWORK)
  const cdnIssue = diagnosis.issues.find(i => i.category === ISSUE_CATEGORIES.EXTERNAL_NETWORK);
  assert.ok(cdnIssue);
  assert.ok(cdnIssue.exactEvidence.includes('cdnjs.cloudflare.com'));
  assert.ok(cdnIssue.recommendedSolutions.primary.title.includes('Vendor External Scripts Locally'));

  // Test 1-click issue resolution for automatable issue (e.g. mobile viewport)
  const vpIssue = diagnosis.issues.find(i => i.category === ISSUE_CATEGORIES.MOBILE_RESPONSIVENESS);
  assert.ok(vpIssue);
  assert.equal(vpIssue.recommendedSolutions.primary.canAutomate, true);

  // Apply resolution
  fs.writeFileSync(path.join(env, `discovery/candidates/${candidateId}.json`), JSON.stringify(candidate, null, 2));
  const fixRes = applySpecificIssueFix(candidateId, vpIssue.id, { rootDir: env, stagingDir });
  assert.equal(fixRes.success, true);
  assert.equal(fixRes.verification.status, 'RESOLVED');

  // Verify file was patched
  const patchedContent = fs.readFileSync(path.join(stagingDir, 'index.html'), 'utf-8');
  assert.ok(patchedContent.includes('<meta name="viewport"'));
});

// ============================================================================
// 4. INBOX API MIDDLEWARE & SECURITY TESTS
// ============================================================================

test('phase6: inbox api middleware enforces security and handles direct publish & fix-issues', async (t) => {
  const env = createTempDir();
  t.after(() => fs.rmSync(env, { recursive: true, force: true }));
  setupTestEnvironment(env);

  const candidateId = 'gh-api-test-game';
  const candidate = {
    candidateId,
    name: 'API Test Game',
    author: 'tester',
    sourcePlatform: 'github',
    licenseName: 'MIT',
    lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    exactCommitHash: 'api999',
  };
  fs.writeFileSync(
    path.join(env, `discovery/candidates/${candidateId}.json`),
    JSON.stringify(candidate, null, 2)
  );

  const stagingDir = path.join(env, `discovery/staging/${candidateId}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'index.html'), '<!DOCTYPE html><html><body><canvas></canvas></body></html>');

  // 1. External unauthorized IP access is blocked
  await new Promise((resolve) => {
    const req = {
      url: `/api/inbox/candidates/${candidateId}`,
      method: 'GET',
      socket: { remoteAddress: '198.51.100.1' }, // External IP
    };
    const res = {
      statusCode: 0,
      setHeader() {},
      end(body) {
        assert.equal(this.statusCode, 403, 'External IP must receive 403 Forbidden');
        resolve();
      },
    };
    inboxApiMiddleware(req, res, () => {});
  });

  // 2. Candidate ID path traversal is rejected
  await new Promise((resolve) => {
    const req = {
      url: `/api/inbox/candidates/..%2F..%2Fetc%2Fpasswd`,
      method: 'GET',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      statusCode: 0,
      setHeader() {},
      end(body) {
        assert.equal(this.statusCode, 400, 'Path traversal must receive 400 Bad Request');
        resolve();
      },
    };
    inboxApiMiddleware(req, res, () => {});
  });

  // 3. HTTP DELETE is strictly forbidden
  await new Promise((resolve) => {
    const req = {
      url: `/api/inbox/candidates/${candidateId}`,
      method: 'DELETE',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      statusCode: 0,
      setHeader() {},
      end(body) {
        assert.equal(this.statusCode, 405, 'HTTP DELETE must be rejected with 405');
        resolve();
      },
    };
    inboxApiMiddleware(req, res, () => {});
  });

  // 4. Missing CSRF header on POST is rejected
  await new Promise((resolve) => {
    const req = {
      url: `/api/inbox/candidates/${candidateId}/publish-now`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      statusCode: 0,
      setHeader() {},
      end(body) {
        assert.equal(this.statusCode, 403, 'Missing CSRF header must be rejected with 403');
        resolve();
      },
    };
    inboxApiMiddleware(req, res, () => {});
  });
});
