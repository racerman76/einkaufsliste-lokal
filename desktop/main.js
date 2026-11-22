// Windows-Programm „Einkaufsliste lokal“: zeigt die Web-App aus dem Ordner app/ in einem eigenen Fenster.
// Die Daten liegen im Benutzerprofil (%APPDATA%\Einkaufsliste lokal) und bleiben bei Updates erhalten.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('node:path');

if (!app.requestSingleInstanceLock()) app.quit();
let win;

function fensterAuf() {
  win = new BrowserWindow({
    width: 520, height: 900, minWidth: 360, minHeight: 500,
    title: 'Einkaufsliste lokal', icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    autoHideMenuBar: true, backgroundColor: '#f6f7f5',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: false, spellcheck: true },
  });
  Menu.setApplicationMenu(null);
  // Links nach außen (Update-Download, GitHub) im Standard-Browser öffnen, nie im App-Fenster
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

// Electron kennt kein window.prompt – kleines Eingabefenster; Ergebnis kommt über den Fenstertitel zurück
const PROMPT_HTML = `<!doctype html><meta charset="utf-8"><style>
body{font:15px "Segoe UI",system-ui,sans-serif;margin:16px;background:#fff;color:#1d2b22}
input{width:100%;box-sizing:border-box;font:inherit;padding:7px;margin:10px 0;border:1px solid #9aa;border-radius:6px}
div{text-align:right}button{font:inherit;padding:5px 18px;margin-left:8px;border-radius:6px;border:1px solid #9aa;background:#f4f6f5}
#ok{background:#2f5f9e;color:#fff;border-color:#2f5f9e}</style>
<label id="t" for="i"></label><input id="i"><div><button id="ok">OK</button><button id="ab">Abbrechen</button></div>
<script>
const d = JSON.parse(decodeURIComponent(location.hash.slice(1)));
t.textContent = d.text; i.value = d.vorgabe; i.focus(); i.select();
const fertig = v => { document.title = v === null ? 'ABBRUCH' : 'OK:' + v; };
ok.onclick = () => fertig(i.value); ab.onclick = () => fertig(null);
onkeydown = e => { if (e.key === 'Enter') fertig(i.value); if (e.key === 'Escape') fertig(null); };
</script>`;

ipcMain.on('prompt', (e, text, vorgabe) => {
  let antwort = null;
  const w = new BrowserWindow({
    parent: BrowserWindow.fromWebContents(e.sender), modal: true, show: false,
    width: 440, height: 200, resizable: false, minimizable: false, maximizable: false,
    title: 'Einkaufsliste lokal', autoHideMenuBar: true,
  });
  w.setMenu(null);
  w.on('page-title-updated', (ev, titel) => {
    ev.preventDefault();
    if (titel === 'ABBRUCH' || titel.startsWith('OK:')) { antwort = titel === 'ABBRUCH' ? null : titel.slice(3); w.close(); }
  });
  w.on('closed', () => { e.returnValue = antwort; });
  w.once('ready-to-show', () => w.show());
  w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(PROMPT_HTML) + '#' + encodeURIComponent(JSON.stringify({ text, vorgabe })));
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(fensterAuf);
app.on('window-all-closed', () => app.quit());
