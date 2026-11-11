import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://globalarcade.games';
const today = new Date().toISOString().split('T')[0];

const games = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/games.json'), 'utf-8')
);
const categories = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/categories.json'), 'utf-8')
);

const staticPages = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/categories', changefreq: 'daily', priority: '0.9' },
  { path: '/trending', changefreq: 'daily', priority: '0.9' },
  { path: '/popular', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.4' },
  { path: '/terms', changefreq: 'monthly', priority: '0.4' },
  { path: '/cookies', changefreq: 'monthly', priority: '0.4' },
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

// Static Pages
staticPages.forEach((p) => {
  xml += `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>\n`;
});

// Category Pages
categories.forEach((cat) => {
  xml += `  <url>
    <loc>${BASE_URL}/category/${cat.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>\n`;
});

// Game Pages
games.forEach((game) => {
  if (game.status === 'published') {
    xml += `  <url>
    <loc>${BASE_URL}/game/${game.slug}</loc>
    <lastmod>${game.releaseDate || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  }
});

xml += `</urlset>`;

const targetPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(targetPath, xml, 'utf-8');
console.log(`[SEO] Generated sitemap.xml with ${staticPages.length + categories.length + games.length} URLs at ${targetPath}`);
