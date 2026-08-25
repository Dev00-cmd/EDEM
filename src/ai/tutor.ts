// ═══════════════════════════════════════════════════════════════
//  FAÇADE IA — le reste de l'app ne parle qu'à ce fichier.
//  Le tuteur est 100 % en ligne : Claude, via l'Edge Function
//  Supabase « tutor » (clé API gardée côté serveur).
// ═══════════════════════════════════════════════════════════════

import { isBackendConfigured, type Difficulty } from '@/config/app';
import { getSubject } from '@/data/subjects';
import { matchTopicId, type CurriculumContext } from './plan';
import { remoteAnswer, remoteQuiz, type RemoteAttachment } from './remoteTutor';
import type { AIMessage, GeneratedQuiz, StudentContext } from './types';

export interface TutorReply {
  text: string;
  /** Notion détectée (matière + id du curriculum) quand trouvée */
  subjectDetected?: string;
  topicDetected?: string;
}

export function subjectLabelFor(ctx: Pick<StudentContext, 'subject' | 'lang'>): string {
  if (!ctx.subject || ctx.subject === 'general') return '';
  return getSubject(ctx.subject).name[ctx.lang];
}

/**
 * Pose une question au tuteur (avec l'historique).
 * Réponse garantie typée : texte + notion détectée si possible.
 * Lance une erreur si le serveur IA n'est pas disponible.
 */
export async function askTutor(
  messages: AIMessage[],
  ctx: StudentContext,
  curriculum?: CurriculumContext,
  attachment?: RemoteAttachment | null,
): Promise<TutorReply> {
  if (!isBackendConfigured()) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  const label = subjectLabelFor(ctx);
  const reply = await remoteAnswer(messages, ctx, label, attachment);

  // On essaie de rattacher la notion détectée au programme haïtien
  let topicDetected: string | undefined;
  let subjectDetected: string | undefined = ctx.subject !== 'general' ? ctx.subject : undefined;
  if (reply.topic && curriculum && subjectDetected) {
    topicDetected = matchTopicId(curriculum, subjectDetected, reply.topic);
  } else if (reply.topic && curriculum && !subjectDetected) {
    // Cherche dans toutes les matières du profil
    for (const sid of curriculum.subjectIds) {
      const found = matchTopicId(curriculum, sid, reply.topic);
      if (found) {
        subjectDetected = sid;
        topicDetected = found;
        break;
      }
    }
  }
  return { text: reply.text, subjectDetected, topicDetected };
}

/** Génère un quiz IA sur n'importe quelle matière. null si échec. */
export async function generateQuiz(
  ctx: StudentContext,
  subjectId: string,
  difficulty: Difficulty = 'moyen',
): Promise<GeneratedQuiz | null> {
  if (!isBackendConfigured()) return null;
  return remoteQuiz(
    ctx,
    subjectId,
    subjectLabelFor({ ...ctx, subject: subjectId }),
    difficulty,
  );
}
