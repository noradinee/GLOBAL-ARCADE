/**
 * generate-report.js
 * 
 * Generates Daily Candidate Discovery Reports (Markdown & JSON) for GLOBAL-ARCADE.
 * 
 * Provides a structured review document with score breakdowns, licensing and security
 * gate statuses, risk analyses, and actionable review checklists for human maintainers.
 */

import fs from 'fs';
import path from 'path';

/**
 * Generates markdown and JSON reports for discovered candidates.
 * 
 * @param {Array} evaluatedCandidates - Candidates with license, security, and score evaluations
 * @param {Object} metadata - Run metadata (date, duration, sources)
 * @returns {Object} { reportPathMd, reportPathJson, markdownContent }
 */
export function generateDailyReport(evaluatedCandidates, metadata = {}) {
  const runDate = metadata.date || new Date().toISOString().split('T')[0];
  const reportsDir = path.resolve(process.cwd(), 'discovery/reports');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const approved = evaluatedCandidates.filter(c => c.reviewerDecision === 'APPROVE');
  const needsInfo = evaluatedCandidates.filter(c => c.reviewerDecision === 'REQUEST_MORE_INFORMATION');
  const rejected = evaluatedCandidates.filter(c => c.reviewerDecision === 'REJECT');

  let md = `# 🕹️ GLOBAL ARCADE — Daily Game Discovery Report (${runDate})\n\n`;
  md += `> **CRITICAL POLICY REMINDER**: No discovered game is ever published automatically. Human review and explicit approval via GitHub Pull Request is strictly required before any code enters \`src/data/games.json\`.\n\n`;

  md += `## 📊 Executive Summary\n\n`;
  md += `| Total Evaluated | Recommended for Approval | Request More Info | Rejected / Ineligible |\n`;
  md += `| :---: | :---: | :---: | :---: | \n`;
  md += `| **${evaluatedCandidates.length}** | **${approved.length}** 🟢 | **${needsInfo.length}** 🟡 | **${rejected.length}** 🔴 |\n\n`;

  md += `* **Run Timestamp**: \`${new Date().toISOString()}\`\n`;
  md += `* **Discovery Sources**: GitHub API, itch.io Web Feed, Open Game Repositories\n`;
  md += `* **Execution Mode**: Automated Scheduled Discovery Gate\n\n`;

  // Section 1: Candidates Recommended for Approval
  md += `## 🟢 Candidates Recommended for Approval (${approved.length})\n\n`;
  if (approved.length === 0) {
    md += `_No candidates met all strict criteria for automatic approval recommendation today._\n\n`;
  } else {
    approved.forEach((c, idx) => {
      md += renderCandidateCard(c, idx + 1, 'APPROVE');
    });
  }

  // Section 2: Candidates Requiring More Information
  md += `## 🟡 Candidates Requiring Manual Review (${needsInfo.length})\n\n`;
  if (needsInfo.length === 0) {
    md += `_No candidates in pending review state today._\n\n`;
  } else {
    needsInfo.forEach((c, idx) => {
      md += renderCandidateCard(c, idx + 1, 'REQUEST_MORE_INFORMATION');
    });
  }

  // Section 3: Ineligible / Rejected Candidates
  md += `## 🔴 Ineligible & Rejected Candidates (${rejected.length})\n\n`;
  if (rejected.length === 0) {
    md += `_No rejected candidates in this run._\n\n`;
  } else {
    rejected.forEach((c, idx) => {
      md += renderCandidateCard(c, idx + 1, 'REJECT');
    });
  }

  // Section 4: Human Review Checklist
  md += `## ✅ Maintainer Review Checklist\n\n`;
  md += `Prior to merging any candidate into the production catalog:\n\n`;
  md += `- [ ] **Verify License**: Check repository for dedicated \`LICENSE\` file and verify no restrictive clauses.\n`;
  md += `- [ ] **Asset Provenance**: Ensure sprites, music, and sound effects are either CC0/MIT or procedurally generated.\n`;
  md += `- [ ] **Manual Playtest**: Launch the game in a sandboxed browser tab to verify responsive mobile touch and desktop keyboard controls.\n`;
  md += `- [ ] **Arabic Readiness**: Confirm game title, instructions, and description can be translated cleanly into Arabic.\n`;
  md += `- [ ] **Approve & Import**: Run \`npm run discover:import -- <candidateId>\` to securely pull the exact verified commit.\n\n`;

  md += `---\n`;
  md += `*Report generated automatically by Global Arcade Discovery Engine.*\n`;

  // Save files
  const reportPathMd = path.join(reportsDir, `${runDate}-discovery-report.md`);
  const reportPathJson = path.join(reportsDir, `${runDate}-discovery-report.json`);

  fs.writeFileSync(reportPathMd, md, 'utf-8');
  fs.writeFileSync(reportPathJson, JSON.stringify({
    runDate,
    generatedAt: new Date().toISOString(),
    summary: {
      total: evaluatedCandidates.length,
      approved: approved.length,
      needsInfo: needsInfo.length,
      rejected: rejected.length,
    },
    candidates: evaluatedCandidates,
  }, null, 2), 'utf-8');

  console.log(`📄 Generated Daily Report: ${reportPathMd}`);
  console.log(`📄 Generated Machine-Readable Report: ${reportPathJson}`);

  return { reportPathMd, reportPathJson, markdownContent: md };
}

function renderCandidateCard(c, index, status) {
  const scores = c.scores || {};
  let card = `### ${index}. ${c.name} (\`${c.candidateId}\`)\n\n`;
  card += `- **Source URL**: [${c.originalRepoUrl}](${c.originalRepoUrl})\n`;
  card += `- **Developer / Author**: \`${c.author}\`\n`;
  card += `- **Game Engine**: ${c.gameEngine || 'HTML5 / JS'}\n`;
  card += `- **Language**: ${c.programmingLanguage || 'JavaScript'}\n`;
  card += `- **Discovery Reason**: Verified open-source candidate with active community traction.\n`;
  card += `- **Popularity Signals**: ${c.popularityIndicators?.githubStars || 0} ⭐ Stars, ${c.popularityIndicators?.forks || 0} 🍴 Forks, ~${c.popularityIndicators?.communityPlays || 0} plays (${c.popularityIndicators?.signalsSource || 'Public API'}, ${c.popularityIndicators?.signalsDate || c.discoveryDate})\n`;
  card += `- **License Status**: \`${c.licensingStatus}\` (${c.licenseName}) — [License Link](${c.licenseUrl})\n`;
  card += `- **Security Audit Gate**: \`${c.securityStatus}\` (${(c.securityFindings || []).length} findings)\n`;
  card += `- **Mobile Support**: ${c.mobileCompatibility ? '✅ Touch Enabled' : '⚠️ Desktop Keyboard'}\n`;
  card += `- **Composite Score**: **${scores.totalScore || 0} / 100** (Popularity: ${scores.popularityScore || 0}/25, Tech: ${scores.technicalQualityScore || 0}/20, Mobile: ${scores.mobileScore || 0}/15, Maintenance: ${scores.maintenanceScore || 0}/15, Relevance: ${scores.relevanceScore || 0}/15, Standalone: ${scores.standaloneScore || 0}/10)\n`;

  if (c.securityFindings && c.securityFindings.length > 0) {
    card += `\n**Security Observations**:\n`;
    c.securityFindings.forEach(f => {
      card += `  - \`[${f.severity}]\` **${f.name || f.category}**: ${f.description || f.snippet || ''}\n`;
    });
  }

  card += `\n**Recommended Decision**: \`${c.reviewerDecision}\` | **Eligibility**: \`${c.publicationEligibility}\`\n\n`;
  card += `> **Maintainer Action**: ${getActionAdvice(c.reviewerDecision)}\n\n`;
  card += `---\n\n`;
  return card;
}

function getActionAdvice(decision) {
  switch (decision) {
    case 'APPROVE':
      return 'Eligible for staging. Ready for maintainer playtest and safe import into catalog.';
    case 'REQUEST_MORE_INFORMATION':
      return 'Check asset licensing or test in isolated sandbox before making an import decision.';
    case 'REJECT':
      return 'Do not import. Failed either commercial licensing whitelist or security gate.';
    default:
      return 'Requires human maintainer review.';
  }
}