// Versionsnummer der App. Bei jeder Änderung an der App hochzählen –
// der Android-Build erstellt nur dann ein neues Release (Tag v<VERSION>).
export const VERSION = '1.0.0';

// Ist Version a neuer als b? ("1.10.0" > "1.9.2"); Unlesbares (z. B. alte Tags) gilt nie als neuer
export function neuer(a, b) {
  const teile = v => String(v).replace(/^v/, '').split('.').map(t => (/^\d+$/.test(t) ? Number(t) : NaN));
  const pa = teile(a), pb = teile(b);
  if (pa.some(isNaN) || pb.some(isNaN)) return false;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0;
  }
  return false;
}
