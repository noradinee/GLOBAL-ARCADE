/**
 * security-inspection.js
 * 
 * Layered Static Security Inspection for Untrusted Discovered Games.
 * 
 * CRITICAL SAFETY RULES:
 * 1. Untrusted candidate code is NEVER executed or installed during discovery.
 * 2. Scans are strictly static (AST & regex pattern analysis).
 * 3. Never describe automated security checks as proof that a game is completely malware-free.
 */

import fs from 'fs';
import path from 'path';

export const STATIC_SECURITY_RULES = [
  // 1. Dynamic Code Execution
  {
    category: 'CODE_EXECUTION',
    name: 'Dynamic eval() call',
    regex: /\beval\s*\(/i,
    severity: 'CRITICAL',
    description: 'Direct code execution via eval() allows arbitrary script execution and bypasses CSP.',
  },
  {
    category: 'CODE_EXECUTION',
    name: 'Function() constructor execution',
    regex: /\bFunction\s*\([^)]*\)\s*\(/i,
    severity: 'CRITICAL',
    description: 'Dynamic code generation via Function constructor is equivalent to eval.',
  },
  {
    category: 'CODE_EXECUTION',
    name: 'setTimeout/setInterval with string code',
    regex: /\bset(?:Timeout|Interval)\s*\(\s*["'`][^"'`]+["'`]/i,
    severity: 'HIGH',
    description: 'Passing string code to timers invokes implicit eval.',
  },

  // 2. Cryptojacking & Mining Signatures
  {
    category: 'MINING',
    name: 'Known Web Crypto-Miner signature',
    regex: /\b(coinhive|cryptonight|webminer|coin-hive|stratum\+tcp|monerominer|authedmine)\b/i,
    severity: 'CRITICAL',
    description: 'Cryptocurrency mining signature detected. Drains client CPU/GPU.',
  },

  // 3. Obfuscation & Payloads
  {
    category: 'OBFUSCATION',
    name: 'High-Density Hex String Obfuscation',
    regex: /(?:\\x[0-9a-fA-F]{2}){8,}/,
    severity: 'CRITICAL',
    description: 'Hex-packed string sequences commonly used to hide malicious payloads.',
  },
  {
    category: 'OBFUSCATION',
    name: 'Suspicious base64 decode and execution',
    regex: /(?:window\.)?atob\s*\([^)]+\)\s*[,;)]?\s*(?:eval|\.innerHTML|Function)/i,
    severity: 'CRITICAL',
    description: 'Decoding base64 and passing directly to execution contexts.',
  },

  // 4. Data Exfiltration & Cookie Theft
  {
    category: 'DATA_EXFILTRATION',
    name: 'Direct Cookie or Auth Storage Access',
    regex: /\b(document\.cookie|sessionStorage\.getItem\(["'](?:token|auth|key|password)["']\))/i,
    severity: 'HIGH',
    description: 'Accessing document.cookie or session credentials in an untrusted iframe context.',
  },
  {
    category: 'DATA_EXFILTRATION',
    name: 'Telemetry Beaconing to Non-Arcade Endpoints',
    regex: /navigator\.sendBeacon\s*\(/i,
    severity: 'MEDIUM',
    description: 'Asynchronous beaconing to external servers.',
  },

  // 5. DOM Injection & Remote Scripts
  {
    category: 'DOM_INJECTION',
    name: 'document.write() DOM overwrite',
    regex: /document\.write\s*\(/i,
    severity: 'HIGH',
    description: 'document.write blocks rendering and exposes DOM injection vulnerabilities.',
  },
  {
    category: 'REMOTE_SCRIPTS',
    name: 'External Third-Party Script Ingestion',
    regex: /<script[^>]+src=["'](https?:\/\/(?!(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com))[^"']+)["']/i,
    severity: 'HIGH',
    description: 'Loading arbitrary third-party scripts from unapproved external domains.',
  },

  // 6. Suspicious package.json Lifecycle Hooks
  {
    category: 'SUPPLY_CHAIN',
    name: 'Dangerous package.json install hooks',
    regex: /"(?:preinstall|postinstall|install)"\s*:\s*["'][^"']*(?:curl|wget|bash|sh|powershell|cmd\.exe)[^"']*["']/i,
    severity: 'CRITICAL',
    description: 'package.json contains npm lifecycle hook attempting remote execution.',
  },

  // 7. Background Service Workers
  {
    category: 'PERSISTENCE',
    name: 'Service Worker Registration',
    regex: /navigator\.serviceWorker\.register\s*\(/i,
    severity: 'MEDIUM',
    description: 'Service workers can persist offline caches or background requests.',
  },
];

/**
 * Statically inspects a directory or virtual file map.
 * 
 * @param {string|Object} target - Directory path or { [filename]: content } object
 * @returns {Object} { status, findings, stats, isPermittedForPublication }
 */
export function inspectSecurity(target) {
  const findings = [];
  let totalFilesScanned = 0;

  if (typeof target === 'string') {
    if (!fs.existsSync(target)) {
      return {
        status: 'NEEDS_MANUAL_REVIEW',
        isPermittedForPublication: false,
        findings: [{ severity: 'HIGH', category: 'FILESYSTEM', description: `Path not found: ${target}` }],
        stats: { totalFiles: 0, critical: 0, high: 1, medium: 0, low: 0 },
      };
    }

    function scan(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (/\.(html|js|mjs|cjs|ts|json|svg)$/i.test(entry.name)) {
          totalFilesScanned++;
          const content = fs.readFileSync(fullPath, 'utf-8');
          scanFileContent(path.relative(target, fullPath), content);
        }
      }
    }
    scan(target);
  } else if (typeof target === 'object' && target !== null) {
    // Virtual file map: { 'index.html': '...', 'main.js': '...' }
    for (const [filename, content] of Object.entries(target)) {
      totalFilesScanned++;
      scanFileContent(filename, content);
    }
  }

  function scanFileContent(filename, content) {
    const lines = content.split('\n');
    STATIC_SECURITY_RULES.forEach((rule) => {
      lines.forEach((line, idx) => {
        if (rule.regex.test(line)) {
          findings.push({
            severity: rule.severity,
            category: rule.category,
            name: rule.name,
            file: filename,
            line: idx + 1,
            snippet: line.trim().slice(0, 100),
            description: rule.description,
          });
        }
      });
    });
  }

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  let status = 'PASSED';
  let isPermittedForPublication = true;

  if (criticalCount > 0) {
    status = 'REJECTED';
    isPermittedForPublication = false;
  } else if (highCount > 0) {
    status = 'SECURITY_REVIEW';
    isPermittedForPublication = false;
  } else if (mediumCount > 0) {
    status = 'NEEDS_MANUAL_REVIEW';
    isPermittedForPublication = false; // requires human review
  }

  return {
    status,
    isPermittedForPublication,
    findings,
    stats: {
      totalFiles: totalFilesScanned,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
    },
    disclaimer: 'Automated static security analysis is a risk-reduction gate, not proof of complete malware absence.',
  };
}