// ═══════════════════════════════════════════════════════════════
//  NIVEAUX SCOLAIRES HAÏTIENS (système MENFP)
//
//  Ce fichier ne contient plus la liste : elle vient du
//  référentiel, lui-même recopié de la base. Une seule source de
//  vérité, sinon les deux divergent au premier oubli.
//
//  UNE CORRECTION AU PASSAGE. La 6e AF était marquée comme année
//  d'examen d'État. Elle ne l'est plus : les examens de 6e année
//  fondamentale ont été supprimés à la rentrée 2014-2015. Les
//  examens d'État d'aujourd'hui sont la 9e AF et le NS4 (plus le
//  bac traditionnel, pour les élèves encore en Philo).
//
//  L'erreur n'était heureusement affichée nulle part —
//  EXAM_LEVELS n'était utilisé par aucun écran. C'était un piège
//  posé pour plus tard, pas un bug visible.
// ═══════════════════════════════════════════════════════════════

import { SCHOOL_LEVELS } from './haiti';

/** Les niveaux, dans l'ordre de la scolarité. */
export const LEVELS: string[] = SCHOOL_LEVELS.map((l) => l.id);

/** Les années qui se terminent par un examen d'État. */
export const EXAM_LEVELS: Set<string> = new Set(
  SCHOOL_LEVELS.filter((l) => l.hasExam).map((l) => l.id),
);
