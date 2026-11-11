import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { auditGameDirectory } from './security-audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function importGame(gameConfig, sourceDir) {
  console.log(`\n🚀 [IMPORT PIPELINE] Starting intake for "${gameConfig.title}" (${gameConfig.slug})...`);

  // Step 1: Security & Licensing Gate
  console.log(`🔒 [STEP 1/4] Running Security & Licensing Gate...`);
  const auditResult = auditGameDirectory(sourceDir, gameConfig.license || 'MIT');

  if (auditResult.status !== 'APPROVED') {
    console.error(`❌ [IMPORT REJECTED] Game failed security or licensing audit!`);
    console.error(`Status: ${auditResult.status}`);
    console.error(`Findings:`, auditResult.findings);
    throw new Error(`Security gate rejected game: ${gameConfig.slug}`);
  }

  console.log(`✅ [STEP 1/4] Security Gate PASSED. License: ${gameConfig.license || 'MIT'}.`);

  // Step 2: Asset Delivery
  const targetDir = path.resolve(__dirname, `../public/games/${gameConfig.slug}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy files
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`✅ [STEP 2/4] Copied assets to ${targetDir}.`);

  // Step 3: Register Metadata in src/data/games.json
  const gamesJsonPath = path.resolve(__dirname, '../src/data/games.json');
  const games = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf-8'));

  const existingIndex = games.findIndex((g) => g.id === gameConfig.id || g.slug === gameConfig.slug);
  if (existingIndex >= 0) {
    games[existingIndex] = { ...games[existingIndex], ...gameConfig };
    console.log(`🔄 [STEP 3/4] Updated existing catalog entry.`);
  } else {
    games.push(gameConfig);
    console.log(`➕ [STEP 3/4] Added new entry to games.json.`);
  }
  fs.writeFileSync(gamesJsonPath, JSON.stringify(games, null, 2), 'utf-8');

  // Step 4: Regenerate Sitemap
  console.log(`🗺️ [STEP 4/4] Updating XML Sitemap...`);
  const sitemapScript = path.resolve(__dirname, './generate-sitemap.js');
  import(sitemapScript);

  console.log(`🎉 [IMPORT COMPLETED] "${gameConfig.title}" successfully published to Global Arcade!\n`);
  return true;
}

// CLI usage
const jsonArg = process.argv[2];
const srcArg = process.argv[3];
if (jsonArg && srcArg) {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), jsonArg), 'utf-8'));
  const src = path.resolve(process.cwd(), srcArg);
  importGame(config, src);
}
