// ═══════════════════════════════════════════════════════════════
//  DEMANDE DE RÔLE PROFESSEUR
//
//  Le rôle ne se coche pas dans un formulaire : il s'accorde à la
//  main, un par un. Toute la sécurité des classes tient à cette
//  phrase — « il y a un adulte responsable dans chaque classe » —
//  et elle ne vaut rien si n'importe qui peut se déclarer prof.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

export type TeacherStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherRequest {
  status: TeacherStatus;
  full_name: string;
  contact: string;
  subjects: string[];
  message: string | null;
  review_note: string | null;
  created_at: string;
}

/** La demande de l'élève connecté, ou null s'il n'en a jamais fait. */
export async function fetchTeacherRequest(): Promise<TeacherRequest | null> {
  const { data, error } = await supabase
    .from('teacher_requests')
    .select('status, full_name, contact, subjects, message, review_note, created_at')
    .maybeSingle();
  if (error || !data) return null;
  return data as TeacherRequest;
}

/**
 * Envoie ou renvoie la demande.
 *
 * Une demande refusée peut être renvoyée : un professeur dont le
 * premier justificatif était illisible doit pouvoir en donner un
 * autre. Une demande acceptée, non — le serveur refuse.
 */
export async function requestTeacherRole(input: {
  fullName: string;
  contact: string;
  subjects: string[];
  schoolId?: string | null;
  message?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc('request_teacher_role', {
    p_full_name: input.fullName,
    p_contact: input.contact,
    p_subjects: input.subjects,
    p_school_id: input.schoolId ?? undefined,
    p_message: input.message ?? undefined,
  });
  return { ok: !error, error: error?.message ?? null };
}
