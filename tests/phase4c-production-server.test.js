import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

import { createProductionServer } from '../server/index.js';
import { JobQueue } from '../server/engine/job-queue.js';

function createTempDir(prefix = 'ga-server-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Helper to perform HTTP requests against test server
 */
function request(serverPort, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: serverPort,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          // not json
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(payload);
    }
    req.end();
  });
}

// ============================================================================
// 1. PRODUCTION SERVER LIFECYCLE & HEALTH CHECK
// ============================================================================

test('phase4c server: starts up, binds port, and responds to /api/health with operational status', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Scaffold minimum directory structure
  fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'src/data/games.json'), JSON.stringify([{ id: 'test-game', slug: 'test-game', status: 'active' }]));

  const { server, engine } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'test-password-123',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  const res = await request(port, { path: '/api/health' });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json);
  assert.equal(res.json.status, 'healthy');
  assert.equal(res.json.version, '1.0.0');
  assert.ok(typeof res.json.uptimeSeconds === 'number');
  assert.ok(res.json.engine);
  assert.ok(res.json.storage);
  assert.equal(res.json.storage.gamesInCatalog, 1);
  assert.ok(res.json.system);
  assert.ok(res.json.system.memoryUsageMb >= 0);
});

// ============================================================================
// 2. ADMIN AUTHENTICATION, LOCKOUT & SESSION MANAGEMENT
// ============================================================================

test('phase4c server: admin authentication flow, brute-force lockout, and session validation', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const adminPassword = 'super-secret-admin-pass';
  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword,
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  // 1. Unauthenticated session check returns false
  const unauthRes = await request(port, { path: '/api/auth/session' });
  assert.equal(unauthRes.statusCode, 200);
  assert.equal(unauthRes.json.authenticated, false);

  // 2. Failed login attempt
  const badLoginRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: 'wrong-password' },
  });
  assert.equal(badLoginRes.statusCode, 401);
  assert.equal(badLoginRes.json.success, false);

  // 3. Brute-force lockout test (5 attempts total)
  for (let i = 0; i < 4; i++) {
    await request(port, {
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'wrong-password' },
    });
  }
  const lockedRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: adminPassword }, // Even right password is locked out
  });
  assert.equal(lockedRes.statusCode, 401);
  assert.ok(lockedRes.json.error.includes('Too many failed login attempts'));

  // Reset rate limit for next test phase
  authManager.loginAttempts.clear();

  // 4. Successful login
  const goodLoginRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: adminPassword },
  });
  assert.equal(goodLoginRes.statusCode, 200);
  assert.equal(goodLoginRes.json.success, true);
  assert.ok(goodLoginRes.json.token);
  assert.equal(goodLoginRes.json.role, 'administrator');
  assert.ok(goodLoginRes.headers['set-cookie']);

  const token = goodLoginRes.json.token;

  // 5. Authenticated session check with Bearer token
  const authRes = await request(port, {
    path: '/api/auth/session',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert.equal(authRes.statusCode, 200);
  assert.equal(authRes.json.authenticated, true);
  assert.equal(authRes.json.role, 'administrator');

  // 6. Logout
  const logoutRes = await request(port, {
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Admin-Action': '1',
    },
  });
  assert.equal(logoutRes.statusCode, 200);
  assert.equal(logoutRes.json.success, true);

  // 7. Verify token is now invalid
  const revokedRes = await request(port, {
    path: '/api/auth/session',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert.equal(revokedRes.statusCode, 200);
  assert.equal(revokedRes.json.authenticated, false);
});

// ============================================================================
// 3. CSRF MITIGATION & RESTRICTED ACTION DEFENSE
// ============================================================================

test('phase4c server: enforces X-Admin-Action header on mutating administrative requests', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const adminPassword = 'test-csrf-pass';
  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword,
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  // Login to get valid token
  const loginRes = await authManager.login(adminPassword, '127.0.0.1');
  const token = loginRes.token;

  // Attempt mutating request WITHOUT X-Admin-Action header -> 403 Forbidden
  const noCsrfRes = await request(port, {
    path: '/api/automation/pause',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  assert.equal(noCsrfRes.statusCode, 403);
  assert.ok(noCsrfRes.json.error.includes('Forbidden'));
  assert.ok(noCsrfRes.json.message.includes('X-Admin-Action'));

  // Attempt mutating request WITH X-Admin-Action header -> 200 OK
  const withCsrfRes = await request(port, {
    path: '/api/automation/pause',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Admin-Action': '1',
      'Content-Type': 'application/json',
    },
  });
  assert.equal(withCsrfRes.statusCode, 200);
  assert.equal(withCsrfRes.json.status, 'PAUSED');
});

// ============================================================================
// 4. CONTINUOUS AUTOMATION ENGINE CONTROLS
// ============================================================================

test('phase4c server: engine controls (pause, resume, config update)', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'admin',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  const { token } = await authManager.login('admin', '127.0.0.1');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'X-Admin-Action': '1',
    'Content-Type': 'application/json',
  };

  // 1. Get status
  const statusRes = await request(port, {
    path: '/api/automation/status',
    headers: authHeaders,
  });
  assert.equal(statusRes.statusCode, 200);
  assert.ok(statusRes.json.config);
  assert.ok(statusRes.json.pipelineSummary);

  // 2. Pause
  const pauseRes = await request(port, {
    path: '/api/automation/pause',
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(pauseRes.statusCode, 200);
  assert.equal(pauseRes.json.status, 'PAUSED');

  // 3. Resume
  const resumeRes = await request(port, {
    path: '/api/automation/resume',
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(resumeRes.statusCode, 200);
  assert.equal(resumeRes.json.status, 'RUNNING');

  // 4. Update configuration
  const configUpdateRes = await request(port, {
    path: '/api/automation/config',
    method: 'POST',
    headers: authHeaders,
    body: {
      workerConcurrency: 5,
      pollIntervalSec: 15,
      autonomousRepair: false,
    },
  });
  assert.equal(configUpdateRes.statusCode, 200);
  assert.equal(configUpdateRes.json.config.workerConcurrency, 5);
  assert.equal(configUpdateRes.json.config.pollIntervalSec, 15);
  assert.equal(configUpdateRes.json.config.autonomousRepair, false);

  // Verify persistence to disk
  const persistedConfig = JSON.parse(fs.readFileSync(path.join(tempDir, 'data/engine-config.json'), 'utf-8'));
  assert.equal(persistedConfig.workerConcurrency, 5);
  assert.equal(persistedConfig.autonomousRepair, false);
});

// ============================================================================
// 5. JOB QUEUE PERSISTENCE, CRASH RECOVERY, CANCEL & RETRY
// ============================================================================

test('phase4c server: job queue operations, crash recovery of interrupted jobs, cancel and retry', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'admin',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  const { token } = await authManager.login('admin', '127.0.0.1');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'X-Admin-Action': '1',
    'Content-Type': 'application/json',
  };

  // 1. Enqueue candidate job
  const enqueueResult = engine.jobQueue.enqueue({
    id: 'test-job-candidate-1',
    name: 'Candidate One',
    sourcePlatform: 'github',
    originalRepoUrl: 'https://github.com/example/game-one',
  }, { priority: 10 });

  assert.equal(enqueueResult.enqueued, true);
  const job = enqueueResult.job;
  assert.ok(job);
  assert.equal(job.status, 'QUEUED');

  // 2. Fetch jobs list via API
  const jobsRes = await request(port, {
    path: '/api/jobs',
    headers: authHeaders,
  });
  assert.equal(jobsRes.statusCode, 200);
  assert.ok(jobsRes.json.jobs.length >= 1);
  assert.equal(jobsRes.json.jobs[0].candidateId, 'test-job-candidate-1');

  // 3. Pipeline summary monitor endpoint
  const monitorRes = await request(port, {
    path: '/api/jobs/monitor',
    headers: authHeaders,
  });
  assert.equal(monitorRes.statusCode, 200);
  assert.equal(monitorRes.json.byStatus.QUEUED, 1);

  // 4. Cancel job
  const cancelRes = await request(port, {
    path: `/api/jobs/${job.id}/cancel`,
    method: 'POST',
    headers: authHeaders,
    body: { reason: 'Test cancellation' },
  });
  assert.equal(cancelRes.statusCode, 200);
  assert.equal(cancelRes.json.job.status, 'CANCELLED');

  // 5. Retry job
  const retryRes = await request(port, {
    path: `/api/jobs/${job.id}/retry`,
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(retryRes.statusCode, 200);
  assert.equal(retryRes.json.job.status, 'QUEUED');

  // 6. Test crash recovery: Simulate a worker crash by marking job RUNNING and restarting JobQueue
  job.status = 'RUNNING';
  job.startedAt = new Date().toISOString();
  engine.jobQueue.saveJobs(true);
  await new Promise(r => setTimeout(r, 50));

  // Fresh JobQueue instance pointing to same file
  const recoveredQueue = new JobQueue({
    rootDir: tempDir,
    storagePath: path.join(tempDir, 'data/jobs.json'),
  });

  const recoveredJob = recoveredQueue.getJob(job.id);
  // It should be safely recovered back to QUEUED for retry (1 prior retry + 1 crash recovery = 2)
  assert.equal(recoveredJob.status, 'QUEUED');
  assert.equal(recoveredJob.retryCount, 2);
  assert.ok(recoveredJob.logs.some(l => l.message.includes('Auto-recovering interrupted job')));
});

// ============================================================================
// 6. GAME CATALOG MANAGEMENT & DOSSIER PRESERVATION
// ============================================================================

test('phase4c server: game catalog status toggle preserves game files and historical dossiers', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Create game and dossier
  fs.mkdirSync(path.join(tempDir, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'public/games/hextris'), { recursive: true });

  const initialGame = {
    id: 'hextris',
    slug: 'hextris',
    title: 'Hextris',
    status: 'active',
  };
  fs.writeFileSync(path.join(tempDir, 'src/data/games.json'), JSON.stringify([initialGame], null, 2));

  const candidateDossier = {
    candidateId: 'hextris',
    name: 'Hextris',
    lifecycleStatus: 'PUBLISHED',
  };
  fs.writeFileSync(path.join(tempDir, 'discovery/candidates/hextris.json'), JSON.stringify(candidateDossier, null, 2));
  fs.writeFileSync(path.join(tempDir, 'public/games/hextris/index.html'), '<html><body>Hextris</body></html>');

  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'admin',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  const { token } = await authManager.login('admin', '127.0.0.1');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'X-Admin-Action': '1',
    'Content-Type': 'application/json',
  };

  // 1. GET games list
  const listRes = await request(port, {
    path: '/api/admin/games',
    headers: authHeaders,
  });
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json.games.length, 1);
  assert.equal(listRes.json.games[0].status, 'active');

  // 2. Toggle status to disabled
  const disableRes = await request(port, {
    path: '/api/admin/games/hextris/status',
    method: 'POST',
    headers: authHeaders,
    body: { status: 'disabled' },
  });
  assert.equal(disableRes.statusCode, 200);
  assert.equal(disableRes.json.game.status, 'disabled');

  // Verify persistence in games.json
  const updatedCatalog = JSON.parse(fs.readFileSync(path.join(tempDir, 'src/data/games.json'), 'utf-8'));
  assert.equal(updatedCatalog[0].status, 'disabled');

  // Verify dossier and game files remain 100% intact
  assert.ok(fs.existsSync(path.join(tempDir, 'discovery/candidates/hextris.json')));
  assert.ok(fs.existsSync(path.join(tempDir, 'public/games/hextris/index.html')));

  // 3. Toggle back to active
  const enableRes = await request(port, {
    path: '/api/admin/games/hextris/status',
    method: 'POST',
    headers: authHeaders,
    body: { status: 'active' },
  });
  assert.equal(enableRes.statusCode, 200);
  assert.equal(enableRes.json.game.status, 'active');
});

// ============================================================================
// 7. OPERATIONAL ANALYTICS & AUDIT TRAIL
// ============================================================================

test('phase4c server: derived operational analytics and durable audit trail', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Create sample dossiers and rejection records
  fs.mkdirSync(path.join(tempDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'discovery/rejected'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'discovery/patches'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/data'), { recursive: true });

  fs.writeFileSync(path.join(tempDir, 'discovery/candidates/cand1.json'), JSON.stringify({
    candidateId: 'cand1',
    lifecycleStatus: 'AUTO_APPROVED',
    sourcePlatform: 'github',
  }));
  fs.writeFileSync(path.join(tempDir, 'discovery/candidates/cand2.json'), JSON.stringify({
    candidateId: 'cand2',
    lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    sourcePlatform: 'gitlab',
    repairs: [{ patchId: 'p1' }],
  }));
  fs.writeFileSync(path.join(tempDir, 'discovery/rejected/rej1.json'), JSON.stringify({
    candidateId: 'rej1',
    lifecycleStatus: 'REJECTED',
  }));
  fs.writeFileSync(path.join(tempDir, 'src/data/games.json'), JSON.stringify([{ id: 'g1', status: 'active' }]));

  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'admin',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  const { token } = await authManager.login('admin', '127.0.0.1');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'X-Admin-Action': '1',
  };

  // 1. Test analytics
  const analyticsRes = await request(port, {
    path: '/api/admin/analytics',
    headers: authHeaders,
  });
  assert.equal(analyticsRes.statusCode, 200);
  assert.equal(analyticsRes.json.volume.authoritativeDossiers, 2);
  assert.equal(analyticsRes.json.volume.rejected, 1);
  assert.equal(analyticsRes.json.volume.autoApproved, 1);
  assert.equal(analyticsRes.json.volume.awaitingOwnerReview, 1);
  assert.equal(analyticsRes.json.rates.autoApprovalRatePercent, 50);
  assert.equal(analyticsRes.json.sourceBreakdown.github, 1);
  assert.equal(analyticsRes.json.sourceBreakdown.gitlab, 1);
  assert.equal(analyticsRes.json.estimatedCosts.apiCostsUsd, 0.00);

  // 2. Test audit logs stream
  const auditRes = await request(port, {
    path: '/api/admin/audit-logs',
    headers: authHeaders,
  });
  assert.equal(auditRes.statusCode, 200);
  assert.ok(auditRes.json.logs.length >= 1);
  assert.ok(auditRes.json.logs.some(l => l.action === 'LOGIN_SUCCESS'));
});

// ============================================================================
// 8. STATIC & SANDBOX SECURITY ISOLATION HEADERS
// ============================================================================

test('phase4c server: sandbox security isolation headers and path traversal prevention', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  fs.mkdirSync(path.join(tempDir, 'public/games/test-sandbox'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'public/games/test-sandbox/index.html'), '<!DOCTYPE html><html><body>Sandbox Game</body></html>');
  fs.writeFileSync(path.join(tempDir, 'secret.txt'), 'SUPER_SECRET_HOST_CONTENT');

  const { server, engine } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'admin',
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  // 1. Game sandbox request receives security headers
  const gameRes = await request(port, { path: '/games/test-sandbox/index.html' });
  assert.equal(gameRes.statusCode, 200);
  assert.equal(gameRes.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(gameRes.headers['x-content-type-options'], 'nosniff');
  assert.ok(gameRes.data.includes('Sandbox Game'));

  // 2. Directory traversal attempt is blocked and does not leak files
  const traversalRes = await request(port, { path: '/games/../../secret.txt' });
  assert.notEqual(traversalRes.statusCode, 200);
  assert.ok(!traversalRes.data.includes('SUPER_SECRET_HOST_CONTENT'));
});
