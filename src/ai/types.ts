// ═══════════════════════════════════════════════════════════════
//  TYPES DE LA COUCHE IA
// ═══════════════════════════════════════════════════════════════

import type { Lang } from '@/i18n';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Tout ce que l'IA sait de l'élève pour personnaliser ses réponses. */
export interface StudentContext {
  name: string;
  lang: Lang;
  level: string; // classe, ex. "9e AF"
  goal: string; // objectif, ex. "exams"
  subject?: string; // matière en cours (id)
  weakTopics: string[]; // notions faibles détectées
  strongTopics: string[]; // notions maîtrisées
}

export interface QuizQuestion {
  id: string;
  topic: string; // id de notion (pour le suivi de maîtrise)
  q: Record<Lang, string>;
  opts: Record<Lang, string>[];
  correct: number; // index de la bonne réponse
  expl: Record<Lang, string>;
}

export interface GeneratedQuiz {
  subjectId: string;
  source: 'local' | 'ai';
  questions: QuizQuestion[];
}
