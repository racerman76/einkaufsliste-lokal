// Gesprochenen Text in Artikel zerlegen:
// "Milch, zwei Liter Saft, 500 Gramm Hack und Brot" →
//   [{name:'Milch',qty:''}, {name:'Saft',qty:'2 l'}, {name:'Hack',qty:'500 g'}, {name:'Brot',qty:''}]

const ZAHLWOERTER = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6,
  sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, fünfzehn: 15, zwanzig: 20, dreißig: 30,
  vierzig: 40, fünfzig: 50, hundert: 100, zweihundert: 200, dreihundert: 300, fünfhundert: 500,
  halb: 0.5, halbe: 0.5, halben: 0.5, halbes: 0.5, anderthalb: 1.5, eineinhalb: 1.5,
};
const EINHEITEN = [
  [/^(liter|l)$/, 'l'], [/^(milliliter|ml)$/, 'ml'], [/^(gramm|g|gr)$/, 'g'],
  [/^(kilo|kilogramm|kg)$/, 'kg'], [/^pfund$/, 'Pfund'],
  [/^(packung|packungen|päckchen|pack|packs|packen|packerl|pck\.?|pkg)$/, 'Pck.'], [/^(flasche|flaschen|fl\.?)$/, 'Fl.'],
  [/^(dose|dosen)$/, 'Dose'], [/^becher$/, 'Becher'], [/^(bund|bündel)$/, 'Bund'], [/^(glas|gläser)$/, 'Glas'],
  [/^(stück|stk\.?)$/, 'Stück'], [/^(kasten|kästen|kiste|kisten)$/, 'Kasten'], [/^(beutel|tüte|tüten|netz)$/, 'Beutel'],
];
// Füllwörter, die nicht zum Artikel gehören
const FUELL = /\b(bitte|noch|auch|ich brauche|wir brauchen|brauchen|brauche|kaufen|besorgen|auf die liste|setze|setz|schreib|schreibe|mal|etwas|etwa)\b/gi;

const ZAHLWORT_LAENGSTE = Object.keys(ZAHLWOERTER).sort((a, b) => b.length - a.length); // "eine" vor "ein" prüfen
const zahlVon = w => {
  const t = w.toLowerCase();
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(',', '.'));
  return ZAHLWOERTER[t];
};
const einheitVon = w => EINHEITEN.find(([re]) => re.test(w.toLowerCase()))?.[1];
const zahlText = z => String(z).replace('.', ',');
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

// Mengenangabe ab Wort i? "2 Liter", "zwei", "2l", "500g", "Liter" (nur am Anfang, dann 1)
function mengeAb(w, i, amAnfang) {
  const m = w[i].match(/^(\d+(?:[.,]\d+)?)([a-zäöü.]+)$/i);
  if (m && einheitVon(m[2])) return { zahl: Number(m[1].replace(',', '.')), einheit: einheitVon(m[2]), len: 1 };
  // Zahlwort und Einheit zusammengeschrieben: "einpack", "Zweiliter" (so liefert es die Spracherkennung manchmal)
  const klein = w[i].toLowerCase();
  for (const wort of ZAHLWORT_LAENGSTE) {
    if (klein.length > wort.length && klein.startsWith(wort) && einheitVon(klein.slice(wort.length)))
      return { zahl: ZAHLWOERTER[wort], einheit: einheitVon(klein.slice(wort.length)), len: 1 };
  }
  const zahl = zahlVon(w[i]);
  if (zahl !== undefined) {
    const einheit = i + 1 < w.length ? einheitVon(w[i + 1]) : undefined;
    return einheit ? { zahl, einheit, len: 2 } : { zahl, len: 1 };
  }
  if (amAnfang && i + 1 < w.length && einheitVon(w[i])) return { zahl: 1, einheit: einheitVon(w[i]), len: 1 };
  return null;
}

const mengeText = q => !q ? '' : q.einheit ? `${zahlText(q.zahl ?? 1)} ${q.einheit}` : q.zahl !== 1 ? zahlText(q.zahl) : '';

// bekannt(name): optional – erkennt Artikel aus der Auswahl. Damit wird "Milch Butter Brot"
// (ohne Pausen gesprochen) in drei Artikel geteilt, "Frischkäse Natur" bleibt aber zusammen.
export function zerlegen(text, bekannt = () => false) {
  const ergebnis = [];
  const teile = String(text || '')
    .replace(FUELL, ' ')
    .split(/\s*(?:(?<!\d),|,(?!\d)|;|\.(?!\d)|\bund\b|\bsowie\b|\bplus\b|\bdazu\b|\bdann\b)\s*/i); // Komma in „1,5“ trennt nicht
  for (const teil of teile) {
    const w = teil.trim().split(/\s+/).filter(Boolean);
    // In Namen (N) und Mengen (Q) aufteilen
    const stuecke = [];
    for (let i = 0; i < w.length;) {
      const q = mengeAb(w, i, i === 0);
      if (q) { stuecke.push({ q }); i += q.len; continue; }
      const letztes = stuecke.at(-1);
      if (letztes?.n) letztes.n.push(w[i]); else stuecke.push({ n: [w[i]] });
      i++;
    }
    // Namensblöcke aus lauter bekannten Einzelartikeln trennen
    const namen = n => {
      const ganz = n.join(' ');
      return n.length > 1 && !bekannt(ganz) && n.every(x => bekannt(x)) ? n : [ganz];
    };
    // Steht die Menge vorne ("2 Liter Milch"), gilt sie für den folgenden Artikel,
    // sonst für den davor ("Milch 2 Liter").
    const vorne = !!stuecke[0]?.q;
    const artikel = []; let offen = null;
    for (const st of stuecke) {
      if (st.n) {
        for (const name of namen(st.n)) { artikel.push({ name, q: vorne ? offen : null }); offen = null; }
      } else if (!vorne && artikel.length && !artikel.at(-1).q) artikel.at(-1).q = st.q;
      else offen = st.q;
    }
    if (offen && !artikel.length) { // nur Menge gesagt, z. B. "zwei Liter" – nichts verschlucken
      const roh = teil.trim().split(/\s+/); if (roh.length > 1) artikel.push({ name: roh.slice(1).join(' '), q: { zahl: offen.zahl } });
    } else if (offen && !artikel.at(-1).q) artikel.at(-1).q = offen;
    for (const a of artikel) ergebnis.push({ name: gross(a.name), qty: mengeText(a.q) });
  }
  return ergebnis;
}

// Für den Abgleich mit der Auswahl: "Apfel" ≈ "Äpfel", "Banane" ≈ "Bananen", "Tomate" ≈ "Tomaten"
export const normiert = s => String(s).toLowerCase().trim()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/(en|n|e|s)$/, '');
