// Reihenfolge der offenen Artikel einer Liste – je Liste einstellbar (list.sort, list.cats).
export const SORTS = {
  kat: 'Nach Kategorie (Ladenweg)',
  abc: 'Alphabetisch',
  neu: 'Neueste zuerst',
  alt: 'Älteste zuerst',
};

// Kategorien in der Reihenfolge der Liste; neue/fehlende Kategorien hinten anhängen
export const catOrder = (list, CATS) => {
  const o = (list?.cats || []).filter(c => CATS.includes(c));
  return [...o, ...CATS.filter(c => !o.includes(c))];
};

const abc = (a, b) => a.name.localeCompare(b.name, 'de');
const age = i => i.created ?? i.updatedAt; // ältere Einträge haben noch kein "created"

// Ergebnis: [[Überschrift oder null, [Artikel…]], …]
export function ordnen(items, list, CATS) {
  const mode = list?.sort || 'kat';
  if (mode === 'abc') return [[null, [...items].sort(abc)]];
  if (mode === 'neu') return [[null, [...items].sort((a, b) => age(b) - age(a))]];
  if (mode === 'alt') return [[null, [...items].sort((a, b) => age(a) - age(b))]];
  const catOf = i => (CATS.includes(i.cat) ? i.cat : 'Sonstiges');
  return catOrder(list, CATS)
    .map(c => [c, items.filter(i => catOf(i) === c).sort(abc)])
    .filter(([, g]) => g.length);
}

// Kategorie in der Reihenfolge um eine Stelle verschieben (dir = -1 hoch, +1 runter)
export function verschieben(order, cat, dir) {
  const o = [...order], i = o.indexOf(cat), j = i + dir;
  if (i < 0 || j < 0 || j >= o.length) return o;
  [o[i], o[j]] = [o[j], o[i]];
  return o;
}
