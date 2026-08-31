// Vérifie la modération de bout en bout, avec de vrais comptes et
// de vraies requêtes REST.
//
//   node scripts/test_moderation.mjs
//
// Six comptes jetables : un professeur, l'auteur d'un message,
// trois camarades qui signalent, et un intrus qui n'est dans
// aucune classe. Tous supprimés à la fin.
//
// On teste les deux chemins, pas seulement l'attaque : qu'un
// élève de la classe puisse écrire, signaler et être lu compte
// autant que le fait qu'un intrus soit repoussé. Une régression
// qui bloque tout le monde passe le test de sécurité les yeux
// fermés.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const URL = `https://${REF}.supabase.co`;
const ANON = 'sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';

const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

let bad = 0;
const ok = (c, label, detail = '') => {
  console.log(`  ${c ? 'ok   ' : 'ECHEC'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!c) bad++;
};

const sql = (q) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  }).then((r) => r.json());

/** Un compte jetable, avec ses raccourcis d'appel. */
async function compte(prefix) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@edem-test.local`;
  const up = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'MotDePasseTest2026!',
      data: { name: prefix },
    }),
  }).then((r) => r.json());

  if (!up.access_token) {
    throw new Error(`compte ${prefix} : ${JSON.stringify(up).slice(0, 200)}`);
  }

  const H = {
    apikey: ANON,
    Authorization: `Bearer ${up.access_token}`,
    'Content-Type': 'application/json',
  };
  return {
    uid: up.user.id,
    rpc: (n, a) =>
      fetch(`${URL}/rest/v1/rpc/${n}`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify(a ?? {}),
      }).then(async (r) => ({ s: r.status, b: await r.json().catch(() => null) })),
    get: (p) =>
      fetch(`${URL}/rest/v1/${p}`, { headers: H }).then(async (r) => ({
        s: r.status,
        b: await r.json().catch(() => null),
      })),
    patch: (p, body) =>
      fetch(`${URL}/rest/v1/${p}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify(body),
      }).then(async (r) => ({ s: r.status, b: await r.json().catch(() => null) })),
    post: (p, body) =>
      fetch(`${URL}/rest/v1/${p}`, {
        method: 'POST',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify(body),
      }).then(async (r) => ({ s: r.status, b: await r.json().catch(() => null) })),
  };
}

const comptes = [];
try {
  console.log('MISE EN PLACE');
  const [prof, eleveA, eleveB, eleveC, eleveD, intrus] = await Promise.all([
    compte('prof'), compte('eleveA'), compte('eleveB'),
    compte('eleveC'), compte('eleveD'), compte('intrus'),
  ]);
  comptes.push(prof, eleveA, eleveB, eleveC, eleveD, intrus);

  // Le rôle prof s'accorde, il ne se déclare pas : ici on le pose
  // par le service_role, exactement comme le ferait la validation
  // manuelle depuis le dashboard.
  await sql(`update public.profiles set role = 'prof' where id = '${prof.uid}'`);

  const [ecole] = await sql(
    `select id from public.schools where status = 'approved' limit 1`,
  );
  const [niveau] = await sql(`select id from public.school_levels limit 1`);

  const cr = await prof.rpc('create_classroom', {
    p_school_id: ecole.id,
    p_name: 'Classe de test modération',
    p_subject_id: 'math',
    p_grade_level: niveau.id,
  });
  const classeId = cr.b?.id;
  const code = cr.b?.join_code;
  ok(!!classeId && !!code, 'le professeur ouvre une classe', code);

  for (const [nom, e] of [['A', eleveA], ['B', eleveB], ['C', eleveC], ['D', eleveD]]) {
    const j = await e.rpc('join_classroom', { p_code: code });
    const a = await prof.rpc('approve_member', {
      p_classroom_id: classeId,
      p_user_id: e.uid,
    });
    ok(j.b?.ok === true && a.b?.status === 'active', `élève ${nom} rejoint et est validé`);
  }

  // ══ LE PROFESSEUR DANS SA PROPRE SALLE ══════════════════════
  //
  // Il n'est pas dans `classroom_members` : il EST la classe, il ne
  // la rejoint pas. La policy exigeait pourtant `is_classroom_member`
  // et l'écartait donc de son propre fil. Invisible au chargement,
  // qui passe par une RPC DEFINER — mais le TEMPS RÉEL applique la
  // policy, et il ne recevait rien du tout. Il écrivait, et rien
  // n'apparaissait.
  //
  // On interroge donc la TABLE et pas la RPC : c'est la table que
  // voit l'abonnement temps réel.
  console.log('\nLE PROFESSEUR LIT SON PROPRE FIL');
  const envoiProf = await prof.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'Bonjour, ouvrez le livre page 42',
  });
  ok(envoiProf.b?.ok === true, 'le professeur écrit dans sa salle');
  const filProf = await prof.get(
    `classroom_messages?classroom_id=eq.${classeId}&select=id,text`,
  );
  ok(
    Array.isArray(filProf.b) && filProf.b.length >= 1,
    'et il le relit PAR LA TABLE — donc le temps réel le lui apporte',
    `${filProf.b?.length} ligne(s)`,
  );

  // Le trombinoscope doit le contenir, sinon un message arrivé en
  // temps réel s'affiche « … », sans nom ni badge.
  const roster = await eleveA.rpc('classroom_roster', { p_classroom_id: classeId });
  const leProf = (roster.b ?? []).find((r) => r.is_teacher);
  ok(!!leProf, 'le professeur figure au trombinoscope', leProf?.affiche);
  ok(
    leProf?.vrai_nom === null,
    "et un élève n'y lit toujours pas de vrai nom",
    JSON.stringify(leProf?.vrai_nom),
  );

  // ══ LA CHARTE ═══════════════════════════════════════════════
  console.log('\nLA CHARTE');
  let p = await eleveA.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'Bonjour tout le monde',
  });
  ok(
    p.b?.ok === false && p.b?.error === 'charte_non_acceptee',
    'sans la charte, le SERVEUR refuse le message',
    p.b?.error,
  );

  const patchCharte = await eleveA.patch(
    `profiles?id=eq.${eleveA.uid}`,
    { charter_accepted_at: new Date().toISOString() },
  );
  ok(
    patchCharte.s >= 400 || (Array.isArray(patchCharte.b) && patchCharte.b.length === 0),
    "l'élève ne peut pas dater lui-même son acceptation",
    `HTTP ${patchCharte.s}`,
  );

  for (const e of [eleveA, eleveB, eleveC, eleveD]) {
    await e.rpc('accept_charter');
  }
  const c = await eleveA.get(`profiles?id=eq.${eleveA.uid}&select=charter_accepted_at`);
  ok(!!c.b?.[0]?.charter_accepted_at, 'accept_charter date bien l’acceptation');

  // Le professeur n'est pas soumis à la charte des élèves.
  const pp = await prof.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'Bonjour la classe, on commence le chapitre 3.',
  });
  ok(pp.b?.ok === true, 'le professeur écrit sans avoir accepté la charte');

  // ══ LE FILTRE ═══════════════════════════════════════════════
  console.log('\nLE FILTRE DE TERMES');
  const avant = await sql(
    `select count(*)::int as n from public.classroom_messages where classroom_id = '${classeId}'`,
  );

  p = await eleveA.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'espèce de $@l0pe',
  });
  ok(
    p.b?.ok === false && p.b?.error === 'message_refuse',
    'une insulte maquillée est refusée',
    p.b?.error,
  );

  const apres = await sql(
    `select count(*)::int as n from public.classroom_messages where classroom_id = '${classeId}'`,
  );
  ok(apres[0].n === avant[0].n, "le message refusé n'existe nulle part");

  const trace = await sql(
    `select count(*)::int as n from public.moderation_events
      where event = 'message_bloque' and actor = '${eleveA.uid}'`,
  );
  ok(trace[0].n === 1, 'la tentative est journalisée', `${trace[0].n}`);

  // Le chemin normal : ce qui doit passer passe.
  p = await eleveA.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'Je ne comprends pas les fractions, ils se sont disputés en classe',
  });
  const messageId = p.b?.id;
  ok(p.b?.ok === true && !!messageId, "une phrase normale passe (« disputés » n'est pas « pute »)");

  p = await eleveA.rpc('post_classroom_message', {
    p_classroom_id: classeId,
    p_text: 'ekri m sou whatsapp 3712 4590',
  });
  ok(p.b?.ok === true, 'un numéro de téléphone passe…');
  const file = await sql(
    `select count(*)::int as n from public.moderation_queue q
       join public.classroom_messages m on m.id = q.message_id
      where m.classroom_id = '${classeId}' and q.raison = 'filtre'`,
  );
  ok(file[0].n === 1, '…mais entre dans la file de relecture', `${file[0].n}`);

  // ══ SIGNALER ════════════════════════════════════════════════
  console.log('\nSIGNALER');
  let r = await eleveB.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'insulte',
  });
  ok(r.b?.ok === true && r.b?.signalements === 1, 'B signale', JSON.stringify(r.b));

  r = await eleveB.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'insulte',
  });
  ok(
    r.b?.ok === false && r.b?.error === 'deja_signale',
    'B ne peut pas signaler deux fois (sinon un seul élève masque n’importe qui)',
  );

  r = await eleveA.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'autre',
  });
  ok(r.b?.error === 'ton_propre_contenu', 'on ne signale pas son propre message');

  r = await intrus.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'insulte',
  });
  ok(
    r.b?.ok === false && r.b?.error === 'introuvable',
    "un non-membre ne peut pas signaler un message qu'il ne voit pas",
    r.b?.error,
  );

  // Deux signalements : le message reste visible.
  await eleveC.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'harcelement',
  });
  let vu = await eleveB.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(
    Array.isArray(vu.b) && vu.b.some((m) => m.id === messageId),
    'à deux signalements, le message reste visible',
  );

  // Le troisième, par une TROISIÈME personne : il disparaît.
  r = await eleveD.rpc('report_content', {
    p_target_type: 'message',
    p_target_id: messageId,
    p_reason: 'insulte',
  });
  ok(r.b?.signalements === 3, 'D est le troisième signaleur');

  vu = await eleveB.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(
    Array.isArray(vu.b) && !vu.b.some((m) => m.id === messageId),
    'à trois signalements, les élèves ne le voient plus',
  );

  const vuProf = await prof.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(
    Array.isArray(vuProf.b) && vuProf.b.some((m) => m.id === messageId),
    'le professeur, lui, le voit toujours — il doit pouvoir trancher',
  );

  // ══ CE QUE PERSONNE NE DOIT POUVOIR FAIRE ═══════════════════
  console.log('\nLES ÉCRITURES DIRECTES');
  const insDirect = await eleveB.post('reports', {
    target_type: 'message',
    target_id: messageId,
    reporter_id: eleveB.uid,
    reason: 'autre',
  });
  ok(insDirect.s >= 400, 'INSERT direct dans reports refusé', `HTTP ${insDirect.s}`);

  const majStatut = await eleveB.patch(`reports?target_id=eq.${messageId}`, {
    status: 'dismissed',
  });
  ok(majStatut.s >= 400, 'PATCH direct sur reports.status refusé', `HTTP ${majStatut.s}`);

  const demasque = await eleveA.patch(`classroom_messages?id=eq.${messageId}`, {
    flagged: false,
  });
  ok(
    demasque.s >= 400,
    "l'auteur ne peut pas se démasquer lui-même",
    `HTTP ${demasque.s}`,
  );

  const dec = await eleveB.rpc('moderate_message', {
    p_message_id: messageId,
    p_decision: 'laisser',
  });
  ok(dec.b?.error === 'pas_le_droit', 'un élève ne modère pas', JSON.stringify(dec.b));

  const journal = await eleveB.get('moderation_events?select=id');
  ok(
    journal.s >= 400 || (Array.isArray(journal.b) && journal.b.length === 0),
    'le journal est illisible depuis l’application',
    `HTTP ${journal.s}`,
  );
  const termes = await eleveB.get('moderation_terms?select=terme');
  ok(
    termes.s >= 400 || (Array.isArray(termes.b) && termes.b.length === 0),
    'la liste des mots interdits est illisible (sinon c’est un mode d’emploi)',
    `HTTP ${termes.s}`,
  );

  // ══ CE QUE VOIT L'INTRUS ════════════════════════════════════
  console.log("\nL'INTRUS");
  const iMod = await intrus.rpc('classroom_moderation', { p_classroom_id: classeId });
  ok(Array.isArray(iMod.b) && iMod.b.length === 0, 'aucune ligne de modération');
  const iRep = await intrus.get('reports?select=id');
  ok(Array.isArray(iRep.b) && iRep.b.length === 0, 'aucun signalement');
  const iMsg = await intrus.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(Array.isArray(iMsg.b) && iMsg.b.length === 0, 'aucun message de la classe');

  // Un élève ne voit que SES signalements, jamais ceux des autres.
  const bRep = await eleveB.get('reports?select=id,reporter_id');
  ok(
    Array.isArray(bRep.b) && bRep.b.every((x) => x.reporter_id === eleveB.uid),
    'un élève ne lit que ses propres signalements',
    `${bRep.b?.length} ligne(s)`,
  );

  // ══ LA PILE DU PROFESSEUR ═══════════════════════════════════
  console.log('\nLA DÉCISION DU PROFESSEUR');
  const pile = await prof.rpc('classroom_moderation', { p_classroom_id: classeId });
  const item = pile.b?.find((x) => x.message_id === messageId);
  ok(!!item, 'le message est dans la pile');
  ok(item?.signalements === 3, 'avec ses trois signalements', `${item?.signalements}`);
  ok(!!item?.vrai_nom, "et le vrai nom de l'auteur, réservé au professeur");

  const tent = await prof.rpc('classroom_blocked_attempts', {
    p_classroom_id: classeId,
    p_days: 7,
  });
  ok(
    Array.isArray(tent.b) && tent.b[0]?.tentatives === 1,
    'la tentative refusée par le filtre remonte au professeur',
  );

  const laisser = await prof.rpc('moderate_message', {
    p_message_id: messageId,
    p_decision: 'laisser',
  });
  ok(laisser.b?.ok === true, '« laisser » est une décision comme une autre');

  vu = await eleveB.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(
    Array.isArray(vu.b) && vu.b.some((m) => m.id === messageId),
    'le message redevient visible pour la classe',
  );
  const restants = await prof.rpc('classroom_moderation', { p_classroom_id: classeId });
  ok(
    !restants.b?.some((x) => x.message_id === messageId),
    'et sort de la pile — sinon elle ne voudrait plus rien dire',
  );

  const supp = await prof.rpc('moderate_message', {
    p_message_id: messageId,
    p_decision: 'supprimer',
  });
  ok(supp.b?.ok === true, 'le professeur supprime');
  vu = await eleveB.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(
    Array.isArray(vu.b) && !vu.b.some((m) => m.id === messageId),
    'le message disparaît pour tout le monde',
  );

  const trace2 = await sql(
    `select event, count(*)::int as n from public.moderation_events
      where classroom_id = '${classeId}' group by event order by event`,
  );
  const evts = Object.fromEntries(trace2.map((x) => [x.event, x.n]));
  ok(evts.message_supprime >= 1, 'la suppression est journalisée');
  // Trois, et non six : les tentatives refusées (le doublon de B,
  // le message de A par lui-même, l'intrus) n'écrivent rien. Le
  // journal enregistre ce qui a eu lieu, pas ce qui a été tenté.
  ok(evts.message_signale === 3, 'les trois signalements retenus sont journalisés', `${evts.message_signale}`);
  ok(evts.message_masque >= 1, 'le masquage automatique est journalisé');

  const audit = await sql(`select * from public.moderation_audit(30)`);
  ok(
    Array.isArray(audit) && audit.some((a) => a.actor === prof.uid),
    "l'audit repère le professeur et ses gestes",
  );
  const auditEleve = await eleveB.rpc('moderation_audit', { p_days: 30 });
  ok(auditEleve.s >= 400, "l'audit est fermé à l'application", `HTTP ${auditEleve.s}`);

  // ══ EXCLUSION ═══════════════════════════════════════════════
  console.log("\nL'EXCLUSION");
  const ret = await prof.rpc('remove_member', {
    p_classroom_id: classeId,
    p_user_id: eleveD.uid,
  });
  ok(ret.b?.status === 'removed', 'le professeur retire un élève');
  const dMsg = await eleveD.rpc('classroom_messages', { p_classroom_id: classeId });
  ok(Array.isArray(dMsg.b) && dMsg.b.length === 0, "l'élève retiré ne lit plus le fil");
  const trace3 = await sql(
    `select count(*)::int as n from public.moderation_events
      where event = 'membre_retire' and target_user = '${eleveD.uid}'`,
  );
  ok(trace3[0].n === 1, "l'exclusion est journalisée");
} catch (e) {
  console.error('\nERREUR :', e.message);
  bad++;
} finally {
  for (const c of comptes) {
    await sql(`delete from auth.users where id = '${c.uid}'`);
  }
  console.log(`\n${comptes.length} comptes de test supprimés.`);
}

console.log(bad === 0 ? '\nTout est conforme.' : `\n${bad} échec(s).`);
process.exit(bad === 0 ? 0 : 1);
