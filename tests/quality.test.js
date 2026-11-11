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