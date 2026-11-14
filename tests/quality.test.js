import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCandidateQuality } from '../scripts/discovery/assess-quality.js';

test('quality: engine classified and rejected', () => {
  const q = assessCandidateQuality({ name: 'Phaser Engine', description: 'A game engine framework', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'ENGINE');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: template classified and rejected', () => {
  const q = assessCandidateQuality({ name: 'Starter Template', description: 'boilerplate starter', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'TEMPLATE');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: tutorial classified and rejected', () => {
  const q = assessCandidateQuality({ name: 'Tutorial Game', description: 'tutorial for beginners', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'TUTORIAL');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: examples classified and rejected', () => {
  const q = assessCandidateQuality({ name: 'Phaser Examples', description: 'example collection', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'EXAMPLES');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: asset pack classified and rejected', () => {
  const q = assessCandidateQuality({ name: 'Asset Pack', description: 'asset collection', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'ASSET_PACK');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: incomplete game (no playable evidence) not permitted', () => {
  const q = assessCandidateQuality({ name: 'Mystery Game', description: 'something', html5Compatibility: true, dependencies: ['phaser'], buildInstructions: 'Inspect repository README' });
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: complete game passes', () => {
  const q = assessCandidateQuality({ name: 'Cyber Blaster', description: 'arcade shooter', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5', gameEngine: 'HTML5 Canvas2D' });
  assert.equal(q.classification, 'GAME');
  assert.equal(q.isPlayableInBrowser, true);
  assert.equal(q.isPermittedForPublication, true);
});

test('quality: high stars do not auto-approve (quality independent)', () => {
  const q = assessCandidateQuality({ name: 'Popular Engine', description: 'engine framework', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static', popularityIndicators: { githubStars: 99999 } });
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: ordinary itch.io game not classified as ENGINE due to synthetic metadata', () => {
  const q = assessCandidateQuality({ name: 'Season Shift', description: 'A puzzle game', html5Compatibility: true, dependencies: [], buildInstructions: 'Direct web embed via iframe', gameEngine: 'HTML5 / Web (itch.io)', tags: ['puzzle'] });
  assert.notEqual(q.classification, 'ENGINE');
  assert.equal(q.isPermittedForPublication, true);
});

test('quality: genuine engine classified as ENGINE', () => {
  const q = assessCandidateQuality({ name: 'Phaser Engine', description: 'A game engine framework', html5Compatibility: true, dependencies: [], buildInstructions: 'zero-build static' });
  assert.equal(q.classification, 'ENGINE');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: examples collection not a complete game', () => {
  const q = assessCandidateQuality({ name: 'Phaser Examples', description: 'example collection', html5Compatibility: true, dependencies: ['phaser'], buildInstructions: 'Inspect repository README', tags: ['phaser3-example'] });
  assert.equal(q.classification, 'EXAMPLES');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: MMORPG platform not a standalone arcade game', () => {
  const q = assessCandidateQuality({ name: 'Reldens', description: 'Open Source MMORPG Platform', html5Compatibility: true, dependencies: ['phaser'], buildInstructions: 'Inspect repository README', gameEngine: 'Phaser 3 / WebGL' });
  assert.equal(q.classification, 'PLATFORM');
  assert.equal(q.requiresBackend, true);
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: Phaser/WebGL metadata alone does not establish playability', () => {
  const q = assessCandidateQuality({ name: 'Phaser3 Typescript', description: 'Phaser 3 and TypeScript', html5Compatibility: true, dependencies: ['phaser'], buildInstructions: 'Inspect repository README', gameEngine: 'Phaser 3 / WebGL', tags: ['phaser', 'typescript'] });
  assert.equal(q.requiresBuild, false);
  assert.equal(q.isPlayableInBrowser, false);
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: unknown asset license does not become approved', () => {
  const q = assessCandidateQuality({ name: 'Some Game', description: 'arcade game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5' });
  assert.equal(q.isPermittedForPublication, true);
});

test('quality: Vite-based browser game is build-required but potentially playable', () => {
  const q = assessCandidateQuality({ name: 'Vite Game', description: 'arcade game', html5Compatibility: true, dependencies: [], buildInstructions: 'npm run build (vite)', gameEngine: 'HTML5 Canvas2D' });
  assert.equal(q.requiresBuild, true);
  assert.equal(q.deploymentClassification, 'STATIC_BUILD_REQUIRED');
  assert.equal(q.isPlayableInBrowser, true);
  assert.equal(q.isPermittedForPublication, false); // manual review, not auto-eligible
});

test('quality: Webpack-based browser game is build-required', () => {
  const q = assessCandidateQuality({ name: 'Webpack Game', description: 'arcade game', html5Compatibility: true, dependencies: ['phaser'], buildInstructions: 'webpack build', gameEngine: 'Phaser 3 / WebGL' });
  assert.equal(q.requiresBuild, true);
  assert.equal(q.deploymentClassification, 'STATIC_BUILD_REQUIRED');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: static game with no dependencies is static-ready', () => {
  const q = assessCandidateQuality({ name: 'Static Game', description: 'arcade game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5' });
  assert.equal(q.deploymentClassification, 'STATIC_READY');
  assert.equal(q.isPlayableInBrowser, true);
  assert.equal(q.isPermittedForPublication, true);
});

test('quality: zero deps without identifiable game entry point is unknown playability', () => {
  const q = assessCandidateQuality({ name: 'Empty Repo', description: 'misc', html5Compatibility: true, dependencies: [], buildInstructions: 'Inspect repository README', gameEngine: '' });
  assert.equal(q.deploymentClassification, 'PLAYABILITY_UNKNOWN');
  assert.equal(q.isPlayableInBrowser, false);
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: game with optional multiplayer server remains browser-playable', () => {
  const q = assessCandidateQuality({ name: 'Optional MP Game', description: 'arcade game with optional multiplayer server', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5' });
  assert.equal(q.requiresBackend, false);
  assert.equal(q.deploymentClassification, 'STATIC_READY');
  assert.equal(q.isPlayableInBrowser, true);
});

test('quality: game requiring backend for core gameplay is backend-required', () => {
  const q = assessCandidateQuality({ name: 'Backend Game', description: 'mmorpg with required backend', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5' });
  assert.equal(q.requiresBackend, true);
  assert.equal(q.deploymentClassification, 'BACKEND_REQUIRED');
  assert.equal(q.isPermittedForPublication, false);
});

test('quality: generic server word alone is ambiguous not rejected', () => {
  const q = assessCandidateQuality({ name: 'Dev Server Game', description: 'arcade game with a dev server', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static vanilla HTML5' });
  // 'server' alone (not required-backend phrase) should not mark requiresBackend
  assert.equal(q.requiresBackend, false);
});