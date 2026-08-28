// Vérifie que chaque clé t('…') utilisée dans l'app existe bien
// en français ET en créole.
//
// Une clé absente ne plante pas : elle s'affiche telle quelle à
// l'écran (« path.tapToLearn »), ce qui passe inaperçu en
// développement et saute aux yeux de l'élève.
//
//   node scripts/check_i18n.mjs

import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'src'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Extrait l'objet exporté d'un dictionnaire i18n en clés plates. */
function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

/** Lit un dictionnaire sans l'exécuter : on récupère les chemins. */
function keysOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const keys = new Set();
  const stack = [];
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    const open = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*\{/);
    if (open) {
      stack.push(open[1]);
      continue;
    }
    if (/^\},?$/.test(trimmed)) {
      stack.pop();
      continue;
    }
    const leaf = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
    if (leaf) keys.add([...stack, leaf[1]].join('.'));
  }
  return keys;
}

const fr = keysOf('src/i18n/fr.ts');
const ht = keysOf('src/i18n/ht.ts');

const used = new Map(); // clé -> fichiers
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!used.has(m[1])) used.set(m[1], []);
      used.get(m[1]).push(file);
    }
  }
}

let problemes = 0;
for (const [key, files] of [...used].sort()) {
  const manqueFr = !fr.has(key);
  const manqueHt = !ht.has(key);
  if (manqueFr || manqueHt) {
    problemes++;
    const quoi = manqueFr && manqueHt ? 'FR + HT' : manqueFr ? 'FR' : 'HT';
    console.log(`MANQUE ${quoi.padEnd(7)} ${key}`);
    console.log(`        utilisée dans ${[...new Set(files)].join(', ')}`);
  }
}

console.log(
  problemes === 0
    ? `\n${used.size} clés utilisées — toutes présentes en FR et HT`
    : `\n${problemes} clé(s) manquante(s) sur ${used.size}`,
);
process.exit(problemes === 0 ? 0 : 1);
