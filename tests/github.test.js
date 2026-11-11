import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { discoverFromGitHub } from '../scripts/discovery/discover-github.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

test('github: discovery returns unique repositories', async () => {
  const res = await discoverFromGitHub({ maxResults: 8 });
  assert.ok(res.length > 0);
  const urls = res.map(c => c.originalRepoUrl);
  assert.equal(new Set(urls).size, urls.length, 'duplicate URLs in discovery');
});

test('github: diversity across multiple topics (queries not single source)', async () => {
  const res = await discoverFromGitHub({ maxResults: 10 });
  // Should surface more than one distinct author/repo family
  const authors = new Set(res.map(c => c.author));
  assert.ok(authors.size >= 3, `expected diverse authors, got ${authors.size}`);
});

test('github: deduplication happens before max_candidates', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-gh-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  // Pre-register first seed candidate as duplicate
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), JSON.stringify([{
    candidateId: 'gh-arcade-cyber-blaster',
    originalRepoUrl: 'https://github.com/arcade-open-source/cyber-blaster-2088',
  }]), 'utf-8');
  fs.writeFileSync(path.join(dir, 'discovery', 'rejected', 'gh-arcade-cyber-blaster.json'), '{}', 'utf-8');

  const res = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1 });
  // With 1 duplicate among seeds, fresh pool loses it; max_candidates caps fresh
  assert.ok(res.evaluatedCount <= 1, `expected <=1 fresh evaluated, got ${res.evaluatedCount}`);
  const reg = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), 'utf-8'));
  const ids = reg.map(c => c.candidateId);
  // duplicate should not be re-added as a new evaluation (no duplicate id entries beyond original)
  const dupCount = ids.filter(id => id === 'gh-arcade-cyber-blaster').length;
  assert.ok(dupCount <= 1, 'duplicate candidate re-added');
});

test('max_candidates: rejected candidates do not consume eligible limit', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-rej-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');

  const gpl = {
    candidateId: 'gh-retro-miner-gpl',
    name: 'GPL Dungeon Crawler',
    originalRepoUrl: 'https://github.com/copyleft-games/gpl-dungeon-crawler',
    author: 'copyleft-games',
    description: 'Tile-based dungeon crawler licensed strictly under GPL-3.0.',
    discoveryDate: new Date().toISOString().split('T')[0],
    lastUpdateDate: '2025-01-10',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas2D',
    popularityIndicators: { githubStars: 220, forks: 30, openIssues: 5, communityPlays: 400, trendVelocity: 'x', signalsSource: 'test', signalsDate: new Date().toISOString().split('T')[0] },
    licenseName: 'GPL-3.0',
    licenseUrl: 'https://example.com/LICENSE',
    assetLicensingStatus: 'Unspecified fan art sprites',
    dependencies: [],
    html5Compatibility: true,
    mobileCompatibility: false,
    buildInstructions: 'Vanilla HTML5',
    exactCommitHash: 'c7d91a2e3f5b',
  };
  const cyber = {
    candidateId: 'gh-arcade-cyber-blaster',
    name: 'Cyber Blaster 2088',
    originalRepoUrl: 'https://github.com/arcade-open-source/cyber-blaster-2088',
    author: 'ArcadeOpenSource',
    description: 'Fast-paced cyberpunk twin-stick canvas shooter.',
    discoveryDate: new Date().toISOString().split('T')[0],
    lastUpdateDate: '2025-02-15',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas2D / Web Audio',
    popularityIndicators: { githubStars: 310, forks: 45, openIssues: 2, communityPlays: 850, trendVelocity: 'x', signalsSource: 'test', signalsDate: new Date().toISOString().split('T')[0] },
    licenseName: 'MIT',
    licenseUrl: 'https://example.com/LICENSE',
    assetLicensingStatus: 'All procedural vector art',
    dependencies: [],
    html5Compatibility: true,
    mobileCompatibility: true,
    buildInstructions: 'Zero-build static vanilla HTML5',
    exactCommitHash: 'e3f89a1c2b4d',
  };
  const neon = {
    candidateId: 'gh-philipp-drifting-neon',
    name: 'Neon Drift Circuit',
    originalRepoUrl: 'https://github.com/philipp-dev/neon-drift-circuit',
    author: 'philipp-dev',
    description: 'Isometric neon drifting time-attack racer.',
    discoveryDate: new Date().toISOString().split('T')[0],
    lastUpdateDate: '2025-01-28',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas2D',
    popularityIndicators: { githubStars: 180, forks: 24, openIssues: 1, communityPlays: 620, trendVelocity: 'x', signalsSource: 'test', signalsDate: new Date().toISOString().split('T')[0] },
    licenseName: 'Apache-2.0',
    licenseUrl: 'https://example.com/LICENSE',
    assetLicensingStatus: 'Original vector SVG',
    dependencies: [],
    html5Compatibility: true,
    mobileCompatibility: true,
    buildInstructions: 'Zero-build static vanilla HTML5',
    exactCommitHash: '9a4c82b1d7f0',
  };

  // rejected first, then two eligible
  const res = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1, candidates: [gpl, cyber, neon] });
  assert.equal(res.retainedEligible, 1, 'expected 1 retained eligible');
  assert.equal(res.evaluatedCount, 2, 'expected rejected (GPL) + first eligible (Cyber) evaluated; second eligible deferred');
  const reg = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), 'utf-8'));
  const approved = reg.filter(c => c.reviewerDecision === 'APPROVE');
  assert.equal(approved.length, 1, 'expected exactly 1 approved retained');
  // rejected candidate recorded
  assert.ok(fs.existsSync(path.join(dir, 'discovery', 'rejected', 'gh-retro-miner-gpl.json')), 'rejected candidate not archived');
});