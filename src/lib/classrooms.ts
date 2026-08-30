// ═══════════════════════════════════════════════════════════════
//  CLASSES
//
//  L'appartenance à une classe NE SE DÉCLARE PAS, elle s'accorde :
//  un code d'invitation donné par le professeur, puis sa
//  validation. Avoir écrit « Lycée X, NS3 » dans son profil ne
//  donne accès à rien.
//
//  Tout passe par des fonctions SECURITY DEFINER. L'application ne
//  peut écrire ni dans `classrooms` ni dans `classroom_members` —
//  le serveur refuse, ce n'est pas une convention.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

export interface Classroom {
  id: string;
  name: string;
  subject_id: string;
  grade_level: string;
  school: string;
  teacher: string;
  is_teacher: boolean;
  /** 'teacher' | 'active' | 'pending' */
  my_status: string;
  members: number;
  pending: number;
  /** Le code n'est rendu qu'au professeur. null pour un élève. */
  join_code: string | null;
  is_open: boolean;
  current_focus: string | null;
  /** La note pour l'IA n'est rendue qu'au professeur. */
  focus_note: string | null;
}

export interface RosterEntry {
  user_id: string;
  /** Pseudonyme, ou prénom à défaut. C'est ce que voient les autres. */
  affiche: string;
  /** Le vrai nom, rendu au SEUL professeur de la classe. */
  vrai_nom: string | null;
  status: 'pending' | 'active' | 'removed';
  is_teacher: boolean;
  joined_at: string | null;
}

/**
 * Les codes d'erreur que rend `join_classroom`.
 *
 * Le serveur rend un code, pas une phrase : c'est l'application qui
 * traduit, en français ou en créole. Une exception SQL serait
 * arrivée telle quelle sous les yeux de l'élève, en anglais et en
 * jargon.
 */
export type JoinError =
  | 'code_invalide'
  | 'trop_de_tentatives'
  | 'deja_membre'
  | 'deja_en_attente'
  | 'tu_es_le_professeur'
  | 'classe_complete'
  | 'echec';

export interface JoinResult {
  ok: boolean;
  error?: JoinError;
  classroom_id?: string;
  name?: string;
  school?: string;
  teacher?: string;
  status?: string;
}

export async function fetchClassrooms(): Promise<Classroom[]> {
  const { data, error } = await supabase.rpc('my_classrooms');
  if (error || !data) return [];
  return data as Classroom[];
}

export async function fetchRoster(classroomId: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc('classroom_roster', {
    p_classroom_id: classroomId,
  });
  if (error || !data) return [];
  return data as RosterEntry[];
}

export async function joinClassroom(code: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_classroom', { p_code: code });
  if (error || !data) return { ok: false, error: 'echec' };
  return data as unknown as JoinResult;
}

export async function createClassroom(input: {
  schoolId: string;
  name: string;
  subjectId: string;
  gradeLevel: string;
}): Promise<{ ok: boolean; joinCode?: string }> {
  const { data, error } = await supabase.rpc('create_classroom', {
    p_school_id: input.schoolId,
    p_name: input.name,
    p_subject_id: input.subjectId,
    p_grade_level: input.gradeLevel,
  });
  if (error || !data) return { ok: false };
  return { ok: true, joinCode: (data as { join_code: string }).join_code };
}

const appel = async (fn: string, args: Record<string, unknown>): Promise<boolean> => {
  const { error } = await supabase.rpc(fn as never, args as never);
  return !error;
};

export const approveMember = (classroomId: string, userId: string) =>
  appel('approve_member', { p_classroom_id: classroomId, p_user_id: userId });

export const removeMember = (classroomId: string, userId: string) =>
  appel('remove_member', { p_classroom_id: classroomId, p_user_id: userId });

export const rotateJoinCode = (classroomId: string) =>
  appel('rotate_join_code', { p_classroom_id: classroomId });

export const setClassroomFocus = (classroomId: string, focus: string, note: string) =>
  appel('set_classroom_focus', {
    p_classroom_id: classroomId,
    p_focus: focus,
    p_note: note,
  });

export const setClassroomOpen = (classroomId: string, open: boolean) =>
  appel('set_classroom_open', { p_classroom_id: classroomId, p_open: open });
