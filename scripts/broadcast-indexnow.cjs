/**
 * broadcast-indexnow.cjs
 *
 * Submits KYRAXO URLs to the IndexNow protocol (Bing, Yandex, Seznam, Naver)
 * including localized hubs, priority categories, and top GSC/popular game URLs.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = '8f3b49c0d1e247a5a3f6e8b7c9d012e4';
const HOST = 'kyraxo.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const gamesPath = path.resolve(__dirname, '../src/data/games.json');
const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

const NON_EN_LANGS = ['ar', 'es', 'pt', 'fr', 'de', 'tr', 'id', 'ru', 'it', 'pl'];
const CATEGORY_SLUGS = [
  'action', 'arcade', 'racing', 'puzzle', 'sports',
  'adventure', 'two-player', 'kids', 'casual', 'strategy', 'multiplayer'
];

const urls = [
  `https://${HOST}/`,
  `https://${HOST}/categories`,
  `https://${HOST}/trending`,
  `https://${HOST}/popular`,
  `https://${HOST}/about`,
  `https://${HOST}/terms`,
  `https://${HOST}/privacy`,
  `https://${HOST}/cookies`,
];

// Localized Home + Hub URLs
for (const lang of NON_EN_LANGS) {
  urls.push(`https://${HOST}/${lang}`);
  urls.push(`https://${HOST}/${lang}/categories`);
  urls.push(`https://${HOST}/${lang}/trending`);
  urls.push(`https://${HOST}/${lang}/popular`);
}

// English + Localized Categories (11 x 11)
for (const cat of CATEGORY_SLUGS) {
  urls.push(`https://${HOST}/category/${cat}`);
  for (const lang of NON_EN_LANGS) {
    urls.push(`https://${HOST}/${lang}/category/${cat}`);
  }
}

// High-impression GSC games prioritized first
const PRIORITY_GSC_SLUGS = [
  'mining-up',
  'obstacle-racing',
  'street-driver',
  'snakes-and-ladders',
  'avatar-maker',
  'the-windows-game',
  'racing-master-3d',
  'magic-coloring-book',
  'space-invaders',
  'cyborg',
  'funny-hair-salon',
  'kart-racer-vs',
  'penalty-shooters',
  'stickman-io',
  'case-opener-case-clicking-simulator',
  'angry-birds',
];

const seen = new Set(urls);
for (const slug of PRIORITY_GSC_SLUGS) {
  const u = `https://${HOST}/game/${slug}`;
  if (!seen.has(u)) {
    seen.add(u);
    urls.push(u);
  }
}

// Top popular published games
const topGames = games
  .filter(g => g.status === 'published' || g.status === 'active')
  .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
  .slice(0, 350);

topGames.forEach(g => {
  const u = `https://${HOST}/game/${g.slug}`;
  if (!seen.has(u)) {
    seen.add(u);
    urls.push(u);
  }
});

console.log(`📡 Preparing IndexNow broadcast for ${urls.length} priority URLs...`);

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls
});

function postIndexNow(hostname = 'api.indexnow.org') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      console.log(`[${hostname} IndexNow API] Status: ${res.statusCode} ${res.statusMessage}`);
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function main() {
  try {
    const status = await postIndexNow('api.indexnow.org');
    if (status === 200 || status === 202) {
      console.log(`✅ Successfully submitted ${urls.length} URLs to IndexNow (shared to Bing, Yandex, Seznam, Naver)!`);
    } else {
      console.log(`⚠️ IndexNow returned status ${status}`);
    }
  } catch (err) {
    console.error('IndexNow submission error:', err.message);
  }
}

main();
