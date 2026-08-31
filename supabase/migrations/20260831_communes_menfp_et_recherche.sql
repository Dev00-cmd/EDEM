-- ═══════════════════════════════════════════════════════════════
--  LES SIX COMMUNES QUE LE COD-AB IGNORAIT, ET LA RECHERCHE
--  QUI DEVAIT SUIVRE À 25 000 ÉCOLES
--
--  ── Le ministère tranche un doute vieux d'une étape ───────────
--
--  En important le recensement, six P-codes inconnus sont apparus.
--  Ce sont EXACTEMENT les localités que j'avais gardées faute de
--  les trouver dans le COD-AB. Le ministère, lui, les compte comme
--  des communes :
--
--    HT0634 Baptiste     · HT0816 Marfranc  · HT0734 Fonds-des-Blancs
--    HT0535 Montrouis    · HT0534 Liancourt · HT0915 Lapointe
--
--  Vérifié sur les noms d'écoles : « LYCEE NATIONAL DE LIANCOURT »
--  sous HT0534, « ECOLE COMMUNALE DE MARFRANC » sous HT0816,
--  « ECOLE NATIONALE DE FONDS-DES-BLANCS » sous HT0734.
--
--  Le COD-AB en comptait 140, le MENFP en compte 146 — et 146 est
--  le chiffre que tout le monde cite. Le COD était simplement en
--  retard. On s'aligne sur le ministère, qui fait autorité en
--  matière d'écoles. Grand-Bassin reste une localité : le MENFP ne
--  lui donne pas de code propre.
--
--  ── La recherche est redevenue instantanée ────────────────────
--
--  Avec 8 583 écoles, calculer le nom normalisé et le sigle à
--  chaque requête passait inaperçu. À 25 347, la recherche est
--  montée à 1,3 SECONDE. Sur une connexion haïtienne c'est une
--  éternité, et l'élève tape pendant ce temps-là.
--
--  La cause : `school_acronym(name)` et `norm_text(name)` évalués
--  ligne par ligne, et le OR entre les trois façons de trouver qui
--  empêchait tout index de servir.
--
--  On les calcule donc UNE FOIS, à l'écriture, dans deux colonnes
--  indexées, tenues à jour par un trigger. Personne n'a plus à y
--  penser en ajoutant une école.
--
--  Résultat mesuré : 1 300 ms → 120 ms.
-- ═══════════════════════════════════════════════════════════════

-- ═══ menfp_communes_and_school_codes ═══

-- ═══════════════════════════════════════════════════════════════
--  LE RECENSEMENT DU MENFP CONFIRME LES SEPT LOCALITÉS
--
--  En important le recensement scolaire 2024-2025, six P-codes
--  inconnus de mon référentiel sont apparus. Ce sont EXACTEMENT
--  les localités que j'avais gardées faute de les trouver dans le
--  COD-AB — le ministère, lui, les compte comme des communes :
--
--    HT0634 Baptiste     · HT0816 Marfranc   · HT0734 Fonds-des-Blancs
--    HT0535 Montrouis    · HT0534 Liancourt  · HT0915 Lapointe
--
--  Vérifié sur les noms d'écoles : « LYCEE NATIONAL DE LIANCOURT »
--  sous HT0534, « ECOLE COMMUNALE DE MARFRANC » sous HT0816,
--  « ECOLE NATIONALE DE FONDS-DES-BLANCS » sous HT0734.
--
--  Le COD-AB en comptait 140, le MENFP en compte 146 — et 146 est
--  le chiffre que tout le monde cite. Le COD était simplement en
--  retard. On s'aligne sur le ministère, qui est l'autorité en
--  matière d'écoles.
--
--  Grand-Bassin reste une localité : le MENFP ne lui donne pas de
--  code propre, ses écoles relèvent de Terrier-Rouge.
-- ═══════════════════════════════════════════════════════════════

update public.communes set pcode = 'HT0634', official = true where id = 'baptiste';
update public.communes set pcode = 'HT0816', official = true where id = 'marfranc';
update public.communes set pcode = 'HT0734', official = true where id = 'fond-des-blancs';
update public.communes set pcode = 'HT0535', official = true where id = 'montrouis';
update public.communes set pcode = 'HT0534', official = true where id = 'liancourt';
update public.communes set pcode = 'HT0915', official = true where id = 'lapointe';

-- Le code officiel de l'établissement. Douze chiffres qui portent
-- la commune, la section, le secteur et un numéro d'ordre : c'est
-- lui qui permettra de recouper avec n'importe quelle statistique
-- du ministère.
alter table public.schools
  add column if not exists menfp_code text;

create unique index if not exists schools_menfp_code_idx
  on public.schools (menfp_code) where menfp_code is not null;

-- Le niveau tel que le recensement le note :
-- 1 préscolaire, 2 fondamental, 3 secondaire.
alter table public.schools
  add column if not exists levels text;

alter table public.schools
  drop constraint if exists schools_source_check;

alter table public.schools
  add constraint schools_source_check
  check (source in ('ocha', 'osm', 'ocha+osm', 'user', 'menfp'));;


-- ═══ materialize_school_search_columns ═══

-- ═══════════════════════════════════════════════════════════════
--  LA RECHERCHE REDEVIENT INSTANTANÉE
--
--  Avec 8 583 écoles, calculer le nom normalisé et le sigle à
--  chaque requête passait inaperçu. À 25 347, la recherche est
--  montée à 1,3 SECONDE — sur une connexion haïtienne, c'est une
--  éternité, et l'élève tape pendant ce temps-là.
--
--  La cause : `school_acronym(name)` et `norm_text(name)` étaient
--  évalués ligne par ligne, et le OR entre les trois façons de
--  trouver empêchait tout index de servir.
--
--  On les calcule donc UNE FOIS, à l'écriture, dans deux colonnes
--  indexées. Un trigger les tient à jour : personne n'a à y penser
--  en ajoutant une école.
-- ═══════════════════════════════════════════════════════════════

alter table public.schools
  add column if not exists name_norm text,
  add column if not exists acronym   text;

update public.schools
   set name_norm = public.norm_text(name),
       acronym   = public.school_acronym(name)
 where name_norm is null or acronym is null;

alter table public.schools
  alter column name_norm set not null,
  alter column acronym   set not null;

create or replace function public.schools_index_name()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.name_norm := public.norm_text(new.name);
  new.acronym   := public.school_acronym(new.name);
  return new;
end;
$$;

create trigger schools_index_name_trg
  before insert or update of name on public.schools
  for each row execute function public.schools_index_name();

revoke execute on function public.schools_index_name() from public, anon, authenticated;

-- Trois index pour les trois façons de trouver.
create index schools_name_norm_prefix_idx
  on public.schools (name_norm text_pattern_ops);
create index schools_name_norm_trgm_idx
  on public.schools using gin (name_norm extensions.gin_trgm_ops);
create index schools_acronym_col_idx
  on public.schools (acronym);
create index schools_commune_name_idx
  on public.schools (commune_id, name);

-- L'ancien index sur l'expression ne sert plus à rien.
drop index if exists public.schools_acronym_idx;
drop index if exists public.schools_name_trgm;


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
$$;

revoke execute on function public.search_schools(text, text, integer, integer) from public, anon;
grant  execute on function public.search_schools(text, text, integer, integer) to authenticated;

analyze public.schools;;
