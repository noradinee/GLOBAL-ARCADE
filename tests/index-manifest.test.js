import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { generateCandidateIndex } from '../scripts/discovery/generate-index.js';

function setupMockCandidateDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-idx-test-'));

  const candidateA = {
    candidateId: 'gh-alpha-game',
    name: 'Alpha Game',
    author: 'alpha-dev',
    sourcePlatform: 'github',
    originalRepoUrl: 'https://github.com/alpha-dev/alpha-game',
    discoveryDate: '2026-11-01',
    lastUpdateDate: '2026-05-01',
    scores: { totalScore: 85 },
    exactCommitHash: 'commit111',
    lifecycleStatus: 'QUALIFIED',
    qualification: {
      technical: { status: 'PASSED' },
      security: { status: 'PASSED' },
      legal: { status: 'CLEARED_COMMERCIAL' },
      editorial: { status: 'APPROVED' },
    },
    multiplayer: { mode: 'SINGLE_PLAYER' },
  };

  const candidateB = {
    candidateId: 'itch-beta-game',
    name: 'Beta Game',
    author: 'beta-creator',
    sourcePlatform: 'itch.io',
    originalRepoUrl: 'https://beta-creator.itch.io/beta-game',
    discoveryDate: '2026-11-05',
    lastUpdateDate: '2026-06-01',
    scores: { totalScore: 92 },
    sourceFingerprint: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    lifecycleStatus: 'INBOX_PENDING',
    qualification: {
      technical: { status: 'PASSED' },
      security: { status: 'PASSED' },
      legal: { status: 'LICENSE_PENDING' },
      editorial: { status: 'UNREVIEWED' },
    },
    multiplayer: { mode: 'LOCAL_MULTIPLAYER' },
  };

  const candidateC = {
    candidateId: 'gl-gamma-game',
    name: 'Gamma Game',
    author: 'gamma-group',
    sourcePlatform: 'gitlab',
    originalRepoUrl: 'https://gitlab.com/gamma-group/gamma-game',
    discoveryDate: '2026-11-10',
    lastUpdateDate: '2026-04-01',
    scores: { totalScore: 60 },
    exactCommitHash: 'commit333',
    lifecycleStatus: 'REJECTED',
    qualification: {
      technical: { status: 'REJECTED' },
      security: { status: 'PASSED' },
      legal: { status: 'RESTRICTED' },
      editorial: { status: 'REJECTED' },
    },
  };

  fs.writeFileSync(path.join(dir, 'gh-alpha-game.json'), JSON.stringify(candidateA, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dir, 'itch-beta-game.json'), JSON.stringify(candidateB, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dir, 'gl-gamma-game.json'), JSON.stringify(candidateC, null, 2), 'utf-8');

  return dir;
}

test('index-manifest: generates structured summary manifest from candidate dossiers', (t) => {
  const dir = setupMockCandidateDir();
  const outputPath = path.join(dir, 'index.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const manifest = generateCandidateIndex({ candidatesDir: dir, outputPath, dryRun: false });

  assert.equal(manifest.version, '2.0');
  assert.equal(manifest.metrics.totalCandidates, 3);
  assert.equal(manifest.candidates.length, 3);

  // Sorted by score descending (Beta: 92, Alpha: 85, Gamma: 60)
  assert.equal(manifest.candidates[0].candidateId, 'itch-beta-game');
  assert.equal(manifest.candidates[1].candidateId, 'gh-alpha-game');
  assert.equal(manifest.candidates[2].candidateId, 'gl-gamma-game');

  // Metrics breakdown
  assert.equal(manifest.metrics.byStatus.QUALIFIED, 1);
  assert.equal(manifest.metrics.byStatus.INBOX_PENDING, 1);
  assert.equal(manifest.metrics.byStatus.REJECTED, 1);

  assert.equal(manifest.metrics.bySource.github, 1);
  assert.equal(manifest.metrics.bySource['itch.io'], 1);
  assert.equal(manifest.metrics.bySource.gitlab, 1);

  assert.equal(manifest.metrics.byLegalStatus.CLEARED_COMMERCIAL, 1);
  assert.equal(manifest.metrics.byLegalStatus.LICENSE_PENDING, 1);
  assert.equal(manifest.metrics.byLegalStatus.RESTRICTED, 1);

  // File was written to disk
  assert.ok(fs.existsSync(outputPath));
  const written = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  assert.equal(written.metrics.totalCandidates, 3);
});

test('index-manifest: 100% rebuildable anytime from authoritative dossiers', (t) => {
  const dir = setupMockCandidateDir();
  const outputPath = path.join(dir, 'index.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  // First generation
  const manifest1 = generateCandidateIndex({ candidatesDir: dir, outputPath, dryRun: false });

  // Delete manifest file
  fs.unlinkSync(outputPath);
  assert.ok(!fs.existsSync(outputPath));

  // Re-generate manifest
  const manifest2 = generateCandidateIndex({ candidatesDir: dir, outputPath, dryRun: false });

  assert.equal(manifest2.metrics.totalCandidates, manifest1.metrics.totalCandidates);
  assert.deepEqual(manifest2.candidates, manifest1.candidates);
  assert.deepEqual(manifest2.metrics, manifest1.metrics);
  assert.ok(fs.existsSync(outputPath));
});

test('index-manifest: updates dynamically when authoritative dossier changes', (t) => {
  const dir = setupMockCandidateDir();
  const outputPath = path.join(dir, 'index.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  // Initial manifest
  generateCandidateIndex({ candidatesDir: dir, outputPath });

  // Update candidate file
  const betaFile = path.join(dir, 'itch-beta-game.json');
  const beta = JSON.parse(fs.readFileSync(betaFile, 'utf-8'));
  beta.lifecycleStatus = 'QUALIFIED';
  beta.qualification.legal.status = 'CLEARED_COMMERCIAL';
  fs.writeFileSync(betaFile, JSON.stringify(beta, null, 2), 'utf-8');

  // Regenerate manifest
  const updated = generateCandidateIndex({ candidatesDir: dir, outputPath });
  assert.equal(updated.metrics.byStatus.QUALIFIED, 2);
  assert.equal(updated.metrics.byStatus.INBOX_PENDING, undefined);
  const betaSummary = updated.candidates.find(c => c.candidateId === 'itch-beta-game');
  assert.equal(betaSummary.lifecycleStatus, 'QUALIFIED');
  assert.equal(betaSummary.legalStatus, 'CLEARED_COMMERCIAL');
});
