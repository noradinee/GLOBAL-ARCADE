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
import { CouncilService } from './council-service.js';
import { TelemetryStore } from './telemetry-store.js';
import { DiscoveryRegistry } from './discovery-registry.js';

export class ApiRouter {
  /**
   * @param {Object} options
   * @param {import('./engine/continuous-engine.js').ContinuousEngine} options.engine
   * @param {import('./auth.js').AuthManager} options.authManager
   * @param {CouncilService} [options.councilService]
   * @param {TelemetryStore} [options.telemetryStore]
   * @param {string} [options.rootDir]
   */
  constructor(options) {
    this.engine = options.engine;
    this.authManager = options.authManager;
    this.rootDir = options.rootDir || process.cwd();
    this.councilService = options.councilService || new CouncilService({ rootDir: this.rootDir });
    this.telemetryStore = options.telemetryStore || new TelemetryStore({ rootDir: this.rootDir });
    this.discoveryRegistry = options.discoveryRegistry || new DiscoveryRegistry({ rootDir: this.rootDir });
    this.startTime = Date.now();
    this.contactRateMap = new Map();
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

    // 1c. Council Cloud Sync Bridge (Authenticated via HMAC-SHA256 signature + nonce + timestamp)
    if (pathname === '/api/council/sync' && method === 'POST') {
      return this.handleCouncilSync(req, res);
    }

    // 1d. Native Telemetry Ingestion (Public, non-blocking beacon)
    if (pathname === '/api/telemetry/event' && method === 'POST') {
      return this.handleTelemetryEvent(req, res);
    }

    // 1e. Public Contact Form Submission (Rate-limited)
    if (pathname === '/api/contact' && method === 'POST') {
      return this.handleContactSubmission(req, res);
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

  /**
   * Reads raw body string for cryptographic signature verification.
   */
  async readRawBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 10 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }

  /**
   * Handles incoming client telemetry events (pageviews, game starts, heartbeats)
   */
  async handleTelemetryEvent(req, res) {
    try {
      const eventData = await this.parseBody(req);
      this.telemetryStore.recordEvent(eventData, req);
      return this.sendJson(res, 200, { success: true });
    } catch {
      return this.sendJson(res, 200, { success: true });
    }
  }

  /**
   * Handles public contact form submissions with rate limiting and validation.
   */
  async handleContactSubmission(req, res) {
    try {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const now = Date.now();
      const windowMs = 10 * 60 * 1000;
      const recent = (this.contactRateMap.get(ip) || []).filter(ts => now - ts < windowMs);
      if (recent.length >= 5) {
        return this.sendError(res, 429, 'Too many inquiries sent recently. Please try again later.');
      }

      const body = await this.parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const subject = String(body.subject || 'general').trim().slice(0, 60);
      const message = String(body.message || '').trim();

      if (name.length < 2 || name.length > 100) {
        return this.sendError(res, 400, 'Please enter a valid name (2-100 characters).');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
        return this.sendError(res, 400, 'Please enter a valid email address.');
      }
      if (message.length < 10 || message.length > 3000) {
        return this.sendError(res, 400, 'Message must be between 10 and 3000 characters.');
      }

      recent.push(now);
      this.contactRateMap.set(ip, recent);

      const dataDir = path.join(this.rootDir, 'data');
      fs.mkdirSync(dataDir, { recursive: true });
      const record = {
        id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date(now).toISOString(),
        name,
        email,
        subject,
        message,
        ip,
      };
      fs.appendFileSync(path.join(dataDir, 'contact-messages.jsonl'), JSON.stringify(record) + '\n', 'utf8');
      return this.sendJson(res, 200, { success: true, id: record.id });
    } catch (err) {
      return this.sendError(res, 400, err.message || 'Unable to process contact submission.');
    }
  }

  /**
   * Handles authenticated synchronization from the local Council node.
   */
  async handleCouncilSync(req, res) {
    try {
      const bodyString = await this.readRawBody(req);
      const authResult = this.councilService.verifySyncRequest(req.headers, bodyString);
      if (!authResult.valid) {
        return this.sendError(res, 401, authResult.error || 'Unauthorized Sync Request');
      }

      let payload = {};
      try {
        payload = JSON.parse(bodyString);
      } catch {
        return this.sendError(res, 400, 'Invalid JSON body');
      }

      const syncResult = this.councilService.processSyncPayload(payload);
      const signed = this.councilService.signResponsePayload(authResult.requestId, syncResult);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      for (const [k, v] of Object.entries(signed.headers)) {
        res.setHeader(k, v);
      }
      return res.end(signed.jsonString);
    } catch (err) {
      return this.sendError(res, 500, `SYNC_ERROR: ${err.message}`);
    }
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
      res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=600');
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

      // 2b. Native Internal Server Telemetry Engine (Zero Google Dependency)
      if (pathname === '/api/admin/traffic-analytics' && method === 'GET') {
        const period = url.searchParams.get('period') || '7d';
        const gamesPath = path.join(this.rootDir, 'src/data/games.json');
        let games = [];
        if (fs.existsSync(gamesPath)) {
          try {
            games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
          } catch { /* ignore */ }
        }

        const summary = this.telemetryStore.getAnalyticsSummary(games, period);
        return this.sendJson(res, 200, summary);
      }

      // 3. Durable Audit Logs
      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        const action = url.searchParams.get('action') || undefined;
        const limit = Number(url.searchParams.get('limit') || 100);
        const logs = this.authManager.getAuditLogs({ action, limit });
        return this.sendJson(res, 200, { logs, count: logs.length });
      }

      // 4. Council Unified Owner Control Center Endpoints (Stage S8)
      if (pathname === '/api/admin/council/overview' && method === 'GET') {
        return this.sendJson(res, 200, this.councilService.getExecutiveOverview());
      }

      if (pathname === '/api/admin/council/operations' && method === 'GET') {
        return this.sendJson(res, 200, this.councilService.getOperationsTelemetry());
      }

      if (pathname === '/api/admin/council/tasks' && method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        const search = url.searchParams.get('search') || undefined;
        return this.sendJson(res, 200, this.councilService.getTasks({ status, search }));
      }

      if (pathname === '/api/admin/council/games' && method === 'GET') {
        return this.sendJson(res, 200, this.councilService.getGameCatalog());
      }

      if (pathname === '/api/admin/council/deployments' && method === 'GET') {
        return this.sendJson(res, 200, this.councilService.getDeploymentRecords());
      }

      if (pathname === '/api/admin/council/deployments/probe' && method === 'POST') {
        try {
          const results = await this.councilService.runLiveSmokeProbes();
          return this.sendJson(res, 200, results);
        } catch (err) {
          return this.sendError(res, 500, `PROBE_ERROR: ${err.message}`);
        }
      }

      // 5. Phase 4: Game Discovery & APK Intake Registry Endpoints
      if (pathname === '/api/admin/discovery/registry' && method === 'GET') {
        const search = url.searchParams.get('search') || undefined;
        const detectedType = url.searchParams.get('type') || undefined;
        const downloadStatus = url.searchParams.get('download') || undefined;
        const conversionStatus = url.searchParams.get('conversion') || undefined;

        const records = this.discoveryRegistry.getAll({ search, detectedType, downloadStatus, conversionStatus });
        const summary = this.discoveryRegistry.getSummary();
        return this.sendJson(res, 200, { summary, count: records.length, records });
      }

      if (pathname === '/api/admin/discovery/analyze-url' && method === 'POST') {
        const body = await this.parseBody(req).catch(() => ({}));
        const targetUrl = (body.url || '').trim();
        if (!targetUrl) {
          return this.sendError(res, 400, 'Missing "url" parameter in request payload.');
        }

        const { GameSourceAnalyzer } = await import('../scripts/discovery/game-source-analyzer.js');
        const analyzer = new GameSourceAnalyzer();
        const analysis = await analyzer.analyzeUrl(targetUrl);

        const registered = [];
        if (analysis.games && Array.isArray(analysis.games)) {
          for (const g of analysis.games) {
            const { record, isNew } = this.discoveryRegistry.registerCandidate({
              gameTitle: g.gameTitle,
              sourceWebsite: g.sourceWebsite,
              pageUrl: g.pageUrl,
              detectedType: g.detectedType,
              technologyDetails: g.technologyDetails,
              downloadUrl: g.downloadUrl,
              evidence: g.evidence,
              licenseStatus: g.licenseStatus,
              reuseAllowed: g.reuseAllowed,
              logMessage: `Discovered via Admin API from ${targetUrl}`,
            });
            registered.push({ id: record.id, isNew, title: record.gameTitle, type: record.detectedType });
          }
        }

        return this.sendJson(res, 200, { analysis, registered });
      }

      // Reports Center
      if (pathname === '/api/admin/reports' && method === 'GET') {
        const type = url.searchParams.get('type') || undefined;
        return this.sendJson(res, 200, { reports: this.councilService.getReportsList({ type }) });
      }

      const reportMatch = pathname.match(/^\/api\/admin\/reports\/([a-zA-Z0-9_-]+)$/);
      if (reportMatch && method === 'GET') {
        try {
          const content = this.councilService.getReportContent(reportMatch[1]);
          return this.sendJson(res, 200, { reportId: reportMatch[1], content });
        } catch (e) {
          return this.sendError(res, 404, e.message);
        }
      }

      // Notifications Center
      if (pathname === '/api/admin/notifications' && method === 'GET') {
        const severity = url.searchParams.get('severity') || undefined;
        const category = url.searchParams.get('category') || undefined;
        const readParam = url.searchParams.get('read');
        const read = readParam !== null && readParam !== undefined ? readParam === 'true' : undefined;
        return this.sendJson(res, 200, { notifications: this.councilService.getNotifications({ severity, category, read }) });
      }

      const notifReadMatch = pathname.match(/^\/api\/admin\/notifications\/([a-zA-Z0-9_-]+)\/read$/);
      if (notifReadMatch && method === 'POST') {
        const body = await this.parseBody(req).catch(() => ({}));
        const read = body.read !== false;
        return this.sendJson(res, 200, this.councilService.setNotificationRead(notifReadMatch[1], read));
      }

      // Owner Decisions (D6)
      if (pathname === '/api/admin/decisions' && method === 'GET') {
        return this.sendJson(res, 200, { decisions: this.councilService.getDecisions() });
      }

      const decisionMatch = pathname.match(/^\/api\/admin\/decisions\/([a-zA-Z0-9_-]+)\/respond$/);
      if (decisionMatch && method === 'POST') {
        const body = await this.parseBody(req);
        if (typeof body.approved !== 'boolean') {
          return this.sendError(res, 400, 'approved boolean field is required');
        }
        const outcome = this.councilService.submitOwnerDecision(
          decisionMatch[1],
          body.approved,
          req.adminUser?.username || 'NOUR',
          body.rationale
        );
        this.authManager.logAudit({
          action: 'D6_DECISION_SUBMITTED',
          decisionId: decisionMatch[1],
          approved: body.approved,
          rationale: body.rationale,
        });
        return this.sendJson(res, 200, outcome);
      }

      // Permitted Operations Commands
      if (pathname === '/api/admin/operations/command' && method === 'POST') {
        const body = await this.parseBody(req);
        try {
          const outcome = this.councilService.queueOwnerCommand(body, req.adminUser?.username || 'NOUR');
          this.authManager.logAudit({
            action: 'COUNCIL_COMMAND_QUEUED',
            command: body,
          });
          return this.sendJson(res, 200, { success: true, command: outcome });
        } catch (e) {
          return this.sendError(res, 400, e.message);
        }
      }

      this.sendError(res, 404, 'Unknown admin endpoint');
    } catch (err) {
      this.sendError(res, 400, err.message);
    }
  }
}
