-- ═══════════════════════════════════════════════════════════════
--  ÉCOLE NOUVELLE DE LA VALLÉE (ENV)
--
--  Appliqué le 1er septembre 2026.
--
--  Signalée comme absente du référentiel. Elle n'était pas absente :
--  elle était ILLISIBLE.
--
--  Le recensement MENFP la portait sous le nom « École Nouvelle de
--  la Vallee Go Garderie ». Les deux derniers mots ne font pas
--  partie du nom : c'est un résidu de l'extraction des PDF, où le
--  niveau scolaire de la ligne suivante s'est collé au nom.
--
--  Ce qui le prouve, plutôt que de le supposer :
--    · `menfp_code` = 021490205818, un code d'établissement à douze
--      chiffres, donc une vraie école du recensement ;
--    · `levels` = « 2,3 » — fondamental. Une garderie n'aurait pas
--      ces niveaux.
--
--  CONSÉQUENCE PRATIQUE : le sigle calculé était `envgg`. Un
--  professeur qui tape « ENV » — c'est ainsi qu'on la désigne — ne
--  la trouvait pas. Le nom nettoyé, le trigger `schools_index_name`
--  recalcule `env`, et la recherche la sort.
--
--  ON NE CRÉE PAS DE DOUBLON. C'est tout l'intérêt d'un référentiel :
--  ajouter une seconde « École Nouvelle de la Vallée » aurait donné
--  deux écoles pour un seul établissement, et deux classes qui ne se
--  seraient jamais rencontrées.
-- ═══════════════════════════════════════════════════════════════

update public.schools
   set name = 'École Nouvelle de la Vallée'
 where menfp_code = '021490205818'
   and commune_id = 'la-vallee-de-jacmel';

-- Vérification, à relire après application :
--
--   select name, acronym from public.schools
--    where menfp_code = '021490205818';
--   → « École Nouvelle de la Vallée », acronym « env »
--
--   select name, commune from public.search_schools('env', 'la-vallee-de-jacmel', 0, 5);
--   → l'école apparaît au 2e rang
--
--  ── CE QU'IL RESTE, ET QUI N'EST PAS FAIT ICI ────────────────
--
--  Le même défaut d'extraction touche d'autres lignes :
--    · 144 écoles dont le nom répète « École Nationale » ;
--    ·   3 dont le nom garde un guillemet orphelin.
--
--  Elles ne sont PAS corrigées par cette migration. Réécrire en
--  masse 147 noms venus du ministère demande de vérifier chaque cas
--  contre la source, pas un `regexp_replace` lancé de confiance :
--  « École Nationale Congreganiste Saint Paul Am École Nationale »
--  n'a pas la même forme que « École Congreganiste Sainte Rose de
--  Lima École Nationale », et une expression trop gourmande
--  amputerait de vrais noms.
--
--  C'est un chantier à part, à mener avec les PDF sous les yeux.
