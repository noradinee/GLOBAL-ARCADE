import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';
import { executeCandidateRepair } from '../scripts/discovery/repair-engine.js';
import {
  analyzeCandidateIssues,
  ISSUE_CATEGORIES,
  SEVERITY_LEVELS,
  CONFIDENCE_LEVELS,
  ACTION_TYPES,
} from '../scripts/discovery/explain-and-solve.js';

function createTempDir(prefix = 'ga-phase6-verify-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function setupTestEnvironment(baseDir) {
  fs.mkdirSync(path.join(baseDir, 'discovery/candidates'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/staging'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/rejected'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'discovery/patches'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'public/games'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'data'), { recursive: true });

  fs.writeFileSync(
    path.join(baseDir, 'src/data/games.json'),
    JSON.stringify([
      { id: 'pilot-2048', slug: 'pilot-2048', title: '2048', status: 'active' }
    ], null, 2)
  );
  fs.writeFileSync(path.join(baseDir, 'data/audit-logs.json'), JSON.stringify([], null, 2));
}

const results = [];

function recordTest(category, name, command, expected, actual, status, details = '') {
  results.push({ category, name, command, expected, actual, status, details });
  const icon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⚠️');
  console.log(`${icon} [${status}] ${category}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('KYRAXO PHASE 6 FINAL ACCEPTANCE VERIFICATION (READ-ONLY / ISOLATED)');
  console.log('================================================================\n');

  // ============================================================================
  // 1. PUBLISH NOW VERIFICATION (Disposable Candidate in Isolated Temp Workspace)
  // ============================================================================
  console.log('--- SECTION 1: PUBLISH NOW VERIFICATION ---');
  const env1 = createTempDir('p6-verify-publish-');
  try {
    setupTestEnvironment(env1);

    const candidateId = 'gh-disposable-gpl-game';
    const originalQualification = {
      technical: { status: 'FAILED', notes: 'Automated screening failed' },
      security: { status: 'SECURITY_REVIEW', notes: 'Suspicious dynamic constructs' },
      legal: { status: 'RESTRICTED', commercialRedistributionAllowed: false },
      editorial: { status: 'REJECTED', notes: 'Non-permissive copyleft license' },
    };

    const candidateDossier = {
      candidateId,
      name: 'Disposable GPL Game',
      author: 'indie-tester',
      sourcePlatform: 'github',
      originalRepoUrl: 'https://github.com/indie-tester/gpl-game',
      licenseName: 'GPL-3.0',
      lifecycleStatus: 'REJECTED',
      technicalAcceptance: 'REJECTED',
      publicationEligibility: 'INELIGIBLE',
      reviewerDecision: 'REJECT',
      scores: { totalScore: 38 },
      qualification: originalQualification,
      exactCommitHash: 'd15p05ab1e',
    };

    fs.writeFileSync(
      path.join(env1, `discovery/candidates/${candidateId}.json`),
      JSON.stringify(candidateDossier, null, 2)
    );

    const stagingDir = path.join(env1, `discovery/staging/${candidateId}`);
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.writeFileSync(
      path.join(stagingDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>GPL Game</title></head><body><canvas id="game"></canvas></body></html>'
    );
    fs.writeFileSync(path.join(stagingDir, 'game.js'), 'console.log("running disposable gpl game");');

    // Test 1.1: Authenticated owner publication despite failed qualification gates
    try {
      const publishRes = safeImportCandidate(candidateId, {
        rootDir: env1,
        ownerDirectPublish: true,
        owner: 'verified-owner-acceptance',
      });

      const publishedInCatalog = JSON.parse(fs.readFileSync(path.join(env1, 'src/data/games.json'), 'utf-8'));
      const entry = publishedInCatalog.find(g => g.slug === 'disposable-gpl-game');

      if (publishRes.success && entry && entry.publishedBy === 'verified-owner-acceptance') {
        recordTest(
          'PUBLISH NOW',
          'Owner Direct Publish despite failed automated qualification gates',
          'safeImportCandidate(id, { ownerDirectPublish: true, owner })',
          'Candidate published immediately to catalog with owner attribution',
          `Published successfully: slug=${entry.slug}, publishedBy=${entry.publishedBy}`,
          'PASS',
          'Bypassed all qualification gates (Technical, Security, Legal, Editorial).'
        );
      } else {
        recordTest('PUBLISH NOW', 'Owner Direct Publish', 'safeImportCandidate', 'success=true', 'failed', 'FAIL');
      }

      // Test 1.2: All bypassed findings visible and recorded in audit log
      const auditLog = JSON.parse(fs.readFileSync(path.join(env1, 'data/audit-logs.json'), 'utf-8'));
      const publishAudit = auditLog.find(l => l.action === 'OWNER_DIRECT_PUBLISH');

      const hasBypassedInResult = Array.isArray(publishRes.bypassedFindings) && publishRes.bypassedFindings.length >= 2;
      const hasBypassedInAudit = publishAudit && Array.isArray(publishAudit.bypassedFindings) && publishAudit.bypassedFindings.length >= 2;

      if (hasBypassedInResult && hasBypassedInAudit) {
        recordTest(
          'PUBLISH NOW',
          'Bypassed findings visibility & audit log recording',
          'audit-logs.json inspection',
          'Bypassed findings recorded in publish result and audit log',
          `Recorded ${publishAudit.bypassedFindings.length} bypassed finding(s) in audit log`,
          'PASS',
          `Findings: ${publishAudit.bypassedFindings.join(' | ')}`
        );
      } else {
        recordTest('PUBLISH NOW', 'Bypassed findings recording', 'audit log check', 'Recorded findings', 'Missing findings', 'FAIL');
      }

      // Test 1.3: Original qualification results preserved
      const updatedDossier = JSON.parse(fs.readFileSync(path.join(env1, `discovery/candidates/${candidateId}.json`), 'utf-8'));
      const origPreserved = (
        updatedDossier.qualification &&
        updatedDossier.qualification.technical.status === 'FAILED' &&
        updatedDossier.qualification.legal.status === 'RESTRICTED' &&
        updatedDossier.ownerDirectPublish === true
      );

      if (origPreserved) {
        recordTest(
          'PUBLISH NOW',
          'Preservation of original qualification results',
          'candidate dossier qualification inspection',
          'Original qualification gate statuses preserved alongside ownerDirectPublish flag',
          'Original qualification retained (Technical=FAILED, Legal=RESTRICTED, ownerDirectPublish=true)',
          'PASS'
        );
      } else {
        recordTest('PUBLISH NOW', 'Preservation of qualification', 'dossier check', 'Preserved', 'Overwritten', 'FAIL');
      }

    } catch (err) {
      recordTest('PUBLISH NOW', 'Owner Direct Publish execution', 'safeImportCandidate', 'Success', err.message, 'FAIL');
    }

    // Test 1.4: Unauthorized users cannot invoke publication without authorization
    try {
      assert.throws(() => {
        safeImportCandidate(candidateId, { rootDir: env1, ownerDirectPublish: false });
      }, /failed Technical gate|failed Legal gate/);

      recordTest(
        'PUBLISH NOW',
        'Unauthorized / automated routine publication strictly gated',
        'safeImportCandidate(id, { ownerDirectPublish: false })',
        'Automated qualification gate enforces failure and halts publication',
        'Correctly blocked with qualification gate exception',
        'PASS'
      );
    } catch (err) {
      recordTest('PUBLISH NOW', 'Gate enforcement', 'safeImportCandidate', 'Blocked', err.message, 'FAIL');
    }

    // Test 1.5: Technical blocker prevention & transactional rollback
    const brokenId = 'gh-disposable-no-html';
    const brokenDossier = {
      candidateId: brokenId,
      name: 'Disposable No HTML Game',
      author: 'broken',
      sourcePlatform: 'github',
      licenseName: 'MIT',
      lifecycleStatus: 'NEEDS_OWNER_REVIEW',
    };
    fs.writeFileSync(path.join(env1, `discovery/candidates/${brokenId}.json`), JSON.stringify(brokenDossier, null, 2));
    const brokenStaging = path.join(env1, `discovery/staging/${brokenId}`);
    fs.mkdirSync(brokenStaging, { recursive: true });
    fs.writeFileSync(path.join(brokenStaging, 'data.bin'), 'non-web binary');

    const catalogBefore = fs.readFileSync(path.join(env1, 'src/data/games.json'), 'utf-8');

    let threwTechnicalBlocker = false;
    let blockerMsg = '';
    try {
      safeImportCandidate(brokenId, {
        rootDir: env1,
        ownerDirectPublish: true,
        owner: 'verified-owner-acceptance',
      });
    } catch (err) {
      if (err.message.includes('TECHNICAL BLOCKER')) {
        threwTechnicalBlocker = true;
        blockerMsg = err.message;
      }
    }

    const catalogAfter = fs.readFileSync(path.join(env1, 'src/data/games.json'), 'utf-8');
    const folderExists = fs.existsSync(path.join(env1, 'public/games/disposable-no-html'));

    if (threwTechnicalBlocker && catalogBefore === catalogAfter && !folderExists) {
      recordTest(
        'PUBLISH NOW',
        'Technical blocker enforcement & transactional rollback',
        'safeImportCandidate with missing HTML entry point',
        'Throws TECHNICAL BLOCKER, rolls back transaction, catalog and public/games untouched',
        `Correctly aborted: "${blockerMsg}". Catalog untouched; no corrupt folder created.`,
        'PASS'
      );
    } else {
      recordTest('PUBLISH NOW', 'Technical blocker & rollback', 'safeImportCandidate', 'Rollback cleanly', 'Failed rollback', 'FAIL');
    }

  } finally {
    fs.rmSync(env1, { recursive: true, force: true });
  }

  // ============================================================================
  // 2. FIX ISSUES VERIFICATION (Disposable Candidate in Isolated Temp Workspace)
  // ============================================================================
  console.log('\n--- SECTION 2: FIX ISSUES VERIFICATION ---');
  const env2 = createTempDir('p6-verify-fix-');
  try {
    setupTestEnvironment(env2);

    const candidateId = 'gh-disposable-fix-candidate';
    const candidateDossier = {
      candidateId,
      name: 'Disposable Fix Candidate',
      author: 'fix-dev',
      sourcePlatform: 'github',
      licenseName: 'MIT',
      lifecycleStatus: 'NEEDS_OWNER_REVIEW',
      exactCommitHash: 'fix777a',
    };
    fs.writeFileSync(path.join(env2, `discovery/candidates/${candidateId}.json`), JSON.stringify(candidateDossier, null, 2));

    const stagingDir = path.join(env2, `discovery/staging/${candidateId}`);
    fs.mkdirSync(path.join(stagingDir, 'dist'), { recursive: true });

    const originalDefectiveHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Defective Game</title>
  <script src="/scripts/engine.js"></script>
</head>
<body>
  <script>if (top.location != self.location) top.location = self.location;</script>
  <canvas id="cv"></canvas>
</body>
</html>`;
    fs.writeFileSync(path.join(stagingDir, 'dist/index.html'), originalDefectiveHtml);

    // Execute repair
    const repairResult = await executeCandidateRepair(candidateId, { rootDir: env2, owner: 'test-owner' });

    // Test 2.1: The original snapshot remains unchanged (.original/)
    const snapshotFile = path.join(stagingDir, '.original/dist/index.html');
    const snapshotExists = fs.existsSync(snapshotFile);
    const snapshotContent = snapshotExists ? fs.readFileSync(snapshotFile, 'utf-8') : '';
    const snapshotMatchesOriginal = snapshotContent === originalDefectiveHtml;

    if (snapshotExists && snapshotMatchesOriginal) {
      recordTest(
        'FIX ISSUES',
        'Pristine snapshot creation (.original/ preservation)',
        'Check .original/dist/index.html',
        'Pristine snapshot exists and is byte-identical to pre-repair source',
        'Snapshot verified: untouched original file preserved',
        'PASS'
      );
    } else {
      recordTest('FIX ISSUES', 'Snapshot preservation', 'Check .original/', 'Identical', 'Modified or missing', 'FAIL');
    }

    // Test 2.2: Repairs applied only to isolated working copy
    const workingDistIndex = fs.readFileSync(path.join(stagingDir, 'dist/index.html'), 'utf-8');
    const workingModified = workingDistIndex !== originalDefectiveHtml;
    const hasRelativePaths = workingDistIndex.includes('src="./scripts/engine.js"');
    const hasFrameNeutralized = workingDistIndex.includes('/* neutral-frame */') || workingDistIndex.includes('[NEUTRALIZED FRAME BUSTER]');
    const rootTrampolineCreated = fs.existsSync(path.join(stagingDir, 'index.html'));

    if (workingModified && hasRelativePaths && hasFrameNeutralized && rootTrampolineCreated) {
      recordTest(
        'FIX ISSUES',
        'Targeted repairs applied to working copy',
        'Inspect working copy files',
        'Repairs applied: relative path rewritten, frame-buster neutralized, root trampoline created',
        'All automated repairs confirmed in working files',
        'PASS',
        'Trampoline created, path rewritten to "./scripts/engine.js", frame buster neutralized.'
      );
    } else {
      recordTest('FIX ISSUES', 'Repairs application', 'Inspect working files', 'Repairs present', 'Missing repairs', 'FAIL');
    }

    // Test 2.3: Repair results and changed files recorded
    const patchPath = path.join(env2, `discovery/patches/${candidateId}.patch.json`);
    const patchExists = fs.existsSync(patchPath);
    let patchData = null;
    if (patchExists) {
      patchData = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));
    }

    const dossierAfter = JSON.parse(fs.readFileSync(path.join(env2, `discovery/candidates/${candidateId}.json`), 'utf-8'));
    const dossierHasRepairs = (dossierAfter.repairs && typeof dossierAfter.repairs === 'object') || (Array.isArray(dossierAfter.repairHistory) && dossierAfter.repairHistory.length > 0);
    const patchCount = (patchData?.patchesApplied || patchData?.appliedPatches || []).length;

    if (patchExists && patchCount > 0 && dossierHasRepairs) {
      recordTest(
        'FIX ISSUES',
        'Repair results and changed files recorded',
        'discovery/patches/*.patch.json and candidate dossier',
        'Patch receipt created with applied patches, files changed, and dossier updated',
        `Recorded ${patchCount} patches in patch JSON and dossier repairs array`,
        'PASS'
      );
    } else {
      recordTest('FIX ISSUES', 'Repair receipt', 'Patch file & dossier', 'Recorded', 'Missing record', 'FAIL');
    }

    // Test 2.4: Failed repairs rollback capability
    let rollbackSuccess = false;
    try {
      if (fs.existsSync(snapshotFile)) {
        fs.copyFileSync(snapshotFile, path.join(stagingDir, 'dist/index.html'));
        const restoredContent = fs.readFileSync(path.join(stagingDir, 'dist/index.html'), 'utf-8');
        rollbackSuccess = restoredContent === originalDefectiveHtml;
      }
    } catch (e) {
      rollbackSuccess = false;
    }

    if (rollbackSuccess) {
      recordTest(
        'FIX ISSUES',
        'Rollback capability from .original/ snapshot',
        'Simulate restore from .original/dist/index.html',
        'Working copy cleanly reverts to original defective state',
        'Revert succeeded: byte-identical to original',
        'PASS'
      );
    } else {
      recordTest('FIX ISSUES', 'Rollback capability', 'Restore from .original/', 'Success', 'Failed', 'FAIL');
    }

    // Test 2.5: CRITICAL INVARIANT: Repair never triggers automatic publication
    const gamesCatalog = JSON.parse(fs.readFileSync(path.join(env2, 'src/data/games.json'), 'utf-8'));
    const publishedGame = gamesCatalog.find(g => g.id === candidateId || g.slug === 'disposable-fix-candidate');
    const statusRemainsReview = dossierAfter.lifecycleStatus === 'NEEDS_OWNER_REVIEW';
    const statusNotPublished = dossierAfter.lifecycleStatus !== 'PUBLISHED';

    if (!publishedGame && statusRemainsReview && statusNotPublished) {
      recordTest(
        'FIX ISSUES',
        'CRITICAL INVARIANT: Repair NEVER triggers automatic publication',
        'Inspect games.json and candidate lifecycleStatus',
        'Candidate retained in NEEDS_OWNER_REVIEW; games.json untouched; NOT PUBLISHED',
        `LifecycleStatus: "${dossierAfter.lifecycleStatus}", Catalog games count: ${gamesCatalog.length} (no candidate auto-published)`,
        'PASS'
      );
    } else {
      recordTest('FIX ISSUES', 'No auto-publish invariant', 'Inspect games.json & lifecycle', 'Not published', 'Auto-published!', 'FAIL');
    }

  } finally {
    fs.rmSync(env2, { recursive: true, force: true });
  }

  // ============================================================================
  // 3. EXPLAIN & SOLVE VERIFICATION ACROSS ALL 12 ISSUE CATEGORIES
  // ============================================================================
  console.log('\n--- SECTION 3: EXPLAIN & SOLVE (12 CATEGORIES VERIFICATION) ---');

  const required12Categories = [
    'JAVASCRIPT_RUNTIME',
    'MISSING_ASSETS',
    'INCORRECT_PATHS',
    'DEPENDENCY_CONFLICTS',
    'BROWSER_COMPATIBILITY',
    'MOBILE_RESPONSIVENESS',
    'IFRAME_SANDBOX',
    'PERFORMANCE_LOADING',
    'EXTERNAL_NETWORK',
    'LICENSE_ATTRIBUTION',
    'SECURITY_FINDINGS',
    'BUILD_PACKAGING',
  ];

  // Test category enum definition
  for (const cat of required12Categories) {
    const isDefined = ISSUE_CATEGORIES[cat] === cat;
    if (isDefined) {
      recordTest(
        'EXPLAIN & SOLVE [ENUM]',
        `Category Enum defined: ${cat}`,
        `ISSUE_CATEGORIES.${cat}`,
        `'${cat}'`,
        `'${ISSUE_CATEGORIES[cat]}'`,
        'PASS'
      );
    } else {
      recordTest('EXPLAIN & SOLVE [ENUM]', `Category Enum: ${cat}`, `ISSUE_CATEGORIES.${cat}`, cat, 'UNDEFINED', 'FAIL');
    }
  }

  // Helper to audit Sections A-F Contract
  function auditContract(issue) {
    const hasA = issue.id && issue.title && issue.category && issue.severity && issue.affectedFile && issue.exactEvidence;
    const hasB = issue.explanation && issue.explanation.plainLanguage && issue.explanation.whyItMatters && issue.explanation.confirmedVsPossible;
    const hasC = issue.rootCauseAnalysis && Array.isArray(issue.rootCauseAnalysis.causes) && issue.rootCauseAnalysis.causes.length > 0 && issue.rootCauseAnalysis.causes[0].confidence;
    const hasD = issue.recommendedSolutions && issue.recommendedSolutions.primary && issue.recommendedSolutions.primary.title && typeof issue.recommendedSolutions.primary.canAutomate === 'boolean';
    const hasE = Array.isArray(issue.actions) && issue.actions.length > 0;
    const hasF = issue.verification && issue.verification.status;
    return hasA && hasB && hasC && hasD && hasE && hasF;
  }

  // Test 1: Candidate with missing entry / subfolder entry to verify BUILD_PACKAGING
  const envBuild = createTempDir('p6-verify-build-');
  try {
    setupTestEnvironment(envBuild);
    const candidateBuild = {
      candidateId: 'gh-build-test',
      name: 'Build Test Game',
      author: 'dev',
      sourcePlatform: 'github',
      licenseName: 'MIT',
    };
    const stagingBuild = path.join(envBuild, 'discovery/staging/gh-build-test');
    fs.mkdirSync(path.join(stagingBuild, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(stagingBuild, 'dist/index.html'), '<html><body>Game in dist</body></html>');

    const diagBuild = analyzeCandidateIssues(candidateBuild, { rootDir: envBuild, stagingDir: stagingBuild });
    const buildIssue = diagBuild.issues.find(i => i.category === ISSUE_CATEGORIES.BUILD_PACKAGING);
    if (buildIssue && auditContract(buildIssue)) {
      recordTest(
        'EXPLAIN & SOLVE [CONTRACT]',
        'Category BUILD_PACKAGING Contract Compliance (Sections A-F)',
        'analyzeCandidateIssues on subfolder entry repository',
        'Includes Evidence, Confirmed vs Suspected, Confidence, Solutions, Safe Automate Flag, Verification',
        `PASS: Title="${buildIssue.title}", Confidence="${buildIssue.rootCauseAnalysis.causes[0].confidence}", Automate=${buildIssue.recommendedSolutions.primary.canAutomate}, Verification=${buildIssue.verification.status}`,
        'PASS'
      );
    } else {
      recordTest('EXPLAIN & SOLVE [CONTRACT]', 'Category BUILD_PACKAGING Contract Compliance', 'analyzeCandidateIssues', 'Valid A-F contract', 'Missing fields', 'FAIL');
    }
  } finally {
    fs.rmSync(envBuild, { recursive: true, force: true });
  }

  // Test 2: Multi-issue candidate fixture to test INCORRECT_PATHS, MOBILE_RESPONSIVENESS, IFRAME_SANDBOX, EXTERNAL_NETWORK, LICENSE_ATTRIBUTION, SECURITY_FINDINGS
  const envMulti = createTempDir('p6-verify-multi-');
  try {
    setupTestEnvironment(envMulti);
    const candidate = {
      candidateId: 'gh-multi-audit',
      name: 'Multi Audit Game',
      author: 'author',
      sourcePlatform: 'github',
      licenseName: 'GPL-3.0',
      assetLicensingStatus: 'UNSPECIFIED',
      assetLicensingNotes: 'Audio origin unverified.',
      securityFindings: [
        {
          ruleId: 'SEC-DYNAMIC-EVAL',
          name: 'Dynamic Code Execution (eval)',
          severity: 'CRITICAL',
          file: 'src/eval.js',
          snippet: 'eval(remotePayload);',
          description: 'Use of eval with remote data',
        },
      ],
    };

    const stagingDir = path.join(envMulti, 'discovery/staging/gh-multi-audit');
    fs.mkdirSync(stagingDir, { recursive: true });

    const defectiveHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Diagnostic Game</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="/js/app.js"></script>
</head>
<body>
  <script>if (top.location != self.location) top.location = self.location;</script>
  <canvas id="c"></canvas>
</body>
</html>`;
    fs.writeFileSync(path.join(stagingDir, 'index.html'), defectiveHtml);

    const diagnosis = analyzeCandidateIssues(candidate, { rootDir: envMulti, stagingDir });

    const categoriesTestedInMulti = [
      'INCORRECT_PATHS',
      'MOBILE_RESPONSIVENESS',
      'IFRAME_SANDBOX',
      'EXTERNAL_NETWORK',
      'LICENSE_ATTRIBUTION',
      'SECURITY_FINDINGS',
    ];

    for (const cat of categoriesTestedInMulti) {
      const match = diagnosis.issues.find(i => i.category === cat);
      if (match && auditContract(match)) {
        recordTest(
          'EXPLAIN & SOLVE [CONTRACT]',
          `Category ${cat} Contract Compliance (Sections A-F)`,
          `analyzeCandidateIssues -> issues.find(cat === '${cat}')`,
          'Includes Evidence, Confirmed vs Suspected, Confidence, Solutions, Safe Automate Flag, Verification',
          `PASS: Title="${match.title}", Confidence="${match.rootCauseAnalysis.causes[0].confidence}", Automate=${match.recommendedSolutions.primary.canAutomate}, Verification=${match.verification.status}`,
          'PASS'
        );
      } else {
        recordTest('EXPLAIN & SOLVE [CONTRACT]', `Category ${cat} Contract Compliance`, 'Contract check', 'Complete A-F fields', match ? 'Incomplete' : 'Not found', 'FAIL');
      }
    }

    // Remaining 5 categories check
    const remainingCategories = [
      'JAVASCRIPT_RUNTIME',
      'MISSING_ASSETS',
      'DEPENDENCY_CONFLICTS',
      'BROWSER_COMPATIBILITY',
      'PERFORMANCE_LOADING',
    ];

    for (const cat of remainingCategories) {
      recordTest(
        'EXPLAIN & SOLVE [GENERATION]',
        `Category ${cat} Diagnostic Rule Active in Catalog`,
        `Candidate rule check for ${cat}`,
        'Defined in ISSUE_CATEGORIES enum and supported in platform diagnostics catalog',
        `Enum constant active: ISSUE_CATEGORIES.${cat}="${cat}". Static staging scanner does not trigger in current test fixture without live runtime trace or webpack compilation defect.`,
        'NOT TESTED',
        'Limitation: Trigger conditions for runtime stack trace / bundler lockfile / WebGL deprecated extensions require dynamic execution or build logs not simulated in static AST pass.'
      );
    }

  } finally {
    fs.rmSync(envMulti, { recursive: true, force: true });
  }

  // Summary
  console.log('\n================================================================');
  console.log('ACCEPTANCE VERIFICATION SUITE SUMMARY');
  console.log('================================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const notTestedCount = results.filter(r => r.status === 'NOT TESTED').length;

  console.log(`TOTAL TESTS:   ${results.length}`);
  console.log(`PASSED:        ${passCount}`);
  console.log(`FAILED:        ${failCount}`);
  console.log(`NOT TESTED:    ${notTestedCount}`);
  console.log('================================================================\n');

  return { total: results.length, passCount, failCount, notTestedCount, results };
}

runVerification().catch(err => {
  console.error('Fatal verification runner error:', err);
  process.exit(1);
});
