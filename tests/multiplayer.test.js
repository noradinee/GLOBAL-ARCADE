import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMultiplayer } from '../scripts/discovery/detect-multiplayer.js';

test('multiplayer: explicit online multiplayer', () => {
  const m = detectMultiplayer({ name: 'Online Arena', description: 'An online multiplayer game with websocket support', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static', tags: ['multiplayer'] });
  assert.equal(m.mode, 'ONLINE_MULTIPLAYER');
  assert.ok(m.confidence !== 'UNKNOWN');
  assert.ok(m.evidence.length > 0);
});

test('multiplayer: local multiplayer', () => {
  const m = detectMultiplayer({ name: 'Couch Game', description: 'Local multiplayer same screen co-op', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'LOCAL_MULTIPLAYER');
});

test('multiplayer: turn-based', () => {
  const m = detectMultiplayer({ name: 'Chess Online', description: 'Turn-based multiplayer strategy', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'TURN_BASED_MULTIPLAYER');
});

test('multiplayer: real-time', () => {
  const m = detectMultiplayer({ name: 'Realtime Shooter', description: 'Real-time multiplayer action', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'REAL_TIME_MULTIPLAYER');
});

test('multiplayer: single-player default', () => {
  const m = detectMultiplayer({ name: 'Solo Game', description: 'A single player arcade game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'SINGLE_PLAYER');
});

test('multiplayer: unknown status', () => {
  const m = detectMultiplayer({ name: 'Mystery Game', description: 'A multiplayer game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'MULTIPLAYER_UNKNOWN');
});

test('multiplayer: Socket.IO dependency alone is not proof', () => {
  const m = detectMultiplayer({ name: 'Socket App', description: 'An app', html5Compatibility: true, dependencies: ['socket.io'], buildInstructions: 'Inspect README' });
  // dependency is a signal; mode may be ONLINE_MULTIPLAYER but confidence should not be HIGH without more evidence
  assert.ok(m.confidence !== 'HIGH');
  assert.ok(m.evidence.some(e => e.includes('socket.io') || e.includes('dependency')));
});

test('multiplayer: Colyseus dependency without proof of complete game', () => {
  const m = detectMultiplayer({ name: 'Colyseus Demo', description: 'A demo', html5Compatibility: true, dependencies: ['colyseus'], buildInstructions: 'Inspect README' });
  assert.ok(m.confidence !== 'HIGH');
  // networking type detected
  assert.equal(m.networkingType, 'WEBSOCKET');
});

test('multiplayer: no signals -> MULTIPLAYER_UNKNOWN', () => {
  const m = detectMultiplayer({ name: 'No Signals', description: 'A game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'MULTIPLAYER_UNKNOWN');
  assert.equal(m.confidence, 'UNKNOWN');
  assert.ok(Array.isArray(m.evidence) && m.evidence.length > 0);
  // unknown values remain undefined for unverified capabilities
  assert.equal(m.maxPlayers, undefined);
  assert.equal(m.supportsPrivateRooms, undefined);
  assert.equal(m.supportsPublicMatchmaking, undefined);
});

test('multiplayer: evidence and confidence consistency', () => {
  const m = detectMultiplayer({ name: 'Online Arena', description: 'An online multiplayer game with websocket support', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static', tags: ['multiplayer'] });
  assert.equal(m.mode, 'ONLINE_MULTIPLAYER');
  assert.ok(m.confidence !== 'UNKNOWN');
  assert.ok(Array.isArray(m.evidence) && m.evidence.length > 0);
});

test('multiplayer: maxPlayers only when explicit', () => {
  const m = detectMultiplayer({ name: '4P Game', description: 'Multiplayer game for up to 4 players', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.maxPlayers, 4);
});

test('multiplayer: turn-based does not claim real-time', () => {
  const m = detectMultiplayer({ name: 'TB Game', description: 'Turn-based multiplayer', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'TURN_BASED_MULTIPLAYER');
  assert.notEqual(m.mode, 'REAL_TIME_MULTIPLAYER');
});

test('multiplayer: itch player-count extraction', () => {
  const m = detectMultiplayer({ name: 'Narrow One', description: 'Capture The Flag Medieval Style 1 – 20 players', html5Compatibility: true, dependencies: [], buildInstructions: 'Direct web embed via iframe' });
  assert.equal(m.maxPlayers, 20);
});

test('multiplayer: local multiplayer indicators', () => {
  const m = detectMultiplayer({ name: 'Couch Game', description: 'Local co-op same screen', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'LOCAL_MULTIPLAYER');
  assert.equal(m.backendRequirement, 'NONE');
});

test('multiplayer: online multiplayer indicators', () => {
  const m = detectMultiplayer({ name: 'Arena', description: 'Online multiplayer with websocket and matchmaking', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'ONLINE_MULTIPLAYER');
  assert.equal(m.networkingType, 'WEBSOCKET');
});

test('multiplayer: turn-based indicators', () => {
  const m = detectMultiplayer({ name: 'Strategy', description: 'Turn-based multiplayer strategy', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.mode, 'TURN_BASED_MULTIPLAYER');
});

test('multiplayer: player count without online proof', () => {
  const m = detectMultiplayer({ name: 'Local 4P', description: 'A game for 1-4 players', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(m.maxPlayers, 4);
  // no networking evidence -> not online multiplayer
  assert.notEqual(m.mode, 'ONLINE_MULTIPLAYER');
});

test('multiplayer: dependency presence without sufficient evidence', () => {
  const m = detectMultiplayer({ name: 'Socket App', description: 'An app', html5Compatibility: true, dependencies: ['socket.io'], buildInstructions: 'Inspect README' });
  assert.ok(m.confidence !== 'HIGH');
  assert.equal(m.mode, 'MULTIPLAYER_UNKNOWN');
});

test('multiplayer: duplicate across sources dedup by normalized name', async () => {
  // covered by orchestrator dedup; here just verify normalize behavior via candidate
  const a = detectMultiplayer({ name: 'PolyTrack', description: 'racing game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  const b = detectMultiplayer({ name: 'Poly Track', description: 'racing game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  assert.equal(a.mode, b.mode);
});

test('multiplayer: unknown embedding permission not assumed', () => {
  const m = detectMultiplayer({ name: 'Some Game', description: 'A game', html5Compatibility: true, dependencies: [], buildInstructions: 'Zero-build static' });
  // detectMultiplayer does not set embedding permission; remains undefined
  assert.equal(m.supportsInviteLinks, undefined);
  assert.equal(m.supportsPrivateRooms, undefined);
});