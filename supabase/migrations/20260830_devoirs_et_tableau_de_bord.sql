-- ═══════════════════════════════════════════════════════════════
--  DEVOIRS, QUIZ ASSIGNÉS, TABLEAU DE BORD DU PROFESSEUR
--
--  Appliqué le 30 août 2026, en quatre migrations Supabase, dont le
--  SQL exact est recopié ci-dessous.
--
--  ═══════════════════════════════════════════════════════════════
--  LA DÉCOUVERTE QUI A CHANGÉ CETTE ÉTAPE
--  ═══════════════════════════════════════════════════════════════
--
--  Le plan demande un tableau de bord « maîtrise moyenne de la
--  classe par notion, issue de topic_mastery ». En le préparant, on
--  a regardé ce que cette table contient vraiment :
--
--    73 notions distinctes pour 78 lignes, en anglais.
--
--    conditionnel · conditionnel-type-1 · conditionnel-type-2
--    conditionnel-type-3-passif · conditionnel-zero · conditionnel-mixte
--    conjonctions-de-condition · comparatifs · comparatif-des-adjectifs
--    discours-indirect · discours-indirect-avance · discours-indirect-imperatif
--
--  `topic_mastery.topic_id` était du TEXTE LIBRE, inventé par le
--  modèle à chaque quiz. C'est la même fragmentation que les noms
--  d'écoles, mais fabriquée à chaque partie. Un tableau de bord bâti
--  là-dessus aurait affiché une ligne par élève et par quiz :
--  illisible, et faux.
--
--  Or le programme existe, avec des identifiants stables, dans
--  src/data/curriculum.ts. Il n'était simplement jamais donné à
--  l'IA. On l'a donc porté côté serveur (`public.topics`), injecté
--  dans le prompt de génération, ET revalidé au retour — parce
--  qu'une consigne, même claire, ne suffit pas avec un modèle.
--
--  Vérifié après coup : les six questions d'un quiz de maths
--  reviennent étiquetées second-degre, fonctions, suites,
--  trigonometrie, derivees, probabilites. Toutes au programme.
--
--  Sans cette correction, l'étape 6 aurait livré un tableau de bord
--  qui a l'air de marcher et ne dit rien.
--
--  ═══════════════════════════════════════════════════════════════
--  LES DÉCISIONS
--  ═══════════════════════════════════════════════════════════════
--
--  · LES PIÈCES JOINTES gardent l'identifiant de l'élève en PREMIER
--    segment : {eleve}/classroom/{classe}/{devoir}/{fichier}, et non
--    classroom/... comme le proposait le plan. Les quatre policies
--    Storage existantes reposent toutes sur « le premier dossier
--    porte ton identifiant » ; les réécrire aurait touché le chemin
--    des pièces jointes du tuteur, qui fonctionne. On n'AJOUTE donc
--    qu'un droit de lecture pour le professeur de la classe.
--
--  · LA PREMIÈRE SESSION TERMINÉE FAIT FOI sur un devoir-quiz
--    (`on conflict do nothing`). Sans cette règle, un élève
--    rejouerait jusqu'à tomber sur un bon score, et la note ne
--    voudrait plus rien dire. La fonction Edge refuse d'ailleurs de
--    générer une seconde session pour un devoir déjà rendu.
--
--  · `grade_quiz` est modifiée de façon STRICTEMENT ADDITIVE. Le
--    calcul des XP, l'anti-rejeu et l'appel à apply_quiz_results ne
--    bougent pas d'une ligne : on ajoute, tout à la fin,
--    l'enregistrement de la remise. Les XP suivent le barème
--    habituel — pas de bonus « devoir », comme demandé.
--
--  · LE TABLEAU DE BORD ne montre que la matière DE LA CLASSE. Un
--    professeur de maths n'a pas à voir où en est son élève en
--    créole. Et il ne demande aucune saisie : tout vient de
--    topic_mastery, qui se remplit toute seule. C'est mesuré, pas
--    déclaré — c'est ce qui le rend utile.
--
--  · LA MATIÈRE D'UN DEVOIR vient de la classe, jamais du
--    formulaire : un devoir de physique dans la classe de maths
--    fausserait l'agrégation.
--
--  · UN DEVOIR DÉJÀ RENDU ne se supprime pas. Le travail d'un élève
--    ne disparaît pas parce que le professeur change d'avis.
--
--  Le référentiel des notions est alimenté par
--  scripts/dump_curriculum.mjs, qui écrit aussi
--  supabase/functions/tutor/topics.json pour la fonction Edge.
-- ═══════════════════════════════════════════════════════════════

-- ═══ curriculum_topics_referential ═══

-- ═══════════════════════════════════════════════════════════════
--  LES NOTIONS DU PROGRAMME
--
--  Découverte en préparant le tableau de bord du professeur :
--  `topic_mastery.topic_id` contient du TEXTE LIBRE inventé par
--  l'IA à chaque quiz. 73 notions distinctes pour 78 lignes en
--  anglais, avec « conditionnel », « conditionnel-type-1 »,
--  « conditionnel-type-2 », « conditionnel-zero » et
--  « conjonctions-de-condition » comptées séparément.
--
--  C'est la même fragmentation que les noms d'écoles, mais
--  fabriquée à chaque quiz. Un tableau de bord « maîtrise moyenne
--  de la classe par notion » bâti là-dessus afficherait une ligne
--  par élève et par quiz : illisible, et faux.
--
--  Or le programme existe déjà, avec des identifiants stables, dans
--  src/data/curriculum.ts. Il n'était simplement jamais donné à
--  l'IA. Cette table le porte côté serveur, pour deux usages que le
--  client ne peut pas assurer : contraindre la génération de quiz,
--  et agréger la maîtrise d'une classe.
--
--  Alimentée par scripts/dump_curriculum.mjs — le programme reste
--  écrit et relu dans l'application, en français et en créole.
-- ═══════════════════════════════════════════════════════════════

create table public.topics (
  subject_id text not null,
  band       text not null check (band in ('primaire', 'college', 'lycee')),
  topic_id   text not null,
  label_fr   text not null,
  label_ht   text not null,
  rank       integer not null,
  primary key (subject_id, band, topic_id)
);

create index topics_subject_idx on public.topics (subject_id, band, rank);

alter table public.topics enable row level security;

create policy topics_select on public.topics
  for select to authenticated using (true);

revoke insert, update, delete, truncate, references
  on public.topics from anon, authenticated;;


-- ═══ assignments_and_submissions ═══

-- ═══════════════════════════════════════════════════════════════
--  DEVOIRS ET REMISES
-- ═══════════════════════════════════════════════════════════════

create table public.assignments (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  kind         text not null check (kind in ('devoir', 'quiz')),
  title        text not null check (char_length(btrim(title)) between 2 and 120),
  instructions text check (instructions is null or char_length(instructions) <= 2000),
  subject_id   text not null,
  topic_ids    text[] not null default '{}' check (cardinality(topic_ids) <= 8),
  -- Pour kind = 'quiz' : les paramètres de génération. Chaque élève
  -- reçoit SA session, générée sur ces paramètres — pas le même
  -- questionnaire recopié, ce qui rendrait la triche triviale.
  difficulty   text check (difficulty is null or difficulty in ('facile', 'moyen', 'difficile')),
  due_at       timestamptz,
  published    boolean not null default false,
  created_by   uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index assignments_classroom_idx on public.assignments (classroom_id, published, due_at);

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  text            text check (text is null or char_length(text) <= 5000),
  attachment_path text,
  -- Pour un devoir de type quiz : la session de l'élève et son
  -- score, renseignés par grade_quiz. Le professeur voit le score,
  -- jamais le détail des réponses ligne par ligne.
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  score_pct       integer check (score_pct is null or score_pct between 0 and 100),
  submitted_at    timestamptz not null default now(),
  grade           integer check (grade is null or grade between 0 and 100),
  feedback        text check (feedback is null or char_length(feedback) <= 2000),
  graded_by       uuid references auth.users on delete set null,
  graded_at       timestamptz,
  unique (assignment_id, user_id)
);

create index submissions_assignment_idx on public.submissions (assignment_id);
create index submissions_user_idx       on public.submissions (user_id);

-- Le devoir appartient à une classe : c'est par elle que passent
-- tous les droits. Fonction DEFINER, comme les deux autres, pour ne
-- pas déclencher de RLS en cascade.
create function public.assignment_classroom(p_assignment_id uuid)
returns uuid
language sql
security definer
stable
set search_path to ''
as $$
  select a.classroom_id from public.assignments a where a.id = p_assignment_id;
$$;

revoke execute on function public.assignment_classroom(uuid) from public, anon;
grant  execute on function public.assignment_classroom(uuid) to authenticated;


alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- L'élève voit les devoirs PUBLIÉS des classes où il est actif.
-- Un brouillon reste invisible : un professeur doit pouvoir
-- préparer son devoir sans que la classe le voie se construire.
create policy assignments_select on public.assignments
  for select to authenticated
  using (
    public.is_classroom_teacher(classroom_id)
    or (published and public.is_classroom_member(classroom_id))
  );

-- L'élève voit sa remise, et elle seule. Le professeur voit toutes
-- celles de ses classes.
create policy submissions_select on public.submissions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_classroom_teacher(public.assignment_classroom(assignment_id))
  );

revoke insert, update, delete, truncate, references on public.assignments from anon, authenticated;
revoke insert, update, delete, truncate, references on public.submissions from anon, authenticated;


-- ── Les pièces jointes ────────────────────────────────────────
--
-- Le plan proposait le chemin
--   classroom/{classe}/{devoir}/{eleve}/{fichier}
-- On garde plutôt l'identifiant de l'élève en PREMIER segment :
--   {eleve}/classroom/{classe}/{devoir}/{fichier}
--
-- Raison : les quatre policies Storage existantes reposent toutes
-- sur « le premier dossier porte ton identifiant ». Les réécrire
-- pour introduire un préfixe littéral aurait touché le chemin des
-- pièces jointes du tuteur, qui fonctionne. Ici on n'AJOUTE qu'un
-- droit de lecture pour le professeur.
create function public.is_teacher_of_attachment(p_name text)
returns boolean
language plpgsql
security definer
stable
set search_path to ''
as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_classe uuid;
begin
  -- {eleve}/classroom/{classe}/{devoir}/{fichier}
  if array_length(v_parts, 1) < 4 then return false; end if;
  if v_parts[2] <> 'classroom' then return false; end if;
  begin
    v_classe := v_parts[3]::uuid;
  exception when others then
    return false;   -- un chemin bricolé ne donne aucun droit
  end;
  return public.is_classroom_teacher(v_classe);
end;
$$;

revoke execute on function public.is_teacher_of_attachment(text) from public, anon;
grant  execute on function public.is_teacher_of_attachment(text) to authenticated;

create policy attachments_teacher_reads_submissions on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_teacher_of_attachment(name)
  );;


-- ═══ assignment_rpcs_and_teacher_dashboard ═══

-- ═══════════════════════════════════════════════════════════════
--  DEVOIRS : LES OPÉRATIONS
-- ═══════════════════════════════════════════════════════════════

create function public.save_assignment(
  p_classroom_id uuid,
  p_kind         text,
  p_title        text,
  p_instructions text        default null,
  p_topic_ids    text[]      default '{}',
  p_difficulty   text        default null,
  p_due_at       timestamptz default null,
  p_id           uuid        default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

create function public.publish_assignment(p_assignment_id uuid, p_published boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_classroom_teacher(public.assignment_classroom(p_assignment_id)) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.assignments
     set published = coalesce(p_published, true), updated_at = now()
   where id = p_assignment_id;
  return jsonb_build_object('id', p_assignment_id, 'published', p_published);
end;
$$;

create function public.delete_assignment(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;


-- ── L'élève rend son devoir ───────────────────────────────────
create function public.submit_assignment(
  p_assignment_id   uuid,
  p_text            text default null,
  p_attachment_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

create function public.grade_submission(
  p_submission_id uuid,
  p_grade         integer,
  p_feedback      text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;


-- ── Ce que chacun consulte ────────────────────────────────────

-- L'élève : ses devoirs à rendre, toutes classes confondues.
create function public.my_assignments()
returns table (
  id            uuid,
  classroom_id  uuid,
  classroom     text,
  kind          text,
  title         text,
  instructions  text,
  subject_id    text,
  topic_ids     text[],
  difficulty    text,
  due_at        timestamptz,
  submitted_at  timestamptz,
  score_pct     integer,
  grade         integer,
  feedback      text
)
language sql
security definer
stable
set search_path to ''
as $$
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
$$;

-- Le professeur : ses devoirs, avec l'avancement.
create function public.classroom_assignments(p_classroom_id uuid)
returns table (
  id          uuid,
  kind        text,
  title       text,
  topic_ids   text[],
  difficulty  text,
  due_at      timestamptz,
  published   boolean,
  rendus      integer,
  a_corriger  integer,
  moyenne     integer
)
language sql
security definer
stable
set search_path to ''
as $$
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
$$;

-- Le professeur : qui a rendu quoi. Les vrais noms, puisqu'il les
-- connaît déjà — ce sont ses élèves.
create function public.assignment_submissions(p_assignment_id uuid)
returns table (
  user_id      uuid,
  affiche      text,
  vrai_nom     text,
  submission_id uuid,
  submitted_at timestamptz,
  text         text,
  attachment_path text,
  score_pct    integer,
  grade        integer,
  feedback     text
)
language sql
security definer
stable
set search_path to ''
as $$
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
$$;


-- ═══════════════════════════════════════════════════════════════
--  LE TABLEAU DE BORD DU PROFESSEUR
--
--  « C'est la fonctionnalité qui donne envie à un prof d'utiliser
--  EDEM, bien plus que la messagerie. »
--
--  Il ne demande AUCUNE saisie supplémentaire : tout vient de
--  `topic_mastery`, qui se remplit toute seule au fil des quiz.
--  C'est de la donnée mesurée, pas déclarée.
--
--  Deux limites posées volontairement :
--
--  · uniquement la matière DE LA CLASSE. Le professeur de maths
--    n'a pas à voir où en est son élève en créole.
--  · uniquement les notions du programme, pour le cycle de la
--    classe. Sans ça, on afficherait le texte libre que l'IA
--    produisait avant — 73 lignes d'un élève chacune.
-- ═══════════════════════════════════════════════════════════════
create function public.classroom_dashboard(p_classroom_id uuid)
returns table (
  topic_id       text,
  label_fr       text,
  label_ht       text,
  eleves_mesures integer,
  maitrise       integer,
  en_difficulte  integer,
  noms           text[]
)
language sql
security definer
stable
set search_path to ''
as $$
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
$$;

-- Le résumé d'une classe, en une ligne.
create function public.classroom_summary(p_classroom_id uuid)
returns jsonb
language sql
security definer
stable
set search_path to ''
as $$
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
$$;


-- ── Droits ────────────────────────────────────────────────────
revoke execute on function public.save_assignment(uuid, text, text, text, text[], text, timestamptz, uuid) from public, anon;
revoke execute on function public.publish_assignment(uuid, boolean)          from public, anon;
revoke execute on function public.delete_assignment(uuid)                    from public, anon;
revoke execute on function public.submit_assignment(uuid, text, text)        from public, anon;
revoke execute on function public.grade_submission(uuid, integer, text)      from public, anon;
revoke execute on function public.my_assignments()                           from public, anon;
revoke execute on function public.classroom_assignments(uuid)                from public, anon;
revoke execute on function public.assignment_submissions(uuid)               from public, anon;
revoke execute on function public.classroom_dashboard(uuid)                  from public, anon;
revoke execute on function public.classroom_summary(uuid)                    from public, anon;

grant execute on function public.save_assignment(uuid, text, text, text, text[], text, timestamptz, uuid) to authenticated;
grant execute on function public.publish_assignment(uuid, boolean)      to authenticated;
grant execute on function public.delete_assignment(uuid)                to authenticated;
grant execute on function public.submit_assignment(uuid, text, text)    to authenticated;
grant execute on function public.grade_submission(uuid, integer, text)  to authenticated;
grant execute on function public.my_assignments()                       to authenticated;
grant execute on function public.classroom_assignments(uuid)            to authenticated;
grant execute on function public.assignment_submissions(uuid)           to authenticated;
grant execute on function public.classroom_dashboard(uuid)              to authenticated;
grant execute on function public.classroom_summary(uuid)                to authenticated;;


-- ═══ assigned_quizzes_record_submissions ═══

-- ═══════════════════════════════════════════════════════════════
--  LES QUIZ ASSIGNÉS
--
--  Le moteur existant est réutilisé tel quel : le professeur
--  choisit matière, notions et difficulté, et CHAQUE élève reçoit
--  sa propre session générée sur ces paramètres. Pas le même
--  questionnaire recopié — ce qui rendrait la triche triviale.
--
--  Modification de `grade_quiz` : STRICTEMENT ADDITIVE. Le calcul
--  des XP, l'anti-rejeu et l'appel à apply_quiz_results ne bougent
--  pas d'une ligne. On ajoute, tout à la fin, l'enregistrement de
--  la remise quand la session appartient à un devoir. Les XP
--  suivent le barème habituel : pas de bonus « devoir ».
-- ═══════════════════════════════════════════════════════════════

alter table public.quiz_sessions
  add column assignment_id uuid references public.assignments(id) on delete set null;

create index quiz_sessions_assignment_idx on public.quiz_sessions (assignment_id)
  where assignment_id is not null;

create or replace function public.grade_quiz(p_session_id uuid, p_picked jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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
$function$;

revoke execute on function public.grade_quiz(uuid, jsonb) from public, anon;
grant  execute on function public.grade_quiz(uuid, jsonb) to authenticated;


-- ── Le devoir-quiz est-il jouable par cet élève ? ─────────────
--
-- Appelée par la fonction Edge avant de générer la session : elle
-- rend les paramètres du devoir, ou rien du tout. C'est le serveur
-- qui décide, pas le client.
create function public.assignment_quiz_params(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

revoke execute on function public.assignment_quiz_params(uuid) from public, anon;
grant  execute on function public.assignment_quiz_params(uuid) to authenticated, service_role;;
