/**
 * assess-quality.js
 *
 * Heuristic quality/playability assessment for discovered game candidates.
 *
 * CRITICAL RULE: Repository popularity (stars) alone NEVER qualifies a candidate.
 * A candidate must show evidence of being a complete, browser-playable HTML5 game.
 * Engines, libraries, tutorials, demos, and asset collections are rejected.
 *
 * This is a risk-reduction gate, not proof of completeness. Final verification
 * happens during human review and the second inspection before import.
 */

const NON_GAME_KEYWORDS = [
  { keyword: 'engine', classification: 'ENGINE' },
  { keyword: 'framework', classification: 'ENGINE' },
  { keyword: 'library', classification: 'LIBRARY' },
  { keyword: 'sdk', classification: 'LIBRARY' },
  { keyword: 'plugin', classification: 'LIBRARY' },
  { keyword: 'boilerplate', classification: 'TEMPLATE' },
  { keyword: 'starter', classification: 'TEMPLATE' },
  { keyword: 'template', classification: 'TEMPLATE' },
  { keyword: 'skeleton', classification: 'TEMPLATE' },
  { keyword: 'seed', classification: 'TEMPLATE' },
  { keyword: 'examples', classification: 'EXAMPLES' },
  { keyword: 'example', classification: 'EXAMPLES' },
  { keyword: 'tutorial', classification: 'TUTORIAL' },
  { keyword: 'asset pack', classification: 'ASSET_PACK' },
  { keyword: 'assets pack', classification: 'ASSET_PACK' },
  { keyword: 'asset collection', classification: 'ASSET_PACK' },
  { keyword: 'demo scene', classification: 'DEMO' },
];

const PLAYABLE_EVIDENCE_KEYWORDS = [
  'zero-build', 'static', 'vanilla html5', 'html5 canvas', 'canvas2d', 'webgl',
  'playable', 'browser game', 'html5 game',
];

export function assessCandidateQuality(candidate) {
  const evidence = [];
  const text = [
    candidate.name || '',
    candidate.description || '',
    candidate.buildInstructions || '',
    candidate.gameEngine || '',
    (candidate.tags || []).join(' '),
  ].join(' ').toLowerCase();

  // 1. Non-game classification
  let classification = 'GAME';
  for (const { keyword, classification: cls } of NON_GAME_KEYWORDS) {
    // word-boundary-ish check
    const re = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(text)) {
      classification = cls;
      evidence.push(`Matched non-game keyword "${keyword}" → classified as ${cls}.`);
      break;
    }
  }

  // 2. Browser playability evidence
  const html5 = candidate.html5Compatibility === true;
  const deps = candidate.dependencies || [];
  const build = (candidate.buildInstructions || '').toLowerCase();
  const playableEvidence = PLAYABLE_EVIDENCE_KEYWORDS.filter(k => text.includes(k));
  const hasPlayableEvidence = playableEvidence.length > 0;
  const hasZeroDeps = deps.length === 0;
  const hasEngine = !!(candidate.gameEngine);

  const isPlayableInBrowser = html5 && (hasPlayableEvidence || hasZeroDeps || hasEngine);

  if (html5) evidence.push('html5Compatibility=true.');
  else evidence.push('html5Compatibility is not true.');
  if (hasPlayableEvidence) evidence.push(`Playable evidence: ${playableEvidence.join(', ')}.`);
  if (hasZeroDeps) evidence.push('Zero runtime dependencies (standalone).');
  if (hasEngine) evidence.push(`Game engine reported: ${candidate.gameEngine}.`);
  if (!hasPlayableEvidence && !hasZeroDeps && !hasEngine) {
    evidence.push('No clear evidence of a browser-playable build.');
  }

  const isCompleteGame = classification === 'GAME' && isPlayableInBrowser;

  let status = 'PASSED';
  let isPermittedForPublication = true;
  if (classification !== 'GAME') {
    status = 'REJECTED';
    isPermittedForPublication = false;
    evidence.push(`Rejected: not a complete playable game (${classification}).`);
  } else if (!isPlayableInBrowser) {
    status = 'NEEDS_MANUAL_REVIEW';
    isPermittedForPublication = false;
    evidence.push('Rejected: no verified browser-playable build evidence.');
  }

  return {
    status,
    isPermittedForPublication,
    classification,
    isCompleteGame,
    isPlayableInBrowser,
    evidence,
  };
}