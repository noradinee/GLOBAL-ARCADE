import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { safeImportCandidate } from '../scripts/discovery/safe-import.js';

function makeTempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-import-'));
  fs.mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'candidates'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'discovery', 'approved'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'public', 'games'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'data', 'games.json'), '[]', 'utf-8');
  fs.writeFileSync(path.join(dir, 'src', 'data', 'discoveryRegistry.json'), '[]', 'utf-8');
  return dir;
}

test('import without explicit approval is rejected', (t) => {
  const root = makeTempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const candidate = {
    candidateId: 'gh-test-unapproved',
    name: 'Unapproved Game',
    originalRepoUrl: 'https://example.com/repo',
    author: 'tester',
    description: 'test',
    licenseName: 'MIT',
    assetLicensingStatus: 'All procedural',
    reviewerDecision: 'REJECT',
    exactCommitHash: 'abc123',
  };
  fs.writeFileSync(
    path.join(root, 'discovery', 'candidates', 'gh-test-unapproved.json'),
    JSON.stringify(candidate, null, 2),
    'utf-8'
  );
  assert.throws(
    () => safeImportCandidate('gh-test-unapproved', { rootDir: root }),
    /Human approval is strictly mandatory/i
  );
});