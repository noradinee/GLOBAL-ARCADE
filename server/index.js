/**
 * index.js
 *
 * Production Node.js Server & Autonomous Operations Host for GLOBAL-ARCADE (Phase 4C Extension).
 *
 * Responsibilities:
 * 1. Hosts the permanent autonomous background engine (continuous discovery, qualification, repair, publishing).
 * 2. Serves protected administrative APIs, health checks, and job monitor endpoints.
 * 3. Serves the production SPA frontend (dist/index.html) and static assets with caching headers.
 * 4. Serves production HTML5 game sandboxes (/games/<slug>/index.html) with security isolation headers.
 * 5. Handles graceful shutdown signals (SIGINT, SIGTERM) with zero state or job loss.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ContinuousEngine } from './engine/continuous-engine.js';
import { AuthManager } from './auth.js';
import { ApiRouter } from './api-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

export function createProductionServer(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  const engine = new ContinuousEngine({
    rootDir,
    autoDiscover: options.autoDiscover !== undefined ? options.autoDiscover : true,
  });
  const authManager = new AuthManager({
    rootDir,
    adminUsername: options.adminUsername,
    adminPassword: options.adminPassword,
    adminPasswordHash: options.adminPasswordHash,
    sessionSecret: options.sessionSecret,
  });
  const apiRouter = new ApiRouter({ engine, authManager, rootDir });

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const rawPathname = parsedUrl.pathname;
      const pathname = decodeURIComponent(rawPathname);

      // Security check: Immediately reject any directory traversal or null byte attempts
      if (rawPathname.includes('..') || pathname.includes('..') || rawPathname.includes('\0') || pathname.includes('\0')) {
        res.statusCode = 403;
        res.end('Forbidden: Directory traversal attempt detected.');
        return;
      }

      // 1. API Endpoints
      if (pathname.startsWith('/api/')) {
        return await apiRouter.handleRequest(req, res);
      }

      // 2. Games Sandboxes (/games/<slug>/*)
      if (pathname.startsWith('/games/')) {
        const gameSubpath = pathname.replace(/^\/games\/?/, '');
        const gamesBase = path.resolve(publicDir, 'games');
        const targetPath = path.resolve(gamesBase, gameSubpath);

        // Security check: Must not escape games directory
        if (targetPath.startsWith(gamesBase) && fs.existsSync(targetPath)) {
          const stat = fs.statSync(targetPath);
          if (stat.isDirectory()) {
            const indexHtml = path.join(targetPath, 'index.html');
            if (fs.existsSync(indexHtml)) {
              return serveStaticFile(indexHtml, res, { isGame: true });
            }
          } else if (stat.isFile()) {
            return serveStaticFile(targetPath, res, { isGame: true });
          }
        }
      }

      // 3. Static Assets from dist/ or public/
      const cleanPath = pathname.replace(/^\/+/, '');
      const candidates = [
        { base: path.resolve(distDir), file: path.resolve(distDir, cleanPath) },
        { base: path.resolve(publicDir), file: path.resolve(publicDir, cleanPath) },
      ];

      for (const { base, file } of candidates) {
        if (cleanPath && file.startsWith(base) && fs.existsSync(file)) {
          const stat = fs.statSync(file);
          if (stat.isFile()) {
            return serveStaticFile(file, res);
          }
        }
      }

      // 4. SPA Fallback (Serve dist/index.html or public/index.html for navigation routes)
      const ext = path.extname(pathname);
      const isFileRequest = ext && ext !== '.html';

      if (!isFileRequest) {
        const spaIndex = fs.existsSync(path.join(distDir, 'index.html'))
          ? path.join(distDir, 'index.html')
          : path.join(rootDir, 'index.html');

        if (fs.existsSync(spaIndex)) {
          return serveStaticFile(spaIndex, res);
        }
      }

      res.statusCode = 404;
      res.end('Not Found');
    } catch (err) {
      console.error(`❌ [SERVER ERROR] ${err.message}`);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  function serveStaticFile(filePath, res, opts = {}) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Security isolation headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (opts.isGame) {
      // Sandbox restrictions for third-party games
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  return { server, engine, authManager, apiRouter };
}

// Direct CLI start
if (process.argv[1] && (process.argv[1].endsWith('server/index.js') || process.argv[1].endsWith('server\\index.js'))) {
  const { server, engine } = createProductionServer();

  function startListening(port) {
    server.listen(port, HOST, () => {
      console.log(`\n====================================================================`);
      console.log(`🕹️  GLOBAL ARCADE — PRODUCTION SERVER ONLINE`);
      console.log(`🌐  Public Site:       http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}/`);
      console.log(`🛡️  Admin Dashboard:   http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}/admin`);
      console.log(`🩺  Health Check:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}/api/health`);
      console.log(`⚙️  Background Engine: RUNNING (Continuous Autonomous Discovery)`);
      console.log(`====================================================================\n`);

      // Start continuous engine
      engine.start();
    });
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT && PORT === 3000) {
      console.warn(`⚠️ [SERVER] Port 3000 is occupied by another process. Falling back to port 3001...`);
      startListening(3001);
    } else {
      console.error(`❌ [SERVER ERROR] ${err.message}`);
      process.exit(1);
    }
  });

  startListening(PORT);

  const handleShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Gracefully stopping server and engine...`);
    await engine.stop();
    server.close(() => {
      console.log('✅ Server stopped cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
