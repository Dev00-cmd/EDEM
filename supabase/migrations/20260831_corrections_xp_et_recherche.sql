-- ═══════════════════════════════════════════════════════════════
--  TROIS CORRECTIONS SIGNALÉES À L'USAGE
--
--  ── 1. Le profil complet ne rapporte plus d'XP ────────────────
--
--  Un compte créé à 23h14 affichait 58 XP à 23h20 sans avoir
--  répondu à une seule question : 50 pour avoir rempli un
--  formulaire.
--
--  C'était une mauvaise idée de ma part, introduite à l'étape 3.
--  Les XP mesurent le TRAVAIL scolaire, et le classement les met en
--  regard de tous les autres élèves. Cinquante XP pour un
--  formulaire, c'est plus que six notions étudiées : un élève qui
--  remplit son profil dépassait un élève qui révise. Le compteur
--  mentait sur ce qu'il compte.
--
--  La barre de complétion reste — elle motive sans fausser. C'est
--  la récompense en XP qui disparaît, et les 50 XP déjà versés sont
--  repris.
--
--  ── 2. Trouver son école par son SIGLE ────────────────────────
--
--  On désigne couramment une école par ses initiales : « ICA » pour
--  International Christian Academy, « IDEPH », « LAP » pour Lycée
--  Alexandre Pétion. La recherche par sous-chaîne ne trouvait rien,
--  puisque « ica » n'apparaît nulle part dans « international
--  christian academy ».
--
--  D'où `school_acronym`, indexée. Avec une nuance apprise en
--  testant : la première version acceptait aussi « ica » en
--  sous-chaîne, ce qui ramenait « Afr(ica) », « Republ(ica) » —
--  soixante-dix résultats pour trois lettres. En dessous de cinq
--  caractères on n'accepte donc que ce qui commence un MOT, ou le
--  sigle exact. Neuf résultats au lieu de soixante-dix.
--
--  ── 3. Toutes les écoles doivent apparaître ───────────────────
--
--  Deux blocages, tous deux levés.
--
--  Rien ne s'affichait tant que l'élève n'avait pas tapé trois
--  lettres. Or la plupart du temps il ne CHERCHE pas, il RECONNAÎT :
--  il lui faut la liste de sa commune sous les yeux. Sans texte, la
--  fonction rend donc la liste, et `p_offset` permet de la dérouler
--  entièrement — 464 écoles à Port-au-Prince ne tiennent pas en une
--  page.
--
--  Et une école ajoutée par un élève restait « en attente », donc
--  invisible aux autres : le référentiel ne pouvait pas grandir,
--  alors qu'il ne couvre que 8 584 des quelque 15 000 écoles
--  d'Haïti. Elle est désormais publiée immédiatement.
--
--  Ce qui empêche le désordre n'est pas la validation manuelle mais
--  le DÉDOUBLONNAGE : si l'école existe déjà dans la commune, sous
--  quelque orthographe que ce soit, la fonction rend l'existante au
--  lieu d'en créer une seconde. Plus la limite de trois ajouts par
--  jour, et `created_by` qui garde la trace de qui a écrit quoi.
--
--  CONTREPARTIE ASSUMÉE : un nom fantaisiste peut désormais
--  apparaître dans la liste d'une commune. C'est réversible d'une
--  ligne, et le filtre de termes de l'étape 8 le couvrira.
--
--  ── Ce qui n'était PAS un défaut ──────────────────────────────
--
--  « Le professeur peut créer la salle sans ma permission. »
--  Vérifié : le serveur refuse par les quatre chemins possibles.
--
--    create_classroom                → 400 seul un professeur…
--    PATCH profiles role='prof'      → 403 permission denied
--    upsert profil avec role='prof'  → 403 permission denied
--    INSERT direct dans classrooms   → 403 permission denied
--
--  Le rôle du compte reste « eleve », même après avoir demandé le
--  rôle professeur. Ce qui manquait était côté APPLICATION : elle
--  laissait remplir tout le formulaire avant de refuser, ce qui
--  donne l'impression que ça a failli marcher. L'écran l'annonce
--  maintenant d'emblée (app/classroom/new.tsx).
-- ═══════════════════════════════════════════════════════════════

-- ═══ no_xp_for_profile_completion ═══

-- ═══════════════════════════════════════════════════════════════
--  LE PROFIL COMPLET NE RAPPORTE PLUS D'XP
--
--  Un compte créé à 23h14 affichait 58 XP à 23h20 sans avoir
--  répondu à une seule question : 50 pour avoir rempli un
--  formulaire, 8 pour une notion lue.
--
--  C'était une mauvaise idée. Les XP mesurent le TRAVAIL scolaire,
--  et le classement les met en regard de tous les autres élèves.
--  Cinquante XP pour un formulaire, c'est plus que six notions
--  étudiées : un élève qui remplit son profil dépassait un élève
--  qui révise. Le compteur mentait sur ce qu'il compte.
--
--  La barre de complétion reste — elle motive sans fausser. C'est
--  la récompense en XP qui disparaît.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.profile_completion()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

revoke execute on function public.profile_completion() from public, anon;
grant  execute on function public.profile_completion() to authenticated;


-- ── On reprend les XP déjà versés ─────────────────────────────
--
-- Un seul compte est concerné. On retire les 50 XP du bonus, et la
-- ligne correspondante du journal d'activité, pour que le
-- classement et la courbe de progression disent la même chose.
with concernes as (
  select p.id
  from public.profiles p
  where p.profile_completed_at is not null
)
update public.progress pr
   set xp = greatest(0, pr.xp - 50), updated_at = now()
  from concernes c
 where pr.user_id = c.id;

with concernes as (
  select p.id, p.profile_completed_at::date as jour
  from public.profiles p
  where p.profile_completed_at is not null
)
update public.daily_activity d
   set xp_gained = greatest(0, d.xp_gained - 50)
  from concernes c
 where d.user_id = c.id and d.day = c.jour;;


-- ═══ school_search_by_acronym_and_browse ═══

-- ═══════════════════════════════════════════════════════════════
--  TROUVER SON ÉCOLE : SIGLE, PARCOURS DE LA LISTE, AJOUT IMMÉDIAT
--
--  Trois défauts constatés à l'usage.
--
--  1. On désigne couramment une école par son SIGLE. « ICA » pour
--     International Christian Academy, « IDEPH », « LAP » pour
--     Lycée Alexandre Pétion. La recherche par sous-chaîne ne
--     trouvait rien : « ica » n'apparaît nulle part dans
--     « international christian academy ».
--
--  2. Rien ne s'affichait tant que l'élève n'avait pas tapé trois
--     lettres. Or la plupart du temps il ne cherche pas, il
--     RECONNAÎT : il lui faut la liste de sa commune sous les yeux.
--
--  3. Une école ajoutée par un élève restait « en attente » et
--     n'apparaissait qu'à lui. Le référentiel ne pouvait donc pas
--     grandir, alors qu'il ne couvre que 8 584 des quelque 15 000
--     écoles d'Haïti.
-- ═══════════════════════════════════════════════════════════════

-- ── Le sigle ──────────────────────────────────────────────────
--
-- Les initiales des mots qui portent le sens. Les particules sont
-- écartées, sinon « Collège de la Sainte Famille » donnerait
-- « cdlsf » au lieu de « csf ».
create function public.school_acronym(p_name text)
returns text
language sql
immutable
parallel safe
set search_path to ''
as $$
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
$$;

comment on function public.school_acronym(text) is
  'Initiales des mots porteurs. « International Christian Academy » → « ica ».';

create index schools_acronym_idx on public.schools (public.school_acronym(name));


-- ── La recherche ──────────────────────────────────────────────
--
-- Trois façons de trouver, dans cet ordre de pertinence :
--   · le nom commence par ce qu'on tape ;
--   · le SIGLE correspond ;
--   · le nom contient ce qu'on tape.
--
-- Sans texte, on rend la liste de la commune : l'élève parcourt au
-- lieu de deviner. `p_offset` permet de la dérouler entièrement.
drop function if exists public.search_schools(text, text);

create function public.search_schools(
  p_query      text default null,
  p_commune_id text default null,
  p_offset     integer default 0,
  p_limit      integer default 20
)
returns table (
  id          uuid,
  name        text,
  type        text,
  status      text,
  commune_id  text,
  commune     text,
  departement text,
  total       bigint
)
language sql
security definer
stable
set search_path to ''
as $$
  with q as (
    select nullif(btrim(public.norm_text(p_query)), '') as texte
  ),
  trouvees as (
    select s.*, c.name as commune_nom, d.name as departement_nom,
      case
        when (select texte from q) is null then 3
        when public.norm_text(s.name) like (select texte from q) || '%' then 0
        when public.school_acronym(s.name) = (select texte from q) then 1
        else 2
      end as rang
    from public.schools s
    join public.communes c     on c.id = s.commune_id
    join public.departements d on d.id = c.departement_id
    where (s.status = 'approved' or s.created_by = (select auth.uid()))
      and (p_commune_id is null or s.commune_id = p_commune_id)
      and (
        (select texte from q) is null
        or public.norm_text(s.name) like '%' || (select texte from q) || '%'
        -- Le sigle : « ica » retrouve International Christian Academy.
        or public.school_acronym(s.name) = (select texte from q)
      )
  )
  select
    t.id, t.name, t.type, t.status, t.commune_id,
    t.commune_nom, t.departement_nom,
    -- Le total sert à l'application pour savoir s'il reste des
    -- pages, sans une seconde requête.
    count(*) over ()
  from trouvees t
  order by t.rang, t.name
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.search_schools(text, text, integer, integer) from public, anon;
grant  execute on function public.search_schools(text, text, integer, integer) to authenticated;


-- ── L'école ajoutée par un élève est disponible tout de suite ──
--
-- Elle était créée « en attente », donc invisible aux autres : le
-- référentiel ne grandissait jamais. On la publie directement.
--
-- Ce qui empêche le désordre n'est pas la validation manuelle mais
-- le DÉDOUBLONNAGE : si l'école existe déjà dans la commune, sous
-- quelque orthographe que ce soit, la fonction rend l'existante au
-- lieu d'en créer une seconde. Plus la limite de trois ajouts par
-- jour, et `created_by` qui garde la trace de qui a écrit quoi.
create or replace function public.propose_school(
  p_name       text,
  p_commune_id text,
  p_type       text default 'autre'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

revoke execute on function public.propose_school(text, text, text) from public, anon;
grant  execute on function public.propose_school(text, text, text) to authenticated;

-- Les écoles proposées avant ce jour restaient invisibles. On les
-- publie : ce sont de vraies écoles, saisies par de vrais élèves.
update public.schools set status = 'approved'
 where status = 'pending' and source = 'user';;


-- ═══ tighten_short_school_queries ═══

-- Une requête courte tapée en sous-chaîne ramasse n'importe quoi :
-- « ICA » retrouvait « Afr(ica) », « Republ(ica) », « Techn(ica)le »
-- — soixante-dix résultats pour un sigle de trois lettres.
--
-- En dessous de cinq caractères, on n'accepte donc que ce qui
-- commence un MOT, ou le sigle exact. Au-delà, la sous-chaîne
-- redevient utile : « alexandre » doit retrouver « Lycée Alexandre
-- Pétion » même si l'élève ne tape pas le début du nom.
create or replace function public.search_schools(
  p_query      text default null,
  p_commune_id text default null,
  p_offset     integer default 0,
  p_limit      integer default 20
)
returns table (
  id          uuid,
  name        text,
  type        text,
  status      text,
  commune_id  text,
  commune     text,
  departement text,
  total       bigint
)
language sql
security definer
stable
set search_path to ''
as $$
  with q as (
    select nullif(btrim(public.norm_text(p_query)), '') as texte
  ),
  trouvees as (
    select s.*, c.name as commune_nom, d.name as departement_nom,
      case
        when (select texte from q) is null then 3
        when public.norm_text(s.name) like (select texte from q) || '%' then 0
        when public.school_acronym(s.name) = (select texte from q) then 1
        else 2
      end as rang
    from public.schools s
    join public.communes c     on c.id = s.commune_id
    join public.departements d on d.id = c.departement_id
    where (s.status = 'approved' or s.created_by = (select auth.uid()))
      and (p_commune_id is null or s.commune_id = p_commune_id)
      and (
        (select texte from q) is null
        -- Le sigle : « ica » retrouve International Christian Academy.
        or public.school_acronym(s.name) = (select texte from q)
        or case
             when length((select texte from q)) < 5
               -- \m = début de mot : « ica » ne matche plus « africa ».
               then public.norm_text(s.name) ~ ('\m' || (select texte from q))
             else public.norm_text(s.name) like '%' || (select texte from q) || '%'
           end
      )
  )
  select
    t.id, t.name, t.type, t.status, t.commune_id,
    t.commune_nom, t.departement_nom,
    count(*) over ()
  from trouvees t
  order by t.rang, t.name
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.search_schools(text, text, integer, integer) from public, anon;
grant  execute on function public.search_schools(text, text, integer, integer) to authenticated;;
