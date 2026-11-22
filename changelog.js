// Änderungen je Version (neueste zuerst). Wird in der App unter ⚙ → „Neuigkeiten“ angezeigt
// und beim Bauen als Release-Beschreibung auf GitHub verwendet.
export const AENDERUNGEN = [
  {
    version: '1.0.0', titel: 'Einkaufsliste lokal – erste Version',
    punkte: [
      'Eigenständige Einkaufsliste, die alles nur auf dem eigenen Gerät speichert – kein GitHub-Konto, kein Token, kein Internet nötig. Teilen mit anderen gibt es hier nicht.',
      'Für Windows als Programm zum Installieren (Einkaufsliste-lokal-Setup.exe) und für Android als App „Einkauf lokal“ mit blauem Symbol (Einkaufsliste-lokal.apk). Beide lassen sich neben der Online-Einkaufsliste installieren.',
      'Alles wie in der Online-Version: mehrere Listen, Kategorien und Ladenweg, eigene Kategorienlisten je Liste, Symbol-Auswahl mit Mengenabfrage, eigene Artikel mit Symbol oder Foto, Spracheingabe (Android).',
      '⚙ → „💾 Sichern“ speichert alle Listen als Datei, „📂 Einlesen“ übernimmt eine Sicherung (je Eintrag gewinnt der neuere Stand). Damit lassen sich Listen auch zwischen Windows-PC und Handy übertragen.',
    ],
  },
];

export function releaseText(version) {
  const e = AENDERUNGEN.find(a => a.version === version);
  if (!e) return null;
  return `### ${e.titel}\n\n${e.punkte.map(p => `- ${p}`).join('\n')}\n\n` +
    '**Installieren:** Windows – Einkaufsliste-lokal-Setup.exe laden und ausführen. ' +
    'Android – Einkaufsliste-lokal.apk laden und installieren. Bei Updates einfach über die alte Version installieren, die Daten bleiben erhalten.';
}
