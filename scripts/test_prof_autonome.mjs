// Verifie qu un professeur ouvre sa classe SANS validation humaine,
// et que ce qui remplace la validation tient.
//
//   node scripts/test_prof_autonome.mjs
//
// On teste les deux chemins, pas seulement l attaque : qu un vrai
// professeur passe compte autant que le fait qu un role retire ne
// repasse pas. Une regression qui bloque tout le monde passerait un
// test de securite les yeux fermes.

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
const eleve = await compte('eleve');
const comptes = [prof.uid, eleve.uid];

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
  ok(d.b?.verified === false, 'mais pas verifie');

  const role = (await sql(`select role from public.profiles where id='${prof.uid}'`))[0]?.role;
  ok(role === 'prof', 'la base confirme le role', role);
  const ev = await sql(`select count(*)::int n from public.role_events where user_id='${prof.uid}'`);
  ok(ev[0]?.n === 1, 'le changement de role est journalise', `${ev[0]?.n}`);

  console.log('\nLA CLASSE S OUVRE TOUT DE SUITE');
  c = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 A', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(c.s === 200 && !!c.b?.join_code, 'classe ouverte, code rendu', c.b?.join_code);

  console.log('\nLE PLAFOND REMPLACE LA VALIDATION');
  st = await prof.rpc('my_teacher_status');
  ok(st.b?.limite === 3, 'plafond a 3 tant que non verifie', `${st.b?.limite}`);
  ok(st.b?.ouvertes === 1, 'une classe ouverte', `${st.b?.ouvertes}`);
  for (const n of ['NS3 B', 'NS3 C']) {
    await prof.rpc('create_classroom', {
      p_school_id: ecole, p_name: n, p_subject_id: 'math', p_grade_level: niveau,
    });
  }
  const quatrieme = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 D', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(quatrieme.s >= 400, 'la 4e classe est refusee', `HTTP ${quatrieme.s}`);
  ok(/trop de classes/i.test(JSON.stringify(quatrieme.b)), 'et pour la bonne raison');

  console.log('\nLA VERIFICATION LEVE LE PLAFOND, ELLE NE DEBLOQUE RIEN');
  await sql(`select public.approve_teacher_role('${prof.uid}', 'test')`);
  st = await prof.rpc('my_teacher_status');
  ok(st.b?.verified === true, 'verifie');
  ok(st.b?.limite === 10, 'plafond leve a 10', `${st.b?.limite}`);
  const cinq = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'NS3 D', p_subject_id: 'math', p_grade_level: niveau,
  });
  ok(cinq.s === 200, 'la 4e passe maintenant', `HTTP ${cinq.s}`);

  console.log('\nCE QUI N A PAS BOUGE');
  const p = await eleve.patch(`profiles?id=eq.${eleve.uid}`, { role: 'prof' });
  const apres = (await sql(`select role from public.profiles where id='${eleve.uid}'`))[0]?.role;
  ok(apres === 'eleve', 'un eleve ne se donne pas le role par PATCH', `HTTP ${p.s} → ${apres}`);

  const q = await eleve.rpc('teachers_to_review');
  ok(q.s >= 400, 'la file de relecture est fermee aux comptes connectes', `HTTP ${q.s}`);

  const decl = await eleve.get(`teacher_requests?select=contact`);
  ok(Array.isArray(decl.b) && decl.b.length === 0,
     'un eleve ne lit pas le contact d un professeur', `${decl.b?.length}`);

  console.log('\nUN ROLE RETIRE NE SE REPREND PAS');
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

  console.log('\nLA FILE DE RELECTURE, QUI NE BLOQUE PLUS RIEN');
  const file = await sql(`select count(*)::int n from public.teachers_to_review()`);
  ok(typeof file[0]?.n === 'number', 'lisible en service_role', `${file[0]?.n} a relire`);
} finally {
  await sql(`delete from auth.users where id in (${comptes.map((c) => `'${c}'`).join(',')})`);
  console.log('\nComptes de test supprimes.');
}

console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} echec(s).`);
process.exit(bad === 0 ? 0 : 1);
