// Verifie le calcul de completion du profil, et le cas signale.
//
//   node scripts/test_completion.mjs
//
// LE BUG D ORIGINE. Des comptes existants plafonnaient a 89 % et
// leurs proprietaires croyaient que l ecole ne s enregistrait pas.
// L ecole etait enregistree : ce qui manquait etait la SERIE, que
// seul l ecran d inscription demandait. Un eleve inscrit avant que
// le champ existe — ou qui passait au NS3/NS4 depuis son profil —
// ne pouvait plus jamais la renseigner.
//
// 89 % n est pas un chiffre au hasard : c est 8 champs sur 9.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const URL = `https://${REF}.supabase.co`;
const ANON = 'sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';
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

const email = `compl-${Date.now()}@edem-test.local`;
const up = await fetch(`${URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'MotDePasseTest2026!', data: { name: 'Compl' } }),
}).then((r) => r.json());

const uid = up.user.id;
const H = { apikey: ANON, Authorization: `Bearer ${up.access_token}`, 'Content-Type': 'application/json' };
const rpc = (n, a) =>
  fetch(`${URL}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(a ?? {}) })
    .then(async (r) => ({ s: r.status, b: await r.json().catch(() => null) }));
const patch = (b) =>
  fetch(`${URL}/rest/v1/profiles?id=eq.${uid}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(b),
  }).then(async (r) => ({ s: r.status, b: await r.json().catch(() => null) }));

const ecole = (await sql('select id from public.schools limit 1'))[0]?.id;

try {
  console.log('LE CAS SIGNALE : NS IV, TOUT SAUF LA SERIE');
  await patch({
    level: 'NS IV', goal: 'learn', favorites: ['math', 'francais'],
    weak_subjects: ['math'], study_minutes: 30,
    school_id: ecole, commune_id: 'jacmel', onboarded: true,
  });
  let c = await rpc('profile_completion');
  ok(c.b?.pct === 89, 'on reproduit les 89 %',
     `${c.b?.pct}% — manque ${JSON.stringify(c.b?.missing)}`);
  ok(c.b?.missing?.includes('section'), 'et ce qui manque est la SERIE');
  ok(c.b?.filled?.includes('school_id'), "l ecole, elle, etait bien enregistree");

  console.log('\nCE QUE LES DEUX ECRANS PERMETTENT ENFIN');
  const p = await patch({ section: 'SMP' });
  ok(p.s < 400, 'la serie s enregistre depuis le client', `HTTP ${p.s}`);
  c = await rpc('profile_completion');
  ok(c.b?.pct === 100, 'et le profil atteint 100 %', `${c.b?.pct}%`);

  console.log('\nUN CHAMP QUI NE S APPLIQUE PAS NE COMPTE PAS');
  // Sinon un eleve de 5e AF plafonnerait a 89 % pour n avoir pas
  // choisi une serie qui n existe pas a son niveau.
  await patch({ level: 'NS II', section: null });
  c = await rpc('profile_completion');
  ok(c.b?.pct === 100, 'un niveau sans serie reste a 100 %', `${c.b?.pct}%`);

  // Meme logique pour l annee d examen, qui ne vaut que pour
  // l objectif « examens ».
  await patch({ goal: 'exams' });
  c = await rpc('profile_completion');
  ok(c.b?.missing?.includes('exam_year'),
     "l annee d examen devient exigee avec l objectif « examens »");
  await patch({ exam_year: 2027 });
  c = await rpc('profile_completion');
  ok(c.b?.pct === 100, 'et une fois donnee, on retombe a 100 %', `${c.b?.pct}%`);

  // ══ L INVARIANT QUI EMPECHE LE BUG DE REVENIR ══════════════
  //
  // Le defaut n etait pas « la serie manque », c etait « un champ
  // compte dans le total sans qu aucun ecran ne permette de le
  // remplir ». Ca peut se reproduire au prochain champ ajoute.
  //
  // On verifie donc la propriete generale : pour CHAQUE niveau et
  // CHAQUE objectif, un profil rempli avec les seules colonnes que
  // le client a le droit d ecrire atteint 100 pour cent. Si un jour
  // quelqu un ajoute un champ au compteur sans l ajouter a un ecran,
  // ce test tombe le jour meme.
  console.log('\nCHAQUE NIVEAU ET CHAQUE OBJECTIF ATTEIGNENT 100 %');
  const niveaux = (await sql(
    'select id, needs_section from public.school_levels order by rank')) ?? [];
  const objectifs = ['exams', 'grades', 'learn', 'english', 'catchup'];
  let combos = 0;
  const rates = [];

  for (const n of niveaux) {
    for (const g of objectifs) {
      // Tout ce que le client peut ecrire, et rien d autre.
      const r = await patch({
        name: 'Test',
        level: n.id,
        section: n.needs_section ? 'SMP' : null,
        favorites: ['math'],
        weak_subjects: ['math'],
        goal: g,
        exam_year: g === 'exams' ? 2027 : null,
        study_minutes: 30,
        school_id: ecole,
        commune_id: 'jacmel',
      });
      const v = await rpc('profile_completion');
      combos++;
      if (r.s >= 400 || v.b?.pct !== 100) {
        rates.push(`${n.id}/${g} → ${v.b?.pct}% (manque ${JSON.stringify(v.b?.missing)})`);
      }
    }
  }
  ok(rates.length === 0,
     `les ${combos} combinaisons niveau x objectif atteignent 100 %`,
     rates.length ? rates.join(' | ') : `${combos} testees`);
} finally {
  await sql(`delete from auth.users where id='${uid}'`);
  console.log('\nCompte de test supprime.');
}

console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} echec(s).`);
process.exit(bad === 0 ? 0 : 1);
