// Vérifie qu'aucune URL n'est réclamée par deux écrans.
//
//   node scripts/check_routes.mjs
//
// LE BUG QUI A MOTIVÉ CE SCRIPT. Un dossier entre parenthèses est un
// GROUPE : il n'ajoute aucun segment d'URL. En créant
// `app/(prof)/index.tsx` à côté de `app/(tabs)/index.tsx`, deux
// fichiers se sont retrouvés à réclamer `/`. L'application s'est
// ouverte sur « Unmatched Route », en anglais, pour tout le monde.
//
// TypeScript ne l'a pas vu — le typage des routes était vert. Ça ne
// se voit qu'à l'exécution, sur l'écran d'accueil, c'est-à-dire au
// pire endroit possible. Ce script le voit sans lancer l'app.

import fs from 'fs';
import path from 'path';

/** Tous les fichiers de route sous app/. */
function routes(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) routes(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** L'URL que sert un fichier, ou null s'il n'en sert aucune. */
function urlDe(fichier) {
  const rel = fichier.replace(/\\/g, '/').replace(/^app\//, '').replace(/\.tsx?$/, '');
  const bouts = rel.split('/');

  const nom = bouts[bouts.length - 1];
  // `_layout` n'est pas une page, et `+not-found` est le filet.
  if (nom.startsWith('_') || nom.startsWith('+')) return null;

  const segments = bouts
    // Un groupe entre parenthèses ne compte pas dans le chemin.
    // C'est TOUTE la subtilité, et c'est elle qu'on avait ratée.
    .filter((b) => !/^\(.+\)$/.test(b))
    // `index` sert le dossier qui le contient.
    .filter((b, i, a) => !(b === 'index' && i === a.length - 1));

  return '/' + segments.join('/');
}

const fichiers = routes('app');
const parUrl = new Map();

for (const f of fichiers) {
  const url = urlDe(f);
  if (url === null) continue;
  if (!parUrl.has(url)) parUrl.set(url, []);
  parUrl.get(url).push(f.replace(/\\/g, '/'));
}

let collisions = 0;
for (const [url, liste] of [...parUrl].sort()) {
  if (liste.length > 1) {
    collisions++;
    console.log(`COLLISION  ${url || '/'}`);
    for (const f of liste) console.log(`           ${f}`);
    console.log('           ⤷ un groupe (entre parenthèses) n\'ajoute pas de segment');
  }
}

console.log(
  collisions === 0
    ? `\n${parUrl.size} routes — aucune collision`
    : `\n${collisions} URL réclamée(s) par plusieurs écrans`,
);
process.exit(collisions === 0 ? 0 : 1);
