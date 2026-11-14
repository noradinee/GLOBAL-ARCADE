import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRetryAfter,
  parseLinkHeader,
  fetchWithRetry,
} from '../scripts/discovery/http-client.js';

import {
  formatTitle,
  detectEngine,
  detectLanguage,
  extractDependencies,
  isHtml5,
  isMobile,
  normalizeRepoUrl,
} from '../scripts/discovery/normalizer-utils.js';

// ============================================================================
// HTTP-CLIENT TESTS
// ============================================================================

test('http-client: parseRetryAfter parses integer seconds and decimals', () => {
  assert.equal(parseRetryAfter(new Map([['retry-after', '0']])), 0);
  assert.equal(parseRetryAfter(new Map([['retry-after', '10']])), 10000);
  assert.equal(parseRetryAfter(new Map([['retry-after', '1.5']])), 1500);
  assert.equal(parseRetryAfter({ 'retry-after': '30' }), 30000);
  assert.equal(parseRetryAfter({ 'Retry-After': '5' }), 5000);
});

test('http-client: parseRetryAfter parses HTTP date and past date clamping', () => {
  const fixedNow = Date.parse('2026-11-11T12:00:00.000Z');
  const futureHttpDate = new Date('2026-11-11T12:00:20.000Z').toUTCString();
  assert.equal(parseRetryAfter(new Map([['retry-after', futureHttpDate]]), fixedNow), 20000);

  const pastHttpDate = new Date('2026-11-11T11:59:00.000Z').toUTCString();
  assert.equal(parseRetryAfter(new Map([['retry-after', pastHttpDate]]), fixedNow), 0);
});

test('http-client: parseRetryAfter handles missing, null, and unparseable headers', () => {
  assert.equal(parseRetryAfter(new Map()), 5000, 'missing header defaults to 5000ms');
  assert.equal(parseRetryAfter(null), null, 'null headers returns null');
  assert.equal(parseRetryAfter(new Map([['retry-after', 'garbage-date']])), null, 'unparseable returns null');
  assert.equal(parseRetryAfter(new Map([['retry-after', '']])), 5000, 'empty string defaults to 5000ms');
});

test('http-client: parseLinkHeader extracts rel=next, last, prev, first', () => {
  const linkHeader = '<https://codeberg.org/api/v1/repos/search?page=2>; rel="next", <https://codeberg.org/api/v1/repos/search?page=5>; rel="last"';
  const parsed = parseLinkHeader(linkHeader);
  assert.equal(parsed.next, 'https://codeberg.org/api/v1/repos/search?page=2');
  assert.equal(parsed.last, 'https://codeberg.org/api/v1/repos/search?page=5');
  assert.equal(parsed.prev, undefined);

  assert.deepEqual(parseLinkHeader(null), {});
  assert.deepEqual(parseLinkHeader(''), {});
  assert.deepEqual(parseLinkHeader('invalid-no-semicolon'), {});
});

test('http-client: parseLinkHeader handles multiple parameters, title, quoted/unquoted, malformed entries', () => {
  // Multi-parameter entry: rel, title, type
  const multiParam = '<https://example.com/api?page=2>; rel="next"; title="Next Page", <https://example.com/api?page=1>; title="Previous"; rel="prev"';
  const parsedMulti = parseLinkHeader(multiParam);
  assert.equal(parsedMulti.next, 'https://example.com/api?page=2');
  assert.equal(parsedMulti.prev, 'https://example.com/api?page=1');

  // Single-quoted and unquoted rel attributes
  const mixedQuotes = '<https://example.com/api?page=1>; rel=\'first\', <https://example.com/api?page=10>; rel=last; extra="info"';
  const parsedMixed = parseLinkHeader(mixedQuotes);
  assert.equal(parsedMixed.first, 'https://example.com/api?page=1');
  assert.equal(parsedMixed.last, 'https://example.com/api?page=10');

  // Malformed entries without angle brackets or with empty params
  const malformed = 'no-angle-brackets; rel="next", <>; rel="prev", <https://example.com/ok>; rel=""';
  const parsedMalformed = parseLinkHeader(malformed);
  assert.equal(parsedMalformed.next, undefined);
  assert.equal(parsedMalformed.prev, undefined);
  assert.equal(parsedMalformed[''], undefined);
});

test('http-client: fetchWithRetry handles success and malformed JSON', async () => {
  // Successful fetch
  const mockFetchOk = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => ({ hello: 'world' }),
  });
  const res = await fetchWithRetry('https://example.com', {}, { fetch: mockFetchOk });
  assert.deepEqual(res.data, { hello: 'world' });

  // Malformed JSON response throws descriptive error
  const mockFetchBadJson = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => { throw new Error('Unexpected token'); },
  });
  await assert.rejects(
    async () => fetchWithRetry('https://example.com', {}, { fetch: mockFetchBadJson, providerName: 'TestAPI' }),
    /Malformed JSON response from TestAPI/
  );
});

test('http-client: fetchWithRetry bounded 429 retry and budget exhaustion', async () => {
  let calls = 0;
  const slept = [];
  const fakeSleep = async (ms) => { slept.push(ms); };

  // 1 retry then success
  const mockOne429 = async () => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '2']]),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ success: true }),
    };
  };

  const result = await fetchWithRetry('https://example.com', {}, {
    fetch: mockOne429,
    sleep: fakeSleep,
    maxRetries: 3,
  });
  assert.equal(calls, 2);
  assert.deepEqual(slept, [2000]);
  assert.equal(result.data.success, true);

  // Budget exceeded throws immediately without sleeping
  const mockExceedsBudget = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    headers: new Map([['retry-after', '60']]),
  });
  const budgetSlept = [];
  await assert.rejects(
    async () => fetchWithRetry('https://example.com', {}, {
      fetch: mockExceedsBudget,
      sleep: async (ms) => { budgetSlept.push(ms); },
      maxWaitMs: 5000,
      providerName: 'TestBudget',
    }),
    /TestBudget rate limited: retry delay 60000ms exceeds budget 5000ms/
  );
  assert.equal(budgetSlept.length, 0, 'must not sleep if delay exceeds budget');
});

// ============================================================================
// NORMALIZER-UTILS TESTS
// ============================================================================

test('normalizer-utils: formatTitle formats snake_case and kebab-case titles', () => {
  assert.equal(formatTitle('cyber-dash-2077'), 'Cyber Dash 2077');
  assert.equal(formatTitle('retro_snake_arcade'), 'Retro Snake Arcade');
  assert.equal(formatTitle(''), '');
  assert.equal(formatTitle('singleword'), 'Singleword');
});

test('normalizer-utils: detectEngine identifies Phaser, Pixi, Three, Kaboom, LittleJS', () => {
  assert.equal(detectEngine(['phaser3']), 'Phaser 3 / WebGL');
  assert.equal(detectEngine([], 'A game built with phaser framework'), 'Phaser 3 / WebGL');
  assert.equal(detectEngine(['pixijs']), 'PixiJS / Canvas');
  assert.equal(detectEngine(['threejs']), 'Three.js / WebGL');
  assert.equal(detectEngine(['kaboom']), 'Kaboom / Canvas');
  assert.equal(detectEngine(['littlejs']), 'LittleJS / Canvas');
  assert.equal(detectEngine(['canvas-game']), 'HTML5 Canvas2D');
  assert.equal(detectEngine(['webgl']), 'WebGL / HTML5');
  assert.equal(detectEngine([], 'Unknown project'), 'HTML5 / JavaScript');
});

test('normalizer-utils: detectLanguage, extractDependencies, isHtml5, isMobile', () => {
  // detectLanguage
  assert.equal(detectLanguage(['typescript'], 'JavaScript'), 'TypeScript');
  assert.equal(detectLanguage([], 'TypeScript'), 'TypeScript');
  assert.equal(detectLanguage([], 'JavaScript'), 'JavaScript');
  assert.equal(detectLanguage([], 'Python'), 'Python');

  // extractDependencies
  assert.deepEqual(
    extractDependencies(['phaser', 'react', 'howler.js', 'unknown-lib']),
    ['phaser', 'howler.js']
  );

  // isHtml5
  assert.equal(isHtml5(['html5-game']), true);
  assert.equal(isHtml5([], 'Playable in your web browser'), true);
  assert.equal(isHtml5(['c-plus-plus'], 'Desktop native C++ binary'), false);

  // isMobile
  assert.equal(isMobile(['mobile', 'touch']), true);
  assert.equal(isMobile([], 'Supports touch controls on mobile devices'), true);
  assert.equal(isMobile([], 'Desktop keyboard only'), false);
});

test('normalizer-utils: normalizeRepoUrl strips trailing slashes, fragments, normalizes hostnames, preserves queries', () => {
  // Trailing slashes
  assert.equal(
    normalizeRepoUrl('https://github.com/arcade-open-source/cyber-blaster-2088/'),
    'https://github.com/arcade-open-source/cyber-blaster-2088'
  );
  assert.equal(
    normalizeRepoUrl('https://codeberg.org/indiedev/pixel-adventure///'),
    'https://codeberg.org/indiedev/pixel-adventure'
  );

  // Hostname case normalization (lowercase protocol and host)
  assert.equal(
    normalizeRepoUrl('HTTPS://GITHUB.COM/User/Repo'),
    'https://github.com/User/Repo'
  );
  assert.equal(
    normalizeRepoUrl('https://CODEBERG.ORG/Owner/Game/'),
    'https://codeberg.org/Owner/Game'
  );

  // URL fragments stripped
  assert.equal(
    normalizeRepoUrl('https://gitlab.com/author/game#readme'),
    'https://gitlab.com/author/game'
  );
  assert.equal(
    normalizeRepoUrl('https://github.com/author/game/#section-1'),
    'https://github.com/author/game'
  );

  // Default port normalization
  assert.equal(
    normalizeRepoUrl('https://codeberg.org:443/author/game'),
    'https://codeberg.org/author/game'
  );
  assert.equal(
    normalizeRepoUrl('http://example.com:80/author/game/'),
    'http://example.com/author/game'
  );

  // Query parameters preserved
  assert.equal(
    normalizeRepoUrl('https://itch.io/game?version=2&lang=en'),
    'https://itch.io/game?version=2&lang=en'
  );

  // Non-URL string or empty string fallbacks
  assert.equal(normalizeRepoUrl(''), '');
  assert.equal(normalizeRepoUrl(null), '');
  assert.equal(normalizeRepoUrl('   '), '');
  assert.equal(normalizeRepoUrl('not-a-valid-url/path/#frag'), 'not-a-valid-url/path');
});
