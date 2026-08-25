// ═══════════════════════════════════════════════════════════════
//  TUTEUR EN LIGNE — appelle l'Edge Function Supabase « tutor »,
//  qui parle à Claude avec la clé API gardée côté serveur.
//
//  L'appel est authentifié : Supabase joint automatiquement le
//  jeton de l'élève connecté. Sans compte, pas d'accès à l'IA.
// ═══════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase';
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

/** Envoie la conversation au tuteur → réponse de Claude (+ notion détectée). */
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
    // Le serveur la rattache au dernier message de l'élève et
    // vérifie que le fichier lui appartient bien.
    attachment: attachment ?? null,
  });

  if (typeof data.reply !== 'string' || data.reply.length === 0) {
    throw new Error('Réponse inattendue du tuteur');
  }
  return { text: data.reply, topic: data.topic ?? null };
}

/** Demande à Claude de générer un quiz. null si la génération échoue. */
export async function remoteQuiz(
  ctx: StudentContext,
  subjectId: string,
  subjectLabel: string,
): Promise<GeneratedQuiz | null> {
  const prompt = buildQuizPrompt(ctx, subjectLabel);

  try {
    const data = await invoke<QuizResponse>({ action: 'quiz', prompt });
    const raw = data.questions;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const questions: QuizQuestion[] = raw
      .filter(
        (x) =>
          x &&
          typeof x.question === 'string' &&
          Array.isArray(x.choices) &&
          x.choices.length === 4,
      )
      .map((x, i) => ({
        id: `ai-${Date.now()}-${i}`,
        topic: typeof x.topic === 'string' && x.topic ? x.topic : 'general',
        // Le quiz est déjà généré dans la langue de l'élève : on remplit
        // les deux clés avec le même texte plutôt que de le traduire.
        q: { fr: x.question, ht: x.question },
        opts: x.choices.map((o) => ({ fr: String(o), ht: String(o) })),
        correct:
          Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4 ? x.answer : 0,
        expl: { fr: String(x.explanation ?? ''), ht: String(x.explanation ?? '') },
      }));

    return questions.length > 0 ? { subjectId, source: 'ai', questions } : null;
  } catch {
    return null;
  }
}
