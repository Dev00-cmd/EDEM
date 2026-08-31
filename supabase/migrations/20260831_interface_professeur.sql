-- ═══════════════════════════════════════════════════════════════
--  L'INTERFACE PROFESSEUR
--
--  Appliqué le 31 août 2026 — migration `teacher_overview_across_classes`.
--
--  ── Un compte, deux interfaces ────────────────────────────────
--
--  L'idée de départ était deux comptes séparés, un pour les profs
--  et un pour les élèves. On ne l'a pas retenue, pour trois raisons
--  qui valent d'être écrites ici :
--
--  1. Ça n'aurait rien protégé de plus. Le rôle vit dans
--     `profiles.role`, garanti par un trigger, et quarante-quatre
--     vérifications `is_classroom_teacher` gardent les données.
--     Deux écrans de connexion devant la même table `auth.users`
--     sont un décor : la sécurité est ailleurs, et elle est déjà là.
--
--  2. Beaucoup de professeurs sont aussi des élèves — en formation,
--     ou simplement pour demander au tuteur de préparer une
--     explication. Le choix d'origine était explicite : un compte
--     prof RESTE un compte élève, le rôle ajoute des droits.
--
--  3. Deux mots de passe dans un pays où l'accès e-mail est peu
--     fiable — c'est déjà la raison pour laquelle l'inscription ne
--     demande aucune vérification par courriel.
--
--  Donc : même compte, même connexion, et l'application choisit ce
--  qu'elle affiche selon `profiles.role`.
--
--  ── Pourquoi ces deux fonctions ───────────────────────────────
--
--  Tout existait déjà PAR CLASSE : `classroom_summary`,
--  `classroom_dashboard`, `classroom_assignments`. L'interface
--  professeur, elle, regarde TOUTES ses classes d'un coup.
--
--  Boucler côté client aurait fait dix appels pour dix classes, sur
--  un forfait payé à l'unité. Une requête suffit, et c'est le
--  serveur qui trie — par ce qui appelle une action, pas par ordre
--  alphabétique. Un tableau de bord qui n'appelle aucune action
--  n'est qu'un affichage.
--
--  `maitrise` vaut NULL et non zéro tant qu'aucun quiz n'a été
--  passé : afficher « 0 % de maîtrise » à une classe qui vient
--  d'ouvrir serait un mensonge sur ses élèves.
-- ═══════════════════════════════════════════════════════════════

-- ═══ teacher_overview_across_classes ═══

create function public.teacher_overview()
returns table (
  classroom_id  uuid,
  name          text,
  subject_id    text,
  grade_level   text,
  school        text,
  join_code     text,
  membres       integer,
  en_attente    integer,
  a_corriger    integer,
  devoirs       integer,
  current_focus text,
  maitrise      integer,
  en_difficulte integer,
  inactifs_7j   integer
)
language sql security definer stable set search_path to ''
as $$
  select
    c.id, c.name, c.subject_id, c.grade_level, s.name, c.join_code,
    (select count(*)::integer from public.classroom_members m
      where m.classroom_id = c.id and m.status = 'active'),
    (select count(*)::integer from public.classroom_members m
      where m.classroom_id = c.id and m.status = 'pending'),
    (select count(*)::integer from public.submissions su
       join public.assignments a on a.id = su.assignment_id
      where a.classroom_id = c.id and a.kind = 'devoir' and su.graded_at is null),
    (select count(*)::integer from public.assignments a
      where a.classroom_id = c.id and a.published),
    c.current_focus,
    (select round(avg(tm.mastery))::integer
       from public.topic_mastery tm
       join public.classroom_members m
         on m.user_id = tm.user_id and m.classroom_id = c.id and m.status = 'active'
      where tm.subject_id = c.subject_id),
    (select count(distinct tm.user_id)::integer
       from public.topic_mastery tm
       join public.classroom_members m
         on m.user_id = tm.user_id and m.classroom_id = c.id and m.status = 'active'
      where tm.subject_id = c.subject_id and tm.mastery < 40),
    (select count(*)::integer
       from public.classroom_members m
       left join public.progress pr on pr.user_id = m.user_id
      where m.classroom_id = c.id and m.status = 'active'
        and (pr.last_active is null or pr.last_active < current_date - 7))
  from public.classrooms c
  join public.schools s on s.id = c.school_id
  where c.teacher_id = (select auth.uid())
    and c.archived_at is null
  order by 8 desc, 9 desc, c.created_at desc;
$$;

revoke execute on function public.teacher_overview() from public, anon;
grant  execute on function public.teacher_overview() to authenticated;


-- Les devoirs de toutes ses classes, rangés par ce qui presse : ce
-- qui attend une correction d'abord, puis l'échéance. Un professeur
-- n'ouvre pas cet écran pour lire une liste, il l'ouvre pour savoir
-- quoi faire maintenant.
create function public.teacher_assignments()
returns table (
  id           uuid,
  classroom_id uuid,
  classroom    text,
  subject_id   text,
  kind         text,
  title        text,
  due_at       timestamptz,
  published    boolean,
  membres      integer,
  rendus       integer,
  a_corriger   integer,
  moyenne      integer
)
language sql security definer stable set search_path to ''
as $$
  select
    a.id, a.classroom_id, c.name, a.subject_id, a.kind, a.title,
    a.due_at, a.published,
    (select count(*)::integer from public.classroom_members m
      where m.classroom_id = c.id and m.status = 'active'),
    (select count(*)::integer from public.submissions s where s.assignment_id = a.id),
    (select count(*)::integer from public.submissions s
      where s.assignment_id = a.id and s.graded_at is null and a.kind = 'devoir'),
    (select round(avg(coalesce(s.grade, s.score_pct)))::integer
       from public.submissions s
      where s.assignment_id = a.id and coalesce(s.grade, s.score_pct) is not null)
  from public.assignments a
  join public.classrooms c on c.id = a.classroom_id
  where c.teacher_id = (select auth.uid())
    and c.archived_at is null
  order by 11 desc, a.due_at nulls last, a.created_at desc
  limit 100;
$$;

revoke execute on function public.teacher_assignments() from public, anon;
grant  execute on function public.teacher_assignments() to authenticated;
