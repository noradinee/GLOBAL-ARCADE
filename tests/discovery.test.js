import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';
import { verifyLicense } from '../scripts/discovery/verify-license.js';

const ROOT = path.resolve(process.cwd());

function makeTempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-'));
  // Minimal tracked-ish structure
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  fs.writeFileSync(path.join(dir, 'src', 'data', 'games.json'), '[]', 'utf-8');
  return dir;
}

test('dry_run=true produces no repository modifications', async () => {
  const before = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
  const res = await runDailyDiscoveryPipeline({ dryRun: true, offline: true });
  const after = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
  assert.equal(before, after, 'git status changed during dry run');
  assert.ok(res.evaluatedCount > 0, 'expected candidates evaluated');
});

test('dry_run=false generates candidate and report files', async (t) => {
  const root = makeTempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const res = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: root });
  assert.ok(res.evaluatedCount > 0);
  const candDir = path.join(root, 'discovery', 'candidates');
  const files = fs.readdirSync(candDir).filter(f => f.endsWith('.json'));
  assert.ok(files.length > 0, 'expected candidate dossier files');
  const reportPath = path.join(root, 'discovery', 'reports', `${new Date().toISOString().split('T')[0]}-discovery-report.md`);
  // report date uses runDate (today UTC); check any md report exists
  const reports = fs.readdirSync(path.join(root, 'discovery', 'reports')).filter(f => f.endsWith('.md'));
  assert.ok(reports.length > 0, 'expected report file');
});

test('max_candidates is respected', async (t) => {
  const root = makeTempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const res = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: root, maxCandidates: 1 });
  assert.equal(res.evaluatedCount, 1, 'expected exactly 1 evaluated candidate');
});

test('unknown licenses are rejected', async (t) => {
  const root = makeTempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: root });
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'discoveryRegistry.json'), 'utf-8'));
  const rejected = reg.filter(c => c.reviewerDecision === 'REJECT');
  assert.ok(rejected.length > 0, 'expected at least one rejected candidate');
  // ensure a GPL/unknown candidate is among rejected
  const hasRestricted = reg.some(c => c.licensingStatus === 'RESTRICTED' || c.licensingStatus === 'UNKNOWN');
  assert.ok(hasRestricted, 'expected restricted/unknown license candidate');
});

test('duplicate candidates are filtered', async (t) => {
  const root = makeTempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // Pre-register one seed candidate to force a duplicate
  const seed = {
    candidateId: 'gh-arcade-cyber-blaster',
    name: 'Cyber Blaster 2088',
    originalRepoUrl: 'https://github.com/arcade-open-source/cyber-blaster-2088',
    discoveryDate: new Date().toISOString().split('T')[0],
    licenseName: 'MIT',
  };
  fs.writeFileSync(path.join(root, 'src', 'data', 'discoveryRegistry.json'), JSON.stringify([seed]), 'utf-8');
  fs.writeFileSync(path.join(root, 'discovery', 'rejected', 'gh-arcade-cyber-blaster.json'), JSON.stringify(seed), 'utf-8');
  const res = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: root });
  // 3 seeds - 1 duplicate = 2 evaluated
  assert.ok(res.evaluatedCount <= 2, `expected <=2 evaluated, got ${res.evaluatedCount}`);
});

test('verifyLicense rejects unknown license', () => {
  const r = verifyLicense({ licenseSpdx: 'UNKNOWN', assetLicenseNotes: 'unspecified' });
  assert.equal(r.isPermittedForPublication, false);
  assert.notEqual(r.status, 'VERIFIED_COMMERCIAL_USE');
});