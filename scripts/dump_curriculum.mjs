// Porte le programme (src/data/curriculum.ts) vers la base, dans
// public.topics.
//
//   node scripts/dump_curriculum.mjs
//
// ── Pourquoi ce sens-là ───────────────────────────────────────
//
// Le programme est écrit et relu dans l'application, en français et
// en créole : c'est là qu'il doit vivre. Mais le serveur en a
// besoin aussi, pour deux choses que le client ne peut pas faire :
//
//   · contraindre l'IA à étiqueter chaque question d'un quiz avec
//     une notion DU PROGRAMME, au lieu d'en inventer une ;
//   · agréger la maîtrise d'une classe par notion, dans le tableau
//     de bord du professeur.
//
// Sans ça, topic_mastery se remplit de texte libre : 73 notions
// distinctes pour 78 lignes en anglais, avec « conditionnel »,
// « conditionnel-type-1 », « conditionnel-zero » et
// « conjonctions-de-condition » comptés séparément. Un tableau de
// bord bâti là-dessus afficherait une ligne par élève et par quiz.

import fs from 'fs';
import path from 'path';

const REF = 'qoyebljuvrxhcroxapys';
const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

if (!token || token.startsWith('COLLE')) {
  console.error('Jeton absent de .env.secrets');
  process.exit(1);
}

// Lecture du curriculum sans passer par TypeScript : on isole
// l'objet littéral et on le lit avec le moteur JS.
const src = fs.readFileSync('src/data/curriculum.ts', 'utf8');
const debut = src.indexOf('export const CURRICULUM: Curriculum = {');
const fin = src.indexOf('\n};', debut);
if (debut < 0 || fin < 0) {
  console.error('CURRICULUM introuvable dans src/data/curriculum.ts');
  process.exit(1);
}
const litteral = src.slice(src.indexOf('{', debut), fin + 2);
const CURRICULUM = (0, eval)('(' + litteral + ')');

const lignes = [];
for (const [subject, bandes] of Object.entries(CURRICULUM)) {
  for (const [band, topics] of Object.entries(bandes)) {
    topics.forEach((t, i) => {
      lignes.push({ subject, band, id: t.id, fr: t.fr, ht: t.ht, rang: i + 1 });
    });
  }
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const valeurs = lignes
  .map((l) => `  (${q(l.subject)}, ${q(l.band)}, ${q(l.id)}, ${q(l.fr)}, ${q(l.ht)}, ${l.rang})`)
  .join(',\n');

const sqlTexte = `
delete from public.topics;
insert into public.topics (subject_id, band, topic_id, label_fr, label_ht, rank) values
${valeurs};
`;

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || JSON.stringify(body).slice(0, 300));
  return body;
}

await sql(sqlTexte);

const parMatiere = new Map();
for (const l of lignes) parMatiere.set(l.subject, (parMatiere.get(l.subject) ?? 0) + 1);

console.log(`${lignes.length} notions portées en base.`);
for (const [m, n] of [...parMatiere].sort()) console.log('  ', m.padEnd(12), n);

// Le même contenu sur disque, pour la fonction Edge qui n'a pas
// accès au dépôt à l'exécution.
const sortie = path.join('supabase', 'functions', 'tutor', 'topics.json');
const parCle = {};
for (const l of lignes) {
  const cle = `${l.subject}:${l.band}`;
  (parCle[cle] ??= []).push({ id: l.id, fr: l.fr });
}
fs.writeFileSync(sortie, JSON.stringify(parCle, null, 1), 'utf8');
console.log(`\n${sortie} écrit pour la fonction Edge.`);
