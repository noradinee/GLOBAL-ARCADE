import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  migrateCandidate,
  rollbackCandidate,
  migrateCandidateDirectory,
} from '../scripts/discovery/migrate-candidates.js';

const REAL_CANDIDATE_DIR = path.resolve('discovery/candidates');

function createTempCandidateDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-mig-test-'));
  // Copy candidate files as legacy format into temp directory to test migration lifecycle
  if (fs.existsSync(REAL_CANDIDATE_DIR)) {
    const files = fs.readdirSync(REAL_CANDIDATE_DIR).filter(f => f.endsWith('.json')).slice(0, 5);
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(REAL_CANDIDATE_DIR, f), 'utf-8'));
      delete data.schemaVersion;
      delete data.qualification;
      delete data.reviewAuditTrail;
      fs.writeFileSync(path.join(tmpDir, f), JSON.stringify(data, null, 2), 'utf-8');
    }
  }
  return tmpDir;
}

test('migration: upgrades legacy candidate dossier while preserving all legacy fields', () => {
  const legacyCandidate = {
    candidateId: 'gh-legacy-game',
    name: 'Legacy Game',
    originalRepoUrl: 'https://github.com/author/legacy-game',
    author: 'author',
    discoveryDate: '2026-11-10',
    lastUpdateDate: '2026-05-01',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas2D',
    html5Compatibility: true,
    licenseName: 'MIT',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    securityStatus: 'PASSED',
    reviewerDecision: 'APPROVE',
    reviewNotes: 'Manually vetted and verified clean.',
    scores: { totalScore: 80 },
    exactCommitHash: 'a1b2c3d4e5f6',
  };

  const migrated = migrateCandidate(legacyCandidate);

  // V2 additions
  assert.equal(migrated.schemaVersion, '2.0');
  assert.equal(migrated.lifecycleStatus, 'QUALIFIED');
  assert.ok(migrated.qualification);
  assert.equal(migrated.qualification.technical.status, 'PASSED');
  assert.equal(migrated.qualification.security.status, 'PASSED');
  assert.equal(migrated.qualification.legal.status, 'ATTRIBUTION_REQUIRED');
  assert.equal(migrated.qualification.editorial.status, 'APPROVED');
  assert.equal(migrated.sourceType, 'git');
  assert.equal(migrated.exactCommitHash, 'a1b2c3d4e5f6');

  // Audit trail initialization
  assert.equal(Array.isArray(migrated.reviewAuditTrail), true);
  assert.equal(migrated.reviewAuditTrail.length, 1);
  assert.equal(migrated.reviewAuditTrail[0].action, 'SCHEMA_MIGRATION_V2');
  assert.equal(migrated.reviewAuditTrail[0].notes, legacyCandidate.reviewNotes);

  // All legacy fields strictly preserved
  assert.equal(migrated.candidateId, legacyCandidate.candidateId);
  assert.equal(migrated.name, legacyCandidate.name);
  assert.equal(migrated.author, legacyCandidate.author);
  assert.equal(migrated.scores.totalScore, 80);
  assert.equal(migrated.reviewerDecision, legacyCandidate.reviewerDecision);
});

test('migration: 100% idempotent (running twice gives identical result)', () => {
  const legacy = {
    candidateId: 'gh-idempotent-game',
    name: 'Idempotent Game',
    originalRepoUrl: 'https://github.com/author/idempotent-game',
    author: 'author',
    discoveryDate: '2026-11-11',
    licenseName: 'MIT',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    securityStatus: 'PASSED',
    reviewerDecision: 'PENDING_REVIEW',
  };

  const firstPass = migrateCandidate(legacy);
  const secondPass = migrateCandidate(firstPass);

  assert.deepEqual(secondPass, firstPass, 'second migration must produce identical object');
  assert.equal(secondPass.reviewAuditTrail.length, 1, 'must not duplicate audit trail entries');
});

test('migration: 100% reversible via rollbackCandidate', () => {
  const legacy = {
    candidateId: 'gh-rollback-game',
    name: 'Rollback Game',
    originalRepoUrl: 'https://github.com/author/rollback-game',
    author: 'author',
    discoveryDate: '2026-11-11',
    licenseName: 'MIT',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    securityStatus: 'PASSED',
    reviewerDecision: 'PENDING_REVIEW',
    scores: { totalScore: 75 },
  };

  const migrated = migrateCandidate(legacy);
  const restored = rollbackCandidate(migrated);

  // All V2 additions removed
  assert.equal(restored.schemaVersion, undefined);
  assert.equal(restored.lifecycleStatus, undefined);
  assert.equal(restored.qualification, undefined);
  assert.equal(restored.reviewAuditTrail, undefined);

  // Original V1 structure identical
  assert.deepEqual(restored, legacy);
});

test('migration: unknown license info remains unknown after migration', () => {
  const legacyUnknown = {
    candidateId: 'gh-unknown-lic-game',
    name: 'Unknown Lic Game',
    originalRepoUrl: 'https://github.com/author/unknown-game',
    author: 'author',
    discoveryDate: '2026-11-11',
    licenseName: 'UNKNOWN',
    licensingStatus: 'UNKNOWN',
    securityStatus: 'PASSED',
    reviewerDecision: 'PENDING_REVIEW',
  };

  const migrated = migrateCandidate(legacyUnknown);
  assert.equal(migrated.qualification.legal.status, 'LICENSE_PENDING');
  assert.equal(migrated.qualification.legal.codeLicenseSpdx, 'UNKNOWN');
  assert.equal(migrated.qualification.legal.commercialRedistributionAllowed, false);
});

test('migration: real candidate directory batch migration in temporary workspace', (t) => {
  const tmpDir = createTempCandidateDir();
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  // 1. Dry run produces no modifications on disk
  const dryResult = migrateCandidateDirectory(tmpDir, { dryRun: true });
  assert.ok(dryResult.total >= 4);
  assert.ok(dryResult.migrated > 0);

  // 2. Real migration writes V2 format
  const realResult = migrateCandidateDirectory(tmpDir, { dryRun: false });
  assert.equal(realResult.migrated, dryResult.migrated);

  // Verify each migrated file matches V2 schema
  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const candidate = JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf-8'));
    assert.equal(candidate.schemaVersion, '2.0');
    assert.ok(candidate.qualification);
    assert.ok(candidate.reviewAuditTrail);
  }

  // 3. Rollback restores original format
  const rollbackResult = migrateCandidateDirectory(tmpDir, { rollback: true });
  assert.equal(rollbackResult.migrated, realResult.migrated);

  for (const f of files) {
    const candidate = JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf-8'));
    assert.equal(candidate.schemaVersion, undefined);
    assert.equal(candidate.qualification, undefined);
  }
});
