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
  /**
   * Identifiant de la session ouverte par le serveur.
   *
   * C'est lui qui permet à la base de CORRIGER le quiz au lieu de
   * croire l'app sur parole. Il n'est plus facultatif : un quiz
   * dont le serveur n'a pas pu enregistrer la session n'est pas
   * proposé à l'élève, faute de pouvoir être noté.
   */
  sessionId: string;
  /**
   * Combien de ces questions sont des RÉVISIONS — des questions
   * déjà ratées, qui reviennent après 1, 3, 7 ou 21 jours.
   *
   * Sert uniquement à l'expliquer à l'élève. Sans un mot, une
   * question qu'il reconnaît ressemble à un bug ; avec, elle
   * ressemble à ce qu'elle est : une seconde chance.
   */
  revisions: number;
}
