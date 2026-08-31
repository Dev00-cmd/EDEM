// ═══════════════════════════════════════════════════════════════
//  MODÉRATION
//
//  Une messagerie entre mineurs sans modération n'est pas un
//  produit inachevé, c'est un produit dangereux.
//
//  Quatre lignes de défense, de la moins chère à la plus chère :
//    1. la STRUCTURE — pas de messages privés, un adulte est
//       toujours présent (c'est le chat lui-même qui le garantit) ;
//    2. le FILTRE SQL, gratuit, appliqué à l'insertion ;
//    3. le PROFESSEUR, premier modérateur de sa classe ;
//    4. le MODÈLE, seulement sur ce que le filtre a marqué ou
//       qu'on a signalé.
//
//  Ce fichier n'expose que ce dont l'application a besoin. Le
//  filtre et le journal ne se voient pas d'ici : ils vivent en
//  base, hors d'atteinte d'un client modifié.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

/** Les cinq motifs. Ce sont ceux que la base accepte. */
export const REPORT_REASONS = [
  'insulte',
  'harcelement',
  'contenu_sexuel',
  'triche',
  'autre',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportError =
  | 'introuvable'
  | 'deja_signale'
  | 'ton_propre_contenu'
  | 'trop_de_signalements'
  | 'cible_inconnue'
  | 'raison_inconnue'
  | 'echec';

export interface ReportResult {
  ok: boolean;
  error?: ReportError;
  /** Nombre de signalements ouverts sur cette cible, après le sien. */
  signalements?: number;
}

/** Une ligne de la pile de modération du professeur. */
export interface ModerationItem {
  message_id: string;
  auteur_id: string;
  /** Pseudonyme. */
  affiche: string;
  /** Le vrai nom : le professeur le voit dans SA classe. */
  vrai_nom: string | null;
  extrait: string;
  attachment: boolean;
  /** Masqué aux élèves, en attente de la décision du professeur. */
  flagged: boolean;
  raisons: ReportReason[];
  signalements: number;
  details: string[];
  /** L'avis du modèle, s'il est déjà passé. Un avis, pas une décision. */
  verdict_ia: string | null;
  score_ia: number | null;
  created_at: string;
}

/** Un élève dont le filtre a refusé des messages. */
export interface BlockedAttempt {
  user_id: string;
  affiche: string;
  vrai_nom: string | null;
  tentatives: number;
  derniere: string;
}

/** Les trois issues possibles. `laisser` compte autant que les autres. */
export type Decision = 'supprimer' | 'masquer' | 'laisser';

/**
 * Signale un contenu.
 *
 * Le serveur vérifie que celui qui signale VOIT réellement ce
 * qu'il signale : sans ça, n'importe qui enverrait des
 * identifiants au hasard pour faire masquer les messages d'une
 * classe où il n'est pas.
 *
 * Trois signalements de trois PERSONNES différentes masquent le
 * message en attendant la décision du professeur.
 */
export async function reportContent(
  targetType: 'message' | 'submission' | 'profile',
  targetId: string,
  reason: ReportReason,
  detail?: string,
): Promise<ReportResult> {
  const { data, error } = await supabase.rpc('report_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_detail: detail ?? undefined,
  });
  if (error || !data) return { ok: false, error: 'echec' };
  return data as unknown as ReportResult;
}

/** La pile du professeur : signalé, masqué, ou marqué par le filtre. */
export async function fetchModeration(classroomId: string): Promise<ModerationItem[]> {
  const { data, error } = await supabase.rpc('classroom_moderation', {
    p_classroom_id: classroomId,
  });
  if (error || !data) return [];
  return data as ModerationItem[];
}

/**
 * Les tentatives refusées par le filtre, par élève.
 *
 * Le filtre refuse en silence : sans cette liste, un élève qui
 * essaie dix fois par jour d'insulter un camarade serait
 * parfaitement invisible.
 */
export async function fetchBlockedAttempts(classroomId: string): Promise<BlockedAttempt[]> {
  const { data, error } = await supabase.rpc('classroom_blocked_attempts', {
    p_classroom_id: classroomId,
    p_days: 7,
  });
  if (error || !data) return [];
  return data as BlockedAttempt[];
}

/** La décision du professeur. Elle clôt les signalements en cours. */
export async function moderateMessage(
  messageId: string,
  decision: Decision,
): Promise<boolean> {
  const { data } = await supabase.rpc('moderate_message', {
    p_message_id: messageId,
    p_decision: decision,
  });
  return (data as { ok?: boolean } | null)?.ok === true;
}

/**
 * Lance la relecture automatique des messages en attente.
 *
 * C'est le professeur qui déclenche, en ouvrant son écran : rien
 * ne tourne en arrière-plan, et aucune dépense n'a lieu tant que
 * personne ne regarde. Le modèle ne voit QUE les messages déjà
 * marqués ou signalés — jamais le fil.
 *
 * Un échec ne se voit pas à l'écran : l'avis de l'IA est un
 * confort, la pile s'affiche et se traite très bien sans lui.
 */
export async function requestReview(classroomId: string): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke<{ reviewed?: number }>(
      'tutor',
      { body: { action: 'moderate', classroomId } },
    );
    if (error || !data) return 0;
    return data.reviewed ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Accepte la charte.
 *
 * Le serveur la vérifie aussi à chaque message : une charte que
 * seule l'application contrôlerait ne serait qu'une décoration.
 */
export async function acceptCharter(): Promise<string | null> {
  const { data } = await supabase.rpc('accept_charter');
  return (data as { accepted_at?: string } | null)?.accepted_at ?? null;
}
