// ═══════════════════════════════════════════════════════════════
//  RECHERCHE ET PROPOSITION D'ÉCOLE
//
//  Les deux seuls appels réseau du moment 2. Tout le reste —
//  départements, communes, niveaux, séries — est embarqué dans
//  l'application : un élève haïtien paie sa data à l'unité, et
//  une liste qui ne change jamais n'a pas à être téléchargée.
// ═══════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface School {
  id: string;
  name: string;
  type: string;
  status: string;
  commune_id: string;
  commune: string;
  departement: string;
  /** Nombre total de résultats, toutes pages confondues. */
  total: number;
}

/**
 * Deux caractères suffisent désormais.
 *
 * Une école se désigne souvent par son SIGLE — « ICA » pour
 * International Christian Academy, « IDEPH », « LAP » pour Lycée
 * Alexandre Pétion. Le serveur sait les reconnaître ; exiger trois
 * lettres aurait écarté la moitié d'entre eux.
 */
export const MIN_QUERY = 2;

/** Écoles rendues par page. */
export const PAGE_SCHOOLS = 20;

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
  offset = 0,
): Promise<School[]> {
  const propre = query.trim();
  // Sans texte, on RETOURNE LA LISTE de la commune : la plupart du
  // temps l'élève ne cherche pas, il reconnaît son école dans une
  // liste. Il fallait taper trois lettres pour voir quoi que ce
  // soit — donc ne rien voir du tout quand on ne sait pas écrire le
  // nom exact.
  if (propre !== '' && propre.length < MIN_QUERY) return [];
  const { data, error } = await supabase.rpc('search_schools', {
    p_query: propre === '' ? undefined : propre,
    p_commune_id: communeId ?? undefined,
    p_offset: offset,
    p_limit: PAGE_SCHOOLS,
  });
  if (error || !data) return [];
  return data as School[];
}

/**
 * Ajoute une école absente du référentiel.
 *
 * Elle est disponible IMMÉDIATEMENT, pour elle comme pour les
 * autres élèves de la commune. Le référentiel ne couvre que 8 584
 * des quelque 15 000 écoles d'Haïti : le laisser grandir par
 * l'usage est le seul moyen de le compléter.
 *
 * Ce qui empêche le désordre n'est pas une validation manuelle mais
 * le DÉDOUBLONNAGE : si l'école existe déjà dans la commune, sous
 * quelque orthographe que ce soit, le serveur rend l'existante au
 * lieu d'en créer une deuxième. « lycee petion » ne devient donc
 * jamais un établissement distinct de « Lycée Alexandre Pétion ».
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


// ─── La dernière école utilisée, par appareil ────────────────
//
// Un professeur qui n'enseigne que dans un établissement ne doit
// pas le rechercher à chaque salle. Celui qui en a trois change
// quand il veut : c'est une valeur de départ, pas un réglage.
//
// Locale à l'appareil, comme le reste des préférences d'affichage.
// L'école qui compte vraiment est celle enregistrée SUR LA SALLE,
// en base, par `create_classroom`.
const CLE_ECOLE = '@tipwof/derniere-ecole';

export async function rememberSchool(school: School): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_ECOLE, JSON.stringify(school));
  } catch {
    // Une préférence de confort : son échec ne casse rien.
  }
}

export async function lastSchool(): Promise<School | null> {
  try {
    const brut = await AsyncStorage.getItem(CLE_ECOLE);
    return brut ? (JSON.parse(brut) as School) : null;
  } catch {
    return null;
  }
}
