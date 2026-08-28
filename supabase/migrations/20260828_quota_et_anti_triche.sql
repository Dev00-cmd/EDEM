-- ═══════════════════════════════════════════════════════════════
--  QUOTA PAR ÉLÈVE ET FIN DE LA TRICHE AUX QUIZ
--
--  Deux failles constatées lors de l'audit du 28 août 2026.
--
--  1. TRICHE
--     apply_quiz_results comptait les « ok: true » envoyés par
--     l'application. Elle ne voyait jamais les questions, ni les
--     bonnes réponses. N'importe quel élève connecté pouvait donc
--     appeler la fonction en boucle avec dix bonnes réponses en
--     « difficile » : XP illimités, première place du classement.
--
--     Le serveur connaît pourtant les bonnes réponses : c'est lui
--     qui génère les quiz. Il ne les gardait simplement pas.
--     Désormais il les garde, et c'est LUI qui corrige.
--
--     LIMITE ASSUMÉE. L'application affiche le vrai/faux dès que
--     l'élève répond : elle doit donc connaître les bonnes
--     réponses. Un client modifié peut encore renvoyer un
--     sans-faute. Ce qui disparaît, c'est la triche à un appel :
--     il faut désormais une VRAIE session de quiz générée par le
--     serveur, elle ne se corrige qu'une fois, et le quota borne
--     le nombre de sessions par jour. Supprimer complètement la
--     faille imposerait de ne révéler les réponses qu'à la fin,
--     au prix du retour immédiat — qui est ce qui fait apprendre.
--
--  2. AUCUN QUOTA
--     Rien n'empêchait un compte de générer trois cents quiz dans
--     la journée. Tant que l'auteur était seul utilisateur, sans
--     conséquence. Le jour où l'APK circule, c'est la facture.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. Ménage : la surcharge morte ───────────────────────────
--
-- apply_quiz_results existait en deux exemplaires. Celle à deux
-- arguments date d'avant les niveaux de difficulté et applique
-- l'ancien barème. Elle reste appelable par n'importe qui, et
-- contourne le choix du niveau.

drop function if exists public.apply_quiz_results(text, jsonb);


-- ── 2. Le serveur retient les bonnes réponses ────────────────

create table if not exists public.quiz_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  text not null,
  difficulty  text not null default 'moyen',
  -- [{ topic, answer }] dans l'ordre des questions envoyées.
  -- Le libellé des questions n'est pas repris : il ne sert pas à
  -- la correction et alourdirait la table.
  answers     jsonb not null,
  created_at  timestamptz not null default now(),
  -- Renseigné à la remise. Une session déjà corrigée ne peut plus
  -- l'être : sans cela, on rejouerait la même session pour
  -- réclamer les XP autant de fois qu'on veut.
  graded_at   timestamptz
);

create index if not exists quiz_sessions_user_created_idx
  on public.quiz_sessions (user_id, created_at desc);

alter table public.quiz_sessions enable row level security;

-- Personne ne lit ni n'écrit cette table depuis l'application :
-- l'Edge Function y écrit avec la clé de service, et la
-- correction passe par une fonction SECURITY DEFINER. Aucune
-- politique n'est donc accordée au rôle « authenticated » — les
-- bonnes réponses resteraient sinon lisibles par l'élève, ce qui
-- ruinerait l'intérêt du quiz.


-- ── 3. Le quota ──────────────────────────────────────────────

create table if not exists public.usage_counters (
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null default (now() at time zone 'utc')::date,
  -- Un compteur par nature d'appel : un élève bavard avec le
  -- tuteur ne doit pas se retrouver privé de quiz.
  kind      text not null,
  count     integer not null default 0,
  primary key (user_id, day, kind)
);

alter table public.usage_counters enable row level security;

create policy "usage_counters_select_own" on public.usage_counters
  as permissive for select to authenticated
  using ((select auth.uid()) = user_id);

/**
 * Incrémente le compteur du jour et dit si l'élève peut continuer.
 *
 * Renvoie { allowed, used, limit }. L'incrément et le test sont
 * faits dans le MÊME ordre atomique : deux appels simultanés ne
 * peuvent pas passer tous les deux sous la limite.
 *
 * SECURITY DEFINER parce que l'Edge Function appelle avec la clé
 * de service, mais aussi parce qu'un élève ne doit pas pouvoir
 * écrire dans son propre compteur.
 */
create or replace function public.bump_usage(
  p_user_id uuid,
  p_kind    text,
  p_limit   integer
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_count integer;
begin
  insert into public.usage_counters (user_id, day, kind, count)
  values (p_user_id, (now() at time zone 'utc')::date, p_kind, 1)
  on conflict (user_id, day, kind)
    do update set count = public.usage_counters.count + 1
  returning count into v_count;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'used',    v_count,
    'limit',   p_limit
  );
end;
$$;

revoke all on function public.bump_usage(uuid, text, integer) from public, anon, authenticated;


-- ── 4. La correction, faite par le serveur ───────────────────

/**
 * Corrige un quiz à partir de la session enregistrée.
 *
 * L'application n'envoie plus que ses CHOIX ; elle ne dit plus
 * quelles réponses étaient bonnes. Le barème et la correction
 * vivent tous deux ici : un client modifié ne peut plus rien
 * réclamer.
 *
 * p_picked : tableau d'entiers, l'indice choisi pour chaque
 *            question, ou null si l'élève n'a pas répondu.
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
  v_results jsonb := '[]'::jsonb;
  v_answer  jsonb;
  v_pick    jsonb;
  v_ok      boolean;
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

  -- On compare choix et bonne réponse, question par question.
  for i in 0 .. jsonb_array_length(v_session.answers) - 1 loop
    v_answer := v_session.answers -> i;
    v_pick   := p_picked -> i;

    v_ok := v_pick is not null
        and jsonb_typeof(v_pick) = 'number'
        and (v_pick)::text::integer = (v_answer ->> 'answer')::integer;

    v_results := v_results || jsonb_build_object(
      'topic', coalesce(v_answer ->> 'topic', 'general'),
      'ok',    v_ok
    );
  end loop;

  update public.quiz_sessions set graded_at = now() where id = p_session_id;

  -- Le barème reste dans apply_quiz_results : un seul endroit où
  -- les XP sont décidés.
  return public.apply_quiz_results(
    v_session.subject_id,
    v_results,
    v_session.difficulty
  );
end;
$$;

revoke all on function public.grade_quiz(uuid, jsonb) from public, anon;
grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;


-- ── 5. Ce que cette migration ne fait PAS encore ─────────────
--
-- apply_quiz_results reste appelable par « authenticated », donc
-- l'ancienne porte reste ouverte. C'est VOULU, et temporaire.
--
-- Les applications déjà installées appellent encore cette
-- fonction directement. La révoquer maintenant casserait la
-- remise de quiz de tous les élèves, avant même qu'ils aient reçu
-- la mise à jour. Une faille ouverte quelques jours est moins
-- grave qu'une app hors service.
--
-- La révocation vit dans une seconde migration, à passer une fois
-- la mise à jour effectivement déployée :
--   20260828_fermer_apply_quiz_results.sql
