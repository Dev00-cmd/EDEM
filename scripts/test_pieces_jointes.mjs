// Verifie les trois usages du bucket `attachments` dans une classe.
//
//   node scripts/test_pieces_jointes.mjs
//
// Trois chemins, trois portees differentes, et c est le chemin seul
// qui decide :
//
//   {eleve}/classroom/{classe}/chat/{fichier}      tous les membres
//   {prof}/classroom/{classe}/consigne/{fichier}   tous les membres
//   {eleve}/classroom/{classe}/{devoir}/{fichier}  le professeur seul
//
// Un enonce que les eleves ne peuvent pas ouvrir n est pas un
// enonce ; une copie que les camarades peuvent lire n est plus une
// copie. Le test verifie les deux sens, pas seulement le refus.

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
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@edem-test.local`;
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'MotDePasseTest2026!', data: { name: prefixe } }),
  }).then((x) => x.json());
  if (!r.access_token) throw new Error(`signup ${prefixe}`);
  const H = { apikey: ANON, Authorization: `Bearer ${r.access_token}`, 'Content-Type': 'application/json' };
  return {
    uid: r.user.id,
    H,
    rpc: (n, a) =>
      fetch(`${URL}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(a ?? {}) })
        .then(async (x) => ({ s: x.status, b: await x.json().catch(() => null) })),
  };
}

/** Televerse quelques octets a un chemin donne. */
const televerser = (c, chemin, type = 'application/pdf') =>
  fetch(`${URL}/storage/v1/object/attachments/${chemin}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: c.H.Authorization, 'Content-Type': type },
    body: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10]),
  });

/** Demande une URL signee : c est la RLS Storage qui repond. */
const peutLire = async (c, chemin) =>
  (await fetch(`${URL}/storage/v1/object/sign/attachments/${chemin}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: c.H.Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  })).ok;

const ecole = (await sql('select id from public.schools limit 1'))[0]?.id;
const niveau = (await sql('select id from public.school_levels limit 1'))[0]?.id;

const prof = await compte('prof');
const eleve = await compte('eleve');
const intrus = await compte('intrus');
const comptes = [prof.uid, eleve.uid, intrus.uid];

try {
  console.log('MISE EN PLACE');
  await prof.rpc('declare_teacher_role', {
    p_full_name: 'Test Prof', p_contact: 'test@lycee.ht',
    p_subjects: ['math'], p_school_id: ecole,
  });
  const cl = await prof.rpc('create_classroom', {
    p_school_id: ecole, p_name: 'Salle', p_subject_id: 'math', p_grade_level: niveau,
  });
  const id = cl.b.id;
  await eleve.rpc('join_classroom', { p_code: cl.b.join_code });
  await prof.rpc('approve_member', { p_classroom_id: id, p_user_id: eleve.uid });
  ok(!!id, 'classe ouverte, un eleve valide');

  console.log("\nL ENONCE DU PROFESSEUR");
  const consigne = `${prof.uid}/classroom/${id}/consigne/exercices.pdf`;
  const up = await televerser(prof, consigne);
  ok(up.ok, 'le professeur televerse son enonce', `HTTP ${up.status}`);

  const dev = await prof.rpc('save_assignment', {
    p_classroom_id: id, p_kind: 'devoir', p_title: 'Fractions',
    p_instructions: 'Faire les exercices 1 a 5', p_attachment_path: consigne,
  });
  ok(dev.s === 200, 'le devoir enregistre la piece jointe');
  await prof.rpc('publish_assignment', { p_assignment_id: dev.b.id, p_published: true });

  // Sans cette verification, la RPC accepterait n importe quelle
  // chaine : on pourrait faire pointer un devoir vers le fichier
  // d un autre et le rendre lisible par toute la classe.
  const vol = await prof.rpc('save_assignment', {
    p_classroom_id: id, p_kind: 'devoir', p_title: 'Vol',
    p_attachment_path: `${eleve.uid}/classroom/${id}/consigne/x.pdf`,
  });
  ok(vol.s >= 400, 'un chemin qui n est pas le sien est refuse', `HTTP ${vol.s}`);

  const vu = await eleve.rpc('my_assignments');
  ok((vu.b ?? [])[0]?.attachment_path === consigne,
     'l eleve recoit le chemin de l enonce');
  ok(await peutLire(eleve, consigne), 'et il peut l ouvrir');
  ok(!(await peutLire(intrus, consigne)), 'un intrus ne peut pas');

  console.log('\nLA COPIE DE L ELEVE RESTE PRIVEE');
  const remise = `${eleve.uid}/classroom/${id}/${dev.b.id}/copie.pdf`;
  ok((await televerser(eleve, remise)).ok, 'l eleve rend sa copie');
  ok(await peutLire(prof, remise), 'son professeur la lit');
  ok(!(await peutLire(intrus, remise)), 'personne d autre', 'les camarades non plus');

  console.log('\nLE FIL DE LA CLASSE');
  const chat = `${eleve.uid}/classroom/${id}/chat/photo.pdf`;
  ok((await televerser(eleve, chat)).ok, 'un eleve joint un fichier au fil');
  ok(await peutLire(prof, chat), 'le professeur le voit');
  ok(!(await peutLire(intrus, chat)), 'un non-membre non');

  console.log('\nVIDER LE FIL : LE PROFESSEUR SEUL');
  await eleve.rpc('accept_charter');
  await eleve.rpc('post_classroom_message', { p_classroom_id: id, p_text: 'Bonjour' });
  await prof.rpc('post_classroom_message', { p_classroom_id: id, p_text: 'Bonjour a tous' });

  // Si un eleve pouvait vider le fil, le premier usage en serait
  // d effacer ses propres insultes avant qu on les signale.
  const parEleve = await eleve.rpc('clear_classroom_chat', { p_classroom_id: id });
  ok(parEleve.b?.ok === false, 'un eleve ne peut pas vider le fil', parEleve.b?.error);
  const avant = await eleve.rpc('classroom_messages', { p_classroom_id: id });
  ok((avant.b ?? []).length === 2, 'et le fil est intact', `${avant.b?.length} message(s)`);

  const vide = await prof.rpc('clear_classroom_chat', { p_classroom_id: id });
  ok(vide.b?.ok === true && vide.b?.supprimes === 2, 'le professeur le vide', JSON.stringify(vide.b));
  const apres = await eleve.rpc('classroom_messages', { p_classroom_id: id });
  ok((apres.b ?? []).length === 0, 'plus rien pour personne', `${apres.b?.length}`);

  const jFil = await sql(
    `select count(*)::int n from public.moderation_events
      where classroom_id = '${id}' and event = 'fil_vide'`);
  ok(jFil[0]?.n === 1, 'et c est journalise');

  console.log('\nSUPPRIMER LA SALLE');
  const parEleve2 = await eleve.rpc('archive_classroom', { p_classroom_id: id });
  ok(parEleve2.b?.ok === false, 'un eleve ne peut pas supprimer la salle', parEleve2.b?.error);

  const sup = await prof.rpc('archive_classroom', { p_classroom_id: id });
  ok(sup.b?.ok === true, 'le professeur la supprime', JSON.stringify(sup.b));
  const listeE = await eleve.rpc('my_classrooms');
  ok((listeE.b ?? []).every((c) => c.id !== id), 'elle disparait de l ecran de l eleve');
  const listeP = await prof.rpc('my_classrooms');
  ok((listeP.b ?? []).every((c) => c.id !== id), 'et de celui du professeur');

  // Ce qui reste est en base, hors de portee de l API : les preuves
  // d une salle ou quelque chose s est mal passe ne doivent pas
  // partir sur commande du seul adulte de la piece.
  const reste = await sql(
    `select count(*)::int n from public.classroom_messages where classroom_id = '${id}'`);
  ok(reste[0]?.n === 2, 'les messages restent consultables en base', `${reste[0]?.n}`);
  const deuxieme = await prof.rpc('archive_classroom', { p_classroom_id: id });
  ok(deuxieme.b?.error === 'deja_supprimee', 'la supprimer deux fois ne fait rien');

  console.log('\nUN CHEMIN BRICOLE NE DONNE AUCUN DROIT');
  ok(!(await peutLire(intrus, `${prof.uid}/classroom/pas-un-uuid/consigne/x.pdf`)),
     'classe qui n est pas un uuid');
  ok(!(await peutLire(intrus, `${prof.uid}/autre/${id}/consigne/x.pdf`)),
     'deuxieme segment detourne');
} finally {
  await sql(`delete from auth.users where id in (${comptes.map((c) => `'${c}'`).join(',')})`);
  console.log('\nComptes de test supprimes.');
}

console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} echec(s).`);
process.exit(bad === 0 ? 0 : 1);
