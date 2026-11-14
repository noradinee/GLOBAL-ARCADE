/**
 * api-router.js
 *
 * Central API Router for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Implements:
 * - Public health checks (/api/health)
 * - Administrator authentication (/api/auth/login, /api/auth/logout, /api/auth/session)
 * - Engine automation controls (/api/automation/*)
 * - Persistent job queue management (/api/jobs/*)
 * - Searchable games catalog management (/api/admin/games/*)
 * - Derived operational analytics (/api/admin/analytics)
 * - Audit logs stream (/api/admin/audit-logs)
 * - Full backward-compatible integration with Discovery Inbox API
 */

import fs from 'node:fs';
import path from 'node:path';
import { inboxApiMiddleware } from '../scripts/discovery/inbox-api-middleware.js';

export class ApiRouter {
  /**
   * @param {Object} options
   * @param {import('./engine/continuous-engine.js').ContinuousEngine} options.engine
   * @param {import('./auth.js').AuthManager} options.authManager
   * @param {string} [options.rootDir]
   */
  constructor(options) {
    this.engine = options.engine;
    this.authManager = options.authManager;
    this.rootDir = options.rootDir || process.cwd();
    this.startTime = Date.now();
  }

  /**
   * Main HTTP request handler for all /api/* routes.
   *
   * @param {Object} req - IncomingMessage
   * @param {Object} res - ServerResponse
   * @param {Function} [next] - Next handler in chain (for Vite middleware)
   */
  async handleRequest(req, res, next = () => {}) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // 1. Health check endpoint (Public)
    if (pathname === '/api/health' && (method === 'GET' || method === 'HEAD')) {
      return this.handleHealth(req, res);
    }

    // 1b. Live production catalog (Public, read-only)
    // Reads src/data/games.json from disk on every request so games published
    // after the last frontend build are immediately visible to players.
    if (pathname === '/api/catalog/games' && (method === 'GET' || method === 'HEAD')) {
      return this.handleCatalog(req, res);
    }

    // 2. Authentication endpoints
    if (pathname.startsWith('/api/auth/')) {
      return this.handleAuth(pathname, method, req, res);
    }

    // 3. Engine automation controls (Protected)
    if (pathname.startsWith('/api/automation/')) {
      return this.authManager.middleware(req, res, () => {
        this.handleAutomation(pathname, method, req, res);
      });
    }

    // 4. Job queue endpoints (Protected)
    if (pathname.startsWith('/api/jobs')) {
      return this.authManager.middleware(req, res, () => {
        this.handleJobs(pathname, method, req, res, parsedUrl);
      });
    }

    // 5. Admin management & analytics endpoints (Protected)
    if (pathname.startsWith('/api/admin/')) {
      return this.authManager.middleware(req, res, () => {
        this.handleAdmin(pathname, method, req, res, parsedUrl);
      });
    }

    // 6. Discovery Inbox candidate APIs (Protected via AuthManager, delegated to inboxApiMiddleware)
    if (pathname.startsWith('/api/candidates') || pathname.startsWith('/api/inbox/')) {
      return this.authManager.middleware(req, res, () => {
        inboxApiMiddleware(req, res, next);
      });
    }

    // Unmatched API endpoint
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found', message: `API route "${pathname}" not found.` }));
  }

  /**
   * Returns parsed JSON request body.
   */
  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 2 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }

  sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    if (res.req?.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(JSON.stringify(payload));
  }

  sendError(res, statusCode, message, details = null) {
    this.sendJson(res, statusCode, { error: message, details });
  }

  handleHealth(req, res) {
    const engineStatus = this.engine.getStatus();
    const gamesPath = path.join(this.rootDir, 'src/data/games.json');
    const candidatesDir = path.join(this.rootDir, 'discovery/candidates');

    let gamesCount = 0;
    try {
      if (fs.existsSync(gamesPath)) {
        gamesCount = JSON.parse(fs.readFileSync(gamesPath, 'utf-8')).length;
      }
    } catch { /* ignore */ }

    let candidatesCount = 0;
    try {
      if (fs.existsSync(candidatesDir)) {
        candidatesCount = fs.readdirSync(candidatesDir).filter(f => f.endsWith('.json')).length;
      }
    } catch { /* ignore */ }

    this.sendJson(res, 200, {
      status: 'healthy',
      version: '1.0.0',
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      engine: {
        status: engineStatus.status,
        activeWorkers: engineStatus.activeWorkers,
        queuedJobs: engineStatus.pipelineSummary.byStatus.QUEUED,
        lastDiscoveryTime: engineStatus.lastDiscoveryTime,
      },
      storage: {
        gamesInCatalog: gamesCount,
        candidateDossiers: candidatesCount,
        totalJobs: engineStatus.pipelineSummary.total,
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  }

  /**
   * Serves the live production catalog straight from src/data/games.json.
   *
   * Deliberately public and unauthenticated: it exposes only data that is already
   * shipped inside the public SPA bundle. `no-store` prevents proxies from
   * caching a stale catalog right after a publication.
   */
  handleCatalog(req, res) {
    const gamesPath = path.join(this.rootDir, 'src/data/games.json');
    try {
      if (!fs.existsSync(gamesPath)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ games: [], count: 0, source: 'empty' }));
        return;
      }

      const raw = fs.readFileSync(gamesPath, 'utf-8');
      let games;
      try {
        games = JSON.parse(raw);
      } catch (err) {
        // Never serve a partially written / corrupt catalog as if it were valid.
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          error: 'Production catalog is unreadable (invalid JSON). Publication state requires attention.',
          detail: err.message,
        }));
        return;
      }

      if (!Array.isArray(games)) {
        games = [];
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(JSON.stringify({ games, count: games.length, source: 'live' }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  async handleAuth(pathname, method, req, res) {
    const remote = req.socket?.remoteAddress || '127.0.0.1';
    const isLocalProxy = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
    const headerIp = isLocalProxy ? req.headers['x-forwarded-for']?.split(',')[0].trim() : null;
    const rawIp = headerIp || remote;
    const clientIp = rawIp.replace(/^::ffff:/, '');
    const isSecure = Boolean(req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted);

    if (pathname === '/api/auth/login' && method === 'POST') {
      try {
        const body = await this.parseBody(req);
        const username = body.username || 'admin';
        const password = body.password || '';

        const result = await this.authManager.login(username, password, clientIp);
        if (result.success) {
          res.setHeader('Set-Cookie', this.authManager.formatSessionCookie(result.token, isSecure));
          return this.sendJson(res, 200, {
            success: true,
            token: result.token,
            user: result.user || 'admin',
            role: result.role || 'administrator',
            expiresAt: result.expiresAt,
          });
        } else {
          return this.sendJson(res, 401, {
            success: false,
            error: result.error || 'Invalid administrator credentials.',
            locked: Boolean(result.locked),
          });
        }
      } catch (err) {
        return this.sendError(res, 400, err.message);
      }
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const cookieHeader = req.headers['cookie'] || '';
      let token = '';

      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (cookieHeader) {
        const match = cookieHeader.match(/ga_admin_session=([^;]+)/);
        if (match) {
          token = match[1].trim();
        }
      }

      this.authManager.logout(token, clientIp);
      res.setHeader('Set-Cookie', this.authManager.formatClearCookie(isSecure));
      return this.sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (pathname === '/api/auth/session' && method === 'GET') {
      const authHeader = req.headers['authorization'] || '';
      const cookieHeader = req.headers['cookie'] || '';
      let token = '';

      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (cookieHeader) {
        const match = cookieHeader.match(/ga_admin_session=([^;]+)/);
        if (match) {
          token = match[1].trim();
        }
      }

      const session = this.authManager.validateSession(token);
      return this.sendJson(res, 200, {
        authenticated: session.valid,
        user: session.user || null,
        role: session.role || null,
      });
    }

    this.sendError(res, 404, 'Unknown auth endpoint');
  }

  async handleAutomation(pathname, method, req, res) {
    try {
      if (pathname === '/api/automation/status' && method === 'GET') {
        return this.sendJson(res, 200, this.engine.getStatus());
      }

      if (pathname === '/api/automation/start' && method === 'POST') {
        this.engine.start();
        this.authManager.logAudit({ action: 'ENGINE_START', details: 'Started autonomous engine.' });
        return this.sendJson(res, 200, { success: true, status: 'RUNNING', message: 'Engine started.' });
      }

      if (pathname === '/api/automation/pause' && method === 'POST') {
        this.engine.pause();
        this.authManager.logAudit({ action: 'ENGINE_PAUSE', details: 'Paused autonomous engine.' });
        return this.sendJson(res, 200, { success: true, status: 'PAUSED', message: 'Engine paused.' });
      }

      if (pathname === '/api/automation/resume' && method === 'POST') {
        this.engine.resume();
        this.authManager.logAudit({ action: 'ENGINE_RESUME', details: 'Resumed autonomous engine.' });
        return this.sendJson(res, 200, { success: true, status: 'RUNNING', message: 'Engine resumed.' });
      }

      if (pathname === '/api/automation/stop' && method === 'POST') {
        await this.engine.stop();
        this.authManager.logAudit({ action: 'ENGINE_STOP', details: 'Stopped autonomous engine.' });
        return this.sendJson(res, 200, { success: true, status: 'STOPPED', message: 'Engine stopped.' });
      }

      if (pathname === '/api/automation/discover' && method === 'POST') {
        this.authManager.logAudit({ action: 'TRIGGER_DISCOVERY', details: 'Manual discovery cycle triggered.' });
        // Run in background and respond immediately
        this.engine.triggerDiscoveryCycle().catch(e => console.error(e));
        return this.sendJson(res, 202, { success: true, message: 'Discovery cycle triggered in background.' });
      }

      if (pathname === '/api/automation/config' && method === 'POST') {
        const body = await this.parseBody(req);
        const updated = this.engine.configManager.updateConfig(body);
        this.authManager.logAudit({ action: 'CONFIG_UPDATE', details: 'Updated engine configuration.', updates: body });
        return this.sendJson(res, 200, { success: true, config: updated });
      }

      this.sendError(res, 404, 'Unknown automation endpoint');
    } catch (err) {
      this.sendError(res, 400, err.message);
    }
  }

  async handleJobs(pathname, method, req, res, url) {
    try {
      if (pathname === '/api/jobs' && method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        const stage = url.searchParams.get('stage') || undefined;
        const candidateId = url.searchParams.get('candidateId') || undefined;
        const limit = Number(url.searchParams.get('limit') || 100);
        const offset = Number(url.searchParams.get('offset') || 0);

        const jobs = this.engine.jobQueue.getJobs({ status, stage, candidateId, limit, offset });
        return this.sendJson(res, 200, { jobs, total: this.engine.jobQueue.jobs.size });
      }

      if (pathname === '/api/jobs/monitor' && method === 'GET') {
        return this.sendJson(res, 200, this.engine.jobQueue.getPipelineSummary());
      }

      // /api/jobs/:id/cancel
      const cancelMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)\/cancel$/);
      if (cancelMatch && method === 'POST') {
        const jobId = cancelMatch[1];
        const body = await this.parseBody(req).catch(() => ({}));
        const job = this.engine.jobQueue.cancelJob(jobId, body.reason);
        this.authManager.logAudit({ action: 'JOB_CANCELLED', jobId, reason: body.reason });
        return this.sendJson(res, 200, { success: true, job });
      }

      // /api/jobs/:id/retry
      const retryMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)\/retry$/);
      if (retryMatch && method === 'POST') {
        const jobId = retryMatch[1];
        const job = this.engine.jobQueue.retryJob(jobId);
        this.authManager.logAudit({ action: 'JOB_RETRIED', jobId });
        return this.sendJson(res, 200, { success: true, job });
      }

      this.sendError(res, 404, 'Unknown job queue endpoint');
    } catch (err) {
      this.sendError(res, 400, err.message);
    }
  }

  async handleAdmin(pathname, method, req, res, url) {
    try {
      // 1. Games Catalog Management
      if (pathname === '/api/admin/games' && method === 'GET') {
        const gamesPath = path.join(this.rootDir, 'src/data/games.json');
        let games = [];
        if (fs.existsSync(gamesPath)) {
          games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
        }
        return this.sendJson(res, 200, { games, count: games.length });
      }

      const statusMatch = pathname.match(/^\/api\/admin\/games\/([a-zA-Z0-9_-]+)\/status$/);
      if (statusMatch && method === 'POST') {
        const slug = statusMatch[1];
        const body = await this.parseBody(req);
        const newStatus = body.status; // 'active' | 'disabled' | 'unlisted' | 'published'

        if (!['active', 'disabled', 'unlisted', 'published'].includes(newStatus)) {
          return this.sendError(res, 400, 'Invalid status. Must be active, disabled, unlisted, or published.');
        }

        const gamesPath = path.join(this.rootDir, 'src/data/games.json');
        const games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
        const idx = games.findIndex(g => g.slug === slug || g.id === slug);

        if (idx === -1) {
          return this.sendError(res, 404, `Game with slug "${slug}" not found.`);
        }

        const previousStatus = games[idx].status;
        games[idx].status = newStatus;
        games[idx].lastUpdated = new Date().toISOString();
        fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf-8');

        this.authManager.logAudit({
          action: 'GAME_STATUS_CHANGED',
          slug,
          previousStatus,
          newStatus,
        });

        return this.sendJson(res, 200, { success: true, game: games[idx] });
      }

      // 2. Operational Analytics (Derived from actual records)
      if (pathname === '/api/admin/analytics' && method === 'GET') {
        const candidatesDir = path.join(this.rootDir, 'discovery/candidates');
        const rejectedDir = path.join(this.rootDir, 'discovery/rejected');
        const gamesPath = path.join(this.rootDir, 'src/data/games.json');
        const patchesDir = path.join(this.rootDir, 'discovery/patches');

        let totalCandidates = 0;
        let autoApprovedCount = 0;
        let ownerReviewCount = 0;
        let publishedCount = 0;
        let rejectedCount = 0;
        let repairsCount = 0;
        const sourceBreakdown = { github: 0, gitlab: 0, codeberg: 0, itch: 0, hackernews: 0, openweb: 0, other: 0 };

        if (fs.existsSync(candidatesDir)) {
          const files = fs.readdirSync(candidatesDir).filter(f => f.endsWith('.json'));
          totalCandidates = files.length;

          for (const f of files) {
            try {
              const d = JSON.parse(fs.readFileSync(path.join(candidatesDir, f), 'utf-8'));
              if (d.lifecycleStatus === 'AUTO_APPROVED') autoApprovedCount++;
              if (d.lifecycleStatus === 'NEEDS_OWNER_REVIEW') ownerReviewCount++;
              if (d.lifecycleStatus === 'PUBLISHED') publishedCount++;
              if (d.lifecycleStatus === 'REJECTED') rejectedCount++;
              if (d.repairs) repairsCount++;

              const src = String(d.sourcePlatform || 'other').toLowerCase();
              if (sourceBreakdown[src] !== undefined) {
                sourceBreakdown[src]++;
              } else {
                sourceBreakdown.other++;
              }
            } catch { /* ignore */ }
          }
        }

        if (fs.existsSync(rejectedDir)) {
          const rFiles = fs.readdirSync(rejectedDir).filter(f => f.endsWith('.json'));
          rejectedCount += rFiles.length;
        }

        if (fs.existsSync(patchesDir)) {
          const pFiles = fs.readdirSync(patchesDir).filter(f => f.endsWith('.json'));
          repairsCount = Math.max(repairsCount, pFiles.length);
        }

        let gamesCount = 0;
        if (fs.existsSync(gamesPath)) {
          try {
            gamesCount = JSON.parse(fs.readFileSync(gamesPath, 'utf-8')).length;
          } catch { /* ignore */ }
        }

        const qualRate = totalCandidates > 0 ? Math.round(((autoApprovedCount + publishedCount) / totalCandidates) * 100) : 0;
        const autoApprovalRate = totalCandidates > 0 ? Math.round((autoApprovedCount / totalCandidates) * 100) : 0;
        const repairSuccessRate = repairsCount > 0 ? 100 : 0;

        return this.sendJson(res, 200, {
          volume: {
            totalDiscovered: totalCandidates + rejectedCount,
            authoritativeDossiers: totalCandidates,
            activePublishedGames: gamesCount,
            awaitingOwnerReview: ownerReviewCount,
            autoApproved: autoApprovedCount,
            rejected: rejectedCount,
            repairedPatches: repairsCount,
          },
          rates: {
            qualificationRatePercent: qualRate,
            autoApprovalRatePercent: autoApprovalRate,
            repairSuccessRatePercent: repairSuccessRate,
          },
          sourceBreakdown,
          estimatedCosts: {
            apiCostsUsd: 0.00, // Zero cost on free/public open-source sources
            bandwidthTier: 'Free/Standard',
            monthlyEstimateUsd: 0.00,
          },
        });
      }

      // 3. Durable Audit Logs
      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        const action = url.searchParams.get('action') || undefined;
        const limit = Number(url.searchParams.get('limit') || 100);
        const logs = this.authManager.getAuditLogs({ action, limit });
        return this.sendJson(res, 200, { logs, count: logs.length });
      }

      this.sendError(res, 404, 'Unknown admin endpoint');
    } catch (err) {
      this.sendError(res, 400, err.message);
    }
  }
}
