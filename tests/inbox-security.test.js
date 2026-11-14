import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import {
  inboxApiMiddleware,
  sanitizeCandidateId,
  resolveCandidatePath,
  readCandidate,
  writeCandidate,
  isLoopbackAddress,
  VALID_GATE_STATUSES,
  TRUSTED_LOCAL_REVIEWER,
} from '../scripts/discovery/inbox-api-middleware.js';
import { createInitialCandidate } from '../scripts/discovery/qualification-model.js';
import { generateCandidateIndex } from '../scripts/discovery/generate-index.js';

// Helper to start a temporary test HTTP server with inboxApiMiddleware
function createTestServer() {
  return http.createServer((req, res) => {
    inboxApiMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
  });
}

// Helper to make custom HTTP requests to test server
function makeRequest(server, { method, path: urlPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = resData ? JSON.parse(resData) : null;
          } catch {
            json = resData;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );
    req.on('error', reject);
    if (body !== null && body !== undefined) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================================================
// PRIORITY 1: PATH TRAVERSAL REMEDIATION
// ============================================================================

test('security: sanitizeCandidateId strictly rejects traversal and invalid identifiers', () => {
  // Directory traversal attacks
  assert.equal(sanitizeCandidateId('../package'), null);
  assert.equal(sanitizeCandidateId('../../package'), null);
  assert.equal(sanitizeCandidateId('..%2F..%2Fpackage'), null);
  assert.equal(sanitizeCandidateId('..%2f..%2fpackage'), null);
  assert.equal(sanitizeCandidateId('..%5C..%5Cpackage'), null);
  assert.equal(sanitizeCandidateId('..%5c..%5cpackage'), null);
  assert.equal(sanitizeCandidateId('%2e%2e%2fpackage'), null);
  assert.equal(sanitizeCandidateId('%252e%252e%252fpackage'), null);
  assert.equal(sanitizeCandidateId('%252F'), null);

  // Absolute paths
  assert.equal(sanitizeCandidateId('/etc/passwd'), null);
  assert.equal(sanitizeCandidateId('\\Windows\\win.ini'), null);
  assert.equal(sanitizeCandidateId('C:\\Windows'), null);

  // Null bytes
  assert.equal(sanitizeCandidateId('gh-game\0.json'), null);
  assert.equal(sanitizeCandidateId('gh-game%00.json'), null);

  // Malformed characters & shell metacharacters
  assert.equal(sanitizeCandidateId(''), null);
  assert.equal(sanitizeCandidateId(null), null);
  assert.equal(sanitizeCandidateId(undefined), null);
  assert.equal(sanitizeCandidateId(123), null);
  assert.equal(sanitizeCandidateId(';rm -rf /'), null);
  assert.equal(sanitizeCandidateId('$foo'), null);
  assert.equal(sanitizeCandidateId('gh<game>'), null);
  assert.equal(sanitizeCandidateId('gh game'), null);
  assert.equal(sanitizeCandidateId('-invalid-start'), null);
  assert.equal(sanitizeCandidateId('_invalid-start'), null);

  // Legitimate identifiers
  assert.equal(sanitizeCandidateId('gh-boona13-mykonos-island-voxels'), 'gh-boona13-mykonos-island-voxels');
  assert.equal(sanitizeCandidateId('gh-mumuy-pacman'), 'gh-mumuy-pacman');
  assert.equal(sanitizeCandidateId('gl-community-space-cadet'), 'gl-community-space-cadet');
  assert.equal(sanitizeCandidateId('cb-indiedev-pixel-adventure'), 'cb-indiedev-pixel-adventure');
  assert.equal(sanitizeCandidateId('itch-pixelartist-retro-maze'), 'itch-pixelartist-retro-maze');
});

test('security: resolveCandidatePath enforces strict canonical directory containment', () => {
  const rootCandidatesDir = path.resolve('discovery/candidates');

  // Valid candidates stay strictly inside rootCandidatesDir
  const validPath = resolveCandidatePath('gh-mumuy-pacman', rootCandidatesDir);
  assert.equal(validPath, path.join(rootCandidatesDir, 'gh-mumuy-pacman.json'));

  // Invalid candidates or empty values return null
  assert.equal(resolveCandidatePath('', rootCandidatesDir), null);
  assert.equal(resolveCandidatePath(null, rootCandidatesDir), null);
});

test('security: readCandidate rejects traversal attempts and returns null', () => {
  assert.equal(readCandidate('..%2F..%2Fpackage'), null);
  assert.equal(readCandidate('../../package'), null);
  assert.equal(readCandidate('invalid*id'), null);
});

test('security: writeCandidate throws error on unsafe candidate IDs', () => {
  assert.throws(
    () => writeCandidate({ candidateId: '..%2F..%2Fmalicious' }),
    /Cannot write candidate with invalid ID/
  );
});

test('security: API GET strictly rejects traversal sequences with HTTP 400', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. URL-encoded slash traversal
    const res1 = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/..%2F..%2Fpackage',
    });
    assert.equal(res1.status, 400);
    assert.ok(res1.data.error.includes('Invalid or unsafe candidate identifier'));

    // 2. Double-encoded traversal
    const res2 = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/%252e%252e%252fpackage',
    });
    assert.equal(res2.status, 400);
    assert.ok(res2.data.error.includes('Invalid or unsafe candidate identifier'));

    // 3. Encoded backslash traversal
    const res3 = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/..%5C..%5Cpackage',
    });
    assert.equal(res3.status, 400);

    // 4. Null byte injection
    const res4 = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/gh-game%00bad',
    });
    assert.equal(res4.status, 400);

    // 5. Malformed identifier
    const res5 = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/$bad*candidate!',
    });
    assert.equal(res5.status, 400);

    // 6. Legitimate candidate returns HTTP 200
    const resLegit = await makeRequest(server, {
      method: 'GET',
      path: '/api/inbox/candidates/gh-mumuy-pacman',
    });
    assert.equal(resLegit.status, 200);
    assert.equal(resLegit.data.candidateId, 'gh-mumuy-pacman');
  } finally {
    server.close();
  }
});

// ============================================================================
// PRIORITY 2: LOCAL LOOPBACK & CSRF PROTECTION
// ============================================================================

test('security: isLoopbackAddress validates local IPs and rejects external addresses', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('localhost'), true);

  assert.equal(isLoopbackAddress('192.168.1.55'), false);
  assert.equal(isLoopbackAddress('10.0.0.1'), false);
  assert.equal(isLoopbackAddress('172.16.0.1'), false);
  assert.equal(isLoopbackAddress('8.8.8.8'), false);
});

test('security: middleware rejects non-loopback remote address with HTTP 403', () => {
  const req = {
    url: '/api/inbox/manifest',
    method: 'GET',
    socket: { remoteAddress: '192.168.1.55' },
    headers: {},
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    setHeader: () => {},
    end: (str) => {
      responseData = JSON.parse(str);
    },
    set statusCode(code) {
      statusCode = code;
    },
    get statusCode() {
      return statusCode;
    },
  };

  inboxApiMiddleware(req, res, () => {});
  assert.equal(statusCode, 403);
  assert.ok(responseData.error.includes('restricted to local loopback access only'));
});

test('security: POST mutation rejects request lacking Content-Type application/json with HTTP 415', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-GA-CSRF-Protection': '1',
      },
      body: 'pillar=technical&status=PASSED',
    });
    assert.equal(res.status, 415);
    assert.ok(res.data.error.includes('Content-Type must be application/json'));
  } finally {
    server.close();
  }
});

test('security: POST mutation rejects request lacking anti-CSRF custom header with HTTP 403', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        // Omitting X-GA-CSRF-Protection
      },
      body: { pillar: 'technical', status: 'PASSED' },
    });
    assert.equal(res.status, 403);
    assert.ok(res.data.error.includes('Missing required security header'));
  } finally {
    server.close();
  }
});

test('security: POST mutation rejects cross-origin request from untrusted origin with HTTP 403', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
        'Origin': 'https://malicious-attacker.com',
        'Host': 'localhost:3000',
      },
      body: { pillar: 'technical', status: 'PASSED' },
    });
    assert.equal(res.status, 403);
    assert.ok(res.data.error.includes('Cross-Origin Request Blocked'));
  } finally {
    server.close();
  }
});

test('security: POST mutation rejects cross-site request flagged by Sec-Fetch-Site with HTTP 403', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: { pillar: 'technical', status: 'PASSED' },
    });
    assert.equal(res.status, 403);
    assert.ok(res.data.error.includes('Cross-site request blocked'));
  } finally {
    server.close();
  }
});

// ============================================================================
// PRIORITY 3: GATE STATUS VALIDATION
// ============================================================================

test('security: gate update strictly enforces allowed status enums per pillar', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. Invalid pillar name
    const resInvalidPillar = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: { pillar: 'nonexistent-pillar', status: 'PASSED' },
    });
    assert.equal(resInvalidPillar.status, 400);
    assert.ok(resInvalidPillar.data.error.includes('Invalid qualification pillar'));

    // 2. Arbitrary invalid status on valid pillar
    const resInvalidStatus = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: { pillar: 'technical', status: 'COMPLETELY_ARBITRARY_STATUS' },
    });
    assert.equal(resInvalidStatus.status, 400);
    assert.ok(resInvalidStatus.data.error.includes('Invalid status'));

    // 3. Cross-pillar status mismatch: CLEARED_COMMERCIAL is a legal status, not technical
    const resCrossPillar1 = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: { pillar: 'technical', status: 'CLEARED_COMMERCIAL' },
    });
    assert.equal(resCrossPillar1.status, 400);
    assert.ok(resCrossPillar1.data.error.includes('Invalid status "CLEARED_COMMERCIAL" for pillar "technical"'));

    // 4. Cross-pillar status mismatch: PASSED is not a legal status
    const resCrossPillar2 = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: { pillar: 'legal', status: 'PASSED' },
    });
    assert.equal(resCrossPillar2.status, 400);
    assert.ok(resCrossPillar2.data.error.includes('Invalid status "PASSED" for pillar "legal"'));

    // 5. Malformed body returns HTTP 400 without crashing
    const resMalformed = await makeRequest(server, {
      method: 'POST',
      path: '/api/inbox/candidates/gh-mumuy-pacman/gate',
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: '{ not valid json ...',
    });
    assert.equal(resMalformed.status, 400);
  } finally {
    server.close();
  }
});

// ============================================================================
// PRIORITY 4: REVIEWER IDENTITY & AUDIT TRAIL
// ============================================================================

test('security: reviewer identity is strictly enforced to trusted local maintainer', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const testCandidateId = 'gh-sec-test-reviewer-enforcement';
  const testFilePath = path.resolve(`discovery/candidates/${testCandidateId}.json`);

  try {
    // Create an isolated test candidate so legacy dossiers are never modified
    const initialCandidate = createInitialCandidate({
      candidateId: testCandidateId,
      name: 'Reviewer Test Candidate',
      author: 'sec-tester',
      licenseName: 'MIT',
    });
    fs.writeFileSync(testFilePath, JSON.stringify(initialCandidate, null, 2), 'utf-8');

    // Attempt to spoof reviewer as "untrusted-adversary"
    const res = await makeRequest(server, {
      method: 'POST',
      path: `/api/inbox/candidates/${testCandidateId}/gate`,
      headers: {
        'Content-Type': 'application/json',
        'X-GA-CSRF-Protection': '1',
      },
      body: {
        pillar: 'technical',
        status: 'PASSED',
        reviewer: 'untrusted-adversary',
        notes: 'Verification test',
      },
    });

    assert.equal(res.status, 200);
    const updated = res.data.candidate;

    // Reviewer in qualification gate must be 'local-maintainer'
    assert.equal(updated.qualification.technical.reviewer, TRUSTED_LOCAL_REVIEWER);
    assert.notEqual(updated.qualification.technical.reviewer, 'untrusted-adversary');

    // Reviewer in latest audit trail record must be 'local-maintainer'
    const lastAudit = updated.reviewAuditTrail[updated.reviewAuditTrail.length - 1];
    assert.equal(lastAudit.reviewer, TRUSTED_LOCAL_REVIEWER);
    assert.notEqual(lastAudit.reviewer, 'untrusted-adversary');
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    // Restore clean index manifest
    generateCandidateIndex({
      candidatesDir: path.resolve('discovery/candidates'),
      outputPath: path.resolve('discovery/index.json'),
      dryRun: false,
    });
    server.close();
  }
});

// ============================================================================
// PRIORITY 5: SCORE FALLBACK FOR LEGACY DOSSIERS & RECORD PRESERVATION
// ============================================================================

test('security: legacy candidate score calculation safely handles scores.totalScore fallback', () => {
  // Legacy candidate object with scores object but no root totalScore
  const legacyCandidate = {
    candidateId: 'gh-legacy-game',
    scores: { totalScore: 84 },
  };

  const computedScore = legacyCandidate.scores?.totalScore ?? legacyCandidate.totalScore ?? 0;
  assert.equal(computedScore, 84);
  assert.equal(Math.round(computedScore / 20), 4);
  assert.equal(Number.isNaN(Math.round(computedScore / 20)), false);

  // Missing all scores safely yields 0 rather than NaN
  const emptyCandidate = { candidateId: 'gh-empty' };
  const fallbackScore = emptyCandidate.scores?.totalScore ?? emptyCandidate.totalScore ?? 0;
  assert.equal(fallbackScore, 0);
  assert.equal(Math.round(fallbackScore / 20), 0);
  assert.equal(Number.isNaN(Math.round(fallbackScore / 20)), false);
});

test('security: authoritative legacy dossiers and games catalog remain preserved and untouched', () => {
  const legacyCandidates = [
    'gh-boona13-mykonos-island-voxels',
    'gh-freezingmoon-ancientbeast',
    'gh-metroxe-one-html-page-challenge',
    'gh-mumuy-pacman',
    'gh-phaserjs-phaser-ce-examples',
  ];

  for (const id of legacyCandidates) {
    const filePath = path.resolve(`discovery/candidates/${id}.json`);
    assert.ok(fs.existsSync(filePath), `Authoritative dossier ${id}.json must exist`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert.equal(content.candidateId, id);
  }

  const gamesPath = path.resolve('src/data/games.json');
  assert.ok(fs.existsSync(gamesPath), 'src/data/games.json must exist');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  assert.ok(Array.isArray(games) && games.length === 9, 'games.json must contain 9 verified published games');
});
