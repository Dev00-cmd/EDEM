// ═══════════════════════════════════════════════════════════════
//  FIL DE CLASSE
//
//  Un chat qui n'existe qu'à l'intérieur d'une classe où un
//  professeur est présent. Pas de messages privés, pas de fil
//  d'école : un mineur ne se retrouve jamais seul dans une
//  conversation.
//
//  Sobriété en data, parce que l'élève paie à l'unité :
//  vingt messages par page, pagination par date (pas d'OFFSET),
//  images téléchargées au clic seulement, et abonnement temps réel
//  ouvert uniquement quand l'écran est au premier plan.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  user_id: string;
  /** Pseudonyme. C'est ce que voient les camarades. */
  affiche: string;
  /** Vrai nom : rendu au SEUL professeur de la classe. */
  vrai_nom: string | null;
  is_teacher: boolean;
  text: string;
  attachment_path: string | null;
  created_at: string;
  /** Non nul si l'auteur l'a réécrit. L'écran le dit. */
  edited_at: string | null;
  flagged: boolean;
  mine: boolean;
}

export type PostError =
  | 'pas_membre'
  | 'message_vide'
  | 'message_trop_long'
  | 'classe_fermee'
  | 'trop_de_messages'
  /** Le filtre de modération a refusé le message : il n'existe nulle part. */
  | 'message_refuse'
  /** La charte n'a pas été acceptée. Le serveur la vérifie aussi. */
  | 'charte_non_acceptee'
  | 'echec';

export const PAGE = 20;

/**
 * Une page du fil, du plus récent au plus ancien.
 * `before` reprend la conversation plus haut.
 */
export async function fetchMessages(
  classroomId: string,
  before?: string | null,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('classroom_messages', {
    p_classroom_id: classroomId,
    p_before: before ?? undefined,
    p_limit: PAGE,
  });
  if (error || !data) return [];
  return data as ChatMessage[];
}

export async function postMessage(
  classroomId: string,
  text: string,
  attachmentPath?: string | null,
): Promise<{ ok: boolean; error?: PostError; id?: string }> {
  const { data, error } = await supabase.rpc('post_classroom_message', {
    p_classroom_id: classroomId,
    p_text: text,
    p_attachment_path: attachmentPath ?? undefined,
  });
  if (error || !data) return { ok: false, error: 'echec' };
  // L'identifiant sert à afficher le message tout de suite, sans
  // attendre la socket ni relire une page entière. C'est aussi lui
  // qui évite le doublon quand le temps réel le rapporte ensuite.
  return data as { ok: boolean; error?: PostError; id?: string };
}

/**
 * Vide le fil. Réservé au professeur — le serveur le vérifie.
 *
 * Si un élève pouvait le faire, le premier usage en serait
 * d'effacer ses propres insultes avant qu'on les signale : la
 * modération aurait un bouton « annuler » à côté d'elle.
 *
 * Les messages sont marqués supprimés, pas effacés. Ils quittent
 * tous les écrans, et le journal garde de quoi comprendre.
 */
export async function clearClassroomChat(
  classroomId: string,
): Promise<{ ok: boolean; supprimes?: number }> {
  const { data } = await supabase.rpc('clear_classroom_chat', {
    p_classroom_id: classroomId,
  });
  return (data as { ok: boolean; supprimes?: number } | null) ?? { ok: false };
}

export type EditError =
  | 'introuvable'
  | 'pas_le_droit'
  | 'en_cours_d_examen'
  | 'trop_tard'
  | 'message_vide'
  | 'message_trop_long'
  | 'message_refuse'
  | 'echec';

/**
 * Réécrit son propre message.
 *
 * L'AUTEUR SEUL — pas le professeur. Il peut supprimer le message
 * d'un élève, c'est de la modération ; le réécrire serait mettre des
 * mots dans la bouche d'un enfant, sous le nom de cet enfant, devant
 * sa classe.
 *
 * Quinze minutes, et le filtre s'applique comme à l'envoi : sans ça,
 * modifier serait le contournement évident — on poste « bonjour »,
 * qui passe, puis on le remplace par ce qu'on voulait écrire.
 */
export async function editMessage(
  messageId: string,
  text: string,
): Promise<{ ok: boolean; error?: EditError }> {
  const { data, error } = await supabase.rpc('edit_classroom_message', {
    p_message_id: messageId,
    p_text: text,
  });
  if (error || !data) return { ok: false, error: 'echec' };
  return data as { ok: boolean; error?: EditError };
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const { data } = await supabase.rpc('delete_classroom_message', {
    p_message_id: messageId,
  });
  return (data as { ok?: boolean } | null)?.ok === true;
}

/**
 * S'abonne aux nouveaux messages d'UNE classe.
 *
 * À n'appeler que lorsque l'écran est au premier plan, et à couper
 * en sortant : un abonnement qui tourne en arrière-plan sur un
 * forfait haïtien, c'est de l'argent perdu par l'élève.
 *
 * La charge utile temps réel ne contient que la ligne brute — pas
 * de jointure, donc pas de pseudonyme. L'appelant complète avec le
 * trombinoscope qu'il a déjà chargé : une jointure de moins à
 * chaque message.
 */
export interface LigneBrute {
  id: string;
  user_id: string;
  text: string;
  attachment_path: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export function subscribeToClassroom(
  classroomId: string,
  onInsert: (row: LigneBrute) => void,
  /**
   * Modification ou suppression. Les deux arrivent en UPDATE : une
   * suppression pose `deleted_at`, elle n'efface pas la ligne.
   *
   * Sans ça, un message réécrit ou retiré resterait affiché tel quel
   * chez les autres jusqu'au rechargement de l'écran — c'est-à-dire
   * exactement au moment où ça compte le moins.
   */
  onUpdate?: (row: LigneBrute) => void,
): RealtimeChannel {
  const canal = supabase.channel(`classe-${classroomId}`).on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'classroom_messages',
      filter: `classroom_id=eq.${classroomId}`,
    },
    (payload) => onInsert(payload.new as never),
  );

  if (onUpdate) {
    canal.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'classroom_messages',
        filter: `classroom_id=eq.${classroomId}`,
      },
      (payload) => onUpdate(payload.new as never),
    );
  }

  return canal.subscribe();
}

export const unsubscribe = (canal: RealtimeChannel | null) => {
  if (canal) supabase.removeChannel(canal);
};
