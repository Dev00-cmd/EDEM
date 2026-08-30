-- ═══════════════════════════════════════════════════════════════
--  VERROUILLAGE DES ÉCRITURES D'XP
--
--  Appliqué le 30 août 2026, en trois migrations Supabase :
--    · lock_xp_writes_server_side
--    · revoke_table_write_privileges_on_xp_tables
--    · revoke_execute_on_trigger_functions
--
--  ── Pourquoi maintenant ───────────────────────────────────────
--
--  Tant qu'EDEM est un usage solo, un élève qui se donne des XP
--  ne trompe que lui-même. C'est un défaut. Dès qu'il y a une
--  classe, un classement de classe et un professeur qui regarde
--  le tableau de bord, ça devient un produit qui ment. On répare
--  avant d'ouvrir le social.
--
--  ── Les trois portes qui étaient ouvertes ─────────────────────
--
--  a) apply_quiz_results était SECURITY INVOKER et exécutable par
--     `authenticated`. Un POST sur /rest/v1/rpc, avec la clé anon
--     qui est de toute façon dans l'application, suffisait à
--     s'attribuer dix bonnes réponses en « difficile » sans avoir
--     ouvert un seul quiz — ce qui contournait entièrement
--     l'anti-rejeu de grade_quiz.
--
--  b) study_topic recevait le montant d'XP EN PARAMÈTRE, depuis le
--     client, sans plafond. Et la même notion, relue vingt fois,
--     payait vingt fois.
--
--  c) Les policies INSERT/UPDATE laissaient écrire n'importe quelle
--     valeur en direct dans progress. Un PATCH avec xp=999999.
--
--  ── Ce qui a changé, et ce qui n'a PAS changé ─────────────────
--
--  Le barème des quiz est intact. Le corps d'apply_quiz_results
--  n'a pas été réécrit d'une ligne : seul son attribut de sécurité
--  a bougé. Vérifié après coup par de vraies requêtes REST — un
--  quiz « moyen » à 7/10 rapporte toujours 70 XP, un « difficile »
--  sans faute toujours 195.
--
--  ── L'ordre des opérations, qui est ce qui avait manqué ───────
--
--  Le 27 août, `tighten_rpc_execute_permissions` avait dû être
--  annulée deux heures plus tard : on avait resserré les droits
--  sans corriger le client d'abord. Cette fois :
--
--    1. la fonction Edge a été déployée en premier (v23). Elle
--       refuse désormais de livrer un quiz dont la session n'a pas
--       pu être enregistrée. À partir de là, plus AUCUN client —
--       même une vieille version installée sur un téléphone —
--       n'atteint le repli sur apply_quiz_results ;
--    2. ces migrations ensuite ;
--    3. la mise à jour OTA de l'application en dernier, qui n'est
--       donc plus urgente.
-- ═══════════════════════════════════════════════════════════════


-- ── (a) apply_quiz_results : réservée à grade_quiz ─────────────
--
-- À l'intérieur de grade_quiz, qui est DEFINER, l'appelant
-- effectif est postgres : l'appel interne continue de fonctionner
-- malgré le REVOKE. C'est le point qu'il fallait vérifier avant
-- d'appliquer, pas après.
alter function public.apply_quiz_results(text, jsonb, text) security definer;
revoke execute on function public.apply_quiz_results(text, jsonb, text)
  from public, anon, authenticated;


-- ── (b) study_topic : barème figé, étude plafonnée ─────────────
--
-- On distingue la date de la dernière ÉTUDE de celle du dernier
-- changement de maîtrise : un quiz passé le matin sur la même
-- notion ne doit pas priver l'élève de son XP d'étude l'après-midi.
alter table public.topic_mastery
  add column if not exists last_study_on date;

drop function if exists public.study_topic(text, text, integer);

create function public.study_topic(p_subject_id text, p_topic_id text)
returns public.progress
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid          uuid := (select auth.uid());
  c_xp         constant integer := 8;   -- barème figé, plus envoyé par le client
  c_max_jour   constant integer := 5;   -- 5 notions payantes → 40 XP d'étude / jour
  c_maitrise   constant integer := 15;  -- ce que vaut une lecture
  c_plafond    constant integer := 60;  -- l'étude seule ne certifie pas une notion
  v_deja       boolean;
  v_faites     integer;
  v_gain       integer := 0;
  row          public.progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Une notion déjà travaillée aujourd'hui ne rapporte plus rien :
  -- sinon le même bouton, cliqué vingt fois, vaut vingt fois 8 XP.
  select exists (
    select 1
      from public.topic_mastery m
     where m.user_id       = uid
       and m.subject_id    = p_subject_id
       and m.topic_id      = p_topic_id
       and m.last_study_on = current_date
  ) into v_deja;

  select d.topics_studied into v_faites
    from public.daily_activity d
   where d.user_id = uid and d.day = current_date;
  v_faites := coalesce(v_faites, 0);

  if not v_deja then
    -- Au-delà du plafond quotidien la notion compte quand même
    -- comme travaillée : c'est l'XP qui s'arrête, pas le suivi.
    if v_faites < c_max_jour then
      v_gain := c_xp;
    end if;

    -- La maîtrise issue de l'étude est DÉCLARÉE, pas mesurée : elle
    -- monte doucement et ne dépasse jamais 60 %. Les 40 % restants
    -- ne s'obtiennent qu'en répondant à des questions.
    --
    -- Avant, une notion valait +34 par lecture : trois clics et
    -- l'élève était « maître » d'un chapitre sans avoir répondu à
    -- une seule question. C'est pourtant cette table qui nourrira
    -- le tableau de bord du professeur. Elle doit dire la vérité.
    insert into public.topic_mastery
      (user_id, subject_id, topic_id, mastery, last_study_on, updated_at)
    values
      (uid, p_subject_id, p_topic_id, c_maitrise, current_date, now())
    on conflict (user_id, subject_id, topic_id) do update
      set mastery = greatest(
                      public.topic_mastery.mastery,
                      least(c_plafond, public.topic_mastery.mastery + c_maitrise)
                    ),
          last_study_on = current_date,
          updated_at    = now();

    insert into public.daily_activity (user_id, day, xp_gained, topics_studied)
    values (uid, current_date, v_gain, 1)
    on conflict (user_id, day) do update
      set xp_gained      = public.daily_activity.xp_gained + v_gain,
          topics_studied = public.daily_activity.topics_studied + 1;
  end if;

  -- La série se met à jour même sans XP : l'élève était bien là.
  update public.progress p
     set xp            = p.xp + v_gain,
         studied_count = p.studied_count + (case when v_deja then 0 else 1 end),
         streak        = case
                           when p.last_active = current_date then p.streak
                           when p.last_active = current_date - 1 then p.streak + 1
                           else 1
                         end,
         last_active   = current_date,
         updated_at    = now()
   where p.user_id = uid
  returning * into row;

  return row;
end;
$$;

revoke execute on function public.study_topic(text, text) from public, anon;
grant  execute on function public.study_topic(text, text) to authenticated;


-- ── (c) Les deux fonctions absentes du diagnostic ──────────────
--
-- touch_activity et reset_progress écrivent elles aussi dans ces
-- tables, en SECURITY INVOKER. Les laisser telles quelles pendant
-- qu'on retire les policies d'écriture, c'était reproduire la
-- panne du 27 août : elles n'auraient plus eu le droit d'écrire.
alter function public.touch_activity() security definer;
revoke execute on function public.touch_activity() from public, anon;
grant  execute on function public.touch_activity() to authenticated;

alter function public.reset_progress() security definer;
revoke execute on function public.reset_progress() from public, anon;
grant  execute on function public.reset_progress() to authenticated;


-- ── (d) Plus aucune écriture directe : on ne garde que la lecture ──
drop policy if exists progress_insert_own       on public.progress;
drop policy if exists progress_update_own       on public.progress;
drop policy if exists progress_delete_own       on public.progress;
drop policy if exists topic_mastery_insert_own  on public.topic_mastery;
drop policy if exists topic_mastery_update_own  on public.topic_mastery;
drop policy if exists topic_mastery_delete_own  on public.topic_mastery;
drop policy if exists daily_activity_insert_own on public.daily_activity;
drop policy if exists daily_activity_update_own on public.daily_activity;
drop policy if exists daily_activity_delete_own on public.daily_activity;
drop policy if exists quiz_results_insert_own   on public.quiz_results;
drop policy if exists quiz_results_delete_own   on public.quiz_results;


-- ── (e) La deuxième serrure : les privilèges de table ──────────
--
-- Retirer les policies ne suffisait pas. Supabase accorde par
-- défaut INSERT/UPDATE/DELETE/TRUNCATE à anon et authenticated sur
-- tout le schéma public ; seule la RLS retenait l'élève. Donc :
--
--   · un PATCH interdit répondait « 0 ligne » au lieu d'une
--     erreur — l'attaquant ne savait pas s'il avait échoué, mais
--     nous non plus ;
--   · le jour où quelqu'un rajoute une policy permissive par
--     mégarde, tout se rouvre en silence ;
--   · TRUNCATE ignore purement et simplement la RLS.
--
-- Les fonctions SECURITY DEFINER s'exécutent en tant que postgres :
-- retirer le droit à authenticated ne leur coûte rien.
--
-- profiles, chat_messages et conversations gardent leurs droits :
-- l'application y écrit directement, et c'est légitime.
revoke insert, update, delete, truncate, references
  on public.progress       from anon, authenticated;
revoke insert, update, delete, truncate, references
  on public.topic_mastery  from anon, authenticated;
revoke insert, update, delete, truncate, references
  on public.daily_activity from anon, authenticated;
revoke insert, update, delete, truncate, references
  on public.quiz_results   from anon, authenticated;

-- Les sessions de quiz sont ouvertes par la fonction Edge en
-- service_role et corrigées par grade_quiz. L'application ne fait
-- que les relire une fois notées : elle n'a jamais eu à y écrire.
revoke insert, update, delete, truncate, references
  on public.quiz_sessions  from anon, authenticated;


-- ── (f) Ménage : ce qui traînait ouvert sans raison ────────────
--
-- Trois RPC joignables sans être connecté, que l'application
-- n'appelle jamais (la fonction Edge passe par service_role).
revoke execute on function public.seen_topics(text)                    from public, anon;
revoke execute on function public.recent_seen_questions(text, integer) from public, anon;
revoke execute on function public.purge_seen_questions(integer)        from public, anon;
grant  execute on function public.seen_topics(text)                    to authenticated;
grant  execute on function public.recent_seen_questions(text, integer) to authenticated;
grant  execute on function public.purge_seen_questions(integer)        to authenticated;

-- Et deux fonctions de TRIGGER exposées dans l'API REST, dont une
-- à anon en SECURITY DEFINER. Un trigger n'a pas besoin du droit
-- EXECUTE pour se déclencher : vérifié, le chat fonctionne.
revoke execute on function public.touch_conversation()           from public, anon, authenticated;
revoke execute on function public.skip_duplicate_seen_question() from public, anon, authenticated;

-- Seul search_path mutable restant.
alter function public.skip_duplicate_seen_question() set search_path to '';
