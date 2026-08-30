-- ═══════════════════════════════════════════════════════════════
--  LE RÔLE PROFESSEUR — demandé, jamais déclaré
--
--  Appliqué le 30 août 2026 :
--    · teacher_role_requests_and_audit
--
--  ── Pourquoi cette étape est la clé de voûte ──────────────────
--
--  Toute la sécurité des classes repose sur une phrase : « il y a
--  un adulte responsable dans chaque classe ». Cette phrase ne
--  vaut rien si n'importe qui peut cocher « je suis prof ». Un
--  rôle prof mal accordé, ce n'est pas une donnée qui fuit, c'est
--  un adulte malveillant seul avec une salle de mineurs.
--
--  D'où : accord manuel, un par un, tant que le volume le permet.
--  Pas d'interface d'administration, pas d'approbation
--  automatique, pas de « validé par l'école » invérifiable.
--
--  Un compte prof reste un compte élève : il garde son profil, ses
--  XP, son tuteur. Le rôle AJOUTE des droits, il n'ouvre pas une
--  application séparée.
--
--  ── Deux ajouts au plan ───────────────────────────────────────
--
--  1. `revoke_teacher_role`. Le plan prévoit d'accorder, pas de
--     reprendre. Accorder un droit qu'on ne sait pas retirer, sur
--     un produit où des mineurs se retrouvent seuls avec un
--     adulte, n'est pas défendable. L'étape 8 en aura besoin.
--
--  2. `role_events`, le journal. L'étape 8 demandera de repérer un
--     professeur qui abuse de ses droits ; on ne reconstitue pas
--     après coup un historique qu'on n'a pas gardé. Il commence
--     maintenant, pendant qu'il est vide.
-- ═══════════════════════════════════════════════════════════════

create table public.teacher_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users on delete cascade,
  school_id   uuid references public.schools(id) on delete set null,
  full_name   text not null check (char_length(btrim(full_name)) between 3 and 120),
  subjects    text[] not null default '{}'
              check (cardinality(subjects) between 1 and 8),
  -- Le moyen de VÉRIFIER : numéro professionnel, adresse de
  -- l'école, nom d'un référent. C'est la seule donnée de contact
  -- collectée dans toute l'application. Elle ne concerne qu'un
  -- adulte qui la fournit lui-même pour être vérifié, et elle
  -- n'est lisible que par lui et par le service_role. Elle n'est
  -- jamais montrée à un élève.
  contact     text not null check (char_length(btrim(contact)) between 5 and 200),
  message     text check (message is null or char_length(message) <= 1000),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index teacher_requests_status_idx on public.teacher_requests (status, created_at);
create index teacher_requests_school_idx on public.teacher_requests (school_id)
  where school_id is not null;

alter table public.teacher_requests enable row level security;

-- Chacun lit sa demande, et rien d'autre. Aucune écriture directe :
-- sinon `status` serait modifiable par le demandeur, ce qui viderait
-- la validation de tout son sens.
create policy teacher_requests_select_own on public.teacher_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate, references
  on public.teacher_requests from anon, authenticated;


-- ── Journal des changements de rôle ───────────────────────────
create table public.role_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  event      text not null check (event in ('approved', 'rejected', 'revoked')),
  actor      uuid,
  reason     text,
  created_at timestamptz not null default now()
);

create index role_events_user_idx on public.role_events (user_id, created_at desc);

-- RLS active SANS aucune policy : personne ne lit ce journal via
-- l'API. Seuls postgres et le service_role y accèdent.
alter table public.role_events enable row level security;
revoke all on public.role_events from anon, authenticated;


-- ── Demander le rôle ──────────────────────────────────────────
create function public.request_teacher_role(
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
  -- professeur — il n'en fait qu'un — mais d'empêcher qu'on inonde
  -- la file d'attente qui se dépouille à la main.
  v_quota := public.bump_usage(uid, 'teacher_request', 3);
  if not (v_quota ->> 'allowed')::boolean then
    raise exception 'trop de demandes aujourd''hui, reessaie demain';
  end if;

  insert into public.teacher_requests
    (user_id, school_id, full_name, subjects, contact, message, status, updated_at)
  values
    (uid, p_school_id, v_nom, p_subjects, v_contact,
     nullif(btrim(coalesce(p_message, '')), ''), 'pending', now())
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
$$;

revoke execute on function public.request_teacher_role(text, text, text[], uuid, text)
  from public, anon;
grant  execute on function public.request_teacher_role(text, text, text[], uuid, text)
  to authenticated;


-- ── Accorder, refuser, retirer ────────────────────────────────
--
-- Aucune des trois n'est joignable depuis l'application. Elles
-- s'exécutent depuis l'éditeur SQL du dashboard, où l'on est
-- postgres. Le trigger profiles_guard_role les laisse passer : à
-- l'intérieur d'une fonction DEFINER, current_user vaut postgres.

create function public.approve_teacher_role(p_user_id uuid, p_note text default null)
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
    raise exception 'aucune demande pour cet utilisateur';
  end if;

  update public.teacher_requests
     set status = 'approved', reviewed_at = now(),
         reviewed_by = (select auth.uid()), review_note = p_note,
         updated_at = now()
   where user_id = p_user_id;

  update public.profiles set role = 'prof', updated_at = now()
   where id = p_user_id;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'approved', (select auth.uid()), p_note);

  return jsonb_build_object('user_id', p_user_id, 'name', v_nom, 'role', 'prof');
end;
$$;

create function public.reject_teacher_role(p_user_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

create function public.revoke_teacher_role(p_user_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.profiles set role = 'eleve', updated_at = now()
   where id = p_user_id and role = 'prof';
  if not found then
    raise exception 'cet utilisateur n''est pas professeur';
  end if;

  update public.teacher_requests
     set status = 'rejected', reviewed_at = now(),
         reviewed_by = (select auth.uid()),
         review_note = coalesce(p_reason, 'role retire'),
         updated_at = now()
   where user_id = p_user_id;

  insert into public.role_events (user_id, event, actor, reason)
  values (p_user_id, 'revoked', (select auth.uid()), p_reason);

  return jsonb_build_object('user_id', p_user_id, 'role', 'eleve');
end;
$$;

revoke execute on function public.approve_teacher_role(uuid, text) from public, anon, authenticated;
revoke execute on function public.reject_teacher_role(uuid, text)  from public, anon, authenticated;
revoke execute on function public.revoke_teacher_role(uuid, text)  from public, anon, authenticated;
grant  execute on function public.approve_teacher_role(uuid, text) to service_role;
grant  execute on function public.reject_teacher_role(uuid, text)  to service_role;
grant  execute on function public.revoke_teacher_role(uuid, text)  to service_role;


-- ── La file d'attente, telle qu'on la dépouille ───────────────
--
-- « Je valide à la main » suppose de pouvoir voir les demandes
-- sans réécrire une jointure de six lignes à chaque fois.
--
--   select * from public.teacher_requests_to_review();
--   select public.approve_teacher_role('<uuid>', 'appel verifie le 30/08');
--   select public.reject_teacher_role('<uuid>', 'contact injoignable');
--   select public.revoke_teacher_role('<uuid>', 'signalement');
create function public.teacher_requests_to_review(p_status text default 'pending')
returns table (
  user_id     uuid,
  demande_le  timestamptz,
  nom_declare text,
  contact     text,
  matieres    text[],
  ecole       text,
  commune     text,
  message     text,
  -- De quoi flairer un faux : un compte créé il y a dix minutes,
  -- sans un seul quiz, qui se déclare professeur, mérite un appel
  -- avant tout le reste.
  compte_cree timestamptz,
  quiz_faits  integer,
  xp          integer,
  statut      text
)
language sql
security definer
stable
set search_path to ''
as $$
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
$$;

revoke execute on function public.teacher_requests_to_review(text) from public, anon, authenticated;
grant  execute on function public.teacher_requests_to_review(text) to service_role;
