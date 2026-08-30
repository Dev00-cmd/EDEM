// ═══════════════════════════════════════════════════════════════
//  RÉFÉRENTIEL SCOLAIRE HAÏTIEN
//
//  FICHIER GÉNÉRÉ — ne le modifie pas à la main.
//    node scripts/dump_referentiel.mjs
//
//  La source de vérité est la base : ce sont ses clés étrangères
//  qui refusent une commune ou une série inventée. Ce fichier n'en
//  est qu'une copie embarquée, pour que l'élève n'ait pas à payer
//  le téléchargement d'une liste qui ne change jamais.
// ═══════════════════════════════════════════════════════════════

export interface Departement {
  id: string;
  name: string;
}

export interface Commune {
  id: string;
  name: string;
  departementId: string;
}

/** Niveau scolaire. `id` est la valeur écrite dans profiles.level. */
export interface SchoolLevel {
  id: string;
  labelFr: string;
  labelHt: string;
  cycle: 'fondamental' | 'secondaire' | 'autre';
  /** Année qui se termine par un examen d'État. */
  hasExam: boolean;
  /** Année où l'élève a déjà choisi sa série. */
  needsSection: boolean;
}

/** Série du Nouveau Secondaire, choisie à l'entrée en NS3. */
export interface SchoolSection {
  id: string;
  labelFr: string;
  labelHt: string;
}

// Classés par nombre d'élèves scolarisés : dans une liste sur un
// téléphone, ce qui compte est que la bonne réponse soit en haut.
export const DEPARTEMENTS: Departement[] = [
  { id: "ouest", name: "Ouest" },
  { id: "artibonite", name: "Artibonite" },
  { id: "nord", name: "Nord" },
  { id: "sud", name: "Sud" },
  { id: "centre", name: "Centre" },
  { id: "nord-ouest", name: "Nord-Ouest" },
  { id: "sud-est", name: "Sud-Est" },
  { id: "nord-est", name: "Nord-Est" },
  { id: "grandanse", name: "Grand'Anse" },
  { id: "nippes", name: "Nippes" },
];

export const COMMUNES: Commune[] = [
  { id: "anse-rouge", name: "Anse-Rouge", departementId: "artibonite" },
  { id: "desdunes", name: "Desdunes", departementId: "artibonite" },
  { id: "dessalines", name: "Dessalines", departementId: "artibonite" },
  { id: "ennery", name: "Ennery", departementId: "artibonite" },
  { id: "grande-saline", name: "Grande-Saline", departementId: "artibonite" },
  { id: "gros-morne", name: "Gros-Morne", departementId: "artibonite" },
  { id: "l-estere", name: "L'Estère", departementId: "artibonite" },
  { id: "la-chapelle", name: "La Chapelle", departementId: "artibonite" },
  { id: "les-arcadins", name: "Les Arcadins", departementId: "artibonite" },
  { id: "les-gonaives", name: "Les Gonaïves", departementId: "artibonite" },
  { id: "liancourt", name: "Liancourt", departementId: "artibonite" },
  { id: "marmelade", name: "Marmelade", departementId: "artibonite" },
  { id: "montrouis", name: "Montrouis", departementId: "artibonite" },
  { id: "petite-riviere-de-l-artibonite", name: "Petite-Rivière-de-l'Artibonite", departementId: "artibonite" },
  { id: "saint-marc", name: "Saint-Marc", departementId: "artibonite" },
  { id: "saint-michel-de-l-attalaye", name: "Saint-Michel-de-l'Attalaye", departementId: "artibonite" },
  { id: "terre-neuve", name: "Terre-Neuve", departementId: "artibonite" },
  { id: "verrettes", name: "Verrettes", departementId: "artibonite" },
  { id: "baptiste", name: "Baptiste", departementId: "centre" },
  { id: "belladere", name: "Belladère", departementId: "centre" },
  { id: "boucan-carre", name: "Boucan-Carré", departementId: "centre" },
  { id: "cerca-carvajal", name: "Cerca-Carvajal", departementId: "centre" },
  { id: "cerca-la-source", name: "Cerca-la-Source", departementId: "centre" },
  { id: "hinche", name: "Hinche", departementId: "centre" },
  { id: "lascahobas", name: "Lascahobas", departementId: "centre" },
  { id: "maissade", name: "Maïssade", departementId: "centre" },
  { id: "mirebalais", name: "Mirebalais", departementId: "centre" },
  { id: "saut-d-eau", name: "Saut-d'Eau", departementId: "centre" },
  { id: "savanette", name: "Savanette", departementId: "centre" },
  { id: "thomassique", name: "Thomassique", departementId: "centre" },
  { id: "thomonde", name: "Thomonde", departementId: "centre" },
  { id: "abricots", name: "Abricots", departementId: "grandanse" },
  { id: "anse-d-hainault", name: "Anse-d'Hainault", departementId: "grandanse" },
  { id: "beaumont", name: "Beaumont", departementId: "grandanse" },
  { id: "bonbon", name: "Bonbon", departementId: "grandanse" },
  { id: "chambellan", name: "Chambellan", departementId: "grandanse" },
  { id: "corail", name: "Corail", departementId: "grandanse" },
  { id: "dame-marie", name: "Dame-Marie", departementId: "grandanse" },
  { id: "jeremie", name: "Jérémie", departementId: "grandanse" },
  { id: "les-irois", name: "Les Irois", departementId: "grandanse" },
  { id: "marfranc", name: "Marfranc", departementId: "grandanse" },
  { id: "moron", name: "Moron", departementId: "grandanse" },
  { id: "pestel", name: "Pestel", departementId: "grandanse" },
  { id: "roseaux", name: "Roseaux", departementId: "grandanse" },
  { id: "anse-a-veau", name: "Anse-à-Veau", departementId: "nippes" },
  { id: "arnaud", name: "Arnaud", departementId: "nippes" },
  { id: "baraderes", name: "Baradères", departementId: "nippes" },
  { id: "fonds-des-negres", name: "Fonds-des-Nègres", departementId: "nippes" },
  { id: "grand-boucan", name: "Grand-Boucan", departementId: "nippes" },
  { id: "l-asile", name: "L'Asile", departementId: "nippes" },
  { id: "miragoane", name: "Miragoâne", departementId: "nippes" },
  { id: "paillant", name: "Paillant", departementId: "nippes" },
  { id: "petit-trou-de-nippes", name: "Petit-Trou-de-Nippes", departementId: "nippes" },
  { id: "petite-riviere-de-nippes", name: "Petite-Rivière-de-Nippes", departementId: "nippes" },
  { id: "plaisance-du-sud", name: "Plaisance-du-Sud", departementId: "nippes" },
  { id: "acul-du-nord", name: "Acul-du-Nord", departementId: "nord" },
  { id: "bahon", name: "Bahon", departementId: "nord" },
  { id: "bas-limbe", name: "Bas-Limbé", departementId: "nord" },
  { id: "borgne", name: "Borgne", departementId: "nord" },
  { id: "cap-haitien", name: "Cap-Haïtien", departementId: "nord" },
  { id: "dondon", name: "Dondon", departementId: "nord" },
  { id: "grande-riviere-du-nord", name: "Grande-Rivière-du-Nord", departementId: "nord" },
  { id: "la-victoire", name: "La Victoire", departementId: "nord" },
  { id: "limbe", name: "Limbé", departementId: "nord" },
  { id: "limonade", name: "Limonade", departementId: "nord" },
  { id: "milot", name: "Milot", departementId: "nord" },
  { id: "pignon", name: "Pignon", departementId: "nord" },
  { id: "pilate", name: "Pilate", departementId: "nord" },
  { id: "plaine-du-nord", name: "Plaine-du-Nord", departementId: "nord" },
  { id: "plaisance", name: "Plaisance", departementId: "nord" },
  { id: "port-margot", name: "Port-Margot", departementId: "nord" },
  { id: "quartier-morin", name: "Quartier-Morin", departementId: "nord" },
  { id: "ranquitte", name: "Ranquitte", departementId: "nord" },
  { id: "saint-raphael", name: "Saint-Raphaël", departementId: "nord" },
  { id: "capotille", name: "Capotille", departementId: "nord-est" },
  { id: "caracol", name: "Caracol", departementId: "nord-est" },
  { id: "carice", name: "Carice", departementId: "nord-est" },
  { id: "ferrier", name: "Ferrier", departementId: "nord-est" },
  { id: "fort-liberte", name: "Fort-Liberté", departementId: "nord-est" },
  { id: "grand-bassin", name: "Grand-Bassin", departementId: "nord-est" },
  { id: "mombin-crochu", name: "Mombin-Crochu", departementId: "nord-est" },
  { id: "mont-organise", name: "Mont-Organisé", departementId: "nord-est" },
  { id: "ouanaminthe", name: "Ouanaminthe", departementId: "nord-est" },
  { id: "perches", name: "Perches", departementId: "nord-est" },
  { id: "sainte-suzanne", name: "Sainte-Suzanne", departementId: "nord-est" },
  { id: "terrier-rouge", name: "Terrier-Rouge", departementId: "nord-est" },
  { id: "trou-du-nord", name: "Trou-du-Nord", departementId: "nord-est" },
  { id: "vallieres", name: "Vallières", departementId: "nord-est" },
  { id: "anse-a-foleur", name: "Anse-à-Foleur", departementId: "nord-ouest" },
  { id: "baie-de-henne", name: "Baie-de-Henne", departementId: "nord-ouest" },
  { id: "bassin-bleu", name: "Bassin-Bleu", departementId: "nord-ouest" },
  { id: "bombardopolis", name: "Bombardopolis", departementId: "nord-ouest" },
  { id: "chansolme", name: "Chansolme", departementId: "nord-ouest" },
  { id: "jean-rabel", name: "Jean-Rabel", departementId: "nord-ouest" },
  { id: "la-tortue", name: "La Tortue", departementId: "nord-ouest" },
  { id: "lapointe", name: "Lapointe", departementId: "nord-ouest" },
  { id: "mole-saint-nicolas", name: "Môle-Saint-Nicolas", departementId: "nord-ouest" },
  { id: "port-de-paix", name: "Port-de-Paix", departementId: "nord-ouest" },
  { id: "saint-louis-du-nord", name: "Saint-Louis-du-Nord", departementId: "nord-ouest" },
  { id: "anse-a-galets", name: "Anse-à-Galets", departementId: "ouest" },
  { id: "arcahaie", name: "Arcahaie", departementId: "ouest" },
  { id: "cabaret", name: "Cabaret", departementId: "ouest" },
  { id: "carrefour", name: "Carrefour", departementId: "ouest" },
  { id: "cite-soleil", name: "Cité Soleil", departementId: "ouest" },
  { id: "cornillon", name: "Cornillon", departementId: "ouest" },
  { id: "croix-des-bouquets", name: "Croix-des-Bouquets", departementId: "ouest" },
  { id: "delmas", name: "Delmas", departementId: "ouest" },
  { id: "fonds-verrettes", name: "Fonds-Verrettes", departementId: "ouest" },
  { id: "ganthier", name: "Ganthier", departementId: "ouest" },
  { id: "grand-goave", name: "Grand-Goâve", departementId: "ouest" },
  { id: "gressier", name: "Gressier", departementId: "ouest" },
  { id: "kenscoff", name: "Kenscoff", departementId: "ouest" },
  { id: "leogane", name: "Léogâne", departementId: "ouest" },
  { id: "petion-ville", name: "Pétion-Ville", departementId: "ouest" },
  { id: "petit-goave", name: "Petit-Goâve", departementId: "ouest" },
  { id: "pointe-a-raquette", name: "Pointe-à-Raquette", departementId: "ouest" },
  { id: "port-au-prince", name: "Port-au-Prince", departementId: "ouest" },
  { id: "tabarre", name: "Tabarre", departementId: "ouest" },
  { id: "thomazeau", name: "Thomazeau", departementId: "ouest" },
  { id: "aquin", name: "Aquin", departementId: "sud" },
  { id: "arniquet", name: "Arniquet", departementId: "sud" },
  { id: "camp-perrin", name: "Camp-Perrin", departementId: "sud" },
  { id: "cavaillon", name: "Cavaillon", departementId: "sud" },
  { id: "chantal", name: "Chantal", departementId: "sud" },
  { id: "chardonnieres", name: "Chardonnières", departementId: "sud" },
  { id: "fond-des-blancs", name: "Fond-des-Blancs", departementId: "sud" },
  { id: "ile-a-vache", name: "Île-à-Vache", departementId: "sud" },
  { id: "les-anglais", name: "Les Anglais", departementId: "sud" },
  { id: "les-cayes", name: "Les Cayes", departementId: "sud" },
  { id: "les-coteaux", name: "Les Côteaux", departementId: "sud" },
  { id: "maniche", name: "Maniche", departementId: "sud" },
  { id: "port-a-piment", name: "Port-à-Piment", departementId: "sud" },
  { id: "port-salut", name: "Port-Salut", departementId: "sud" },
  { id: "roche-a-bateaux", name: "Roche-à-Bateaux", departementId: "sud" },
  { id: "saint-jean-du-sud", name: "Saint-Jean-du-Sud", departementId: "sud" },
  { id: "saint-louis-du-sud", name: "Saint-Louis-du-Sud", departementId: "sud" },
  { id: "tiburon", name: "Tiburon", departementId: "sud" },
  { id: "torbeck", name: "Torbeck", departementId: "sud" },
  { id: "anse-a-pitres", name: "Anse-à-Pitres", departementId: "sud-est" },
  { id: "bainet", name: "Bainet", departementId: "sud-est" },
  { id: "belle-anse", name: "Belle-Anse", departementId: "sud-est" },
  { id: "cayes-jacmel", name: "Cayes-Jacmel", departementId: "sud-est" },
  { id: "cotes-de-fer", name: "Côtes-de-Fer", departementId: "sud-est" },
  { id: "grand-gosier", name: "Grand-Gosier", departementId: "sud-est" },
  { id: "jacmel", name: "Jacmel", departementId: "sud-est" },
  { id: "la-vallee-de-jacmel", name: "La Vallée-de-Jacmel", departementId: "sud-est" },
  { id: "marigot", name: "Marigot", departementId: "sud-est" },
  { id: "thiotte", name: "Thiotte", departementId: "sud-est" },
];

export const SCHOOL_LEVELS: SchoolLevel[] = [
  { id: "4e AF", labelFr: "4e année fondamentale", labelHt: "4èm ane fondamantal", cycle: "fondamental", hasExam: false, needsSection: false },
  { id: "5e AF", labelFr: "5e année fondamentale", labelHt: "5èm ane fondamantal", cycle: "fondamental", hasExam: false, needsSection: false },
  { id: "6e AF", labelFr: "6e année fondamentale", labelHt: "6èm ane fondamantal", cycle: "fondamental", hasExam: false, needsSection: false },
  { id: "7e AF", labelFr: "7e année fondamentale", labelHt: "7èm ane fondamantal", cycle: "fondamental", hasExam: false, needsSection: false },
  { id: "8e AF", labelFr: "8e année fondamentale", labelHt: "8èm ane fondamantal", cycle: "fondamental", hasExam: false, needsSection: false },
  { id: "9e AF", labelFr: "9e année fondamentale", labelHt: "9èm ane fondamantal", cycle: "fondamental", hasExam: true, needsSection: false },
  { id: "NS I", labelFr: "Nouveau Secondaire 1", labelHt: "Nouvo Segondè 1", cycle: "secondaire", hasExam: false, needsSection: false },
  { id: "NS II", labelFr: "Nouveau Secondaire 2", labelHt: "Nouvo Segondè 2", cycle: "secondaire", hasExam: false, needsSection: false },
  { id: "NS III", labelFr: "Nouveau Secondaire 3", labelHt: "Nouvo Segondè 3", cycle: "secondaire", hasExam: false, needsSection: true },
  { id: "NS IV", labelFr: "Nouveau Secondaire 4", labelHt: "Nouvo Segondè 4", cycle: "secondaire", hasExam: true, needsSection: true },
  { id: "Philo", labelFr: "Philo (secondaire traditionnel)", labelHt: "Filo (ansyen segondè)", cycle: "secondaire", hasExam: true, needsSection: false },
  { id: "Autre", labelFr: "Autre", labelHt: "Lòt", cycle: "autre", hasExam: false, needsSection: false },
];

export const SCHOOL_SECTIONS: SchoolSection[] = [
  { id: "SMP", labelFr: "Sciences mathématiques et physiques", labelHt: "Syans matematik ak fizik" },
  { id: "SVT", labelFr: "Sciences de la vie et de la terre", labelHt: "Syans lavi ak tè" },
  { id: "SES", labelFr: "Sciences économiques et sociales", labelHt: "Syans ekonomik ak sosyal" },
  { id: "LLA", labelFr: "Lettres, langues et arts", labelHt: "Lèt, lang ak atizay" },
];

// ── Accès ─────────────────────────────────────────────────────

const PAR_ID = new Map(COMMUNES.map((c) => [c.id, c]));

/** Les communes d'un département, déjà triées. */
export const communesOf = (departementId: string): Commune[] =>
  COMMUNES.filter((c) => c.departementId === departementId);

export const communeById = (id: string | null | undefined): Commune | null =>
  (id ? PAR_ID.get(id) ?? null : null);

/**
 * Le département se DÉDUIT de la commune : c'est une question de
 * moins à poser, et une incohérence de moins à craindre. Personne
 * ne pourra être « à Jacmel, dans l'Artibonite ».
 */
export const departementOf = (communeId: string | null | undefined): Departement | null => {
  const commune = communeById(communeId);
  if (!commune) return null;
  return DEPARTEMENTS.find((d) => d.id === commune.departementId) ?? null;
};

export const levelById = (id: string): SchoolLevel | null =>
  SCHOOL_LEVELS.find((l) => l.id === id) ?? null;

/** L'élève de ce niveau a-t-il déjà une série à déclarer ? */
export const levelNeedsSection = (id: string): boolean =>
  levelById(id)?.needsSection ?? false;
