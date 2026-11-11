/**
 * verify-license.js
 * 
 * Strict Licensing Verification Gate for GLOBAL-ARCADE.
 * Audits repository SPDX licenses and external asset declarations.
 * 
 * CRITICAL RULE: A repository being public does NOT mean its code can be
 * commercially redistributed. Never assume permission.
 */

// Permissive licenses that explicitly permit commercial use & redistribution
export const APPROVED_COMMERCIAL_LICENSES = [
  'mit',
  'apache-2.0',
  'bsd-2-clause',
  'bsd-3-clause',
  'cc0-1.0',
  'isc',
  'zlib',
  'unlicense',
  '0bsd',
];

// Copyleft or non-commercial licenses that restrict commercial arcade hosting
export const RESTRICTED_LICENSES = [
  'gpl-2.0',
  'gpl-3.0',
  'agpl-3.0',
  'lgpl-2.1',
  'lgpl-3.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'cc-by-nc-nd-4.0',
];

// Explicitly proprietary or all-rights-reserved
export const REJECTED_LICENSES = [
  'proprietary',
  'all-rights-reserved',
  'custom-restrictive',
  'commercial-only',
];

/**
 * Evaluates license eligibility based on SPDX name, license text, and asset notes.
 * 
 * @param {Object} params
 * @param {string} params.licenseSpdx - e.g. "MIT", "Apache-2.0", "GPL-3.0", "NOASSERTION"
 * @param {string} params.licenseText - Raw text if available
 * @param {string} params.assetLicenseNotes - Description of asset licensing
 * @returns {Object} { status, scoreModifier, requiresAttribution, reasons }
 */
export function verifyLicense({ licenseSpdx, licenseText = '', assetLicenseNotes = '' }) {
  const normalizedSpdx = (licenseSpdx || '').trim().toLowerCase();
  const reasons = [];

  // Check 1: Missing or Unknown License
  if (!licenseSpdx || normalizedSpdx === 'none' || normalizedSpdx === 'noassertion' || normalizedSpdx === 'null') {
    reasons.push('No recognized SPDX license identifier found. Repository lacks explicit public license.');
    return {
      status: 'UNKNOWN',
      isPermittedForPublication: false,
      reasons,
      requiresAttribution: false,
      commercialAllowed: false,
    };
  }

  // Check 2: Explicitly Rejected Licenses
  if (REJECTED_LICENSES.some(r => normalizedSpdx.includes(r))) {
    reasons.push(`License "${licenseSpdx}" is explicitly proprietary or non-distributable.`);
    return {
      status: 'REJECTED',
      isPermittedForPublication: false,
      reasons,
      requiresAttribution: false,
      commercialAllowed: false,
    };
  }

  // Check 3: Restricted Licenses (Copyleft / Non-commercial)
  if (RESTRICTED_LICENSES.some(r => normalizedSpdx.includes(r))) {
    reasons.push(`License "${licenseSpdx}" imposes copyleft (viral source distribution) or non-commercial restrictions incompatible with ad-supported web portal hosting.`);
    return {
      status: 'RESTRICTED',
      isPermittedForPublication: false,
      reasons,
      requiresAttribution: true,
      commercialAllowed: false,
    };
  }

  // Check 4: Approved Commercial Licenses
  const isApproved = APPROVED_COMMERCIAL_LICENSES.some(a => normalizedSpdx === a || normalizedSpdx.startsWith(`${a}-`));
  if (!isApproved) {
    reasons.push(`License "${licenseSpdx}" is not on the verified commercial whitelist.`);
    return {
      status: 'UNKNOWN',
      isPermittedForPublication: false,
      reasons,
      requiresAttribution: false,
      commercialAllowed: false,
    };
  }

  // Check 5: Asset License Sanity Check
  // Note: Code license does NOT automatically cover proprietary art, music, or branded assets.
  const lowerAssetNotes = (assetLicenseNotes || '').toLowerCase();
  let assetWarning = null;
  if (lowerAssetNotes.includes('copyrighted') || lowerAssetNotes.includes('fan art') || lowerAssetNotes.includes('ripped')) {
    reasons.push('Candidate includes external assets reported as third-party, fan-art, or ripped.');
    return {
      status: 'RESTRICTED',
      isPermittedForPublication: false,
      reasons,
      requiresAttribution: true,
      commercialAllowed: false,
    };
  } else if (!assetLicenseNotes || lowerAssetNotes.includes('unknown') || lowerAssetNotes.includes('unspecified')) {
    assetWarning = 'Asset provenance is unspecified. Code license verified, but visual/audio assets require human confirmation.';
    reasons.push(assetWarning);
  }

  return {
    status: 'VERIFIED_COMMERCIAL_USE',
    isPermittedForPublication: true,
    reasons,
    assetWarning,
    requiresAttribution: normalizedSpdx !== 'cc0-1.0' && normalizedSpdx !== 'unlicense' && normalizedSpdx !== '0bsd',
    commercialAllowed: true,
  };
}