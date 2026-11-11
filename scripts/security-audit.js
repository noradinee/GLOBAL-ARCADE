import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPROVED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'CC-BY-4.0',
  'ISC',
  'Zlib',
];

const SUSPICIOUS_PATTERNS = [
  { name: 'Dynamic Code Execution (eval)', regex: /\beval\s*\(/i, severity: 'CRITICAL' },
  { name: 'Function Constructor Execution', regex: /\bFunction\s*\([^)]*\)\s*\(/i, severity: 'CRITICAL' },
  { name: 'Document Write Injection', regex: /document\.write\s*\(/i, severity: 'HIGH' },
  { name: 'Cryptocurrency Miner Signatures', regex: /(coinhive|cryptonight|webminer|coin-hive|stratum\+tcp)/i, severity: 'CRITICAL' },
  { name: 'Suspicious Telemetry / Beaconing', regex: /navigator\.sendBeacon\s*\(/i, severity: 'MEDIUM' },
  { name: 'External Script Ingestion', regex: /<script[^>]+src=["'](https?:\/\/[^"']+)["']/i, severity: 'HIGH' },
  { name: 'High-Density Hex Obfuscation', regex: /(?:\\x[0-9a-fA-F]{2}){8,}/, severity: 'CRITICAL' },
  { name: 'Credential / Cookie Exfiltration', regex: /(document\.cookie|localStorage\.getItem\(["'](?:token|auth|key|secret)["']\))/i, severity: 'HIGH' },
];

export function auditGameDirectory(gameDir, licenseName = 'MIT') {
  const findings = [];
  let totalFilesScanned = 0;

  if (!fs.existsSync(gameDir)) {
    return {
      status: 'REJECTED',
      error: `Directory not found: ${gameDir}`,
      findings: [],
    };
  }

  // 1. License Verification Gate
  const isLicenseApproved = APPROVED_LICENSES.some(
    (lic) => lic.toLowerCase() === (licenseName || '').toLowerCase()
  );

  if (!isLicenseApproved) {
    findings.push({
      file: 'LICENSE',
      line: 0,
      severity: 'CRITICAL',
      message: `License "${licenseName}" is not on the commercial approval whitelist.`,
    });
  }

  // 2. Recursive File Scanning
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git'].includes(entry.name)) {
          scanDir(fullPath);
        }
      } else if (/\.(html|js|css|json)$/i.test(entry.name)) {
        totalFilesScanned++;
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        SUSPICIOUS_PATTERNS.forEach((pattern) => {
          lines.forEach((line, index) => {
            if (pattern.regex.test(line)) {
              findings.push({
                file: path.relative(gameDir, fullPath),
                line: index + 1,
                severity: pattern.severity,
                message: `Detected ${pattern.name}: "${line.trim().slice(0, 100)}"`,
              });
            }
          });
        });
      }
    }
  }

  scanDir(gameDir);

  const criticalIssues = findings.filter((f) => f.severity === 'CRITICAL');
  const highIssues = findings.filter((f) => f.severity === 'HIGH');

  let status = 'APPROVED';
  if (criticalIssues.length > 0) {
    status = 'REJECTED';
  } else if (highIssues.length > 0) {
    status = 'SECURITY_REVIEW';
  } else if (!isLicenseApproved) {
    status = 'REJECTED';
  }

  return {
    gameDir,
    totalFilesScanned,
    licenseName,
    isLicenseApproved,
    status,
    findings,
    summary: {
      critical: criticalIssues.length,
      high: highIssues.length,
      medium: findings.filter((f) => f.severity === 'MEDIUM').length,
    },
  };
}

// CLI Execution support
const targetDir = process.argv[2];
if (targetDir) {
  const resolved = path.resolve(process.cwd(), targetDir);
  console.log(`\n🛡️ [SECURITY AUDIT] Scanning: ${resolved}...`);
  const result = auditGameDirectory(resolved);
  console.log(`Status: ${result.status}`);
  console.log(`Files Scanned: ${result.totalFilesScanned}`);
  console.log(`Critical Issues: ${result.summary.critical}`);
  console.log(`High Issues: ${result.summary.high}`);
  if (result.findings.length > 0) {
    console.log(`Findings:`, result.findings);
  }
} else {
  // Run scan on all local games
  const gamesDir = path.resolve(__dirname, '../public/games');
  if (fs.existsSync(gamesDir)) {
    console.log(`\n🛡️ [SECURITY AUDIT GATE] Auditing all local games in ${gamesDir}...`);
    const games = fs.readdirSync(gamesDir);
    let allPassed = true;

    games.forEach((g) => {
      const gPath = path.join(gamesDir, g);
      if (fs.statSync(gPath).isDirectory()) {
        const audit = auditGameDirectory(gPath, 'MIT');
        const icon = audit.status === 'APPROVED' ? '✅' : '❌';
        console.log(`${icon} [${audit.status}] ${g}: ${audit.totalFilesScanned} files scanned, ${audit.findings.length} findings.`);
        if (audit.status === 'REJECTED') allPassed = false;
      }
    });

    console.log(`\nAudit complete: ${allPassed ? 'ALL GAMES CLEARED SECURITY GATE' : 'SECURITY WARNINGS FOUND'}\n`);
  }
}
