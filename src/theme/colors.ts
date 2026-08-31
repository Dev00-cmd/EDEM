// ═══════════════════════════════════════════════════════════════
//  LES RÔLES DE COULEUR
//
//  Ce fichier ne DÉFINIT plus aucune couleur : il distribue les
//  jetons de `theme.ts` sur les rôles que lisent les écrans
//  (`colors.surface`, `colors.textSoft`…).
//
//  Deux niveaux plutôt qu'un seul, exprès. Les jetons disent CE
//  QUE VAUT une couleur, les rôles disent À QUOI elle sert. Un
//  écran qui demanderait `TOKENS.textSecondary` choisirait une
//  valeur ; en demandant `colors.textSoft` il choisit une
//  intention, et le thème clair suit tout seul.
// ═══════════════════════════════════════════════════════════════

import { DARK, LIGHT, RADIUS, SPACING, type Tokens } from './theme';

export { RADIUS, SPACING };
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Les couleurs de la MARQUE — volontairement figées.
 *
 * Elles ne servent qu'au logo, et le logo partage son tracé ET ses
 * couleurs avec `scripts/make_icons.py`, qui produit l'icône posée
 * sur l'écran d'accueil du téléphone. Cette icône est native : une
 * mise à jour OTA ne peut pas la changer. Repeindre le logo ici
 * l'aurait donc désaccordé de l'icône, sur tous les téléphones,
 * sans moyen de rattrapage.
 */
export const BRAND = {
  ink: '#0D1B2A',
  navy: '#132640',
  navyLift: '#1B3355',
  blueDeep: '#1E3A8A',
  blue: '#2563EB',
  sky: '#38BDF8',
  mist: '#E0F2FE',
  paper: '#F5F7FA',
  white: '#FFFFFF',
} as const;

export interface Palette {
  isDark: boolean;

  // ── Fonds ───────────────────────────────────────────────────
  bg: string; // fond de l'écran
  surface: string; // ligne de liste, panneau
  surfaceAlt: string; // champ de saisie, pastille au repos
  surfaceHigh: string; // élément sélectionné
  border: string; // le filet de séparation
  borderStrong: string; // bordure marquée

  // ── Verre ───────────────────────────────────────────────────
  /** Fond des barres flottantes, sous le flou. */
  glass: string;
  /** Contour complet d'une surface de verre. */
  glassBorder: string;
  /** Liseré clair de l'arête supérieure — c'est LUI qui fait l'effet. */
  glassHighlight: string;

  // ── Texte ───────────────────────────────────────────────────
  text: string;
  textSoft: string;
  textFaint: string;

  // ── Accent (un seul, pour l'interactif et l'actif) ──────────
  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentText: string;
  /** Texte de second rang posé sur un aplat d'accent. */
  accentTextSoft: string;
  /**
   * Ancien second accent (cyan). Il pointe désormais sur l'accent
   * unique : deux couleurs d'action se disputaient le regard, et
   * sur un écran vu en plein soleil c'est une de trop.
   */
  sky: string;

  // ── Bulles de conversation ──────────────────────────────────
  bubbleOut: string;
  bubbleIn: string;
  onBubbleOut: string;
  onBubbleIn: string;

  // ── Panneaux jadis « nuit » ─────────────────────────────────
  // Le fond est maintenant nuit lui-même : ces rôles ne créent
  // plus un contraste, ils désignent simplement une surface un
  // cran au-dessus.
  night: string;
  nightDeep: string;
  onNight: string;
  onNightSoft: string;

  // ── États ───────────────────────────────────────────────────
  success: string;
  warning: string;
  danger: string;

  /** Voile derrière une boîte de dialogue. */
  scrim: string;

  // ── Ombres (noires, jamais teintées) ────────────────────────
  shadow: string;
  shadowOpacity: number;
}

/** Distribue un jeu de jetons sur les rôles. Un seul câblage, deux thèmes. */
const build = (k: Tokens, isDark: boolean): Palette => ({
  isDark,

  bg: k.background,
  surface: k.surface,
  surfaceAlt: k.elevated,
  surfaceHigh: k.elevated,
  border: k.separator,
  borderStrong: k.glassBorder,

  glass: k.glass,
  glassBorder: k.glassBorder,
  glassHighlight: k.glassHighlight,

  text: k.textPrimary,
  textSoft: k.textSecondary,
  textFaint: k.textSecondary,

  accent: k.accent,
  accentPressed: k.accentPressed,
  accentSoft: k.accentSoft,
  accentText: k.onAccent,
  accentTextSoft: k.onAccentSoft,
  sky: k.accent,

  bubbleOut: k.bubbleOut,
  bubbleIn: k.bubbleIn,
  // Sombre : bulle bleu nuit. Clair : bulle bleu plein. Blanc dans les deux.
  onBubbleOut: '#FFFFFF',
  onBubbleIn: k.textPrimary,

  night: k.surface,
  nightDeep: k.background,
  onNight: k.textPrimary,
  onNightSoft: k.textSecondary,

  success: k.success,
  warning: k.warning,
  danger: k.danger,

  scrim: k.scrim,

  shadow: '#000000',
  shadowOpacity: isDark ? 0.5 : 0.14,
});

export const darkColors: Palette = build(DARK, true);
export const lightColors: Palette = build(LIGHT, false);

export const getColors = (isDark: boolean): Palette =>
  isDark ? darkColors : lightColors;
