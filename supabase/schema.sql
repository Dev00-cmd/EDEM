-- ═══════════════════════════════════════════════════════════════
--  EDEM — SCHÉMA COMPLET DE LA BASE
--
--  Généré par scripts/dump_schema.mjs. Ne pas éditer à la main :
--  relancer le script après toute modification de la base.
--
--  Projet   : qoyebljuvrxhcroxapys
--  Exporté  : 2026-08-31
--
--  Ce fichier est la SEULE copie hors ligne du backend. Sans
--  lui, un projet Supabase perdu serait irrécupérable.
-- ═══════════════════════════════════════════════════════════════

-- ── Tables ───────────────────────────────────────────────────

create table if not exists public.assignments (
  id uuid default gen_random_uuid() not null,
  classroom_id uuid not null,
  kind text not null,
  title text not null,
  instructions text,
  subject_id text not null,
  topic_ids text[] default '{}'::text[] not null,
  difficulty text,
  due_at timestamp with time zone,
  published boolean default false not null,
  created_by uuid not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  thread text default 'general'::text not null,
  role text not null,
  text text not null,
  created_at timestamp with time zone default now() not null,
  attachment_path text,
  attachment_type text,
  attachment_name text,
  conversation_id uuid
);

create table if not exists public.classroom_members (
  classroom_id uuid not null,
  user_id uuid not null,
  status text default 'pending'::text not null,
  joined_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.classroom_messages (
  id uuid default gen_random_uuid() not null,
  classroom_id uuid not null,
  user_id uuid not null,
  text text not null,
  attachment_path text,
  created_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  flagged boolean default false not null
);

create table if not exists public.classrooms (
  id uuid default gen_random_uuid() not null,
  school_id uuid not null,
  teacher_id uuid not null,
  name text not null,
  subject_id text not null,
  grade_level text not null,
  join_code text not null,
  is_open boolean default true not null,
  current_focus text,
  focus_note text,
  created_at timestamp with time zone default now() not null,
  archived_at timestamp with time zone
);

create table if not exists public.communes (
  id text not null,
  departement_id text not null,
  name text not null,
  pcode text not null,
  official boolean default true not null
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  subject_id text default 'general'::text not null,
  title text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.daily_activity (
  user_id uuid not null,
  day date not null,
  xp_gained integer default 0 not null,
  topics_studied integer default 0 not null,
  quizzes_done integer default 0 not null
);

create table if not exists public.departements (
  id text not null,
  name text not null,
  rank integer not null
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
  board_visible boolean default true not null,
  school_id uuid,
  section text,
  commune_id text,
  role text default 'eleve'::text not null,
  profile_completed_at timestamp with time zone,
  weak_subjects text[] default '{}'::text[] not null,
  exam_year integer,
  study_minutes integer
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
  created_at timestamp with time zone default now() not null,
  qhash text default md5(lower(btrim(regexp_replace(question, '\s+'::text, ' '::text, 'g'::text))))
);

create table if not exists public.quiz_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  subject_id text not null,
  difficulty text default 'moyen'::text not null,
  answers jsonb not null,
  created_at timestamp with time zone default now() not null,
  graded_at timestamp with time zone,
  questions jsonb,
  picked jsonb,
  score_pct integer,
  assignment_id uuid
);

create table if not exists public.role_events (
  id bigint not null,
  user_id uuid not null,
  event text not null,
  actor uuid,
  reason text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.schema_migrations (
  name text not null,
  applied_at timestamp with time zone default now() not null
);

create table if not exists public.school_levels (
  id text not null,
  label_fr text not null,
  label_ht text not null,
  cycle text not null,
  rank integer not null,
  has_exam boolean default false not null,
  needs_section boolean default false not null
);

create table if not exists public.school_sections (
  id text not null,
  label_fr text not null,
  label_ht text not null,
  rank integer not null
);

create table if not exists public.schools (
  id uuid default gen_random_uuid() not null,
  name text not null,
  commune_id text not null,
  type text default 'autre'::text not null,
  status text default 'pending'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  source text default 'user'::text not null,
  menfp_code text,
  levels text,
  name_norm text not null,
  acronym text not null
);

create table if not exists public.submissions (
  id uuid default gen_random_uuid() not null,
  assignment_id uuid not null,
  user_id uuid not null,
  text text,
  attachment_path text,
  quiz_session_id uuid,
  score_pct integer,
  submitted_at timestamp with time zone default now() not null,
  grade integer,
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone
);

create table if not exists public.teacher_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  school_id uuid,
  full_name text not null,
  subjects text[] default '{}'::text[] not null,
  contact text not null,
  message text,
  status text default 'pending'::text not null,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_note text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.topic_mastery (
  user_id uuid not null,
  subject_id text not null,
  topic_id text not null,
  mastery integer default 0 not null,
  updated_at timestamp with time zone default now() not null,
  last_study_on date
);

create table if not exists public.topics (
  subject_id text not null,
  band text not null,
  topic_id text not null,
  label_fr text not null,
  label_ht text not null,
  rank integer not null
);

create table if not exists public.usage_counters (
  user_id uuid not null,
  day date default ((now() AT TIME ZONE 'utc'::text))::date not null,
  kind text not null,
  count integer default 0 not null
);

-- ── Contraintes (clés primaires, étrangères, unicité) ────────

alter table assignments add constraint assignments_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
alter table assignments add constraint assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table assignments add constraint assignments_difficulty_check CHECK (((difficulty IS NULL) OR (difficulty = ANY (ARRAY['facile'::text, 'moyen'::text, 'difficile'::text]))));
alter table assignments add constraint assignments_instructions_check CHECK (((instructions IS NULL) OR (char_length(instructions) <= 2000)));
alter table assignments add constraint assignments_kind_check CHECK ((kind = ANY (ARRAY['devoir'::text, 'quiz'::text])));
alter table assignments add constraint assignments_pkey PRIMARY KEY (id);
alter table assignments add constraint assignments_title_check CHECK (((char_length(btrim(title)) >= 2) AND (char_length(btrim(title)) <= 120)));
alter table assignments add constraint assignments_topic_ids_check CHECK ((cardinality(topic_ids) <= 8));
alter table chat_messages add constraint chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table chat_messages add constraint chat_messages_pkey PRIMARY KEY (id);
alter table chat_messages add constraint chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'tutor'::text])));
alter table chat_messages add constraint chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table classroom_members add constraint classroom_members_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
alter table classroom_members add constraint classroom_members_pkey PRIMARY KEY (classroom_id, user_id);
alter table classroom_members add constraint classroom_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'removed'::text])));
alter table classroom_members add constraint classroom_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table classroom_messages add constraint classroom_messages_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE;
alter table classroom_messages add constraint classroom_messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table classroom_messages add constraint classroom_messages_pkey PRIMARY KEY (id);
alter table classroom_messages add constraint classroom_messages_text_check CHECK (((char_length(text) >= 1) AND (char_length(text) <= 2000)));
alter table classroom_messages add constraint classroom_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table classrooms add constraint classrooms_current_focus_check CHECK (((current_focus IS NULL) OR (char_length(current_focus) <= 200)));
alter table classrooms add constraint classrooms_focus_note_check CHECK (((focus_note IS NULL) OR (char_length(focus_note) <= 500)));
alter table classrooms add constraint classrooms_grade_level_fkey FOREIGN KEY (grade_level) REFERENCES school_levels(id);
alter table classrooms add constraint classrooms_join_code_check CHECK ((join_code ~ '^[2-9A-HJ-KM-NP-Z]{6}$'::text));
alter table classrooms add constraint classrooms_join_code_key UNIQUE (join_code);
alter table classrooms add constraint classrooms_name_check CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 80)));
alter table classrooms add constraint classrooms_pkey PRIMARY KEY (id);
alter table classrooms add constraint classrooms_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id);
alter table classrooms add constraint classrooms_subject_id_check CHECK (((char_length(subject_id) >= 1) AND (char_length(subject_id) <= 40)));
alter table classrooms add constraint classrooms_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table communes add constraint communes_departement_id_fkey FOREIGN KEY (departement_id) REFERENCES departements(id);
alter table communes add constraint communes_pkey PRIMARY KEY (id);
alter table conversations add constraint conversations_pkey PRIMARY KEY (id);
alter table conversations add constraint conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table daily_activity add constraint daily_activity_pkey PRIMARY KEY (user_id, day);
alter table daily_activity add constraint daily_activity_quizzes_done_check CHECK ((quizzes_done >= 0));
alter table daily_activity add constraint daily_activity_topics_studied_check CHECK ((topics_studied >= 0));
alter table daily_activity add constraint daily_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table daily_activity add constraint daily_activity_xp_gained_check CHECK ((xp_gained >= 0));
alter table departements add constraint departements_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_board_alias_len CHECK (((board_alias IS NULL) OR ((char_length(btrim(board_alias)) >= 2) AND (char_length(btrim(board_alias)) <= 24))));
alter table profiles add constraint profiles_commune_id_fkey FOREIGN KEY (commune_id) REFERENCES communes(id);
alter table profiles add constraint profiles_exam_year_ck CHECK (((exam_year IS NULL) OR ((exam_year >= 2026) AND (exam_year <= 2040))));
alter table profiles add constraint profiles_goal_ck CHECK ((goal = ANY (ARRAY[''::text, 'exams'::text, 'grades'::text, 'learn'::text, 'english'::text, 'catchup'::text])));
alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table profiles add constraint profiles_lang_check CHECK ((lang = ANY (ARRAY['fr'::text, 'ht'::text])));
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['eleve'::text, 'prof'::text])));
alter table profiles add constraint profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
alter table profiles add constraint profiles_section_fkey FOREIGN KEY (section) REFERENCES school_sections(id);
alter table profiles add constraint profiles_study_minutes_ck CHECK (((study_minutes IS NULL) OR (study_minutes = ANY (ARRAY[15, 30, 60, 120]))));
alter table profiles add constraint profiles_theme_check CHECK ((theme = ANY (ARRAY['system'::text, 'light'::text, 'dark'::text])));
alter table profiles add constraint profiles_weak_subjects_ck CHECK ((cardinality(weak_subjects) <= 5));
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
alter table quiz_sessions add constraint quiz_sessions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;
alter table quiz_sessions add constraint quiz_sessions_pkey PRIMARY KEY (id);
alter table quiz_sessions add constraint quiz_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table role_events add constraint role_events_event_check CHECK ((event = ANY (ARRAY['approved'::text, 'rejected'::text, 'revoked'::text])));
alter table role_events add constraint role_events_pkey PRIMARY KEY (id);
alter table schema_migrations add constraint schema_migrations_pkey PRIMARY KEY (name);
alter table school_levels add constraint school_levels_cycle_check CHECK ((cycle = ANY (ARRAY['fondamental'::text, 'secondaire'::text, 'autre'::text])));
alter table school_levels add constraint school_levels_pkey PRIMARY KEY (id);
alter table school_sections add constraint school_sections_pkey PRIMARY KEY (id);
alter table schools add constraint schools_commune_id_fkey FOREIGN KEY (commune_id) REFERENCES communes(id);
alter table schools add constraint schools_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table schools add constraint schools_name_check CHECK (((char_length(btrim(name)) >= 3) AND (char_length(btrim(name)) <= 120)));
alter table schools add constraint schools_pkey PRIMARY KEY (id);
alter table schools add constraint schools_source_check CHECK ((source = ANY (ARRAY['ocha'::text, 'osm'::text, 'ocha+osm'::text, 'user'::text, 'menfp'::text])));
alter table schools add constraint schools_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'pending'::text, 'rejected'::text])));
alter table schools add constraint schools_type_check CHECK ((type = ANY (ARRAY['publique'::text, 'privee'::text, 'congreganiste'::text, 'autre'::text])));
alter table submissions add constraint submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
alter table submissions add constraint submissions_assignment_id_user_id_key UNIQUE (assignment_id, user_id);
alter table submissions add constraint submissions_feedback_check CHECK (((feedback IS NULL) OR (char_length(feedback) <= 2000)));
alter table submissions add constraint submissions_grade_check CHECK (((grade IS NULL) OR ((grade >= 0) AND (grade <= 100))));
alter table submissions add constraint submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table submissions add constraint submissions_pkey PRIMARY KEY (id);
alter table submissions add constraint submissions_quiz_session_id_fkey FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE SET NULL;
alter table submissions add constraint submissions_score_pct_check CHECK (((score_pct IS NULL) OR ((score_pct >= 0) AND (score_pct <= 100))));
alter table submissions add constraint submissions_text_check CHECK (((text IS NULL) OR (char_length(text) <= 5000)));
alter table submissions add constraint submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table teacher_requests add constraint teacher_requests_contact_check CHECK (((char_length(btrim(contact)) >= 5) AND (char_length(btrim(contact)) <= 200)));
alter table teacher_requests add constraint teacher_requests_full_name_check CHECK (((char_length(btrim(full_name)) >= 3) AND (char_length(btrim(full_name)) <= 120)));
alter table teacher_requests add constraint teacher_requests_message_check CHECK (((message IS NULL) OR (char_length(message) <= 1000)));
alter table teacher_requests add constraint teacher_requests_pkey PRIMARY KEY (id);
alter table teacher_requests add constraint teacher_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table teacher_requests add constraint teacher_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
alter table teacher_requests add constraint teacher_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
alter table teacher_requests add constraint teacher_requests_subjects_check CHECK (((cardinality(subjects) >= 1) AND (cardinality(subjects) <= 8)));
alter table teacher_requests add constraint teacher_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table teacher_requests add constraint teacher_requests_user_id_key UNIQUE (user_id);
alter table topic_mastery add constraint topic_mastery_mastery_check CHECK (((mastery >= 0) AND (mastery <= 100)));
alter table topic_mastery add constraint topic_mastery_pkey PRIMARY KEY (user_id, subject_id, topic_id);
alter table topic_mastery add constraint topic_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table topics add constraint topics_band_check CHECK ((band = ANY (ARRAY['primaire'::text, 'college'::text, 'lycee'::text])));
alter table topics add constraint topics_pkey PRIMARY KEY (subject_id, band, topic_id);
alter table usage_counters add constraint usage_counters_pkey PRIMARY KEY (user_id, day, kind);
alter table usage_counters add constraint usage_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Index ────────────────────────────────────────────────────

CREATE INDEX assignments_classroom_idx ON public.assignments USING btree (classroom_id, published, due_at);
CREATE INDEX chat_messages_conversation_idx ON public.chat_messages USING btree (conversation_id, created_at);
CREATE INDEX chat_messages_user_thread_idx ON public.chat_messages USING btree (user_id, thread, created_at);
CREATE INDEX classroom_members_actifs_idx ON public.classroom_members USING btree (classroom_id) WHERE (status = 'active'::text);
CREATE INDEX classroom_members_user_idx ON public.classroom_members USING btree (user_id, status);
CREATE INDEX classroom_messages_fil_idx ON public.classroom_messages USING btree (classroom_id, created_at DESC);
CREATE INDEX classrooms_school_idx ON public.classrooms USING btree (school_id);
CREATE INDEX classrooms_teacher_idx ON public.classrooms USING btree (teacher_id) WHERE (archived_at IS NULL);
CREATE INDEX communes_departement_idx ON public.communes USING btree (departement_id, name);
CREATE INDEX communes_pcode_idx ON public.communes USING btree (pcode);
CREATE UNIQUE INDEX communes_pcode_officiel_idx ON public.communes USING btree (pcode) WHERE official;
CREATE INDEX conversations_user_recent_idx ON public.conversations USING btree (user_id, updated_at DESC);
CREATE INDEX daily_activity_user_day_idx ON public.daily_activity USING btree (user_id, day DESC);
CREATE INDEX profiles_school_idx ON public.profiles USING btree (school_id) WHERE (school_id IS NOT NULL);
CREATE INDEX progress_xp_rank_idx ON public.progress USING btree (xp DESC, updated_at) WHERE (xp > 0);
CREATE INDEX quiz_results_user_created_idx ON public.quiz_results USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX quiz_seen_unique_idx ON public.quiz_seen_questions USING btree (user_id, subject_id, qhash);
CREATE INDEX quiz_seen_user_subject_idx ON public.quiz_seen_questions USING btree (user_id, subject_id, created_at DESC);
CREATE INDEX quiz_sessions_assignment_idx ON public.quiz_sessions USING btree (assignment_id) WHERE (assignment_id IS NOT NULL);
CREATE INDEX quiz_sessions_history_idx ON public.quiz_sessions USING btree (user_id, graded_at DESC) WHERE (graded_at IS NOT NULL);
CREATE INDEX quiz_sessions_user_created_idx ON public.quiz_sessions USING btree (user_id, created_at DESC);
CREATE INDEX role_events_user_idx ON public.role_events USING btree (user_id, created_at DESC);
CREATE INDEX schools_acronym_col_idx ON public.schools USING btree (acronym);
CREATE INDEX schools_commune_name_idx ON public.schools USING btree (commune_id, name);
CREATE INDEX schools_created_by_idx ON public.schools USING btree (created_by) WHERE (created_by IS NOT NULL);
CREATE UNIQUE INDEX schools_menfp_code_idx ON public.schools USING btree (menfp_code) WHERE (menfp_code IS NOT NULL);
CREATE INDEX schools_name_norm_prefix_idx ON public.schools USING btree (name_norm text_pattern_ops);
CREATE INDEX schools_name_norm_trgm_idx ON public.schools USING gin (name_norm gin_trgm_ops);
CREATE UNIQUE INDEX schools_unique_in_commune ON public.schools USING btree (commune_id, norm_text(name));
CREATE INDEX submissions_assignment_idx ON public.submissions USING btree (assignment_id);
CREATE INDEX submissions_user_idx ON public.submissions USING btree (user_id);
CREATE INDEX teacher_requests_school_idx ON public.teacher_requests USING btree (school_id) WHERE (school_id IS NOT NULL);
CREATE INDEX teacher_requests_status_idx ON public.teacher_requests USING btree (status, created_at);
CREATE INDEX topic_mastery_user_subject_idx ON public.topic_mastery USING btree (user_id, subject_id);
CREATE INDEX topics_subject_idx ON public.topics USING btree (subject_id, band, rank);

-- ── Fonctions ────────────────────────────────────────────────
--
--  Le cœur des règles du jeu : XP, maîtrise, classement. Elles
--  vivent ici et pas dans l'app, pour qu'un élève ne puisse pas
--  s'attribuer des points en modifiant le client.

CREATE OR REPLACE FUNCTION public.apply_quiz_results(p_subject_id text, p_results jsonb, p_difficulty text DEFAULT 'moyen'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.approve_member(p_classroom_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actifs integer;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;

  select count(*) into v_actifs from public.classroom_members
   where classroom_id = p_classroom_id and status = 'active';
  if v_actifs >= 60 then
    raise exception 'cette classe est complete';
  end if;

  update public.classroom_members
     set status = 'active', joined_at = now()
   where classroom_id = p_classroom_id and user_id = p_user_id and status = 'pending';
  if not found then
    raise exception 'aucune demande en attente';
  end if;

  return jsonb_build_object('user_id', p_user_id, 'status', 'active');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_teacher_role(p_user_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_nom text;
begin
  select full_name into v_nom
    from public.teacher_requests where user_id = p_user_id;
  if not found then
    raise exception 'aucune demande pour cet utilisateur';
  end if;

  update public.teacher_requests
     set status = 'approved', reviewed_at = now(),
         reviewed_by = (select auth.uid()), review_note = p_note,
         updated_at = now()
   where user_id = p_user_id;

  -- Le trigger profiles_guard_role laisse passer : à l'intérieur
  -- d'une fonction DEFINER, current_user vaut postgres.
  update public.profiles set role = 'prof', updated_at = now()
   where id = p_user_id;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'approved', (select auth.uid()), p_note);

  return jsonb_build_object('user_id', p_user_id, 'name', v_nom, 'role', 'prof');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.archive_classroom(p_classroom_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.classrooms
     set archived_at = now(), is_open = false
   where id = p_classroom_id and archived_at is null;
  return jsonb_build_object('classroom_id', p_classroom_id, 'archived', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assignment_classroom(p_assignment_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select a.classroom_id from public.assignments a where a.id = p_assignment_id;
$function$
;

CREATE OR REPLACE FUNCTION public.assignment_quiz_params(p_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  a   public.assignments;
begin
  if uid is null then return null; end if;

  select * into a from public.assignments where id = p_assignment_id;
  if not found or not a.published or a.kind <> 'quiz' then return null; end if;
  if not public.is_classroom_member(a.classroom_id) then return null; end if;

  -- Déjà rendu : on ne rejoue pas.
  if exists (select 1 from public.submissions s
              where s.assignment_id = p_assignment_id and s.user_id = uid) then
    return jsonb_build_object('already_done', true);
  end if;

  return jsonb_build_object(
    'assignment_id', a.id,
    'subject_id',    a.subject_id,
    'topic_ids',     a.topic_ids,
    'difficulty',    coalesce(a.difficulty, 'moyen'),
    'title',         a.title
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assignment_submissions(p_assignment_id uuid)
 RETURNS TABLE(user_id uuid, affiche text, vrai_nom text, submission_id uuid, submitted_at timestamp with time zone, text text, attachment_path text, score_pct integer, grade integer, feedback text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    nullif(btrim(p.name), ''),
    s.id, s.submitted_at, s.text, s.attachment_path, s.score_pct, s.grade, s.feedback
  from public.classroom_members m
  join public.profiles p on p.id = m.user_id
  left join public.submissions s
    on s.assignment_id = p_assignment_id and s.user_id = m.user_id
  where m.classroom_id = public.assignment_classroom(p_assignment_id)
    and m.status = 'active'
    and public.is_classroom_teacher(public.assignment_classroom(p_assignment_id))
  order by (s.submitted_at is null), 2;
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

CREATE OR REPLACE FUNCTION public.classroom_assignments(p_classroom_id uuid)
 RETURNS TABLE(id uuid, kind text, title text, topic_ids text[], difficulty text, due_at timestamp with time zone, published boolean, rendus integer, a_corriger integer, moyenne integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    a.id, a.kind, a.title, a.topic_ids, a.difficulty, a.due_at, a.published,
    (select count(*)::integer from public.submissions s where s.assignment_id = a.id),
    (select count(*)::integer from public.submissions s
      where s.assignment_id = a.id and s.graded_at is null and a.kind = 'devoir'),
    (select round(avg(coalesce(s.grade, s.score_pct)))::integer from public.submissions s
      where s.assignment_id = a.id and coalesce(s.grade, s.score_pct) is not null)
  from public.assignments a
  where a.classroom_id = p_classroom_id
    and public.is_classroom_teacher(p_classroom_id)
  order by a.created_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.classroom_dashboard(p_classroom_id uuid)
 RETURNS TABLE(topic_id text, label_fr text, label_ht text, eleves_mesures integer, maitrise integer, en_difficulte integer, noms text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with garde as (
    select public.is_classroom_teacher(p_classroom_id) as ok
  ),
  classe as (
    select c.subject_id,
           case
             when c.grade_level like 'NS%' or c.grade_level = 'Philo' then 'lycee'
             when c.grade_level in ('7e AF', '8e AF', '9e AF')        then 'college'
             else 'primaire'
           end as band
    from public.classrooms c
    where c.id = p_classroom_id and (select ok from garde)
  ),
  membres as (
    select m.user_id,
           coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève') as affiche
    from public.classroom_members m
    join public.profiles p on p.id = m.user_id
    where m.classroom_id = p_classroom_id and m.status = 'active'
  )
  select
    t.topic_id, t.label_fr, t.label_ht,
    count(tm.user_id)::integer,
    coalesce(round(avg(tm.mastery))::integer, 0),
    count(*) filter (where tm.mastery < 40)::integer,
    -- Les élèves sous 40 %, nommés : c'est la liste sur laquelle le
    -- professeur agit lundi matin.
    coalesce(array_agg(mb.affiche order by tm.mastery)
               filter (where tm.mastery < 40), '{}')
  from classe cl
  join public.topics t
    on t.subject_id = cl.subject_id and t.band = cl.band
  left join membres mb on true
  left join public.topic_mastery tm
    on tm.user_id = mb.user_id
   and tm.subject_id = cl.subject_id
   and tm.topic_id = t.topic_id
  group by t.topic_id, t.label_fr, t.label_ht, t.rank
  order by count(tm.user_id) = 0, coalesce(avg(tm.mastery), 999), t.rank;
$function$
;

CREATE OR REPLACE FUNCTION public.classroom_messages(p_classroom_id uuid, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, user_id uuid, affiche text, vrai_nom text, is_teacher boolean, text text, attachment_path text, created_at timestamp with time zone, flagged boolean, mine boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with moi as (
    select public.is_classroom_teacher(p_classroom_id) as prof,
           public.is_classroom_member(p_classroom_id)  as membre
  )
  select
    m.id,
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    -- Le vrai nom ne part qu'au professeur de cette classe.
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    m.user_id = c.teacher_id,
    m.text,
    m.attachment_path,
    m.created_at,
    m.flagged,
    m.user_id = (select auth.uid())
  from public.classroom_messages m
  join public.classrooms c on c.id = m.classroom_id
  join public.profiles   p on p.id = m.user_id
  where m.classroom_id = p_classroom_id
    and (select prof or membre from moi)
    and m.deleted_at is null
    and (not m.flagged or (select prof from moi))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$function$
;

CREATE OR REPLACE FUNCTION public.classroom_roster(p_classroom_id uuid)
 RETURNS TABLE(user_id uuid, affiche text, vrai_nom text, status text, is_teacher boolean, joined_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with moi as (
    select public.is_classroom_teacher(p_classroom_id) as prof,
           public.is_classroom_member(p_classroom_id)  as membre
  )
  select
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    m.status,
    false,
    m.joined_at
  from public.classroom_members m
  join public.profiles p on p.id = m.user_id
  where (select prof or membre from moi)
    and m.classroom_id = p_classroom_id
    -- Un élève ne voit que les membres actifs ; le prof voit tout.
    and (m.status = 'active' or (select prof from moi))
    and m.status <> 'removed'
  order by m.status, 2;
$function$
;

CREATE OR REPLACE FUNCTION public.classroom_summary(p_classroom_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when not public.is_classroom_teacher(p_classroom_id) then null else
    jsonb_build_object(
      'membres', (select count(*) from public.classroom_members
                   where classroom_id = p_classroom_id and status = 'active'),
      'en_attente', (select count(*) from public.classroom_members
                      where classroom_id = p_classroom_id and status = 'pending'),
      'devoirs', (select count(*) from public.assignments
                   where classroom_id = p_classroom_id and published),
      'a_corriger', (select count(*) from public.submissions s
                      join public.assignments a on a.id = s.assignment_id
                     where a.classroom_id = p_classroom_id
                       and a.kind = 'devoir' and s.graded_at is null),
      -- Un élève qui n'a rien fait depuis une semaine, c'est le
      -- signal le plus utile du tableau de bord.
      'inactifs_7j', (select count(*) from public.classroom_members m
                       left join public.progress pr on pr.user_id = m.user_id
                      where m.classroom_id = p_classroom_id and m.status = 'active'
                        and (pr.last_active is null or pr.last_active < current_date - 7))
    )
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.conversation_list(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, subject_id text, title text, updated_at timestamp with time zone, message_count integer, preview text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    c.id,
    c.subject_id,
    c.title,
    c.updated_at,
    (select count(*)::integer from public.chat_messages m
      where m.conversation_id = c.id),
    (select left(btrim(m.text), 120) from public.chat_messages m
      where m.conversation_id = c.id
      order by m.created_at desc limit 1)
  from public.conversations c
  where c.user_id = (select auth.uid())
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 200);
$function$
;

CREATE OR REPLACE FUNCTION public.create_classroom(p_school_id uuid, p_name text, p_subject_id text, p_grade_level text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid    uuid := (select auth.uid());
  v_role text;
  v_nom  text := btrim(coalesce(p_name, ''));
  v_code text;
  v_id   uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select role into v_role from public.profiles where id = uid;
  if v_role is distinct from 'prof' then
    raise exception 'seul un professeur peut ouvrir une classe';
  end if;
  if char_length(v_nom) < 2 then
    raise exception 'nom de classe trop court';
  end if;
  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'ecole inconnue';
  end if;
  if not exists (select 1 from public.school_levels where id = p_grade_level) then
    raise exception 'niveau inconnu';
  end if;

  -- Dix classes actives par professeur : un vrai prof en a trois ou
  -- quatre. Au-delà, c'est un compte qui fabrique des codes.
  if (select count(*) from public.classrooms
       where teacher_id = uid and archived_at is null) >= 10 then
    raise exception 'trop de classes ouvertes';
  end if;

  v_code := public.generate_join_code();

  insert into public.classrooms (school_id, teacher_id, name, subject_id, grade_level, join_code)
  values (p_school_id, uid, v_nom, p_subject_id, p_grade_level, v_code)
  returning classrooms.id into v_id;

  return jsonb_build_object('id', v_id, 'join_code', v_code, 'name', v_nom);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_assignment(p_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(public.assignment_classroom(p_assignment_id)) then
    raise exception 'reserve au professeur de la classe';
  end if;
  -- Un devoir déjà rendu ne se supprime pas : le travail d'un élève
  -- ne disparaît pas parce que le professeur change d'avis.
  if exists (select 1 from public.submissions where assignment_id = p_assignment_id) then
    raise exception 'des eleves ont deja rendu';
  end if;
  delete from public.assignments where id = p_assignment_id;
  return jsonb_build_object('deleted', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_classroom_message(p_message_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  m   public.classroom_messages;
begin
  select * into m from public.classroom_messages where id = p_message_id;
  if not found or m.deleted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;

  if m.user_id <> uid and not public.is_classroom_teacher(m.classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;

  update public.classroom_messages
     set deleted_at = now(), deleted_by = uid
   where id = p_message_id;

  return jsonb_build_object('ok', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_join_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code     text;
  v_essais   integer := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(c_alphabet, 1 + floor(random() * 31)::integer, 1);
    end loop;
    exit when not exists (select 1 from public.classrooms where join_code = v_code);
    v_essais := v_essais + 1;
    if v_essais > 50 then
      raise exception 'impossible de generer un code';
    end if;
  end loop;
  return v_code;
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
  v_source  jsonb;
  v_results jsonb := '[]'::jsonb;
  v_answer  jsonb;
  v_pick    jsonb;
  v_ok      boolean;
  v_correct integer := 0;
  v_total   integer;
  v_outcome jsonb;
  v_pct     integer;
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

  v_pct := case when v_total > 0
                then round((v_correct::numeric / v_total) * 100)
                else 0 end;

  update public.quiz_sessions
     set graded_at = now(),
         picked    = p_picked,
         score_pct = v_pct
   where id = p_session_id;

  -- Le barème reste dans apply_quiz_results : un seul endroit où
  -- les XP sont décidés.
  v_outcome := public.apply_quiz_results(
    v_session.subject_id,
    v_results,
    v_session.difficulty
  );

  -- ── AJOUT : la remise, si la session appartient à un devoir ──
  --
  -- `do nothing` en cas de conflit : la PREMIÈRE session terminée
  -- fait foi. Sans ça, un élève rejouerait le devoir jusqu'à
  -- tomber sur un bon score, et la note ne voudrait plus rien dire.
  if v_session.assignment_id is not null then
    insert into public.submissions
      (assignment_id, user_id, quiz_session_id, score_pct, submitted_at)
    values
      (v_session.assignment_id, uid, p_session_id, v_pct, now())
    on conflict (assignment_id, user_id) do nothing;
  end if;

  -- L'app a besoin de l'identifiant pour ouvrir la correction
  -- directement depuis l'écran de résultats.
  return v_outcome || jsonb_build_object('session_id', p_session_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.grade_submission(p_submission_id uuid, p_grade integer, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_assignment uuid;
begin
  select assignment_id into v_assignment from public.submissions where id = p_submission_id;
  if v_assignment is null then raise exception 'remise introuvable'; end if;
  if not public.is_classroom_teacher(public.assignment_classroom(v_assignment)) then
    raise exception 'reserve au professeur de la classe';
  end if;
  if p_grade is not null and (p_grade < 0 or p_grade > 100) then
    raise exception 'note hors bornes';
  end if;

  update public.submissions
     set grade = p_grade,
         feedback = nullif(btrim(coalesce(p_feedback, '')), ''),
         graded_by = (select auth.uid()), graded_at = now()
   where id = p_submission_id;

  return jsonb_build_object('id', p_submission_id, 'grade', p_grade);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role') then
    raise exception 'le role ne se modifie pas depuis le client';
  end if;
  return new;
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

CREATE OR REPLACE FUNCTION public.is_classroom_member(p_classroom_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.classroom_members m
     where m.classroom_id = p_classroom_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_classroom_teacher(p_classroom_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.classrooms c
     where c.id = p_classroom_id
       and c.teacher_id = (select auth.uid())
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_teacher_of_attachment(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_parts  text[] := string_to_array(p_name, '/');
  v_classe uuid;
begin
  if array_length(v_parts, 1) < 4 then return false; end if;
  if v_parts[2] <> 'classroom' then return false; end if;
  begin
    v_classe := v_parts[3]::uuid;
  exception when others then
    return false;   -- un chemin bricolé ne donne aucun droit
  end;

  -- Le fil de discussion : lisible par tous les membres actifs.
  if v_parts[4] = 'chat' then
    return public.is_classroom_member(v_classe)
        or public.is_classroom_teacher(v_classe);
  end if;

  -- Une remise de devoir : le professeur seul.
  return public.is_classroom_teacher(v_classe);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.join_classroom(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid      uuid := (select auth.uid());
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_classe public.classrooms;
  v_statut text;
  v_quota  jsonb;
  v_actifs integer;
  v_ecole  text;
  v_prof   text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Compteur horaire : usage_counters est journalier, on met donc
  -- l'heure dans le libellé plutôt que d'inventer une table.
  v_quota := public.bump_usage(
    uid,
    'join_' || to_char((now() at time zone 'utc'), 'YYYYMMDDHH24'),
    10
  );
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_tentatives');
  end if;

  select * into v_classe from public.classrooms
   where join_code = v_code and archived_at is null and is_open;

  -- Même réponse qu'un code inexistant si la classe est fermée ou
  -- archivée : sinon on apprend, code par code, lesquels existent.
  if not found then
    return jsonb_build_object('ok', false, 'error', 'code_invalide');
  end if;

  if v_classe.teacher_id = uid then
    return jsonb_build_object('ok', false, 'error', 'tu_es_le_professeur');
  end if;

  select status into v_statut from public.classroom_members
   where classroom_id = v_classe.id and user_id = uid;

  if v_statut = 'active' then
    return jsonb_build_object('ok', false, 'error', 'deja_membre');
  end if;
  if v_statut = 'pending' then
    return jsonb_build_object('ok', false, 'error', 'deja_en_attente');
  end if;
  if v_statut = 'removed' then
    -- Volontairement le même message qu'un code invalide : un élève
    -- exclu n'a pas à savoir que la classe existe encore.
    return jsonb_build_object('ok', false, 'error', 'code_invalide');
  end if;

  select count(*) into v_actifs from public.classroom_members
   where classroom_id = v_classe.id and status = 'active';
  if v_actifs >= 60 then
    return jsonb_build_object('ok', false, 'error', 'classe_complete');
  end if;

  insert into public.classroom_members (classroom_id, user_id, status)
  values (v_classe.id, uid, 'pending')
  on conflict (classroom_id, user_id) do nothing;

  select s.name into v_ecole from public.schools s where s.id = v_classe.school_id;
  -- Le nom professionnel du professeur, tel qu'il l'a déclaré en
  -- demandant le rôle. Jamais son moyen de contact.
  select coalesce(nullif(btrim(t.full_name), ''), nullif(btrim(p.name), ''), 'Professeur')
    into v_prof
    from public.profiles p
    left join public.teacher_requests t on t.user_id = p.id
   where p.id = v_classe.teacher_id;

  -- L'élève doit voir où il vient d'entrer : rejoindre une classe
  -- sans savoir chez qui, c'est précisément ce qu'on évite.
  return jsonb_build_object(
    'ok',           true,
    'classroom_id', v_classe.id,
    'name',         v_classe.name,
    'subject_id',   v_classe.subject_id,
    'grade_level',  v_classe.grade_level,
    'school',       v_ecole,
    'teacher',      v_prof,
    'status',       'pending'
  );
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

CREATE OR REPLACE FUNCTION public.my_assignments()
 RETURNS TABLE(id uuid, classroom_id uuid, classroom text, kind text, title text, instructions text, subject_id text, topic_ids text[], difficulty text, due_at timestamp with time zone, submitted_at timestamp with time zone, score_pct integer, grade integer, feedback text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    a.id, a.classroom_id, c.name, a.kind, a.title, a.instructions,
    a.subject_id, a.topic_ids, a.difficulty, a.due_at,
    s.submitted_at, s.score_pct, s.grade, s.feedback
  from public.assignments a
  join public.classrooms c on c.id = a.classroom_id
  join public.classroom_members m
    on m.classroom_id = a.classroom_id
   and m.user_id = (select auth.uid())
   and m.status = 'active'
  left join public.submissions s
    on s.assignment_id = a.id and s.user_id = (select auth.uid())
  where a.published and c.archived_at is null
  order by (s.submitted_at is not null), a.due_at nulls last, a.created_at desc
  limit 50;
$function$
;

CREATE OR REPLACE FUNCTION public.my_classrooms()
 RETURNS TABLE(id uuid, name text, subject_id text, grade_level text, school text, teacher text, is_teacher boolean, my_status text, members integer, pending integer, join_code text, is_open boolean, current_focus text, focus_note text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    c.id, c.name, c.subject_id, c.grade_level,
    s.name,
    coalesce(nullif(btrim(t.full_name), ''), nullif(btrim(pp.name), ''), 'Professeur'),
    c.teacher_id = (select auth.uid()),
    case when c.teacher_id = (select auth.uid()) then 'teacher' else m.status end,
    (select count(*)::integer from public.classroom_members x
      where x.classroom_id = c.id and x.status = 'active'),
    (select count(*)::integer from public.classroom_members x
      where x.classroom_id = c.id and x.status = 'pending'),
    -- Le code ne se montre qu'au professeur : affiché à un élève,
    -- il circulerait hors de la classe en une récréation.
    case when c.teacher_id = (select auth.uid()) then c.join_code else null end,
    c.is_open, c.current_focus,
    case when c.teacher_id = (select auth.uid()) then c.focus_note else null end
  from public.classrooms c
  join public.schools s   on s.id = c.school_id
  join public.profiles pp on pp.id = c.teacher_id
  left join public.teacher_requests t on t.user_id = c.teacher_id
  left join public.classroom_members m
         on m.classroom_id = c.id and m.user_id = (select auth.uid())
  where c.archived_at is null
    and (c.teacher_id = (select auth.uid())
         or m.status in ('active', 'pending'))
  order by c.created_at desc;
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

CREATE OR REPLACE FUNCTION public.norm_text(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select lower(
    extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))
  )
$function$
;

CREATE OR REPLACE FUNCTION public.post_classroom_message(p_classroom_id uuid, p_text text, p_attachment_path text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid     uuid := (select auth.uid());
  v_texte text := btrim(coalesce(p_text, ''));
  v_quota jsonb;
  v_id    uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_classroom_member(p_classroom_id)
     and not public.is_classroom_teacher(p_classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_membre');
  end if;

  if char_length(v_texte) = 0 then
    return jsonb_build_object('ok', false, 'error', 'message_vide');
  end if;
  if char_length(v_texte) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'message_trop_long');
  end if;

  if exists (select 1 from public.classrooms
              where id = p_classroom_id and archived_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'classe_fermee');
  end if;

  -- Trente messages par heure. Assez pour une vraie conversation,
  -- pas assez pour noyer un fil. Le compteur horaire loge dans
  -- usage_counters, qui est journalier : on met l'heure dans le
  -- libellé plutôt que d'inventer une table.
  v_quota := public.bump_usage(
    uid,
    'msg_' || to_char((now() at time zone 'utc'), 'YYYYMMDDHH24'),
    30
  );
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_messages');
  end if;

  insert into public.classroom_messages (classroom_id, user_id, text, attachment_path)
  values (p_classroom_id, uid, v_texte, p_attachment_path)
  returning classroom_messages.id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.profile_completion()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid      uuid := (select auth.uid());
  v_p      public.profiles;
  v_besoin boolean;
  v_champs jsonb := '[]'::jsonb;
  v_manque jsonb := '[]'::jsonb;
  v_total  integer := 0;
  v_faits  integer := 0;
  v_pct    integer;
  champ    record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_p from public.profiles where id = uid;
  if not found then
    raise exception 'profil introuvable';
  end if;

  select coalesce(l.needs_section, false) into v_besoin
    from public.school_levels l where l.id = v_p.level;
  v_besoin := coalesce(v_besoin, false);

  -- Un champ qui ne s'applique pas ne compte ni au numérateur ni au
  -- dénominateur : un élève de 5e AF plafonnerait sinon à 80 % pour
  -- n'avoir pas choisi une série qui n'existe pas à son niveau.
  for champ in
    select * from (values
      ('name',          true,               btrim(coalesce(v_p.name, '')) <> ''),
      ('level',         true,               btrim(coalesce(v_p.level, '')) <> ''),
      ('section',       v_besoin,           v_p.section is not null),
      ('favorites',     true,               cardinality(v_p.favorites) > 0),
      ('weak_subjects', true,               cardinality(v_p.weak_subjects) > 0),
      ('goal',          true,               btrim(coalesce(v_p.goal, '')) <> ''),
      ('exam_year',     v_p.goal = 'exams', v_p.exam_year is not null),
      ('study_minutes', true,               v_p.study_minutes is not null),
      ('school_id',     true,               v_p.school_id is not null),
      ('commune_id',    true,               v_p.commune_id is not null)
    ) as f(cle, applicable, rempli)
  loop
    if champ.applicable then
      v_total := v_total + 1;
      if champ.rempli then
        v_faits  := v_faits + 1;
        v_champs := v_champs || to_jsonb(champ.cle);
      else
        v_manque := v_manque || to_jsonb(champ.cle);
      end if;
    end if;
  end loop;

  v_pct := case when v_total = 0 then 0
                else round((v_faits::numeric / v_total) * 100) end;

  -- On garde la DATE de complétion : elle sert à savoir quand ne
  -- plus proposer l'écran. Mais plus aucune XP n'est versée.
  if v_pct = 100 and v_p.profile_completed_at is null then
    update public.profiles set profile_completed_at = now() where id = uid;
  end if;

  return jsonb_build_object(
    'pct',       v_pct,
    'done',      v_faits,
    'total',     v_total,
    'filled',    v_champs,
    'missing',   v_manque,
    'bonus',     0,
    'completed', v_p.profile_completed_at is not null or v_pct = 100
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.propose_school(p_name text, p_commune_id text, p_type text DEFAULT 'autre'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid     uuid  := (select auth.uid());
  v_name  text  := btrim(coalesce(p_name, ''));
  v_type  text  := coalesce(nullif(btrim(p_type), ''), 'autre');
  v_quota jsonb;
  v_id    uuid;
  v_neuve boolean := false;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'nom d''ecole invalide';
  end if;
  if v_type not in ('publique','privee','congreganiste','autre') then
    v_type := 'autre';
  end if;
  if not exists (select 1 from public.communes c where c.id = p_commune_id) then
    raise exception 'commune inconnue';
  end if;

  select s.id into v_id
    from public.schools s
   where s.commune_id = p_commune_id
     and public.norm_text(s.name) = public.norm_text(v_name);

  if v_id is null then
    v_quota := public.bump_usage(uid, 'school_proposal', 3);
    if not (v_quota ->> 'allowed')::boolean then
      raise exception 'trop de propositions aujourd''hui, reessaie demain';
    end if;

    insert into public.schools (name, commune_id, type, created_by, status, source)
    values (v_name, p_commune_id, v_type, uid, 'approved', 'user')
    returning schools.id into v_id;

    v_neuve := true;
  end if;

  return (
    select jsonb_build_object(
      'id', s.id, 'name', s.name, 'type', s.type, 'status', s.status,
      'commune_id', s.commune_id, 'commune', c.name,
      'departement', d.name, 'created', v_neuve
    )
    from public.schools s
    join public.communes c     on c.id = s.commune_id
    join public.departements d on d.id = c.departement_id
   where s.id = v_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.publish_assignment(p_assignment_id uuid, p_published boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(public.assignment_classroom(p_assignment_id)) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.assignments
     set published = coalesce(p_published, true), updated_at = now()
   where id = p_assignment_id;
  return jsonb_build_object('id', p_assignment_id, 'published', p_published);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_seen_questions(p_keep integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_deleted integer;
begin
  with classe as (
    select id,
           row_number() over (
             partition by user_id, subject_id order by created_at desc
           ) as rang
    from public.quiz_seen_questions
  )
  delete from public.quiz_seen_questions q
   using classe c
   where q.id = c.id and c.rang > greatest(p_keep, 20);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.quiz_history(p_limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, subject_id text, difficulty text, score_pct integer, total integer, graded_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.recent_seen_questions(p_subject_id text, p_limit integer DEFAULT 25)
 RETURNS TABLE(stem text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select left(q.question, 80)
  from public.quiz_seen_questions q
  where q.user_id = (select auth.uid())
    and q.subject_id = p_subject_id
  order by q.created_at desc
  limit least(greatest(p_limit, 1), 50);
$function$
;

CREATE OR REPLACE FUNCTION public.reject_teacher_role(p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.teacher_requests
     set status = 'rejected', reviewed_at = now(),
         reviewed_by = (select auth.uid()), review_note = p_reason,
         updated_at = now()
   where user_id = p_user_id;
  if not found then
    raise exception 'aucune demande pour cet utilisateur';
  end if;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'rejected', (select auth.uid()), p_reason);

  return jsonb_build_object('user_id', p_user_id, 'status', 'rejected');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_member(p_classroom_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;

  -- On marque « removed » plutôt que de supprimer : la ligne
  -- empêche de revenir par le code, et l'étape 8 aura besoin de
  -- savoir qu'une exclusion a eu lieu.
  update public.classroom_members
     set status = 'removed'
   where classroom_id = p_classroom_id and user_id = p_user_id;
  if not found then
    raise exception 'membre introuvable';
  end if;

  return jsonb_build_object('user_id', p_user_id, 'status', 'removed');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.request_teacher_role(p_full_name text, p_contact text, p_subjects text[] DEFAULT '{}'::text[], p_school_id uuid DEFAULT NULL::uuid, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid       uuid := (select auth.uid());
  v_nom     text := btrim(coalesce(p_full_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_actuel  public.teacher_requests;
  v_role    text;
  v_quota   jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_nom) < 3 then
    raise exception 'nom complet requis';
  end if;
  if char_length(v_contact) < 5 then
    raise exception 'moyen de verification requis';
  end if;
  if coalesce(cardinality(p_subjects), 0) = 0 then
    raise exception 'au moins une matiere';
  end if;

  select role into v_role from public.profiles where id = uid;
  if v_role = 'prof' then
    raise exception 'deja professeur';
  end if;

  select * into v_actuel from public.teacher_requests where user_id = uid;

  -- Une demande déjà acceptée ne se rejoue pas. Une demande
  -- refusée, si : un professeur dont le premier justificatif était
  -- illisible doit pouvoir en donner un autre.
  if found and v_actuel.status = 'approved' then
    raise exception 'demande deja acceptee';
  end if;

  -- Trois envois par jour. Le but n'est pas de brider un vrai
  -- professeur — il n'en fait qu'un — mais d'empêcher qu'on
  -- inonde la file d'attente que je dépouille à la main.
  v_quota := public.bump_usage(uid, 'teacher_request', 3);
  if not (v_quota ->> 'allowed')::boolean then
    raise exception 'trop de demandes aujourd''hui, reessaie demain';
  end if;

  insert into public.teacher_requests
    (user_id, school_id, full_name, subjects, contact, message, status, updated_at)
  values
    (uid, p_school_id, v_nom, p_subjects, v_contact, nullif(btrim(coalesce(p_message, '')), ''),
     'pending', now())
  on conflict (user_id) do update
    set school_id   = excluded.school_id,
        full_name   = excluded.full_name,
        subjects    = excluded.subjects,
        contact     = excluded.contact,
        message     = excluded.message,
        status      = 'pending',
        reviewed_by = null,
        reviewed_at = null,
        review_note = null,
        updated_at  = now();

  return jsonb_build_object('status', 'pending');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_progress()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.revoke_teacher_role(p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_classes integer;
begin
  update public.profiles set role = 'eleve', updated_at = now()
   where id = p_user_id and role = 'prof';
  if not found then
    raise exception 'cet utilisateur n''est pas professeur';
  end if;

  update public.classrooms
     set archived_at = now(), is_open = false
   where teacher_id = p_user_id and archived_at is null;
  get diagnostics v_classes = row_count;

  update public.teacher_requests
     set status = 'rejected', reviewed_at = now(),
         reviewed_by = (select auth.uid()),
         review_note = coalesce(p_reason, 'role retire'),
         updated_at = now()
   where user_id = p_user_id;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'revoked', (select auth.uid()), p_reason);

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', 'eleve',
    'classes_archivees', v_classes
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rotate_join_code(p_classroom_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_code text;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  v_code := public.generate_join_code();
  update public.classrooms set join_code = v_code where id = p_classroom_id;
  return jsonb_build_object('join_code', v_code);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.save_assignment(p_classroom_id uuid, p_kind text, p_title text, p_instructions text DEFAULT NULL::text, p_topic_ids text[] DEFAULT '{}'::text[], p_difficulty text DEFAULT NULL::text, p_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid     uuid := (select auth.uid());
  v_sujet text;
  v_id    uuid;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  if p_kind not in ('devoir', 'quiz') then
    raise exception 'type de devoir inconnu';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'titre trop court';
  end if;

  -- La matière vient de la classe, jamais du formulaire : un devoir
  -- de physique dans la classe de maths fausserait le tableau de
  -- bord, qui agrège par matière.
  select subject_id into v_sujet from public.classrooms where id = p_classroom_id;

  if p_id is null then
    insert into public.assignments
      (classroom_id, kind, title, instructions, subject_id, topic_ids, difficulty, due_at, created_by)
    values
      (p_classroom_id, p_kind, btrim(p_title),
       nullif(btrim(coalesce(p_instructions, '')), ''), v_sujet,
       coalesce(p_topic_ids, '{}'), p_difficulty, p_due_at, uid)
    returning assignments.id into v_id;
  else
    update public.assignments
       set kind = p_kind, title = btrim(p_title),
           instructions = nullif(btrim(coalesce(p_instructions, '')), ''),
           topic_ids = coalesce(p_topic_ids, '{}'),
           difficulty = p_difficulty, due_at = p_due_at, updated_at = now()
     where id = p_id and classroom_id = p_classroom_id
    returning assignments.id into v_id;
    if v_id is null then raise exception 'devoir introuvable'; end if;
  end if;

  return jsonb_build_object('id', v_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.school_acronym(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(string_agg(left(mot, 1), '' order by n), '')
  from unnest(
         string_to_array(
           btrim(regexp_replace(public.norm_text(p_name), '[^a-z0-9]+', ' ', 'g')),
           ' '
         )
       ) with ordinality as t(mot, n)
  where length(mot) >= 2
    and mot not in ('de','du','des','la','le','les','et','au','aux','en',
                    'of','the','sur','sous','pour','par','ak','nan')
$function$
;

CREATE OR REPLACE FUNCTION public.schools_index_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.name_norm := public.norm_text(new.name);
  new.acronym   := public.school_acronym(new.name);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_schools(p_query text DEFAULT NULL::text, p_commune_id text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, type text, status text, commune_id text, commune text, departement text, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with q as (
    select nullif(btrim(public.norm_text(p_query)), '') as texte
  ),
  trouvees as (
    select s.id, s.name, s.type, s.status, s.commune_id, s.name_norm,
      case
        when (select texte from q) is null                      then 3
        when s.name_norm like (select texte from q) || '%'      then 0
        when s.acronym = (select texte from q)                  then 1
        else 2
      end as rang
    from public.schools s
    where (s.status = 'approved' or s.created_by = (select auth.uid()))
      and (p_commune_id is null or s.commune_id = p_commune_id)
      and (
        (select texte from q) is null
        or s.acronym = (select texte from q)
        or case
             when length((select texte from q)) < 5
               -- \m = début de mot : « ica » ne matche plus « africa ».
               then s.name_norm ~ ('\m' || (select texte from q))
             else s.name_norm like '%' || (select texte from q) || '%'
           end
      )
  )
  select
    t.id, t.name, t.type, t.status, t.commune_id,
    c.name, d.name,
    count(*) over ()
  from trouvees t
  join public.communes c     on c.id = t.commune_id
  join public.departements d on d.id = c.departement_id
  order by t.rang, t.name
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$function$
;

CREATE OR REPLACE FUNCTION public.seen_topics(p_subject_id text)
 RETURNS TABLE(topic text, nb integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(q.topic, 'general'), count(*)::integer
  from public.quiz_seen_questions q
  where q.user_id = (select auth.uid())
    and q.subject_id = p_subject_id
  group by 1
  order by 2 desc
  limit 40;
$function$
;

CREATE OR REPLACE FUNCTION public.set_classroom_focus(p_classroom_id uuid, p_focus text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;

  update public.classrooms
     set current_focus = nullif(btrim(coalesce(p_focus, '')), ''),
         focus_note    = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_classroom_id;

  return jsonb_build_object('classroom_id', p_classroom_id, 'focus', p_focus);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_classroom_open(p_classroom_id uuid, p_open boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.classrooms set is_open = coalesce(p_open, true) where id = p_classroom_id;
  return jsonb_build_object('is_open', p_open);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.skip_duplicate_seen_question()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from public.quiz_seen_questions q
    where q.user_id = new.user_id
      and q.subject_id = new.subject_id
      and q.qhash = md5(lower(btrim(regexp_replace(new.question, '\s+', ' ', 'g'))))
  ) then
    return null;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.study_topic(p_subject_id text, p_topic_id text)
 RETURNS progress
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- ne s'obtiennent qu'en répondant à des questions. C'est cette
    -- table qui nourrira le tableau de bord du prof : elle doit
    -- dire la vérité.
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
$function$
;

CREATE OR REPLACE FUNCTION public.submit_assignment(p_assignment_id uuid, p_text text DEFAULT NULL::text, p_attachment_path text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid      uuid := (select auth.uid());
  v_classe uuid := public.assignment_classroom(p_assignment_id);
  v_kind   text;
  v_publie boolean;
  v_id     uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if v_classe is null or not public.is_classroom_member(v_classe) then
    raise exception 'tu n''es pas dans cette classe';
  end if;

  select kind, published into v_kind, v_publie
    from public.assignments where id = p_assignment_id;
  if not v_publie then raise exception 'devoir introuvable'; end if;
  if v_kind = 'quiz' then
    raise exception 'ce devoir se rend en jouant le quiz';
  end if;
  if coalesce(btrim(p_text), '') = '' and coalesce(p_attachment_path, '') = '' then
    raise exception 'remise vide';
  end if;

  -- Une remise en retard reste acceptée : l'échéance sert au
  -- professeur, elle ne ferme pas la porte à l'élève.
  insert into public.submissions (assignment_id, user_id, text, attachment_path)
  values (p_assignment_id, uid, nullif(btrim(coalesce(p_text, '')), ''), p_attachment_path)
  on conflict (assignment_id, user_id) do update
    set text = excluded.text,
        attachment_path = coalesce(excluded.attachment_path, public.submissions.attachment_path),
        submitted_at = now()
  returning submissions.id into v_id;

  return jsonb_build_object('id', v_id, 'submitted', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_requests_to_review(p_status text DEFAULT 'pending'::text)
 RETURNS TABLE(user_id uuid, demande_le timestamp with time zone, nom_declare text, contact text, matieres text[], ecole text, commune text, message text, compte_cree timestamp with time zone, quiz_faits integer, xp integer, statut text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    r.user_id, r.created_at, r.full_name, r.contact, r.subjects,
    s.name, c.name, r.message,
    p.created_at, coalesce(pr.quizzes_done, 0), coalesce(pr.xp, 0), r.status
  from public.teacher_requests r
  join public.profiles p        on p.id = r.user_id
  left join public.progress pr  on pr.user_id = r.user_id
  left join public.schools s    on s.id = r.school_id
  left join public.communes c   on c.id = s.commune_id
  where p_status is null or r.status = p_status
  order by r.created_at;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_activity()
 RETURNS progress
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.touch_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.conversation_id is not null then
    update public.conversations
       set updated_at = greatest(updated_at, new.created_at)
     where id = new.conversation_id;
  end if;
  return new;
end;
$function$
;

-- ── Row Level Security ───────────────────────────────────────

alter table public.assignments enable row level security;
alter table public.chat_messages enable row level security;
alter table public.classroom_members enable row level security;
alter table public.classroom_messages enable row level security;
alter table public.classrooms enable row level security;
alter table public.communes enable row level security;
alter table public.conversations enable row level security;
alter table public.daily_activity enable row level security;
alter table public.departements enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_seen_questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.role_events enable row level security;
alter table public.schema_migrations enable row level security;
alter table public.school_levels enable row level security;
alter table public.school_sections enable row level security;
alter table public.schools enable row level security;
alter table public.submissions enable row level security;
alter table public.teacher_requests enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.topics enable row level security;
alter table public.usage_counters enable row level security;

create policy "assignments_select" on public.assignments
  as permissive
  for select
  to authenticated
  using ((is_classroom_teacher(classroom_id) OR (published AND is_classroom_member(classroom_id))));

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

create policy "classroom_members_select" on public.classroom_members
  as permissive
  for select
  to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) OR is_classroom_teacher(classroom_id) OR ((status = 'active'::text) AND is_classroom_member(classroom_id))));

create policy "classroom_messages_select" on public.classroom_messages
  as permissive
  for select
  to authenticated
  using (((deleted_at IS NULL) AND is_classroom_member(classroom_id) AND ((NOT flagged) OR is_classroom_teacher(classroom_id))));

create policy "classrooms_select" on public.classrooms
  as permissive
  for select
  to authenticated
  using (((teacher_id = ( SELECT auth.uid() AS uid)) OR is_classroom_member(id)));

create policy "communes_select" on public.communes
  as permissive
  for select
  to authenticated
  using (true);

create policy "conversations_delete_own" on public.conversations
  as permissive
  for delete
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "conversations_insert_own" on public.conversations
  as permissive
  for insert
  to authenticated
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "conversations_select_own" on public.conversations
  as permissive
  for select
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "conversations_update_own" on public.conversations
  as permissive
  for update
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "daily_activity_select_own" on public.daily_activity
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "departements_select" on public.departements
  as permissive
  for select
  to authenticated
  using (true);

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

create policy "progress_select_own" on public.progress
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

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

create policy "quiz_sessions_select_graded_own" on public.quiz_sessions
  as permissive
  for select
  to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) AND (graded_at IS NOT NULL)));

create policy "school_levels_select" on public.school_levels
  as permissive
  for select
  to authenticated
  using (true);

create policy "school_sections_select" on public.school_sections
  as permissive
  for select
  to authenticated
  using (true);

create policy "schools_select" on public.schools
  as permissive
  for select
  to authenticated
  using (((status = 'approved'::text) OR (created_by = ( SELECT auth.uid() AS uid))));

create policy "submissions_select" on public.submissions
  as permissive
  for select
  to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) OR is_classroom_teacher(assignment_classroom(assignment_id))));

create policy "teacher_requests_select_own" on public.teacher_requests
  as permissive
  for select
  to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "topic_mastery_select_own" on public.topic_mastery
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "topics_select" on public.topics
  as permissive
  for select
  to authenticated
  using (true);

create policy "usage_counters_select_own" on public.usage_counters
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

-- ── Triggers ─────────────────────────────────────────────────

CREATE TRIGGER chat_messages_touch_conversation AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION touch_conversation();
CREATE TRIGGER profiles_guard_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_role();
CREATE TRIGGER quiz_seen_skip_duplicates BEFORE INSERT ON public.quiz_seen_questions FOR EACH ROW EXECUTE FUNCTION skip_duplicate_seen_question();
CREATE TRIGGER schools_index_name_trg BEFORE INSERT OR UPDATE OF name ON public.schools FOR EACH ROW EXECUTE FUNCTION schools_index_name();
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

create policy "attachments_teacher_reads_submissions" on storage.objects
  for select
  using (((bucket_id = 'attachments'::text) AND is_teacher_of_attachment(name)));

create policy "attachments_update_own_folder" on storage.objects
  for update
  using (((bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
