/**
 * score-candidates.js
 * 
 * Transparent Multi-Factor Candidate Scoring Engine for GLOBAL-ARCADE.
 * 
 * Evaluates candidate games across 6 quantifiable dimensions (0-100 total):
 * 1. Popularity & Current Interest (0 - 25)
 * 2. Technical Quality & Browser Compatibility (0 - 20)
 * 3. Mobile & Touch Support (0 - 15)
 * 4. Maintenance & Activity (0 - 15)
 * 5. Audience Relevance (0 - 15)
 * 6. Standalone / Zero-Build Readiness (0 - 10)
 * 
 * CRITICAL RULE: High popularity CANNOT compensate for licensing or security failures.
 * Licensing and Security are independent mandatory gates.
 */

export function scoreCandidate(candidate, licenseResult, securityResult, qualityResult = null) {
  const breakdown = {
    popularityScore: 0,
    technicalQualityScore: 0,
    mobileScore: 0,
    maintenanceScore: 0,
    relevanceScore: 0,
    standaloneScore: 0,
    totalScore: 0,
  };

  const indicators = candidate.popularityIndicators || {};

  // Dimension 1: Popularity & Current Interest (0 - 25 pts)
  const stars = indicators.githubStars || 0;
  const forks = indicators.forks || 0;
  const communityPlays = indicators.communityPlays || 0;

  if (stars >= 500) breakdown.popularityScore += 15;
  else if (stars >= 200) breakdown.popularityScore += 12;
  else if (stars >= 50) breakdown.popularityScore += 8;
  else if (stars >= 10) breakdown.popularityScore += 4;
  else breakdown.popularityScore += 1;

  if (forks >= 50) breakdown.popularityScore += 5;
  else if (forks >= 10) breakdown.popularityScore += 3;
  else if (forks >= 2) breakdown.popularityScore += 1;

  if (communityPlays >= 1000) breakdown.popularityScore += 5;
  else if (communityPlays >= 200) breakdown.popularityScore += 3;

  breakdown.popularityScore = Math.min(25, breakdown.popularityScore);

  // Dimension 2: Technical Quality & Browser Compatibility (0 - 20 pts)
  const engine = (candidate.gameEngine || '').toLowerCase();
  if (engine.includes('canvas2d') || engine.includes('webgl') || engine.includes('phaser') || engine.includes('pixijs')) {
    breakdown.technicalQualityScore += 12;
  } else if (engine.includes('html5') || engine.includes('dom')) {
    breakdown.technicalQualityScore += 8;
  } else {
    breakdown.technicalQualityScore += 5;
  }

  const deps = candidate.dependencies || [];
  if (deps.length === 0) {
    breakdown.technicalQualityScore += 8; // zero runtime external dependencies
  } else if (deps.length <= 3) {
    breakdown.technicalQualityScore += 5;
  }

  breakdown.technicalQualityScore = Math.min(20, breakdown.technicalQualityScore);

  // Dimension 3: Mobile & Touch Support (0 - 15 pts)
  if (candidate.mobileCompatibility) {
    breakdown.mobileScore = 15;
  } else {
    breakdown.mobileScore = 5; // desktop keyboard only
  }

  // Dimension 4: Maintenance & Activity (0 - 15 pts)
  const lastUpdate = candidate.lastUpdateDate ? new Date(candidate.lastUpdateDate) : null;
  if (lastUpdate && !isNaN(lastUpdate.getTime())) {
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 60) breakdown.maintenanceScore = 15;
    else if (daysSinceUpdate <= 180) breakdown.maintenanceScore = 10;
    else if (daysSinceUpdate <= 365) breakdown.maintenanceScore = 6;
    else breakdown.maintenanceScore = 3;
  } else {
    breakdown.maintenanceScore = 5;
  }

  // Dimension 5: Audience Relevance (0 - 15 pts)
  const supportedCategories = ['arcade', 'action', 'puzzle', 'racing', 'sports', 'adventure', 'two-player', 'multiplayer', 'casual', 'kids'];
  const desc = ((candidate.description || '') + ' ' + (candidate.name || '')).toLowerCase();
  const matchesGenre = supportedCategories.some(cat => desc.includes(cat) || (candidate.tags || []).includes(cat));

  if (matchesGenre) {
    breakdown.relevanceScore += 10;
  } else {
    breakdown.relevanceScore += 5;
  }
  if (desc.includes('multiplayer') || desc.includes('2 player') || desc.includes('co-op')) {
    breakdown.relevanceScore += 5; // High value engagement genre
  }
  breakdown.relevanceScore = Math.min(15, breakdown.relevanceScore);

  // Dimension 6: Standalone / Zero-Build Readiness (0 - 10 pts)
  if (candidate.html5Compatibility) {
    breakdown.standaloneScore += 5;
  }
  if (!candidate.buildInstructions || candidate.buildInstructions.toLowerCase().includes('zero-build') || candidate.buildInstructions.toLowerCase().includes('static')) {
    breakdown.standaloneScore += 5;
  }
  breakdown.standaloneScore = Math.min(10, breakdown.standaloneScore);

  // Total Score (0 - 100)
  breakdown.totalScore = breakdown.popularityScore +
    breakdown.technicalQualityScore +
    breakdown.mobileScore +
    breakdown.maintenanceScore +
    breakdown.relevanceScore +
    breakdown.standaloneScore;

  // MANDATORY APPROVAL GATES CHECK
  const isLicensePassed = licenseResult && licenseResult.status === 'VERIFIED_COMMERCIAL_USE';
  const isSecurityPassed = securityResult && securityResult.status === 'PASSED';
  const isQualityPassed = !qualityResult || qualityResult.isPermittedForPublication === true;

  let publicationEligibility = 'INELIGIBLE';
  let recommendedDecision = 'REJECT';

  if (isLicensePassed && isSecurityPassed && isQualityPassed && breakdown.totalScore >= 60) {
    publicationEligibility = 'ELIGIBLE';
    recommendedDecision = 'APPROVE';
  } else if (!isLicensePassed) {
    publicationEligibility = 'INELIGIBLE';
    recommendedDecision = 'REJECT';
  } else if (qualityResult && !qualityResult.isPermittedForPublication) {
    publicationEligibility = 'INELIGIBLE';
    recommendedDecision = qualityResult.status === 'NEEDS_MANUAL_REVIEW' ? 'REQUEST_MORE_INFORMATION' : 'REJECT';
  } else if (securityResult && securityResult.status === 'NEEDS_MANUAL_REVIEW') {
    publicationEligibility = 'INELIGIBLE';
    recommendedDecision = 'REQUEST_MORE_INFORMATION';
  } else if (breakdown.totalScore < 60) {
    publicationEligibility = 'INELIGIBLE';
    recommendedDecision = 'REJECT';
  }

  return {
    scores: breakdown,
    publicationEligibility,
    recommendedDecision,
    gates: {
      licenseStatus: licenseResult ? licenseResult.status : 'UNKNOWN',
      isLicensePassed,
      securityStatus: securityResult ? securityResult.status : 'NEEDS_MANUAL_REVIEW',
      isSecurityPassed,
      qualityStatus: qualityResult ? qualityResult.status : 'NOT_EVALUATED',
      isQualityPassed,
      qualityClassification: qualityResult ? qualityResult.classification : 'NOT_EVALUATED',
    },
  };
}