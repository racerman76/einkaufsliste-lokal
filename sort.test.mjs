// Selbsttest: node sort.test.mjs
import assert from 'node:assert/strict';
import { ordnen, catOrder, verschieben } from './sort.js';

const CATS = ['Obst', 'Kühlregal', 'Getränke', 'Sonstiges'];
const it = (name, cat, created) => ({ name, cat, created, updatedAt: created });
const items = [it('Milch', 'Kühlregal', 3), it('Apfel', 'Obst', 1), it('Bier', 'Getränke', 2), it('Zange', 'Unbekannt', 4), it('Birne', 'Obst', 5)];
const names = r => r.flatMap(([, g]) => g.map(i => i.name));

// Standard: Kategorien in Grundreihenfolge, darin alphabetisch, Unbekanntes unter Sonstiges
assert.deepEqual(ordnen(items, {}, CATS).map(([c]) => c), ['Obst', 'Kühlregal', 'Getränke', 'Sonstiges']);
assert.deepEqual(names(ordnen(items, {}, CATS)), ['Apfel', 'Birne', 'Milch', 'Bier', 'Zange']);

// Eigene Reihenfolge der Liste; fehlende Kategorien hinten
const laden = { cats: ['Getränke', 'Obst'] };
assert.deepEqual(catOrder(laden, CATS), ['Getränke', 'Obst', 'Kühlregal', 'Sonstiges']);
assert.deepEqual(names(ordnen(items, laden, CATS)), ['Bier', 'Apfel', 'Birne', 'Milch', 'Zange']);

// Andere Sortierarten ohne Gruppen
assert.deepEqual(names(ordnen(items, { sort: 'abc' }, CATS)), ['Apfel', 'Bier', 'Birne', 'Milch', 'Zange']);
assert.deepEqual(names(ordnen(items, { sort: 'neu' }, CATS)), ['Birne', 'Zange', 'Milch', 'Bier', 'Apfel']);
assert.deepEqual(names(ordnen(items, { sort: 'alt' }, CATS)), ['Apfel', 'Bier', 'Milch', 'Zange', 'Birne']);
assert.equal(ordnen(items, { sort: 'abc' }, CATS)[0][0], null);

// Verschieben, auch an den Rändern
assert.deepEqual(verschieben(CATS, 'Getränke', -1), ['Obst', 'Getränke', 'Kühlregal', 'Sonstiges']);
assert.deepEqual(verschieben(CATS, 'Obst', -1), CATS);
assert.deepEqual(verschieben(CATS, 'Sonstiges', 1), CATS);
console.log('sort: alle Tests ok');
