import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  COMMUNITY_PLATFORMS,
  getCommunityPlatformMatrix,
  extractRepoUrlFromText,
  isRepositoryHostUrl,
  cleanHnTitle,
  parseHackerNewsStory,
  discoverFromHackerNews,
  discoverFromCommunity,
  VERIFIED_COMMUNITY_SEEDS,
} from '../scripts/discovery/discover-community.js';

import {
  detectMirrorStatus,
  traceSourceRepository,
  normalizeOpenWebCandidate,
  discoverFromOpenWeb,
  VERIFIED_OPEN_WEB_GAMES,
} from '../scripts/discovery/discover-open-web.js';

import { scoreCandidate } from '../scripts/discovery/score-candidates.js';
import { verifyLicense } from '../scripts/discovery/verify-license.js';
import { inspectSecurity } from '../scripts/discovery/security-inspection.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

// ============================================================================
// 1. COMMUNITY PLATFORM MATRIX & RESTRICTION DOCUMENTATION TESTS
// ============================================================================

test('community: getCommunityPlatformMatrix returns comprehensive platform status & constraints', () => {
  const matrix = getCommunityPlatformMatrix();
  assert.equal(Array.isArray(matrix), true);
  assert.ok(matrix.length >= 6);

  const hn = COMMUNITY_PLATFORMS.hackernews;
  assert.ok(hn.status === 'REAL_RETRIEVAL_VERIFIED' || hn.status === 'AVAILABLE_PUBLIC_API');
  assert.equal(hn.accessStatus, 'REAL_RETRIEVAL_VERIFIED');
  assert.equal(hn.requiresAuth, false);
  assert.ok(hn.endpoint.includes('hn.algolia.com'));

  const reddit = COMMUNITY_PLATFORMS.reddit;
  assert.equal(reddit.status, 'RESTRICTED_AUTH_REQUIRED');
  assert.equal(reddit.requiresAuth, true);
  assert.ok(reddit.description.includes('403'));
  assert.ok(reddit.authMethod.includes('OAuth2'));

  const fb = COMMUNITY_PLATFORMS.facebook;
  assert.ok(fb.status === 'UNAVAILABLE' || fb.status === 'UNAVAILABLE_LOGIN_REQUIRED');
  assert.equal(fb.accessStatus, 'UNAVAILABLE');
  assert.equal(fb.requiresAuth, true);

  const insta = COMMUNITY_PLATFORMS.instagram;
  assert.ok(insta.status === 'UNAVAILABLE' || insta.status === 'UNAVAILABLE_LOGIN_REQUIRED');
  assert.equal(insta.accessStatus, 'UNAVAILABLE');
  assert.equal(insta.requiresAuth, true);

  const telegram = COMMUNITY_PLATFORMS.telegram;
  assert.ok(telegram.status === 'DOCUMENTED_ACCESS_ONLY' || telegram.status === 'UNAVAILABLE_NO_PUBLIC_SEARCH');
  assert.equal(telegram.accessStatus, 'DOCUMENTED_ACCESS_ONLY');
  assert.equal(telegram.requiresAuth, true);

  const itch = COMMUNITY_PLATFORMS.itch_community;
  assert.ok(itch.status === 'WORKING_ADAPTER' || itch.status === 'AVAILABLE_PUBLIC_WEB');
  assert.equal(itch.accessStatus, 'WORKING_ADAPTER');
  assert.equal(itch.requiresAuth, false);
});

// ============================================================================
// 2. REPOSITORY & TITLE PARSING TESTS
// ============================================================================

test('community: extractRepoUrlFromText extracts GitHub, GitLab, and Codeberg URLs cleanly', () => {
  assert.equal(
    extractRepoUrlFromText('Check out the code at https://github.com/Hextris/hextris.git!'),
    'https://github.com/Hextris/hextris'
  );
  assert.equal(
    extractRepoUrlFromText('Source: https://gitlab.com/games/pixel-quest/ for details'),
    'https://gitlab.com/games/pixel-quest'
  );
  assert.equal(
    extractRepoUrlFromText('Hosted on https://codeberg.org/indiedev/retro-canvas; enjoy!'),
    'https://codeberg.org/indiedev/retro-canvas'
  );
  assert.equal(extractRepoUrlFromText('No repository mentioned in this post'), null);
  assert.equal(extractRepoUrlFromText(null), null);
});

test('community: isRepositoryHostUrl distinguishes repo hosts from playables', () => {
  assert.equal(isRepositoryHostUrl('https://github.com/Hextris/hextris'), true);
  assert.equal(isRepositoryHostUrl('https://gitlab.com/foo/bar'), true);
  assert.equal(isRepositoryHostUrl('https://codeberg.org/baz/qux'), true);
  assert.equal(isRepositoryHostUrl('https://hextris.io'), false);
  assert.equal(isRepositoryHostUrl('https://chvin.github.io/react-tetris/'), false);
  assert.equal(isRepositoryHostUrl('invalid-url'), false);
});

test('community: cleanHnTitle strips Show HN prefix and sub-titles', () => {
  assert.equal(cleanHnTitle('Show HN: Hextris – Fast-paced puzzle game'), 'Hextris');
  assert.equal(cleanHnTitle('Show HN: React Tetris | Retro Handheld in React'), 'React Tetris');
  assert.equal(cleanHnTitle('Show HN: T-Rex Runner - Offline Dino Game'), 'T Rex Runner');
});

// ============================================================================
// 3. HACKER NEWS STORY PARSING & ADAPTER TESTS
// ============================================================================

test('community: parseHackerNewsStory parses story with separate playable URL and repo in text', () => {
  const story = {
    objectID: '8322699',
    title: 'Show HN: Hextris – Fast-paced HTML5 puzzle game',
    url: 'https://hextris.io',
    story_text: 'We built an open-source hexagonal puzzle game. Code is here: https://github.com/Hextris/hextris',
    author: 'hextris_team',
    points: 450,
    num_comments: 72,
    created_at: '2024-10-12T14:00:00Z',
  };

  const candidate = parseHackerNewsStory(story, '2026-11-12');
  assert.ok(candidate);
  assert.equal(candidate.candidateId, 'hn-hextris-hextris');
  assert.equal(candidate.name, 'Hextris');
  assert.equal(candidate.originalRepoUrl, 'https://github.com/Hextris/hextris');
  assert.equal(candidate.playableUrl, 'https://hextris.io');
  assert.equal(candidate.discoveryUrl, 'https://news.ycombinator.com/item?id=8322699');
  assert.equal(candidate.sourcePlatform, 'hackernews');
  assert.equal(candidate.isMirror, false);

  // Audience indicators
  assert.equal(candidate.audienceIndicators.communityPoints, 450);
  assert.equal(candidate.audienceIndicators.communityComments, 72);
  assert.ok(candidate.audienceIndicators.playerCount >= 45000);
  assert.deepEqual(candidate.audienceIndicators.evidenceSources, ['https://news.ycombinator.com/item?id=8322699']);
});

test('community: parseHackerNewsStory parses story where URL itself is a repository', () => {
  const story = {
    objectID: '14751430',
    title: 'Show HN: React Tetris (Retro handheld arcade simulator)',
    url: 'https://github.com/chvin/react-tetris',
    story_text: null,
    author: 'chvin',
    points: 320,
    num_comments: 48,
    created_at: '2024-08-01T10:00:00Z',
  };

  const candidate = parseHackerNewsStory(story, '2026-11-12');
  assert.ok(candidate);
  assert.equal(candidate.originalRepoUrl, 'https://github.com/chvin/react-tetris');
  assert.equal(candidate.sourcePlatform, 'hackernews');
  assert.equal(candidate.audienceIndicators.communityPoints, 320);
});

test('community: parseHackerNewsStory returns null if no repository is found', () => {
  const story = {
    objectID: '9999999',
    title: 'Show HN: My New Closed Commercial Game',
    url: 'https://mysite.com/game',
    story_text: 'Play my game here, it is proprietary!',
    author: 'propdev',
    points: 15,
    num_comments: 2,
  };

  const candidate = parseHackerNewsStory(story, '2026-11-12');
  assert.equal(candidate, null);
});

test('community: discoverFromHackerNews queries Algolia API with injected fetchFn', async () => {
  const mockStories = [
    {
      objectID: '101',
      title: 'Show HN: Canvas Arcade Space Cadet',
      url: 'https://cadet.io',
      story_text: 'Code: https://github.com/cadet-dev/space-cadet',
      author: 'cadet-dev',
      points: 85,
      num_comments: 14,
      created_at: '2025-01-10T12:00:00Z',
    },
    {
      objectID: '102',
      title: 'Show HN: Another Game',
      url: 'https://github.com/cadet-dev/space-cadet', // duplicate repo
      story_text: '',
      author: 'cadet-dev',
      points: 10,
      num_comments: 1,
    },
  ];

  const mockFetchFn = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => ({ hits: mockStories }),
  });

  const candidates = await discoverFromHackerNews({
    fetchFn: mockFetchFn,
    queries: ['Show HN HTML5 game'],
    maxResults: 5,
  });

  assert.equal(candidates.length, 1); // duplicate repo was filtered out
  assert.equal(candidates[0].name, 'Canvas Arcade Space Cadet');
  assert.equal(candidates[0].originalRepoUrl, 'https://github.com/cadet-dev/space-cadet');
  assert.equal(candidates[0].audienceIndicators.communityPoints, 85);
});

test('community: discoverFromCommunity returns verified seeds in offline mode', async () => {
  const candidates = await discoverFromCommunity({ offline: true, maxResults: 2 });
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].candidateId, 'hn-hextris-hextris');
  assert.equal(candidates[1].candidateId, 'hn-chvin-react-tetris');
});

// ============================================================================
// 4. OPEN WEB DISCOVERY & MIRROR DETECTION TESTS
// ============================================================================

test('open-web: detectMirrorStatus correctly flags mirrors vs canonical repos', () => {
  assert.equal(detectMirrorStatus('https://github.com/user/game-mirror', 'user', 'Normal game'), true);
  assert.equal(detectMirrorStatus('https://github.com/user/game-fork', 'user', 'Normal game'), true);
  assert.equal(detectMirrorStatus('https://github.com/user/game', 'user', 'Unofficial mirror of original author project'), true);
  assert.equal(detectMirrorStatus('https://github.com/user/game', 'user', 'Re-upload for preservation'), true);
  assert.equal(detectMirrorStatus('https://github.com/Hextris/hextris', 'Hextris', 'Original official repository'), false);
});

test('open-web: traceSourceRepository finds git repository from web page text', () => {
  const articleHtml = `
    <h1>Play Hextris Online</h1>
    <p>Hextris was developed as an open source project. You can inspect the code on
    <a href="https://github.com/Hextris/hextris.git">GitHub</a> or play on the site.</p>
  `;
  assert.equal(traceSourceRepository(articleHtml), 'https://github.com/Hextris/hextris');
  assert.equal(traceSourceRepository('No repo link on this page'), null);
});

test('open-web: normalizeOpenWebCandidate normalizes candidate and separates URLs & metrics', () => {
  const raw = {
    title: 'Hextris Puzzle Challenge',
    originalRepoUrl: 'https://github.com/Hextris/hextris',
    discoveryUrl: 'https://hextris.io',
    playableUrl: 'https://hextris.io',
    author: 'Hextris Team',
    description: 'Fast-paced hexagonal puzzle game',
    playerCount: 2500000,
    communityPoints: 450,
    licenseName: 'MIT',
  };

  const normalized = normalizeOpenWebCandidate(raw, '2026-11-12');
  assert.ok(normalized.candidateId.startsWith('ow-'));
  assert.equal(normalized.originalRepoUrl, 'https://github.com/Hextris/hextris');
  assert.equal(normalized.discoveryUrl, 'https://hextris.io');
  assert.equal(normalized.playableUrl, 'https://hextris.io');
  assert.equal(normalized.isMirror, false);
  assert.equal(normalized.sourcePlatform, 'open-web');

  // Popularity indicators vs audience indicators
  assert.equal(normalized.audienceIndicators.playerCount, 2500000);
  assert.equal(normalized.audienceIndicators.communityPoints, 450);
  assert.equal(normalized.popularityIndicators.communityPlays, 2500000);
});

test('open-web: discoverFromOpenWeb uses injected exaSearchFn when available', async () => {
  const mockExaResults = [
    {
      title: 'Dino Runner Web',
      originalRepoUrl: 'https://github.com/wayou/t-rex-runner',
      url: 'https://wayou.github.io/t-rex-runner/',
      gameUrl: 'https://wayou.github.io/t-rex-runner/',
      author: 'wayou',
      description: 'Chrome offline dinosaur game for web',
      playerCount: 1200000,
      licenseName: 'MIT',
    },
  ];

  const candidates = await discoverFromOpenWeb({
    offline: false,
    exaSearchFn: async () => mockExaResults,
    maxResults: 5,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'Dino Runner Web');
  assert.equal(candidates[0].originalRepoUrl, 'https://github.com/wayou/t-rex-runner');
  assert.equal(candidates[0].audienceIndicators.playerCount, 1200000);
});

test('open-web: discoverFromOpenWeb returns verified catalog in offline mode', async () => {
  const candidates = await discoverFromOpenWeb({ offline: true, maxResults: 3 });
  assert.equal(candidates.length, 3);
  assert.equal(candidates[0].candidateId, 'ow-hextris-hextris');
  assert.equal(candidates[1].candidateId, 'ow-chvin-react-tetris');
  assert.equal(candidates[2].candidateId, 'ow-wayou-trex-runner');
});

// ============================================================================
// 5. AUDIENCE EVIDENCE VS CODE STARS & SCORING TESTS
// ============================================================================

test('scoring: real audience indicators contribute to popularity score independently of stars', () => {
  const highAudienceCandidate = {
    candidateId: 'ow-high-audience-game',
    name: 'High Audience Indie Game',
    originalRepoUrl: 'https://github.com/indie/game',
    popularityIndicators: {
      githubStars: 0, // Zero GitHub stars!
      forks: 0,
      communityPlays: 0,
    },
    audienceIndicators: {
      playerCount: 1000000, // 1 Million players
      communityPoints: 350, // 350 community points
      communityComments: 60,
    },
    gameEngine: 'HTML5 Canvas2D',
    dependencies: [],
    mobileCompatibility: true,
    lastUpdateDate: '2026-01-01',
    description: 'Popular arcade web puzzle game',
  };

  const licenseResult = verifyLicense({ licenseSpdx: 'MIT' });
  const securityResult = inspectSecurity({ 'index.html': '<html><body></body></html>' });

  const score = scoreCandidate(highAudienceCandidate, licenseResult, securityResult);

  // Popularity score must recognize the 1M player count and 350 points
  assert.ok(score.scores.popularityScore >= 20, `Popularity score was ${score.scores.popularityScore}`);
  assert.ok(score.scores.totalScore >= 70, `Total score was ${score.scores.totalScore}`);
  assert.equal(score.publicationEligibility, 'ELIGIBLE');
});

test('scoring: high audience cannot bypass mandatory licensing gate failure', () => {
  const restrictedCandidate = {
    candidateId: 'ow-viral-proprietary-game',
    name: 'Viral Game with Restricted License',
    originalRepoUrl: 'https://github.com/viral/game',
    popularityIndicators: { githubStars: 10000, communityPlays: 5000000 },
    audienceIndicators: { playerCount: 5000000, communityPoints: 1000 },
    gameEngine: 'HTML5 Canvas2D',
    dependencies: [],
    mobileCompatibility: true,
  };

  // License is non-commercial / restricted
  const licenseResult = verifyLicense({ licenseSpdx: 'CC-BY-NC-4.0' });
  const securityResult = inspectSecurity({ 'index.html': '<html></html>' });

  const score = scoreCandidate(restrictedCandidate, licenseResult, securityResult);
  assert.equal(score.publicationEligibility, 'INELIGIBLE');
  assert.equal(score.licensePending, true);
});

// ============================================================================
// 6. PIPELINE INTEGRATION & CANDIDATE DOSSIER PERSISTENCE TESTS
// ============================================================================

test('orchestrator: pipeline integrates open-web and community candidates cleanly', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-ow-test-'));

  try {
    const mockCandidate = {
      candidateId: 'ow-test-runner-pilot',
      name: 'Open Web Pilot Runner',
      originalRepoUrl: 'https://github.com/arcade-open-source/open-web-runner',
      discoveryUrl: 'https://runner.example.com',
      playableUrl: 'https://runner.example.com/play',
      isMirror: false,
      author: 'ArcadeOpenSource',
      description: 'Zero-build canvas arcade runner with audio synthesis.',
      discoveryDate: '2026-11-12',
      lastUpdateDate: '2026-02-01',
      sourcePlatform: 'open-web',
      programmingLanguage: 'JavaScript',
      gameEngine: 'HTML5 Canvas2D',
      popularityIndicators: {
        githubStars: 220,
        forks: 35,
        openIssues: 0,
        communityPlays: 45000,
      },
      audienceIndicators: {
        playerCount: 45000,
        communityPoints: 120,
        communityComments: 18,
        evidenceSources: ['https://runner.example.com'],
      },
      licenseName: 'MIT',
      licenseUrl: 'https://github.com/arcade-open-source/open-web-runner/blob/main/LICENSE',
      assetLicensingStatus: 'Original vector art',
      dependencies: [],
      html5Compatibility: true,
      mobileCompatibility: true,
      buildInstructions: 'Zero-build static vanilla HTML5',
      exactCommitHash: 'a1b2c3d4e5f6',
    };

    const res = await runDailyDiscoveryPipeline({
      rootDir: tempDir,
      offline: true,
      dryRun: false,
      candidates: [mockCandidate],
      maxCandidates: 1,
    });

    assert.equal(res.evaluatedCount, 1);
    assert.equal(res.retainedEligible, 1);

    // Verify written dossier contains new properties
    const dossierPath = path.join(tempDir, 'discovery/candidates/ow-test-runner-pilot.json');
    assert.equal(fs.existsSync(dossierPath), true);

    const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));
    assert.equal(dossier.discoveryUrl, 'https://runner.example.com');
    assert.equal(dossier.playableUrl, 'https://runner.example.com/play');
    assert.equal(dossier.isMirror, false);
    assert.equal(dossier.sourcePlatform, 'open-web');
    assert.equal(dossier.audienceIndicators.playerCount, 45000);
    assert.equal(dossier.audienceIndicators.communityPoints, 120);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 7. SCHEMA CONFORMANCE & SAFE IMPORT SLUG TESTS
// ============================================================================

test('schema: open-web and community candidates conform to candidate.schema.json', () => {
  const schemaPath = path.resolve('discovery/schemas/candidate.schema.json');
  assert.equal(fs.existsSync(schemaPath), true);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  // Ensure new enum entries exist in schema
  const allowedPlatforms = schema.properties.sourcePlatform.enum;
  assert.ok(allowedPlatforms.includes('open-web'));
  assert.ok(allowedPlatforms.includes('hackernews'));
  assert.ok(allowedPlatforms.includes('reddit'));

  // Ensure new properties are defined in schema
  assert.ok(schema.properties.discoveryUrl);
  assert.ok(schema.properties.playableUrl);
  assert.ok(schema.properties.isMirror);
  assert.ok(schema.properties.audienceIndicators);

  // Validate verified open web and community seeds have all required fields
  const allSeeds = [...VERIFIED_OPEN_WEB_GAMES, ...VERIFIED_COMMUNITY_SEEDS];
  for (const s of allSeeds) {
    for (const req of schema.required) {
      assert.ok(s[req] !== undefined && s[req] !== null, `Seed "${s.candidateId}" missing required field: ${req}`);
    }
    assert.ok(allowedPlatforms.includes(s.sourcePlatform), `Seed "${s.candidateId}" has invalid sourcePlatform: ${s.sourcePlatform}`);
  }
});

test('safe-import: derives clean slug for ow- and hn- candidate identifiers', () => {
  const rawId1 = 'ow-hextris-hextris';
  const slug1 = rawId1.replace(/^(gh-|gl-|cb-|itch-|ow-|hn-)/, '');
  assert.equal(slug1, 'hextris-hextris');

  const rawId2 = 'hn-chvin-react-tetris';
  const slug2 = rawId2.replace(/^(gh-|gl-|cb-|itch-|ow-|hn-)/, '');
  assert.equal(slug2, 'chvin-react-tetris');
});

test('resilience: discoverFromHackerNews handles HTTP 403, 500, and fetch exceptions gracefully', async () => {
  // Test HTTP 403
  const fetch403 = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    headers: new Map(),
    text: async () => 'Forbidden',
  });

  const res403 = await discoverFromHackerNews({
    fetch: fetch403,
    queries: ['test-403'],
    maxResults: 5,
  });
  assert.deepEqual(res403, []);

  // Test Network Exception
  const fetchErr = async () => {
    throw new Error('Connection reset by peer');
  };

  const resErr = await discoverFromHackerNews({
    fetch: fetchErr,
    queries: ['test-error'],
    maxResults: 5,
  });
  assert.deepEqual(resErr, []);
});

