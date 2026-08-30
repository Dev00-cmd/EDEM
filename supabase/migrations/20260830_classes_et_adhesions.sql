-- ═══════════════════════════════════════════════════════════════
--  CLASSES ET ADHÉSIONS
--
--  Appliqué le 30 août 2026, en quatre migrations Supabase :
--    · classrooms_and_memberships
--    · classroom_rpcs
--    · revoking_teacher_archives_classrooms
--    · join_classroom_returns_instead_of_raising
--
--  ── Le principe ───────────────────────────────────────────────
--
--  L'appartenance à une classe NE SE DÉCLARE PAS, elle s'accorde.
--  Avoir écrit « Lycée X, NS3 » dans son profil ne donne accès à
--  rien. On passe par un code d'invitation du professeur, PUIS par
--  sa validation. Aucune policy de ce fichier ne dit « même école
--  + même niveau = accès » : ce serait une porte ouverte pour un
--  adulte malveillant.
--
--  ── Le piège de récursion, et comment il est évité ────────────
--
--  Les policies de `classroom_members` ne doivent jamais faire de
--  sous-requête sur `classroom_members` elle-même : Postgres
--  réévaluerait la policy à l'intérieur de la policy, à l'infini.
--  D'où `is_classroom_member` et `is_classroom_teacher`, SECURITY
--  DEFINER : exécutées en tant que postgres, propriétaire des
--  tables, elles ne déclenchent aucune RLS. Elles sont STABLE
--  aussi, sinon elles seraient recalculées à chaque ligne examinée.
--
--  ── Trois choses que le plan ne prévoyait pas ─────────────────
--
--  1. `classroom_roster` et `my_classrooms`. Sans elles, rien ne
--     s'affiche : la RLS de `profiles` est « chacun la sienne »,
--     donc un élève ne peut pas lire le pseudonyme de ses
--     camarades. Plutôt qu'ouvrir `profiles` — ce qui exposerait
--     le prénom, le niveau et l'école de tout le monde — on passe
--     par des fonctions qui ne rendent que le nécessaire, et selon
--     qui demande. Le vrai nom ne part qu'au professeur ; le code
--     d'invitation et la note pour l'IA aussi.
--
--  2. Retirer le rôle professeur archive ses classes. Le plan
--     prévoit de retirer le rôle sans rien dire des classes en
--     cours. Un adulte dont on vient précisément de retirer les
--     droits garderait une salle de mineurs. Les deux gestes n'en
--     font qu'un.
--
--  3. `join_classroom` rend un résultat au lieu de lever une
--     exception. Voir ci-dessous : c'est ce qui fait que la limite
--     anti-force-brute fonctionne.
-- ═══════════════════════════════════════════════════════════════

create table public.classrooms (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id),
  teacher_id    uuid not null references auth.users on delete cascade,
  name          text not null check (char_length(btrim(name)) between 2 and 80),
  subject_id    text not null check (char_length(subject_id) between 1 and 40),
  grade_level   text not null references public.school_levels(id),
  join_code     text not null unique check (join_code ~ '^[2-9A-HJ-KM-NP-Z]{6}$'),
  is_open       boolean not null default true,
  -- Le chapitre en cours, saisi par le prof. C'est CE champ qui
  -- fera passer le tuteur de générique à aligné sur le cours réel
  -- de l'élève (étape 9).
  current_focus text check (current_focus is null or char_length(current_focus) <= 200),
  focus_note    text check (focus_note is null or char_length(focus_note) <= 500),
  created_at    timestamptz not null default now(),
  archived_at   timestamptz
);

create index classrooms_teacher_idx on public.classrooms (teacher_id) where archived_at is null;
create index classrooms_school_idx  on public.classrooms (school_id);

create table public.classroom_members (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'active', 'removed')),
  joined_at    timestamptz,
  created_at   timestamptz not null default now(),
  primary key (classroom_id, user_id)
);

create index classroom_members_user_idx   on public.classroom_members (user_id, status);
create index classroom_members_actifs_idx on public.classroom_members (classroom_id)
  where status = 'active';


-- ── Les deux fonctions d'aide (voir le piège de récursion) ────
create function public.is_classroom_member(p_classroom_id uuid)
returns boolean language sql security definer stable set search_path to ''
as $$
  select exists (
    select 1 from public.classroom_members m
     where m.classroom_id = p_classroom_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'
  );
$$;

create function public.is_classroom_teacher(p_classroom_id uuid)
returns boolean language sql security definer stable set search_path to ''
as $$
  select exists (
    select 1 from public.classrooms c
     where c.id = p_classroom_id and c.teacher_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_classroom_member(uuid)  from public, anon;
revoke execute on function public.is_classroom_teacher(uuid) from public, anon;
grant  execute on function public.is_classroom_member(uuid)  to authenticated;
grant  execute on function public.is_classroom_teacher(uuid) to authenticated;


-- ── RLS ───────────────────────────────────────────────────────
alter table public.classrooms        enable row level security;
alter table public.classroom_members enable row level security;

create policy classrooms_select on public.classrooms
  for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_classroom_member(id));

-- L'élève voit sa propre ligne, et celles des camarades ACTIFS des
-- classes où il est lui-même actif. Jamais qui est en attente
-- ailleurs, jamais qui a été retiré.
create policy classroom_members_select on public.classroom_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_classroom_teacher(classroom_id)
    or (status = 'active' and public.is_classroom_member(classroom_id))
  );

revoke insert, update, delete, truncate, references on public.classrooms        from anon, authenticated;
revoke insert, update, delete, truncate, references on public.classroom_members from anon, authenticated;


-- ── Le code d'invitation ──────────────────────────────────────
--
-- Six caractères sans 0/O/1/I/L : un code se recopie depuis le
-- tableau, et « 0 » lu « O » fait perdre dix minutes à toute une
-- classe. Il reste 31 symboles, soit 887 millions de combinaisons.
create function public.generate_join_code()
returns text language plpgsql security definer set search_path to ''
as $$
declare
  c_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code   text;
  v_essais integer := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(c_alphabet, 1 + floor(random() * 31)::integer, 1);
    end loop;
    exit when not exists (select 1 from public.classrooms where join_code = v_code);
    v_essais := v_essais + 1;
    if v_essais > 50 then raise exception 'impossible de generer un code'; end if;
  end loop;
  return v_code;
end;
$$;

revoke execute on function public.generate_join_code() from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
--  LA LIMITE ANTI-FORCE-BRUTE, ET POURQUOI ELLE NE MARCHAIT PAS
--
--  Première version : on incrémentait le compteur, puis on levait
--  une exception sur « code invalide ». Or une exception annule
--  TOUTE la transaction — y compris l'incrément. Les tentatives
--  ratées ne coûtaient donc rien, et la limite de dix par heure ne
--  protégeait rien : exactement le cas qu'elle visait.
--
--  Attrapé par le test : douze tentatives d'affilée, zéro refus.
--
--  La fonction rend donc un résultat au lieu de lever, ce qui
--  laisse la transaction se valider. Deuxième bénéfice : elle rend
--  un CODE d'erreur et non une phrase française, que l'application
--  traduit. Une exception SQL serait arrivée telle quelle sous les
--  yeux d'un élève, en anglais et en jargon.
-- ═══════════════════════════════════════════════════════════════
create function public.join_classroom(p_code text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
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
    uid, 'join_' || to_char((now() at time zone 'utc'), 'YYYYMMDDHH24'), 10);
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

  if v_statut = 'active'  then return jsonb_build_object('ok', false, 'error', 'deja_membre'); end if;
  if v_statut = 'pending' then return jsonb_build_object('ok', false, 'error', 'deja_en_attente'); end if;
  -- Volontairement le même message qu'un code invalide : un élève
  -- exclu n'a pas à savoir que la classe existe encore.
  if v_statut = 'removed' then return jsonb_build_object('ok', false, 'error', 'code_invalide'); end if;

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
    'ok', true, 'classroom_id', v_classe.id, 'name', v_classe.name,
    'subject_id', v_classe.subject_id, 'grade_level', v_classe.grade_level,
    'school', v_ecole, 'teacher', v_prof, 'status', 'pending');
end;
$$;


-- ── Ouvrir une classe ─────────────────────────────────────────
create function public.create_classroom(
  p_school_id uuid, p_name text, p_subject_id text, p_grade_level text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  v_role text; v_nom text := btrim(coalesce(p_name, '')); v_code text; v_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select role into v_role from public.profiles where id = uid;
  if v_role is distinct from 'prof' then
    raise exception 'seul un professeur peut ouvrir une classe';
  end if;
  if char_length(v_nom) < 2 then raise exception 'nom de classe trop court'; end if;
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
$$;


-- ── Le professeur décide ──────────────────────────────────────
create function public.approve_member(p_classroom_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_actifs integer;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  select count(*) into v_actifs from public.classroom_members
   where classroom_id = p_classroom_id and status = 'active';
  if v_actifs >= 60 then raise exception 'cette classe est complete'; end if;

  update public.classroom_members set status = 'active', joined_at = now()
   where classroom_id = p_classroom_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'aucune demande en attente'; end if;

  return jsonb_build_object('user_id', p_user_id, 'status', 'active');
end;
$$;

create function public.remove_member(p_classroom_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  -- On marque « removed » plutôt que de supprimer : la ligne
  -- empêche de revenir par le code, et l'étape 8 aura besoin de
  -- savoir qu'une exclusion a eu lieu.
  update public.classroom_members set status = 'removed'
   where classroom_id = p_classroom_id and user_id = p_user_id;
  if not found then raise exception 'membre introuvable'; end if;
  return jsonb_build_object('user_id', p_user_id, 'status', 'removed');
end;
$$;

create function public.rotate_join_code(p_classroom_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_code text;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  v_code := public.generate_join_code();
  update public.classrooms set join_code = v_code where id = p_classroom_id;
  return jsonb_build_object('join_code', v_code);
end;
$$;

create function public.set_classroom_focus(p_classroom_id uuid, p_focus text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $$
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
$$;

create function public.set_classroom_open(p_classroom_id uuid, p_open boolean)
returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.classrooms set is_open = coalesce(p_open, true) where id = p_classroom_id;
  return jsonb_build_object('is_open', p_open);
end;
$$;

create function public.archive_classroom(p_classroom_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  update public.classrooms set archived_at = now(), is_open = false
   where id = p_classroom_id and archived_at is null;
  return jsonb_build_object('classroom_id', p_classroom_id, 'archived', true);
end;
$$;


-- ── Ce que l'application affiche ──────────────────────────────
--
-- Absentes du plan, et sans elles rien ne s'affiche : la RLS de
-- `profiles` est « chacun la sienne ». Plutôt que de l'ouvrir, on
-- rend le strict nécessaire, et selon qui demande.

create function public.classroom_roster(p_classroom_id uuid)
returns table (
  user_id uuid, affiche text, vrai_nom text,
  status text, is_teacher boolean, joined_at timestamptz)
language sql security definer stable set search_path to ''
as $$
  with moi as (
    select public.is_classroom_teacher(p_classroom_id) as prof,
           public.is_classroom_member(p_classroom_id)  as membre
  )
  select
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    -- Le vrai nom ne part qu'au professeur de CETTE classe.
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    m.status, false, m.joined_at
  from public.classroom_members m
  join public.profiles p on p.id = m.user_id
  where (select prof or membre from moi)
    and m.classroom_id = p_classroom_id
    and (m.status = 'active' or (select prof from moi))
    and m.status <> 'removed'
  order by m.status, 2;
$$;

create function public.my_classrooms()
returns table (
  id uuid, name text, subject_id text, grade_level text,
  school text, teacher text, is_teacher boolean, my_status text,
  members integer, pending integer, join_code text, is_open boolean,
  current_focus text, focus_note text)
language sql security definer stable set search_path to ''
as $$
  select
    c.id, c.name, c.subject_id, c.grade_level, s.name,
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
    and (c.teacher_id = (select auth.uid()) or m.status in ('active', 'pending'))
  order by c.created_at desc;
$$;


-- ── Retirer le rôle prof ferme ses classes ────────────────────
--
-- Le plan retire le rôle sans rien dire des classes en cours. Un
-- adulte dont on vient précisément de retirer les droits garderait
-- une salle de mineurs. On archive plutôt qu'on ne supprime : les
-- devoirs rendus et les messages restent consultables pour
-- comprendre ce qui s'est passé, ce dont l'étape 8 aura besoin.
create or replace function public.revoke_teacher_role(p_user_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare v_classes integer;
begin
  update public.profiles set role = 'eleve', updated_at = now()
   where id = p_user_id and role = 'prof';
  if not found then raise exception 'cet utilisateur n''est pas professeur'; end if;

  update public.classrooms set archived_at = now(), is_open = false
   where teacher_id = p_user_id and archived_at is null;
  get diagnostics v_classes = row_count;

  update public.teacher_requests
     set status = 'rejected', reviewed_at = now(), reviewed_by = (select auth.uid()),
         review_note = coalesce(p_reason, 'role retire'), updated_at = now()
   where user_id = p_user_id;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'revoked', (select auth.uid()), p_reason);

  return jsonb_build_object('user_id', p_user_id, 'role', 'eleve',
                            'classes_archivees', v_classes);
end;
$$;


-- ── Droits ────────────────────────────────────────────────────
revoke execute on function public.create_classroom(uuid, text, text, text) from public, anon;
revoke execute on function public.join_classroom(text)                     from public, anon;
revoke execute on function public.approve_member(uuid, uuid)               from public, anon;
revoke execute on function public.remove_member(uuid, uuid)                from public, anon;
revoke execute on function public.rotate_join_code(uuid)                   from public, anon;
revoke execute on function public.set_classroom_focus(uuid, text, text)    from public, anon;
revoke execute on function public.set_classroom_open(uuid, boolean)        from public, anon;
revoke execute on function public.archive_classroom(uuid)                  from public, anon;
revoke execute on function public.classroom_roster(uuid)                   from public, anon;
revoke execute on function public.my_classrooms()                          from public, anon;
revoke execute on function public.revoke_teacher_role(uuid, text)  from public, anon, authenticated;

grant execute on function public.create_classroom(uuid, text, text, text) to authenticated;
grant execute on function public.join_classroom(text)                     to authenticated;
grant execute on function public.approve_member(uuid, uuid)               to authenticated;
grant execute on function public.remove_member(uuid, uuid)                to authenticated;
grant execute on function public.rotate_join_code(uuid)                   to authenticated;
grant execute on function public.set_classroom_focus(uuid, text, text)    to authenticated;
grant execute on function public.set_classroom_open(uuid, boolean)        to authenticated;
grant execute on function public.archive_classroom(uuid)                  to authenticated;
grant execute on function public.classroom_roster(uuid)                   to authenticated;
grant execute on function public.my_classrooms()                          to authenticated;
grant execute on function public.revoke_teacher_role(uuid, text)          to service_role;
