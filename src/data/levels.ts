// ═══════════════════════════════════════════════════════════════
//  NIVEAUX SCOLAIRES HAÏTIENS (système MENFP)
//  Les noms sont identiques en français et en créole à Haïti.
// ═══════════════════════════════════════════════════════════════

export const LEVELS: string[] = [
  '4e AF',
  '5e AF',
  '6e AF', // ← examen d'État (Certificat)
  '7e AF',
  '8e AF',
  '9e AF', // ← examen d'État
  'NS I',
  'NS II',
  'NS III',
  'NS IV',
  'Philo', // ← Baccalauréat !
  'Autre',
];

export const EXAM_LEVELS = new Set(['6e AF', '9e AF', 'Philo']);
