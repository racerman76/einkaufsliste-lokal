import { merge, sameDoc, emptyDoc } from './merge.js';
import { SORTS, catOrder, ordnen, verschieben } from './sort.js';
import { VERSION, neuer } from './version.js';
import { ALLE_SYMBOLE, KAT_LISTE, wirksamerKatalog, sucheKat, symbolFuer, eigeneArtikel, ausgeblendet,
  KATG_LISTE, wirksameKategorien, AUFFANG, KSET_LISTE, STANDARD_SET, kategorienListen, katgId } from './catalog.js';
import { AENDERUNGEN } from './changelog.js';
import { zerlegen, normiert } from './sprache.js';

// Kategorien: Schlüssel (CATS) + Anzeigename; eigene, umbenannte und gelöschte kommen aus den Daten (siehe catalog.js)
let KATS = [], CATS = [], KSETS = [], SET = 'standard';
const katName = key => KATS.find(k => k.key === key)?.name || key;
const FILE = 'data.json';
const $ = id => document.getElementById(id);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

// ---------- Lokaler Zustand (bleibt offline erhalten) ----------
// Lokale Version (index.html setzt EK_LOKAL): eigene Speicherschlüssel, kein Abgleich mit GitHub
const LOKAL = !!window.EK_LOKAL;
const K = k => (LOKAL ? 'ekl-' : 'ek-') + k;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(K(k))) ?? d; } catch { return d; } };
let doc = load('doc', emptyDoc());
let sha = load('sha', null);
let dirty = load('dirty', false);
let cfg = load('cfg', {});
let cur = localStorage.getItem(K('cur'));
const save = () => {
  localStorage.setItem(K('doc'), JSON.stringify(doc));
  localStorage.setItem(K('sha'), JSON.stringify(sha));
  localStorage.setItem(K('dirty'), JSON.stringify(dirty));
};

// Einrichtungslink: #setup=<base64 JSON> (Hash wird nie an einen Server geschickt)
const parseSetup = s => JSON.parse(decodeURIComponent(escape(atob(s.split('#setup=')[1].trim()))));
if (location.hash.startsWith('#setup=') && !LOKAL) {
  try {
    cfg = { ...parseSetup(location.hash), user: cfg.user || '' };
    localStorage.setItem(K('cfg'), JSON.stringify(cfg));
  } catch { alert('Einrichtungslink ist ungültig.'); }
  history.replaceState(null, '', location.pathname);
}

// ---------- Änderungen ----------
function touch(obj, changes) {
  Object.assign(obj, changes, { updatedAt: Date.now() });
  dirty = true; save(); render(); scheduleSync(1500);
}
const lists = () => Object.values(doc.lists).filter(l => !l.deleted).sort((a, b) => a.created - b.created);
const items = () => Object.values(doc.items).filter(i => !i.deleted && i.listId === cur);

function ensureList() {
  if (lists().length === 0) {
    // Feste ID: neue Geräte legen vor dem ersten Abgleich dieselbe Standardliste an → keine Dubletten
    // updatedAt 0: jeder Stand aus GitHub (auch eine Löschung) hat Vorrang
    doc.lists.standard = { id: 'standard', name: 'Einkauf', created: 0, updatedAt: 0 };
    dirty = true; save();
  }
  if (!doc.lists[cur] || doc.lists[cur].deleted) cur = lists()[0].id;
  localStorage.setItem(K('cur'), cur);
}

function addItem(name, qty, cat) {
  name = name.trim(); if (!name) return;
  // Gleicher Artikel schon auf der Liste? Dann wieder aktivieren statt doppelt anlegen.
  const ex = items().find(i => i.name.toLowerCase() === name.toLowerCase());
  if (ex) return touch(ex, { done: false, qty: qty || ex.qty, cat });
  const id = uid();
  doc.items[id] = { id, listId: cur, name, qty, cat, done: false, by: cfg.user || '', created: Date.now() };
  touch(doc.items[id], {});
}

// Zuletzt verwendete Kategorie je Artikelname (für Vorschlag)
function lastCat(name) {
  let best = null;
  for (const i of Object.values(doc.items))
    if (i.listId !== KAT_LISTE && i.name.toLowerCase() === name.toLowerCase() && (!best || i.updatedAt > best.updatedAt)) best = i;
  return best?.cat;
}

// ---------- Anzeige ----------
function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids); return e;
}

function row(i) {
  const cb = el('input', { type: 'checkbox', checked: !!i.done, ariaLabel: i.name + ' erledigt' });
  cb.onchange = () => touch(i, { done: cb.checked });
  const qty = el('button', { className: 'qty', textContent: i.qty || 'Menge', title: 'Ändern' });
  qty.onclick = () => editItem(i);
  const del = el('button', { className: 'del', textContent: '✕', title: 'Löschen', ariaLabel: i.name + ' löschen' });
  del.onclick = () => touch(i, { deleted: true });
  // Name antippen = Artikel bearbeiten
  const name = el('button', { type: 'button', className: 'name', textContent: i.name, title: 'Ändern', ariaLabel: i.name + ' ändern' });
  name.onclick = () => editItem(i);
  if (i.by && i.by !== cfg.user) name.append(el('span', { className: 'by', textContent: i.by }));
  const ic = symbolEl(sucheKat(KAT, i.name)?.bild, symbolFuer(KAT, i.name, i.cat));
  return el('div', { className: 'item' }, cb, ic, name, qty, del);
}

let KAT = wirksamerKatalog(doc.items);
function render() {
  KAT = wirksamerKatalog(doc.items);
  ensureList();
  // Kategorienliste der aktuellen Liste (gelöschte oder unbekannte → Standard)
  KSETS = kategorienListen(doc.items);
  SET = KSETS.some(k => k.id === doc.lists[cur]?.katSet) ? doc.lists[cur].katSet : STANDARD_SET;
  KATS = wirksameKategorien(doc.items, SET); CATS = KATS.map(k => k.key);
  $('listSel').replaceChildren(...lists().map(l => el('option', { value: l.id, textContent: l.name, selected: l.id === cur })));
  const all = items();
  const open = all.filter(i => !i.done), done = all.filter(i => i.done);
  $('open').replaceChildren(...ordnen(open, doc.lists[cur], CATS).flatMap(([c, g]) =>
    [...(c ? [el('h3', { textContent: katName(c) })] : []), ...g.map(row)]));
  // Kategorie-Auswahl beim Hinzufügen in derselben Reihenfolge wie die Liste
  const sel = CATS.includes($('cat').value) ? $('cat').value : AUFFANG;
  $('cat').replaceChildren(...catOrder(doc.lists[cur], CATS).map(c => el('option', { value: c, textContent: katName(c) })));
  $('cat').value = sel;
  $('empty').hidden = all.length > 0;
  $('doneBox').hidden = done.length === 0;
  $('doneCount').textContent = done.length;
  $('done').replaceChildren(...done.sort((a, b) => b.updatedAt - a.updatedAt).map(row));
  if ($('pickDlg').open) renderPicker();
}

// ---------- Artikel bearbeiten ----------
let editing = null, editNeu = false;
const EINHEITEN = ['', 'Stück', 'g', 'kg', 'ml', 'l', 'Pck.', 'Fl.', 'Dose', 'Becher', 'Bund', 'Glas'];
// "2,5 kg" → ["2,5", "kg"]; Mengen ohne Zahl (z. B. "eine Handvoll") landen komplett in der Einheit
const teileMenge = q => { const m = String(q || '').trim().match(/^([\d.,\/½¼¾]*)\s*(.*)$/); return [m[1], m[2]]; };
// neu = true: Artikel aus der Symbol-Auswahl, kommt erst mit „Speichern“ auf die Liste (Menge Pflicht)
function editItem(i, neu = false) {
  editing = i; editNeu = neu;
  $('edTitel').textContent = neu ? i.name + ' hinzufügen' : 'Artikel ändern';
  $('edDel').hidden = neu; $('edQty').required = neu;
  const [zahl, einheit] = teileMenge(i.qty);
  $('edName').value = i.name; $('edQty').value = zahl;
  $('edUnit').replaceChildren(...[...new Set([...EINHEITEN, einheit])].map(u => el('option', { value: u, textContent: u || '–' })));
  $('edUnit').value = einheit;
  $('edCat').replaceChildren(...catOrder(doc.lists[cur], CATS).map(c => el('option', { value: c, textContent: katName(c) })));
  $('edCat').value = CATS.includes(i.cat) ? i.cat : 'Sonstiges';
  $('editDlg').returnValue = ''; // sonst gilt bei Esc/Zurück noch der Knopf vom letzten Mal
  $('editDlg').showModal();
  if (neu) $('edQty').focus(); // Handy: Zahlentastatur geht gleich auf
}
$('edName').addEventListener('input', e => { const c = sucheKat(KAT, e.target.value)?.cat; if (c) $('edCat').value = c; });
$('editDlg').addEventListener('close', () => {
  const i = editing; editing = null;
  if (!i) return;
  const r = $('editDlg').returnValue;
  if (r === 'del') return touch(i, { deleted: true });
  const name = $('edName').value.trim();
  if (r !== 'save' || !name) return;
  const qty = [$('edQty').value.trim(), $('edUnit').value].filter(Boolean).join(' ');
  if (editNeu) return addItem(name, qty, $('edCat').value);
  touch(i, { name, qty: [$('edQty').value.trim(), $('edUnit').value].filter(Boolean).join(' '), cat: $('edCat').value });
});

// Symbol eines Artikels: eigenes Bild (falls hinterlegt), sonst Emoji
function symbolEl(bild, icon) {
  return el('span', { className: 'ic', ariaHidden: 'true' },
    bild ? el('img', { src: bild, alt: '', draggable: false }) : icon);
}

// Foto/Bild auf 96×96 Pixel zuschneiden (Mitte, quadratisch) → JPEG, ca. 4–8 KB.
// shortcut: Bilder liegen in data.json; die GitHub-Schnittstelle liefert Dateien nur bis 1 MB aus –
// das reicht für gut 100 Bilder. Bei deutlich mehr: Bilder als eigene Dateien im Daten-Repo ablegen.
async function bildVerkleinern(datei) {
  const url = URL.createObjectURL(datei);
  try {
    const img = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = url; });
    const n = 96, c = Object.assign(document.createElement('canvas'), { width: n, height: n }), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); // weißer Hintergrund statt Schwarz bei transparenten PNGs
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, n, n);
    return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}

// ---------- Symbol-Auswahl ----------
// Normal: Kachel antippen = Artikel auf die Liste (nochmal = wieder runter).
// Bearbeiten-Modus (✎): Kachel antippen = Eintrag der Auswahl ändern, ausblenden oder neu anlegen.
let pickEdit = false;
function renderPicker() {
  const q = $('pickSearch').value.trim().toLowerCase();
  const offen = new Map(items().filter(i => !i.done).map(i => [i.name.toLowerCase(), i]));
  // Nur Artikel, die zur Kategorienliste dieser Liste passen (Baumarkt-Liste zeigt keine Milch)
  const alle = [...eigeneArtikel(doc.items, KAT), ...KAT.filter(e => CATS.includes(e.cat) || e.cat === AUFFANG)]
    .filter(e => !q || e.name.toLowerCase().includes(q));
  $('pickEdit').classList.toggle('on', pickEdit);
  $('pickEdit').ariaPressed = String(pickEdit);
  $('pickDlg').classList.toggle('bearbeiten', pickEdit);
  $('pickHint').textContent = pickEdit
    ? 'Bearbeiten: Eintrag antippen = ändern · rotes ✕ = aus der Auswahl entfernen · ✎ beendet'
    : 'Antippen = Menge eingeben & speichern · nochmal antippen = wieder runter · ✎ = Auswahl bearbeiten';
  const tile = e => {
    const on = !pickEdit && offen.get(e.name.toLowerCase());
    const b = el('button', { type: 'button', className: 'tile' + (on ? ' on' : ''), ariaPressed: on ? 'true' : 'false' },
      symbolEl(e.bild, e.icon || symbolFuer(KAT, e.name, e.cat)), el('span', { textContent: e.name }));
    b.onclick = () => pickEdit ? katBearbeiten(e) : on ? touch(on, { deleted: true }) : editItem({ name: e.name, qty: '', cat: e.cat }, true);
    if (!pickEdit) return b;
    // Bearbeiten-Modus: ✕ an der Kachel = sofort aus der Auswahl entfernen
    const x = el('button', { type: 'button', className: 'tilex', textContent: '✕', title: 'Aus der Auswahl entfernen', ariaLabel: e.name + ' aus der Auswahl entfernen' });
    x.onclick = () => katAusblenden(e);
    return el('div', { className: 'tilewrap' }, b, x);
  };
  const gruppen = [['Eigene Artikel', alle.filter(e => e.eigen)],
    ...catOrder(doc.lists[cur], CATS).map(c => [c, alle.filter(e => !e.eigen && (CATS.includes(e.cat) ? e.cat : 'Sonstiges') === c)])];
  const teile = gruppen.filter(([, g]) => g.length)
    .flatMap(([c, g]) => [el('h3', { textContent: katName(c) }), el('div', { className: 'tiles' }, ...g.map(tile))]);
  const knopf = (text, fn, cls = 'secondary wide') => { const k = el('button', { type: 'button', className: cls, textContent: text }); k.onclick = fn; return k; };
  if (pickEdit) {
    teile.unshift(knopf('＋ Neuen Eintrag anlegen', () => katBearbeiten({ name: $('pickSearch').value.trim(), cat: 'Sonstiges', neu: true }), 'primary wide'));
    const aus = ausgeblendet(doc.items);
    if (aus.length) teile.push(knopf(`Ausgeblendete zurückholen (${aus.length})`, () => {
      for (const o of aus) touch(o, { deleted: true });
    }));
    if (katEintraegeAnzahl()) teile.push(knopf('Ganze Auswahl auf Standard zurücksetzen', () => {
      if (!confirm('Alle Änderungen an der Auswahl verwerfen? Umbenennungen, eigene Einträge und Ausblendungen gehen verloren.')) return;
      for (const o of Object.values(doc.items)) if (o.listId === KAT_LISTE && !o.deleted) touch(o, { deleted: true });
    }, 'danger wide'));
  } else if (q && !alle.some(e => e.name.toLowerCase() === q)) {
    // Suchbegriff ohne Treffer: als neuen Artikel anbieten
    teile.unshift(knopf(`„${$('pickSearch').value.trim()}“ hinzufügen`, () => {
      addItem($('pickSearch').value, '', 'Sonstiges'); $('pickSearch').value = ''; renderPicker();
    }));
  }
  $('pickGrid').replaceChildren(...teile);
}
const katEintraegeAnzahl = () => Object.values(doc.items).filter(o => o.listId === KAT_LISTE && !o.deleted).length;
$('pickBtn').onclick = () => { $('pickSearch').value = ''; pickEdit = false; renderPicker(); $('pickDlg').showModal(); };
$('pickSearch').oninput = renderPicker;
$('pickEdit').onclick = () => { pickEdit = !pickEdit; renderPicker(); };
$('pickDone').onclick = $('pickFertig').onclick = () => $('pickDlg').close();

// Eintrag der Auswahl bearbeiten (Fenster „Auswahl-Eintrag“)
let katAktuell = null, katBild = null;
// Anpassungs-Eintrag für einen Auswahl-Artikel holen bzw. anlegen
function katEintrag(basis) {
  const id = 'kat:' + basis, alt = doc.items[id];
  return alt && !alt.deleted ? alt : (doc.items[id] = { id, listId: KAT_LISTE, basis, created: Date.now() });
}
function katAusblenden(e) {
  const vorher = doc.items['kat:' + e.basis];
  const neu = !vorher || vorher.deleted;
  const rec = katEintrag(e.basis);
  touch(rec, { aus: true, deleted: false });
  toast(`„${e.name}“ aus der Auswahl entfernt.`, () => neu ? touch(rec, { deleted: true }) : touch(rec, { aus: false }));
}
const katVorschau = () => {
  $('katVorschau').replaceChildren(symbolEl(katBild, $('katIcon').value.trim() || '🛒'));
  $('katBildWeg').hidden = !katBild;
};
$('katIcon').addEventListener('input', katVorschau);
// Vorhandene Symbole zum Antippen; Antippen ersetzt auch ein eigenes Bild
function katSymbole() {
  const ist = $('katIcon').value.trim();
  $('katSymbole').replaceChildren(...ALLE_SYMBOLE.map(s => {
    const b = el('button', { type: 'button', textContent: s, className: s === ist && !katBild ? 'on' : '', ariaLabel: 'Symbol ' + s });
    b.onclick = () => { $('katIcon').value = s; katBild = null; katVorschau(); katSymbole(); };
    return b;
  }));
}
$('katSymbolWahl').onclick = () => {
  const auf = $('katSymbole').hidden;
  $('katSymbole').hidden = !auf; $('katSymbolWahl').ariaExpanded = String(auf);
  if (auf) katSymbole();
};
$('katBildWahl').onclick = () => $('katBildDatei').click();
$('katFoto').onclick = () => $('katFotoDatei').click(); // öffnet direkt die Kamera (am PC: Dateiauswahl)
$('katBildWeg').onclick = () => { katBild = null; katVorschau(); };
$('katBildDatei').onchange = $('katFotoDatei').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (!f.type.startsWith('image/')) return alert('Bitte ein Bild auswählen.');
  try { katBild = await bildVerkleinern(f); katVorschau(); }
  catch { alert('Das Bild konnte nicht gelesen werden. Bitte ein anderes Bild (JPG oder PNG) wählen.'); }
};
function katBearbeiten(e) {
  katAktuell = e;
  $('katHead').textContent = e.neu ? 'Neuer Eintrag' : 'Auswahl-Eintrag ändern';
  $('katName').value = e.name || ''; $('katIcon').value = e.neu ? '' : (e.icon || symbolFuer(KAT, e.name, e.cat));
  katBild = e.bild || null; katVorschau();
  $('katCat').replaceChildren(...catOrder(doc.lists[cur], CATS).map(c => el('option', { value: c, textContent: katName(c) })));
  $('katCat').value = CATS.includes(e.cat) ? e.cat : 'Sonstiges';
  $('katDel').hidden = !!e.neu;
  $('katSymbole').hidden = true; $('katSymbolWahl').ariaExpanded = 'false';
  $('katDlg').returnValue = '';
  $('katDlg').showModal();
}
$('katDlg').addEventListener('close', () => {
  const e = katAktuell; katAktuell = null;
  const r = $('katDlg').returnValue;
  if (!e || (r !== 'save' && r !== 'aus')) return;
  const name = $('katName').value.trim();
  if (r === 'save' && !name) return;
  const basis = e.neu ? name.toLowerCase() : e.basis;
  const rec = katEintrag(basis);
  if (r === 'aus') return katAusblenden(e);
  touch(rec, { name, icon: $('katIcon').value.trim() || undefined, bild: katBild || undefined, cat: $('katCat').value, aus: false, deleted: false });
});

function status(kind, text) { $('syncDot').className = 'dot ' + kind; $('syncText').textContent = text; }

// ---------- Abgleich mit GitHub ----------
const api = () => `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${FILE}`;
const headers = () => ({ Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const b64enc = s => { let b = ''; for (const c of new TextEncoder().encode(s)) b += String.fromCharCode(c); return btoa(b); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

async function ghGet() {
  const r = await fetch(api(), { headers: headers(), cache: 'no-store' });
  if (r.status === 404) return { doc: emptyDoc(), sha: null };
  if (!r.ok) throw new Error(r.status === 401 ? 'Token ungültig' : 'GitHub ' + r.status);
  const j = await r.json();
  return { doc: JSON.parse(b64dec(j.content)), sha: j.sha };
}

async function ghPut(content, prevSha) {
  const body = { message: `Einkaufsliste (${cfg.user || 'App'})`, content: b64enc(JSON.stringify(content, null, 1)) };
  if (prevSha) body.sha = prevSha;
  const r = await fetch(api(), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return null; // inzwischen von anderem Gerät geändert → neu abgleichen
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? 'Keine Schreibrechte' : 'GitHub ' + r.status);
  return (await r.json()).content.sha;
}

let syncing = false, timer = null;
function scheduleSync(ms) { clearTimeout(timer); timer = setTimeout(sync, ms); }

async function sync() {
  if (LOKAL) return status('ok', 'Lokal');
  if (!cfg.token || !cfg.owner || !cfg.repo) return status('err', 'Einrichten');
  if (!navigator.onLine) return status(dirty ? 'busy' : '', 'Offline');
  if (syncing) return scheduleSync(1000);
  syncing = true; status('busy', 'Abgleich…');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await ghGet();
      const merged = merge(doc, remote.doc);
      doc = merged; sha = remote.sha; save(); render();
      if (remote.sha && sameDoc(merged, remote.doc)) { dirty = false; break; }
      const newSha = await ghPut(merged, remote.sha);
      if (newSha) { sha = newSha; dirty = false; break; }
    }
    save();
    status(dirty ? 'err' : 'ok', dirty ? 'Konflikt' : 'Aktuell');
  } catch (e) {
    status('err', navigator.onLine ? e.message : 'Offline');
  } finally { syncing = false; }
}

// ---------- Bedienung ----------
$('name').addEventListener('input', e => { const v = e.target.value.trim(); const c = lastCat(v) || sucheKat(KAT, v)?.cat; if (c) $('cat').value = c; });
$('addForm').onsubmit = e => {
  e.preventDefault();
  addItem($('name').value, $('qty').value.trim(), $('cat').value);
  $('name').value = ''; $('qty').value = ''; $('name').focus();
};
$('listSel').onchange = e => { cur = e.target.value; localStorage.setItem(K('cur'), cur); render(); };
$('clearDone').onclick = () => {
  const t = Date.now();
  for (const i of items()) if (i.done) Object.assign(i, { deleted: true, updatedAt: t });
  dirty = true; save(); render(); scheduleSync(500);
};
$('syncBtn').onclick = () => sync();

// Sortierung der aktuellen Liste (☰-Dialog)
$('sortSel').replaceChildren(...Object.entries(SORTS).map(([v, t]) => el('option', { value: v, textContent: t })));
function renderSortDlg() {
  const l = doc.lists[cur];
  $('sortList').textContent = l.name;
  $('sortSel').value = l.sort || 'kat';
  // Kategorienliste dieser Liste
  const setName = KSETS.find(k => k.id === SET)?.name;
  $('ksetList').textContent = l.name;
  $('ksetSel').replaceChildren(...KSETS.map(k => el('option', { value: k.id, textContent: k.name })));
  $('ksetSel').value = SET;
  $('ksetDel').disabled = SET === STANDARD_SET;
  const nutzer = lists().filter(x => (KSETS.some(k => k.id === x.katSet) ? x.katSet : STANDARD_SET) === SET).map(x => x.name);
  $('ksetInfo').textContent = `Genutzt von: ${nutzer.join(', ')}`;
  $('catHead').textContent = `Kategorien in „${setName}“ – so ordnen, wie du durch den Laden gehst:`;
  const order = catOrder(l, CATS);
  const knopf = (txt, label, fn, off = false, cls = 'icon') => {
    const b = el('button', { type: 'button', className: cls, textContent: txt, title: label, ariaLabel: label, disabled: off });
    b.onclick = fn; return b;
  };
  const schiebe = (c, dir) => () => { touch(l, { cats: verschieben(order, c, dir) }); renderSortDlg(); };
  $('catOrder').replaceChildren(...order.map((c, i) => el('div', { className: 'catrow' },
    el('span', { textContent: `${i + 1}. ${katName(c)}` }),
    knopf('↑', `${katName(c)} nach oben`, schiebe(c, -1), i === 0),
    knopf('↓', `${katName(c)} nach unten`, schiebe(c, 1), i === order.length - 1),
    knopf('✎', `${katName(c)} umbenennen`, () => katgUmbenennen(c)),
    knopf('✕', `${katName(c)} löschen`, () => katgLoeschen(c), c === AUFFANG, 'icon loeschen'))));
}

// ---------- Kategorien hinzufügen, umbenennen, löschen (gilt für alle Listen mit dieser Kategorienliste) ----------
function katgEintrag(key, set = SET) {
  const id = katgId(set, key), alt = doc.items[id];
  return alt && !alt.deleted ? alt : (doc.items[id] = { id, listId: KATG_LISTE, basis: key, created: Date.now(),
    ...(set === STANDARD_SET ? {} : { set }) });
}

// ---------- Kategorienlisten: auswählen, neu, Kopie, umbenennen, löschen ----------
const ksetEintrag = set => {
  const id = 'kset:' + set, alt = doc.items[id];
  return alt && !alt.deleted ? alt : (doc.items[id] = { id, listId: KSET_LISTE, set, created: Date.now() });
};
const ksetVergeben = (name, ausser) => KSETS.some(k => k.id !== ausser && k.name.toLowerCase() === name.toLowerCase());
$('ksetSel').onchange = e => { touch(doc.lists[cur], { katSet: e.target.value }); renderSortDlg(); };
function ksetNeu(kopie) {
  const vorschlag = kopie ? `${KSETS.find(k => k.id === SET).name} (Kopie)` : 'Baumarkt';
  const name = prompt(kopie ? 'Name der kopierten Kategorienliste' : 'Name der neuen Kategorienliste', vorschlag)?.trim();
  if (!name) return;
  if (ksetVergeben(name)) return alert(`Die Kategorienliste „${name}“ gibt es schon.`);
  const set = uid();
  touch(ksetEintrag(set), { name });
  if (kopie) KATS.forEach((k, i) => touch(katgEintrag(k.key, set), { name: k.name, created: Date.now() + i }));
  touch(doc.lists[cur], { katSet: set }); // gleich dieser Liste zuweisen
  renderSortDlg();
  toast(kopie ? `„${name}“ angelegt – mit allen Kategorien von vorher.` : `„${name}“ angelegt. Jetzt mit „＋ Kategorie hinzufügen“ füllen.`);
}
$('ksetNeu').onclick = () => ksetNeu(false);
$('ksetKopie').onclick = () => ksetNeu(true);
$('ksetRename').onclick = () => {
  const alt = KSETS.find(k => k.id === SET).name;
  const name = prompt('Neuer Name der Kategorienliste', alt)?.trim();
  if (!name || name === alt) return;
  if (ksetVergeben(name, SET)) return alert(`Die Kategorienliste „${name}“ gibt es schon.`);
  touch(ksetEintrag(SET), { name });
  renderSortDlg();
};
$('ksetDel').onclick = () => {
  if (SET === STANDARD_SET) return;
  const name = KSETS.find(k => k.id === SET).name, set = SET;
  const nutzer = lists().filter(x => x.katSet === set);
  if (!confirm(`Kategorienliste „${name}“ löschen? ${nutzer.length > 1 ? nutzer.length + ' Listen nutzen' : 'Diese Liste nutzt'} dann wieder „${KSETS[0].name}“.`)) return;
  const rec = ksetEintrag(set);
  touch(rec, { deleted: true });
  renderSortDlg();
  toast(`Kategorienliste „${name}“ gelöscht.`, () => { touch(rec, { deleted: false }); renderSortDlg(); });
};
const katgVergeben = (name, ausser) => KATS.some(k => k.key !== ausser && k.name.toLowerCase() === name.toLowerCase());
$('newCat').onclick = () => {
  const name = prompt('Name der neuen Kategorie, z. B. „Tierbedarf“')?.trim();
  if (!name) return;
  if (katgVergeben(name)) return alert(`Die Kategorie „${name}“ gibt es schon.`);
  touch(katgEintrag(name), { name, aus: false, deleted: false });
  renderSortDlg();
};
function katgUmbenennen(key) {
  const name = prompt('Neuer Name der Kategorie', katName(key))?.trim();
  if (!name || name === katName(key)) return;
  if (katgVergeben(name, key)) return alert(`Die Kategorie „${name}“ gibt es schon.`);
  touch(katgEintrag(key), { name, aus: false });
  renderSortDlg();
}
function katgLoeschen(key) {
  if (key === AUFFANG) return;
  const anzahl = Object.values(doc.items).filter(i => !i.deleted && i.cat === key && !String(i.listId).startsWith('_')).length;
  if (!confirm(`Kategorie „${katName(key)}“ löschen?` + (anzahl ? ` ${anzahl} Artikel darin landen unter „${katName(AUFFANG)}“.` : ''))) return;
  const name = katName(key), rec = katgEintrag(key);
  touch(rec, { aus: true });
  renderSortDlg();
  toast(`Kategorie „${name}“ gelöscht.`, () => { touch(rec, { aus: false }); renderSortDlg(); });
}
$('sortSel').onchange = e => { touch(doc.lists[cur], { sort: e.target.value }); renderSortDlg(); };
$('resetCats').onclick = () => { touch(doc.lists[cur], { cats: [] }); renderSortDlg(); };
$('listMenuBtn').onclick = () => { renderSortDlg(); $('listDlg').showModal(); };
$('newList').onclick = () => {
  const n = prompt('Name der neuen Liste', 'Baumarkt'); if (!n?.trim()) return;
  const id = uid(); doc.lists[id] = { id, name: n.trim(), created: Date.now() };
  cur = id; touch(doc.lists[id], {}); $('listDlg').close();
};
$('renameList').onclick = () => {
  const l = doc.lists[cur]; const n = prompt('Neuer Name', l.name);
  if (n?.trim()) touch(l, { name: n.trim() }); $('listDlg').close();
};
$('deleteList').onclick = () => {
  const l = doc.lists[cur];
  if (lists().length < 2) return alert('Die letzte Liste kann nicht gelöscht werden.');
  if (!confirm(`Liste „${l.name}“ mit allen Artikeln löschen?`)) return;
  const t = Date.now();
  for (const i of items()) Object.assign(i, { deleted: true, updatedAt: t });
  touch(l, { deleted: true }); $('listDlg').close();
};

$('settingsBtn').onclick = () => {
  // Konto aus der Pages-Adresse (racerman76.github.io → racerman76) vorbelegen
  const pagesOwner = location.hostname.endsWith('.github.io') ? location.hostname.split('.')[0] : '';
  $('cfgUser').value = cfg.user || ''; $('cfgOwner').value = cfg.owner || pagesOwner;
  $('cfgRepo').value = cfg.repo || 'einkaufsliste-daten'; $('cfgToken').value = cfg.token || '';
  // Lokal: GitHub-Felder weg (deaktiviert → keine Pflichtfelder)
  $('ghBox').hidden = $('copyLink').hidden = LOKAL; $('lokalInfo').hidden = !LOKAL;
  $('ghBox').querySelectorAll('input').forEach(i => i.disabled = LOKAL);
  $('setDlg').showModal();
};
const tokenOk = t => /^(github_pat_|ghp_)\w+$/.test(t);
$('cfgToken').addEventListener('input', e => {
  // In der Android-App öffnet der Einrichtungslink den Browser – daher Link hier einfügen können
  if (e.target.value.includes('#setup=')) try {
    const c = parseSetup(e.target.value);
    $('cfgOwner').value = c.owner; $('cfgRepo').value = c.repo; e.target.value = c.token;
  } catch {}
  e.target.setCustomValidity(tokenOk(e.target.value.trim()) ? '' : 'Das ist kein GitHub-Token (beginnt mit github_pat_…) und kein Einrichtungslink.');
});
$('setDlg').addEventListener('close', () => {
  if ($('setDlg').returnValue !== 'save') return;
  if (LOKAL) { cfg = { user: $('cfgUser').value.trim() }; localStorage.setItem(K('cfg'), JSON.stringify(cfg)); return render(); }
  const owner = $('cfgOwner').value.trim(), repo = $('cfgRepo').value.trim(), token = $('cfgToken').value.trim();
  if (cfg.owner !== owner || cfg.repo !== repo) { sha = null; dirty = true; } // anderes Repo: lokalen Stand dorthin übernehmen
  cfg = { user: $('cfgUser').value.trim(), owner, repo, token };
  localStorage.setItem(K('cfg'), JSON.stringify(cfg)); save(); render(); sync();
});

// ---------- Sicherung (Datei) ----------
$('sichern').onclick = async () => {
  const name = `einkaufsliste-${LOKAL ? 'lokal-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
  const text = JSON.stringify(doc, null, 1);
  try {
    if (isApk) {
      // Android-App: Datei im App-Cache ablegen und über „Teilen“ speichern (Dateien, Drive, Mail …)
      const C = window.Capacitor;
      const { uri } = await C.nativePromise('Filesystem', 'writeFile', { path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await C.nativePromise('Share', 'share', { title: 'Einkaufsliste – Sicherung', url: uri, dialogTitle: 'Sicherung speichern oder senden' });
    } else {
      const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  } catch (e) { if (!/cancel/i.test(e?.message || '')) alert('Sichern hat nicht geklappt: ' + (e?.message || e)); }
};
$('wiederBtn').onclick = () => $('wiederDatei').click();
$('wiederDatei').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  let neu;
  try { neu = JSON.parse(await f.text()); } catch {}
  if (!neu || typeof neu.items !== 'object' || typeof neu.lists !== 'object') return alert('Das ist keine Sicherung der Einkaufsliste.');
  doc = merge(doc, neu); dirty = true; save(); render(); sync();
  const n = Object.values(neu.lists).filter(l => !l.deleted).length;
  toast(`Sicherung übernommen: ${n} ${n === 1 ? 'Liste' : 'Listen'}.`);
};
$('copyLink').onclick = async () => {
  const c = { owner: $('cfgOwner').value.trim(), repo: $('cfgRepo').value.trim(), token: $('cfgToken').value.trim() };
  if (!c.owner || !c.repo || !tokenOk(c.token)) return alert('Erst Konto, Repo und ein gültiges Token (github_pat_…) eintragen.');
  // In der Android-App ist die Adresse "localhost" – dann auf die GitHub-Pages-Adresse verlinken
  const base = location.hostname.endsWith('.github.io') ? location.origin + location.pathname : `https://${c.owner}.github.io/einkaufsliste/`;
  const link = base + '#setup=' + btoa(unescape(encodeURIComponent(JSON.stringify(c))));
  try { await navigator.clipboard.writeText(link); alert('Link kopiert. Nur an Familienmitglieder schicken – er enthält das Token.'); }
  catch { prompt('Link kopieren:', link); }
};

// ---------- Spracheingabe ----------
// Mehrere Artikel ansagen: "Milch, zwei Liter Saft und Brot". Erkennung im Browser über die
// eingebaute Spracherkennung, in der Android-App über die Erweiterung @capacitor-community/speech-recognition.
const WebSR = window.SpeechRecognition || window.webkitSpeechRecognition;
let toastTimer = null, rueckgaengig = null;
function toast(text, undo, dauer = 8000) {
  $('toastText').textContent = text;
  rueckgaengig = undo || null; $('toastUndo').hidden = !undo;
  // Ist ein Fenster offen, gehört der Hinweis hinein – sonst wäre er dahinter nicht antippbar
  const fenster = [...document.querySelectorAll('dialog[open]')].at(-1);
  (fenster || document.body).append($('toast'));
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  if (dauer) toastTimer = setTimeout(() => { $('toast').hidden = true; rueckgaengig = null; }, dauer);
}
$('toastZu').onclick = () => { $('toast').hidden = true; rueckgaengig = null; };
$('toastUndo').onclick = () => { rueckgaengig?.(); $('toast').hidden = true; rueckgaengig = null; };

// Gesprochenen Text auf die Liste setzen – mit Kategorie und Schreibweise aus der Auswahl
function spracheVerarbeiten(text) {
  // bekannt: Artikel aus der Auswahl oder schon einmal benutzt – hilft beim Trennen ohne Pausen
  const bekannt = n => KAT.some(e => normiert(e.name) === normiert(n)) || !!lastCat(n);
  const artikel = zerlegen(text, bekannt);
  if (!artikel.length) return toast(`Nichts erkannt in „${text}“. Bitte nochmal versuchen.`);
  const vorher = new Map(items().map(i => [i.id, { done: i.done, qty: i.qty, cat: i.cat }]));
  for (const a of artikel) {
    const k = KAT.find(e => normiert(e.name) === normiert(a.name));
    a.name = k ? k.name : a.name; // Schreibweise aus der Auswahl ("Apfel" → "Äpfel")
    addItem(a.name, a.qty, k?.cat || lastCat(a.name) || 'Sonstiges');
  }
  const neu = items().filter(i => !vorher.has(i.id));
  const reaktiviert = items().filter(i => vorher.has(i.id) && vorher.get(i.id).done && !i.done);
  toast(`Hinzugefügt: ${artikel.map(a => a.qty ? `${a.name} (${a.qty})` : a.name).join(', ')}`, () => {
    for (const i of neu) touch(i, { deleted: true });
    for (const i of reaktiviert) touch(i, vorher.get(i.id));
  });
}

let hoertZu = false, webRec = null;
function micZustand(an) { hoertZu = an; $('micBtn').classList.toggle('hoert', an); $('micBtn').ariaPressed = String(an); }

async function sprechen() {
  if (isApk) {
    const nat = (methode, daten = {}) => window.Capacitor.nativePromise('SpeechRecognition', methode, daten);
    try {
      const recht = await nat('requestPermissions');
      if (recht?.speechRecognition !== 'granted') return toast('Ohne Mikrofon-Erlaubnis geht die Spracheingabe nicht. Erlauben unter Einstellungen → Apps → Einkauf → Berechtigungen.');
      // popup: zeigt das Google-Sprachfenster; Ergebnis kommt erst nach dem Sprechen zurück
      const r = await nat('start', { language: 'de-DE', maxResults: 1, partialResults: false, popup: true,
        prompt: 'Artikel ansagen, z. B. „Milch, 2 Liter Saft und Brot“' });
      const text = r?.matches?.[0];
      if (text) spracheVerarbeiten(text);
    } catch (e) {
      const m = String(e?.message || e);
      if (/not available|nicht verfügbar|unavailable/i.test(m)) toast('Auf diesem Handy ist keine Spracherkennung verfügbar. Bitte die Google-App bzw. „Google Sprachdienste“ installieren.');
      else if (!/^0$/.test(m)) toast('Spracheingabe abgebrochen.'); // 0 = Fenster ohne Ergebnis geschlossen
    }
    return;
  }
  if (!WebSR) return toast('Dieser Browser kann keine Spracheingabe. Tipp: Ins Artikelfeld tippen und das Mikrofon der Tastatur nutzen.', null, 10000);
  if (hoertZu) { webRec?.stop(); return; } // nochmal tippen = fertig
  webRec = new WebSR();
  Object.assign(webRec, { lang: 'de-DE', interimResults: true, continuous: false, maxAlternatives: 1 });
  let endText = '';
  webRec.onresult = e => {
    let zwischen = ''; endText = '';
    for (const r of e.results) (r.isFinal ? (endText += r[0].transcript + ' ') : (zwischen += r[0].transcript));
    toast(`🎤 ${(endText + zwischen).trim() || '…'}`, null, 0);
  };
  webRec.onerror = e => {
    micZustand(false);
    toast(e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? 'Mikrofon nicht erlaubt. Bitte im Browser bzw. in den Handy-Einstellungen das Mikrofon für diese Seite erlauben.'
      : e.error === 'no-speech' ? 'Nichts gehört – bitte nochmal auf 🎤 tippen und sprechen.'
      : `Spracheingabe nicht möglich (${e.error}).`);
  };
  webRec.onend = () => { micZustand(false); if (endText.trim()) spracheVerarbeiten(endText); else if (!$('toast').hidden && $('toastText').textContent.startsWith('🎤')) $('toast').hidden = true; };
  micZustand(true);
  toast('🎤 Ich höre zu … z. B. „Milch, 2 Liter Saft und Brot“', null, 0);
  try { webRec.start(); } catch { micZustand(false); }
}
$('micBtn').onclick = () => sprechen();

// ---------- Version und Update ----------
const APP_REPO = 'racerman76/einkaufsliste-lokal';
const isApk = !!window.Capacitor?.isNativePlatform?.();
const isWin = /Electron/.test(navigator.userAgent); // Windows-Programm (Electron)
if (isWin) $('micBtn').hidden = true; // Electron hat keinen Spracherkennungsdienst
let updVer = null, updBody = '';
$('verText').textContent = `Version ${VERSION} (${isApk ? 'Android-App' : isWin ? 'Windows-Programm' : 'Web-App'}${LOKAL ? ', lokal' : ''})`;

async function checkUpdate(manual) {
  try {
    const r = await fetch(`https://api.github.com/repos/${APP_REPO}/releases/latest`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const rel = await r.json(), tag = rel.tag_name || '';
    updVer = neuer(tag, VERSION) ? tag.replace(/^v/, '') : null;
    updBody = rel.body || '';
  } catch { if (manual) alert('Update-Prüfung nicht möglich – keine Verbindung zu GitHub?'); return; }
  $('updBar').hidden = !updVer;
  if (updVer) {
    $('updText').textContent = `Version ${updVer} ist da (du hast ${VERSION}).`;
    $('updBtn').textContent = isApk || isWin ? 'Herunterladen' : 'Neu laden';
  } else if (manual) alert(`Du hast die neueste Version (${VERSION}).`);
}
$('checkUpd').onclick = () => checkUpdate(true);

// ---------- Neuigkeiten ----------
const versionsBlock = (version, titel, punkte, extra) => el('section', { className: 'news' },
  el('h3', {}, `${titel} `, el('small', { textContent: version.includes('.') && !extra?.ohneNr ? `Version ${version}` : '' }),
    ...(extra?.aktuell ? [el('span', { className: 'aktuell', textContent: 'deine Version' })] : [])),
  el('ul', {}, ...punkte.map(p => el('li', { textContent: p }))));

$('newsBtn').onclick = () => {
  $('newsHead').textContent = 'Neuigkeiten';
  $('newsBody').replaceChildren(...AENDERUNGEN.map(a =>
    versionsBlock(a.version, a.titel, a.punkte, { aktuell: a.version === VERSION, ohneNr: a.ohneRelease })));
  $('newsDlg').showModal();
};
// Was bringt das Update? Text kommt aus dem GitHub-Release (Markdown, einfach aufbereitet)
$('updNews').onclick = () => {
  const zeilen = updBody.split(/\r?\n/).map(z => z.trim()).filter(Boolean);
  const titel = (zeilen.find(z => z.startsWith('#')) || `Version ${updVer}`).replace(/^#+\s*/, '');
  const punkte = zeilen.filter(z => z.startsWith('- ')).map(z => z.slice(2));
  $('newsHead').textContent = `Neu in Version ${updVer}`;
  $('newsBody').replaceChildren(versionsBlock(updVer, titel, punkte.length ? punkte : ['Keine Beschreibung vorhanden.'], { ohneNr: true }));
  $('newsDlg').showModal();
};
$('updBtn').onclick = async () => {
  if (isApk) {
    // Öffnet den Browser; GitHub leitet weiter, der Download startet erst nach einigen Sekunden
    $('updText').textContent = `Download von ${updVer} läuft im Browser – das kann bis zu einer Minute dauern. ` +
      'Danach oben die Download-Meldung antippen und „Installieren“ wählen.';
    $('updBtn').disabled = true; $('updBtn').textContent = 'Lädt …';
    setTimeout(() => { $('updBtn').disabled = false; $('updBtn').textContent = 'Nochmal laden'; }, 60000);
    location.href = `https://github.com/${APP_REPO}/releases/download/v${updVer}/Einkaufsliste-lokal.apk`;
  } else if (isWin) {
    // Windows: Installer im Standard-Browser laden; danach ausführen (Daten bleiben erhalten)
    window.open(`https://github.com/${APP_REPO}/releases/download/v${updVer}/Einkaufsliste-lokal-Setup.exe`);
    $('updText').textContent = `Installer für ${updVer} wird im Browser geladen – danach ausführen und die App neu starten.`;
  } else {
    try { await (await navigator.serviceWorker?.getRegistration())?.update(); } catch {}
    location.reload();
  }
};

window.addEventListener('online', () => sync());
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
setInterval(() => { if (!document.hidden) sync(); }, 20000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); // in der Android-App gibt es kein sw.js

// Android-App: beim Bauen eingebauter Einrichtungslink (preset.json, nur in der APK vorhanden)
if (!cfg.token && !LOKAL) try {
  const r = await fetch('preset.json');
  if (r.ok) { cfg = { ...parseSetup((await r.json()).link), user: cfg.user || '' }; localStorage.setItem(K('cfg'), JSON.stringify(cfg)); }
} catch {}

// ---------- Fenster verschieben ----------
// Am Titel (h2) ziehen – mit Finger oder Maus. Die Position bleibt bis zum Neuladen erhalten,
// wird aber immer so begrenzt, dass der Titel auf dem Bildschirm bleibt.
function verschiebbar(dlg) {
  const griff = dlg.querySelector('h2');
  griff.classList.add('griff'); griff.title = 'Zum Verschieben ziehen';
  // ✕ oben rechts: schließt wie „Abbrechen“ (nichts wird gespeichert)
  const zu = el('button', { type: 'button', className: 'xbtn', textContent: '✕', title: 'Schließen', ariaLabel: 'Schließen' });
  zu.onclick = () => dlg.close('');
  dlg.prepend(zu);
  let x = 0, y = 0, sx, sy, ox, oy;
  const setze = (nx, ny) => {
    dlg.style.translate = '0 0';
    const r = dlg.getBoundingClientRect(), g = griff.getBoundingClientRect(), rand = 48;
    const vw = window.visualViewport?.width || innerWidth, vh = window.visualViewport?.height || innerHeight;
    x = Math.min(Math.max(nx, rand - r.right), vw - rand - r.left);
    y = Math.min(Math.max(ny, 4 - g.top), vh - 4 - g.bottom); // Titel bleibt immer sichtbar
    dlg.style.translate = `${x}px ${y}px`;
  };
  griff.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    sx = e.clientX; sy = e.clientY; ox = x; oy = y;
    griff.setPointerCapture(e.pointerId); e.preventDefault();
  });
  griff.addEventListener('pointermove', e => {
    if (griff.hasPointerCapture(e.pointerId)) setze(ox + e.clientX - sx, oy + e.clientY - sy);
  });
  griff.addEventListener('dblclick', () => setze(0, 0)); // Doppeltippen = zurück in die Mitte
  new MutationObserver(() => { if (dlg.open) requestAnimationFrame(() => setze(x, y)); })
    .observe(dlg, { attributes: true, attributeFilter: ['open'] });
}
['editDlg', 'setDlg', 'listDlg', 'newsDlg', 'katDlg'].forEach(id => verschiebbar($(id)));

render();
if (!cfg.token && !LOKAL) $('settingsBtn').click(); else sync();
checkUpdate(false);
