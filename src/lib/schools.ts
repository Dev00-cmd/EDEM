// ═══════════════════════════════════════════════════════════════
//  RECHERCHE ET PROPOSITION D'ÉCOLE
//
//  Les deux seuls appels réseau du moment 2. Tout le reste —
//  départements, communes, niveaux, séries — est embarqué dans
//  l'application : un élève haïtien paie sa data à l'unité, et
//  une liste qui ne change jamais n'a pas à être téléchargée.
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase';

export interface School {
  id: string;
  name: string;
  type: string;
  status: string;
  commune_id: string;
  commune: string;
  departement: string;
}

/** Sous ce seuil, la recherche ramènerait toute la commune. */
export const MIN_QUERY = 3;

/**
 * Cherche une école. Insensible aux accents et à la casse : c'est
 * le serveur qui normalise, « petion » retrouve « Pétion ».
 *
 * `communeId` restreint à la commune de l'élève quand elle est
 * connue — la bonne école y est presque toujours, et la liste
 * reste courte.
 */
export async function searchSchools(
  query: string,
  communeId?: string | null,
): Promise<School[]> {
  if (query.trim().length < MIN_QUERY) return [];
  const { data, error } = await supabase.rpc('search_schools', {
    p_query: query.trim(),
    p_commune_id: communeId ?? undefined,
  });
  if (error || !data) return [];
  return data as School[];
}

/**
 * Ajoute une école absente du référentiel.
 *
 * Elle est créée « en attente » : elle n'apparaîtra aux autres
 * élèves qu'une fois validée, mais celui qui l'a proposée y est
 * rattaché tout de suite. Si l'école existait déjà sous une autre
 * orthographe, le serveur retourne l'existante au lieu d'en créer
 * une deuxième — c'est ce qui empêche « lycee petion » de devenir
 * un établissement distinct.
 */
export async function proposeSchool(
  name: string,
  communeId: string,
  type = 'autre',
): Promise<{ school: School | null; error: string | null }> {
  const { data, error } = await supabase.rpc('propose_school', {
    p_name: name.trim(),
    p_commune_id: communeId,
    p_type: type,
  });
  if (error) return { school: null, error: error.message };
  return { school: data as unknown as School, error: null };
}
