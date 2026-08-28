// Vérifie que le routage classe correctement de vraies questions
// d'élèves. Lit les expressions directement dans l'Edge Function,
// pour qu'un changement de prompt ne puisse pas passer inaperçu.
//
//   node scripts/check_routing.mjs

import fs from 'fs';

const src = fs.readFileSync('supabase/functions/tutor/index.ts', 'utf8');

function grab(name) {
  const start = src.indexOf(`const ${name} = new RegExp(`);
  if (start === -1) throw new Error(`${name} introuvable`);
  const open = src.indexOf('[', start);
  const close = src.indexOf('].join', open);
  const body = src.slice(open, close + 1);
  const parts = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    m[1].replace(/\\\\/g, '\\'),
  );
  return new RegExp(parts.join('|'), 'i');
}

const REASONING = grab('REASONING_HINTS');
const EXPLANATION = grab('EXPLANATION_HINTS');
const REASONING_SUBJECTS = new Set(['math', 'physique', 'chimie']);

const route = (q, subject) =>
  REASONING_SUBJECTS.has(subject) ? 'RAISONNEMENT medium'
  : REASONING.test(q) ? 'CALCUL       medium'
  : EXPLANATION.test(q) ? 'EXPLICATION  low'
  : 'RAPIDE       minimal';

// [question, matière, route attendue]
const CAS = [
  // Restitution : court et immédiat
  ["Qui a proclamé l'indépendance ?", 'histoire', 'RAPIDE'],
  ['En quelle année la bataille de Vertières ?', 'histoire', 'RAPIDE'],
  ['Traduis « maison » en anglais', 'anglais', 'RAPIDE'],

  // Demande de compréhension : il faut de la place pour un exemple
  ['Explique-moi la photosynthèse', 'svt', 'EXPLICATION'],
  ['Pourquoi il pleut ?', 'geo', 'EXPLICATION'],
  ["C'est quoi un adjectif ?", 'francais', 'EXPLICATION'],
  ['Quelle est la différence entre un nom et un verbe ?', 'francais', 'EXPLICATION'],
  ['Je ne comprends pas les accords', 'francais', 'EXPLICATION'],
  ['Donne-moi un exemple de métaphore', 'francais', 'EXPLICATION'],
  ['Kisa fotosentèz la ye ?', 'svt', 'EXPLICATION'],
  ['Esplike m akò patisip pase a', 'creole', 'EXPLICATION'],
  ['Poukisa lapli tonbe ?', 'geo', 'EXPLICATION'],

  // Calcul : raisonnement déroulé
  ['Calcule 3/4 + 4/6', 'math', 'RAISONNEMENT'],
  ['Résous 2x + 3 = 9', 'general', 'CALCUL'],
  ["Quelle est l'aire d'un triangle ?", 'general', 'CALCUL'],
  ['Kalkil pousantaj sa a', 'general', 'CALCUL'],
];

let echecs = 0;
for (const [q, subject, attendu] of CAS) {
  const obtenu = route(q, subject);
  const ok = obtenu.startsWith(attendu);
  if (!ok) echecs++;
  console.log(`${ok ? 'ok  ' : 'ECHEC'} ${obtenu} | ${q}`);
}

console.log(
  echecs === 0
    ? `\n${CAS.length}/${CAS.length} — routage conforme`
    : `\n${echecs} cas mal classes sur ${CAS.length}`,
);
process.exit(echecs === 0 ? 0 : 1);
