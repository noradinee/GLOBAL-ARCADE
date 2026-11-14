import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  EVIDENCE_CLASSIFICATION,
  METRIC_TYPES,
  CLASSIFICATION_WEIGHTS,
  createMetricRecord,
  classifyAudienceEvidence,
  deepFreeze,
} from '../scripts/discovery/evidence-classifier.js';

import {
  COMMUNITY_PLATFORMS,
  PLATFORM_ACCESS_STATUS,
  getCommunityPlatformMatrix,
} from '../scripts/discovery/discover-community.js';

import { normalizeOpenWebCandidate } from '../scripts/discovery/discover-open-web.js';
import { scoreCandidate } from '../scripts/discovery/score-candidates.js';
import { verifyLicense } from '../scripts/discovery/verify-license.js';
import { inspectSecurity } from '../scripts/discovery/security-inspection.js';
import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

// ============================================================================
// 1. EVIDENCE CLASSIFICATION MODEL TESTS
// ============================================================================

test('evidence: supports all 5 standard classification tiers', () => {
  assert.equal(EVIDENCE_CLASSIFICATION.VERIFIED, 'VERIFIED');
  assert.equal(EVIDENCE_CLASSIFICATION.REPORTED, 'REPORTED');
  assert.equal(EVIDENCE_CLASSIFICATION.ESTIMATED, 'ESTIMATED');
  assert.equal(EVIDENCE_CLASSIFICATION.UNVERIFIED, 'UNVERIFIED');
  assert.equal(EVIDENCE_CLASSIFICATION.UNKNOWN, 'UNKNOWN');
});

test('evidence: creates structured metric record with all required provenance fields', () => {
  const metric = createMetricRecord({
    metricType: METRIC_TYPES.PLAYER_COUNT,
    originalValue: 2500000,
    unit: 'active_players',
    sourceUrl: 'https://hextris.io',
    sourcePublisher: 'Hextris Team',
    collectionDate: '2026-11-12',
    evidenceClassification: EVIDENCE_CLASSIFICATION.REPORTED,
    collectionMethod: 'developer_published_metrics',
    notesAndLimitations: 'Self-reported by original developers on landing page.',
    isSynthetic: false,
  });

  assert.equal(metric.metricType, 'playerCount');
  assert.equal(metric.originalValue, 2500000);
  assert.equal(metric.unit, 'active_players');
  assert.equal(metric.sourceUrl, 'https://hextris.io');
  assert.equal(metric.sourcePublisher, 'Hextris Team');
  assert.equal(metric.collectionDate, '2026-11-12');
  assert.equal(metric.evidenceClassification, 'REPORTED');
  assert.equal(metric.collectionMethod, 'developer_published_metrics');
  assert.equal(metric.isSynthetic, false);
});

test('evidence: throws on invalid metricType to prevent arbitrary unclassified data', () => {
  assert.throws(() => {
    createMetricRecord({
      metricType: 'arbitrary_fake_metric',
      originalValue: 100,
    });
  }, /Invalid metricType/);
});

test('evidence: separates distinct metric types without conversion', () => {
  const candidate = {
    candidateId: 'test-metric-separation',
    name: 'Metric Separation Game',
    originalRepoUrl: 'https://github.com/developer/game',
    sourcePlatform: 'github',
    popularityIndicators: {
      githubStars: 1500,
      forks: 300,
    },
    audienceIndicators: {
      playerCount: 75000,
      communityPoints: 420,
      communityComments: 85,
    },
  };

  const result = classifyAudienceEvidence(candidate);
  assert.ok(result.metrics.length >= 4);

  // Check that stars, points, and players are strictly separate metric types
  const starsMetric = result.metrics.find(m => m.metricType === METRIC_TYPES.REPOSITORY_STARS);
  const pointsMetric = result.metrics.find(m => m.metricType === METRIC_TYPES.COMMUNITY_POINTS);
  const playerMetric = result.metrics.find(m => m.metricType === METRIC_TYPES.PLAYER_COUNT);

  assert.ok(starsMetric);
  assert.equal(starsMetric.originalValue, 1500);
  assert.ok(starsMetric.notesAndLimitations.includes('not actual game players'));

  assert.ok(pointsMetric);
  assert.equal(pointsMetric.originalValue, 420);

  assert.ok(playerMetric);
  assert.equal(playerMetric.originalValue, 75000);
});

test('evidence: identifies synthetic seed data and reduces confidence score', () => {
  const realCandidate = {
    candidateId: 'real-verified-game',
    name: 'Verified Game',
    originalRepoUrl: 'https://github.com/real/game',
    sourcePlatform: 'hackernews',
    popularityIndicators: { githubStars: 500, forks: 100 },
    audienceIndicators: { communityPoints: 200, communityComments: 45 },
  };

  const syntheticCandidate = {
    candidateId: 'synthetic-seed-game',
    name: 'Synthetic Example Game',
    originalRepoUrl: 'https://github.com/example/game',
    isSyntheticSeed: true,
    popularityIndicators: { githubStars: 500, forks: 100 },
    audienceIndicators: {
      communityPoints: 200,
      communityComments: 45,
      notes: 'synthetic example seed data',
    },
  };

  const realAnalysis = classifyAudienceEvidence(realCandidate);
  const syntheticAnalysis = classifyAudienceEvidence(syntheticCandidate);

  // Real candidate must have significantly higher confidence than synthetic seed
  assert.ok(realAnalysis.evidenceConfidenceScore > syntheticAnalysis.evidenceConfidenceScore);
  assert.equal(syntheticAnalysis.metrics.every(m => m.isSynthetic === true), true);
});

// ============================================================================
// 2. PLATFORM ACCESS STATUS MATRIX TESTS
// ============================================================================

test('platform-matrix: uses required access status enum values', () => {
  const allowedStatuses = Object.values(PLATFORM_ACCESS_STATUS);
  const matrix = getCommunityPlatformMatrix();

  for (const p of matrix) {
    assert.ok(allowedStatuses.includes(p.accessStatus), `Platform "${p.id}" has invalid accessStatus: ${p.accessStatus}`);
    assert.ok(p.accessMethod, `Platform "${p.id}" missing accessMethod`);
    assert.ok(p.authRequirement, `Platform "${p.id}" missing authRequirement`);
    assert.ok(p.successfulRetrievalEvidence, `Platform "${p.id}" missing successfulRetrievalEvidence`);
    assert.ok(p.restrictions, `Platform "${p.id}" missing restrictions`);
    assert.ok(p.rateLimits, `Platform "${p.id}" missing rateLimits`);
    assert.ok(Array.isArray(p.implementationFiles), `Platform "${p.id}" missing implementationFiles array`);
    assert.ok(p.remainingWork, `Platform "${p.id}" missing remainingWork`);
  }
});

test('platform-matrix: Hacker News is marked REAL_RETRIEVAL_VERIFIED and Reddit RESTRICTED_AUTH_REQUIRED', () => {
  assert.equal(COMMUNITY_PLATFORMS.hackernews.accessStatus, 'REAL_RETRIEVAL_VERIFIED');
  assert.equal(COMMUNITY_PLATFORMS.reddit.accessStatus, 'RESTRICTED_AUTH_REQUIRED');
  assert.equal(COMMUNITY_PLATFORMS.facebook.accessStatus, 'UNAVAILABLE');
  assert.equal(COMMUNITY_PLATFORMS.instagram.accessStatus, 'UNAVAILABLE');
  assert.equal(COMMUNITY_PLATFORMS.telegram.accessStatus, 'DOCUMENTED_ACCESS_ONLY');
  assert.equal(COMMUNITY_PLATFORMS.itch_community.accessStatus, 'WORKING_ADAPTER');
});

// ============================================================================
// 3. MULTI-SOURCE DEDUPLICATION & PROVENANCE MERGING TESTS
// ============================================================================

test('deduplication: merges multiple discovery sources for the same game without losing provenance', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-dedup-test-'));

  try {
    // Source 1: Discovered via Hacker News
    const candidateFromHn = {
      candidateId: 'hn-hextris-puzzle',
      name: 'Hextris',
      originalRepoUrl: 'https://github.com/Hextris/hextris',
      discoveryUrl: 'https://news.ycombinator.com/item?id=8322699',
      playableUrl: 'https://hextris.io',
      sourcePlatform: 'hackernews',
      author: 'Hextris',
      discoverySources: [
        {
          sourcePlatform: 'hackernews',
          discoveryUrl: 'https://news.ycombinator.com/item?id=8322699',
          discoveryDate: '2026-11-12',
          discoveredBy: 'HN Algolia Crawler',
          contextNotes: 'Found in Show HN thread',
        },
      ],
      popularityIndicators: { githubStars: 2200, forks: 620, communityPlays: 2500000 },
      audienceIndicators: {
        communityPoints: 450,
        communityComments: 72,
        metrics: [
          createMetricRecord({
            metricType: METRIC_TYPES.COMMUNITY_POINTS,
            originalValue: 450,
            evidenceClassification: EVIDENCE_CLASSIFICATION.VERIFIED,
            sourceUrl: 'https://news.ycombinator.com/item?id=8322699',
          }),
        ],
      },
      licenseName: 'MIT',
      gameEngine: 'HTML5 Canvas2D',
      buildInstructions: 'Zero-build static vanilla HTML5',
      dependencies: [],
      html5Compatibility: true,
      mobileCompatibility: true,
      lastUpdateDate: '2026-01-01',
    };

    // Source 2: Discovered via Open Web showcase
    const candidateFromOpenWeb = {
      candidateId: 'ow-hextris-showcase',
      name: 'Hextris Web Game',
      originalRepoUrl: 'https://github.com/Hextris/hextris', // SAME REPOSITORY
      discoveryUrl: 'https://hextris.io',
      playableUrl: 'https://hextris.io',
      sourcePlatform: 'open-web',
      author: 'Hextris Team',
      discoverySources: [
        {
          sourcePlatform: 'open-web',
          discoveryUrl: 'https://hextris.io',
          discoveryDate: '2026-11-12',
          discoveredBy: 'Open Web Crawler',
          contextNotes: 'Found on official domain',
        },
      ],
      popularityIndicators: { githubStars: 2200, forks: 620, communityPlays: 2500000 },
      audienceIndicators: {
        playerCount: 2500000,
        metrics: [
          createMetricRecord({
            metricType: METRIC_TYPES.PLAYER_COUNT,
            originalValue: 2500000,
            evidenceClassification: EVIDENCE_CLASSIFICATION.REPORTED,
            sourceUrl: 'https://hextris.io',
          }),
        ],
      },
      licenseName: 'MIT',
      gameEngine: 'HTML5 Canvas2D',
      buildInstructions: 'Zero-build static vanilla HTML5',
      dependencies: [],
      html5Compatibility: true,
      mobileCompatibility: true,
      lastUpdateDate: '2026-01-01',
    };

    const res = await runDailyDiscoveryPipeline({
      rootDir: tempDir,
      offline: true,
      dryRun: false,
      candidates: [candidateFromHn, candidateFromOpenWeb],
      maxCandidates: 5,
    });

    // Exactly 1 unified candidate retained
    assert.equal(res.evaluatedCount, 1);
    assert.equal(res.retainedEligible, 1);

    // Inspect candidate dossier
    const dossierPath = path.join(tempDir, 'discovery/candidates/hn-hextris-puzzle.json');
    assert.equal(fs.existsSync(dossierPath), true);

    const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));

    // Provenance must contain BOTH discovery sources
    assert.equal(dossier.discoverySources.length, 2);
    assert.ok(dossier.discoverySources.some(s => s.sourcePlatform === 'hackernews'));
    assert.ok(dossier.discoverySources.some(s => s.sourcePlatform === 'open-web'));

    // Audience metrics must contain BOTH points and player count
    assert.ok(dossier.audienceIndicators.metrics.length >= 2);
    assert.ok(dossier.audienceIndicators.metrics.some(m => m.metricType === 'communityPoints'));
    assert.ok(dossier.audienceIndicators.metrics.some(m => m.metricType === 'playerCount'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 4. SCORING INTEGRATION & STRICT GATE SAFETY
// ============================================================================

test('scoring: evidence confidence modulates popularity score and is included in scoring breakdown', () => {
  const verifiedCandidate = {
    candidateId: 'verified-game',
    name: 'Verified Game',
    originalRepoUrl: 'https://github.com/test/verified',
    sourcePlatform: 'github',
    popularityIndicators: { githubStars: 600, forks: 80, communityPlays: 50000 },
    audienceIndicators: {
      metrics: [
        createMetricRecord({
          metricType: METRIC_TYPES.REPOSITORY_STARS,
          originalValue: 600,
          evidenceClassification: EVIDENCE_CLASSIFICATION.VERIFIED,
        }),
      ],
    },
    gameEngine: 'HTML5 Canvas2D',
    dependencies: [],
    mobileCompatibility: true,
    lastUpdateDate: '2026-01-01',
  };

  const licenseResult = verifyLicense({ licenseSpdx: 'MIT' });
  const securityResult = inspectSecurity({ 'index.html': '<html></html>' });

  const score = scoreCandidate(verifiedCandidate, licenseResult, securityResult);

  assert.ok(score.evidenceQuality);
  assert.equal(typeof score.evidenceQuality.confidenceScore, 'number');
  assert.ok(score.evidenceQuality.confidenceScore > 0);
  assert.equal(score.publicationEligibility, 'ELIGIBLE');
});

test('scoring: high evidence confidence NEVER bypasses licensing or security gate failures', () => {
  const candidateWithRestrictedLicense = {
    candidateId: 'restricted-verified-game',
    name: 'High Evidence But Proprietary Game',
    originalRepoUrl: 'https://github.com/test/proprietary',
    popularityIndicators: { githubStars: 10000, communityPlays: 10000000 },
    audienceIndicators: {
      metrics: [
        createMetricRecord({
          metricType: METRIC_TYPES.PLAYER_COUNT,
          originalValue: 10000000,
          evidenceClassification: EVIDENCE_CLASSIFICATION.VERIFIED,
        }),
      ],
    },
    gameEngine: 'HTML5 Canvas2D',
    dependencies: [],
    mobileCompatibility: true,
  };

  const licenseResult = verifyLicense({ licenseSpdx: 'GPL-3.0' }); // Copyleft / Restricted
  const securityResult = inspectSecurity({ 'index.html': '<html></html>' });

  const score = scoreCandidate(candidateWithRestrictedLicense, licenseResult, securityResult);

  // Even with 10M verified players, must be INELIGIBLE
  assert.equal(score.publicationEligibility, 'INELIGIBLE');
  assert.equal(score.licensePending, true);
});

// ============================================================================
// 5. SCHEMA CONFORMANCE FOR AMENDED CANDIDATES
// ============================================================================

test('schema: candidate dossiers with metrics and discoverySources conform to schema', () => {
  const schemaPath = path.resolve('discovery/schemas/candidate.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  assert.ok(schema.properties.discoverySources);
  assert.ok(schema.properties.audienceIndicators.properties.metrics);
  assert.ok(schema.properties.audienceIndicators.properties.evidenceConfidenceScore);
  assert.ok(schema.properties.audienceIndicators.properties.overallEvidenceQuality);

  const sampleCandidate = {
    candidateId: 'ow-sample-conforming-game',
    name: 'Sample Conforming Game',
    originalRepoUrl: 'https://github.com/sample/game',
    author: 'Sample Author',
    discoveryDate: '2026-11-12',
    licenseName: 'MIT',
    licensingStatus: 'VERIFIED_COMMERCIAL_USE',
    securityStatus: 'PASSED',
    publicationEligibility: 'ELIGIBLE',
    reviewerDecision: 'PENDING_REVIEW',
    sourcePlatform: 'open-web',
    discoveryUrl: 'https://sample.com',
    playableUrl: 'https://sample.com/play',
    isMirror: false,
    discoverySources: [
      {
        sourcePlatform: 'open-web',
        discoveryUrl: 'https://sample.com',
      },
    ],
    audienceIndicators: {
      playerCount: 15000,
      evidenceConfidenceScore: 85,
      overallEvidenceQuality: 'HIGH',
      metrics: [
        {
          metricType: 'playerCount',
          originalValue: 15000,
          evidenceClassification: 'REPORTED',
        },
      ],
    },
  };

  for (const req of schema.required) {
    assert.ok(sampleCandidate[req] !== undefined, `Missing required field: ${req}`);
  }
});

// ============================================================================
// 6. DEEP FREEZE & AUDIT INTEGRITY TESTS
// ============================================================================

test('deepFreeze: recursively freezes nested metric objects and prevents runtime mutation in strict mode', () => {
  const record = createMetricRecord({
    metricType: METRIC_TYPES.PLAYER_COUNT,
    originalValue: 10000,
    evidenceClassification: EVIDENCE_CLASSIFICATION.UNVERIFIED,
  });

  assert.equal(Object.isFrozen(record), true);

  // Attempting to mutate property throws in strict mode
  assert.throws(() => {
    // @ts-ignore
    record.originalValue = 99999;
  }, /Cannot assign to read only property/);

  assert.throws(() => {
    // @ts-ignore
    record.newProperty = 'malicious';
  }, /Cannot add property/);

  // classifyAudienceEvidence returns deep-frozen object and frozen metrics array
  const candidate = {
    originalRepoUrl: 'https://github.com/test/repo',
    popularityIndicators: { githubStars: 100 },
  };
  const classified = classifyAudienceEvidence(candidate);
  assert.equal(Object.isFrozen(classified), true);
  assert.equal(Object.isFrozen(classified.metrics), true);
  if (classified.metrics.length > 0) {
    assert.equal(Object.isFrozen(classified.metrics[0]), true);
  }
});

test('evidence: audits illustrative Hextris 2.5M seed and classifies playerCount as UNVERIFIED with isSynthetic: true while preserving raw value', () => {
  const hextrisSeed = {
    candidateId: 'ow-hextris-hextris',
    name: 'Hextris',
    originalRepoUrl: 'https://github.com/Hextris/hextris',
    isSyntheticSeed: true,
    popularityIndicators: {
      githubStars: 2200,
      forks: 620,
      communityPlays: 2500000,
      signalsSource: 'Official Game Domain (Illustrative Seed)',
    },
    audienceIndicators: {
      playerCount: 2500000,
      communityPoints: 450,
      evidenceSources: ['https://hextris.io', 'https://news.ycombinator.com/item?id=8322699'],
      notes: 'Illustrative seed candidate. 2,500,000 player count is an unverified illustrative estimate.',
    },
  };

  const result = classifyAudienceEvidence(hextrisSeed);
  const playerMetric = result.metrics.find(m => m.metricType === METRIC_TYPES.PLAYER_COUNT);

  assert.ok(playerMetric, 'playerCount metric must be present');
  // Raw value must be completely preserved
  assert.equal(playerMetric.originalValue, 2500000);
  // Must be marked as synthetic
  assert.equal(playerMetric.isSynthetic, true);
  // Unsupported claim must be downgraded to UNVERIFIED
  assert.equal(playerMetric.evidenceClassification, EVIDENCE_CLASSIFICATION.UNVERIFIED);
  assert.ok(playerMetric.notesAndLimitations.includes('Illustrative seed estimate'));
});

test('evidence: preserves original playerCount value and provenance while downgrading unsupported claims', () => {
  const unverifiedCandidate = {
    candidateId: 'test-unsupported-player-count',
    name: 'Game With Claimed Numbers',
    originalRepoUrl: 'https://github.com/developer/game',
    author: 'developer',
    popularityIndicators: {
      githubStars: 50,
    },
    audienceIndicators: {
      playerCount: 5000000, // Claimed 5M players without telemetry proof
      notes: 'Developer claims 5M players on Twitter bio',
    },
  };

  const result = classifyAudienceEvidence(unverifiedCandidate);
  const playerMetric = result.metrics.find(m => m.metricType === METRIC_TYPES.PLAYER_COUNT);

  assert.ok(playerMetric);
  // Value is preserved without deletion
  assert.equal(playerMetric.originalValue, 5000000);
  // Classification is downgraded to UNVERIFIED
  assert.equal(playerMetric.evidenceClassification, EVIDENCE_CLASSIFICATION.UNVERIFIED);
});

test('platform-matrix: Exa Search is classified as CONFIGURED_BUT_UNVERIFIED with exact diagnostic notes', () => {
  const exa = COMMUNITY_PLATFORMS.exa_search;
  assert.ok(exa, 'exa_search must be present in COMMUNITY_PLATFORMS');
  assert.equal(exa.accessStatus, 'CONFIGURED_BUT_UNVERIFIED');
  assert.equal(exa.status, 'CONFIGURED_BUT_UNVERIFIED');
  assert.ok(exa.successfulRetrievalEvidence.includes('web_fetch_exa'));
  assert.ok(exa.successfulRetrievalEvidence.includes('web_search_exa'));
});
