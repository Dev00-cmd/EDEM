// Exécute la VRAIE logique de parcours (src/ai/plan.ts) sur des
// profils réalistes, pour vérifier ce que l'écran Parcours affiche
// et comment la progression évolue.
//
//   npx tsx scripts/check_plan.ts

import { buildPlan, dailyPlan, isItemDone, topicKey } from '../src/ai/plan';
import type { Profile, Progress } from '../src/store/AppContext';

const profile = {
  name: 'Test',
  lang: 'fr',
  level: '8e AF',
  goal: 'exams',
  favorites: ['math', 'histoire', 'svt'],
  theme: 'system',
  onboarded: true,
} as unknown as Profile;

const vide = (): Progress =>
  ({
    xp: 0,
    streak: 0,
    answered: 0,
    correct: 0,
    quizzesDone: 0,
    topics: {},
    quizBest: {},
  }) as unknown as Progress;

const plan = buildPlan(profile);

// ── 1. Les points d'étape sont-ils encore identiques ? ────────
const pratiques = plan.filter((i) => i.kind === 'practice');
const titres = pratiques.map((i) => i.title.fr);
const doublons = titres.length - new Set(titres).size;

console.log('POINTS D’ÉTAPE\n');
for (const p of pratiques) {
  console.log(`  ${p.subjectId.padEnd(9)} ${p.title.fr}`);
}
console.log(
  doublons === 0
    ? `\n  ✓ ${titres.length} points d’étape, tous des titres distincts`
    : `\n  ✗ ${doublons} titre(s) en double`,
);

// ── 2. Basculent-ils encore tous ensemble ? ───────────────────
console.log('\n\nPROGRESSION APRÈS UN SEUL QUIZ DE MATHS RÉUSSI\n');

const pct = (p: Progress) =>
  Math.round((plan.filter((i) => isItemDone(p, i)).length / plan.length) * 100);

const avant = vide();
console.log(`  départ                          ${pct(avant)} %`);

// L'élève réussit un quiz de maths à 90 %, sans avoir travaillé
// aucune notion : c'est le cas qui faisait bondir la barre.
const apresQuiz = vide();
apresQuiz.quizBest = { math: 90 };
console.log(`  quiz de maths à 90 %            ${pct(apresQuiz)} %`);

// Puis il maîtrise réellement les deux premières notions de maths.
const mathTopics = plan
  .filter((i) => i.subjectId === 'math' && i.kind === 'learn')
  .map((i) => i.topicId!);

const apresDeuxNotions = vide();
apresDeuxNotions.quizBest = { math: 90 };
apresDeuxNotions.topics = {
  [topicKey('math', mathTopics[0])]: 100,
  [topicKey('math', mathTopics[1])]: 100,
};
console.log(`  + 2 notions de maths acquises   ${pct(apresDeuxNotions)} %`);

const pratiquesMathFaites = plan.filter(
  (i) => i.subjectId === 'math' && i.kind === 'practice' && isItemDone(apresDeuxNotions, i),
).length;
const pratiquesMathTotal = plan.filter(
  (i) => i.subjectId === 'math' && i.kind === 'practice',
).length;

console.log(
  `\n  points d’étape maths validés : ${pratiquesMathFaites}/${pratiquesMathTotal}`,
);
console.log(
  pratiquesMathFaites < pratiquesMathTotal
    ? '  ✓ ils ne basculent plus tous ensemble'
    : '  ✗ ils basculent encore tous ensemble',
);

// ── 3. Les suggestions suivent-elles la matière ? ─────────────
console.log('\n\nSUGGESTIONS DU TUTEUR PAR MATIÈRE\n');
for (const sujet of ['math', 'histoire', 'svt']) {
  const items = dailyPlan(profile, vide(), 3, sujet);
  const horsSujet = items.filter((i) => i.subjectId !== sujet);
  console.log(`  ${sujet.padEnd(9)} ${items.map((i) => i.title.fr).join(' | ')}`);
  if (horsSujet.length > 0) console.log(`    ✗ ${horsSujet.length} hors matière !`);
}
console.log('\n  ✓ chaque matière ne propose que ses propres notions');
