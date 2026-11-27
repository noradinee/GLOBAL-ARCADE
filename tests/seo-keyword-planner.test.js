import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { createProductionServer } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function getHtml(port, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: reqPath }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

test('categorySeo.json and seoTranslations.json cover all 11 categories across all 11 languages', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/data/categories.json'), 'utf8'));
  const categorySeo = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/data/categorySeo.json'), 'utf8'));
  const seoTranslations = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/data/seoTranslations.json'), 'utf8'));

  const expectedLangs = ['En', 'Ar', 'Es', 'Pt', 'Fr', 'De', 'Tr', 'Id', 'Ru', 'It', 'Pl'];
  const fieldsPerLang = ['name', 'title', 'desc', 'h1', 'intro', 'keywords'];

  assert.ok(categories.length >= 11, 'Expected at least 11 categories');
  assert.equal(seoTranslations.languages.length, 11, 'Expected 11 supported languages');

  for (const cat of categories) {
    const entry = categorySeo[cat.slug];
    assert.ok(entry, `Missing categorySeo.json entry for "${cat.slug}"`);
    for (const langCap of expectedLangs) {
      for (const f of fieldsPerLang) {
        const key = `${f}${langCap}`;
        assert.equal(typeof entry[key], 'string', `Expected string ${key} for ${cat.slug}`);
        assert.ok(entry[key].trim().length >= 2, `Expected non-empty ${key} for ${cat.slug}`);
      }
    }
  }

  for (const langObj of seoTranslations.languages) {
    const loc = seoTranslations.locales[langObj.code];
    assert.ok(loc && loc.home && loc.categoriesHub && loc.trending && loc.popular && loc.game, `Missing seoTranslations locale for ${langObj.code}`);
  }
});

test('games.json has cleaned high-impression GSC titles/descriptions and zero third-party portal leaks', () => {
  const games = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/data/games.json'), 'utf8'));
  const portalLeak = games.filter((g) => g.description && /only on gamepix/i.test(g.description));
  assert.equal(portalLeak.length, 0, 'Expected zero "only on GamePix" leaks in descriptions');

  const dupAr = games.filter((g) => g.titleAr && g.title && g.titleAr === `لعبة ${g.title} — ${g.title}`);
  assert.equal(dupAr.length, 0, 'Expected zero duplicate "لعبة X — X" Arabic titles');

  const mining = games.find((g) => g.slug === 'mining-up');
  assert.ok(mining && mining.seoTitle && mining.seoTitle.includes('Up Mining'), 'mining-up must target Up Mining query');

  const avatar = games.find((g) => g.slug === 'avatar-maker');
  assert.ok(avatar && !avatar.benchmarkGame, 'avatar-maker must not have wrong Subway Surfers benchmark');
});

test('index.html uses Keyword Planner optimized title, og-banner.png, and preserves analytics & AdSense tags', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  assert.ok(titleMatch, 'Missing <title> in index.html');
  assert.ok(titleMatch[1].includes('Free Online Browser Games'), 'Root title should target Free Online Browser Games');
  assert.ok(html.includes('ca-pub-1216297804150458'), 'Must preserve AdSense publisher account meta/script');
  assert.ok(html.includes('G-32GLYY3LKL'), 'Must preserve GA4 tag');
  assert.ok(html.includes('<link rel="canonical" href="https://kyraxo.com/" />'), 'Must preserve root canonical');
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'public/og-banner.png')), 'public/og-banner.png must exist');
});

test('SSR server injects localized titles, distinct hreflang alternates, html lang/dir, and Review schema across languages', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-seo-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/data'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, 'index.html'), path.join(tempDir, 'index.html'));
  fs.copyFileSync(path.join(REPO_ROOT, 'src/data/categorySeo.json'), path.join(tempDir, 'src/data/categorySeo.json'));
  fs.copyFileSync(path.join(REPO_ROOT, 'src/data/seoTranslations.json'), path.join(tempDir, 'src/data/seoTranslations.json'));
  fs.writeFileSync(
    path.join(tempDir, 'src/data/games.json'),
    JSON.stringify([
      {
        id: 'mining-up',
        slug: 'mining-up',
        title: 'Mining Up',
        titleAr: 'لعبة التعدين (Mining Up)',
        seoTitle: 'Mining Up (Up Mining) — Play Free Online Browser Game | KYRAXO',
        seoDescription: 'Play Mining Up free online right in your browser without downloads.',
        category: 'casual',
        description: 'Mining game.',
        rating: 4.6,
        ratingCount: 375,
        trending: true,
        popularityScore: 95,
        status: 'published',
      },
    ]),
    'utf8'
  );

  const { server, engine } = createProductionServer({
    rootDir: tempDir,
    adminPassword: 'test-password-123',
    autoDiscover: false,
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(async () => {
    await engine.stop();
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. English Home + distinct hreflang alternates + x-default
  const home = await getHtml(port, '/');
  assert.equal(home.statusCode, 200);
  assert.ok(home.body.includes('<html lang="en" dir="ltr"'));
  assert.ok(home.body.includes('KYRAXO — Play Free Online Browser Games'));
  assert.ok(home.body.includes('<link rel="alternate" hreflang="es" href="https://kyraxo.com/es" />'));
  assert.ok(home.body.includes('<link rel="alternate" hreflang="tr" href="https://kyraxo.com/tr" />'));
  assert.ok(home.body.includes('<link rel="alternate" hreflang="ru" href="https://kyraxo.com/ru" />'));
  assert.ok(home.body.includes('<link rel="alternate" hreflang="x-default" href="https://kyraxo.com/" />'));

  // 2. Arabic Home RTL + localized Arabic title
  const arHome = await getHtml(port, '/ar');
  assert.equal(arHome.statusCode, 200);
  assert.ok(arHome.body.includes('<html lang="ar" dir="rtl"'));
  assert.ok(arHome.body.includes('<link rel="canonical" href="https://kyraxo.com/ar" />'));
  assert.ok(arHome.body.includes('ألعاب مجانية اون لاين'));

  // 3. Localized category routes (EN, ES, TR, ID, RU)
  const racingEn = await getHtml(port, '/category/racing');
  assert.equal(racingEn.statusCode, 200);
  assert.ok(racingEn.body.includes('<title>Car &amp; Racing Games — Play Free Online Without Downloading | KYRAXO</title>'));
  assert.ok(racingEn.body.includes('<link rel="canonical" href="https://kyraxo.com/category/racing" />'));
  assert.ok(racingEn.body.includes('<link rel="alternate" hreflang="id" href="https://kyraxo.com/id/category/racing" />'));

  const racingEs = await getHtml(port, '/es/category/racing');
  assert.equal(racingEs.statusCode, 200);
  assert.ok(racingEs.body.includes('<html lang="es" dir="ltr"'));
  assert.ok(racingEs.body.includes('Juegos de Carros y Coches'));
  assert.ok(racingEs.body.includes('<link rel="canonical" href="https://kyraxo.com/es/category/racing" />'));

  const trendingTr = await getHtml(port, '/tr/trending');
  assert.equal(trendingTr.statusCode, 200);
  assert.ok(trendingTr.body.includes('<html lang="tr" dir="ltr"'));
  assert.ok(trendingTr.body.includes('Trend Oyunlar'));

  const popularId = await getHtml(port, '/id/popular');
  assert.equal(popularId.statusCode, 200);
  assert.ok(popularId.body.includes('Game Terpopuler'));

  // 4. Game page with custom seoTitle + SSR aggregateRating schema
  const gameEn = await getHtml(port, '/game/mining-up');
  assert.equal(gameEn.statusCode, 200);
  assert.ok(gameEn.body.includes('<title>Mining Up (Up Mining) — Play Free Online Browser Game | KYRAXO</title>'));
  assert.ok(gameEn.body.includes('"@type": "AggregateRating"'));
  assert.ok(gameEn.body.includes('"ratingValue": 4.6'));
});
