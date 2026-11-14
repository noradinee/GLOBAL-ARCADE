/**
 * game-enhancement-engine.test.js
 *
 * Comprehensive Regression & End-to-End Test Suite for the
 * KYRAXO Autonomous Game Completion & Enhancement Engine.
 *
 * Policy: KYRAXO-POL-GAME-ENHANCE-001
 * Architecture:
 * - OpenCode: Inspection, gap assessment & verification review
 * - Antigravity: Implementation, system generation, asset synthesis & game rebuilding
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  generateTouchControlsScript,
  generateProceduralSFXScript,
  generateScorePersistenceScript,
  generateInGameMenuScript,
  generateProgressionEngineScript,
  rebuildIncompleteCanvasGame,
  assessCandidateGaps,
  applyAutonomousEnhancements,
} from '../scripts/discovery/game-enhancer.js';

import {
  REPAIR_DEFECT_TYPES,
  detectRepairableDefects,
  applyAutomatedRepairs,
  executeCandidateRepair,
} from '../scripts/discovery/repair-engine.js';

function createTempDir(prefix = 'ga-enhance-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ============================================================================
// 1. GENERATOR UNIT TESTS
// ============================================================================

test('game-enhancer: generateTouchControlsScript creates valid responsive touch controller', () => {
  const code = generateTouchControlsScript();
  assert.ok(typeof code === 'string');
  assert.ok(code.includes('kyraxo-touch-controls'));
  assert.ok(code.includes('ArrowUp') && code.includes('ArrowDown'));
  assert.ok(code.includes('ArrowLeft') && code.includes('ArrowRight'));
  assert.ok(code.includes('dispatchKey'));
  assert.ok(code.includes('touchstart') && code.includes('touchend'));
});

test('game-enhancer: generateProceduralSFXScript creates Web Audio oscillator synthesizer', () => {
  const code = generateProceduralSFXScript();
  assert.ok(typeof code === 'string');
  assert.ok(code.includes('KyraxoSFX'));
  assert.ok(code.includes('AudioContext') || code.includes('webkitAudioContext'));
  assert.ok(code.includes('createOscillator'));
  assert.ok(code.includes('jump') && code.includes('shoot') && code.includes('hit') && code.includes('win') && code.includes('gameover'));
  assert.ok(code.includes('toggleMute'));
});

test('game-enhancer: generateScorePersistenceScript creates high score manager', () => {
  const code = generateScorePersistenceScript('space-invaders');
  assert.ok(typeof code === 'string');
  assert.ok(code.includes('KyraxoScore'));
  assert.ok(code.includes('kyraxo_best_space-invaders'));
  assert.ok(code.includes('getBest') && code.includes('save'));
});

test('game-enhancer: generateInGameMenuScript creates HUD, pause modal, and game over overlays', () => {
  const code = generateInGameMenuScript('Cyber Runner', 'cyber-runner');
  assert.ok(typeof code === 'string');
  assert.ok(code.includes('KyraxoHUD'));
  assert.ok(code.includes('kyraxo-hud-container'));
  assert.ok(code.includes('GAME PAUSED'));
  assert.ok(code.includes('GAME OVER'));
  assert.ok(code.includes('STAGE CLEAR'));
  assert.ok(code.includes('setScore') && code.includes('setLevel') && code.includes('showGameOver'));
});

test('game-enhancer: generateProgressionEngineScript creates multi-stage manager and particles', () => {
  const code = generateProgressionEngineScript();
  assert.ok(typeof code === 'string');
  assert.ok(code.includes('KyraxoParticles'));
  assert.ok(code.includes('KyraxoProgression'));
  assert.ok(code.includes('checkProgression'));
  assert.ok(code.includes('kyraxo:level-up'));
});

// ============================================================================
// 2. OPENCODE DIAGNOSTIC & GAP ASSESSMENT TESTS
// ============================================================================

test('opencode: assessCandidateGaps flags missing touch controls for keyboard-only games', () => {
  const dir = createTempDir();
  try {
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow:hidden}</style></head><body><canvas></canvas><script>window.addEventListener('keydown', e => { if (e.code === 'ArrowUp') jump(); }); function jump(){}</script></body></html>`;
    fs.writeFileSync(path.join(dir, 'index.html'), html);

    const assessment = assessCandidateGaps(dir, { candidateId: 'keyboard-game' });
    assert.equal(assessment.hasGaps, true);
    assert.ok(assessment.gaps.some(g => g.type === 'MISSING_TOUCH_CONTROLS'));
    assert.ok(assessment.gaps.some(g => g.type === 'MISSING_AUDIO_SYNTHESIS'));
    assert.ok(assessment.gaps.some(g => g.type === 'MISSING_INGAME_MENU_OR_HUD'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('opencode: assessCandidateGaps identifies incomplete/unbuilt projects needing rebuild', () => {
  const dir = createTempDir();
  try {
    // Only package.json with no index.html or canvas
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'unbuilt-game' }));

    const assessment = assessCandidateGaps(dir, { candidateId: 'unbuilt-game' });
    assert.equal(assessment.hasGaps, true);
    assert.equal(assessment.needsRebuild, true);
    assert.ok(assessment.gaps.some(g => g.type === 'INCOMPLETE_OR_UNBUILT_PROJECT'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ============================================================================
// 3. ANTIGRAVITY AUTONOMOUS IMPLEMENTATION & REBUILDING TESTS
// ============================================================================

test('antigravity: rebuildIncompleteCanvasGame reconstructs complete 60fps playable arcade game', () => {
  const dir = createTempDir();
  try {
    const candidate = {
      candidateId: 'gh-incomplete-fighter',
      name: 'Cyber Fighter',
      slug: 'cyber-fighter',
    };

    const files = rebuildIncompleteCanvasGame(dir, candidate);
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('game.js'));
    assert.ok(files.includes('kyraxo-touch-controls.js'));
    assert.ok(files.includes('kyraxo-sfx.js'));
    assert.ok(files.includes('kyraxo-score.js'));
    assert.ok(files.includes('kyraxo-game-menu.js'));
    assert.ok(files.includes('kyraxo-progression.js'));

    // Validate index.html contents
    const indexContent = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8');
    assert.ok(indexContent.includes('<canvas id="game-canvas">'));
    assert.ok(indexContent.includes('kyraxo-touch-controls.js'));
    assert.ok(indexContent.includes('game.js'));

    // Validate game.js contents
    const gameContent = fs.readFileSync(path.join(dir, 'game.js'), 'utf-8');
    assert.ok(gameContent.includes('requestAnimationFrame'));
    assert.ok(gameContent.includes('spawnEnemy'));
    assert.ok(gameContent.includes('KyraxoSFX'));
    assert.ok(gameContent.includes('KyraxoHUD'));
    assert.ok(gameContent.includes('KyraxoParticles'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('antigravity: applyAutonomousEnhancements injects complete systems into existing game', () => {
  const dir = createTempDir();
  try {
    const initialHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow:hidden}</style></head><body><canvas id="c"></canvas><script>function loop(){ requestAnimationFrame(loop); } requestAnimationFrame(loop);</script></body></html>`;
    fs.writeFileSync(path.join(dir, 'index.html'), initialHtml);

    const res = applyAutonomousEnhancements(dir, {
      candidateId: 'test-enhance',
      name: 'Test Enhance',
      slug: 'test-enhance',
    });

    assert.equal(res.success, true);
    assert.equal(res.enhanced, true);
    assert.ok(res.patchesApplied.length >= 4);

    const modifiedHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8');
    assert.ok(modifiedHtml.includes('kyraxo-sfx.js'));
    assert.ok(modifiedHtml.includes('kyraxo-score.js'));
    assert.ok(modifiedHtml.includes('kyraxo-game-menu.js'));
    assert.ok(modifiedHtml.includes('kyraxo-progression.js'));
    assert.ok(modifiedHtml.includes('kyraxo-touch-controls.js'));

    assert.ok(fs.existsSync(path.join(dir, 'kyraxo-sfx.js')));
    assert.ok(fs.existsSync(path.join(dir, 'kyraxo-touch-controls.js')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ============================================================================
// 4. FULL REPAIR PIPELINE WITH SNAPSHOT & VERIFICATION
// ============================================================================

test('repair-engine: applyAutomatedRepairs preserves pristine snapshot and saves audited patch', () => {
  const root = createTempDir('ga-rep-root-');
  const staging = path.join(root, 'discovery/staging/gh-broken-runner');
  fs.mkdirSync(staging, { recursive: true });

  try {
    const rawIndex = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/assets/style.css"></head><body><canvas></canvas><script src="/assets/game.js"></script></body></html>`;
    fs.writeFileSync(path.join(staging, 'index.html'), rawIndex);
    fs.writeFileSync(path.join(staging, 'LICENSE'), 'MIT License');

    const repairRes = applyAutomatedRepairs(staging, {
      candidateId: 'gh-broken-runner',
      name: 'Broken Runner',
      licenseName: 'MIT',
      assetLicensingStatus: 'Original procedural assets',
    }, { rootDir: root });

    assert.equal(repairRes.success, true);
    assert.equal(repairRes.repaired, true);

    // Snapshot integrity
    assert.ok(fs.existsSync(path.join(staging, '.original/index.html')));
    assert.equal(fs.readFileSync(path.join(staging, '.original/index.html'), 'utf-8'), rawIndex);

    // Working directory modifications
    const repairedHtml = fs.readFileSync(path.join(staging, 'index.html'), 'utf-8');
    assert.ok(repairedHtml.includes('src="./assets/game.js"'));
    assert.ok(repairedHtml.includes('viewport'));

    // Audited patch receipt
    const patchFile = path.join(root, 'discovery/patches/gh-broken-runner.patch.json');
    assert.ok(fs.existsSync(patchFile));
    const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf-8'));
    assert.equal(patchData.candidateId, 'gh-broken-runner');
    assert.equal(patchData.agentDivision.diagnosis, 'OpenCode');
    assert.equal(patchData.agentDivision.implementation, 'Antigravity');
    assert.equal(patchData.postVerification.securityPassed, true);
    assert.equal(patchData.postVerification.licensePassed, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ============================================================================
// 5. END-TO-END WORKFLOW: PERSISTENT JOB & FIX ISSUES ORCHESTRATION
// ============================================================================

test('repair-engine: executeCandidateRepair creates persistent job and executes full enhancement cycle', async () => {
  const root = createTempDir('ga-e2e-root-');
  const candidateId = 'gh-pilot-game';
  const candidateDir = path.join(root, 'discovery/candidates');
  const stagingDir = path.join(root, 'discovery/staging', candidateId);
  const dataDir = path.join(root, 'data');

  fs.mkdirSync(candidateDir, { recursive: true });
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  try {
    const rawHtml = `<!DOCTYPE html><html><head><title>Pilot</title></head><body><script src="/game.js"></script></body></html>`;
    fs.writeFileSync(path.join(stagingDir, 'index.html'), rawHtml);
    fs.writeFileSync(path.join(stagingDir, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026');

    const candidateDossier = {
      candidateId,
      name: 'Pilot Game',
      slug: 'pilot-game',
      sourcePlatform: 'github',
      licenseName: 'MIT',
      assetLicensingStatus: 'All original assets',
      lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    };
    fs.writeFileSync(path.join(candidateDir, `${candidateId}.json`), JSON.stringify(candidateDossier, null, 2));

    const result = await executeCandidateRepair(candidateId, { rootDir: root, owner: 'owner' });

    assert.equal(result.success, true);
    assert.ok(result.jobId.startsWith('job-repair-'));
    assert.equal(result.job.status, 'COMPLETED');
    assert.equal(result.job.stage, 'REPAIR');
    assert.ok(result.enhancedFiles.length > 0);

    // Verify persistent job in data/jobs.json
    const jobsFile = path.join(dataDir, 'jobs.json');
    assert.ok(fs.existsSync(jobsFile));
    const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));
    const savedJob = jobs.find(j => j.id === result.jobId);
    assert.ok(savedJob, 'Job must be recorded in data/jobs.json');
    assert.equal(savedJob.candidateId, candidateId);

    // Verify job logs contain both OpenCode and Antigravity stages
    const logMessages = savedJob.logs.map(l => l.message).join(' | ');
    assert.ok(logMessages.includes('[OpenCode]'), 'Logs must include OpenCode diagnosis');
    assert.ok(logMessages.includes('[Antigravity]'), 'Logs must include Antigravity development');
    assert.ok(logMessages.includes('[Verification]'), 'Logs must include Verification pass');

    // Invariant: Never auto-publish
    assert.equal(result.candidate.lifecycleStatus, 'NEEDS_OWNER_REVIEW');

    // Audit logs verify chain of custody
    const auditFile = path.join(dataDir, 'audit-logs.json');
    assert.ok(fs.existsSync(auditFile));
    const audits = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    const fixAudit = audits.find(a => a.candidateId === candidateId && a.action === 'FIX_ISSUES');
    assert.ok(fixAudit);
    assert.equal(fixAudit.jobId, result.jobId);
    assert.equal(fixAudit.autoPublished, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
