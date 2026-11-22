// Für den GitHub-Build: `node release-text.mjs 1.7.0` gibt den Release-Text aus,
// `node release-text.mjs --alle` die Versionen, für die es einen Release gibt.
import { AENDERUNGEN, releaseText } from './changelog.js';

const arg = process.argv[2];
if (arg === '--alle') console.log(AENDERUNGEN.filter(a => !a.ohneRelease).map(a => a.version).join('\n'));
else {
  const t = releaseText(arg);
  if (!t) { console.error(`Kein Eintrag für Version ${arg} in changelog.js`); process.exit(1); }
  console.log(t);
}
