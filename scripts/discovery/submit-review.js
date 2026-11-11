/**
 * submit-review.js
 *
 * Prepares review metadata for the daily discovery pipeline.
 *
 * IMPORTANT: This module performs NO git commits, pushes, branch creation, or
 * Pull Request creation. In CI (GitHub Actions) the single authoritative PR
 * mechanism is peter-evans/create-pull-request@v6 in the workflow file.
 * This module only reports status and prints manual instructions for local use.
 *
 * CRITICAL RULE: Human review is strictly mandatory before any game is published.
 */

import path from 'path';
import { execSync } from 'node:child_process';

export function submitReview(reportData = {}) {
  const runDate = reportData.runDate || new Date().toISOString().split('T')[0];
  const branchName = `discovery/daily-${runDate}`;
  const commitMessage = `feat(discovery): daily game candidate review for ${runDate} [skip ci]`;

  console.log(`\n🚀 [SUBMIT REVIEW] Preparing daily candidate review bundle for ${runDate}...`);

  // Read-only detection of git/remote (no mutations).
  let isGitRepo = false;
  let hasRemote = false;
  let remoteUrl = '';
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    isGitRepo = true;
    const remotes = execSync('git remote -v', { stdio: 'pipe' }).toString().trim();
    if (remotes.length > 0) {
      hasRemote = true;
      remoteUrl = remotes.split('\n')[0];
    }
  } catch {
    isGitRepo = false;
  }

  console.log(`ℹ️ Git Repository Detected: ${isGitRepo ? 'YES' : 'NO'}`);
  console.log(`ℹ️ Git Remote Configured: ${hasRemote ? remoteUrl : 'NONE (Local Only)'}`);

  if (reportData.dryRun) {
    console.log(`🧪 Dry run: no files staged, no branches pushed, no PR created.`);
    return { success: true, prCreated: false, dryRun: true, branch: branchName };
  }

  // Honest manual instructions (no false notifications, no git mutations).
  console.log(`\n📋 [MANUAL REMOTE DISPATCH INSTRUCTIONS]`);
  console.log(`The daily review report is generated at: ${reportData.reportPathMd || `discovery/reports/${runDate}-discovery-report.md`}`);
  console.log(`To publish this review as a GitHub Pull Request from your local machine:`);
  console.log(`  1. git checkout -b ${branchName}`);
  console.log(`  2. git add discovery/ src/data/discoveryRegistry.json`);
  console.log(`  3. git commit -m "${commitMessage}"`);
  console.log(`  4. git remote add origin https://github.com/<your-username>/GLOBAL-ARCADE.git (if not already set)`);
  console.log(`  5. git push -u origin ${branchName}`);
  console.log(`  6. Open Pull Request on GitHub: https://github.com/<your-username>/GLOBAL-ARCADE/compare/${branchName}`);
  console.log(`\nNotice: Zero false notifications dispatched. Human approval remains in full control.\n`);

  return { success: true, prCreated: false, branch: branchName, localReady: true };
}