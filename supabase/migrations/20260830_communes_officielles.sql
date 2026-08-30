-- ═══════════════════════════════════════════════════════════════
--  LES ÉCOLES D'HAÏTI — référentiel réel
--
--  Jusqu'ici la table `schools` était vide : elle devait se
--  remplir par les propositions des élèves. C'est un mauvais
--  départ. Le premier élève qui cherche son école ne trouve rien,
--  doit la saisir lui-même, et l'écrit comme il veut — exactement
--  la fragmentation que le référentiel devait empêcher.
--
--  ── Les sources, et pourquoi celles-là ────────────────────────
--
--  1. OCHA Haïti — « Cartographie des institutions scolaires »,
--     2022. 4 122 écoles avec leur type (public / non public) et
--     le P-code officiel de leur commune. Ne couvre que quatre
--     départements : Sud, Ouest, Nippes et Grand'Anse — la zone du
--     séisme d'août 2021. Ce n'est PAS un recensement national,
--     contrairement à ce que son titre laisse croire.
--
--  2. HOT / OpenStreetMap — extrait national des établissements
--     d'enseignement, 6 août 2026. 7 362 entités, couverture
--     nationale, avec les limites administratives déjà jointes :
--     chaque école porte le P-code de sa commune, calculé par
--     recoupement géographique et non deviné.
--
--  Croisées et dédoublonnées sur (commune, nom normalisé), elles
--  donnent 8 585 écoles dans 131 des 140 communes. Neuf communes
--  rurales restent vides : Carice, Côtes-de-Fer, Marmelade,
--  Mont-Organisé, Perches, Plaisance, Pointe-à-Raquette,
--  Savanette, Vallières. Elles se rempliront par `propose_school`,
--  qui rend l'école existante au lieu d'en créer une seconde.
--
--  ── Ce que la vérification a corrigé ──────────────────────────
--
--  Le référentiel de communes avait été bâti sur deux extractions
--  Wikipédia divergentes. Confronté au COD-AB officiel (limites
--  administratives d'Haïti, version de janvier 2026), il révèle :
--
--    · « Les Arcadins » n'existe pas. Absente des 140 communes ET
--      des 570 sections communales. C'est un nom de côte.
--    · Montrouis était classée en Artibonite. C'est la 4e section
--      d'Arcahaie, donc dans l'Ouest.
--    · Sept orthographes divergeaient (Gonaives / Les Gonaïves,
--      Coteaux / Les Côteaux…). On garde le français correct, que
--      l'élève lit, et le P-code officiel, qui fait foi.
--
--  Le chiffre de 146 communes, partout cité, ne correspond pas au
--  référentiel officiel, qui en compte 140. On s'aligne sur le
--  COD-AB : c'est lui qui porte les P-codes, donc lui qui permet
--  de recouper avec les données du MENFP ou d'un recensement.
--
--  Les sept localités que les gens nomment spontanément (Montrouis,
--  Liancourt, Marfranc, Grand-Bassin, Lapointe, Fond-des-Blancs,
--  Baptiste) restent dans la liste, chacune rattachée au P-code de
--  sa commune officielle. Un élève qui dit « Montrouis » a raison ;
--  la statistique, elle, comptera Arcahaie.
--
--  Reproductible : scripts/dump_ecoles.mjs
-- ═══════════════════════════════════════════════════════════════

-- Chaque commune reçoit son P-code officiel (COD-AB, jan. 2026).
-- C'est lui qui permettra de recouper avec n'importe quelle autre
-- source haïtienne : recensement, statistiques du MENFP, données
-- humanitaires. Une localité porte le P-code de sa commune de
-- rattachement, avec official = false.
alter table public.communes
  add column if not exists pcode    text,
  add column if not exists official boolean not null default true;

update public.communes c
   set departement_id = v.dep,
       name           = v.name,
       pcode          = v.pcode,
       official       = v.official
  from (values
  ('abricots', 'grandanse', 'Abricots', 'HT0812', true),
  ('acul-du-nord', 'nord', 'Acul du Nord', 'HT0321', true),
  ('anse-a-foleur', 'nord-ouest', 'Anse-a-Foleur', 'HT0922', true),
  ('anse-a-pitres', 'sud-est', 'Anse-à-Pitres', 'HT0234', true),
  ('anse-a-veau', 'nippes', 'Anse-a-Veau', 'HT1021', true),
  ('anse-a-galets', 'ouest', 'Anse a Galets', 'HT0151', true),
  ('anse-d-hainault', 'grandanse', 'Anse d''Hainault', 'HT0821', true),
  ('anse-rouge', 'artibonite', 'Anse Rouge', 'HT0523', true),
  ('aquin', 'sud', 'Aquin', 'HT0731', true),
  ('arcahaie', 'ouest', 'Arcahaie', 'HT0141', true),
  ('arnaud', 'nippes', 'Arnaud', 'HT1024', true),
  ('arniquet', 'sud', 'Arniquet', 'HT0723', true),
  ('bahon', 'nord', 'Bahon', 'HT0332', true),
  ('baie-de-henne', 'nord-ouest', 'Baie de Henne', 'HT0932', true),
  ('bainet', 'sud-est', 'Bainet', 'HT0221', true),
  ('baraderes', 'nippes', 'Baraderes', 'HT1031', true),
  ('bas-limbe', 'nord', 'Bas Limbe', 'HT0362', true),
  ('bassin-bleu', 'nord-ouest', 'Bassin Bleu', 'HT0913', true),
  ('beaumont', 'grandanse', 'Beaumont', 'HT0833', true),
  ('belladere', 'centre', 'Belladere', 'HT0632', true),
  ('belle-anse', 'sud-est', 'Belle Anse', 'HT0231', true),
  ('bombardopolis', 'nord-ouest', 'Bombardopolis', 'HT0933', true),
  ('bonbon', 'grandanse', 'Bonbon', 'HT0813', true),
  ('borgne', 'nord', 'Borgne', 'HT0351', true),
  ('boucan-carre', 'centre', 'Boucan Carre', 'HT0623', true),
  ('cabaret', 'ouest', 'Cabaret', 'HT0142', true),
  ('camp-perrin', 'sud', 'Camp-Perrin', 'HT0714', true),
  ('cap-haitien', 'nord', 'Cap-Haitien', 'HT0311', true),
  ('capotille', 'nord-est', 'Capotille', 'HT0422', true),
  ('caracol', 'nord-est', 'Caracol', 'HT0434', true),
  ('carice', 'nord-est', 'Carice', 'HT0442', true),
  ('carrefour', 'ouest', 'Carrefour', 'HT0113', true),
  ('cavaillon', 'sud', 'Cavaillon', 'HT0733', true),
  ('cayes-jacmel', 'sud-est', 'Cayes-Jacmel', 'HT0213', true),
  ('cerca-carvajal', 'centre', 'Cerca Carvajal', 'HT0614', true),
  ('cerca-la-source', 'centre', 'Cerca La Source', 'HT0641', true),
  ('chambellan', 'grandanse', 'Chambellan', 'HT0815', true),
  ('chansolme', 'nord-ouest', 'Chansolme', 'HT0914', true),
  ('chantal', 'sud', 'Chantal', 'HT0713', true),
  ('chardonnieres', 'sud', 'Chardonnieres', 'HT0751', true),
  ('cite-soleil', 'ouest', 'Cite Soleil', 'HT0117', true),
  ('corail', 'grandanse', 'Corail', 'HT0831', true),
  ('cornillon', 'ouest', 'Cornillon', 'HT0134', true),
  ('les-coteaux', 'sud', 'Les Côteaux', 'HT0741', true),
  ('cotes-de-fer', 'sud-est', 'Cotes de Fer', 'HT0222', true),
  ('croix-des-bouquets', 'ouest', 'Croix-Des-Bouquets', 'HT0131', true),
  ('dame-marie', 'grandanse', 'Dame Marie', 'HT0822', true),
  ('delmas', 'ouest', 'Delmas', 'HT0112', true),
  ('desdunes', 'artibonite', 'Desdunes', 'HT0544', true),
  ('dessalines', 'artibonite', 'Dessalines', 'HT0541', true),
  ('dondon', 'nord', 'Dondon', 'HT0342', true),
  ('ennery', 'artibonite', 'Ennery', 'HT0512', true),
  ('ferrier', 'nord-est', 'Ferrier', 'HT0412', true),
  ('fonds-verrettes', 'ouest', 'Fonds-Verrettes', 'HT0135', true),
  ('fonds-des-negres', 'nippes', 'Fonds des Negres', 'HT1013', true),
  ('fort-liberte', 'nord-est', 'Fort-Liberte', 'HT0411', true),
  ('ganthier', 'ouest', 'Ganthier', 'HT0133', true),
  ('les-gonaives', 'artibonite', 'Les Gonaïves', 'HT0511', true),
  ('grand-boucan', 'nippes', 'Grand-Boucan', 'HT1032', true),
  ('grand-goave', 'ouest', 'Grand-Goave', 'HT0123', true),
  ('grand-gosier', 'sud-est', 'Grand Gosier', 'HT0232', true),
  ('grande-riviere-du-nord', 'nord', 'Grande Riviere Du Nord', 'HT0331', true),
  ('grande-saline', 'artibonite', 'Grande Saline', 'HT0543', true),
  ('gressier', 'ouest', 'Gressier', 'HT0116', true),
  ('gros-morne', 'artibonite', 'Gros Morne', 'HT0521', true),
  ('hinche', 'centre', 'Hinche', 'HT0611', true),
  ('ile-a-vache', 'sud', 'Ile a Vache', 'HT0716', true),
  ('jacmel', 'sud-est', 'Jacmel', 'HT0211', true),
  ('jean-rabel', 'nord-ouest', 'Jean Rabel', 'HT0934', true),
  ('jeremie', 'grandanse', 'Jeremie', 'HT0811', true),
  ('kenscoff', 'ouest', 'Kenscoff', 'HT0115', true),
  ('l-asile', 'nippes', 'L''Asile', 'HT1023', true),
  ('l-estere', 'artibonite', 'L''Estere', 'HT0513', true),
  ('la-chapelle', 'artibonite', 'La Chapelle', 'HT0533', true),
  ('la-tortue', 'nord-ouest', 'La Tortue', 'HT0912', true),
  ('la-vallee-de-jacmel', 'sud-est', 'La Vallée-de-Jacmel', 'HT0214', true),
  ('la-victoire', 'nord', 'La Victoire', 'HT0345', true),
  ('lascahobas', 'centre', 'Lascahobas', 'HT0631', true),
  ('leogane', 'ouest', 'Leogane', 'HT0121', true),
  ('les-anglais', 'sud', 'Les Anglais', 'HT0752', true),
  ('les-cayes', 'sud', 'Les Cayes', 'HT0711', true),
  ('les-irois', 'grandanse', 'Les Irois', 'HT0823', true),
  ('limbe', 'nord', 'Limbe', 'HT0361', true),
  ('limonade', 'nord', 'Limonade', 'HT0313', true),
  ('maissade', 'centre', 'Maissade', 'HT0612', true),
  ('maniche', 'sud', 'Maniche', 'HT0715', true),
  ('marigot', 'sud-est', 'Marigot', 'HT0212', true),
  ('marmelade', 'artibonite', 'Marmelade', 'HT0552', true),
  ('milot', 'nord', 'Milot', 'HT0323', true),
  ('miragoane', 'nippes', 'Miragoane', 'HT1011', true),
  ('mirebalais', 'centre', 'Mirebalais', 'HT0621', true),
  ('mole-saint-nicolas', 'nord-ouest', 'Mole Saint Nicolas', 'HT0931', true),
  ('mombin-crochu', 'nord-est', 'Mombin Crochu', 'HT0443', true),
  ('mont-organise', 'nord-est', 'Mont-Organise', 'HT0423', true),
  ('moron', 'grandanse', 'Moron', 'HT0814', true),
  ('ouanaminthe', 'nord-est', 'Ouanaminthe', 'HT0421', true),
  ('paillant', 'nippes', 'Paillant', 'HT1014', true),
  ('perches', 'nord-est', 'Perches', 'HT0413', true),
  ('pestel', 'grandanse', 'Pestel', 'HT0834', true),
  ('petion-ville', 'ouest', 'Petion-Ville', 'HT0114', true),
  ('petit-goave', 'ouest', 'Petit-Goave', 'HT0122', true),
  ('petit-trou-de-nippes', 'nippes', 'Petit Trou de Nippes', 'HT1022', true),
  ('petite-riviere-de-l-artibonite', 'artibonite', 'Petite Riviere de l''Artibonite', 'HT0542', true),
  ('petite-riviere-de-nippes', 'nippes', 'Petite Riviere de Nippes', 'HT1012', true),
  ('pignon', 'nord', 'Pignon', 'HT0344', true),
  ('pilate', 'nord', 'Pilate', 'HT0372', true),
  ('plaine-du-nord', 'nord', 'Plaine du Nord', 'HT0322', true),
  ('plaisance', 'nord', 'Plaisance', 'HT0371', true),
  ('plaisance-du-sud', 'nippes', 'Plaisance du Sud', 'HT1025', true),
  ('pointe-a-raquette', 'ouest', 'Pointe a Raquette', 'HT0152', true),
  ('port-a-piment', 'sud', 'Port-a-Piment', 'HT0742', true),
  ('port-au-prince', 'ouest', 'Port-au-Prince', 'HT0111', true),
  ('port-de-paix', 'nord-ouest', 'Port-de-Paix', 'HT0911', true),
  ('port-margot', 'nord', 'Port-Margot', 'HT0352', true),
  ('port-salut', 'sud', 'Port-Salut', 'HT0721', true),
  ('quartier-morin', 'nord', 'Quartier Morin', 'HT0312', true),
  ('ranquitte', 'nord', 'Ranquitte', 'HT0343', true),
  ('roche-a-bateaux', 'sud', 'Roche-à-Bateaux', 'HT0743', true),
  ('roseaux', 'grandanse', 'Roseaux', 'HT0832', true),
  ('saint-louis-du-nord', 'nord-ouest', 'Saint-Louis du Nord', 'HT0921', true),
  ('saint-marc', 'artibonite', 'Saint-Marc', 'HT0531', true),
  ('saint-michel-de-l-attalaye', 'artibonite', 'Saint-Michel de l''Attalaye', 'HT0551', true),
  ('saint-raphael', 'nord', 'Saint-Raphael', 'HT0341', true),
  ('saint-jean-du-sud', 'sud', 'Saint Jean du Sud', 'HT0722', true),
  ('saint-louis-du-sud', 'sud', 'Saint Louis du Sud', 'HT0732', true),
  ('sainte-suzanne', 'nord-est', 'Sainte Suzanne', 'HT0432', true),
  ('saut-d-eau', 'centre', 'Saut d''Eau', 'HT0622', true),
  ('savanette', 'centre', 'Savanette', 'HT0633', true),
  ('tabarre', 'ouest', 'Tabarre', 'HT0118', true),
  ('terre-neuve', 'artibonite', 'Terre Neuve', 'HT0522', true),
  ('terrier-rouge', 'nord-est', 'Terrier Rouge', 'HT0433', true),
  ('thiotte', 'sud-est', 'Thiotte', 'HT0233', true),
  ('thomassique', 'centre', 'Thomassique', 'HT0642', true),
  ('thomazeau', 'ouest', 'Thomazeau', 'HT0132', true),
  ('thomonde', 'centre', 'Thomonde', 'HT0613', true),
  ('tiburon', 'sud', 'Tiburon', 'HT0753', true),
  ('torbeck', 'sud', 'Torbeck', 'HT0712', true),
  ('trou-du-nord', 'nord-est', 'Trou du Nord', 'HT0431', true),
  ('vallieres', 'nord-est', 'Vallieres', 'HT0441', true),
  ('verrettes', 'artibonite', 'Verrettes', 'HT0532', true),
  ('liancourt', 'artibonite', 'Liancourt', 'HT0532', false),
  ('montrouis', 'ouest', 'Montrouis', 'HT0141', false),
  ('marfranc', 'grandanse', 'Marfranc', 'HT0811', false),
  ('grand-bassin', 'nord-est', 'Grand-Bassin', 'HT0433', false),
  ('lapointe', 'nord-ouest', 'Lapointe', 'HT0911', false),
  ('fond-des-blancs', 'sud', 'Fond-des-Blancs', 'HT0731', false),
  ('baptiste', 'centre', 'Baptiste', 'HT0632', false)
  ) as v(id, dep, name, pcode, official)
 where c.id = v.id;

-- « Les Arcadins » n'existe pas. C'est un nom de côte, absent des
-- 140 communes ET des 570 sections communales officielles. La
-- source Wikipédia se trompait.
delete from public.communes where id = 'les-arcadins';

alter table public.communes
  alter column pcode set not null;

create index communes_pcode_idx on public.communes (pcode);

-- Le P-code n'identifie pas une ligne à lui seul : sept localités
-- partagent celui de leur commune. C'est la commune officielle qui
-- est unique.
create unique index communes_pcode_officiel_idx
  on public.communes (pcode) where official;
-- D'où vient chaque école : utile le jour où il faudra faire le
-- ménage dans une source en particulier, ou mesurer la part que
-- les élèves ont eux-mêmes construite.
alter table public.schools
  add column if not exists source text not null default 'user'
  check (source in ('ocha', 'osm', 'ocha+osm', 'user'));
