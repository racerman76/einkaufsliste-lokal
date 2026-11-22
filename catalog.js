// Artikel mit Symbol für die Symbol-Auswahl (Emoji – laufen auf iPhone, Android und PC ohne Bilddateien)
export const CAT_ICON = {
  'Obst & Gemüse': '🥕', 'Brot & Backwaren': '🥖', 'Kühlregal': '🧀', 'Fleisch & Fisch': '🥩', 'Tiefkühl': '🧊',
  'Trockenwaren': '🍝', 'Getränke': '🥤', 'Drogerie': '🧴', 'Haushalt': '🧽', 'Sonstiges': '🛒',
};

const k = (cat, liste) => liste.trim().split(/\s*,\s*/).map(e => {
  const [icon, ...n] = e.split(' ');
  return { name: n.join(' '), icon, cat };
});

export const CATALOG = [
  ...k('Obst & Gemüse', `🍎 Äpfel, 🍌 Bananen, 🍐 Birnen, 🍊 Orangen, 🍋 Zitronen, 🍇 Trauben, 🍓 Erdbeeren, 🥝 Kiwi,
    🍅 Tomaten, 🥒 Gurke, 🫑 Paprika, 🥕 Karotten, 🥔 Kartoffeln, 🧅 Zwiebeln, 🧄 Knoblauch, 🥬 Salat, 🥦 Brokkoli,
    🍄 Pilze, 🌽 Mais, 🥑 Avocado, 🎃 Kürbis`),
  ...k('Brot & Backwaren', `🍞 Brot, 🥖 Brötchen, 🍞 Toast, 🥐 Croissants, 🥨 Brezeln, 🍰 Kuchen`),
  ...k('Kühlregal', `🥛 Milch, 🧈 Butter, 🧀 Käse, 🥣 Joghurt, 🥣 Quark, 🥛 Sahne, 🥚 Eier, 🧈 Margarine, 🧀 Frischkäse`),
  ...k('Fleisch & Fisch', `🍗 Hähnchen, 🥩 Hackfleisch, 🥩 Steak, 🌭 Wurst, 🥪 Aufschnitt, 🍖 Salami, 🌭 Bratwurst, 🌭 Wiener, 🍖 Leberwurst, 🥓 Schinken, 🥓 Speck, 🐟 Fisch, 🐟 Lachs, 🦐 Garnelen`),
  ...k('Tiefkühl', `🍕 Pizza, 🍟 Pommes, 🍨 Eis, 🐟 Fischstäbchen, 🧊 TK-Gemüse`),
  ...k('Trockenwaren', `🍝 Nudeln, 🍚 Reis, 🌾 Mehl, 🍬 Zucker, 🧂 Salz, 🫒 Öl, 🥣 Müsli, ☕ Kaffee, 🍵 Tee, 🍯 Honig,
    🫙 Marmelade, 🍫 Schokolade, 🍿 Chips, 🍪 Kekse, 🥫 Konserven, 🥫 Ketchup`),
  ...k('Getränke', `💧 Wasser, 🧃 Saft, 🥤 Cola, 🍺 Bier, 🍷 Wein, 🍾 Sekt`),
  ...k('Drogerie', `🪥 Zahnpasta, 🧴 Shampoo, 🧴 Duschgel, 🧼 Seife, 🧻 Toilettenpapier, 🤧 Taschentücher, 🧴 Deo, 🪒 Rasierer`),
  ...k('Haushalt', `🧽 Spülmittel, 🧺 Waschmittel, 🗑️ Müllbeutel, 🧻 Küchenrolle, 🔋 Batterien, 💡 Glühlampe, 🕯️ Kerzen`),
  ...k('Sonstiges', `💐 Blumen, 🐾 Tierfutter, 📰 Zeitung`),
];

const byName = new Map(CATALOG.map(e => [e.name.toLowerCase(), e]));
export const findCatalog = name => byName.get(String(name).trim().toLowerCase());

// Symbol für einen Artikel: aus dem Katalog, sonst das Symbol seiner Kategorie
// Alle vorhandenen Symbole (Artikel + Kategorien) – zur Auswahl für eigene Artikel
// Alle Lebensmittel-Emojis (Unicode-Gruppe „Essen & Trinken“ bis Emoji 15.0 – läuft auf aktuellen Samsung-, Apple- und Windows-Geräten)
const LEBENSMITTEL = `🍇 🍈 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🫐 🥝 🍅 🫒 🥥
  🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🫘 🌰 🫚 🫛 🎃 🌿
  🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫
  🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡
  🐟 🦀 🦞 🦐 🦑 🦪
  🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯
  🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊`.split(/\s+/).filter(Boolean);
export const ALLE_SYMBOLE = [...new Set([...CATALOG.map(e => e.icon), ...LEBENSMITTEL, ...Object.values(CAT_ICON)])];
export const iconFor = (name, cat) => findCatalog(name)?.icon || CAT_ICON[cat] || '🛒';

// ---------- Anpassbare Auswahl ----------
// Änderungen an der Auswahl liegen als besondere Einträge in doc.items (listId KAT_LISTE),
// damit sie mit der Liste abgeglichen werden und auch ältere App-Versionen sie unverändert weitergeben.
// Eintrag: { id: 'kat:<basis>', listId: KAT_LISTE, basis, name, icon, cat, aus }
//   basis = ursprünglicher Name (klein) bzw. Name eines neu angelegten Eintrags; aus = ausgeblendet
//   Zurücksetzen = Eintrag löschen (deleted), dann gilt wieder der Standard.
export const KAT_LISTE = '_katalog';
const klein = s => String(s || '').trim().toLowerCase();

export const katEintraege = items => Object.values(items || {}).filter(i => i.listId === KAT_LISTE && !i.deleted);

export function wirksamerKatalog(items) {
  const ov = new Map(katEintraege(items).map(o => [o.basis, o]));
  const out = [];
  for (const e of CATALOG) {
    const basis = klein(e.name), o = ov.get(basis);
    if (o?.aus) continue;
    out.push({ name: o?.name || e.name, icon: o?.icon || e.icon, bild: o?.bild, cat: o?.cat || e.cat, basis, standard: true });
    ov.delete(basis);
  }
  for (const o of ov.values()) if (!o.aus && o.name) out.push({ name: o.name, icon: o.icon || '🛒', bild: o.bild, cat: o.cat || 'Sonstiges', basis: o.basis });
  return out;
}

export const sucheKat = (kat, name) => kat.find(e => klein(e.name) === klein(name));
// Selbst angelegte Artikel ohne eigenes Symbol bekommen den Einkaufswagen
export const symbolFuer = (kat, name) => sucheKat(kat, name)?.icon || '🛒';

// Ausgeblendete Einträge (zum Zurückholen)
export const ausgeblendet = items => katEintraege(items).filter(o => o.aus);

// Selbst eingetippte Artikel aus dem Verlauf, die nicht in der Auswahl stehen und nicht ausgeblendet sind
export function eigeneArtikel(items, kat, max = 24) {
  const aus = new Set(ausgeblendet(items).map(o => o.basis)), seen = new Map();
  for (const i of Object.values(items || {}).filter(i => i.listId !== KAT_LISTE).sort((a, b) => b.updatedAt - a.updatedAt)) {
    const k = klein(i.name);
    if (!k || seen.has(k) || aus.has(k) || sucheKat(kat, i.name)) continue;
    seen.set(k, { name: i.name, cat: i.cat || 'Sonstiges', basis: k, eigen: true });
  }
  return [...seen.values()].slice(0, max);
}

// ---------- Kategorienlisten und Kategorien ----------
// Es gibt mehrere Kategorienlisten (z. B. „Standard“ fürs Einkaufen, „Baumarkt“). Jede Einkaufsliste nutzt eine davon
// (list.katSet, ohne Angabe „standard“). Artikel speichern den Schlüssel ihrer Kategorie (bei den Standard-Kategorien
// deren ursprünglicher Name), daher bleibt beim Umbenennen alles richtig zugeordnet.
// Alles liegt – wie bei der Auswahl – als besondere Einträge in doc.items, die ältere App-Versionen unverändert weitergeben:
//   Kategorienliste: { id: 'kset:<set>', listId: KSET_LISTE, set, name }            (Standard: set 'standard', nur bei Umbenennung)
//   Kategorie:       { id: 'katg:<schlüssel>' bzw. 'katg:<set>:<schlüssel>', listId: KATG_LISTE, set?, basis: <schlüssel>, name, aus }
// Die Kategorienliste „Standard“ startet mit den eingebauten Kategorien, jede andere mit ihren eigenen Einträgen.
// „Sonstiges“ ist in jeder Kategorienliste die Auffang-Kategorie und kann nicht gelöscht werden.
export const KATG_LISTE = '_kategorien';
export const KSET_LISTE = '_katsets';
export const STANDARD_SET = 'standard';
export const STANDARD_KATEGORIEN = Object.keys(CAT_ICON);
export const AUFFANG = 'Sonstiges';

const lebend = (items, listId) => Object.values(items || {}).filter(i => i.listId === listId && !i.deleted);

export function kategorienListen(items) {
  const recs = lebend(items, KSET_LISTE);
  const std = recs.find(r => r.set === STANDARD_SET);
  return [{ id: STANDARD_SET, name: std?.name || 'Standard' },
    ...recs.filter(r => r.set !== STANDARD_SET && r.name).sort((a, b) => (a.created || 0) - (b.created || 0))
      .map(r => ({ id: r.set, name: r.name }))];
}

export const katgId = (set, key) => set === STANDARD_SET ? 'katg:' + key : `katg:${set}:${key}`;

export function wirksameKategorien(items, set = STANDARD_SET) {
  const recs = new Map(lebend(items, KATG_LISTE)
    .filter(r => (r.set || STANDARD_SET) === set).map(r => [r.basis, r]));
  const out = [];
  const grund = set === STANDARD_SET ? STANDARD_KATEGORIEN : [];
  for (const key of grund) {
    const r = recs.get(key); recs.delete(key);
    if (r?.aus && key !== AUFFANG) continue;
    out.push({ key, name: r?.name || key });
  }
  const auffang = recs.get(AUFFANG); recs.delete(AUFFANG);
  for (const r of [...recs.values()].sort((a, b) => (a.created || 0) - (b.created || 0)))
    if (!r.aus && r.name) out.push({ key: r.basis, name: r.name });
  if (set !== STANDARD_SET) out.push({ key: AUFFANG, name: auffang?.name || AUFFANG }); // immer vorhanden, am Ende
  return out;
}
