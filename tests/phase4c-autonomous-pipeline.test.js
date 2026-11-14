import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  detectRepairableDefects,
  applyAutomatedRepairs,
  REPAIR_DEFECT_TYPES,
} from '../scripts/discovery/repair-engine.js';

import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  LEGAL_STATUS,
  EDITORIAL_STATUS,
  PERMISSIVE_LICENSES,
  COPYLEFT_LICENSES,
  createInitialCandidate,
  evaluateAutonomousQualification,
  transitionCandidate,
} from '../scripts/discovery/qualification-model.js';

import {
  runDailyDiscoveryPipeline,
  getCandidatePriorityScore,
} from '../scripts/discovery/orchestrator.js';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';

function createTempDir(prefix = 'ga-phase4c-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ============================================================================
// 1. REPAIR DEFECT DETECTION TESTS
// ============================================================================

test('phase4c defect detector: detects missing root entry point with subfolder alternative', (t) => {
  const staging = createTempDir('ga-test-staging-');
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));

  // Create subfolder dist/index.html instead of root index.html
  fs.mkdirSync(path.join(staging, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(staging, 'dist', 'index.html'), '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><body style="overflow:hidden;margin:0;"><canvas></canvas></body></html>');

  const { hasRepairableDefects, defects } = detectRepairableDefects(staging, { candidateId: 'test-dist-game' });
  assert.equal(hasRepairableDefects, true);
  const entryDefect = defects.find(d => d.type === REPAIR_DEFECT_TYPES.MISSING_ROOT_ENTRY_POINT);
  assert.ok(entryDefect);
  assert.equal(entryDefect.fixable, true);
  assert.equal(entryDefect.targetEntry, 'dist/index.html');
});

test('phase4c defect detector: detects root-absolute asset paths', (t) => {
  const staging = createTempDir('ga-test-staging-');
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body style="margin:0;overflow:hidden">
  <script src="/js/game.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), html);

  const { hasRepairableDefects, defects } = detectRepairableDefects(staging, { candidateId: 'test-abs-paths' });
  assert.equal(hasRepairableDefects, true);
  const absDefect = defects.find(d => d.type === REPAIR_DEFECT_TYPES.ROOT_ABSOLUTE_ASSET_PATHS);
  assert.ok(absDefect);
  assert.equal(absDefect.fixable, true);
});

test('phase4c defect detector: detects missing mobile viewport and canvas overflow styles', (t) => {
  const staging = createTempDir('ga-test-staging-');
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));

  // HTML missing viewport and canvas margin/overflow reset
  const html = `<!DOCTYPE html><html><head><title>No Viewport</title></head><body><canvas id="c"></canvas></body></html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), html);

  const { hasRepairableDefects, defects } = detectRepairableDefects(staging, { candidateId: 'test-viewport' });
  assert.equal(hasRepairableDefects, true);
  assert.ok(defects.some(d => d.type === REPAIR_DEFECT_TYPES.MISSING_VIEWPORT_META));
  assert.ok(defects.some(d => d.type === REPAIR_DEFECT_TYPES.CANVAS_OVERFLOW_STYLE));
});

test('phase4c defect detector: detects frame-busting scripts', (t) => {
  const staging = createTempDir('ga-test-staging-');
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow:hidden}</style><script>if(top.location!=window.location)top.location=window.location;</script></head><body><canvas></canvas></body></html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), html);

  const { hasRepairableDefects, defects } = detectRepairableDefects(staging, { candidateId: 'test-frame-bust' });
  assert.equal(hasRepairableDefects, true);
  assert.ok(defects.some(d => d.type === REPAIR_DEFECT_TYPES.FRAME_BUSTING_SCRIPT));
});

test('phase4c defect detector: clean repository reports no defects', (t) => {
  const staging = createTempDir('ga-test-staging-');
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow:hidden;}</style></head><body><canvas></canvas><script src="./js/game.js"></script></body></html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), html);

  const { hasRepairableDefects, defects } = detectRepairableDefects(staging, { candidateId: 'test-clean' });
  assert.equal(hasRepairableDefects, false);
  assert.equal(defects.length, 0);
});

// ============================================================================
// 2. AUTOMATED REPAIRS & PRISTINE SNAPSHOTTING TESTS
// ============================================================================

test('phase4c repair engine: preserves pristine snapshot in .original/ before repair', (t) => {
  const root = createTempDir('ga-test-root-');
  const staging = path.join(root, 'discovery/staging/candidate-snap');
  fs.mkdirSync(staging, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const originalHtml = `<!DOCTYPE html><html><head></head><body><script src="/js/app.js"></script></body></html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), originalHtml);
  fs.writeFileSync(path.join(staging, 'LICENSE'), 'MIT License');

  const repairRes = applyAutomatedRepairs(staging, {
    candidateId: 'candidate-snap',
    licenseName: 'MIT',
    assetLicensingStatus: 'Original assets',
  }, { rootDir: root });

  assert.equal(repairRes.success, true);
  assert.equal(repairRes.repaired, true);

  // Check pristine snapshot in .original/
  const snapshotIndex = path.join(staging, '.original/index.html');
  assert.ok(fs.existsSync(snapshotIndex), 'Pristine snapshot .original/index.html must exist');
  assert.equal(fs.readFileSync(snapshotIndex, 'utf-8'), originalHtml, 'Snapshot must match exact original content');

  // Check modified working index.html
  const modifiedHtml = fs.readFileSync(path.join(staging, 'index.html'), 'utf-8');
  assert.ok(modifiedHtml.includes('src="./js/app.js"'), 'Absolute path must be converted to relative');
  assert.ok(modifiedHtml.includes('viewport'), 'Viewport meta must be injected');

  // Check patch receipt in discovery/patches/
  const patchPath = path.join(root, 'discovery/patches/candidate-snap.patch.json');
  assert.ok(fs.existsSync(patchPath), 'Patch file must be written');
  const patchData = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));
  assert.equal(patchData.candidateId, 'candidate-snap');
  assert.ok(patchData.patchesApplied.length >= 2);
  assert.equal(patchData.postVerification.securityPassed, true);
  assert.equal(patchData.postVerification.licensePassed, true);
});

test('phase4c repair engine: generates trampoline launcher for subfolder entry points', (t) => {
  const root = createTempDir('ga-test-root-');
  const staging = path.join(root, 'discovery/staging/candidate-sub');
  fs.mkdirSync(path.join(staging, 'build'), { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(path.join(staging, 'build', 'index.html'), '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;overflow:hidden"><canvas></canvas></body></html>');
  fs.writeFileSync(path.join(staging, 'LICENSE'), 'MIT License');

  const repairRes = applyAutomatedRepairs(staging, {
    candidateId: 'candidate-sub',
    licenseName: 'MIT',
    assetLicensingStatus: 'Clean assets',
  }, { rootDir: root });

  assert.equal(repairRes.success, true);
  assert.equal(repairRes.repaired, true);

  const rootIndex = path.join(staging, 'index.html');
  assert.ok(fs.existsSync(rootIndex), 'Root index.html must be generated');
  const content = fs.readFileSync(rootIndex, 'utf-8');
  assert.ok(content.includes('<iframe src="./build/index.html"'), 'Trampoline launcher iframe must point to subfolder entry');
});

test('phase4c repair engine: rolls back to snapshot if post-repair security fails', (t) => {
  const root = createTempDir('ga-test-root-');
  const staging = path.join(root, 'discovery/staging/candidate-sec-fail');
  fs.mkdirSync(staging, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // Create an original file that has absolute paths and a disallowed external script
  const origHtml = `<!DOCTYPE html><html><head></head><body><script src="/js/game.js"></script><script src="http://untrusted-malicious.domain/stealer.js"></script></body></html>`;
  fs.writeFileSync(path.join(staging, 'index.html'), origHtml);
  fs.writeFileSync(path.join(staging, 'LICENSE'), 'MIT License');

  const repairRes = applyAutomatedRepairs(staging, {
    candidateId: 'candidate-sec-fail',
    licenseName: 'MIT',
    assetLicensingStatus: 'Clean',
  }, { rootDir: root });

  assert.equal(repairRes.success, false);
  assert.equal(repairRes.rollback, true);

  // Staging index.html should be rolled back to exact original content
  const restoredContent = fs.readFileSync(path.join(staging, 'index.html'), 'utf-8');
  assert.equal(restoredContent, origHtml, 'Staging must be rolled back on post-repair security failure');
});

// ============================================================================
// 3. CANDIDATE PRIORITIZATION & COMMIT DEDUPLICATION TESTS
// ============================================================================

test('phase4c prioritization: prioritizes standalone playable games over engines and templates', () => {
  const standaloneGame = {
    name: 'Canvas Blaster',
    description: 'Fast paced retro action arcade game built in vanilla html5 canvas',
    gameEngine: 'HTML5 Canvas',
    licenseName: 'MIT',
    html5Compatibility: true,
    mobileCompatibility: true,
    dependencies: [],
  };

  const gameEngine = {
    name: 'SuperJS Engine',
    description: 'A 2D rendering framework and engine for web developers',
    gameEngine: 'Framework / Engine',
    licenseName: 'MIT',
    html5Compatibility: true,
    dependencies: [],
  };

  const backendGame = {
    name: 'MMO Battle Arena',
    description: 'Requires authoritative multiplayer server colyseus backend',
    gameEngine: 'HTML5 Canvas',
    licenseName: 'MIT',
    html5Compatibility: true,
    dependencies: [],
  };

  const scoreGame = getCandidatePriorityScore(standaloneGame);
  const scoreEngine = getCandidatePriorityScore(gameEngine);
  const scoreBackend = getCandidatePriorityScore(backendGame);

  assert.ok(scoreGame > scoreEngine, `Game (${scoreGame}) must outrank engine (${scoreEngine})`);
  assert.ok(scoreGame > scoreBackend, `Standalone static game (${scoreGame}) must outrank backend required game (${scoreBackend})`);
});

test('phase4c deduplication: avoids re-evaluating exact commit SHA across discovery runs', async (t) => {
  const root = createTempDir('ga-test-dedup-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const candidate = {
    candidateId: 'gh-dedup-pilot',
    name: 'Dedup Pilot Game',
    originalRepoUrl: 'https://github.com/dedup/pilot-game',
    author: 'dedup',
    description: 'Zero build game',
    licenseName: 'MIT',
    assetLicensingStatus: 'Procedural',
    html5Compatibility: true,
    mobileCompatibility: true,
    buildInstructions: 'Zero-build static vanilla HTML5',
    exactCommitHash: 'deadbeef1234567890',
  };

  // Run 1: initial discovery
  const run1 = await runDailyDiscoveryPipeline({
    dryRun: false,
    offline: true,
    rootDir: root,
    candidates: [candidate],
  });
  assert.equal(run1.evaluatedCount, 1);

  // Run 2: re-query with exact same repository and exact same commit
  const run2 = await runDailyDiscoveryPipeline({
    dryRun: false,
    offline: true,
    rootDir: root,
    candidates: [candidate],
  });
  assert.equal(run2.evaluatedCount, 0, 'Exact same repository and commit SHA must be deduplicated and skipped');
});

// ============================================================================
// 4. END-TO-END AUTONOMOUS ACQUISITION -> REPAIR -> PUBLISHING TEST
// ============================================================================

test('phase4c e2e: discovers, acquires, repairs minor defects, and publishes to production catalog', async (t) => {
  const root = createTempDir('ga-test-e2e-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const candidateId = 'gh-auto-pilot-fighter';
  // Mock source files needing repair: index in dist/, root-absolute asset paths, missing viewport
  const mockFiles = {
    'dist/index.html': `<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/game.css"></head><body><canvas id="stage"></canvas><script src="/js/main.js"></script></body></html>`,
    'dist/css/game.css': 'canvas { display: block; }',
    'dist/js/main.js': 'console.log("Auto pilot running");',
    'LICENSE': 'MIT License\n\nCopyright (c) 2026 Auto Pilot Author',
  };

  const incomingCandidate = {
    candidateId,
    name: 'Auto Pilot Fighter',
    originalRepoUrl: 'https://github.com/auto-pilot/fighter',
    author: 'auto-pilot',
    description: 'Standalone tactical 2D dogfighter with zero-build assets',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas2D',
    licenseName: 'MIT',
    assetLicensingStatus: 'All original procedural assets',
    html5Compatibility: true,
    mobileCompatibility: true,
    category: 'arcade',
    popularityIndicators: {
      githubStars: 450,
      forks: 80,
      communityPlays: 2500,
    },
    exactCommitHash: 'aabbccdd112233445566778899001122aabbccdd',
  };

  const pipelineRes = await runDailyDiscoveryPipeline({
    dryRun: false,
    offline: true,
    rootDir: root,
    autonomousAcquisition: true,
    autonomousPublishing: true,
    candidates: [incomingCandidate],
    mockFiles: {
      [candidateId]: mockFiles,
    },
  });

  assert.equal(pipelineRes.evaluatedCount, 1);

  // 1. Verify candidate dossier recorded
  const dossierPath = path.join(root, 'discovery/candidates', `${candidateId}.json`);
  assert.ok(fs.existsSync(dossierPath), 'Candidate dossier must exist');
  const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));

  // 2. Verify lifecycle state advanced to PUBLISHED
  assert.equal(dossier.lifecycleStatus, LIFECYCLE_STATUS.PUBLISHED);
  assert.equal(dossier.reviewerDecision, 'APPROVE');
  assert.equal(dossier.publicationEligibility, 'ELIGIBLE');

  // 3. Verify repair receipt recorded in dossier and patch file exists
  assert.ok(dossier.repairs, 'Repair receipt must be attached to dossier');
  const patchPath = path.join(root, 'discovery/patches', `${candidateId}.patch.json`);
  assert.ok(fs.existsSync(patchPath), 'Patch file must exist in discovery/patches/');
  const patchJson = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));
  assert.equal(patchJson.candidateId, candidateId);
  assert.ok(patchJson.patchesApplied.length >= 1);

  // 4. Verify game files were imported into public/games/<slug> without .original snapshot
  const slug = dossier.slug || 'auto-pilot-fighter';
  const prodGameDir = path.join(root, 'public/games', slug);
  assert.ok(fs.existsSync(prodGameDir), `Production game folder must exist at public/games/${slug}`);
  assert.ok(fs.existsSync(path.join(prodGameDir, 'index.html')), 'Production root index.html must exist');
  assert.ok(fs.existsSync(path.join(prodGameDir, 'dist/index.html')), 'Production subfolder dist/index.html must exist');
  assert.ok(!fs.existsSync(path.join(prodGameDir, '.original')), 'Pristine snapshot .original/ must NOT leak into production');
  assert.ok(!fs.existsSync(path.join(prodGameDir, `${candidateId}.patch.json`)), 'Patch files must NOT leak into production');

  // 5. Verify registered in src/data/games.json
  const gamesPath = path.join(root, 'src/data/games.json');
  assert.ok(fs.existsSync(gamesPath), 'src/data/games.json must exist');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  const prodGame = games.find(g => g.slug === slug || g.id === slug);
  assert.ok(prodGame, 'Published game must be registered in games.json');
  assert.equal(prodGame.title, 'Auto Pilot Fighter');
  assert.equal(prodGame.license, 'MIT');
  assert.ok(prodGame.status === 'active' || prodGame.status === 'published', 'Game status must be active or published');
  assert.equal(prodGame.gameSource, `/games/${slug}/index.html`);

  // 6. Verify audit trail has full chain of custody
  const trail = dossier.reviewAuditTrail || [];
  const actions = trail.map(t => t.action);
  assert.ok(actions.includes('DISCOVERY_INBOX_ENQUEUE'), 'Must record initial enqueue');
  assert.ok(actions.includes('LIFECYCLE_TRANSITION_AUTO_APPROVED'), 'Must record AUTO_APPROVED transition');
  assert.ok(actions.includes('LIFECYCLE_TRANSITION_READY_FOR_IMPORT'), 'Must record READY_FOR_IMPORT transition');
  assert.ok(actions.includes('LIFECYCLE_TRANSITION_PUBLISHED'), 'Must record PUBLISHED transition');
});

// ============================================================================
// 5. EXCEPTION ROUTING INVARIANTS (NEEDS_OWNER_REVIEW)
// ============================================================================

test('phase4c exception routing: copyleft licenses route to NEEDS_OWNER_REVIEW and are never auto-approved', async (t) => {
  const root = createTempDir('ga-test-gpl-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const gplCandidate = {
    candidateId: 'gh-gpl-strategy-game',
    name: 'GPL Strategy Commander',
    originalRepoUrl: 'https://github.com/copyleft/gpl-strategy',
    author: 'copyleft',
    description: 'Turn based grid strategy',
    sourcePlatform: 'github',
    programmingLanguage: 'JavaScript',
    gameEngine: 'HTML5 Canvas',
    licenseName: 'GPL-3.0',
    assetLicensingStatus: 'GPL-3.0 sprites',
    html5Compatibility: true,
    mobileCompatibility: true,
    popularityIndicators: { githubStars: 500, forks: 90, communityPlays: 3000 },
    exactCommitHash: '3344556677889900aabbccddeeff112233445566',
  };

  const res = await runDailyDiscoveryPipeline({
    dryRun: false,
    offline: true,
    rootDir: root,
    autonomousAcquisition: true,
    candidates: [gplCandidate],
    mockFiles: {
      'gh-gpl-strategy-game': {
        'index.html': '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow:hidden}</style></head><body><canvas></canvas></body></html>',
        'LICENSE': 'GNU GENERAL PUBLIC LICENSE Version 3',
      },
    },
  });

  const dossier = JSON.parse(fs.readFileSync(path.join(root, 'discovery/candidates/gh-gpl-strategy-game.json'), 'utf-8'));
  assert.equal(dossier.lifecycleStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW, 'Copyleft candidate must route to NEEDS_OWNER_REVIEW');
  assert.notEqual(dossier.lifecycleStatus, LIFECYCLE_STATUS.AUTO_APPROVED, 'Copyleft candidate must NEVER be auto-approved');
  assert.notEqual(dossier.lifecycleStatus, LIFECYCLE_STATUS.PUBLISHED, 'Copyleft candidate must NEVER be auto-published');
});
