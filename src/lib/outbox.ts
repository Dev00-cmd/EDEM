// ═══════════════════════════════════════════════════════════════
//  LA FILE D'ATTENTE
//
//  Le réseau haïtien tombe. Le courant aussi. Jusqu'ici, ce qui
//  tombait avec eux était perdu :
//
//    · un quiz terminé au moment où la connexion lâche ne
//      rapportait RIEN. Dix minutes de travail, zéro XP, et pas un
//      mot pour dire pourquoi — `grade_quiz` échouait, l'app
//      passait `offline` à vrai, et rendait 0 ;
//    · une question posée le soir sans réseau recevait un message
//      d'excuse, et l'élève devait penser à la reposer.
//
//  Ce fichier garde ces deux choses sur l'appareil et les rejoue
//  au retour du signal.
//
//  ── Pourquoi c'est SÛR de rejouer ─────────────────────────────
//
//  La correction d'un quiz ne s'invente pas ici : la session a été
//  ouverte par le SERVEUR avant que l'élève ne commence, et c'est
//  lui qui détient les bonnes réponses. Rejouer une remise ne
//  fabrique donc aucun XP — et `grade_quiz` refuse explicitement
//  une session déjà corrigée. Un doublon est impossible, même si
//  l'app est tuée entre l'envoi et l'effacement de la ligne.
//
//  C'est ce qui rend cette file acceptable dans une base où tout
//  le reste est verrouillé : elle ne transporte aucune prétention,
//  seulement des CHOIX déjà faits.
//
//  ── Ce qu'elle ne fait pas ────────────────────────────────────
//
//  Aucune détection de réseau. Elle est vidée quand l'app revient
//  au premier plan et après chaque échange réussi — c'est-à-dire
//  exactement aux moments où l'on sait quelque chose de la
//  connexion. Écouter l'état du réseau demanderait un module natif
//  de plus pour un gain nul : un réseau « présent » qui ne passe
//  pas est le cas ordinaire ici, pas l'exception.
// ═══════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = '@tipwof/outbox';

/** Au-delà, on jette les plus anciens : ce n'est pas une archive. */
const MAX = 30;

/**
 * Passé ce délai, un travail ne vaut plus la peine.
 *
 * Sept jours : assez pour une coupure longue, assez court pour
 * qu'une réponse du tuteur arrive encore dans le contexte de la
 * question posée. Au-delà, l'élève a oublié ce qu'il demandait.
 */
const PEREMPTION = 7 * 24 * 60 * 60 * 1000;

/** La remise d'un quiz que le serveur doit encore corriger. */
export interface TravailQuiz {
  type: 'quiz';
  id: string;
  ts: number;
  sessionId: string;
  subjectId: string;
  /** L'indice choisi par question, null si le temps a manqué. */
  picked: (number | null)[];
}

/** Une question au tuteur, posée sans réseau. */
export interface TravailQuestion {
  type: 'question';
  id: string;
  ts: number;
  /** null si l'élève n'avait pas encore de conversation ouverte. */
  conversationId: string | null;
  subjectId: string;
  /** L'historique tel qu'il était, pour que la réponse ait du sens. */
  historique: { role: 'user' | 'assistant'; content: string }[];
}

export type Travail = TravailQuiz | TravailQuestion;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Ce qui attend, du plus ancien au plus récent. */
export async function lireFile(): Promise<Travail[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return [];
    const lu: unknown = JSON.parse(brut);
    if (!Array.isArray(lu)) return [];

    const limite = Date.now() - PEREMPTION;
    return (lu as Travail[]).filter(
      (x) => x && typeof x.id === 'string' && typeof x.ts === 'number' && x.ts > limite,
    );
  } catch {
    // Un cache illisible ne doit pas empêcher l'app de démarrer.
    return [];
  }
}

async function ecrire(file: Travail[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(file.slice(-MAX)));
  } catch {
    // Stockage plein : on perd la file, pas l'application.
  }
}

/** Ajoute un travail. Rend son identifiant. */
export async function enfiler(
  travail: Omit<TravailQuiz, 'id' | 'ts'> | Omit<TravailQuestion, 'id' | 'ts'>,
): Promise<string> {
  const id = uid();
  const file = await lireFile();
  await ecrire([...file, { ...travail, id, ts: Date.now() } as Travail]);
  return id;
}

/** Retire un travail traité. */
export async function retirer(id: string): Promise<void> {
  const file = await lireFile();
  await ecrire(file.filter((x) => x.id !== id));
}

/** Combien de travaux attendent. Pour le dire à l'élève. */
export async function tailleFile(): Promise<number> {
  return (await lireFile()).length;
}

/**
 * Ce qu'un traitement peut répondre.
 *
 *   'fait'    — envoyé, ou définitivement sans objet. On retire.
 *   'attend'  — le réseau n'est pas revenu. On garde, et on
 *               ARRÊTE là : les suivants échoueraient pareil, et
 *               chaque tentative coûte de la batterie et du
 *               forfait.
 */
export type Issue = 'fait' | 'attend';

/**
 * Vide la file, dans l'ordre où les choses ont été faites.
 *
 * Rend le nombre de travaux effectivement passés. Un seul vidage à
 * la fois : deux vidages concurrents rejoueraient les mêmes lignes
 * — sans conséquence pour un quiz, mais l'élève verrait sa question
 * partir deux fois.
 */
let enCours = false;

export async function viderFile(
  traiter: (travail: Travail) => Promise<Issue>,
): Promise<number> {
  if (enCours) return 0;
  enCours = true;

  try {
    const file = await lireFile();
    let faits = 0;

    for (const travail of file) {
      let issue: Issue;
      try {
        issue = await traiter(travail);
      } catch {
        // Une exception, c'est un travail qu'on ne sait pas
        // traiter. Le garder ferait boucler la file à chaque
        // passage : on le retire.
        issue = 'fait';
      }

      if (issue === 'attend') break;

      await retirer(travail.id);
      faits++;
    }

    return faits;
  } finally {
    enCours = false;
  }
}

/** Oublie tout. Appelé à la déconnexion : la file est personnelle. */
export async function jeterFile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLE);
  } catch {
    // sans conséquence
  }
}
