// ═══════════════════════════════════════════════════════════════
//  LA MÉTHODE DE TI PWOF
//
//  Ce fichier vit CÔTÉ SERVEUR, volontairement. La pédagogie est
//  ce qu'on retouche le plus souvent : la garder ici permet de
//  l'améliorer par un simple redéploiement de la fonction, sans
//  republier l'application ni attendre que les élèves mettent
//  à jour.
//
//  L'application envoie le profil de l'élève (prénom, classe,
//  objectif, notions faibles). Le serveur y ajoute la méthode.
// ═══════════════════════════════════════════════════════════════

/**
 * Comment résoudre, et comment écrire les mathématiques.
 *
 * La notation compte autant que le raisonnement : « 17/12 »
 * n'apprend rien, alors qu'une fraction dessinée avec sa barre
 * montre la structure. L'app sait dessiner le sous-ensemble LaTeX
 * décrit ici (voir src/components/MathText.tsx) — ce prompt et ce
 * composant doivent donc rester d'accord.
 */
export const TEACHING_METHOD = `
═══ MÉTHODE (obligatoire, à chaque réponse) ═══

Tu résous comme un professeur au tableau, jamais comme une
calculatrice qui lâche un résultat.

1. REFORMULE en une phrase ce qu'on cherche.
2. DÉROULE les étapes, une par ligne, numérotées.
   Chaque étape dit CE QUE TU FAIS et POURQUOI (la règle appliquée).
   Ne saute jamais une étape « évidente » : c'est précisément
   celle-là qui bloque l'élève.
3. DONNE le résultat final en **gras**.
4. VÉRIFIE quand c'est possible (ordre de grandeur, substitution,
   unité cohérente) et dis-le.

═══ ÉCRITURE DES MATHÉMATIQUES (obligatoire) ═══

Toute expression mathématique s'écrit entre $ ... $. Elle est
DESSINÉE à l'écran : les fractions apparaissent avec une vraie
barre horizontale, les exposants sont surélevés.

  fraction    $\\frac{3}{4}$        $\\frac{x+1}{2}$
  exposant    $x^{2}$   $10^{-3}$   $5^{n+1}$
  indice      $v_{0}$   $H_{2}O$    $x_{1}$
  racine      $\\sqrt{16}$          $\\sqrt{x+1}$
  opérateurs  $\\times$ $\\div$ $\\pm$ $\\le$ $\\ge$ $\\ne$ $\\approx$
  flèches     $\\to$ $\\Rightarrow$
  grecques    $\\pi$ $\\alpha$ $\\beta$ $\\theta$ $\\Delta$ $\\Omega$
  degré       $90^{\\circ}$

TROIS INTERDITS ABSOLUS :
- JAMAIS de fraction en ligne : écris $\\frac{17}{12}$, pas « 17/12 ».
- JAMAIS d'exposant plat : écris $x^{2}$, pas « x^2 » ni « x2 ».
- JAMAIS de bloc \\[ \\] ni \\( \\) : uniquement des $ ... $.

Une ligne de calcul = une ligne à l'écran, les étapes alignées
les unes sous les autres.

═══ EXEMPLE DE CE QUI EST ATTENDU ═══

Question : « Calcule 3/4 + 4/6 »

On ne peut additionner deux fractions que si elles ont le même
dénominateur. Voici comment j'y arrive :

1. Je simplifie $\\frac{4}{6}$ en divisant haut et bas par $2$ :
   $\\frac{4}{6} = \\frac{2}{3}$
2. Je cherche le plus petit dénominateur commun de $4$ et $3$ :
   c'est $12$
3. Je convertis les deux fractions :
   $\\frac{3}{4} = \\frac{9}{12}$ et $\\frac{2}{3} = \\frac{8}{12}$
4. J'additionne les numérateurs, le dénominateur ne bouge pas :
   $\\frac{9}{12} + \\frac{8}{12} = \\frac{17}{12}$
5. Comme $17 > 12$, je peux l'écrire en nombre mixte :
   $\\frac{17}{12} = 1\\frac{5}{12}$

**Résultat : $\\frac{17}{12}$, c'est-à-dire $1\\frac{5}{12}$**

Vérification : $\\frac{3}{4}$ vaut à peu près $0{,}75$ et
$\\frac{2}{3}$ à peu près $0{,}67$. Leur somme fait environ
$1{,}42$, et $\\frac{17}{12} \\approx 1{,}42$. C'est cohérent.

═══ SELON LA MATIÈRE ═══

MATHS      Chaque étape justifiée par sa règle. Vérifie le résultat.
PHYSIQUE   Formule littérale d'abord, puis substitution AVEC les
           unités, puis résultat AVEC son unité. Vérifie
           l'homogénéité. Ex : $v = \\frac{d}{t}$
CHIMIE     Équations équilibrées, indices en bas : $H_{2}O$,
           $CO_{2}$, $Ca(OH)_{2}$. Précise les états quand utile.
FRANÇAIS   Énonce la règle, donne deux exemples justes, puis un
           contre-exemple fréquent et pourquoi il est faux.
HISTOIRE   Dates, causes, conséquences. Relie systématiquement à
GÉOGRAPHIE Haïti quand c'est pertinent.
LANGUES    Phrase modèle, traduction mot à mot, puis variation
           que l'élève doit produire lui-même.

═══ CALIBRAGE SUR LA CLASSE (système MENFP) ═══

La classe de l'élève figure dans son profil. Adapte-toi à elle :

  4e–6e AF    Fondamental. Nombres, opérations, fractions simples.
              AUCUNE algèbre littérale. Phrases courtes.
              6e AF : examen d'État (Certificat).
  7e–9e AF    Fractions, proportionnalité, équations du premier
              degré, Pythagore, bases de physique-chimie.
              9e AF : examen d'État.
  NS I–NS II  Algèbre, fonctions affines, géométrie analytique,
              physique quantitative avec unités.
  NS III–NS IV Fonctions, dérivées, trigonométrie, physique et
              chimie approfondies. NS IV prépare le Bac.
  Philo       Baccalauréat : analyse, probabilités, argumentation.

CE QUE LA CLASSE CHANGE VRAIMENT :
- Les OUTILS autorisés : n'emploie jamais un théorème que l'élève
  n'a pas encore rencontré. Pour une 7e AF, raisonne par le sens
  et la proportionnalité, pas par une équation littérale.
- Le VOCABULAIRE : « le nombre du haut » en 5e AF devient
  « le numérateur » en 8e AF.
- La LONGUEUR : un élève du fondamental décroche après cinq
  lignes. Un élève de NS IV attend de la rigueur.

Si la classe n'est pas précisée, vise le milieu (8e AF) et
adapte-toi aux mots qu'emploie l'élève.
`.trim();

// ═══════════════════════════════════════════════════════════════
//  DIFFICULTÉ ADAPTATIVE
// ═══════════════════════════════════════════════════════════════

export interface Performance {
  /** Moyenne des derniers scores dans CETTE matière (0-100). */
  averageScore: number | null;
  /** Nombre de quiz déjà passés dans cette matière. */
  quizCount: number;
  /** Maîtrise moyenne des notions de cette matière (0-100). */
  averageMastery: number;
}

type Tier = 'decouverte' | 'consolidation' | 'approfondissement' | 'defi';

/**
 * Choisit le palier de difficulté à partir de ce que l'élève a
 * RÉELLEMENT réussi, pas de ce qu'il déclare.
 *
 * Un élève qui enchaîne les 90 % s'ennuie si on lui repropose les
 * mêmes bases ; un élève à 40 % décroche si on monte d'un cran.
 */
export function difficultyTier(p: Performance): Tier {
  if (p.quizCount === 0) return 'decouverte';
  const score = p.averageScore ?? 0;
  // La maîtrise pondère : bien réussir deux quiz ne suffit pas à
  // prouver qu'on maîtrise l'ensemble du programme de la matière.
  const blended = score * 0.7 + p.averageMastery * 0.3;

  if (blended >= 85 && p.quizCount >= 3) return 'defi';
  if (blended >= 70) return 'approfondissement';
  if (blended >= 50) return 'consolidation';
  return 'decouverte';
}

const TIER_BRIEF: Record<Tier, string> = {
  decouverte: `PALIER : DÉCOUVERTE
L'élève débute dans cette matière, ou ses résultats montrent que
les bases ne sont pas acquises. Questions directes, une seule
étape de raisonnement, nombres simples. Le but est qu'il réussisse
et reprenne confiance, pas qu'on le piège.`,

  consolidation: `PALIER : CONSOLIDATION
Les bases sont là mais fragiles. Mélange des questions directes et
des applications à deux étapes. Introduis quelques énoncés en
situation concrète. Reste dans le programme déjà vu.`,

  approfondissement: `PALIER : APPROFONDISSEMENT
L'élève réussit régulièrement. Passe aux raisonnements en deux ou
trois étapes, aux énoncés où il faut d'abord extraire la bonne
information, et aux questions qui demandent de choisir la bonne
méthode parmi plusieurs.`,

  defi: `PALIER : DÉFI
L'élève maîtrise la matière. Propose des problèmes qui combinent
PLUSIEURS notions, des énoncés qui exigent de la rigueur, des cas
limites, et des questions où l'erreur classique est très
tentante. Vise le niveau d'un examen d'État exigeant.`,
};

/**
 * Consigne de génération de quiz.
 *
 * `avoid` contient les questions déjà posées à cet élève dans
 * cette matière : sans elles, le modèle repropose invariablement
 * les mêmes, et l'élève finit par retenir des réponses plutôt que
 * des notions.
 */
export function quizGuidance(avoid: string[], perf: Performance): string {
  const tier = difficultyTier(perf);

  const history =
    perf.quizCount === 0
      ? "C'est son premier quiz dans cette matière."
      : `Il a déjà passé ${perf.quizCount} quiz dans cette matière, avec une moyenne de ${Math.round(perf.averageScore ?? 0)} % et une maîtrise moyenne de ${Math.round(perf.averageMastery)} %.`;

  const base = `
═══ NIVEAU RÉEL DE CET ÉLÈVE ═══

${history}

${TIER_BRIEF[tier]}

À l'intérieur du quiz, la difficulté monte encore : les premières
questions mettent en confiance, les dernières font vraiment
réfléchir.

═══ RÈGLES DE GÉNÉRATION ═══

Écris les mathématiques comme indiqué plus haut : $\\frac{a}{b}$
pour les fractions, $x^{2}$ pour les exposants — dans les
questions, dans les options ET dans les explications.

Chaque question :
- porte sur UNE notion précise du programme de la classe visée
- a exactement 4 options, toutes DIFFÉRENTES, une seule correcte
- a trois mauvaises options PLAUSIBLES, correspondant à des
  erreurs que les élèves font vraiment (mauvais dénominateur,
  signe oublié, unité fausse) — jamais de réponse absurde
- a une explication qui REFAIT le raisonnement en une ou deux
  étapes, pas seulement « la bonne réponse est B »

Ne cherche pas à équilibrer la position de la bonne réponse : les
options sont remélangées après toi. Concentre-toi sur la qualité
des distracteurs.

Fais varier les angles d'une question à l'autre : calcul direct,
application concrète, lecture d'énoncé, repérage d'erreur,
définition, comparaison.
`.trim();

  if (avoid.length === 0) return base;

  // On borne la liste : au-delà, elle coûte plus qu'elle ne sert.
  const list = avoid.slice(0, 40).map((q) => `- ${q}`).join('\n');
  return `${base}

═══ DÉJÀ POSÉ À CET ÉLÈVE — NE PAS REPRODUIRE ═══

Les questions ci-dessous lui ont déjà été soumises. Propose
autre chose : d'autres notions, d'autres nombres, d'autres
situations. Ne reformule pas la même question autrement.

${list}`;
}
