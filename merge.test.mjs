// Selbsttest: node merge.test.mjs
import assert from 'node:assert/strict';
import { merge, sameDoc, emptyDoc } from './merge.js';

const now = 1_000_000_000_000;
const it = (id, t, extra = {}) => ({ id, listId: 'L', name: id, updatedAt: t, ...extra });

// Neuerer Stand gewinnt, beide Seiten werden vereinigt
const a = { v: 1, lists: {}, items: { x: it('x', 5, { done: true }), y: it('y', 1) } };
const b = { v: 1, lists: {}, items: { x: it('x', 3, { done: false }), z: it('z', 2) } };
const m = merge(a, b, now);
assert.equal(m.items.x.done, true);
assert.deepEqual(Object.keys(m.items).sort(), ['x', 'y', 'z']);

// Kommutativ (gleiches Ergebnis auf jedem Gerät), auch bei Gleichstand
const c = { v: 1, lists: {}, items: { x: it('x', 5, { qty: '1' }) } };
const d = { v: 1, lists: {}, items: { x: it('x', 5, { qty: '2' }) } };
assert.ok(sameDoc(merge(c, d, now), merge(d, c, now)));
assert.ok(sameDoc(merge(a, b, now), merge(b, a, now)));

// Löschen überträgt sich, alte Löschmarken werden entfernt
const del = { v: 1, lists: {}, items: { y: it('y', now - 1000, { deleted: true }) } };
assert.equal(merge(a, del, now).items.y.deleted, true);
const old = { v: 1, lists: {}, items: { y: it('y', now - 31 * 864e5, { deleted: true }) } };
assert.equal(merge(old, emptyDoc(), now).items.y, undefined);

// Fehlender Stand
assert.ok(sameDoc(merge(null, a, now), merge(a, a, now)));
console.log('merge: alle Tests ok');
