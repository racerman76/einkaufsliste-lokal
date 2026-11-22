// Selbsttest: node changelog.test.mjs
import assert from 'node:assert/strict';
import { AENDERUNGEN, releaseText } from './changelog.js';
import { VERSION, neuer } from './version.js';

assert.equal(AENDERUNGEN[0].version, VERSION, 'Neuester Eintrag in changelog.js muss zu VERSION in version.js passen');
for (let i = 1; i < AENDERUNGEN.length; i++)
  assert.ok(neuer(AENDERUNGEN[i - 1].version, AENDERUNGEN[i].version), 'Reihenfolge: neueste zuerst');
for (const a of AENDERUNGEN) assert.ok(a.titel && a.punkte.length, a.version);
assert.match(releaseText(VERSION), /^### .+\n\n- /);
assert.equal(releaseText('9.9.9'), null);
console.log('changelog: alle Tests ok');
