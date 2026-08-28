// Test de bout en bout du backend, avec un vrai compte élève.
//
//   node scripts/smoke_test.mjs
//
// Crée un compte jetable, génère un quiz, le corrige, et vérifie
// que les protections tiennent : session corrigée une seule fois,
// quota compté, XP calculés par la base.
//
// Le compte de test est supprimé à la fin.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const URL = `https://${REF}.supabase.co`;
const ANON = 'sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';

const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function sqlAdmin(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  return res.json();
}

// ── Compte jetable ────────────────────────────────────────────
const email = `audit-${Date.now()}@edem-test.local`;
const signup = await fetch(`${URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: 'MotDePasseTest2026!',
    data: { name: 'Audit' },
  }),
}).then((r) => r.json());

if (!signup.access_token) {
  console.error('Impossible de créer le compte de test :', JSON.stringify(signup).slice(0, 300));
  process.exit(1);
}

const jwt = signup.access_token;
const uid = signup.user.id;
console.log(`Compte de test : ${email}\n`);

const authHeaders = {
  apikey: ANON,
  Authorization: `Bearer ${jwt}`,
  'Content-Type': 'application/json',
};

const callFn = (body) =>
  fetch(`${URL}/functions/v1/tutor`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const rpc = (name, args) =>
  fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(args),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

try {
  // ── 1. Génération d'un quiz ─────────────────────────────────
  console.log('GÉNÉRATION DU QUIZ');
  const quiz = await callFn({
    action: 'quiz',
    subjectId: 'math',
    difficulty: 'facile',
    prompt:
      'Génère un quiz de 3 questions à choix multiples.\n- Matière : Mathématiques\n- Classe : 8e AF\n- Langue : français',
  });

  check(quiz.status === 200, 'la fonction répond', `HTTP ${quiz.status}`);
  const questions = quiz.body.questions ?? [];
  check(questions.length > 0, 'des questions sont générées', `${questions.length}`);
  const sessionId = quiz.body.sessionId;
  check(!!sessionId, 'une session est créée côté serveur');

  if (!sessionId) throw new Error('pas de session — la suite est sans objet');

  // ── 2. Les bonnes réponses sont bien en base ────────────────
  console.log('\nSESSION EN BASE');
  const stored = await sqlAdmin(
    `select answers, graded_at from public.quiz_sessions where id = '${sessionId}'`,
  );
  check(Array.isArray(stored) && stored.length === 1, 'la session est enregistrée');
  check(stored[0]?.graded_at === null, 'elle n’est pas encore corrigée');
  check(
    (stored[0]?.answers ?? []).length === questions.length,
    'autant de réponses que de questions',
  );

  // ── 3. Correction par le serveur ────────────────────────────
  console.log('\nCORRECTION');
  // On répond juste à tout : le serveur doit le confirmer LUI-MÊME.
  const picks = questions.map((q) => q.answer);
  const graded = await rpc('grade_quiz', {
    p_session_id: sessionId,
    p_picked: picks,
  });
  check(graded.status === 200, 'grade_quiz accepte la remise', `HTTP ${graded.status}`);
  check(graded.body?.pct === 100, 'score correct', `${graded.body?.pct}%`);
  check((graded.body?.gained ?? 0) > 0, 'des XP sont accordés', `${graded.body?.gained} XP`);

  // ── 4. Rejeu impossible ─────────────────────────────────────
  console.log('\nREJEU DE LA MÊME SESSION');
  const replay = await rpc('grade_quiz', {
    p_session_id: sessionId,
    p_picked: picks,
  });
  check(
    replay.status >= 400,
    'une session déjà corrigée est refusée',
    replay.body?.message ?? `HTTP ${replay.status}`,
  );

  // ── 5. Session d'un autre élève ─────────────────────────────
  console.log('\nSESSION D’UN AUTRE ÉLÈVE');
  const foreign = await sqlAdmin(
    `insert into public.quiz_sessions (user_id, subject_id, difficulty, answers)
     select id, 'math', 'difficile', '[{"topic":"x","answer":0}]'::jsonb
     from auth.users where id <> '${uid}' limit 1
     returning id`,
  );
  if (Array.isArray(foreign) && foreign[0]?.id) {
    const stolen = await rpc('grade_quiz', {
      p_session_id: foreign[0].id,
      p_picked: [0],
    });
    check(stolen.status >= 400, 'la session d’un autre élève est refusée');
    await sqlAdmin(`delete from public.quiz_sessions where id = '${foreign[0].id}'`);
  } else {
    console.log('  (aucun autre compte en base — test ignoré)');
  }

  // ── 6. Quota ────────────────────────────────────────────────
  console.log('\nQUOTA');
  const counters = await sqlAdmin(
    `select kind, count from public.usage_counters where user_id = '${uid}' order by kind`,
  );
  check(
    Array.isArray(counters) && counters.some((c) => c.kind === 'quiz'),
    'l’appel a été compté',
    JSON.stringify(counters),
  );

  // ── 7. L'ancienne porte ─────────────────────────────────────
  console.log('\nANCIENNE VOIE (apply_quiz_results en direct)');
  const direct = await rpc('apply_quiz_results', {
    p_subject_id: 'math',
    p_results: [{ topic: 'triche', ok: true }],
    p_difficulty: 'difficile',
  });
  if (direct.status === 200) {
    console.log(
      '  ATTENDU  encore ouverte — la révocation attend le déploiement de l’app',
    );
  } else {
    check(true, 'fermée', `HTTP ${direct.status}`);
  }
} finally {
  // ── Ménage ────────────────────────────────────────────────
  await sqlAdmin(`delete from auth.users where id = '${uid}'`);
  console.log('\nCompte de test supprimé.');
}

console.log(
  failures === 0 ? '\nTout est conforme.' : `\n${failures} vérification(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
