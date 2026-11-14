import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { scoreCandidate } from '../scripts/discovery/score-candidates.js';
import { assessCandidateQuality } from '../scripts/discovery/assess-quality.js';
import { verifyLicense } from '../scripts/discovery/verify-license.js';
import { generateLicenseReview } from '../scripts/discovery/generate-license-review.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';
import { safeImportCandidate } from '../scripts/discovery/safe-import.js';

const goodCandidate = {
  name: 'Good Game',
  description: 'arcade game',
  html5Compatibility: true,
  dependencies: [],
  buildInstructions: 'Zero-build static vanilla HTML5',
  gameEngine: 'HTML5 Canvas2D',
  popularityIndicators: { githubStars: 100, forks: 10, communityPlays: 500 },
  licenseName: 'MIT',
};

test('policy: unknown license does not block technical acceptance', () => {
  const quality = assessCandidateQuality(goodCandidate);
  const scoring = scoreCandidate(goodCandidate, { status: 'UNKNOWN', isPermittedForPublication: false }, { status: 'PASSED', isPermittedForPublication: true }, quality);
  assert.equal(scoring.technicalAcceptance, 'TECHNICALLY_ACCEPTED');
  assert.equal(scoring.licensePending, true);
  assert.notEqual(scoring.recommendedDecision, 'APPROVE');
});

test('policy: missing asset license does not block technical acceptance', () => {
  const lic = verifyLicense({ licenseSpdx: 'MIT', assetLicenseNotes: 'unspecified' });
  assert.equal(lic.status, 'VERIFIED_COMMERCIAL_USE');
  const quality = assessCandidateQuality(goodCandidate);
  const scoring = scoreCandidate(goodCandidate, lic, { status: 'PASSED', isPermittedForPublication: true }, quality);
  assert.equal(scoring.technicalAcceptance, 'TECHNICALLY_ACCEPTED');
});

test('policy: security failure blocks technical acceptance', () => {
  const quality = assessCandidateQuality(goodCandidate);
  const scoring = scoreCandidate(goodCandidate, { status: 'VERIFIED_COMMERCIAL_USE', isPermittedForPublication: true }, { status: 'REJECTED', isPermittedForPublication: false }, quality);
  assert.equal(scoring.technicalAcceptance, 'REJECTED');
});

test('policy: quality failure blocks technical acceptance', () => {
  const badQuality = assessCandidateQuality({ name: 'Engine', description: 'engine framework', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  const scoring = scoreCandidate(goodCandidate, { status: 'VERIFIED_COMMERCIAL_USE', isPermittedForPublication: true }, { status: 'PASSED', isPermittedForPublication: true }, badQuality);
  assert.equal(scoring.technicalAcceptance, 'REJECTED');
});

test('policy: LICENSE-REVIEW includes all technically accepted candidates', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-lr-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 10 });
  const lr = fs.readFileSync(path.join(dir, 'discovery', 'LICENSE-REVIEW.md'), 'utf-8');
  assert.match(lr, /Cyber Blaster 2088/);
  assert.match(lr, /TECHNICALLY_ACCEPTED/);
});

test('policy: existing manual decisions survive regeneration', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-lr2-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1 });
  const lrPath = path.join(dir, 'discovery', 'LICENSE-REVIEW.md');
  let content = fs.readFileSync(lrPath, 'utf-8');
  content = content.replace('**Reviewer Decision:** PENDING', '**Reviewer Decision:** APPROVED');
  fs.writeFileSync(lrPath, content, 'utf-8');
  await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1 });
  const content2 = fs.readFileSync(lrPath, 'utf-8');
  assert.match(content2, /Reviewer Decision:\*\* APPROVED/);
});

test('policy: LICENSE_PENDING cannot enter production without approval', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-imp-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'public', 'games'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'games.json'), '[]', 'utf-8');
  const cand = {
    candidateId: 'gh-test-pending',
    name: 'Pending Game',
    originalRepoUrl: 'https://example.com/repo',
    author: 'tester',
    description: 'test',
    licenseName: 'UNKNOWN',
    assetLicensingStatus: 'Requires explicit author written clearance',
    reviewerDecision: 'REQUEST_MORE_INFORMATION',
    technicalAcceptance: 'TECHNICALLY_ACCEPTED',
    exactCommitHash: 'abc123',
  };
  fs.writeFileSync(path.join(dir, 'discovery', 'candidates', 'gh-test-pending.json'), JSON.stringify(cand, null, 2), 'utf-8');
  assert.throws(() => safeImportCandidate('gh-test-pending', { rootDir: dir }), /Human approval is strictly mandatory/i);
});

test('policy: dry-run safe', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-dry-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  await runDailyDiscoveryPipeline({ dryRun: true, offline: true, rootDir: dir });
  assert.ok(!fs.existsSync(path.join(dir, 'discovery', 'LICENSE-REVIEW.md')));
});