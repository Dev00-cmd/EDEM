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
 * Les couleurs de la MARQUE — deux, et elles ne servent qu'au logo.
 *
 * Le logo partage son tracé ET ses couleurs avec
 * `scripts/make_icons.py`, qui produit l'icône posée sur l'écran
 * d'accueil du téléphone. Les deux doivent bouger ENSEMBLE : si tu
 * touches à l'un, relance l'autre.
 *
 * Et sache ce que ça implique : cette icône est NATIVE. Aucune mise
 * à jour OTA ne la repeint. Après un changement de marque, le logo
 * dans l'app est le nouveau dès la mise à jour, mais l'icône sur
 * l'écran d'accueil reste l'ancienne jusqu'au prochain APK.
 *
 * L'ancienne palette en comptait neuf, dont sept que plus personne
 * n'utilisait depuis que l'interface lit des rôles. Elles ne sont
 * pas remplacées, elles sont retirées : une couleur de marque
 * orpheline finit toujours par être reprise ailleurs « parce
 * qu'elle est là », et l'accent unique en meurt.
 */
export const BRAND = {
  /**
   * Le fond de la tuile, et le E évidé dedans.
   *
   * C'est exactement le `background` du thème sombre : sur l'écran
   * de démarrage, dont le fond porte la même valeur, le E se fond
   * dans la page au lieu de s'y détacher d'un ton — la marque y
   * paraît découpée dans l'écran, pas collée dessus.
   */
  ink: '#0E1621',
  /** Le D. */
  blue: '#3B82F6',
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
