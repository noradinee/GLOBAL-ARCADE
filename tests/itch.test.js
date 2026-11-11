import test from 'node:test';
import assert from 'node:assert/strict';
import { stripCdata, extractTag, isHtmlPlatform } from '../scripts/discovery/discover-itch.js';
import { verifyLicense } from '../scripts/discovery/verify-license.js';

const sampleItem = `<item><guid>https://author.itch.io/game</guid><title>My Game [Free]</title><plainTitle>My Game</plainTitle><imageurl>x.png</imageurl><price>$0.00</price><currency>USD</currency><link>https://author.itch.io/game</link><description><![CDATA[Line one
Line two
<img alt="g" src="x.png"/>]]></description><pubDate>Tue, 29 Sep 2026 13:22:34 GMT</pubDate><platforms><html>yes</html></platforms></item>`;

test('itch: stripCdata handles CDATA', () => {
  const out = stripCdata('<![CDATA[hello\nworld]]>');
  assert.equal(out, 'hello\nworld');
});

test('itch: extractTag handles multiline CDATA description', () => {
  const desc = extractTag(sampleItem, 'description');
  assert.match(desc, /Line one/);
  assert.match(desc, /Line two/);
});

test('itch: extractTag extracts title and link', () => {
  assert.equal(extractTag(sampleItem, 'title'), 'My Game [Free]');
  assert.equal(extractTag(sampleItem, 'link'), 'https://author.itch.io/game');
});

test('itch: isHtmlPlatform true for html yes', () => {
  assert.equal(isHtmlPlatform(sampleItem), true);
});

test('itch: isHtmlPlatform false when html no', () => {
  const block = sampleItem.replace('<html>yes</html>', '<html>no</html>');
  assert.equal(isHtmlPlatform(block), false);
});

test('itch: unknown license rejected', () => {
  const r = verifyLicense({ licenseSpdx: 'UNKNOWN', assetLicenseNotes: 'Requires explicit author written clearance' });
  assert.equal(r.isPermittedForPublication, false);
  assert.notEqual(r.status, 'VERIFIED_COMMERCIAL_USE');
});