// ═══════════════════════════════════════════════════════════════
//  TUTEUR EN LIGNE — appelle l'Edge Function Supabase « tutor »,
//  qui parle à Gemini avec la clé API gardée côté serveur.
//
//  L'appel est authentifié : Supabase joint automatiquement le
//  jeton de l'élève connecté. Sans compte, pas d'accès à l'IA.
// ═══════════════════════════════════════════════════════════════

import { fetch } from 'expo/fetch';
import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL, type Difficulty } from '@/config/app';
import { buildQuizPrompt, buildSystemPrompt } from './prompts';
import type { AIMessage, GeneratedQuiz, QuizQuestion, StudentContext } from './types';

/** Réponse brute de la fonction pour l'action « chat ». */
interface ChatResponse {
  reply?: string;
  topic?: string | null;
  error?: string;
}

/** Une question telle que la renvoie le schéma de l'Edge Function. */
interface RawQuizQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  topic: string;
}

interface QuizResponse {
  questions?: RawQuizQuestion[];
  /** Session ouverte par le serveur, qui corrigera la remise. */
  sessionId?: string | null;
  /** Nombre de questions rejouées depuis la file de révision. */
  revisions?: number;
  error?: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('tutor', { body });

  if (error) throw new Error(error.message);
  const payload = data as (T & { error?: string }) | null;
  if (!payload) throw new Error('Réponse vide du serveur');
  if (payload.error) throw new Error(payload.error);

  return payload;
}

export interface RemoteReply {
  text: string;
  topic: string | null; // notion détectée par l'IA (ou null)
}

/** Une pièce jointe déjà déposée, à faire lire au tuteur. */
export interface RemoteAttachment {
  path: string;
  type: string;
}

/** Envoie la conversation au tuteur → sa réponse (+ notion détectée). */
export async function remoteAnswer(
  messages: AIMessage[],
  ctx: StudentContext,
  subjectLabel: string,
  attachment?: RemoteAttachment | null,
): Promise<RemoteReply> {
  const system = buildSystemPrompt(ctx, subjectLabel);
  const data = await invoke<ChatResponse>({
    action: 'chat',
    system,
    messages,
    // La matière sert au serveur à choisir le modèle : une question
    // de maths part sur celui qui sait raisonner, une date
    // d'histoire sur le plus rapide.
    subjectId: ctx.subject ?? null,
    // Le serveur la rattache au dernier message de l'élève et
    // vérifie que le fichier lui appartient bien.
    attachment: attachment ?? null,
  });

  if (typeof data.reply !== 'string' || data.reply.length === 0) {
    throw new Error('Réponse inattendue du tuteur');
  }
  return { text: data.reply, topic: data.topic ?? null };
}

/** Demande à l'IA de générer un quiz. null si la génération échoue. */
export async function remoteQuiz(
  ctx: StudentContext,
  subjectId: string,
  subjectLabel: string,
  difficulty: Difficulty,
  /**
   * Devoir de type quiz. Le serveur vérifie que l'élève a le droit
   * de le jouer et impose SES paramètres : le client ne fait que
   * transmettre l'identifiant.
   */
  assignmentId?: string | null,
): Promise<GeneratedQuiz | null> {
  const prompt = buildQuizPrompt(ctx, subjectLabel, difficulty);

  try {
    // `subjectId` sert au serveur à retrouver les questions déjà
    // posées dans cette matière, pour ne pas les reproposer.
    const data = await invoke<QuizResponse>({
      action: 'quiz',
      prompt,
      subjectId,
      difficulty,
      assignmentId: assignmentId ?? null,
    });
    const raw = data.questions;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    /**
     * Une question n'est retenue que si elle est irréprochable.
     *
     * On ÉCARTE plutôt que de rafistoler : auparavant, un index de
     * réponse invalide était ramené à 0, ce qui présentait une
     * mauvaise option comme étant la bonne. Mieux vaut un quiz de
     * neuf questions qu'une seule qui enseigne une erreur.
     */
    const isSound = (x: RawQuizQuestion): boolean => {
      if (!x || typeof x.question !== 'string' || x.question.trim() === '') return false;
      if (!Array.isArray(x.choices) || x.choices.length !== 4) return false;
      if (x.choices.some((o) => typeof o !== 'string' || o.trim() === '')) return false;
      // Deux options identiques rendraient la bonne réponse ambiguë.
      const unique = new Set(x.choices.map((o) => o.trim().toLowerCase()));
      if (unique.size !== 4) return false;
      // L'index doit vraiment désigner l'une des quatre options.
      return Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4;
    };

    const questions: QuizQuestion[] = raw.filter(isSound).map((x, i) => ({
      id: `ai-${Date.now()}-${i}`,
      topic: typeof x.topic === 'string' && x.topic ? x.topic : 'general',
      // Le quiz est déjà généré dans la langue de l'élève : on remplit
      // les deux clés avec le même texte plutôt que de le traduire.
      q: { fr: x.question, ht: x.question },
      opts: x.choices.map((o) => ({ fr: String(o), ht: String(o) })),
      correct: x.answer,
      expl: { fr: String(x.explanation ?? ''), ht: String(x.explanation ?? '') },
    }));

    // Sans session, la base n'a pas les bonnes réponses en main :
    // elle ne peut pas corriger, et le quiz ne rapporterait rien.
    // On préfère un « réessaie » franc à dix minutes de travail
    // qui n'accordent aucun XP à l'élève.
    if (questions.length === 0 || !data.sessionId) return null;

    return {
      subjectId,
      source: 'ai',
      questions,
      sessionId: data.sessionId,
      // Un serveur qui n'a pas encore reçu la révision espacée ne
      // renvoie pas ce champ : zéro, et l'écran ne dit rien.
      revisions: typeof data.revisions === 'number' ? data.revisions : 0,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  LA RÉPONSE QUI S'ÉCRIT SOUS LES YEUX DE L'ÉLÈVE
//
//  `remoteAnswer` attend que la réponse entière soit prête avant
//  de rendre la main : 5 à 15 secondes de bulle vide. Ici, on lit
//  la réponse au fur et à mesure, et l'élève voit le premier mot
//  en moins d'une seconde.
//
//  On passe par `expo/fetch` et non par `supabase.functions.invoke` :
//  `invoke` rend une réponse déjà entièrement lue, ce qui annulerait
//  tout l'intérêt. `expo/fetch` est la seule implémentation qui
//  expose un vrai `response.body` sur Android et iOS — celle de
//  React Native passe par XMLHttpRequest et rend `body` nul.
//
//  Elle vit dans le paquet `expo` lui-même, déjà présent dans
//  l'APK : ce changement part donc en OTA, sans nouveau build.
// ═══════════════════════════════════════════════════════════════

/** Le tuteur a refusé la question — quota, session, filtre. */
export class TuteurRefus extends Error {}

export interface RemoteStreamReply extends RemoteReply {
  /** Le modèle a atteint sa limite : la réponse s'arrête en plein vol. */
  tronque: boolean;
}

/** Découpe une trame SSE en son nom d'événement et sa charge utile. */
function litTrame(brut: string): { event: string; data: string } {
  let event = 'message';
  let data = '';
  for (const ligne of brut.split('\n')) {
    if (ligne.startsWith('event:')) event = ligne.slice(6).trim();
    else if (ligne.startsWith('data:')) data += ligne.slice(5).trim();
  }
  return { event, data };
}

/**
 * Pose la question au tuteur et RELAIE sa réponse morceau par
 * morceau via `onDelta`.
 *
 * Rend le texte complet à la fin — c'est lui qu'on garde en base,
 * pas la somme des morceaux affichés.
 *
 * Deux façons d'échouer, et elles n'appellent pas la même suite :
 *
 *  · `TuteurRefus` — le serveur a répondu, mais non (quota épuisé,
 *    session expirée, filtre de sécurité). Réessayer sans le flux
 *    donnerait exactement le même refus : on remonte l'erreur.
 *
 *  · toute autre erreur AVANT le premier morceau — le flux lui-même
 *    n'a pas pu s'établir. Là, l'appel d'un bloc a toutes ses
 *    chances, et c'est `askTutorStream` qui s'en charge.
 */
export async function remoteAnswerStream(
  messages: AIMessage[],
  ctx: StudentContext,
  subjectLabel: string,
  attachment: RemoteAttachment | null | undefined,
  onDelta: (morceau: string) => void,
): Promise<RemoteStreamReply> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new TuteurRefus('Session expirée. Reconnecte-toi.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/tutor`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      action: 'chat',
      stream: true,
      system: buildSystemPrompt(ctx, subjectLabel),
      messages,
      subjectId: ctx.subject ?? null,
      attachment: attachment ?? null,
    }),
  });

  // Le serveur a répondu en JSON : c'est un refus motivé, pas une
  // panne de transport. Le message est déjà écrit pour l'élève.
  if (!response.ok) {
    let message = `Le tuteur n'a pas pu répondre (${response.status}).`;
    try {
      const corps = (await response.json()) as { error?: string };
      if (corps?.error) message = corps.error;
    } catch {
      // pas du JSON : on garde le message générique
    }
    throw new TuteurRefus(message);
  }

  if (!response.body) throw new Error('flux indisponible');

  const lecteur = response.body.getReader();
  const decodeur = new TextDecoder();

  let tampon = '';
  let texte = '';
  let topic: string | null = null;
  let tronque = false;
  /** Une panne à mi-réponse : on garde ce qui est déjà affiché. */
  let coupe = false;

  const traite = (brut: string) => {
    const { event, data } = litTrame(brut);
    if (!data) return;

    if (event === 'delta') {
      const morceau = (JSON.parse(data) as { t?: string }).t ?? '';
      if (!morceau) return;
      texte += morceau;
      onDelta(morceau);
      return;
    }

    if (event === 'done') {
      const fin = JSON.parse(data) as { topic?: string | null; tronque?: boolean };
      topic = fin.topic ?? null;
      tronque = !!fin.tronque;
      return;
    }

    if (event === 'error') {
      const echec = JSON.parse(data) as { error?: string; partiel?: boolean };
      // Rien n'est encore affiché : l'élève n'a rien à perdre, on
      // remonte l'erreur. Sinon on s'arrête là et il garde le début.
      if (!echec.partiel && texte.length === 0) {
        throw new TuteurRefus(echec.error ?? 'Réponse interrompue.');
      }
      coupe = true;
    }
  };

  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;

      // Les fins de ligne varient d'un intermédiaire à l'autre ;
      // on les ramène à une seule forme avant de découper.
      tampon += decodeur.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let fin: number;
      while ((fin = tampon.indexOf('\n\n')) !== -1) {
        const brut = tampon.slice(0, fin);
        tampon = tampon.slice(fin + 2);
        traite(brut);
      }
      if (coupe) break;
    }
  } finally {
    // Le lecteur reste ouvert si l'élève quitte l'écran en cours de
    // route ; sans annulation, la connexion traîne et le forfait
    // continue de se vider.
    await lecteur.cancel().catch(() => {});
  }

  if (texte.length === 0) throw new Error('réponse vide');

  return { text: texte, topic, tronque };
}
