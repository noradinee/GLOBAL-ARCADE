import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://kyraxo.com';
const today = new Date().toISOString().split('T')[0];

const games = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/games.json'), 'utf-8')
);
const categories = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/categories.json'), 'utf-8')
);
const seoTranslations = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/seoTranslations.json'), 'utf-8')
);

const ALL_LANGS = seoTranslations.languages.map((l) => l.code);

function buildUrl(basePath, lang) {
  const clean = !basePath || basePath === '/' ? '/' : basePath;
  if (lang === 'en') {
    return `${BASE_URL}${clean === '/' ? '/' : clean}`;
  }
  return clean === '/' ? `${BASE_URL}/${lang}` : `${BASE_URL}/${lang}${clean}`;
}

function buildXhtmlAlternates(basePath) {
  const links = ALL_LANGS.map(
    (code) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${buildUrl(basePath, code)}"/>`
  );
  links.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl(basePath, 'en')}"/>`
  );
  return links.join('\n');
}

const localizedStaticPages = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/categories', changefreq: 'daily', priority: '0.9' },
  { path: '/trending', changefreq: 'daily', priority: '0.9' },
  { path: '/popular', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
];

const singleLocaleStaticPages = [
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.4' },
  { path: '/terms', changefreq: 'monthly', priority: '0.4' },
  { path: '/cookies', changefreq: 'monthly', priority: '0.4' },
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

let urlCount = 0;

// Localized Static Hub Pages (all 11 languages with xhtml alternates)
for (const p of localizedStaticPages) {
  const alternates = buildXhtmlAlternates(p.path);
  for (const lang of ALL_LANGS) {
    xml += `  <url>
    <loc>${buildUrl(p.path, lang)}</loc>
${alternates}
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${lang === 'en' ? p.priority : (Number(p.priority) * 0.95).toFixed(2)}</priority>
  </url>\n`;
    urlCount++;
  }
}

// Single-locale utility/legal pages
for (const p of singleLocaleStaticPages) {
  xml += `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>\n`;
  urlCount++;
}

// Localized Category Pages (all 11 categories x 11 languages = 121 URLs)
for (const cat of categories) {
  const basePath = `/category/${cat.slug}`;
  const alternates = buildXhtmlAlternates(basePath);
  for (const lang of ALL_LANGS) {
    xml += `  <url>
    <loc>${buildUrl(basePath, lang)}</loc>
${alternates}
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${lang === 'en' ? '0.85' : '0.80'}</priority>
  </url>\n`;
    urlCount++;
  }
}

// Canonical Game Pages
for (const game of games) {
  if (game.status === 'published') {
    xml += `  <url>
    <loc>${BASE_URL}/game/${game.slug}</loc>
    <lastmod>${game.releaseDate || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    urlCount++;
  }
}

xml += `</urlset>`;

const targetPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(targetPath, xml, 'utf-8');
console.log(`[SEO] Generated multilingual sitemap.xml with ${urlCount} URLs at ${targetPath}`);
