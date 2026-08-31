-- ═══════════════════════════════════════════════════════════════
--  LE PROFESSEUR OUVRE SA CLASSE SEUL
--
--  Appliqué le 31 août 2026, en trois migrations Supabase :
--    · teacher_role_granted_on_declaration
--    · classroom_cap_depends_on_verification
--    · no_teacher_verification_at_all
--
--  ── Ce qui change ─────────────────────────────────────────────
--
--  L'étape 4 accordait le rôle professeur À LA MAIN, une demande
--  après l'autre, depuis l'éditeur SQL du dashboard. Un vrai
--  professeur attendait donc des jours avant de pouvoir ouvrir sa
--  classe — et il attendait UNE SEULE personne.
--
--  Désormais il déclare qui il est, et le rôle est accordé dans la
--  même transaction. Il ouvre sa classe dans la minute.
--
--  ── Pourquoi c'est défendable, malgré le public mineur ────────
--
--  La question n'est pas « peut-on se déclarer professeur ? », elle
--  est « que peut faire un adulte malveillant qui s'est déclaré
--  professeur ? ». Réponse : rien, tant qu'aucun élève n'entre dans
--  sa classe. Et pour qu'un élève entre, il faut lui remettre un
--  code de six caractères.
--
--  Or EDEM n'offre AUCUN moyen de le remettre. Pas de fil public,
--  pas de recherche d'utilisateurs, pas de messages privés, pas
--  d'annuaire d'écoles peuplé d'élèves. Un inconnu ne peut adresser
--  la parole à personne. Le code se distribue donc dans le monde
--  physique — une salle de classe, une cour d'école — et quelqu'un
--  qui a déjà cet accès aux enfants ne gagnait rien à être validé
--  par un humain : il écrivait un nom et un numéro plausibles.
--
--  La validation manuelle coûtait donc des jours à chaque vrai
--  professeur, pour un gain qui tenait surtout à l'impression d'en
--  avoir un.
--
--  ── Ce qui protège vraiment, et qui ne bouge pas ──────────────
--
--  1. L'absence de porte. Voir ci-dessus : c'est la protection qui
--     coûte zéro et qui tient toute seule.
--  2. La modération de l'étape 8 : filtre à l'insertion, bouton
--     signaler, trois signalements masquent, et le journal.
--  3. `revoke_teacher_role`, qui retire le rôle ET archive toutes
--     ses classes du même geste. On répare en une commande.
--  4. La déclaration reste OBLIGATOIRE. Elle n'ouvre plus une file
--     d'attente, elle laisse une trace : un adulte responsable
--     d'une salle de mineurs donne son nom, son école et un moyen
--     de le joindre. C'est aussi ce que voit l'élève au moment de
--     rejoindre — une classe anonyme serait pire que tout.
--
--  ── Ce qui remplace la validation : un plafond, pas une porte ──
--
--  DIX classes par professeur, le même chiffre pour tout le monde.
--  Ce n'est pas une file d'attente : rien ni personne ne le lève,
--  il borne simplement ce qu'un compte peut fabriquer.
--
--  Le plafond porte sur le NOMBRE DE CLASSES, jamais sur le nombre
--  d'élèves. Une classe haïtienne compte couramment cinquante ou
--  soixante élèves : brider la taille aurait cassé le premier usage
--  réel d'un professeur légitime, et n'aurait gêné personne
--  d'autre. On borne ce qu'un abus multiplie, pas ce dont un vrai
--  usage a besoin.
--
--  Une première version gardait une vérification humaine facultative
--  qui faisait passer le plafond de trois à dix. Retirée : tant
--  qu'il reste quelque part une liste que quelqu'un doit relire, il
--  reste une file d'attente, même si elle ne bloque personne. Le
--  professeur crée sa salle, un point c'est tout.
--
--  Le frein d'urgence, lui, reste entier : `revoke_teacher_role`
--  retire le rôle ET archive toutes ses classes du même geste, et
--  la déclaration ne se rejoue pas ensuite.
-- ═══════════════════════════════════════════════════════════════


-- ═══ teacher_role_granted_on_declaration ═══

-- ── Un quatrième état ─────────────────────────────────────────
--
-- `pending` voulait dire « le rôle n'est pas accordé, on attend ».
-- Cet état n'existe plus. `active` prend sa place et veut dire
-- « rôle accordé, vérification humaine pas encore faite ».
--
-- On ne réutilise pas `pending` pour ce sens : le mot dirait le
-- contraire de ce qui se passe, et c'est le genre de vocabulaire
-- qui fait écrire un jour une condition à l'envers.
--
-- L'ORDRE COMPTE, et le premier essai a échoué dessus : poser la
-- nouvelle contrainte avant de convertir les lignes, c'est la poser
-- contre des lignes qui disent encore 'pending'. Et convertir avant
-- de retirer l'ancienne, c'est écrire 'active' contre une
-- contrainte qui ne le connaît pas. Il n'y a donc qu'un seul ordre
-- possible : retirer, convertir, reposer.
alter table public.teacher_requests
  drop constraint if exists teacher_requests_status_check;

update public.teacher_requests set status = 'active', updated_at = now()
 where status = 'pending';

-- La demande qui attendait déjà vaut déclaration : elle a été
-- déposée sous les anciennes règles, avec les mêmes informations
-- qu'on demande aujourd'hui. La laisser en attente d'une validation
-- qui n'existe plus l'aurait bloquée pour toujours.
update public.profiles p set role = 'prof', updated_at = now()
  from public.teacher_requests t
 where t.user_id = p.id and t.status = 'active' and p.role is distinct from 'prof';

insert into public.role_events (user_id, event, actor, reason)
select t.user_id, 'approved', null, 'declaration (reprise : file d attente supprimee)'
  from public.teacher_requests t
 where t.status = 'active';

alter table public.teacher_requests
  add constraint teacher_requests_status_check
  check (status in ('active', 'approved', 'rejected'));

alter table public.teacher_requests
  alter column status set default 'active';


-- ── Déclarer, et devenir professeur dans la foulée ────────────
--
-- Remplace `request_teacher_role`. Le nom change parce que le geste
-- change : on ne demande plus, on déclare. Une fonction qui
-- s'appelle « request » et qui accorde le droit séance tenante est
-- un piège pour celui qui la relira.
create function public.declare_teacher_role(
  p_full_name text,
  p_contact   text,
  p_subjects  text[] default '{}',
  p_school_id uuid   default null,
  p_message   text   default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid       uuid := (select auth.uid());
  v_nom     text := btrim(coalesce(p_full_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_statut  text;
  v_role    text;
  v_quota   jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_nom) < 3 then
    return jsonb_build_object('ok', false, 'error', 'nom_requis');
  end if;
  -- Le moyen de joindre reste obligatoire. Il ne sert plus à
  -- autoriser, il sert à RÉPONDRE : un adulte responsable d'une
  -- salle de mineurs doit pouvoir être joint si quelque chose s'y
  -- passe. C'est la seule coordonnée de toute l'application, et
  -- elle n'est jamais montrée à un élève.
  if char_length(v_contact) < 5 then
    return jsonb_build_object('ok', false, 'error', 'contact_requis');
  end if;
  if coalesce(cardinality(p_subjects), 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'matiere_requise');
  end if;

  select role into v_role from public.profiles where id = uid;
  select status into v_statut from public.teacher_requests where user_id = uid;

  -- Un rôle retiré ne se reprend pas en remplissant le formulaire
  -- une seconde fois. Sinon `revoke_teacher_role` ne servirait à
  -- rien : l'adulte qu'on vient d'écarter rouvrirait une classe
  -- dans la minute.
  if v_statut = 'rejected' then
    return jsonb_build_object('ok', false, 'error', 'role_retire');
  end if;

  if v_role = 'prof' then
    return jsonb_build_object('ok', true, 'role', 'prof',
                              'verified', v_statut = 'approved');
  end if;

  -- Trois envois par jour. Un vrai professeur n'en fait qu'un ;
  -- la limite borne l'emballement d'un script.
  v_quota := public.bump_usage(uid, 'teacher_request', 3);
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_demandes');
  end if;

  insert into public.teacher_requests
    (user_id, school_id, full_name, subjects, contact, message, status, updated_at)
  values
    (uid, p_school_id, v_nom, p_subjects, v_contact,
     nullif(btrim(coalesce(p_message, '')), ''), 'active', now())
  on conflict (user_id) do update
    set school_id  = excluded.school_id,
        full_name  = excluded.full_name,
        subjects   = excluded.subjects,
        contact    = excluded.contact,
        message    = excluded.message,
        status     = 'active',
        updated_at = now();

  -- Le rôle, dans la MÊME transaction que la déclaration. Les deux
  -- vont ensemble ou aucun des deux : on ne veut pas d'un
  -- professeur sans trace, ni d'une trace sans professeur.
  update public.profiles set role = 'prof', updated_at = now()
   where id = uid;

  insert into public.role_events (user_id, event, actor, reason)
  values (uid, 'approved', uid, 'declaration');

  return jsonb_build_object('ok', true, 'role', 'prof', 'verified', false);
end;
$$;

drop function if exists public.request_teacher_role(text, text, text[], uuid, text);

revoke execute on function public.declare_teacher_role(text, text, text[], uuid, text)
  from public, anon;
grant  execute on function public.declare_teacher_role(text, text, text[], uuid, text)
  to authenticated;


-- ── Vérifier après coup ───────────────────────────────────────
--
-- `approve_teacher_role` existe toujours, mais elle n'accorde plus
-- rien : le rôle est déjà là. Elle VÉRIFIE, ce qui lève le plafond
-- de classes. Elle ne bloque donc plus personne, et peut attendre
-- une semaine sans que ça gêne qui que ce soit.
create or replace function public.approve_teacher_role(p_user_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_nom text;
begin
  select full_name into v_nom
    from public.teacher_requests where user_id = p_user_id;
  if not found then
    raise exception 'aucune declaration pour cet utilisateur';
  end if;

  update public.teacher_requests
     set status = 'approved', reviewed_at = now(),
         reviewed_by = (select auth.uid()), review_note = p_note,
         updated_at = now()
   where user_id = p_user_id;

  -- Idempotent : le rôle est normalement déjà posé par la
  -- déclaration. On le repose au cas où la ligne viendrait d'une
  -- reprise de données.
  update public.profiles set role = 'prof', updated_at = now()
   where id = p_user_id and role is distinct from 'prof';

  return jsonb_build_object('user_id', p_user_id, 'nom', v_nom,
                            'status', 'approved', 'verified', true);
end;
$$;


-- ── La file de relecture, qui ne bloque plus rien ─────────────
--
-- Les professeurs déclarés que personne n'a encore regardés, les
-- plus actifs d'abord : c'est là que le temps d'un humain vaut le
-- plus. Un compte déclaré qui n'a jamais ouvert de classe ne
-- présente aucun risque et peut attendre.
create function public.teachers_to_review()
returns table (
  user_id    uuid,
  full_name  text,
  contact    text,
  subjects   text[],
  ecole      text,
  commune    text,
  message    text,
  classes    integer,
  eleves     integer,
  declare_le timestamptz
)
language sql
security definer
stable
set search_path to ''
as $$
  select
    t.user_id, t.full_name, t.contact, t.subjects,
    s.name, c.name, t.message,
    (select count(*)::integer from public.classrooms x
      where x.teacher_id = t.user_id and x.archived_at is null),
    (select count(*)::integer from public.classroom_members m
       join public.classrooms x on x.id = m.classroom_id
      where x.teacher_id = t.user_id and m.status = 'active'),
    t.created_at
  from public.teacher_requests t
  left join public.schools  s on s.id = t.school_id
  left join public.communes c on c.id = s.commune_id
  where t.status = 'active'
  order by 9 desc, 8 desc, t.created_at;
$$;

revoke execute on function public.teachers_to_review()
  from public, anon, authenticated;
grant  execute on function public.teachers_to_review() to service_role;


-- ═══ classroom_cap_depends_on_verification ═══

-- ── Ouvrir une classe ─────────────────────────────────────────
--
-- Seule différence avec la version de l'étape 5 : le plafond n'est
-- plus le même pour tout le monde.
--
--   déclaré, pas encore vérifié →  3 classes
--   vérifié à la main           → 10 classes
--
-- Le plafond porte sur le NOMBRE DE CLASSES, jamais sur le nombre
-- d'élèves. Une classe haïtienne compte couramment cinquante ou
-- soixante élèves ; brider la taille aurait cassé le premier usage
-- réel d'un professeur légitime sans gêner personne d'autre. On
-- borne ce qu'un abus multiplie, pas ce dont un vrai usage a
-- besoin.
create or replace function public.create_classroom(
  p_school_id uuid, p_name text, p_subject_id text, p_grade_level text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  v_role text;
  v_statut text;
  v_plafond integer;
  v_ouvertes integer;
  v_nom text := btrim(coalesce(p_name, ''));
  v_code text;
  v_id uuid;
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

  select status into v_statut from public.teacher_requests where user_id = uid;
  v_plafond := case when v_statut = 'approved' then 10 else 3 end;

  select count(*) into v_ouvertes from public.classrooms
   where teacher_id = uid and archived_at is null;

  if v_ouvertes >= v_plafond then
    raise exception 'trop de classes ouvertes';
  end if;

  v_code := public.generate_join_code();
  insert into public.classrooms (school_id, teacher_id, name, subject_id, grade_level, join_code)
  values (p_school_id, uid, v_nom, p_subject_id, p_grade_level, v_code)
  returning classrooms.id into v_id;

  return jsonb_build_object('id', v_id, 'join_code', v_code, 'name', v_nom);
end;
$$;


-- ── Ce que l'application a besoin de savoir ───────────────────
--
-- Le professeur doit voir combien de classes il peut encore
-- ouvrir, et pourquoi. Un bouton qui échoue sans rien dire est ce
-- qu'on a corrigé à l'étape précédente ; on ne le refait pas.
create function public.my_teacher_status()
returns jsonb
language sql
security definer
stable
set search_path to ''
as $$
  select jsonb_build_object(
    'role',     coalesce(p.role, 'eleve'),
    'declared', t.user_id is not null,
    'verified', t.status = 'approved',
    'revoked',  t.status = 'rejected',
    'full_name', t.full_name,
    'limite',   case when t.status = 'approved' then 10 else 3 end,
    'ouvertes', (select count(*)::integer from public.classrooms c
                  where c.teacher_id = p.id and c.archived_at is null)
  )
  from public.profiles p
  left join public.teacher_requests t on t.user_id = p.id
  where p.id = (select auth.uid());
$$;

revoke execute on function public.my_teacher_status() from public, anon;
grant  execute on function public.my_teacher_status() to authenticated;


-- ═══ no_teacher_verification_at_all ═══

-- ── On retire la vérification, entièrement ────────────────────
--
-- Les deux migrations ci-dessus laissaient une vérification
-- FACULTATIVE : elle ne bloquait personne, elle faisait seulement
-- passer le plafond de trois à dix classes.
--
-- C'était encore une file. Tant qu'il existe quelque part une liste
-- que quelqu'un doit relire, il reste un endroit où l'on prend du
-- retard, et un professeur qui vaut moins qu'un autre en attendant.
-- Elles disparaissent.
drop function if exists public.teachers_to_review();
drop function if exists public.approve_teacher_role(uuid, text);

-- Il ne reste que deux états : on est professeur, ou on l'a été et
-- le rôle a été retiré. « approved » n'a plus de sens puisque plus
-- rien n'approuve.
update public.teacher_requests set status = 'active' where status = 'approved';

alter table public.teacher_requests
  drop constraint if exists teacher_requests_status_check;

alter table public.teacher_requests
  add constraint teacher_requests_status_check
  check (status in ('active', 'rejected'));


-- ── Un seul plafond, celui de l'étape 5 ───────────────────────
create or replace function public.create_classroom(
  p_school_id uuid, p_name text, p_subject_id text, p_grade_level text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  v_role text;
  v_ouvertes integer;
  v_nom text := btrim(coalesce(p_name, ''));
  v_code text;
  v_id uuid;
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

  select count(*) into v_ouvertes from public.classrooms
   where teacher_id = uid and archived_at is null;
  if v_ouvertes >= 10 then
    raise exception 'trop de classes ouvertes';
  end if;

  v_code := public.generate_join_code();
  insert into public.classrooms (school_id, teacher_id, name, subject_id, grade_level, join_code)
  values (p_school_id, uid, v_nom, p_subject_id, p_grade_level, v_code)
  returning classrooms.id into v_id;

  return jsonb_build_object('id', v_id, 'join_code', v_code, 'name', v_nom);
end;
$$;


-- `verified` disparaît des deux fonctions qui le rendaient encore.
create or replace function public.my_teacher_status()
returns jsonb
language sql
security definer
stable
set search_path to ''
as $$
  select jsonb_build_object(
    'role',      coalesce(p.role, 'eleve'),
    'declared',  t.user_id is not null,
    'revoked',   t.status = 'rejected',
    'full_name', t.full_name,
    'limite',    10,
    'ouvertes',  (select count(*)::integer from public.classrooms c
                   where c.teacher_id = p.id and c.archived_at is null)
  )
  from public.profiles p
  left join public.teacher_requests t on t.user_id = p.id
  where p.id = (select auth.uid());
$$;

create or replace function public.declare_teacher_role(
  p_full_name text, p_contact text, p_subjects text[] default '{}',
  p_school_id uuid default null, p_message text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  uid       uuid := (select auth.uid());
  v_nom     text := btrim(coalesce(p_full_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_statut  text;
  v_role    text;
  v_quota   jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(v_nom) < 3 then
    return jsonb_build_object('ok', false, 'error', 'nom_requis');
  end if;
  if char_length(v_contact) < 5 then
    return jsonb_build_object('ok', false, 'error', 'contact_requis');
  end if;
  if coalesce(cardinality(p_subjects), 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'matiere_requise');
  end if;

  select role into v_role from public.profiles where id = uid;
  select status into v_statut from public.teacher_requests where user_id = uid;

  if v_statut = 'rejected' then
    return jsonb_build_object('ok', false, 'error', 'role_retire');
  end if;
  if v_role = 'prof' then
    return jsonb_build_object('ok', true, 'role', 'prof');
  end if;

  v_quota := public.bump_usage(uid, 'teacher_request', 3);
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_demandes');
  end if;

  insert into public.teacher_requests
    (user_id, school_id, full_name, subjects, contact, message, status, updated_at)
  values
    (uid, p_school_id, v_nom, p_subjects, v_contact,
     nullif(btrim(coalesce(p_message, '')), ''), 'active', now())
  on conflict (user_id) do update
    set school_id  = excluded.school_id,
        full_name  = excluded.full_name,
        subjects   = excluded.subjects,
        contact    = excluded.contact,
        message    = excluded.message,
        status     = 'active',
        updated_at = now();

  update public.profiles set role = 'prof', updated_at = now() where id = uid;

  insert into public.role_events (user_id, event, actor, reason)
  values (uid, 'approved', uid, 'declaration');

  return jsonb_build_object('ok', true, 'role', 'prof');
end;
$$;


-- ── Compatibilité avec les installations d'avant ──────────────
--
-- L'application déjà posée sur les téléphones appelle encore
-- `request_teacher_role`. La supprimer sèchement a cassé le bouton
-- « Envoyer la demande » pour tout le monde tant que la mise à jour
-- n'était pas passée — vu sur un vrai téléphone, avec un « La
-- demande n'est pas partie » qui ne disait évidemment pas que la
-- fonction n'existait plus.
--
-- Une migration ne doit pas casser les clients déjà installés :
-- l'ancien nom redirige donc vers le nouveau. À retirer quand plus
-- personne ne fait tourner un bundle d'août 2026.
create or replace function public.request_teacher_role(
  p_full_name text,
  p_contact   text,
  p_subjects  text[] default '{}',
  p_school_id uuid   default null,
  p_message   text   default null
)
returns jsonb
language sql
security definer
set search_path to ''
as $$
  select public.declare_teacher_role(
    p_full_name, p_contact, p_subjects, p_school_id, p_message);
$$;

revoke execute on function public.request_teacher_role(text, text, text[], uuid, text)
  from public, anon;
grant  execute on function public.request_teacher_role(text, text, text[], uuid, text)
  to authenticated;
