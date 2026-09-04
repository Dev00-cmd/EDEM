// ═══════════════════════════════════════════════════════════════
//  FAÇADE IA — le reste de l'app ne parle qu'à ce fichier.
//  Le tuteur est 100 % en ligne : Gemini, via l'Edge Function
//  Supabase « tutor » (clé API gardée côté serveur).
// ═══════════════════════════════════════════════════════════════

import { isBackendConfigured, type Difficulty } from '@/config/app';
import { getSubject } from '@/data/subjects';
import { matchTopicId, type CurriculumContext } from './plan';
import {
  remoteAnswer,
  remoteAnswerStream,
  remoteQuiz,
  TuteurRefus,
  type RemoteAttachment,
} from './remoteTutor';
import type { AIMessage, GeneratedQuiz, StudentContext } from './types';

export interface TutorReply {
  text: string;
  /** Notion détectée (matière + id du curriculum) quand trouvée */
  subjectDetected?: string;
  topicDetected?: string;
  /** La réponse a été coupée par la limite du modèle. */
  tronque?: boolean;
}

/**
 * Rattache au programme haïtien la notion que l'IA dit avoir
 * traitée. C'est ce rattachement qui fait progresser la maîtrise
 * toute seule, sans que l'élève ait rien à déclarer.
 *
 * Partagé par les deux façons de poser une question — d'un bloc et
 * en flux. Deux copies auraient divergé, et c'est le suivi de
 * l'élève qui en aurait fait les frais.
 */
function rattacheNotion(
  topic: string | null,
  ctx: StudentContext,
  curriculum?: CurriculumContext,
): { subjectDetected?: string; topicDetected?: string } {
  let topicDetected: string | undefined;
  let subjectDetected: string | undefined =
    ctx.subject !== 'general' ? ctx.subject : undefined;

  if (topic && curriculum && subjectDetected) {
    topicDetected = matchTopicId(curriculum, subjectDetected, topic);
  } else if (topic && curriculum && !subjectDetected) {
    // Cherche dans toutes les matières du profil
    for (const sid of curriculum.subjectIds) {
      const found = matchTopicId(curriculum, sid, topic);
      if (found) {
        subjectDetected = sid;
        topicDetected = found;
        break;
      }
    }
  }
  return { subjectDetected, topicDetected };
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
  return { text: reply.text, ...rattacheNotion(reply.topic, ctx, curriculum) };
}

/**
 * La même question, mais la réponse arrive au fur et à mesure.
 *
 * `onDelta` reçoit chaque morceau dès qu'il tombe ; la valeur
 * rendue à la fin est la réponse complète, celle qu'on garde.
 *
 * REPLI. Le flux peut ne pas s'établir — un intermédiaire réseau
 * qui met la réponse en tampon, un serveur non redéployé, une
 * plateforme sans `response.body`. On retombe alors sur l'appel
 * d'un bloc, et l'élève voit une réponse un peu plus tard plutôt
 * que pas de réponse du tout.
 *
 * Un `TuteurRefus`, lui, ne se rejoue PAS : quota épuisé ou session
 * expirée donneraient exactement le même refus, en payant l'appel
 * une seconde fois.
 */
export async function askTutorStream(
  messages: AIMessage[],
  ctx: StudentContext,
  onDelta: (morceau: string) => void,
  curriculum?: CurriculumContext,
  attachment?: RemoteAttachment | null,
): Promise<TutorReply> {
  if (!isBackendConfigured()) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  const label = subjectLabelFor(ctx);

  try {
    const reply = await remoteAnswerStream(messages, ctx, label, attachment, onDelta);
    return {
      text: reply.text,
      tronque: reply.tronque,
      ...rattacheNotion(reply.topic, ctx, curriculum),
    };
  } catch (e) {
    if (e instanceof TuteurRefus) throw e;

    const reply = await remoteAnswer(messages, ctx, label, attachment);
    // L'écran n'a rien affiché : on lui donne la réponse entière
    // d'un coup, comme avant le flux.
    onDelta(reply.text);
    return { text: reply.text, ...rattacheNotion(reply.topic, ctx, curriculum) };
  }
}

/** Génère un quiz IA sur n'importe quelle matière. null si échec. */
export async function generateQuiz(
  ctx: StudentContext,
  subjectId: string,
  difficulty: Difficulty = 'moyen',
  assignmentId?: string | null,
): Promise<GeneratedQuiz | null> {
  if (!isBackendConfigured()) return null;
  return remoteQuiz(
    ctx,
    subjectId,
    subjectLabelFor({ ...ctx, subject: subjectId }),
    difficulty,
    assignmentId,
  );
}
