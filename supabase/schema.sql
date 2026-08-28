-- ═══════════════════════════════════════════════════════════════
--  EDEM — SCHÉMA COMPLET DE LA BASE
--
--  Généré par scripts/dump_schema.mjs. Ne pas éditer à la main :
--  relancer le script après toute modification de la base.
--
--  Projet   : qoyebljuvrxhcroxapys
--  Exporté  : 2026-08-28
--
--  Ce fichier est la SEULE copie hors ligne du backend. Sans
--  lui, un projet Supabase perdu serait irrécupérable.
-- ═══════════════════════════════════════════════════════════════

-- ── Tables ───────────────────────────────────────────────────

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  thread text default 'general'::text not null,
  role text not null,
  text text not null,
  created_at timestamp with time zone default now() not null,
  attachment_path text,
  attachment_type text,
  attachment_name text
);

create table if not exists public.daily_activity (
  user_id uuid not null,
  day date not null,
  xp_gained integer default 0 not null,
  topics_studied integer default 0 not null,
  quizzes_done integer default 0 not null
);

create table if not exists public.profiles (
  id uuid not null,
  name text default ''::text not null,
  lang text default 'fr'::text not null,
  level text default ''::text not null,
  goal text default ''::text not null,
  favorites text[] default '{}'::text[] not null,
  theme text default 'dark'::text not null,
  onboarded boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  board_alias text,
  board_visible boolean default true not null
);

create table if not exists public.progress (
  user_id uuid not null,
  xp integer default 0 not null,
  streak integer default 0 not null,
  last_active date,
  quizzes_done integer default 0 not null,
  answered integer default 0 not null,
  correct integer default 0 not null,
  studied_count integer default 0 not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.quiz_results (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  subject_id text not null,
  total integer not null,
  correct integer not null,
  score_pct integer not null,
  created_at timestamp with time zone default now() not null,
  difficulty text default 'moyen'::text not null
);

create table if not exists public.quiz_seen_questions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  subject_id text not null,
  question text not null,
  topic text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.quiz_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  subject_id text not null,
  difficulty text default 'moyen'::text not null,
  answers jsonb not null,
  created_at timestamp with time zone default now() not null,
  graded_at timestamp with time zone
);

create table if not exists public.schema_migrations (
  name text not null,
  applied_at timestamp with time zone default now() not null
);

create table if not exists public.topic_mastery (
  user_id uuid not null,
  subject_id text not null,
  topic_id text not null,
  mastery integer default 0 not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.usage_counters (
  user_id uuid not null,
  day date default ((now() AT TIME ZONE 'utc'::text))::date not null,
  kind text not null,
  count integer default 0 not null
);

-- ── Contraintes (clés primaires, étrangères, unicité) ────────

alter table chat_messages add constraint chat_messages_pkey PRIMARY KEY (id);
alter table chat_messages add constraint chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'tutor'::text])));
alter table chat_messages add constraint chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table daily_activity add constraint daily_activity_pkey PRIMARY KEY (user_id, day);
alter table daily_activity add constraint daily_activity_quizzes_done_check CHECK ((quizzes_done >= 0));
alter table daily_activity add constraint daily_activity_topics_studied_check CHECK ((topics_studied >= 0));
alter table daily_activity add constraint daily_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table daily_activity add constraint daily_activity_xp_gained_check CHECK ((xp_gained >= 0));
alter table profiles add constraint profiles_board_alias_len CHECK (((board_alias IS NULL) OR ((char_length(btrim(board_alias)) >= 2) AND (char_length(btrim(board_alias)) <= 24))));
alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table profiles add constraint profiles_lang_check CHECK ((lang = ANY (ARRAY['fr'::text, 'ht'::text])));
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_theme_check CHECK ((theme = ANY (ARRAY['system'::text, 'light'::text, 'dark'::text])));
alter table progress add constraint progress_answered_check CHECK ((answered >= 0));
alter table progress add constraint progress_correct_check CHECK ((correct >= 0));
alter table progress add constraint progress_pkey PRIMARY KEY (user_id);
alter table progress add constraint progress_quizzes_done_check CHECK ((quizzes_done >= 0));
alter table progress add constraint progress_streak_check CHECK ((streak >= 0));
alter table progress add constraint progress_studied_count_check CHECK ((studied_count >= 0));
alter table progress add constraint progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table progress add constraint progress_xp_check CHECK ((xp >= 0));
alter table quiz_results add constraint quiz_results_correct_check CHECK ((correct >= 0));
alter table quiz_results add constraint quiz_results_difficulty_check CHECK ((difficulty = ANY (ARRAY['facile'::text, 'moyen'::text, 'difficile'::text])));
alter table quiz_results add constraint quiz_results_pkey PRIMARY KEY (id);
alter table quiz_results add constraint quiz_results_score_pct_check CHECK (((score_pct >= 0) AND (score_pct <= 100)));
alter table quiz_results add constraint quiz_results_total_check CHECK ((total > 0));
alter table quiz_results add constraint quiz_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table quiz_seen_questions add constraint quiz_seen_questions_pkey PRIMARY KEY (id);
alter table quiz_seen_questions add constraint quiz_seen_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table quiz_sessions add constraint quiz_sessions_pkey PRIMARY KEY (id);
alter table quiz_sessions add constraint quiz_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table schema_migrations add constraint schema_migrations_pkey PRIMARY KEY (name);
alter table topic_mastery add constraint topic_mastery_mastery_check CHECK (((mastery >= 0) AND (mastery <= 100)));
alter table topic_mastery add constraint topic_mastery_pkey PRIMARY KEY (user_id, subject_id, topic_id);
alter table topic_mastery add constraint topic_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table usage_counters add constraint usage_counters_pkey PRIMARY KEY (user_id, day, kind);
alter table usage_counters add constraint usage_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Index ────────────────────────────────────────────────────

CREATE INDEX chat_messages_user_thread_idx ON public.chat_messages USING btree (user_id, thread, created_at);
CREATE INDEX daily_activity_user_day_idx ON public.daily_activity USING btree (user_id, day DESC);
CREATE INDEX quiz_results_user_created_idx ON public.quiz_results USING btree (user_id, created_at DESC);
CREATE INDEX quiz_seen_user_subject_idx ON public.quiz_seen_questions USING btree (user_id, subject_id, created_at DESC);
CREATE INDEX quiz_sessions_user_created_idx ON public.quiz_sessions USING btree (user_id, created_at DESC);
CREATE INDEX topic_mastery_user_subject_idx ON public.topic_mastery USING btree (user_id, subject_id);

-- ── Fonctions ────────────────────────────────────────────────
--
--  Le cœur des règles du jeu : XP, maîtrise, classement. Elles
--  vivent ici et pas dans l'app, pour qu'un élève ne puisse pas
--  s'attribuer des points en modifiant le client.

CREATE OR REPLACE FUNCTION public.apply_quiz_results(p_subject_id text, p_results jsonb, p_difficulty text DEFAULT 'moyen'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  uid        uuid := (select auth.uid());
  v_total    integer;
  v_correct  integer;
  v_perfect  boolean;
  v_gained   integer;
  v_pct      integer;
  v_per      integer;   -- XP par bonne réponse
  v_bonus    integer;   -- bonus sans faute
  v_diff     text;
  r          jsonb;
  row        public.progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) = 0 then
    raise exception 'p_results must be a non-empty array';
  end if;

  v_diff := coalesce(nullif(p_difficulty, ''), 'moyen');
  if v_diff not in ('facile', 'moyen', 'difficile') then
    v_diff := 'moyen';
  end if;

  -- Le barème vit ICI, pas dans l'app : un élève ne peut pas
  -- s'attribuer les XP du niveau difficile en jouant en facile.
  if v_diff = 'facile' then
    v_per := 6;  v_bonus := 10;
  elsif v_diff = 'difficile' then
    v_per := 16; v_bonus := 35;
  else
    v_per := 10; v_bonus := 20;
  end if;

  v_total := jsonb_array_length(p_results);
  select count(*) into v_correct
    from jsonb_array_elements(p_results) e
   where (e ->> 'ok')::boolean is true;

  v_perfect := (v_correct = v_total);
  v_gained  := v_correct * v_per + (case when v_perfect then v_bonus else 0 end);
  v_pct     := round((v_correct::numeric / v_total) * 100);

  -- Une question difficile réussie fait plus progresser la maîtrise.
  for r in select * from jsonb_array_elements(p_results)
  loop
    insert into public.topic_mastery (user_id, subject_id, topic_id, mastery, updated_at)
    values (
      uid, p_subject_id, coalesce(r ->> 'topic', 'general'),
      case
        when (r ->> 'ok')::boolean is not true then 8
        when v_diff = 'difficile' then 38
        when v_diff = 'facile' then 20
        else 28
      end,
      now()
    )
    on conflict (user_id, subject_id, topic_id) do update
      set mastery = least(100, public.topic_mastery.mastery
                    + case
                        when (r ->> 'ok')::boolean is not true then 8
                        when v_diff = 'difficile' then 38
                        when v_diff = 'facile' then 20
                        else 28
                      end),
          updated_at = now();
  end loop;

  update public.progress p
     set xp           = p.xp + v_gained,
         quizzes_done = p.quizzes_done + 1,
         answered     = p.answered + v_total,
         correct      = p.correct + v_correct,
         streak       = case
                          when p.last_active = current_date then p.streak
                          when p.last_active = current_date - 1 then p.streak + 1
                          else 1
                        end,
         last_active  = current_date,
         updated_at   = now()
   where p.user_id = uid
  returning * into row;

  insert into public.quiz_results (user_id, subject_id, total, correct, score_pct, difficulty)
  values (uid, p_subject_id, v_total, v_correct, v_pct, v_diff);

  insert into public.daily_activity (user_id, day, xp_gained, quizzes_done)
  values (uid, current_date, v_gained, 1)
  on conflict (user_id, day) do update
    set xp_gained    = public.daily_activity.xp_gained + v_gained,
        quizzes_done = public.daily_activity.quizzes_done + 1;

  return jsonb_build_object(
    'gained',     v_gained,
    'pct',        v_pct,
    'correct',    v_correct,
    'total',      v_total,
    'difficulty', v_diff,
    'progress',   to_jsonb(row)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.bump_usage(p_user_id uuid, p_kind text, p_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.grade_quiz(p_session_id uuid, p_picked jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, name, lang)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'lang', 'fr')
  )
  on conflict (id) do nothing;

  insert into public.progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.leaderboard(p_limit integer DEFAULT 50)
 RETURNS TABLE(rank integer, name text, xp integer, level integer, is_me boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with classement as (
    select
      p.id,
      (row_number() over (order by pr.xp desc, pr.updated_at asc))::integer as rang,
      -- Le pseudonyme prime, puis le prénom, puis un repli neutre.
      coalesce(
        nullif(btrim(p.board_alias), ''),
        nullif(btrim(p.name), ''),
        'Élève'
      ) as affiche,
      pr.xp,
      pr.updated_at,
      p.board_visible
    from public.progress pr
    join public.profiles p on p.id = pr.user_id
    -- Un compte qui n'a jamais rien fait n'a pas sa place ici.
    where pr.xp > 0
  )
  select
    rang,
    affiche,
    xp,
    (floor(sqrt(xp / 60.0)) + 1)::integer,
    (id = (select auth.uid()))
  from classement
  -- L'élève se voit toujours lui-même, même retiré de la liste :
  -- sinon il croirait que sa progression n'est pas comptée.
  where board_visible or id = (select auth.uid())
  order by rang
  limit least(greatest(p_limit, 1), 100);
$function$
;

CREATE OR REPLACE FUNCTION public.my_rank()
 RETURNS TABLE(rank integer, total integer, xp integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with classement as (
    select user_id,
           xp,
           (row_number() over (order by xp desc, updated_at asc))::integer as r
    from public.progress
    where xp > 0
  )
  select
    coalesce((select r from classement where user_id = (select auth.uid())), 0),
    (select count(*)::integer from classement),
    coalesce((select xp from classement where user_id = (select auth.uid())), 0);
$function$
;

CREATE OR REPLACE FUNCTION public.reset_progress()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.topic_mastery       where user_id = uid;
  delete from public.quiz_results        where user_id = uid;
  delete from public.chat_messages       where user_id = uid;
  delete from public.daily_activity      where user_id = uid;
  delete from public.quiz_seen_questions where user_id = uid;

  update public.progress
     set xp = 0, streak = 0, last_active = null, quizzes_done = 0,
         answered = 0, correct = 0, studied_count = 0, updated_at = now()
   where user_id = uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.study_topic(p_subject_id text, p_topic_id text, p_xp integer DEFAULT 8)
 RETURNS progress
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  row public.progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.topic_mastery (user_id, subject_id, topic_id, mastery, updated_at)
  values (uid, p_subject_id, p_topic_id, 34, now())
  on conflict (user_id, subject_id, topic_id) do update
    set mastery    = least(100, public.topic_mastery.mastery + 34),
        updated_at = now();

  update public.progress p
     set xp            = p.xp + p_xp,
         studied_count = p.studied_count + 1,
         streak        = case
                           when p.last_active = current_date then p.streak
                           when p.last_active = current_date - 1 then p.streak + 1
                           else 1
                         end,
         last_active   = current_date,
         updated_at    = now()
   where p.user_id = uid
  returning * into row;

  insert into public.daily_activity (user_id, day, xp_gained, topics_studied)
  values (uid, current_date, p_xp, 1)
  on conflict (user_id, day) do update
    set xp_gained      = public.daily_activity.xp_gained + p_xp,
        topics_studied = public.daily_activity.topics_studied + 1;

  return row;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_activity()
 RETURNS progress
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  uid  uuid := (select auth.uid());
  row  public.progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.progress p
     set streak = case
                    when p.last_active = current_date then p.streak
                    when p.last_active = current_date - 1 then p.streak + 1
                    else 1
                  end,
         last_active = current_date,
         updated_at  = now()
   where p.user_id = uid
  returning * into row;

  return row;
end;
$function$
;

-- ── Row Level Security ───────────────────────────────────────

alter table public.chat_messages enable row level security;
alter table public.daily_activity enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_seen_questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.usage_counters enable row level security;

create policy "chat_messages_delete_own" on public.chat_messages
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "chat_messages_insert_own" on public.chat_messages
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "chat_messages_select_own" on public.chat_messages
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "daily_activity_delete_own" on public.daily_activity
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "daily_activity_insert_own" on public.daily_activity
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "daily_activity_select_own" on public.daily_activity
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "daily_activity_update_own" on public.daily_activity
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "profiles_delete_own" on public.profiles
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id));

create policy "profiles_insert_own" on public.profiles
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = id));

create policy "profiles_select_own" on public.profiles
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id));

create policy "profiles_update_own" on public.profiles
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id))
  with check ((( SELECT auth.uid() AS uid) = id));

create policy "progress_delete_own" on public.progress
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "progress_insert_own" on public.progress
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "progress_select_own" on public.progress
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "progress_update_own" on public.progress
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_results_delete_own" on public.quiz_results
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_results_insert_own" on public.quiz_results
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_results_select_own" on public.quiz_results
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_seen_delete_own" on public.quiz_seen_questions
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_seen_insert_own" on public.quiz_seen_questions
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_seen_select_own" on public.quiz_seen_questions
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "topic_mastery_delete_own" on public.topic_mastery
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "topic_mastery_insert_own" on public.topic_mastery
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "topic_mastery_select_own" on public.topic_mastery
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "topic_mastery_update_own" on public.topic_mastery
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "usage_counters_select_own" on public.usage_counters
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

-- ── Triggers ─────────────────────────────────────────────────

CREATE TRIGGER on_auth_user_auto_confirm BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auto_confirm_email();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Stockage (fichiers joints) ───────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
  on conflict (id) do nothing;

create policy "attachments_delete_own_folder" on storage.objects
  for delete
  using (((bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

create policy "attachments_insert_own_folder" on storage.objects
  for insert
  with check (((bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

create policy "attachments_select_own_folder" on storage.objects
  for select
  using (((bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

create policy "attachments_update_own_folder" on storage.objects
  for update
  using (((bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
