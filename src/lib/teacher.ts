// ═══════════════════════════════════════════════════════════════
//  DÉCLARATION DE PROFESSEUR
//
//  Le rôle s'obtient en se déclarant : nom, école, matières, moyen
//  de joindre — et il est accordé dans la seconde. Il n'y a plus de
//  file d'attente, plus personne à attendre.
//
//  Ce qui protège les élèves n'a jamais été cette validation. C'est
//  qu'EDEM n'offre AUCUN moyen d'atteindre un élève : pas de fil
//  public, pas de recherche d'utilisateurs, pas de messages privés.
//  Pour remplir une classe il faut remettre un code de six
//  caractères à des enfants, dans le monde physique. Quelqu'un qui
//  a déjà cet accès ne gagnait rien à être validé par un humain.
//
//  Ce qui reste, et qui compte :
//    · la déclaration, obligatoire — un adulte responsable d'une
//      salle de mineurs donne son nom et un moyen de le joindre ;
//    · trois classes tant que personne ne l'a vérifié ;
//    · la modération, et le journal de chacun de ses gestes ;
//    · `revoke_teacher_role`, qui retire le rôle ET archive ses
//      classes du même geste.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

/**
 * `active`   — déclaré, rôle accordé, vérification pas encore faite
 * `approved` — vérifié à la main : le plafond de classes est levé
 * `rejected` — rôle retiré. La déclaration ne se rejoue pas.
 */
export type TeacherStatus = 'active' | 'approved' | 'rejected';

export interface TeacherRequest {
  status: TeacherStatus;
  full_name: string;
  contact: string;
  subjects: string[];
  message: string | null;
  review_note: string | null;
  created_at: string;
}

/** Ce que l'écran a besoin de savoir avant d'afficher un bouton. */
export interface TeacherStatusInfo {
  role: 'eleve' | 'prof';
  declared: boolean;
  /** Vérifié à la main. Lève le plafond de 3 à 10 classes. */
  verified: boolean;
  /** Le rôle a été retiré : la déclaration ne se rejoue pas. */
  revoked: boolean;
  full_name: string | null;
  limite: number;
  ouvertes: number;
}

export type DeclareError =
  | 'nom_requis'
  | 'contact_requis'
  | 'matiere_requise'
  | 'role_retire'
  | 'trop_de_demandes'
  | 'echec';

/** La déclaration de l'utilisateur connecté, ou null. */
export async function fetchTeacherRequest(): Promise<TeacherRequest | null> {
  const { data, error } = await supabase
    .from('teacher_requests')
    .select('status, full_name, contact, subjects, message, review_note, created_at')
    .maybeSingle();
  if (error || !data) return null;
  return data as TeacherRequest;
}

/** Rôle, plafond, classes déjà ouvertes — calculés par le serveur. */
export async function fetchTeacherStatus(): Promise<TeacherStatusInfo | null> {
  const { data, error } = await supabase.rpc('my_teacher_status');
  if (error || !data) return null;
  return data as unknown as TeacherStatusInfo;
}

/**
 * Se déclarer professeur. Le rôle est accordé dans la foulée, dans
 * la même transaction que la déclaration : on ne veut pas d'un
 * professeur sans trace, ni d'une trace sans professeur.
 *
 * Un rôle retiré ne se reprend pas en remplissant le formulaire une
 * seconde fois — sinon la révocation ne servirait à rien.
 */
export async function declareTeacherRole(input: {
  fullName: string;
  contact: string;
  subjects: string[];
  schoolId?: string | null;
  message?: string | null;
}): Promise<{ ok: boolean; error?: DeclareError; verified?: boolean }> {
  const { data, error } = await supabase.rpc('declare_teacher_role', {
    p_full_name: input.fullName,
    p_contact: input.contact,
    p_subjects: input.subjects,
    p_school_id: input.schoolId ?? undefined,
    p_message: input.message ?? undefined,
  });
  if (error || !data) return { ok: false, error: 'echec' };
  return data as unknown as { ok: boolean; error?: DeclareError; verified?: boolean };
}
