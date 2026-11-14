import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { argon2id } from 'hash-wasm';

import { createProductionServer } from '../server/index.js';

function createTempDir(prefix = 'ga-auth-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

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

test('ADMIN AUTH SUITE: Argon2id hashing, secure cookies, brute-force lockout, and universal endpoint protection', async (t) => {
  const tempDir = createTempDir();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Scaffold minimum directory structure
  fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'src/data/games.json'), JSON.stringify([{ id: 'test-game', slug: 'test-game', status: 'active' }]));
  fs.writeFileSync(path.join(tempDir, 'discovery/index.json'), JSON.stringify({ candidates: [], totalCandidates: 0 }));

  const adminUsername = 'kyraxo_owner';
  const adminPassword = 'super-secret-secure-password-2026!';

  // Pre-generate Argon2id hash to test direct hash ingestion
  const adminPasswordHash = await argon2id({
    password: adminPassword,
    salt: new Uint8Array(16),
    iterations: 3,
    memorySize: 32768,
    parallelism: 2,
    hashLength: 32,
    outputType: 'encoded',
  });

  const { server, engine, authManager } = createProductionServer({
    rootDir: tempDir,
    adminUsername,
    adminPasswordHash,
    autoDiscover: false,
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise(resolve => server.close(resolve));
  });

  // ========================================================================
  // TEST 1: Unauthenticated requests to ALL protected endpoints return 401
  // ========================================================================
  const protectedEndpoints = [
    { path: '/api/automation/status', method: 'GET' },
    { path: '/api/jobs', method: 'GET' },
    { path: '/api/admin/games', method: 'GET' },
    { path: '/api/admin/analytics', method: 'GET' },
    { path: '/api/admin/audit-logs', method: 'GET' },
    { path: '/api/inbox/manifest', method: 'GET' },
    { path: '/api/inbox/candidates', method: 'GET' },
  ];

  for (const ep of protectedEndpoints) {
    const res = await request(port, { path: ep.path, method: ep.method });
    assert.equal(
      res.statusCode,
      401,
      `Endpoint ${ep.method} ${ep.path} must return 401 Unauthorized without credentials (got ${res.statusCode})`
    );
    assert.ok(res.json?.error, `Endpoint ${ep.path} must return JSON error object`);
    assert.equal(res.json?.requiresLogin, true);
  }

  // ========================================================================
  // TEST 2: Invalid Login Credentials (Wrong Username & Wrong Password)
  // ========================================================================
  // Wrong username
  const badUserRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'intruder', password: adminPassword },
  });
  assert.equal(badUserRes.statusCode, 401);
  assert.equal(badUserRes.json?.success, false);
  assert.equal(badUserRes.json?.error, 'Invalid administrator credentials.');

  // Wrong password
  const badPassRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: adminUsername, password: 'wrong-guess-password' },
  });
  assert.equal(badPassRes.statusCode, 401);
  assert.equal(badPassRes.json?.success, false);
  assert.equal(badPassRes.json?.error, 'Invalid administrator credentials.');

  // ========================================================================
  // TEST 3: Rate Limiting & Brute-Force Lockout (5 attempts threshold)
  // ========================================================================
  // Already made 2 failed attempts above, do 3 more failed attempts
  for (let i = 0; i < 3; i++) {
    await request(port, {
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: adminUsername, password: `wrong-${i}` },
    });
  }

  // 6th attempt with CORRECT credentials must be locked out!
  const lockedRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: adminUsername, password: adminPassword },
  });
  assert.equal(lockedRes.statusCode, 401);
  assert.equal(lockedRes.json?.success, false);
  assert.equal(lockedRes.json?.locked, true);
  assert.ok(lockedRes.json?.error.includes('Too many failed login attempts'));

  // Reset rate limiter for remaining tests
  authManager.loginAttempts.clear();

  // ========================================================================
  // TEST 4: Successful Login, Argon2id Verification, and Cookie Flags
  // ========================================================================
  const goodLoginRes = await request(port, {
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: adminUsername, password: adminPassword },
  });
  assert.equal(goodLoginRes.statusCode, 200);
  assert.equal(goodLoginRes.json?.success, true);
  assert.equal(goodLoginRes.json?.user, adminUsername);
  assert.equal(goodLoginRes.json?.role, 'administrator');
  assert.ok(goodLoginRes.json?.token, 'Login must issue a secure session token');

  const setCookie = goodLoginRes.headers['set-cookie'];
  assert.ok(setCookie, 'Login must set ga_admin_session cookie');
  const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  assert.ok(cookieStr.includes('ga_admin_session='), 'Cookie must be named ga_admin_session');
  assert.ok(cookieStr.includes('HttpOnly'), 'Cookie must have HttpOnly attribute');
  assert.ok(cookieStr.includes('SameSite=Lax'), 'Cookie must have SameSite=Lax attribute');
  assert.ok(cookieStr.includes('Path=/'), 'Cookie must have Path=/ attribute');

  const sessionToken = goodLoginRes.json.token;
  const cookieHeader = `ga_admin_session=${sessionToken}`;

  // ========================================================================
  // TEST 5: Authenticated Session Validation via Cookie & Bearer
  // ========================================================================
  // Check via cookie
  const cookieSessionRes = await request(port, {
    path: '/api/auth/session',
    headers: { 'Cookie': cookieHeader },
  });
  assert.equal(cookieSessionRes.statusCode, 200);
  assert.equal(cookieSessionRes.json?.authenticated, true);
  assert.equal(cookieSessionRes.json?.user, adminUsername);

  // Check via Bearer header
  const bearerSessionRes = await request(port, {
    path: '/api/auth/session',
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  });
  assert.equal(bearerSessionRes.statusCode, 200);
  assert.equal(bearerSessionRes.json?.authenticated, true);

  // ========================================================================
  // TEST 6: Accessing Protected Endpoints With Valid Session Cookie
  // ========================================================================
  for (const ep of protectedEndpoints) {
    const res = await request(port, {
      path: ep.path,
      method: ep.method,
      headers: { 'Cookie': cookieHeader },
    });
    assert.equal(
      res.statusCode,
      200,
      `Endpoint ${ep.method} ${ep.path} must return 200 OK with valid session cookie (got ${res.statusCode})`
    );
  }

  // ========================================================================
  // TEST 7: CSRF Defense on Mutating Administrative Requests
  // ========================================================================
  // Mutating request without CSRF header -> 403 Forbidden
  const noCsrfRes = await request(port, {
    path: '/api/automation/pause',
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json',
    },
  });
  assert.equal(noCsrfRes.statusCode, 403);
  assert.equal(noCsrfRes.json?.error, 'Forbidden');
  assert.ok(noCsrfRes.json?.message.includes('CSRF'));

  // Mutating request with X-Admin-Action: 1 -> 200 OK
  const withCsrf1Res = await request(port, {
    path: '/api/automation/pause',
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'X-Admin-Action': '1',
      'Content-Type': 'application/json',
    },
  });
  assert.equal(withCsrf1Res.statusCode, 200);
  assert.equal(withCsrf1Res.json?.status, 'PAUSED');

  // Mutating request with X-GA-CSRF-Protection: 1 -> 200 OK
  const withCsrf2Res = await request(port, {
    path: '/api/automation/resume',
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'X-GA-CSRF-Protection': '1',
      'Content-Type': 'application/json',
    },
  });
  assert.equal(withCsrf2Res.statusCode, 200);
  assert.equal(withCsrf2Res.json?.status, 'RUNNING');

  // ========================================================================
  // TEST 8: Secure Logout & Session Invalidation
  // ========================================================================
  const logoutRes = await request(port, {
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'X-Admin-Action': '1',
    },
  });
  assert.equal(logoutRes.statusCode, 200);
  assert.equal(logoutRes.json?.success, true);

  const clearCookie = logoutRes.headers['set-cookie'];
  assert.ok(clearCookie, 'Logout must send clearing Set-Cookie');
  const clearCookieStr = Array.isArray(clearCookie) ? clearCookie.join('; ') : clearCookie;
  assert.ok(clearCookieStr.includes('Max-Age=0'), 'Clear cookie must have Max-Age=0');

  // Verify session is now destroyed: checking session returns false
  const postLogoutSessionRes = await request(port, {
    path: '/api/auth/session',
    headers: { 'Cookie': cookieHeader },
  });
  assert.equal(postLogoutSessionRes.statusCode, 200);
  assert.equal(postLogoutSessionRes.json?.authenticated, false);

  // Verify protected endpoints return 401 again with the invalidated cookie
  const postLogoutEndpointRes = await request(port, {
    path: '/api/automation/status',
    headers: { 'Cookie': cookieHeader },
  });
  assert.equal(postLogoutEndpointRes.statusCode, 401);

  // ========================================================================
  // TEST 9: Audit Logs Integrity (No plaintext secrets or hashes leaked)
  // ========================================================================
  const auditLogs = authManager.getAuditLogs({ limit: 50 });
  assert.ok(auditLogs.length > 0, 'Audit logs must record authentication events');

  const actions = auditLogs.map(l => l.action);
  assert.ok(actions.includes('LOGIN_FAILED'), 'Must record LOGIN_FAILED');
  assert.ok(actions.includes('LOGIN_BLOCKED_RATE_LIMIT'), 'Must record LOGIN_BLOCKED_RATE_LIMIT');
  assert.ok(actions.includes('LOGIN_SUCCESS'), 'Must record LOGIN_SUCCESS');
  assert.ok(actions.includes('LOGOUT'), 'Must record LOGOUT');

  // Ensure no password, secret, or hash is present in audit logs
  const auditLogRaw = JSON.stringify(auditLogs);
  assert.ok(!auditLogRaw.includes(adminPassword), 'Audit logs must NEVER contain plaintext passwords');
  assert.ok(!auditLogRaw.includes(adminPasswordHash), 'Audit logs must NEVER contain password hashes');
});
