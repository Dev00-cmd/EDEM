// ═══════════════════════════════════════════════════════════════
//  HISTORIQUE DES QUIZ
//
//  Un élève ne pouvait pas revenir sur un quiz passé : il voyait
//  son score une fois, à la fin, puis tout disparaissait — y
//  compris les explications, qui sont pourtant ce qui fait
//  apprendre. Réviser ses erreurs avant un contrôle était
//  impossible.
//
//  Les données viennent des sessions de quiz, que le serveur
//  ouvre déjà pour corriger. Elles ne deviennent lisibles par
//  l'élève qu'une fois le quiz REMIS : avant, elles contiennent
//  les bonnes réponses (voir la politique RLS
//  « quiz_sessions_select_graded_own »).
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';
import type { Difficulty } from '@/config/app';

/** Une ligne de la liste : assez pour l'afficher, rien de plus. */
export interface QuizHistoryEntry {
  id: string;
  subjectId: string;
  difficulty: Difficulty;
  scorePct: number;
  total: number;
  gradedAt: string;
}

/** Une question telle qu'elle a été posée, avec ce qu'on en a fait. */
export interface ReviewedQuestion {
  question: string;
  choices: string[];
  /** Indice de la bonne réponse. */
  answer: number;
  explanation: string;
  topic: string;
  /** Ce que l'élève avait choisi. null = le temps a manqué. */
  picked: number | null;
}

export interface QuizReview {
  id: string;
  subjectId: string;
  difficulty: Difficulty;
  scorePct: number;
  gradedAt: string;
  questions: ReviewedQuestion[];
}

const asDifficulty = (v: unknown): Difficulty =>
  v === 'facile' || v === 'difficile' ? v : 'moyen';

/** Les derniers quiz corrigés, du plus récent au plus ancien. */
export async function fetchQuizHistory(limit = 30): Promise<QuizHistoryEntry[]> {
  const { data, error } = await supabase.rpc('quiz_history', { p_limit: limit });
  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    difficulty: asDifficulty(r.difficulty),
    scorePct: r.score_pct ?? 0,
    total: r.total ?? 0,
    gradedAt: r.graded_at,
  }));
}

/**
 * Le détail d'un quiz : les énoncés, ce que l'élève a répondu, et
 * les explications.
 *
 * Chargé à l'ouverture seulement. Rapatrier dix quiz complets pour
 * afficher dix lignes de liste coûterait cher sur un réseau
 * haïtien.
 */
export async function fetchQuizReview(id: string): Promise<QuizReview | null> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('id, subject_id, difficulty, score_pct, graded_at, questions, picked')
    .eq('id', id)
    .maybeSingle();

  if (error || !data || !data.questions) return null;

  const raw = data.questions as {
    question: string;
    choices: string[];
    answer: number;
    explanation?: string;
    topic?: string;
  }[];
  const picked = (data.picked ?? []) as (number | null)[];

  return {
    id: data.id,
    subjectId: data.subject_id,
    difficulty: asDifficulty(data.difficulty),
    scorePct: data.score_pct ?? 0,
    gradedAt: data.graded_at ?? '',
    questions: raw.map((q, i) => ({
      question: q.question,
      choices: q.choices ?? [],
      answer: q.answer,
      explanation: q.explanation ?? '',
      topic: q.topic ?? 'general',
      // Une case vide dans le tableau vaut « pas répondu », pas
      // « répondu 0 » : d'où le test explicite.
      picked: typeof picked[i] === 'number' ? (picked[i] as number) : null,
    })),
  };
}

/**
 * Date lisible, sans dépendance de formatage.
 *
 * `toLocaleDateString` avec une locale explicite n'est pas fiable
 * sur Hermes : selon la version d'Android, le jeu de locales
 * embarqué est incomplet et la date sort en anglais.
 */
export function formatDate(iso: string, lang: 'fr' | 'ht'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const MOIS = {
    fr: ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
    ht: ['jan.', 'fev.', 'mas', 'avr.', 'me', 'jen', 'jiy.', 'out', 'sept.', 'okt.', 'nov.', 'des.'],
  }[lang];

  const jour = d.getDate();
  const mois = MOIS[d.getMonth()];
  const heure = `${d.getHours()}`.padStart(2, '0');
  const minute = `${d.getMinutes()}`.padStart(2, '0');

  // Aujourd'hui et hier méritent leur nom : c'est ce que l'élève
  // cherche en premier dans une liste.
  const now = new Date();
  const memeJour = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const hier = new Date(now);
  hier.setDate(now.getDate() - 1);

  if (memeJour(d, now)) {
    return lang === 'ht' ? `Jodi a · ${heure}:${minute}` : `Aujourd'hui · ${heure}:${minute}`;
  }
  if (memeJour(d, hier)) {
    return lang === 'ht' ? `Yè · ${heure}:${minute}` : `Hier · ${heure}:${minute}`;
  }
  return `${jour} ${mois} · ${heure}:${minute}`;
}
