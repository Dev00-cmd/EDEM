// ═══════════════════════════════════════════════════════════════
//  DEVOIRS, REMISES, TABLEAU DE BORD
//
//  Un devoir de type « quiz » ne recopie pas le même questionnaire
//  pour tout le monde : chaque élève reçoit SA session, générée sur
//  les paramètres choisis par le professeur. Le professeur voit les
//  scores, jamais le détail des réponses.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

export type AssignmentKind = 'devoir' | 'quiz';

/** Un devoir vu par l'élève, avec l'état de sa propre remise. */
export interface MyAssignment {
  id: string;
  classroom_id: string;
  classroom: string;
  kind: AssignmentKind;
  title: string;
  instructions: string | null;
  subject_id: string;
  topic_ids: string[];
  difficulty: string | null;
  due_at: string | null;
  submitted_at: string | null;
  score_pct: number | null;
  grade: number | null;
  feedback: string | null;
  /** L'énoncé joint par le professeur. Lisible par toute la classe. */
  attachment_path: string | null;
}

/** Un devoir vu par le professeur, avec l'avancement de sa classe. */
export interface ClassAssignment {
  id: string;
  kind: AssignmentKind;
  title: string;
  topic_ids: string[];
  difficulty: string | null;
  due_at: string | null;
  published: boolean;
  rendus: number;
  a_corriger: number;
  moyenne: number | null;
  attachment_path: string | null;
}

export interface SubmissionRow {
  user_id: string;
  affiche: string;
  /** Rendu au seul professeur de la classe. */
  vrai_nom: string | null;
  submission_id: string | null;
  submitted_at: string | null;
  text: string | null;
  attachment_path: string | null;
  score_pct: number | null;
  grade: number | null;
  feedback: string | null;
}

/** Une ligne du tableau de bord : une notion du programme. */
export interface DashboardRow {
  topic_id: string;
  label_fr: string;
  label_ht: string;
  eleves_mesures: number;
  maitrise: number;
  en_difficulte: number;
  /** Les élèves sous 40 %, nommés. C'est la liste sur laquelle on agit. */
  noms: string[];
}

export interface ClassSummary {
  membres: number;
  en_attente: number;
  devoirs: number;
  a_corriger: number;
  /** Élèves sans aucune activité depuis sept jours. */
  inactifs_7j: number;
}

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T | null> => {
  const { data, error } = await supabase.rpc(fn as never, (args ?? {}) as never);
  if (error) return null;
  return data as T;
};

export const fetchMyAssignments = async (): Promise<MyAssignment[]> =>
  (await rpc<MyAssignment[]>('my_assignments')) ?? [];

export const fetchClassAssignments = async (classroomId: string): Promise<ClassAssignment[]> =>
  (await rpc<ClassAssignment[]>('classroom_assignments', { p_classroom_id: classroomId })) ?? [];

export const fetchSubmissions = async (assignmentId: string): Promise<SubmissionRow[]> =>
  (await rpc<SubmissionRow[]>('assignment_submissions', { p_assignment_id: assignmentId })) ?? [];

/**
 * L'accueil du professeur : une ligne par classe, avec d'abord ce
 * qui APPELLE UNE ACTION — demandes en attente, copies à corriger,
 * élèves en difficulté.
 *
 * Une seule requête pour toutes les classes. Boucler côté client
 * ferait dix appels pour dix classes, sur un forfait payé à l'unité.
 */
export interface TeacherClass {
  classroom_id: string;
  name: string;
  subject_id: string;
  grade_level: string;
  school: string;
  join_code: string;
  membres: number;
  en_attente: number;
  a_corriger: number;
  devoirs: number;
  current_focus: string | null;
  /** Null tant que rien n'est mesuré : « 0 % » serait un mensonge. */
  maitrise: number | null;
  en_difficulte: number;
  inactifs_7j: number;
}

/** Un devoir vu depuis l'accueil, toutes classes confondues. */
export interface TeacherAssignment {
  id: string;
  classroom_id: string;
  classroom: string;
  subject_id: string;
  kind: AssignmentKind;
  title: string;
  due_at: string | null;
  published: boolean;
  membres: number;
  rendus: number;
  a_corriger: number;
  moyenne: number | null;
}

export const fetchTeacherOverview = async (): Promise<TeacherClass[]> =>
  (await rpc<TeacherClass[]>('teacher_overview')) ?? [];

export const fetchTeacherAssignments = async (): Promise<TeacherAssignment[]> =>
  (await rpc<TeacherAssignment[]>('teacher_assignments')) ?? [];

export const fetchDashboard = async (classroomId: string): Promise<DashboardRow[]> =>
  (await rpc<DashboardRow[]>('classroom_dashboard', { p_classroom_id: classroomId })) ?? [];

export const fetchSummary = async (classroomId: string): Promise<ClassSummary | null> =>
  await rpc<ClassSummary>('classroom_summary', { p_classroom_id: classroomId });

export async function saveAssignment(input: {
  classroomId: string;
  kind: AssignmentKind;
  title: string;
  instructions?: string | null;
  topicIds?: string[];
  difficulty?: string | null;
  dueAt?: string | null;
  id?: string | null;
  /**
   * Le chemin doit être `{prof}/classroom/{classe}/consigne/…`.
   * Le serveur le vérifie : sans ça, un devoir pourrait pointer
   * vers le fichier de quelqu'un d'autre et le rendre lisible par
   * toute la classe.
   */
  attachmentPath?: string | null;
}): Promise<string | null> {
  const r = await rpc<{ id: string }>('save_assignment', {
    p_classroom_id: input.classroomId,
    p_kind: input.kind,
    p_title: input.title,
    p_instructions: input.instructions ?? null,
    p_topic_ids: input.topicIds ?? [],
    p_difficulty: input.difficulty ?? null,
    p_due_at: input.dueAt ?? null,
    p_id: input.id ?? null,
    p_attachment_path: input.attachmentPath ?? null,
  });
  return r?.id ?? null;
}

export const publishAssignment = async (id: string, published = true) =>
  (await rpc('publish_assignment', { p_assignment_id: id, p_published: published })) !== null;

export const deleteAssignment = async (id: string) =>
  (await rpc('delete_assignment', { p_assignment_id: id })) !== null;

export const submitAssignment = async (
  id: string,
  text: string,
  attachmentPath?: string | null,
) =>
  (await rpc('submit_assignment', {
    p_assignment_id: id,
    p_text: text,
    p_attachment_path: attachmentPath ?? null,
  })) !== null;

export const gradeSubmission = async (id: string, grade: number, feedback: string) =>
  (await rpc('grade_submission', {
    p_submission_id: id,
    p_grade: grade,
    p_feedback: feedback,
  })) !== null;
