// ═══════════════════════════════════════════════════════════════
//  PROGRAMME HAÏTIEN — liste des NOTIONS par matière et niveau.
//  ⚠️ Ce ne sont PAS des leçons : c'est le squelette qui permet
//  à l'IA de construire le parcours personnalisé de chaque élève.
// ═══════════════════════════════════════════════════════════════

import type { Lang } from '@/i18n';

export type Band = 'primaire' | 'college' | 'lycee';

export interface Topic {
  id: string;
  fr: string;
  ht: string;
}

/** Convertit la classe choisie en grande étape scolaire. */
export function bandOfLevel(level: string): Band {
  if (level.includes('NS') || level === 'Philo') return 'lycee';
  if (level.includes('7e') || level.includes('8e') || level.includes('9e')) return 'college';
  if (level.includes('4e') || level.includes('5e') || level.includes('6e')) return 'primaire';
  return 'college';
}

export const BAND_LABEL: Record<Band, Record<Lang, string>> = {
  primaire: { fr: 'Primaire', ht: 'Primè' },
  college: { fr: 'Secondaire (7e–9e AF)', ht: 'Segondè (7e–9e AF)' },
  lycee: { fr: 'Lycée (NS & Philo)', ht: 'Lise (NS ak Filo)' },
};

type Curriculum = Record<string, Record<Band, Topic[]>>;

export const CURRICULUM: Curriculum = {
  math: {
    primaire: [
      { id: 'nombres', fr: 'Les grands nombres', ht: 'Gwo chif yo' },
      { id: 'calcul', fr: 'Addition, soustraction, multiplication', ht: 'Adisyon, soustraksyon, miltiplikasyon' },
      { id: 'fractions', fr: 'Les fractions', ht: 'Fraksyon yo' },
      { id: 'geometrie', fr: 'Les figures géométriques', ht: 'Figi jeyometrik yo' },
      { id: 'mesures', fr: 'Les mesures (mètres, litres, gourdes)', ht: 'Mezi yo (mèt, lit, goud)' },
    ],
    college: [
      { id: 'fractions', fr: 'Opérations sur les fractions', ht: 'Kalkil ak fraksyon yo' },
      { id: 'pourcentage', fr: 'Les pourcentages', ht: 'Pousantaj yo' },
      { id: 'equations', fr: 'Les équations du premier degré', ht: 'Ekwasyon premye degre yo' },
      { id: 'pythagore', fr: 'Le théorème de Pythagore', ht: 'Teyorèm Pitagò' },
      { id: 'aires', fr: 'Aires et périmètres', ht: 'Sifas ak perimèt' },
      { id: 'puissances', fr: 'Les puissances', ht: 'Pisans yo' },
    ],
    lycee: [
      { id: 'second-degre', fr: 'Les équations du second degré', ht: 'Ekwasyon dezyèm degre yo' },
      { id: 'fonctions', fr: 'Les fonctions', ht: 'Fonksyon yo' },
      { id: 'suites', fr: 'Les suites numériques', ht: 'Swit nimerik yo' },
      { id: 'trigonometrie', fr: 'La trigonométrie', ht: 'Trigonometri' },
      { id: 'probabilites', fr: 'Les probabilités', ht: 'Pwobabilite yo' },
      { id: 'derivees', fr: 'Les dérivées', ht: 'Derive yo' },
    ],
  },

  histoire: {
    primaire: [
      { id: 'arawak', fr: 'Les premiers habitants d’Ayiti', ht: 'Premye moun ki te ladan Ayiti' },
      { id: '1492', fr: 'L’arrivée des Européens (1492)', ht: 'Ewopeyen yo rive (1492)' },
      { id: 'independance', fr: 'L’indépendance d’Haïti (1804)', ht: 'Endepandans Ayiti (1804)' },
      { id: 'heros', fr: 'Les héros de l’indépendance', ht: 'Ewo endepandans yo' },
      { id: 'drapeau', fr: 'Le drapeau haïtien (18 mai 1803)', ht: 'Drapo ayisyen an (18 me 1803)' },
    ],
    college: [
      { id: 'esclavage', fr: 'La colonie de Saint-Domingue et l’esclavage', ht: 'Koloni Sen Domeng ak esklavaj' },
      { id: 'revolution', fr: 'La Révolution haïtienne (1791–1804)', ht: 'Revolisyon ayisyen an (1791–1804)' },
      { id: 'vertieres', fr: 'La bataille de Vertières', ht: 'Batay Vètyè a' },
      { id: 'empire-royaume', fr: 'Empire du Nord, Royaume, République', ht: 'Anpi, Wwayòm ak Repiblik yo' },
      { id: 'occupation', fr: 'L’occupation américaine (1915–1934)', ht: 'Okipasyon amerikèn nan (1915–1934)' },
      { id: 'monde', fr: 'Les deux guerres mondiales', ht: 'De gè mondyal yo' },
    ],
    lycee: [
      { id: 'duvalier', fr: 'L’ère Duvalier (1957–1986)', ht: 'Epòk Divalye a (1957–1986)' },
      { id: 'apres86', fr: 'Haïti après 1986', ht: 'Ayiti apre 1986' },
      { id: 'relations', fr: 'Haïti et le monde', ht: 'Ayiti ak lemond' },
      { id: 'revolutions', fr: 'Révolutions comparées (France, USA, Haïti)', ht: 'Revolisyon yo konpare (Frans, USA, Ayiti)' },
      { id: 'economie-hist', fr: 'Histoire économique d’Haïti', ht: 'Istwa ekonomik Ayiti' },
    ],
  },

  svt: {
    primaire: [
      { id: 'corps', fr: 'Le corps humain', ht: 'Kò moun' },
      { id: 'plantes', fr: 'Les plantes', ht: 'Plant yo' },
      { id: 'animaux', fr: 'Les animaux', ht: 'Bèt yo' },
      { id: 'hygiene', fr: 'L’hygiène et la santé', ht: 'Ijyèn ak sante' },
      { id: 'alimentation', fr: 'L’alimentation', ht: 'Manje ak nitrisyon' },
    ],
    college: [
      { id: 'cellule', fr: 'La cellule', ht: 'Selil la' },
      { id: 'photosynthese', fr: 'La photosynthèse', ht: 'Fotosentèz la' },
      { id: 'respiration', fr: 'La respiration', ht: 'Respirasyon' },
      { id: 'digestion', fr: 'La digestion', ht: 'Dijesyon' },
      { id: 'reproduction', fr: 'La reproduction', ht: 'Repwodiksyon' },
      { id: 'ecosystemes', fr: 'Les écosystèmes', ht: 'Ekosistèm yo' },
    ],
    lycee: [
      { id: 'adn', fr: 'L’ADN et la génétique', ht: 'ADN ak jenetik' },
      { id: 'immunite', fr: 'Le système immunitaire', ht: 'Sistèm iminitè a' },
      { id: 'evolution', fr: 'L’évolution des espèces', ht: 'Evolisyon espès yo' },
      { id: 'geologie', fr: 'La géologie', ht: 'Jewoloji' },
    ],
  },

  francais: {
    primaire: [
      { id: 'lecture', fr: 'La lecture courante', ht: 'Lekti kouran' },
      { id: 'phrase', fr: 'La phrase (sujet et verbe)', ht: 'Fraz la (sijè ak vèb)' },
      { id: 'present', fr: 'Le présent de l’indicatif', ht: 'Prezan endikatif la' },
      { id: 'pluriel', fr: 'Le pluriel des noms', ht: 'Pliryèl non yo' },
    ],
    college: [
      { id: 'types-phrases', fr: 'Les types de phrases', ht: 'Tip fraz yo' },
      { id: 'temps', fr: 'Les temps de l’indicatif', ht: 'Tan endikatif yo' },
      { id: 'cod-coi', fr: 'COD et COI', ht: 'COD ak COI' },
      { id: 'accords', fr: 'Les accords (sujet-verbe, participe)', ht: 'Règ akò yo' },
      { id: 'expression', fr: 'L’expression écrite', ht: 'Ekspresyon ekri' },
    ],
    lycee: [
      { id: 'dissertation', fr: 'La dissertation', ht: 'Disèrtasyon an' },
      { id: 'argumentation', fr: 'L’argumentation', ht: 'Agimantasyon' },
      { id: 'figures', fr: 'Les figures de style', ht: 'Figi retorik yo' },
      { id: 'analyse', fr: 'L’analyse de texte', ht: 'Analiz tèks' },
    ],
  },

  anglais: {
    primaire: [
      { id: 'greetings', fr: 'Greetings & introductions', ht: 'Bonjou ak prezantasyon an anglè' },
      { id: 'numbers', fr: 'Numbers & colors', ht: 'Chif ak koulè an anglè' },
      { id: 'family', fr: 'Family & school words', ht: 'Mò fanmi ak lekòl an anglè' },
    ],
    college: [
      { id: 'be-have', fr: 'To be & to have', ht: 'Vèb “to be” ak “to have”' },
      { id: 'present-simple', fr: 'The present simple', ht: 'Prezan senp lan' },
      { id: 'questions', fr: 'Asking questions', ht: 'Kijan pou poze kesyon' },
      { id: 'past-simple', fr: 'The past simple', ht: 'Pase senp lan' },
      { id: 'vocabulary', fr: 'Everyday vocabulary', ht: 'Vokabilè tout jou' },
    ],
    lycee: [
      { id: 'present-perfect', fr: 'Present perfect', ht: 'Prezan pafè' },
      { id: 'conditionals', fr: 'Conditionals', ht: 'Kondisyonèl yo' },
      { id: 'passive', fr: 'The passive voice', ht: 'Vwa pasif la' },
      { id: 'essay', fr: 'Writing an essay', ht: 'Kijan pou ekri redaksyon an anglè' },
    ],
  },

  creole: {
    primaire: [
      { id: 'alfabe', fr: 'L’alphabet créole', ht: 'Alfabè kreyòl la' },
      { id: 'salitasyon', fr: 'Les salutations', ht: 'Salitasyon yo' },
      { id: 'vokabile', fr: 'Le vocabulaire de la famille', ht: 'Vokabilè fanmi' },
    ],
    college: [
      { id: 'otograf', fr: 'L’orthographe officielle', ht: 'Otograf ofisyèl la' },
      { id: 'fraz', fr: 'Construire des phrases correctes', ht: 'Konstwi fraz kòrèk' },
      { id: 'pwonverb', fr: 'Les proverbes haïtiens', ht: 'Pwovèb ayisyen yo' },
      { id: 'ekspresyon', fr: 'L’expression écrite en créole', ht: 'Ekspresyon ekri an kreyòl' },
    ],
    lycee: [
      { id: 'literati', fr: 'La littérature créole', ht: 'Literati kreyòl' },
      { id: 'redaksyon', fr: 'La rédaction en créole', ht: 'Redaksyon an kreyòl' },
      { id: 'tradiksyon', fr: 'Traduire français ↔ créole', ht: 'Tradwi franse ↔ kreyòl' },
    ],
  },

  geo: {
    primaire: [
      { id: 'haiti-carte', fr: 'La carte d’Haïti', ht: 'Kat Ayiti' },
      { id: 'departements', fr: 'Les 10 départements', ht: '10 depatman yo' },
      { id: 'klima', fr: 'Le climat en Haïti', ht: 'Klima nan Ayiti' },
    ],
    college: [
      { id: 'relief', fr: 'Le relief d’Haïti', ht: 'Relèf Ayiti' },
      { id: 'plaques', fr: 'Les plaques tectoniques et les séismes', ht: 'Plak tektonik yo ak tranblemanntè' },
      { id: 'caraibes', fr: 'Les Caraïbes', ht: 'Karayib yo' },
      { id: 'ressources', fr: 'Les ressources naturelles', ht: 'Resous natirèl yo' },
    ],
    lycee: [
      { id: 'mondialisation', fr: 'La mondialisation', ht: 'Mondyalizasyon' },
      { id: 'climat', fr: 'Le changement climatique', ht: 'Klima k ap chanje' },
      { id: 'population', fr: 'La population haïtienne', ht: 'Popilasyon ayisyen an' },
      { id: 'risques', fr: 'Les risques naturels', ht: 'Gwo danje natirèl yo' },
    ],
  },

  physique: {
    primaire: [
      { id: 'etats', fr: 'Les états de la matière', ht: 'Fòm matyè yo (solid, likid, gaz)' },
      { id: 'lumiere-intro', fr: 'La lumière et les ombres', ht: 'Limyè ak lonbraj' },
    ],
    college: [
      { id: 'forces', fr: 'Les forces', ht: 'Fòs yo' },
      { id: 'energie', fr: 'Les formes d’énergie', ht: 'Fòm enèji yo' },
      { id: 'electricite', fr: 'L’électricité simple', ht: 'Elektrisite debaz' },
      { id: 'son', fr: 'Le son', ht: 'Son an' },
      { id: 'lumiere', fr: 'La lumière', ht: 'Limyè a' },
    ],
    lycee: [
      { id: 'mecanique', fr: 'La mécanique (mouvement)', ht: 'Mekanik (mouvman)' },
      { id: 'circuits', fr: 'Les circuits électriques', ht: 'Sikwi elektrik yo' },
      { id: 'ondes', fr: 'Les ondes', ht: 'Vag yo' },
      { id: 'optique', fr: 'L’optique', ht: 'Òptik' },
    ],
  },

  chimie: {
    primaire: [
      { id: 'eau', fr: 'L’eau autour de nous', ht: 'Dlo nan lavi nou' },
      { id: 'melanges-intro', fr: 'Les mélanges de la cuisine', ht: 'Melanj nan kwizin lan' },
    ],
    college: [
      { id: 'atome', fr: 'L’atome', ht: 'Atòm lan' },
      { id: 'melanges', fr: 'Mélanges et corps purs', ht: 'Melanj ak kò pi' },
      { id: 'acides', fr: 'Acides et bases', ht: 'Asid ak baz' },
      { id: 'molecules', fr: 'Les molécules (H₂O, CO₂)', ht: 'Molekil yo (H₂O, CO₂)' },
    ],
    lycee: [
      { id: 'tableau', fr: 'Le tableau périodique', ht: 'Tablo peryodik la' },
      { id: 'liaisons', fr: 'Les liaisons chimiques', ht: 'Lyän chimik yo' },
      { id: 'oxydo', fr: 'L’oxydoréduction', ht: 'Oksidoreduksyon' },
      { id: 'orga', fr: 'La chimie organique', ht: 'Chimi òganik' },
    ],
  },

  info: {
    primaire: [
      { id: 'decouverte', fr: 'Découvrir l’ordinateur', ht: 'Dekouvri òdinatè a' },
      { id: 'internet-securite', fr: 'Internet en sécurité', ht: 'Itilize entènèt an sekirite' },
    ],
    college: [
      { id: 'fichiers', fr: 'Fichiers et dossiers', ht: 'Fichye ak dosye' },
      { id: 'recherche', fr: 'Chercher sur Internet', ht: 'Chèche sou entènèt' },
      { id: 'texte-tableur', fr: 'Traitement de texte et tableur', ht: 'Ekri dokiman ak itilize tablo' },
      { id: 'code-intro', fr: 'Premiers pas dans le code', ht: 'Premye pa nan pwogramasyon' },
    ],
    lycee: [
      { id: 'algorithmique', fr: 'L’algorithmique', ht: 'Algoritm yo' },
      { id: 'web', fr: 'Comment fonctionne le Web', ht: 'Kijan Web la mache' },
      { id: 'bases-programmation', fr: 'Les bases de la programmation', ht: 'Baz pwogramasyon' },
    ],
  },
};

/** Toutes les notions d'une matière pour un niveau donné. */
export function topicsFor(subjectId: string, level: string): Topic[] {
  const band = bandOfLevel(level);
  const byBand = CURRICULUM[subjectId];
  if (!byBand) return [];
  return byBand[band] ?? [];
}
