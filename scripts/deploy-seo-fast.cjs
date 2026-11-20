const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tarPath = path.join(root, 'temp_seo_fast.tar.gz');

if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

console.log('📦 Creating targeted lightweight package (assets + index.html + sitemap.xml)...');
execSync(`tar -czf "${tarPath}" -C "${path.join(root, 'dist')}" assets index.html sitemap.xml`);
console.log(`- Bundle size: ${(fs.statSync(tarPath).size / 1024).toFixed(1)} KB`);

console.log('📡 Uploading bundle to Hetzner via SCP...');
execSync(`scp -o StrictHostKeyChecking=no "${tarPath}" root@135.181.197.174:/opt/global-arcade/temp_seo_fast.tar.gz`);
execSync('scp -o StrictHostKeyChecking=no "src/data/games.json" root@135.181.197.174:/opt/global-arcade/src/data/games.json');

console.log('🔄 Extracting and syncing into Docker container on remote host...');
const remoteCommand = [
  'cd /opt/global-arcade',
  'tar -xzf temp_seo_fast.tar.gz -C dist/',
  'cp dist/sitemap.xml public/sitemap.xml 2>/dev/null || true',
  'docker cp dist/assets/. global-arcade:/app/dist/assets/',
  'docker cp dist/index.html global-arcade:/app/dist/index.html',
  'docker cp dist/sitemap.xml global-arcade:/app/dist/sitemap.xml',
  'docker cp src/data/games.json global-arcade:/app/src/data/games.json',
  'rm -f temp_seo_fast.tar.gz',
  'docker restart global-arcade'
].join(' && ');

const res = execSync(`ssh -o StrictHostKeyChecking=no root@135.181.197.174 "${remoteCommand}"`).toString();
console.log('Remote output:', res.trim());
console.log('🎉 LIVE DEPLOYMENT COMPLETE!');

if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
