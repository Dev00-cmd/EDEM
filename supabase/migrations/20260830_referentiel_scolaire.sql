-- ═══════════════════════════════════════════════════════════════
--  RÉFÉRENTIEL SCOLAIRE HAÏTIEN, ÉCOLES ET PROFIL SCOLAIRE
--
--  Appliqué le 30 août 2026, en six migrations Supabase :
--    · text_normalisation_for_school_search
--    · haitian_education_referential
--    · schools_table_and_school_profile
--    · school_search_and_proposal_rpcs
--    · fix_profile_upsert_needs_id_column_grant
--    · tune_school_indexes
--
--  ── Pourquoi un référentiel, et pas du texte libre ────────────
--
--  Laissé en texte libre, le nom d'école produit « Lycée Alexandre
--  Pétion », « lycee petion », « LAP » et « Lycee Alex. Petion »
--  comme quatre établissements distincts. Le jour où on voudra
--  relier les élèves d'une même école, plus rien ne se recoupera.
--  Le référentiel se construit maintenant, pas après.
--
--  Et la même logique vaut pour la commune : « Port-au-Prince »,
--  « port au prince » et « PAP ». D'où la table `communes`, que le
--  plan ne demandait pas — c'est elle qui rend l'unicité des
--  écoles fiable, puisqu'un « Collège Saint-Joseph » existe dans
--  plusieurs communes.
--
--  ── Trois corrections au programme officiel ───────────────────
--
--  Vérifiées à la source avant d'être figées, pas tirées de la
--  mémoire :
--
--  1. La série ne se choisit pas au NS4 mais à l'ENTRÉE EN NS3.
--     Un élève de NS3 a déjà la sienne. Ne pas la lui demander,
--     c'est se priver pendant deux ans de l'information la plus
--     utile au tuteur.
--
--  2. Les séries sont QUATRE, celles de l'examen d'État NS4 :
--     SMP, SVT, SES et LLA.
--
--  3. La 6e AF n'est plus une année d'examen d'État. Ces examens
--     ont été supprimés à la rentrée 2014-2015. L'application les
--     annonçait encore (src/data/levels.ts, corrigé).
--
--  ── Deux écarts assumés par rapport au plan ───────────────────
--
--  a) PAS de colonne `grade_level`. `profiles.level` existe déjà,
--     l'application l'écrit depuis le premier jour et huit profils
--     la remplissent (« NS IV », « 9e AF »…). Une deuxième colonne
--     pour la même chose aurait divergé au premier oubli.
--
--  b) PAS de colonnes `commune` et `departement` en texte sur les
--     profils. `commune_id` suffit : le département s'en déduit.
--     Une question de moins à poser à l'élève, et personne ne
--     pourra être « à Jacmel, dans l'Artibonite ».
-- ═══════════════════════════════════════════════════════════════


-- ── Normalisation de texte ────────────────────────────────────
--
-- Piège à connaître : unaccent(text) est STABLE, pas IMMUTABLE —
-- Postgres refuse de l'indexer. C'est la forme à deux arguments,
-- unaccent(regdictionary, text), qui est IMMUTABLE. D'où
-- l'enveloppe ci-dessous, seule forme utilisable dans un index.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.norm_text(p_text text)
returns text
language sql
immutable
parallel safe
set search_path to ''
as $$
  select lower(
    extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))
  )
$$;

revoke execute on function public.norm_text(text) from public, anon;
grant  execute on function public.norm_text(text) to authenticated;


-- ── Départements ──────────────────────────────────────────────
-- Classés par nombre d'élèves scolarisés, pas par ordre
-- alphabétique : dans une liste sur un téléphone, ce qui compte
-- est que la bonne réponse soit en haut.
create table public.departements (
  id   text primary key,
  name text not null,
  rank integer not null
);

insert into public.departements (id, name, rank) values
  ('ouest',      'Ouest',       1),
  ('artibonite', 'Artibonite',  2),
  ('nord',       'Nord',        3),
  ('sud',        'Sud',         4),
  ('centre',     'Centre',      5),
  ('nord-ouest', 'Nord-Ouest',  6),
  ('sud-est',    'Sud-Est',     7),
  ('nord-est',   'Nord-Est',    8),
  ('grandanse',  'Grand''Anse', 9),
  ('nippes',     'Nippes',     10);


-- ── Communes ──────────────────────────────────────────────────
--
-- 148 entrées pour 146 communes officielles. Deux sources ont été
-- recoupées et elles divergeaient ; la liste retenue est leur
-- union. Elle inclut donc quelques localités (Montrouis, Marfranc,
-- Grand-Bassin, Lapointe, Fond-des-Blancs) qui sont des sections
-- communales que les gens nomment spontanément.
--
-- C'est délibéré : pour situer une école, « Montrouis » est une
-- bonne réponse. Ce qu'on cherche à éviter, c'est la fragmentation
-- du texte libre, pas l'imprécision administrative. Les
-- identifiants sont dérivés du nom, accents et apostrophes
-- compris (L'Estère → l-estere).
create table public.communes (
  id             text primary key,
  departement_id text not null references public.departements(id),
  name           text not null
);

insert into public.communes (id, departement_id, name)
select
  regexp_replace(
    regexp_replace(public.norm_text(v.name), '[^a-z0-9]+', '-', 'g'),
    '(^-|-$)', '', 'g'
  ),
  v.dep,
  v.name
from (values
  -- ouest (20)
  ('ouest','Anse-à-Galets'),('ouest','Arcahaie'),('ouest','Cabaret'),
  ('ouest','Carrefour'),('ouest','Cité Soleil'),('ouest','Cornillon'),
  ('ouest','Croix-des-Bouquets'),('ouest','Delmas'),
  ('ouest','Fonds-Verrettes'),('ouest','Ganthier'),('ouest','Grand-Goâve'),
  ('ouest','Gressier'),('ouest','Kenscoff'),('ouest','Léogâne'),
  ('ouest','Pétion-Ville'),('ouest','Petit-Goâve'),
  ('ouest','Pointe-à-Raquette'),('ouest','Port-au-Prince'),
  ('ouest','Tabarre'),('ouest','Thomazeau'),
  -- artibonite (18)
  ('artibonite','Anse-Rouge'),('artibonite','Desdunes'),
  ('artibonite','Dessalines'),('artibonite','Ennery'),
  ('artibonite','Grande-Saline'),('artibonite','Gros-Morne'),
  ('artibonite','L''Estère'),('artibonite','La Chapelle'),
  ('artibonite','Les Arcadins'),('artibonite','Les Gonaïves'),
  ('artibonite','Liancourt'),('artibonite','Marmelade'),
  ('artibonite','Montrouis'),('artibonite','Petite-Rivière-de-l''Artibonite'),
  ('artibonite','Saint-Marc'),('artibonite','Saint-Michel-de-l''Attalaye'),
  ('artibonite','Terre-Neuve'),('artibonite','Verrettes'),
  -- nord (19)
  ('nord','Acul-du-Nord'),('nord','Bahon'),('nord','Bas-Limbé'),
  ('nord','Borgne'),('nord','Cap-Haïtien'),('nord','Dondon'),
  ('nord','Grande-Rivière-du-Nord'),('nord','La Victoire'),('nord','Limbé'),
  ('nord','Limonade'),('nord','Milot'),('nord','Pignon'),('nord','Pilate'),
  ('nord','Plaine-du-Nord'),('nord','Plaisance'),('nord','Port-Margot'),
  ('nord','Quartier-Morin'),('nord','Ranquitte'),('nord','Saint-Raphaël'),
  -- sud (19)
  ('sud','Aquin'),('sud','Arniquet'),('sud','Camp-Perrin'),
  ('sud','Cavaillon'),('sud','Chantal'),('sud','Chardonnières'),
  ('sud','Fond-des-Blancs'),('sud','Île-à-Vache'),('sud','Les Anglais'),
  ('sud','Les Cayes'),('sud','Les Côteaux'),('sud','Maniche'),
  ('sud','Port-à-Piment'),('sud','Port-Salut'),('sud','Roche-à-Bateaux'),
  ('sud','Saint-Jean-du-Sud'),('sud','Saint-Louis-du-Sud'),('sud','Tiburon'),
  ('sud','Torbeck'),
  -- centre (13)
  ('centre','Baptiste'),('centre','Belladère'),('centre','Boucan-Carré'),
  ('centre','Cerca-Carvajal'),('centre','Cerca-la-Source'),
  ('centre','Hinche'),('centre','Lascahobas'),('centre','Maïssade'),
  ('centre','Mirebalais'),('centre','Saut-d''Eau'),('centre','Savanette'),
  ('centre','Thomassique'),('centre','Thomonde'),
  -- nord-ouest (11)
  ('nord-ouest','Anse-à-Foleur'),('nord-ouest','Baie-de-Henne'),
  ('nord-ouest','Bassin-Bleu'),('nord-ouest','Bombardopolis'),
  ('nord-ouest','Chansolme'),('nord-ouest','Jean-Rabel'),
  ('nord-ouest','La Tortue'),('nord-ouest','Lapointe'),
  ('nord-ouest','Môle-Saint-Nicolas'),('nord-ouest','Port-de-Paix'),
  ('nord-ouest','Saint-Louis-du-Nord'),
  -- sud-est (10)
  ('sud-est','Anse-à-Pitres'),('sud-est','Bainet'),('sud-est','Belle-Anse'),
  ('sud-est','Cayes-Jacmel'),('sud-est','Côtes-de-Fer'),
  ('sud-est','Grand-Gosier'),('sud-est','Jacmel'),
  ('sud-est','La Vallée-de-Jacmel'),('sud-est','Marigot'),
  ('sud-est','Thiotte'),
  -- nord-est (14)
  ('nord-est','Capotille'),('nord-est','Caracol'),('nord-est','Carice'),
  ('nord-est','Ferrier'),('nord-est','Fort-Liberté'),
  ('nord-est','Grand-Bassin'),('nord-est','Mombin-Crochu'),
  ('nord-est','Mont-Organisé'),('nord-est','Ouanaminthe'),
  ('nord-est','Perches'),('nord-est','Sainte-Suzanne'),
  ('nord-est','Terrier-Rouge'),('nord-est','Trou-du-Nord'),
  ('nord-est','Vallières'),
  -- grandanse (13)
  ('grandanse','Abricots'),('grandanse','Anse-d''Hainault'),
  ('grandanse','Beaumont'),('grandanse','Bonbon'),('grandanse','Chambellan'),
  ('grandanse','Corail'),('grandanse','Dame-Marie'),('grandanse','Jérémie'),
  ('grandanse','Les Irois'),('grandanse','Marfranc'),('grandanse','Moron'),
  ('grandanse','Pestel'),('grandanse','Roseaux'),
  -- nippes (11)
  ('nippes','Anse-à-Veau'),('nippes','Arnaud'),('nippes','Baradères'),
  ('nippes','Fonds-des-Nègres'),('nippes','Grand-Boucan'),
  ('nippes','L''Asile'),('nippes','Miragoâne'),('nippes','Paillant'),
  ('nippes','Petit-Trou-de-Nippes'),('nippes','Petite-Rivière-de-Nippes'),
  ('nippes','Plaisance-du-Sud')
) as v(dep, name);

create index communes_departement_idx on public.communes (departement_id, name);


-- ── Niveaux scolaires ─────────────────────────────────────────
--
-- Les identifiants reprennent EXACTEMENT les chaînes déjà écrites
-- dans profiles.level par l'application : aucune donnée existante
-- à convertir.
create table public.school_levels (
  id            text primary key,
  label_fr      text not null,
  label_ht      text not null,
  cycle         text not null check (cycle in ('fondamental','secondaire','autre')),
  rank          integer not null,
  has_exam      boolean not null default false,
  needs_section boolean not null default false
);

insert into public.school_levels (id, label_fr, label_ht, cycle, rank, has_exam, needs_section) values
  ('4e AF',  '4e année fondamentale', '4èm ane fondamantal', 'fondamental',  1, false, false),
  ('5e AF',  '5e année fondamentale', '5èm ane fondamantal', 'fondamental',  2, false, false),
  ('6e AF',  '6e année fondamentale', '6èm ane fondamantal', 'fondamental',  3, false, false),
  ('7e AF',  '7e année fondamentale', '7èm ane fondamantal', 'fondamental',  4, false, false),
  ('8e AF',  '8e année fondamentale', '8èm ane fondamantal', 'fondamental',  5, false, false),
  ('9e AF',  '9e année fondamentale', '9èm ane fondamantal', 'fondamental',  6, true,  false),
  ('NS I',   'Nouveau Secondaire 1',  'Nouvo Segondè 1',     'secondaire',   7, false, false),
  ('NS II',  'Nouveau Secondaire 2',  'Nouvo Segondè 2',     'secondaire',   8, false, false),
  ('NS III', 'Nouveau Secondaire 3',  'Nouvo Segondè 3',     'secondaire',   9, false, true),
  ('NS IV',  'Nouveau Secondaire 4',  'Nouvo Segondè 4',     'secondaire',  10, true,  true),
  ('Philo',  'Philo (secondaire traditionnel)', 'Filo (ansyen segondè)', 'secondaire', 11, true, false),
  ('Autre',  'Autre',                 'Lòt',                 'autre',       12, false, false);


-- ── Séries du Nouveau Secondaire ──────────────────────────────
-- Les quatre séries de l'examen d'État NS4, telles que le BUNEXE
-- les organise.
create table public.school_sections (
  id       text primary key,
  label_fr text not null,
  label_ht text not null,
  rank     integer not null
);

insert into public.school_sections (id, label_fr, label_ht, rank) values
  ('SMP', 'Sciences mathématiques et physiques', 'Syans matematik ak fizik', 1),
  ('SVT', 'Sciences de la vie et de la terre',   'Syans lavi ak tè',         2),
  ('SES', 'Sciences économiques et sociales',    'Syans ekonomik ak sosyal', 3),
  ('LLA', 'Lettres, langues et arts',            'Lèt, lang ak atizay',      4);


-- ── Un référentiel se lit, ne s'écrit jamais ──────────────────
alter table public.departements    enable row level security;
alter table public.communes        enable row level security;
alter table public.school_levels   enable row level security;
alter table public.school_sections enable row level security;

create policy departements_select    on public.departements    for select to authenticated using (true);
create policy communes_select        on public.communes        for select to authenticated using (true);
create policy school_levels_select   on public.school_levels   for select to authenticated using (true);
create policy school_sections_select on public.school_sections for select to authenticated using (true);

revoke insert, update, delete, truncate, references on public.departements    from anon, authenticated;
revoke insert, update, delete, truncate, references on public.communes        from anon, authenticated;
revoke insert, update, delete, truncate, references on public.school_levels   from anon, authenticated;
revoke insert, update, delete, truncate, references on public.school_sections from anon, authenticated;


-- ── Les écoles ────────────────────────────────────────────────
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 3 and 120),
  commune_id text not null references public.communes(id),
  type       text not null default 'autre'
             check (type in ('publique','privee','congreganiste','autre')),
  status     text not null default 'pending'
             check (status in ('approved','pending','rejected')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- Le nom seul n'identifie pas une école : il y a un « Collège
-- Saint-Joseph » dans plusieurs communes. C'est le couple
-- (commune, nom normalisé) qui est unique.
create unique index schools_unique_in_commune
  on public.schools (commune_id, public.norm_text(name));

-- Index trigramme : « petion » retrouve « Lycée Alexandre Pétion ».
-- Sur une connexion haïtienne, une recherche qui aboutit du premier
-- coup vaut mieux que trois allers-retours.
create index schools_name_trgm
  on public.schools using gin (public.norm_text(name) extensions.gin_trgm_ops);

-- Supprimer un compte met `created_by` à null sur ses écoles
-- proposées : sans index, Postgres parcourt toute la table.
create index schools_created_by_idx
  on public.schools (created_by) where created_by is not null;

alter table public.schools enable row level security;

-- On voit les écoles validées, et la sienne tant qu'elle attend
-- validation — sinon l'élève qui vient de la proposer ne la
-- retrouverait plus le lendemain.
create policy schools_select on public.schools
  for select to authenticated
  using (status = 'approved' or created_by = (select auth.uid()));

revoke insert, update, delete, truncate, references on public.schools from anon, authenticated;


-- ── Le profil scolaire ────────────────────────────────────────
alter table public.profiles
  add column school_id            uuid references public.schools(id) on delete set null,
  add column section              text references public.school_sections(id),
  add column commune_id           text references public.communes(id),
  add column role                 text not null default 'eleve'
                                  check (role in ('eleve','prof')),
  add column profile_completed_at timestamptz;

create index profiles_school_idx on public.profiles (school_id) where school_id is not null;


-- ── `role` ne se déclare pas, il s'accorde ────────────────────
--
-- Deux verrous, parce qu'un seul finit toujours par sauter.
--
-- Verrou 1 : les droits en colonnes. `authenticated` n'a plus le
-- droit d'écrire la colonne du tout — Postgres refuse avant même
-- que la RLS soit consultée.
--
-- ATTENTION, PIÈGE COÛTEUX : `id` DOIT figurer dans les droits
-- UPDATE. L'application enregistre le profil par un upsert, que
-- PostgREST traduit en `INSERT ... ON CONFLICT (id) DO UPDATE SET`
-- en reprenant TOUTES les colonnes envoyées, `id` compris. Sans ce
-- droit, tout l'enregistrement du profil tombe en 403. Ça ne
-- rouvre rien : la policy impose `WITH CHECK (auth.uid() = id)`,
-- un élève ne peut donc y remettre que son propre identifiant.
revoke insert, update on public.profiles from authenticated;

grant insert (id, name, lang, level, goal, favorites, theme, onboarded,
              board_alias, board_visible, updated_at,
              school_id, section, commune_id)
  on public.profiles to authenticated;

grant update (id, name, lang, level, goal, favorites, theme, onboarded,
              board_alias, board_visible, updated_at,
              school_id, section, commune_id)
  on public.profiles to authenticated;

-- Verrou 2 : un trigger, au cas où quelqu'un re-accorderait la
-- colonne par mégarde dans six mois.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role') then
    raise exception 'le role ne se modifie pas depuis le client';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

revoke execute on function public.guard_profile_role() from public, anon, authenticated;


-- ── Recherche d'école ─────────────────────────────────────────
create function public.search_schools(
  p_query      text default null,
  p_commune_id text default null
)
returns table (
  id uuid, name text, type text, status text,
  commune_id text, commune text, departement text
)
language sql
security definer
stable
set search_path to ''
as $$
  select s.id, s.name, s.type, s.status, s.commune_id, c.name, d.name
    from public.schools s
    join public.communes c     on c.id = s.commune_id
    join public.departements d on d.id = c.departement_id
   where (s.status = 'approved' or s.created_by = (select auth.uid()))
     and (p_commune_id is null or s.commune_id = p_commune_id)
     and public.norm_text(s.name) like '%' || public.norm_text(p_query) || '%'
   order by
     -- Ce qui COMMENCE par la recherche remonte en premier.
     case when public.norm_text(s.name) like public.norm_text(p_query) || '%'
          then 0 else 1 end,
     s.name
   limit 20;
$$;

revoke execute on function public.search_schools(text, text) from public, anon;
grant  execute on function public.search_schools(text, text) to authenticated;


-- ── Proposition d'école ───────────────────────────────────────
--
-- Renvoie un jsonb et non une table : en plpgsql, un `returns
-- table` crée des variables qui portent le nom des colonnes et
-- rendent toute requête ambiguë. Piège classique, évité ici.
create function public.propose_school(
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

  -- Si l'école existe déjà dans cette commune, on la RETOURNE au
  -- lieu d'en créer une deuxième. L'élève qui ne l'a pas trouvée
  -- avait sans doute écrit « lycee petion ». C'est exactement le
  -- doublon qu'on cherche à empêcher.
  select s.id into v_id
    from public.schools s
   where s.commune_id = p_commune_id
     and public.norm_text(s.name) = public.norm_text(v_name);

  if v_id is null then
    -- Trois propositions par jour : de quoi corriger une faute de
    -- frappe, pas de quoi remplir la table de bêtises. On réutilise
    -- usage_counters plutôt que d'inventer un compteur de plus.
    v_quota := public.bump_usage(uid, 'school_proposal', 3);
    if not (v_quota ->> 'allowed')::boolean then
      raise exception 'trop de propositions aujourd''hui, reessaie demain';
    end if;

    insert into public.schools (name, commune_id, type, created_by)
    values (v_name, p_commune_id, v_type, uid)
    returning schools.id into v_id;

    v_neuve := true;
  end if;

  return (
    select jsonb_build_object(
      'id',          s.id,
      'name',        s.name,
      'type',        s.type,
      'status',      s.status,
      'commune_id',  s.commune_id,
      'commune',     c.name,
      'departement', d.name,
      'created',     v_neuve
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
