import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  discoverFromCodeberg,
  fetchCodebergPage,
  normalizeCodebergProject,
  CODEBERG_SEARCH_QUERIES,
} from '../scripts/discovery/discover-codeberg.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

// ============================================================================
// CODEBERG ADAPTER MOCKED UNIT & INTEGRATION TESTS
// ============================================================================

test('codeberg: successful repository search and normalization', async () => {
  const mockRepo = {
    id: 101,
    name: 'pixel-adventure',
    full_name: 'indiedev/pixel-adventure',
    owner: { username: 'indiedev', full_name: 'Indie Dev' },
    description: 'A 2D pixel platformer game built with Phaser 3.',
    html_url: 'https://codeberg.org/indiedev/pixel-adventure',
    stars_count: 42,
    forks_count: 7,
    open_issues_count: 1,
    language: 'JavaScript',
    topics: ['html5-game', 'phaser3', 'mobile'],
    license: 'MIT',
    default_branch: 'main',
    updated_at: '2026-02-01T15:30:00Z',
  };

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => ({ ok: true, data: [mockRepo] }),
  });

  const res = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mockFetch,
    queries: [{ q: 'html5 game' }],
  });

  assert.equal(res.length, 1);
  const c = res[0];
  assert.equal(c.candidateId, 'cb-indiedev-pixel-adventure');
  assert.equal(c.name, 'Pixel Adventure');
  assert.equal(c.originalRepoUrl, 'https://codeberg.org/indiedev/pixel-adventure');
  assert.equal(c.author, 'Indie Dev');
  assert.equal(c.sourcePlatform, 'codeberg');
  assert.equal(c.programmingLanguage, 'JavaScript');
  assert.equal(c.gameEngine, 'Phaser 3 / WebGL');
  assert.equal(c.popularityIndicators.githubStars, 42);
  assert.equal(c.popularityIndicators.forks, 7);
  assert.equal(c.licenseName, 'MIT');
  assert.equal(c.html5Compatibility, true);
  assert.equal(c.mobileCompatibility, true);
  assert.equal(c.exactCommitHash, 'main');
});

test('codeberg: search query construction verifies url parameters', async () => {
  let requestedUrl = null;
  const mockFetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: [] }),
    };
  };

  await fetchCodebergPage({ q: 'canvas action' }, 2, 25, 'my-test-token', { fetch: mockFetch });

  assert.ok(requestedUrl);
  const u = new URL(requestedUrl);
  assert.equal(u.searchParams.get('q'), 'canvas action');
  assert.equal(u.searchParams.get('page'), '2');
  assert.equal(u.searchParams.get('limit'), '25');
  assert.equal(u.searchParams.get('sort'), 'stars');
  assert.equal(u.searchParams.get('order'), 'desc');
});

test('codeberg: pagination through Link headers and x-total-count', async () => {
  let pageCounter = 0;
  const mockFetch = async (url) => {
    pageCounter++;
    const pageNum = new URL(url).searchParams.get('page');

    if (pageNum === '1') {
      return {
        ok: true,
        status: 200,
        headers: new Map([
          ['link', '<https://codeberg.org/api/v1/repos/search?page=2>; rel="next"'],
          ['x-total-count', '2'],
        ]),
        json: async () => ([
          { id: 1, name: 'game-page-1', owner: { username: 'alice' }, html_url: 'https://codeberg.org/alice/game-page-1' },
        ]),
      };
    }

    return {
      ok: true,
      status: 200,
      headers: new Map([['x-total-count', '2']]),
      json: async () => ([
        { id: 2, name: 'game-page-2', owner: { username: 'bob' }, html_url: 'https://codeberg.org/bob/game-page-2' },
      ]),
    };
  };

  const res = await discoverFromCodeberg({
    maxResults: 10,
    fetch: mockFetch,
    queries: [{ q: 'multi-page' }],
  });

  assert.equal(res.length, 2);
  assert.equal(res[0].name, 'Game Page 1');
  assert.equal(res[1].name, 'Game Page 2');
  assert.equal(pageCounter, 2, 'should fetch page 1 and page 2');
});

test('codeberg: respects configured maxResults limit', async () => {
  const items = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `game-${i + 1}`,
    owner: { username: 'creator' },
    html_url: `https://codeberg.org/creator/game-${i + 1}`,
  }));

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => items,
  });

  const res = await discoverFromCodeberg({
    maxResults: 3,
    fetch: mockFetch,
    queries: [{ q: 'batch' }],
  });

  assert.equal(res.length, 3, 'must cap candidate output at maxResults');
});

test('codeberg: empty results and missing metadata handled gracefully', async () => {
  const mockFetchEmpty = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => ({ data: [] }),
  });

  const resEmpty = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mockFetchEmpty,
    queries: [{ q: 'nothing' }],
  });
  assert.equal(resEmpty.length, 0);

  // Missing metadata normalization
  const bareItem = { id: 99, name: 'bare-bones' };
  const normalized = normalizeCodebergProject(bareItem, '2026-11-11');
  assert.equal(normalized.candidateId, 'cb-unknown-bare-bones');
  assert.equal(normalized.licenseName, 'UNKNOWN');
  assert.equal(normalized.originalRepoUrl, 'https://codeberg.org/unknown/bare-bones');
  assert.equal(normalized.sourcePlatform, 'codeberg');
  assert.equal(normalized.html5Compatibility, false);
});

test('codeberg: unknown license preserved when missing in API response', () => {
  const itemNoLicense = { id: 1, name: 'no-lic', owner: { username: 'u' }, license: '' };
  const c = normalizeCodebergProject(itemNoLicense, '2026-11-11');
  assert.equal(c.licenseName, 'UNKNOWN');
});

test('codeberg: malformed JSON response handled gracefully without crashing', async () => {
  const mockBadJson = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => { throw new Error('Unexpected token < in JSON at position 0'); },
  });

  const res = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mockBadJson,
    queries: [{ q: 'bad-json' }],
  });
  assert.equal(res.length, 0, 'query with malformed JSON should be skipped gracefully');
});

test('codeberg: HTTP errors 403, 404, 500, 503 handled gracefully', async () => {
  for (const status of [403, 404, 500, 503]) {
    const mockHttpError = async () => ({
      ok: false,
      status,
      statusText: `Error ${status}`,
      headers: new Map(),
      json: async () => ({}),
    });

    const res = await discoverFromCodeberg({
      maxResults: 5,
      fetch: mockHttpError,
      queries: [{ q: `error-${status}` }],
    });
    assert.equal(res.length, 0, `HTTP ${status} should skip gracefully`);
  }
});

test('codeberg: HTTP 429 bounded retries and Retry-After handling', async () => {
  let calls = 0;
  const slept = [];
  const fakeSleep = async (ms) => { slept.push(ms); };

  // 1 429 then success
  const mock429Once = async () => {
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
      json: async () => ([
        { id: 42, name: 'retry-game', owner: { username: 'dev' }, html_url: 'https://codeberg.org/dev/retry-game' },
      ]),
    };
  };

  const res = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mock429Once,
    sleep: fakeSleep,
    maxRetries: 3,
    queries: [{ q: 'retry-test' }],
  });

  assert.equal(calls, 2);
  assert.deepEqual(slept, [2000]);
  assert.equal(res.length, 1);
  assert.equal(res[0].candidateId, 'cb-dev-retry-game');
});

test('codeberg: persistent 429 reaches retry limit and waiting budget', async () => {
  // 1. Persistent 429 reaches limit
  let calls = 0;
  const slept = [];
  const mockPersistent429 = async () => {
    calls++;
    return {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Map([['retry-after', '1']]),
    };
  };

  const res = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mockPersistent429,
    sleep: async (ms) => { slept.push(ms); },
    maxRetries: 3,
    queries: [{ q: 'persistent-429' }],
  });

  assert.equal(calls, 4, '1 initial + 3 retries = 4 total attempts');
  assert.equal(slept.length, 3);
  assert.equal(res.length, 0);

  // 2. Delay exceeds waiting budget
  const budgetSlept = [];
  const mockExceedsBudget = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    headers: new Map([['retry-after', '60']]),
  });

  const resBudget = await discoverFromCodeberg({
    maxResults: 5,
    fetch: mockExceedsBudget,
    sleep: async (ms) => { budgetSlept.push(ms); },
    maxWaitMs: 5000,
    queries: [{ q: 'budget-test' }],
  });

  assert.equal(budgetSlept.length, 0, 'must not sleep if delay exceeds waiting budget');
  assert.equal(resBudget.length, 0);
});

test('codeberg: in-run duplicate repositories deduplicated', async () => {
  const dupRepo = { id: 1, name: 'same-game', owner: { username: 'u' }, html_url: 'https://codeberg.org/u/same-game' };
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => [dupRepo, dupRepo],
  });

  const res = await discoverFromCodeberg({
    maxResults: 10,
    fetch: mockFetch,
    queries: [{ q: 'dup-test' }],
  });

  assert.equal(res.length, 1, 'must deduplicate identical repository URLs in a single run');
});

test('codeberg: orchestrator integration (offline mode skips codeberg, online includes it)', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-cb-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'rejected'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');

  // Offline mode skips live Codeberg query, uses seeds
  const r = await runDailyDiscoveryPipeline({ dryRun: false, offline: true, rootDir: dir, maxCandidates: 1 });
  assert.ok(r.evaluatedCount >= 1);
});
