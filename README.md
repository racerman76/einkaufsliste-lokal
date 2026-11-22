# Einkaufsliste lokal

Einkaufsliste, die **alles nur auf dem eigenen Gerät** speichert – kein GitHub-Konto, kein Token, kein Internet nötig.
Eigenständiges Projekt neben der Online-Einkaufsliste ([racerman76/einkaufsliste](https://github.com/racerman76/einkaufsliste)), die davon unberührt bleibt.

## Herunterladen

| Gerät | Datei |
|---|---|
| **Windows** | [Einkaufsliste-lokal-Setup.exe](https://github.com/racerman76/einkaufsliste-lokal/releases/latest/download/Einkaufsliste-lokal-Setup.exe) |
| **Android** | [Einkaufsliste-lokal.apk](https://github.com/racerman76/einkaufsliste-lokal/releases/latest/download/Einkaufsliste-lokal.apk) |

Alle Versionen: [Releases](https://github.com/racerman76/einkaufsliste-lokal/releases)

### Windows
Setup ausführen. Weil der Installer nicht kostenpflichtig signiert ist, warnt Windows beim ersten Mal („Der Computer wurde durch Windows geschützt“) → **Weitere Informationen → Trotzdem ausführen**.
Danach gibt es „Einkaufsliste lokal“ im Startmenü und auf dem Desktop. Die Daten liegen unter `%APPDATA%\Einkaufsliste lokal` und bleiben bei Updates und Neuinstallation erhalten.

### Android
APK laden und installieren (Installation aus dieser Quelle erlauben). Die App heißt „Einkauf lokal“ (blaues Symbol) und lässt sich neben der Online-App installieren.

## Sichern und übertragen
⚙ → **💾 Sichern** speichert alle Listen als Datei (am Handy über „Teilen“, z. B. in Dateien oder Drive).
⚙ → **📂 Einlesen** übernimmt eine Sicherung; je Eintrag gewinnt der neuere Stand. So lassen sich Listen zwischen Windows-PC und Handy übertragen.
Ohne Sicherung sind die Daten weg, wenn die App deinstalliert (Android) oder das Gerät gewechselt wird.

## Updates
In der App unter ⚙ → „Nach Updates suchen“. Ein Update wird einfach über die alte Version installiert.

## Entwicklung
- Web-App: `index.html`, `app.js` und Module (ohne Build-Schritt). Fest auf lokalen Speicher eingestellt (`window.EK_LOKAL`).
- Android: Capacitor 7 (`capacitor.config.json`, App-ID `de.racerman76.einkaufsliste.lokal`).
- Windows: Electron + electron-builder im Ordner `desktop/`.
- Neue Version: `VERSION` in `version.js` hochzählen und Eintrag oben in `changelog.js` ergänzen. Der Push baut APK und Installer und legt ein Release an (`.github/workflows/apps-bauen.yml`).
- Selbsttests: `for t in *.test.mjs; do node $t; done`

```
export const VERSION = '1.0.0';
```
