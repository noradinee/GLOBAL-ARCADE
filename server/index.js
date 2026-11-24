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
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.atlas': 'text/plain; charset=utf-8',
  '.fnt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&#39;';
      case '"': return '&quot;';
    }
  });
}

function injectCanonical(html, canonicalUrl) {
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  if (/<\s*link[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<\s*link[^>]*rel=["']canonical["'][^>]*>/i, canonicalTag);
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', `    ${canonicalTag}\n  </head>`);
  }
  return html;
}

function generateGamePreRenderHtml(game, gamesCatalog) {
  const gameTitle = game.title || 'Play Online Game';
  const gameDesc = (game.description || `Play ${gameTitle} online for free on KYRAXO. Instant browser play, no download needed.`).replace(/\s+/g, ' ').trim();
  const category = (game.category || 'arcade').toLowerCase();

  const benchmarkBox = game.benchmarkGame ? `
    <div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:14px;padding:16px 20px;margin-bottom:24px;">
      <span style="color:#a5b4fc;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">🔥 Browser Alternative</span>
      <h3 style="color:#ffffff;font-size:15px;margin:0 0 6px 0;">Looking for free games like ${escapeHtml(game.benchmarkGame)}?</h3>
      <p style="color:#c7d2fe;font-size:13px;line-height:1.6;margin:0;">${escapeHtml(gameTitle)} delivers fast, instant browser gameplay inspired by ${escapeHtml(game.benchmarkGame)}. No downloads, zero storage footprint, and 100% free on both mobile and PC.</p>
    </div>` : '';

  const controlsBox = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:20px;margin-bottom:24px;">
      <h2 style="font-size:18px;font-weight:bold;color:#38bdf8;margin-bottom:12px;">🎮 How to Play & Controls</h2>
      <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin-bottom:14px;">${escapeHtml(game.instructions || 'Master the gameplay with smooth, intuitive inputs on any device.')}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="background:#0d1117;border:1px solid #21262d;padding:8px 14px;border-radius:10px;font-size:13px;color:#e2e8f0;">
          <strong style="color:#38bdf8;display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;">Desktop PC</strong>
          <span><kbd style="background:#21262d;border:1px solid #30363d;padding:2px 6px;border-radius:4px;color:#00f2fe;font-family:monospace;font-size:11px;">WASD / Arrows</kbd> Move • <kbd style="background:#21262d;border:1px solid #30363d;padding:2px 6px;border-radius:4px;color:#00f2fe;font-family:monospace;font-size:11px;">Mouse / Space</kbd> Action</span>
        </div>
        <div style="background:#0d1117;border:1px solid #21262d;padding:8px 14px;border-radius:10px;font-size:13px;color:#e2e8f0;">
          <strong style="color:#38bdf8;display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;">Mobile & Tablet</strong>
          <span><kbd style="background:#21262d;border:1px solid #30363d;padding:2px 6px;border-radius:4px;color:#a855f7;font-family:monospace;font-size:11px;">Touch Gestures</kbd> Tap, swipe, and drag directly on screen</span>
        </div>
      </div>
    </div>`;

  const faqSection = `
    <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:20px;margin-bottom:28px;">
      <h2 style="font-size:18px;font-weight:bold;color:#38bdf8;margin-bottom:16px;">❓ Frequently Asked Questions (FAQ)</h2>
      <details style="margin-bottom:12px;border-bottom:1px solid #21262d;padding-bottom:12px;" open>
        <summary style="font-weight:bold;color:#ffffff;cursor:pointer;font-size:14px;">How do I play ${escapeHtml(gameTitle)} for free?</summary>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:8px;">You can play ${escapeHtml(gameTitle)} directly on KYRAXO in your web browser. No download, payment, or registration is required.</p>
      </details>
      <details style="margin-bottom:12px;border-bottom:1px solid #21262d;padding-bottom:12px;">
        <summary style="font-weight:bold;color:#ffffff;cursor:pointer;font-size:14px;">Can I play ${escapeHtml(gameTitle)} on mobile devices?</summary>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:8px;">Yes! ${escapeHtml(gameTitle)} is engineered with HTML5 technology to run smoothly on iPhone, iPad, Android smartphones, and desktop computers.</p>
      </details>
      <details style="margin-bottom:12px;border-bottom:1px solid #21262d;padding-bottom:12px;">
        <summary style="font-weight:bold;color:#ffffff;cursor:pointer;font-size:14px;">Is ${escapeHtml(gameTitle)} unblocked at school or work?</summary>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:8px;">Yes, KYRAXO runs over secure HTTPS and requires no executable files or flash plugins, making it accessible on Chromebooks and restricted school/work networks.</p>
      </details>
      ${game.benchmarkGame ? `
      <details style="margin-bottom:12px;">
        <summary style="font-weight:bold;color:#ffffff;cursor:pointer;font-size:14px;">Is ${escapeHtml(gameTitle)} similar to ${escapeHtml(game.benchmarkGame)}?</summary>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:8px;">Yes, ${escapeHtml(gameTitle)} features core mechanics and fun challenges inspired by ${escapeHtml(game.benchmarkGame)} in an instant web browser format.</p>
      </details>` : ''}
    </section>`;

  const tagsSection = `
    <div style="margin-bottom:32px;">
      <h3 style="font-size:13px;font-weight:bold;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Tags & Categories</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="/category/${encodeURIComponent(category)}" style="background:#21262d;color:#cbd5e1;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:bold;">#${escapeHtml(category)}</a>
        <a href="/trending" style="background:#21262d;color:#cbd5e1;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:bold;">#TrendingGames</a>
        <a href="/popular" style="background:#21262d;color:#cbd5e1;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:bold;">#FreeOnlineGames</a>
        <a href="/category/two-player" style="background:#21262d;color:#cbd5e1;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:bold;">#UnblockedGames</a>
        <a href="/category/arcade" style="background:#21262d;color:#cbd5e1;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none;font-weight:bold;">#BrowserGames</a>
      </div>
    </div>`;

  const related = gamesCatalog
    .filter(g => g && g.slug !== game.slug && (g.category || '').toLowerCase() === category)
    .slice(0, 12);
  const fallbackRelated = related.length < 6 ? gamesCatalog.filter(g => g && g.slug !== game.slug).slice(0, 12) : related;

  const relatedLinks = fallbackRelated.map(r => `
    <div style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:12px;">
      <a href="/game/${encodeURIComponent(r.slug)}" style="color:#ffffff;text-decoration:none;font-weight:bold;display:block;font-size:14px;margin-bottom:4px;">${escapeHtml(r.title)}</a>
      <span style="color:#38bdf8;font-size:11px;text-transform:capitalize;">${escapeHtml(r.category || 'Arcade')}</span>
    </div>
  `).join('');

  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/category/action" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Action</a>
        <a href="/category/puzzle" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Puzzle</a>
        <a href="/category/racing" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Racing</a>
        <a href="/category/sports" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Sports</a>
        <a href="/category/kids" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Kids</a>
        <a href="/category/strategy" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Strategy</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:24px auto;padding:0 16px;">
      <nav aria-label="Breadcrumb" style="font-size:13px;color:#64748b;margin-bottom:16px;">
        <a href="/" style="color:#00f2fe;text-decoration:none;">Home</a> &gt; 
        <a href="/category/${encodeURIComponent(category)}" style="color:#00f2fe;text-decoration:none;text-transform:capitalize;">${escapeHtml(category)}</a> &gt; 
        <span style="color:#e2e8f0;">${escapeHtml(gameTitle)}</span>
      </nav>
      <article>
        <h1 style="font-size:32px;font-weight:900;color:#ffffff;margin-bottom:12px;">${escapeHtml(gameTitle)} — Play Online Free</h1>
        <p style="font-size:16px;color:#cbd5e1;line-height:1.7;margin-bottom:24px;">${escapeHtml(gameDesc)}</p>
        
        ${benchmarkBox}

        ${controlsBox}

        <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:20px;margin-bottom:28px;">
          <h2 style="font-size:18px;font-weight:bold;color:#38bdf8;margin-bottom:12px;">Game Details & Instructions</h2>
          <ul style="color:#94a3b8;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
            <li><strong>Genre:</strong> <a href="/category/${encodeURIComponent(category)}" style="color:#38bdf8;text-decoration:none;text-transform:capitalize;">${escapeHtml(category)} Games</a></li>
            <li><strong>Platform:</strong> HTML5 Web Browser (Works on Desktop, iPhone, Android, Tablet)</li>
            <li><strong>Play Mode:</strong> Single Player / Instant Browser Play (Unblocked)</li>
            <li><strong>Installation:</strong> 100% Free, No download or registration required</li>
          </ul>
        </div>

        ${faqSection}

        ${tagsSection}

        <section style="margin-top:40px;">
          <h2 style="font-size:22px;font-weight:bold;color:#ffffff;margin-bottom:16px;">More Free HTML5 Games in ${escapeHtml(category.toUpperCase())}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:14px;">
            ${relatedLinks}
          </div>
        </section>
      </article>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
      <p style="margin-top:8px;">
        <a href="/about" style="color:#94a3b8;margin:0 8px;">About</a> • 
        <a href="/privacy" style="color:#94a3b8;margin:0 8px;">Privacy Policy</a> • 
        <a href="/terms" style="color:#94a3b8;margin:0 8px;">Terms of Service</a> • 
        <a href="/contact" style="color:#94a3b8;margin:0 8px;">Contact</a>
      </p>
    </footer>`;
}

function generateCategoryPreRenderHtml(catSlug, gamesInCat) {
  const catName = catSlug.charAt(0).toUpperCase() + catSlug.slice(1);
  const gameGrid = gamesInCat.slice(0, 60).map(g => `
    <div style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:12px;">
      <a href="/game/${encodeURIComponent(g.slug)}" style="color:#ffffff;text-decoration:none;font-weight:bold;display:block;font-size:14px;margin-bottom:4px;">${escapeHtml(g.title)}</a>
      <span style="color:#38bdf8;font-size:11px;text-transform:capitalize;">${escapeHtml(g.category || catName)}</span>
    </div>
  `).join('');

  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/category/action" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Action</a>
        <a href="/category/puzzle" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Puzzle</a>
        <a href="/category/racing" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Racing</a>
        <a href="/category/sports" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Sports</a>
        <a href="/category/kids" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Kids</a>
      </nav>
    </header>
    <main style="max-width:1100px;margin:24px auto;padding:0 16px;">
      <nav aria-label="Breadcrumb" style="font-size:13px;color:#64748b;margin-bottom:16px;">
        <a href="/" style="color:#00f2fe;text-decoration:none;">Home</a> &gt; 
        <span style="color:#e2e8f0;text-transform:capitalize;">${escapeHtml(catName)} Games</span>
      </nav>
      <section style="margin-bottom:32px;">
        <h1 style="font-size:32px;font-weight:900;color:#ffffff;margin-bottom:12px;">Best Free Online ${escapeHtml(catName)} Games</h1>
        <p style="font-size:15px;color:#cbd5e1;line-height:1.7;">
          Explore and play the top free online ${escapeHtml(catName)} games on KYRAXO. All games are instant web games with no downloads or installs required. Compatible with modern mobile, tablet, and desktop browsers.
        </p>
      </section>
      <section>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:14px;">
          ${gameGrid}
        </div>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

function generateHomePreRenderHtml(gamesCatalog) {
  const categories = [
    'action', 'arcade', 'puzzle', 'racing', 'sports', 
    'adventure', 'casual', 'kids', 'two-player', 'multiplayer', 'strategy'
  ];
  const catNav = categories.map(c => `
    <a href="/category/${c}" style="display:inline-block;padding:8px 16px;margin:4px;background:#161b22;border:1px solid #30363d;border-radius:12px;color:#38bdf8;text-decoration:none;font-weight:bold;font-size:13px;text-transform:capitalize;">${c} Games</a>
  `).join('');

  const featured = gamesCatalog.slice(0, 48);
  const gameGrid = featured.map(g => `
    <div style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:12px;">
      <a href="/game/${encodeURIComponent(g.slug)}" style="color:#ffffff;text-decoration:none;font-weight:bold;display:block;font-size:14px;margin-bottom:4px;">${escapeHtml(g.title)}</a>
      <span style="color:#38bdf8;font-size:11px;text-transform:capitalize;">${escapeHtml(g.category || 'Arcade')}</span>
    </div>
  `).join('');

  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/category/action" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Action</a>
        <a href="/category/puzzle" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Puzzle</a>
        <a href="/category/racing" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Racing</a>
        <a href="/category/sports" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Sports</a>
        <a href="/category/kids" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Kids</a>
        <a href="/category/strategy" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Strategy</a>
      </nav>
    </header>
    <main style="max-width:1100px;margin:24px auto;padding:0 16px;">
      <section style="text-align:center;padding:32px 16px;">
        <h1 style="font-size:36px;font-weight:900;color:#ffffff;margin-bottom:12px;">KYRAXO — Free Online HTML5 Games</h1>
        <p style="font-size:16px;color:#cbd5e1;max-width:760px;margin:0 auto 24px;line-height:1.7;">
          Play over 3,200 free online HTML5 games instantly on mobile and desktop without downloading. Enjoy high-quality action, arcade, puzzle, racing, two-player, and unblocked browser games with zero lag.
        </p>
        <div style="margin-top:16px;">${catNav}</div>
      </section>

      <section style="margin-top:40px;">
        <h2 style="font-size:24px;font-weight:bold;color:#ffffff;margin-bottom:20px;">Top Featured HTML5 Games</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:14px;">
          ${gameGrid}
        </div>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
      <p style="margin-top:8px;">
        <a href="/about" style="color:#94a3b8;margin:0 8px;">About</a> • 
        <a href="/privacy" style="color:#94a3b8;margin:0 8px;">Privacy Policy</a> • 
        <a href="/terms" style="color:#94a3b8;margin:0 8px;">Terms of Service</a> • 
        <a href="/contact" style="color:#94a3b8;margin:0 8px;">Contact</a>
      </p>
    </footer>`;
}

function generatePrivacyPreRenderHtml() {
  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Home</a>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/about" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">About</a>
        <a href="/privacy" style="color:#00f2fe;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Privacy</a>
        <a href="/contact" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Contact</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:28px auto;padding:0 20px;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;">
      <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin-bottom:8px;">KYRAXO Privacy Policy</h1>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Effective & Last Updated: November 2026 • Full Google AdSense, GDPR & CCPA Compliance</p>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">1. Introduction & Overview</h2>
        <p>KYRAXO (<a href="https://kyraxo.com" style="color:#38bdf8;">https://kyraxo.com</a>) operates a free online HTML5 gaming platform accessible worldwide. We respect your privacy and are committed to safeguarding personal information while maintaining full transparency regarding the technologies utilized to support our free gaming services.</p>
      </section>

      <section style="background:#1e1b4b;border:1px solid #4338ca;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#ffffff;font-size:20px;margin-top:0;">2. Third-Party Advertising & Google AdSense Compliance (Mandatory Disclosures)</h2>
        <p style="color:#c7d2fe;">To keep our gaming library 100% free with no paid subscriptions or registration requirements, we display digital advertisements served by reputable third-party advertising networks, primarily <strong>Google LLC</strong> and its <strong>Google AdSense</strong> program.</p>
        <ul style="color:#e0e7ff;padding-left:20px;">
          <li style="margin-bottom:10px;"><strong>Third-Party Vendors & Google Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to KYRAXO (<a href="https://kyraxo.com" style="color:#a5b4fc;">kyraxo.com</a>) and/or other websites on the Internet.</li>
          <li style="margin-bottom:10px;"><strong>DoubleClick / DART Cookies:</strong> Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to our site and/or other sites across the Internet.</li>
          <li style="margin-bottom:10px;"><strong>Personalized Advertising Opt-Out:</strong> Users may opt out of personalized advertising at any time by visiting <a href="https://adssettings.google.com" style="color:#38bdf8;font-weight:bold;">Google Ads Settings</a> (or <a href="https://myadcenter.google.com" style="color:#38bdf8;">My Ad Center</a>). Alternatively, users can opt out of third-party vendor cookies for personalized advertising by visiting the <a href="https://www.aboutads.info/choices/" style="color:#38bdf8;font-weight:bold;">Digital Advertising Alliance WebChoices Tool</a>, the <a href="https://www.youronlinechoices.com/" style="color:#38bdf8;font-weight:bold;">European Interactive Digital Advertising Alliance</a>, or the <a href="https://optout.networkadvertising.org/" style="color:#38bdf8;font-weight:bold;">Network Advertising Initiative Opt-Out Page</a>.</li>
        </ul>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">3. Certified Digital Sellers & ads.txt Verification</h2>
        <p>In accordance with IAB Tech Lab standards, KYRAXO maintains a public authorized digital sellers declaration available at <a href="https://kyraxo.com/ads.txt" style="color:#38bdf8;font-family:monospace;">https://kyraxo.com/ads.txt</a>. We partner with verified digital ad exchanges including Google Ad Manager, GamePix, OpenX, PubMatic, Index Exchange, Rubicon Project, Magnite, Amazon APS, and Criteo.</p>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">4. Information Collected & Local Storage</h2>
        <p>We practice strict data minimization. We do not require account registration or collect names, addresses, or credit cards. The technical data processed includes:</p>
        <ul style="padding-left:20px;color:#94a3b8;">
          <li><strong>Local Browser Storage (localStorage):</strong> Game progress, unlocked levels, and high scores are stored entirely within the client's local web browser and never transmitted to our remote servers.</li>
          <li><strong>Aggregated Telemetry:</strong> Anonymized screen resolution, browser version, and device type for WebGL/HTML5 optimization.</li>
          <li><strong>Analytics:</strong> Aggregated page view counts with IP anonymization enabled.</li>
        </ul>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">5. GDPR (European Economic Area & UK) Rights</h2>
        <p>Under Regulation (EU) 2016/679 (General Data Protection Regulation), users in the European Economic Area hold the right to access, rectify, restrict, erase, or object to data processing. Users may update cookie consent preferences at any time via our <a href="/cookies" style="color:#38bdf8;">Cookie Policy Page</a> or by emailing our Data Protection contact at <a href="mailto:privacy@kyraxo.com" style="color:#38bdf8;font-weight:bold;">privacy@kyraxo.com</a>.</p>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">6. California Consumer Privacy Rights (CCPA / CPRA)</h2>
        <p>Under the California Consumer Privacy Act and California Privacy Rights Act, California consumers have the right to know what personal information is collected, request deletion, and opt-out of the sale or sharing of digital advertising identifiers ("Do Not Sell or Share My Personal Information") via our opt-out links above.</p>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">7. Children's Online Privacy Protection Act (COPPA & GDPR-K)</h2>
        <p>KYRAXO is a general audience gaming portal. We do not knowingly collect personal identifiable information from children under 13 years of age (or under 16 in the European Union). Games in our "Kids" category are vetted for family safety and do not employ behavioral tracking.</p>
      </section>

      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">8. Contact Information</h2>
        <p>For inquiries regarding this Privacy Policy or data requests, please contact: <a href="mailto:privacy@kyraxo.com" style="color:#38bdf8;font-weight:bold;">privacy@kyraxo.com</a> or <a href="mailto:support@kyraxo.com" style="color:#38bdf8;font-weight:bold;">support@kyraxo.com</a>.</p>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

function generateTermsPreRenderHtml() {
  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Home</a>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/about" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">About</a>
        <a href="/terms" style="color:#00f2fe;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Terms</a>
        <a href="/contact" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Contact</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:28px auto;padding:0 20px;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;">
      <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin-bottom:8px;">KYRAXO Terms of Service</h1>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Effective: November 2026</p>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">1. Agreement to Terms</h2>
        <p>By accessing and playing games on KYRAXO (https://kyraxo.com), you acknowledge and agree to be bound by these Terms of Service. If you do not agree to these terms, please refrain from using the platform.</p>
      </section>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">2. Intellectual Property & DMCA Procedure</h2>
        <p>All game titles, trademarks, and associated art assets are the intellectual property of their respective creators and licensors. KYRAXO hosts games under developer distribution agreements, open web licenses, and original productions. For DMCA takedown notices, contact: <a href="mailto:dmca@kyraxo.com" style="color:#38bdf8;font-weight:bold;">dmca@kyraxo.com</a>.</p>
      </section>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">3. Acceptable Use Policy</h2>
        <p>Users agree not to scrape, reverse engineer, or deploy automated bots to artificially inflate scores, game sessions, or interfere with digital advertising units.</p>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

function generateAboutPreRenderHtml() {
  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Home</a>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/about" style="color:#00f2fe;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">About</a>
        <a href="/privacy" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Privacy</a>
        <a href="/contact" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Contact</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:28px auto;padding:0 20px;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;">
      <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin-bottom:8px;">About KYRAXO Gaming</h1>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Instant Browser Gaming Platform for Global Players</p>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">Our Mission</h2>
        <p>KYRAXO is a modern browser gaming portal dedicated to delivering instant, frictionless HTML5 entertainment across mobile and desktop devices. We believe players should be able to jump directly into games without installing apps, undergoing forced sign-ups, or paying subscription fees.</p>
      </section>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">Curated Quality & Family Safety</h2>
        <p>Every title in our extensive library undergoes strict quality, compatibility, and safety reviews to ensure clean, family-friendly entertainment with optimized touch and keyboard controls.</p>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

function generateContactPreRenderHtml() {
  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Home</a>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/about" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">About</a>
        <a href="/privacy" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Privacy</a>
        <a href="/contact" style="color:#00f2fe;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Contact</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:28px auto;padding:0 20px;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;">
      <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin-bottom:8px;">Contact KYRAXO</h1>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Support, Partnerships & Game Submissions</p>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">Get in Touch</h2>
        <p>We welcome inquiries from players, game developers, and advertising partners:</p>
        <ul style="padding-left:20px;color:#94a3b8;line-height:2;">
          <li>General Inquiries: <a href="mailto:contact@kyraxo.com" style="color:#38bdf8;font-weight:bold;">contact@kyraxo.com</a></li>
          <li>Privacy & Compliance: <a href="mailto:privacy@kyraxo.com" style="color:#38bdf8;font-weight:bold;">privacy@kyraxo.com</a></li>
          <li>Copyright & DMCA: <a href="mailto:dmca@kyraxo.com" style="color:#38bdf8;font-weight:bold;">dmca@kyraxo.com</a></li>
          <li>Technical Support: <a href="mailto:support@kyraxo.com" style="color:#38bdf8;font-weight:bold;">support@kyraxo.com</a></li>
        </ul>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

function generateCookiesPreRenderHtml() {
  return `
    <header style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <a href="/" style="color:#00f2fe;font-weight:900;font-size:20px;text-decoration:none;letter-spacing:1px;">KYRAXO ARCADE</a>
      <nav>
        <a href="/" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Home</a>
        <a href="/category/arcade" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Arcade</a>
        <a href="/privacy" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Privacy</a>
        <a href="/cookies" style="color:#00f2fe;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Cookies</a>
        <a href="/contact" style="color:#94a3b8;margin:0 8px;text-decoration:none;font-weight:bold;font-size:13px;">Contact</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:28px auto;padding:0 20px;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;">
      <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin-bottom:8px;">KYRAXO Cookie Policy</h1>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Transparency & Advertising Consent Controls</p>
      <section style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#00f2fe;font-size:20px;margin-top:0;">Cookie Usage & Targeted Ads Opt-Out</h2>
        <p>KYRAXO uses essential storage to remember player language and game progress. Third-party advertising partners, including Google AdSense, use cookies to serve relevant ads. You can manage and opt out of advertising cookies via <a href="https://adssettings.google.com" style="color:#38bdf8;font-weight:bold;">Google Ad Settings</a> or <a href="https://www.aboutads.info/choices/" style="color:#38bdf8;font-weight:bold;">AboutAds WebChoices</a>.</p>
      </section>
    </main>
    <footer style="margin-top:60px;padding:32px 16px;border-top:1px solid #21262d;text-align:center;color:#64748b;font-size:13px;">
      <p>© ${new Date().getFullYear()} KYRAXO Gaming. All games are free to play in modern web browsers.</p>
    </footer>`;
}

export function createProductionServer(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  let gamesCatalog = [];
  let gamesBySlug = new Map();
  let lastGamesMtime = 0;

  function refreshGamesCatalog() {
    const gamesPath = path.join(rootDir, 'src/data/games.json');
    try {
      if (fs.existsSync(gamesPath)) {
        const stat = fs.statSync(gamesPath);
        if (stat.mtimeMs !== lastGamesMtime) {
          const raw = fs.readFileSync(gamesPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            gamesCatalog = parsed;
            gamesBySlug.clear();
            for (const g of parsed) {
              if (g && g.slug) {
                gamesBySlug.set(g.slug, g);
              }
            }
            lastGamesMtime = stat.mtimeMs;
          }
        }
      }
    } catch (err) {
      console.warn(`[CATALOG WARNING] Failed to index games for OG/RSS: ${err.message}`);
    }
  }

  // Initial index load
  refreshGamesCatalog();

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

      // Explicit ads.txt Handler for Google AdSense & IAB Compliance
      if (pathname === '/ads.txt') {
        const adsCandidates = [
          path.resolve(distDir, 'ads.txt'),
          path.resolve(publicDir, 'ads.txt'),
        ];
        for (const adsFile of adsCandidates) {
          if (fs.existsSync(adsFile)) {
            const content = fs.readFileSync(adsFile, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.end(content);
            return;
          }
        }
      }

      // 2. Games Sandboxes (/games/<slug>/*)
      if (pathname.startsWith('/games/')) {
        // Anti-Bot / Anti-Scraper Protection: Immediately drop automated batch scrapers
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        if (/curl|wget|python|scrapy|httrack|urllib|postman|insomnia|go-http-client|apachebench/i.test(ua)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Access Denied: Automated scrapers and batch downloaders are strictly prohibited by KYRAXO Security Shield.');
          return;
        }

        const gameSubpath = pathname.replace(/^\/games\/?/, '');
        const gamesCandidates = [
          path.resolve(distDir, 'games'),
          path.resolve(publicDir, 'games'),
        ];

        for (const gamesBase of gamesCandidates) {
          const targetPath = path.resolve(gamesBase, gameSubpath);
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

      // 3b. Dynamic Gaming RSS & Atom Syndication Feed (/rss.xml & /feed.xml)
      if (pathname === '/rss.xml' || pathname === '/feed.xml') {
        refreshGamesCatalog();
        const topGames = gamesCatalog.slice(0, 100);
        const buildDate = new Date().toUTCString();

        let itemsXml = '';
        for (const g of topGames) {
          const itemTitle = escapeXml(g.title);
          const itemSlug = encodeURIComponent(g.slug);
          const itemUrl = `https://kyraxo.com/game/${itemSlug}`;
          const itemDesc = escapeXml(g.description || `Play ${g.title} online for free on KYRAXO.`);
          const itemCat = escapeXml(g.category || 'Arcade');
          let thumb = g.thumbnail || 'https://kyraxo.com/og-banner.svg';
          if (!thumb.startsWith('http')) {
            thumb = `https://kyraxo.com${thumb.startsWith('/') ? '' : '/'}${thumb}`;
          }

          itemsXml += `
    <item>
      <title>${itemTitle}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <description><![CDATA[${itemDesc}]]></description>
      <category>${itemCat}</category>
      <enclosure url="${escapeXml(thumb)}" type="image/jpeg" length="1024" />
      <pubDate>${buildDate}</pubDate>
    </item>`;
        }

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>KYRAXO — Free Online HTML5 Games</title>
    <link>https://kyraxo.com</link>
    <description>Play over 3,200 free online HTML5 games instantly on mobile and desktop without downloading.</description>
    <language>en-us</language>
    <atom:link href="https://kyraxo.com/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${buildDate}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(rssXml);
        return;
      }

      // 4. Server-Side Social OpenGraph / WhatsApp Rich Preview Injection (/game/:slug)
      if (pathname.startsWith('/game/')) {
        const rawSlug = pathname.replace(/^\/game\/?/, '').split('/')[0].split('?')[0];
        let slug = rawSlug;
        try { slug = decodeURIComponent(rawSlug); } catch (_) {}
        refreshGamesCatalog();
        const game = gamesBySlug.get(slug);

        if (!game) {
          const spaIndex = fs.existsSync(path.join(distDir, 'index.html'))
            ? path.join(distDir, 'index.html')
            : path.join(rootDir, 'index.html');
          if (fs.existsSync(spaIndex)) {
            let html = fs.readFileSync(spaIndex, 'utf-8');
            html = html.replace(/<title>.*?<\/title>/i, '<title>Game Not Found — KYRAXO</title>');
            if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
              html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex, nofollow" />');
            } else if (html.includes('</head>')) {
              html = html.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
            }
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(html);
            return;
          }
          res.statusCode = 404;
          res.end('Game Not Found');
          return;
        }

        if (game) {
          const spaIndex = fs.existsSync(path.join(distDir, 'index.html'))
            ? path.join(distDir, 'index.html')
            : path.join(rootDir, 'index.html');

          if (fs.existsSync(spaIndex)) {
            let html = fs.readFileSync(spaIndex, 'utf-8');

            const gameTitle = game.title || 'Play Online Game';
            const cleanDesc = (game.description || `Play ${gameTitle} online for free on KYRAXO. No download needed. Instant browser play.`).replace(/\s+/g, ' ').trim();
            const canonicalUrl = `https://kyraxo.com/game/${encodeURIComponent(game.slug)}`;

            let imageUrl = game.thumbnail || 'https://kyraxo.com/og-banner.svg';
            if (!imageUrl.startsWith('http')) {
              imageUrl = `https://kyraxo.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }

            // Clean replacement of generic page metadata with game-specific OpenGraph & Twitter tags
            html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(gameTitle)} — Play Free Online on KYRAXO</title>`);
            html = html.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${escapeHtml(gameTitle)} — Play Free Online on KYRAXO" />`);
            html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(cleanDesc)}" />`);

            html = html.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="game" />`);
            html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
            html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(gameTitle)} — Play Free on KYRAXO" />`);
            html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(cleanDesc)}" />`);
            html = html.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n    <meta property="og:image:alt" content="${escapeHtml(gameTitle)}" />\n    <meta property="og:site_name" content="KYRAXO Games" />`);

            html = html.replace(/<meta property="twitter:title" content=".*?" \/>/i, `<meta property="twitter:title" content="${escapeHtml(gameTitle)} — Play Free on KYRAXO" />`);
            html = html.replace(/<meta property="twitter:description" content=".*?" \/>/i, `<meta property="twitter:description" content="${escapeHtml(cleanDesc)}" />`);
            html = html.replace(/<meta property="twitter:image" content=".*?" \/>/i, `<meta property="twitter:image" content="${escapeHtml(imageUrl)}" />`);

            // Inject Google VideoGame, BreadcrumbList, and FAQPage Structured Data Schema Graph
            const faqEntities = [
              {
                "@type": "Question",
                "name": `How do I play ${gameTitle} online for free?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `You can play ${gameTitle} instantly on KYRAXO in any web browser without downloading or registering.`
                }
              },
              {
                "@type": "Question",
                "name": `Can I play ${gameTitle} on mobile (iOS and Android)?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `Yes, ${gameTitle} is built with HTML5 technology and works on iPhones, iPads, Android smartphones, and desktop computers.`
                }
              },
              {
                "@type": "Question",
                "name": `Is ${gameTitle} unblocked at school or work?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `Yes, KYRAXO uses clean HTTPS and requires no executable files or flash plugins, making it accessible on Chromebooks and school networks.`
                }
              }
            ];

            if (game.benchmarkGame) {
              faqEntities.push({
                "@type": "Question",
                "name": `Is ${gameTitle} similar to ${game.benchmarkGame}?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `Yes, ${gameTitle} delivers fast, free browser gameplay mechanics inspired by ${game.benchmarkGame} with no downloads required.`
                }
              });
            }

            const schemaGraph = {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "VideoGame",
                  "name": gameTitle,
                  "description": cleanDesc,
                  "image": imageUrl,
                  "url": canonicalUrl,
                  "genre": [game.category || 'Arcade'],
                  "playMode": "SinglePlayer",
                  "applicationCategory": "Game",
                  "operatingSystem": "Any, Web Browser, iOS, Android, Windows, macOS",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  }
                },
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://kyraxo.com/"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": (game.category || 'Arcade'),
                      "item": `https://kyraxo.com/category/${encodeURIComponent((game.category || 'arcade').toLowerCase())}`
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": gameTitle,
                      "item": canonicalUrl
                    }
                  ]
                },
                {
                  "@type": "FAQPage",
                  "mainEntity": faqEntities
                }
              ]
            };

            const gameJsonLd = `\n    <!-- Google Rich Results Schema Graph (VideoGame + BreadcrumbList + FAQPage) -->\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaGraph, null, 2)}\n    </script>`;

            if (html.includes('</head>')) {
              html = html.replace('</head>', `${gameJsonLd}\n  </head>`);
            }

            // Inject SEO Canonical Tag
            html = injectCanonical(html, canonicalUrl);

            // Inject Crawlable Pre-Rendered HTML into #root
            const preRendered = generateGamePreRenderHtml(game, gamesCatalog);
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
            res.end(html);
            return;
          }
        }
      }

      // 4b. Category Social Previews & Crawlable Pre-Rendering (/category/:slug)
      if (pathname.startsWith('/category/')) {
        const catSlug = pathname.replace(/^\/category\/?/, '').split('/')[0].split('?')[0];
        const spaIndex = fs.existsSync(path.join(distDir, 'index.html'))
          ? path.join(distDir, 'index.html')
          : path.join(rootDir, 'index.html');

        if (fs.existsSync(spaIndex)) {
          let html = fs.readFileSync(spaIndex, 'utf-8');
          const catName = catSlug.charAt(0).toUpperCase() + catSlug.slice(1);
          const catTitle = `${catName} Games — Play Free Online | KYRAXO`;
          const catDesc = `Play the best free online ${catName} games on KYRAXO. Instant browser play, no downloads needed. 100% free HTML5 games.`;
          const catUrl = `https://kyraxo.com/category/${encodeURIComponent(catSlug)}`;

          html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(catTitle)}</title>`);
          html = html.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${escapeHtml(catTitle)}" />`);
          html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(catDesc)}" />`);
          html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeHtml(catUrl)}" />`);
          html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(catTitle)}" />`);
          html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(catDesc)}" />`);
          html = html.replace(/<meta property="twitter:title" content=".*?" \/>/i, `<meta property="twitter:title" content="${escapeHtml(catTitle)}" />`);
          html = html.replace(/<meta property="twitter:description" content=".*?" \/>/i, `<meta property="twitter:description" content="${escapeHtml(catDesc)}" />`);

          // Inject SEO Canonical Tag
          html = injectCanonical(html, catUrl);

          // Refresh and filter catalog
          refreshGamesCatalog();
          const gamesInCat = gamesCatalog.filter(g => (g.category || '').toLowerCase() === catSlug.toLowerCase());

          // Inject Category CollectionPage & ItemList Schema Structured Data
          const topInCat = gamesInCat.slice(0, 10);
          const itemListElements = topInCat.map((g, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "name": g.title,
            "url": `https://kyraxo.com/game/${encodeURIComponent(g.slug)}`
          }));

          const catSchema = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "CollectionPage",
                "name": catTitle,
                "description": catDesc,
                "url": catUrl
              },
              {
                "@type": "ItemList",
                "name": `${catName} Games Catalog`,
                "numberOfItems": gamesInCat.length,
                "itemListElement": itemListElements
              }
            ]
          };

          const catJsonLd = `\n    <!-- Category ItemList Schema Structured Data -->\n    <script type="application/ld+json">\n    ${JSON.stringify(catSchema, null, 2)}\n    </script>`;
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${catJsonLd}\n  </head>`);
          }

          // Inject Crawlable Pre-Rendered HTML into #root
          const preRendered = generateCategoryPreRenderHtml(catSlug, gamesInCat);
          html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
          res.end(html);
          return;
        }
      }

      // 4c. Default SPA Fallback (Serve dist/index.html or public/index.html with SEO Canonical & Homepage Pre-Render)
      const ext = path.extname(pathname);
      const isFileRequest = ext && ext !== '.html';

      if (!isFileRequest) {
        const spaIndex = fs.existsSync(path.join(distDir, 'index.html'))
          ? path.join(distDir, 'index.html')
          : path.join(rootDir, 'index.html');

        if (fs.existsSync(spaIndex)) {
          let html = fs.readFileSync(spaIndex, 'utf-8');

          if (pathname === '/' || pathname === '') {
            html = injectCanonical(html, 'https://kyraxo.com/');
            refreshGamesCatalog();
            const preRendered = generateHomePreRenderHtml(gamesCatalog);
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else if (pathname === '/privacy') {
            html = injectCanonical(html, 'https://kyraxo.com/privacy');
            html = html.replace(/<title>.*?<\/title>/i, '<title>Privacy Policy — KYRAXO | User Data Protection & Google AdSense Disclosures</title>');
            html = html.replace(/<meta name="title" content=".*?" \/>/i, '<meta name="title" content="Privacy Policy — KYRAXO | User Data Protection & Google AdSense Disclosures" />');
            html = html.replace(/<meta name="description" content=".*?" \/>/i, '<meta name="description" content="Comprehensive Privacy Policy for KYRAXO. Learn how we handle cookies, Google AdSense programmatic advertising, analytics, and your rights under GDPR and CCPA." />');
            const preRendered = generatePrivacyPreRenderHtml();
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else if (pathname === '/terms') {
            html = injectCanonical(html, 'https://kyraxo.com/terms');
            html = html.replace(/<title>.*?<\/title>/i, '<title>Terms of Service — KYRAXO Gaming</title>');
            const preRendered = generateTermsPreRenderHtml();
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else if (pathname === '/about') {
            html = injectCanonical(html, 'https://kyraxo.com/about');
            html = html.replace(/<title>.*?<\/title>/i, '<title>About Us — KYRAXO Mission & Team</title>');
            const preRendered = generateAboutPreRenderHtml();
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else if (pathname === '/contact') {
            html = injectCanonical(html, 'https://kyraxo.com/contact');
            html = html.replace(/<title>.*?<\/title>/i, '<title>Contact Us — KYRAXO Platform Support</title>');
            const preRendered = generateContactPreRenderHtml();
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else if (pathname === '/cookies') {
            html = injectCanonical(html, 'https://kyraxo.com/cookies');
            html = html.replace(/<title>.*?<\/title>/i, '<title>Cookie Policy & Ad Preferences — KYRAXO</title>');
            const preRendered = generateCookiesPreRenderHtml();
            html = html.replace('<div id="root"></div>', `<div id="root">${preRendered}</div>`);
          } else {
            const canonicalUrl = `https://kyraxo.com${pathname}`;
            html = injectCanonical(html, canonicalUrl);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
          res.end(html);
          return;
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

    const isGameAsset = opts.isGame || filePath.includes('/games/') || filePath.includes('\\games\\');

    if (isGameAsset) {
      // Multilayer Game Shield: Anti-Framing & Anti-Hotlinking Headers
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://kyraxo.com https://*.kyraxo.com http://localhost:*");
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

      // Inject Game Shield into HTML files
      if (ext === '.html') {
        try {
          let html = fs.readFileSync(filePath, 'utf-8');
          if (!html.includes('id="kyraxo-shield"')) {
            const shieldScript = `<script id="kyraxo-shield">
(function(){
  'use strict';
  // 1. DOMAIN LOCK: Strictly prohibit running on any external domain or filesystem
  var allowed=['kyraxo.com','www.kyraxo.com','localhost','127.0.0.1'];
  var cur=window.location.hostname.toLowerCase();
  var ok=false;
  for(var i=0;i<allowed.length;i++){
    if(cur===allowed[i]||cur.endsWith('.'+allowed[i])){ok=true;break;}
  }
  if(!ok){
    document.documentElement.innerHTML='<div style="background:#090b10;color:#00f2fe;font-family:sans-serif;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;"><h2>🛡️ KYRAXO GAME SHIELD</h2><p style="color:#94a3b8;max-width:480px;line-height:1.6;">This game is protected under proprietary license and configured exclusively for KYRAXO Arcade. Unauthorized distribution or domain cloning is blocked.</p><a href="https://kyraxo.com" style="color:#090b10;background:#00f2fe;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px;">Play on KYRAXO.com</a></div>';
    setTimeout(function(){window.location.href='https://kyraxo.com';},2200);
    throw new Error('KYRAXO Shield: Execution blocked on unauthorized domain.');
  }

  // 2. IFRAME PARENT CHECK (Anti-Theft Iframe Guard)
  try{
    if(window.top!==window.self){
      var topHost='';
      try{topHost=window.top.location.hostname.toLowerCase();}catch(e){window.top.location.href='https://kyraxo.com';return;}
      var isTopOk=false;
      for(var j=0;j<allowed.length;j++){
        if(topHost===allowed[j]||topHost.endsWith('.'+allowed[j])){isTopOk=true;break;}
      }
      if(!isTopOk){window.top.location.href='https://kyraxo.com';return;}
    }
  }catch(err){}

  // 3. RIGHT-CLICK & CONTEXT MENU PREVENTION
  document.addEventListener('contextmenu',function(e){e.preventDefault();return false;},false);

  // 4. DEVTOOLS SHORTCUT BLOCKER
  document.addEventListener('keydown',function(e){
    if(e.keyCode===123||e.key==='F12'){e.preventDefault();return false;}
    if(e.ctrlKey&&e.shiftKey&&(e.keyCode===73||e.keyCode===74||e.keyCode===67||e.key==='I'||e.key==='J'||e.key==='C')){e.preventDefault();return false;}
    if(e.ctrlKey&&(e.keyCode===85||e.key==='u'||e.key==='U')){e.preventDefault();return false;}
    if(e.ctrlKey&&(e.keyCode===83||e.key==='s'||e.key==='S')){e.preventDefault();return false;}
  },false);

  // 5. CONSOLE SHIELD & LEGAL COPYRIGHT NOTICE
  try{
    console.log('%c🛡️ KYRAXO GAME SHIELD ACTIVE','color:#00f2fe;font-size:14px;font-weight:bold;background:#090b10;padding:4px 8px;border-radius:4px;');
    console.log('%cAll assets and code on kyraxo.com are protected by intellectual property laws. Reverse engineering, redistribution, or framing without explicit authorization is strictly prohibited.','color:#ffaa00;font-size:10px;');
  }catch(e){}
})();
</script>`;
            if (html.includes('</head>')) {
              html = html.replace('</head>', `${shieldScript}\n</head>`);
            } else if (html.includes('</body>')) {
              html = html.replace('</body>', `${shieldScript}\n</body>`);
            } else {
              html = `${shieldScript}\n${html}`;
            }
          }
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          res.setHeader('Content-Length', Buffer.byteLength(html));
          res.end(html);
          return;
        } catch (err) {
          console.error(`[SHIELD ERROR] ${err.message}`);
        }
      }
    }

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.includes('assets') || filePath.includes('thumbnails') || ext === '.woff2' || ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.webp') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
