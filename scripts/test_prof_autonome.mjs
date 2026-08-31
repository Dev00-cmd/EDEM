// Verifie qu un professeur ouvre sa classe SANS personne.
//
//   node scripts/test_prof_autonome.mjs
//
// Il n y a ni file d attente, ni verification, ni relecture : il se
// declare, et il cree sa salle. Ce script verifie les deux chemins,
// pas seulement l attaque — que la declaration accorde le role et
// que la classe s ouvre dans la foulee compte autant que le fait
// qu un eleve ne se donne pas le role tout seul. Une regression qui
// bloque tout le monde passerait un test de securite les yeux
// fermes.

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

async function compte(prefixe) {
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@edem-test.local`;
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'MotDePasseTest2026!', data: { name: prefixe } }),
  }).then((x) => x.json());
  if (!r.access_token) throw new Error(`signup ${prefixe}: ${JSON.stringify(r).slice(0, 200)}`);
  const H = { apikey: ANON, Authorization: `Bearer ${r.access_token}`, 'Content-Type': 'application/json' };
  return {
    uid: r.user.id,
    rpc: (n, a) =>
      fetch(`${URL}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(a ?? {}) })
        .then(async (x) => ({ s: x.status, b: await x.json().catch(() => null) })),
    get: (p) =>
      fetch(`${URL}/rest/v1/${p}`, { headers: H })
        .then(async (x) => ({ s: x.status, b: await x.json().catch(() => null) })),
    patch: (p, body) =>
      fetch(`${URL}/rest/v1/${p}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
        .then(async (x) => ({ s: x.status, b: await x.json().catch(() => null) })),
  };
}

const ecole = (await sql(`select id from public.schools limit 1`))[0]?.id;
const niveau = (await sql(`select id from public.school_levels limit 1`))[0]?.id;

const prof = await compte('prof');
const vieux = await compte('vieux');
const tiers = await compte('tiers');
const comptes = [prof.uid, vieux.uid, tiers.uid];

try {
  console.log('AVANT LA DECLARATION');
  let st = await prof.rpc('my_teacher_status');
  ok(st.b?.role === 'eleve', 'on demarre eleve', st.b?.role);
  ok(st.b?.declared === false, 'aucune declaration');
  let c = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 A', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(c.s >= 400, 'un eleve ne peut pas ouvrir de classe', `HTTP ${c.s}`);

  console.log('\nLA DECLARATION ACCORDE LE ROLE, SANS PERSONNE');
  const d = await prof.rpc('declare_teacher_role', {
    p_full_name: 'Jean Baptiste', p_contact: '+509 3712 4590',
    p_subjects: ['math'], p_school_id: ecole,
  });
  ok(d.b?.ok === true, 'la declaration passe', JSON.stringify(d.b));
  ok(d.b?.role === 'prof', 'le role est accorde dans la foulee', d.b?.role);

  const role = (await sql(`select role from public.profiles where id='${prof.uid}'`))[0]?.role;
  ok(role === 'prof', 'la base confirme le role', role);
  const ev = await sql(`select count(*)::int n from public.role_events where user_id='${prof.uid}'`);
  ok(ev[0]?.n === 1, 'le changement de role est journalise', `${ev[0]?.n}`);

  console.log('\nLA CLASSE S OUVRE TOUT DE SUITE');
  c = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 A', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(c.s === 200 && !!c.b?.join_code, 'classe ouverte, code rendu', c.b?.join_code);

  console.log('\nUN CODE UNIQUE PAR SALLE, ET L APP LE RECOIT');
  const codes = [c.b.join_code];
  for (const n of ['B', 'C', 'D', 'E']) {
    const r = await prof.rpc('create_classroom', {
      p_school_id: ecole, p_name: `NS3 ${n}`, p_subject_id: 'math', p_grade_level: niveau,
    });
    codes.push(r.b?.join_code);
  }
  ok(codes.every((x) => /^[2-9A-HJ-KM-NP-Z]{6}$/.test(x ?? '')),
     'six caracteres sans 0/O/1/I/L', codes.join(' '));
  ok(new Set(codes).size === codes.length, 'les cinq codes sont differents');

  // L app lit les codes par my_classrooms : c est la seule voie,
  // la table est fermee en lecture directe.
  const liste = await prof.rpc('my_classrooms');
  const rendus = (liste.b ?? []).map((x) => x.join_code).filter(Boolean);
  ok(rendus.length === 5, 'my_classrooms rend un code par salle', `${rendus.length}`);
  ok(codes.every((x) => rendus.includes(x)), 'ce sont exactement les memes');

  console.log('\nPLUS RIEN A RELIRE, PLUS RIEN A APPROUVER');
  const file = await sql('select public.teachers_to_review()');
  ok(/does not exist/i.test(JSON.stringify(file)), 'teachers_to_review a disparu');
  const appr = await sql(`select public.approve_teacher_role('${prof.uid}')`);
  ok(/does not exist/i.test(JSON.stringify(appr)), 'approve_teacher_role a disparu');
  st = await prof.rpc('my_teacher_status');
  ok(st.b?.verified === undefined, 'la notion de verification a disparu');

  console.log('\nDIX CLASSES, LE MEME PLAFOND POUR TOUT LE MONDE');
  ok(st.b?.limite === 10, 'plafond a 10', `${st.b?.limite}`);
  ok(st.b?.ouvertes === 5, 'cinq classes ouvertes', `${st.b?.ouvertes}`);
  for (const n of ['F', 'G', 'H', 'I', 'J']) {
    await prof.rpc('create_classroom', {
      p_school_id: ecole, p_name: `NS3 ${n}`, p_subject_id: 'math', p_grade_level: niveau,
    });
  }
  const onzieme = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 K', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(onzieme.s >= 400, 'la 11e classe est refusee', `HTTP ${onzieme.s}`);
  ok(/trop de classes/i.test(JSON.stringify(onzieme.b)), 'et pour la bonne raison');

  console.log('\nL ANCIEN NOM MARCHE ENCORE (bundles deja installes)');
  const alias = await vieux.rpc('request_teacher_role', {
    p_full_name: 'Marie Pierre', p_contact: 'marie@lycee.ht',
    p_subjects: ['francais'], p_school_id: ecole,
  });
  ok(alias.b?.ok === true && alias.b?.role === 'prof',
     'request_teacher_role redirige vers la declaration', JSON.stringify(alias.b));

  console.log('\nS INSCRIRE DIRECTEMENT COMME PROFESSEUR');
  // Le parcours de l inscription : un compte tout neuf choisit
  // « professeur », remplit trois champs, et se retrouve du bon
  // cote sans passer par le formulaire de l eleve.
  const neuf = await compte('neuf');
  comptes.push(neuf.uid);
  let st2 = await neuf.rpc('my_teacher_status');
  ok(st2.b?.role === 'eleve', 'un compte neuf demarre eleve');

  const insc = await neuf.rpc('declare_teacher_role', {
    p_full_name: 'Marie Joseph', p_contact: 'marie@lycee.ht',
    p_subjects: ['math', 'physique'],
  });
  ok(insc.b?.ok === true && insc.b?.role === 'prof',
     'la declaration a l inscription accorde le role', JSON.stringify(insc.b));

  // Sans ecole au profil : c est le cas d un prof qui vient de
  // s inscrire. Il doit pouvoir exister, et se voir refuser la
  // creation de salle pour la BONNE raison.
  const sansEcole = await neuf.rpc('create_classroom', {
    p_school_id: null, p_name: 'NS3 A', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(sansEcole.s >= 400, 'sans ecole, la salle est refusee', `HTTP ${sansEcole.s}`);
  st2 = await neuf.rpc('my_teacher_status');
  ok(st2.b?.role === 'prof' && st2.b?.declared === true,
     'mais il reste professeur, avec sa declaration');

  console.log('\nL INTERFACE PROFESSEUR');
  const vue = await prof.rpc('teacher_overview');
  ok(Array.isArray(vue.b) && vue.b.length === 10,
     'teacher_overview rend les dix salles en UNE requete',
     `${vue.b?.length}`);
  const une = (vue.b ?? [])[0];
  ok(!!une?.join_code && une?.membres === 0 && une?.en_attente === 0,
     'avec le code, les membres et les demandes en attente');
  ok(une?.maitrise === null,
     'et la maitrise est null tant que rien n est mesure — pas 0 %',
     JSON.stringify(une?.maitrise));

  const dev = await prof.rpc('teacher_assignments');
  ok(Array.isArray(dev.b), 'teacher_assignments repond', `${dev.b?.length} devoir(s)`);

  // Les deux fonctions filtrent sur teacher_id : elles ne sont pas
  // simplement cachees a l ecran, elles ne rendent rien.
  const vueEleve = await vieux.rpc('teacher_overview');
  ok(Array.isArray(vueEleve.b) && vueEleve.b.length === 0,
     'un compte sans classe n en voit aucune', `${vueEleve.b?.length}`);

  console.log('\nCE QUI N A PAS BOUGE');
  const p = await tiers.patch(`profiles?id=eq.${tiers.uid}`, { role: 'prof' });
  const apres = (await sql(`select role from public.profiles where id='${tiers.uid}'`))[0]?.role;
  ok(apres === 'eleve', 'un eleve ne se donne pas le role par PATCH', `HTTP ${p.s} → ${apres}`);

  const decl = await tiers.get('teacher_requests?select=contact');
  ok(Array.isArray(decl.b) && decl.b.length === 0,
     'un eleve ne lit pas le contact d un professeur', `${decl.b?.length}`);

  console.log('\nLE FREIN D URGENCE, LUI, RESTE');
  await sql(`select public.revoke_teacher_role('${prof.uid}', 'test')`);
  const reprise = await prof.rpc('declare_teacher_role', {
    p_full_name: 'Jean Baptiste', p_contact: '+509 3712 4590',
    p_subjects: ['math'], p_school_id: ecole,
  });
  ok(reprise.b?.ok === false && reprise.b?.error === 'role_retire',
     'se redeclarer est refuse', JSON.stringify(reprise.b));
  const roleApres = (await sql(`select role from public.profiles where id='${prof.uid}'`))[0]?.role;
  ok(roleApres === 'eleve', 'et le role reste retire', roleApres);
  const classes = await sql(
    `select count(*)::int n from public.classrooms where teacher_id='${prof.uid}' and archived_at is null`);
  ok(classes[0]?.n === 0, 'ses classes sont archivees du meme geste', `${classes[0]?.n}`);
} finally {
  await sql(`delete from auth.users where id in (${comptes.map((c) => `'${c}'`).join(',')})`);
  console.log('\nComptes de test supprimes.');
}

console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} echec(s).`);
process.exit(bad === 0 ? 0 : 1);
