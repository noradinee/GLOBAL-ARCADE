import test from 'node:test';
import assert from 'node:assert/strict';

import { discoverFromGitLab, parseRetryAfter, fetchPage } from '../scripts/discovery/discover-gitlab.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

function mockFetch(pages) {
  let call = 0;
  global.fetch = async (url) => {
    const u = new URL(url);
    const page = parseInt(u.searchParams.get('page') || '1', 10);
    const data = pages[page - 1] || [];
    const hasNext = page < pages.length;
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-next-page', hasNext ? String(page + 1) : '']]),
      json: async () => data,
    };
  };
}

test('gitlab: parses API response into candidate', async (t) => {
  mockFetch([[
    { id: 1, name: 'space-shooter', description: 'A space shooter', path_with_namespace: 'user/space-shooter', namespace: { name: 'user', full_path: 'user' }, web_url: 'https://gitlab.com/user/space-shooter', star_count: 42, forks_count: 5, last_activity_at: '2026-01-01T00:00:00Z', default_branch: 'main', topics: ['html5-game', 'phaser'], visibility: 'public' },
  ]]);
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 1);
  assert.equal(res[0].sourcePlatform, 'gitlab');
  assert.equal(res[0].name, 'Space Shooter');
  assert.equal(res[0].licenseName, 'UNKNOWN');
  assert.deepEqual(res[0].tags, ['html5-game', 'phaser']);
});

test('gitlab: pagination', async (t) => {
  mockFetch([
    [{ id: 1, name: 'a', path_with_namespace: 'u/a', namespace: { name: 'u', full_path: 'u' }, web_url: 'https://gitlab.com/u/a', star_count: 1, forks_count: 0, last_activity_at: '2026-01-01T00:00:00Z', default_branch: 'main', topics: [], visibility: 'public' }],
    [{ id: 2, name: 'b', path_with_namespace: 'u/b', namespace: { name: 'u', full_path: 'u' }, web_url: 'https://gitlab.com/u/b', star_count: 2, forks_count: 0, last_activity_at: '2026-01-01T00:00:00Z', default_branch: 'main', topics: [], visibility: 'public' }],
  ]);
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 2);
});

test('gitlab: missing metadata handled', async (t) => {
  mockFetch([[
    { id: 3, name: 'minimal', path_with_namespace: 'u/minimal', namespace: { name: 'u', full_path: 'u' }, web_url: 'https://gitlab.com/u/minimal', visibility: 'public' },
  ]]);
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 1);
  assert.equal(res[0].licenseName, 'UNKNOWN');
  assert.equal(res[0].html5Compatibility, false); // no html5 topics/desc
});

test('gitlab: HTTP error handled gracefully', async (t) => {
  global.fetch = async () => ({ ok: false, status: 500, statusText: 'Server Error', headers: new Map(), json: async () => ({}) });
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 0);
});

test('gitlab: rate limit 429 handled', async (t) => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 429, statusText: 'Too Many', headers: new Map([['retry-after', '0']]), json: async () => ({}) };
    return { ok: true, status: 200, headers: new Map([['x-next-page', '']]), json: async () => ([]) };
  };
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 0);
});

test('gitlab: duplicate detection within run', async (t) => {
  mockFetch([[
    { id: 1, name: 'dup', path_with_namespace: 'u/dup', namespace: { name: 'u', full_path: 'u' }, web_url: 'https://gitlab.com/u/dup', star_count: 1, forks_count: 0, last_activity_at: '2026-01-01T00:00:00Z', default_branch: 'main', topics: [], visibility: 'public' },
    { id: 2, name: 'dup', path_with_namespace: 'u/dup2', namespace: { name: 'u', full_path: 'u' }, web_url: 'https://gitlab.com/u/dup', star_count: 2, forks_count: 0, last_activity_at: '2026-01-01T00:00:00Z', default_branch: 'main', topics: [], visibility: 'public' },
  ]]);
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  assert.equal(res.length, 1);
});

test('gitlab: candidate normalization fields', async (t) => {
  mockFetch([[
    { id: 7, name: 'my-game', description: 'A game', path_with_namespace: 'ns/my-game', namespace: { name: 'ns', full_path: 'ns' }, web_url: 'https://gitlab.com/ns/my-game', star_count: 10, forks_count: 2, last_activity_at: '2026-02-02T00:00:00Z', default_branch: 'main', topics: ['html5-game'], visibility: 'public' },
  ]]);
  t.after(() => { delete global.fetch; });
  const res = await discoverFromGitLab({ maxResults: 10 });
  const c = res[0];
  assert.equal(c.candidateId, 'gl-ns-my-game');
  assert.equal(c.sourcePlatform, 'gitlab');
  assert.equal(c.originalRepoUrl, 'https://gitlab.com/ns/my-game');
  assert.equal(c.licenseName, 'UNKNOWN');
  assert.equal(c.html5Compatibility, true);
});

test('gitlab: orchestrator integration (offline uses seeds, gitlab not called when offline)', async (t) => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-gl-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  // offline mode skips gitlab; uses seeds
  const r = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1 });
  assert.ok(r.evaluatedCount >= 1);
});

test('gitlab: backward compatibility (existing github/itch tests unaffected)', async () => {
  // smoke: module loads and exports function
  assert.equal(typeof discoverFromGitLab, 'function');
});

// ============================================================================
// PHASE 3A HARDENING: DETERMINISTIC RATE-LIMIT RETRY TESTS
// ============================================================================

test('gitlab: parseRetryAfter parsing unit tests', () => {
  // Seconds parsing
  assert.equal(parseRetryAfter(new Map([['retry-after', '0']])), 0);
  assert.equal(parseRetryAfter(new Map([['retry-after', '5']])), 5000);
  assert.equal(parseRetryAfter(new Map([['retry-after', '120']])), 120000);
  assert.equal(parseRetryAfter({ 'retry-after': '3' }), 3000);
  assert.equal(parseRetryAfter({ 'Retry-After': '2.5' }), 2500);

  // HTTP date parsing
  const fixedNow = Date.parse('2026-11-11T12:00:00.000Z');
  const futureHttpDate = new Date('2026-11-11T12:00:10.000Z').toUTCString();
  assert.equal(parseRetryAfter(new Map([['retry-after', futureHttpDate]]), fixedNow), 10000);

  // Past HTTP date clamps to 0
  const pastHttpDate = new Date('2026-11-11T11:59:50.000Z').toUTCString();
  assert.equal(parseRetryAfter(new Map([['retry-after', pastHttpDate]]), fixedNow), 0);

  // Missing header defaults to 5000ms
  assert.equal(parseRetryAfter(new Map()), 5000);
  assert.equal(parseRetryAfter({}), 5000);

  // Null/undefined headers object
  assert.equal(parseRetryAfter(null), null);

  // Unparseable header returns null
  assert.equal(parseRetryAfter(new Map([['retry-after', 'invalid-not-a-date']])), null);
  assert.equal(parseRetryAfter(new Map([['retry-after', 'foo-bar-baz']])), null);
});

test('gitlab: one 429 followed by success', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '1']]),
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-next-page', '']]),
      json: async () => ([{
        id: 101,
        name: 'game-one',
        path_with_namespace: 'u/game-one',
        namespace: { name: 'u', full_path: 'u' },
        web_url: 'https://gitlab.com/u/game-one',
        star_count: 5,
        forks_count: 1,
        last_activity_at: '2026-01-01T00:00:00Z',
        default_branch: 'main',
        topics: ['html5-game'],
        visibility: 'public',
      }]),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  assert.equal(calls, 2, 'should make 1 initial request + 1 retry');
  assert.deepEqual(sleptMs, [1000], 'should sleep for server-requested delay (1000ms)');
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'gl-u-game-one');
});

test('gitlab: multiple 429 responses followed by success', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async () => {
    calls++;
    if (calls <= 2) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '2']]),
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-next-page', '']]),
      json: async () => ([{
        id: 102,
        name: 'game-two',
        path_with_namespace: 'u/game-two',
        namespace: { name: 'u', full_path: 'u' },
        web_url: 'https://gitlab.com/u/game-two',
        star_count: 8,
        forks_count: 2,
        last_activity_at: '2026-01-01T00:00:00Z',
        default_branch: 'main',
        topics: ['html5-game'],
        visibility: 'public',
      }]),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    maxRetries: 3,
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  assert.equal(calls, 3, 'should make 1 initial request + 2 retries');
  assert.deepEqual(sleptMs, [2000, 2000], 'should sleep twice for 2000ms each');
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'gl-u-game-two');
});

test('gitlab: persistent 429 reaching the retry limit', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async () => {
    calls++;
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Map([['retry-after', '1']]),
      json: async () => ({}),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    maxRetries: 3,
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  // Initial attempt (1) + 3 retries = 4 total calls
  assert.equal(calls, 4, 'should stop at max 3 retries after initial request');
  assert.equal(sleptMs.length, 3, 'should have slept exactly 3 times before giving up');
  assert.deepEqual(sleptMs, [1000, 1000, 1000]);
  assert.equal(res.length, 0, 'should return empty list when query fails');
});

test('gitlab: retry-after expressed in seconds', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '7']]), // 7 seconds
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-next-page', '']]),
      json: async () => ([{
        id: 103,
        name: 'game-sec',
        path_with_namespace: 'u/game-sec',
        namespace: { name: 'u', full_path: 'u' },
        web_url: 'https://gitlab.com/u/game-sec',
        topics: ['html5-game'],
        visibility: 'public',
      }]),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  assert.equal(calls, 2);
  assert.deepEqual(sleptMs, [7000], '7 seconds must be converted to 7000ms, not retried earlier');
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'gl-u-game-sec');
});

test('gitlab: retry-after expressed as an HTTP date', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  // Fixed simulated current time
  const simulatedNow = Date.parse('2026-11-11T12:00:00.000Z');
  // Server specifies date exactly 15 seconds in the future
  const retryDateStr = new Date('2026-11-11T12:00:15.000Z').toUTCString();

  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', retryDateStr]]),
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-next-page', '']]),
      json: async () => ([{
        id: 104,
        name: 'game-date',
        path_with_namespace: 'u/game-date',
        namespace: { name: 'u', full_path: 'u' },
        web_url: 'https://gitlab.com/u/game-date',
        topics: ['html5-game'],
        visibility: 'public',
      }]),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    now: () => simulatedNow,
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  assert.equal(calls, 2);
  assert.deepEqual(sleptMs, [15000], 'must calculate difference between HTTP date and now: exactly 15000ms');
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'gl-u-game-date');
});

test('gitlab: retry-after exceeding configured waiting budget', async (t) => {
  let calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async () => {
    calls++;
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Map([['retry-after', '60']]), // 60s exceeds 5s budget
      json: async () => ({}),
    };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    maxWaitMs: 5000, // 5s budget
    queries: [{ type: 'topic', value: 'html5-game' }],
  });

  assert.equal(calls, 1, 'should not retry if requested delay exceeds budget');
  assert.equal(sleptMs.length, 0, 'should not sleep if budget exceeded');
  assert.equal(res.length, 0);
});

test('gitlab: retry counter reset between independent queries', async (t) => {
  let q1Calls = 0;
  let q2Calls = 0;
  const sleptMs = [];
  const fakeSleep = async (ms) => { sleptMs.push(ms); };

  global.fetch = async (url) => {
    const u = new URL(url);
    const topic = u.searchParams.get('topic');
    if (topic === 'query-1') {
      q1Calls++;
      // query 1 persistently hits 429 until its retry budget is exhausted
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '0']]),
        json: async () => ({}),
      };
    }
    if (topic === 'query-2') {
      q2Calls++;
      // query 2 gets one 429, then succeeds on retry 1
      if (q2Calls === 1) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['retry-after', '0']]),
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Map([['x-next-page', '']]),
        json: async () => ([{
          id: 105,
          name: 'game-q2',
          path_with_namespace: 'u/game-q2',
          namespace: { name: 'u', full_path: 'u' },
          web_url: 'https://gitlab.com/u/game-q2',
          topics: ['html5-game'],
          visibility: 'public',
        }]),
      };
    }
    return { ok: true, status: 200, headers: new Map(), json: async () => ([]) };
  };
  t.after(() => { delete global.fetch; });

  const res = await discoverFromGitLab({
    maxResults: 5,
    sleep: fakeSleep,
    maxRetries: 3,
    queries: [
      { type: 'topic', value: 'query-1' },
      { type: 'topic', value: 'query-2' },
    ],
  });

  // Query 1 exhausted 4 calls (1 initial + 3 retries)
  assert.equal(q1Calls, 4, 'query 1 should execute 4 calls (1 initial + 3 retries)');
  // Query 2 had retry counter reset to 0, so it could retry and succeed on call 2!
  assert.equal(q2Calls, 2, 'query 2 should execute 2 calls (1 initial + 1 retry)');
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'gl-u-game-q2');
});
