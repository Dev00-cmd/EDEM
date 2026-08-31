// Verifie la recherche d ecole : ce qu elle rend, et en combien de
// temps.
//
//   node scripts/test_recherche_ecoles.mjs
//
// LE BUG QUI A MOTIVE CE SCRIPT. Toutes les manieres de trouver une
// ecole etaient reunies dans un seul OR, dont une branche portant un
// CASE. Le planificateur ne sait pas decomposer ca : il renoncait aux
// index et balayait les 25 347 lignes. 554 ms pour « petion ».
//
// L advisor signalait meme les deux index de `schools` comme
// « jamais utilises » — ils ne l etaient pas parce qu on les rendait
// inutilisables, pas parce qu ils etaient inutiles.
//
// Une branche par maniere de trouver, reunies par UNION : 11 ms.
//
// Ce test verifie les DEUX choses, parce que l une sans l autre ne
// vaut rien : une recherche rapide qui rend n importe quoi n est pas
// une amelioration.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

let bad = 0;
const ok = (c, l, d = '') => {
  console.log(`  ${c ? 'ok   ' : 'ECHEC'} ${l}${d ? ` — ${d}` : ''}`);
  if (!c) bad++;
};

const sql = (q) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  }).then((r) => r.json());

const chercher = async (q, commune = null) => {
  const args = [
    q === null ? 'null' : `'${q.replace(/'/g, "''")}'`,
    commune === null ? 'null' : `'${commune}'`,
  ].join(', ');
  return sql(`select name, commune from public.search_schools(${args}, 0, 20)`);
};

console.log('CE QUE LA RECHERCHE DOIT TROUVER');

// Le sigle exact passe devant : on dit « ICA », pas le nom complet.
const ica = await chercher('ICA');
ok(ica[0]?.name === 'ICA', 'un sigle exact arrive en premier', ica[0]?.name);

// Sous les cinq caracteres, seulement en DEBUT DE MOT : sinon
// « ica » ramene Afr(ica) et Republ(ica).
ok(!ica.some((e) => /afr|republ/i.test(e.name)),
   'et ne ramene pas Africa ni Republica', `${ica.length} resultats`);

// Le prefixe passe devant le reste.
const petion = await chercher('petion');
ok(/^petion/i.test(petion[0]?.name ?? ''),
   'le nom qui COMMENCE par la recherche passe devant', petion[0]?.name);

// Le cas signale par l usage : une ecole designee par son sigle,
// dans sa commune.
const env = await chercher('env', 'la-vallee-de-jacmel');
ok(env.some((e) => e.name === 'École Nouvelle de la Vallée'),
   'ENV trouve l Ecole Nouvelle de la Vallee', `${env.length} resultats`);

// Sans texte, on rend la liste de la commune : la plupart du temps
// on ne cherche pas, on reconnait son ecole.
const liste = await chercher(null, 'jacmel');
ok(liste.length === 20, 'sans texte, la commune se deroule', `${liste.length}`);

// Les accents ne comptent pas : c est le serveur qui normalise.
const accents = await chercher('lycee alexandre petion');
ok(accents.some((e) => /Lycée Alexandre Petion/i.test(e.name)),
   'les accents sont ignores', accents[0]?.name);

console.log('\nET EN COMBIEN DE TEMPS');

// On mesure le temps d EXECUTION cote base, pas l aller-retour
// depuis cette machine. Premiere version de ce test : elle
// chronometrait autour du fetch et sortait 268 a 593 ms — c etait
// ma latence vers Supabase, pas la requete. Un test qui mesure la
// mauvaise chose est pire qu absent : il fait chercher une lenteur
// qui n existe pas.
const duree = async (q, commune = null) => {
  const args = [
    q === null ? 'null' : `'${q.replace(/'/g, "''")}'`,
    commune === null ? 'null' : `'${commune}'`,
  ].join(', ');
  const plan = await sql(
    `explain (analyze, format text) select * from public.search_schools(${args}, 0, 20)`);
  const ligne = (plan ?? [])
    .map((r) => r['QUERY PLAN'])
    .find((l) => typeof l === 'string' && l.startsWith('Execution Time'));
  return Number(ligne?.match(/([0-9.]+) ms/)?.[1] ?? 9999);
};

// Avant la reecriture : 554 ms pour « petion », par balayage des
// 25 347 lignes. Le plafond de 60 ms ne surveille pas quelques
// millisecondes — il surveille un RETOUR au balayage complet.
for (const [q, commune] of [
  ['petion', null],
  ['ica', null],
  ['nouvelle de la vallee', null],
  [null, 'jacmel'],
]) {
  const ms = await duree(q, commune);
  ok(ms < 60, `« ${q ?? '(liste)'} »${commune ? ' + commune' : ''}`, `${ms} ms`);
}


console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} echec(s).`);
process.exit(bad === 0 ? 0 : 1);
