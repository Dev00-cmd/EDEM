-- ═══════════════════════════════════════════════════════════════
--  CLASSEMENT : PSEUDONYME ET RETRAIT
--
--  Le classement affichait le PRÉNOM de chaque élève à tous les
--  autres utilisateurs. Ce sont des mineurs, et personne ne leur
--  avait demandé leur avis : le classement est arrivé après leur
--  inscription.
--
--  Deux réglages, tous deux facultatifs :
--    board_alias    un pseudonyme affiché à la place du prénom
--    board_visible  apparaître ou non dans la liste publique
--
--  Le défaut reste « visible » : changer le comportement pour les
--  comptes existants les ferait disparaître d'un classement où ils
--  figurent déjà, sans explication.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists board_alias   text,
  add column if not exists board_visible boolean not null default true;

-- Un pseudonyme vide ou trop long n'a pas de sens, et une chaîne
-- de 300 caractères casserait la mise en page de la liste.
alter table public.profiles
  drop constraint if exists profiles_board_alias_len;
alter table public.profiles
  add constraint profiles_board_alias_len
  check (board_alias is null or char_length(btrim(board_alias)) between 2 and 24);


/**
 * Le classement public.
 *
 * Le rang est calculé sur TOUS les élèves, puis la liste est
 * filtrée. Un élève retiré laisse donc un trou dans la
 * numérotation, au lieu de décaler tous les autres : le rang
 * affiché reste celui que my_rank() annonce à chacun.
 */
create or replace function public.leaderboard(p_limit integer default 50)
returns table(rank integer, name text, xp integer, level integer, is_me boolean)
language sql
security definer
set search_path to ''
as $$
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
$$;
