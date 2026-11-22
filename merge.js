// Zusammenführen zweier Stände (lokal + GitHub): pro Eintrag gewinnt der neuere (updatedAt).
// Gelöschte Einträge bleiben als "deleted" stehen, damit das Löschen auf anderen Geräten ankommt.
const PURGE_MS = 30 * 24 * 3600 * 1000; // gelöschte Einträge nach 30 Tagen endgültig entfernen

export const emptyDoc = () => ({ v: 1, lists: {}, items: {} });

function mergeMap(a = {}, b = {}, now) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id], y = b[id];
    let win = !x ? y : !y ? x : x.updatedAt !== y.updatedAt
      ? (x.updatedAt > y.updatedAt ? x : y)
      : (JSON.stringify(x) >= JSON.stringify(y) ? x : y); // Gleichstand: deterministisch auf allen Geräten
    if (win.deleted && now - win.updatedAt > PURGE_MS) continue;
    out[id] = win;
  }
  return out;
}

export function merge(a, b, now = Date.now()) {
  a = a || emptyDoc(); b = b || emptyDoc();
  return { v: 1, lists: mergeMap(a.lists, b.lists, now), items: mergeMap(a.items, b.items, now) };
}

export const sameDoc = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
function sortKeys(o) {
  if (Array.isArray(o) || o === null || typeof o !== 'object') return o;
  return Object.fromEntries(Object.keys(o).sort().map(k => [k, sortKeys(o[k])]));
}
