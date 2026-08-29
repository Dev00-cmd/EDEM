-- ═══════════════════════════════════════════════════════════════
--  HISTORIQUE DES QUIZ
--
--  Un élève ne pouvait pas revenir sur un quiz passé. Il voyait
--  son score une fois, à la fin, puis tout disparaissait — y
--  compris les explications, qui sont pourtant ce qui fait
--  apprendre. Revoir ses erreurs de la semaine dernière avant un
--  contrôle était impossible.
--
--  Les sessions existaient déjà (elles servent à corriger). Il
--  leur manquait le CONTENU des questions et les CHOIX de l'élève.
--
--  ⚠️ SÉCURITÉ. Donner à l'élève le droit de lire ses sessions
--  ouvrirait une faille béante : les bonnes réponses y sont, et il
--  lui suffirait de lire la session AVANT de répondre. La
--  politique de lecture exige donc « graded_at is not null » — la
--  session ne devient lisible qu'une fois le quiz remis.
-- ═══════════════════════════════════════════════════════════════

alter table public.quiz_sessions
  -- Le quiz complet : énoncés, options, explications, bonne
  -- réponse. C'est ce qui permet de rejouer l'écran de correction
  -- des semaines plus tard.
  add column if not exists questions jsonb,
  -- Ce que l'élève a choisi, dans l'ordre. null = temps écoulé.
  add column if not exists picked    jsonb,
  add column if not exists score_pct integer;

create index if not exists quiz_sessions_history_idx
  on public.quiz_sessions (user_id, graded_at desc)
  where graded_at is not null;

-- Lecture de SES sessions, et seulement une fois corrigées.
drop policy if exists "quiz_sessions_select_graded_own" on public.quiz_sessions;
create policy "quiz_sessions_select_graded_own" on public.quiz_sessions
  as permissive
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and graded_at is not null
  );


/**
 * Corrige un quiz à partir de la session enregistrée.
 *
 * Reprend la version précédente, en gardant en plus ce qu'il faut
 * pour reconstituer l'écran de correction plus tard : les choix de
 * l'élève et le score.
 *
 * Les bonnes réponses sont lues dans `questions` quand la colonne
 * est remplie, sinon dans `answers` — les sessions créées avant
 * cette migration n'ont que la seconde, et doivent rester
 * corrigeables.
 */
create or replace function public.grade_quiz(
  p_session_id uuid,
  p_picked     jsonb
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid       uuid := (select auth.uid());
  v_session public.quiz_sessions;
  v_source  jsonb;
  v_results jsonb := '[]'::jsonb;
  v_answer  jsonb;
  v_pick    jsonb;
  v_ok      boolean;
  v_correct integer := 0;
  v_total   integer;
  v_outcome jsonb;
  i         integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_session
    from public.quiz_sessions
   where id = p_session_id
     and user_id = uid;

  if not found then
    raise exception 'session introuvable';
  end if;

  -- Une session déjà corrigée ne rapporte rien de plus : sinon on
  -- la rejoue autant de fois qu'on veut pour empiler les XP.
  if v_session.graded_at is not null then
    raise exception 'session deja corrigee';
  end if;

  if jsonb_typeof(p_picked) <> 'array' then
    raise exception 'p_picked must be an array';
  end if;

  v_source := coalesce(v_session.questions, v_session.answers);
  v_total  := jsonb_array_length(v_source);

  for i in 0 .. v_total - 1 loop
    v_answer := v_source -> i;
    v_pick   := p_picked -> i;

    v_ok := v_pick is not null
        and jsonb_typeof(v_pick) = 'number'
        and (v_pick)::text::integer = (v_answer ->> 'answer')::integer;

    if v_ok then v_correct := v_correct + 1; end if;

    v_results := v_results || jsonb_build_object(
      'topic', coalesce(v_answer ->> 'topic', 'general'),
      'ok',    v_ok
    );
  end loop;

  update public.quiz_sessions
     set graded_at = now(),
         picked    = p_picked,
         score_pct = case when v_total > 0
                          then round((v_correct::numeric / v_total) * 100)
                          else 0 end
   where id = p_session_id;

  -- Le barème reste dans apply_quiz_results : un seul endroit où
  -- les XP sont décidés.
  v_outcome := public.apply_quiz_results(
    v_session.subject_id,
    v_results,
    v_session.difficulty
  );

  -- L'app a besoin de l'identifiant pour ouvrir la correction
  -- directement depuis l'écran de résultats.
  return v_outcome || jsonb_build_object('session_id', p_session_id);
end;
$$;

revoke all on function public.grade_quiz(uuid, jsonb) from public, anon;
grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;


/**
 * L'historique : les quiz corrigés, du plus récent au plus ancien.
 *
 * Ne renvoie PAS le contenu des questions — la liste n'en a pas
 * besoin, et charger dix quiz complets pour afficher dix lignes
 * serait coûteux sur un réseau haïtien. Le détail se demande quiz
 * par quiz, à l'ouverture.
 */
create or replace function public.quiz_history(p_limit integer default 30)
returns table(
  id         uuid,
  subject_id text,
  difficulty text,
  score_pct  integer,
  total      integer,
  graded_at  timestamptz
)
language sql
security definer
set search_path to ''
as $$
  select
    s.id,
    s.subject_id,
    s.difficulty,
    coalesce(s.score_pct, 0),
    jsonb_array_length(coalesce(s.questions, s.answers))::integer,
    s.graded_at
  from public.quiz_sessions s
  where s.user_id = (select auth.uid())
    and s.graded_at is not null
  order by s.graded_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.quiz_history(integer) from public, anon;
grant execute on function public.quiz_history(integer) to authenticated;
