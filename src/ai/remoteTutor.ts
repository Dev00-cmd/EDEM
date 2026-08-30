// ═══════════════════════════════════════════════════════════════
//  TUTEUR EN LIGNE — appelle l'Edge Function Supabase « tutor »,
//  qui parle à Gemini avec la clé API gardée côté serveur.
//
//  L'appel est authentifié : Supabase joint automatiquement le
//  jeton de l'élève connecté. Sans compte, pas d'accès à l'IA.
// ═══════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase';
import type { Difficulty } from '@/config/app';
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

    return { subjectId, source: 'ai', questions, sessionId: data.sessionId };
  } catch {
    return null;
  }
}
