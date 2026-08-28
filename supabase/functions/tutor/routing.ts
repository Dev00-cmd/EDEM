// ═══════════════════════════════════════════════════════════════
//  CHOIX DU MODÈLE
//
//  Toutes les questions ne se valent pas. « Qui a proclamé
//  l'indépendance ? » se répond de mémoire ; « résous 2x + 3 = 9
//  et vérifie » demande un raisonnement suivi.
//
//  Envoyer les deux au même modèle, c'est choisir entre payer
//  trop cher la première ou bâcler la seconde. On regarde donc de
//  quoi il s'agit AVANT de choisir.
//
//  Les trois modèles sont réglables par variable d'environnement :
//  Google fait évoluer sa gamme vite, et on ne veut pas
//  redéployer du code pour changer un nom de modèle.
// ═══════════════════════════════════════════════════════════════

import type { Thinking } from "./gemini.ts";

/**
 * RAPIDE — le cheval de trait.
 *
 * gemini-2.5-flash-lite : le moins cher du catalogue
 * (0,10 $ / 0,40 $ le million de jetons) et, surtout, sa réflexion
 * est COUPÉE par défaut. C'est ce qui rend la réponse quasi
 * immédiate. On ne lui envoie donc jamais de `thinkingLevel` :
 * ce serait la rallumer et perdre l'intérêt.
 */
const FAST = Deno.env.get("GEMINI_MODEL_FAST") ?? "gemini-2.5-flash-lite";

/**
 * RAISONNEMENT — maths, sciences, et lecture des photos de devoirs.
 *
 * gemini-3.5-flash-lite : 0,30 $ / 2,50 $. Trois fois le prix du
 * précédent, mais il tient un calcul en plusieurs étapes et lit
 * une écriture manuscrite sur une photo — ce que le rapide rate.
 */
const REASON = Deno.env.get("GEMINI_MODEL_REASON") ?? "gemini-3.5-flash-lite";

/**
 * QUIZ — dix questions cohérentes, avec distracteurs crédibles.
 *
 * C'est la tâche la plus exigeante de l'app : il faut tenir un
 * schéma JSON strict sur dix questions sans se répéter. L'élève
 * attend devant un écran de chargement, donc on ne monte pas
 * au-delà de `medium`.
 */
const QUIZ = Deno.env.get("GEMINI_MODEL_QUIZ") ?? "gemini-3.5-flash-lite";

export interface Route {
  model: string;
  thinking: Thinking;
  /** Pour les journaux : pourquoi ce modèle a été choisi. */
  why: string;
}

/** Matières où le raisonnement est la règle, pas l'exception. */
const REASONING_SUBJECTS = new Set(["math", "physique", "chimie"]);

/**
 * Indices qu'une question demande de CALCULER ou de DÉMONTRER,
 * et pas seulement de restituer.
 *
 * Écrit sans accents obligatoires (`equation` comme `équation`) :
 * un élève tape vite, souvent sans accents, parfois en créole.
 */
const REASONING_HINTS = new RegExp(
  [
    // symboles de calcul
    "[0-9]\\s*[+\\-*/=^]",
    "\\d+\\s*/\\s*\\d+",
    "=",
    // français
    "calcul", "r[ée]sou", "r[ée]sol", "[ée]quation", "in[ée]quation",
    "fraction", "pourcentage", "proportion", "d[ée]riv", "int[ée]gral",
    "th[ée]or[èe]me", "pythagore", "thal[èe]s", "trigonom",
    "vitesse", "acc[ée]l[ée]r", "[ée]nergie", "\\bforce\\b", "puissance",
    "\\bmole\\b", "molaire", "concentration", "[ée]quilibr",
    "probabilit", "statistiq", "moyenne", "m[ée]diane",
    "g[ée]om[ée]tri", "\\baire\\b", "p[ée]rim[èe]tre", "\\bvolume\\b",
    "\\bangle\\b", "triangle", "cercle", "fonction", "graphique",
    "d[ée]montr", "prouve", "justifi",
    // créole
    "kalkil", "rezoud", "ekwasyon", "fraksyon", "pousantaj",
    "vitès", "en[èe]ji", "\\bf[òo]s\\b", "jeyometri",
  ].join("|"),
  "i",
);

/**
 * Choisit le modèle pour une question du tuteur.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. Une pièce jointe → toujours le modèle de raisonnement. Lire
 *    une photo de cahier, déchiffrer une écriture d'enfant et
 *    comprendre l'exercice est la tâche la plus dure qu'on lui
 *    demande — le modèle rapide s'y trompe.
 * 2. Une matière de calcul → raisonnement, sans discuter.
 * 3. Sinon on lit la question elle-même. Un « explique-moi les
 *    fractions » en cours de français reste une question de calcul.
 */
export function routeChat(
  question: string,
  subject: string | undefined,
  hasAttachment: boolean,
): Route {
  if (hasAttachment) {
    return { model: REASON, thinking: "low", why: "piece-jointe" };
  }
  if (subject && REASONING_SUBJECTS.has(subject)) {
    return { model: REASON, thinking: "low", why: `matiere:${subject}` };
  }
  if (REASONING_HINTS.test(question)) {
    return { model: REASON, thinking: "low", why: "question-calcul" };
  }
  // Définition, date, vocabulaire, conjugaison, encouragement…
  // Rien à dérouler : le plus rapide fait aussi bien.
  return { model: FAST, thinking: null, why: "question-simple" };
}

/** Le quiz a toujours le même besoin : de la rigueur, pas de la vitesse. */
export function routeQuiz(): Route {
  return { model: QUIZ, thinking: "medium", why: "quiz" };
}
