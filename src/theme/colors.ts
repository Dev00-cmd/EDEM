// ═══════════════════════════════════════════════════════════════
//  PALETTE TI PWOF — « nuit bleue »
//
//  Bleu nuit profond + bleu électrique, sur papier très clair.
//  Deux thèmes cohérents : les mêmes rôles, deux ambiances.
//
//  Règle : un composant ne code JAMAIS une couleur en dur.
//  Il lit un rôle (colors.accent, colors.surface…) et le thème
//  décide. C'est ce qui garde clair et sombre parfaitement alignés.
// ═══════════════════════════════════════════════════════════════

export type ThemeMode = 'system' | 'light' | 'dark';

/** Couleurs de marque — identiques dans les deux thèmes. */
export const BRAND = {
  ink: '#0D1B2A', // nuit la plus profonde
  navy: '#132640', // nuit
  navyLift: '#1B3355', // nuit relevée (survol, séparateurs)
  blueDeep: '#1E3A8A', // bleu profond
  blue: '#2563EB', // bleu électrique — action principale
  sky: '#38BDF8', // cyan lumineux — accent secondaire
  mist: '#E0F2FE', // brume bleutée
  paper: '#F5F7FA', // papier
  white: '#FFFFFF',
} as const;

/** Couleurs d'accent pour catégoriser (matières, notes, agenda). */
export const ACCENTS = {
  blue: '#2563EB',
  sky: '#38BDF8',
  violet: '#7C3AED',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
} as const;

export type AccentName = keyof typeof ACCENTS;

export interface Palette {
  isDark: boolean;

  // ── Fonds ───────────────────────────────────────────────────
  bg: string; // fond de l'écran
  surface: string; // carte
  surfaceAlt: string; // carte secondaire / champ de saisie
  surfaceHigh: string; // élément survolé ou sélectionné
  border: string; // bordure fine
  borderStrong: string; // bordure marquée

  // ── Texte ───────────────────────────────────────────────────
  text: string; // titre, texte principal
  textSoft: string; // texte secondaire
  textFaint: string; // légende, méta

  // ── Accents ─────────────────────────────────────────────────
  accent: string; // bleu électrique (action principale)
  accentPressed: string; // état pressé
  accentSoft: string; // fond teinté bleu (pastille, badge)
  accentText: string; // texte posé sur l'accent
  sky: string; // cyan lumineux

  // ── Panneau nuit (héro, encarts sombres dans les 2 thèmes) ──
  night: string;
  nightDeep: string;
  onNight: string;
  onNightSoft: string;

  // ── États ───────────────────────────────────────────────────
  success: string;
  warning: string;
  danger: string;

  // ── Ombres ──────────────────────────────────────────────────
  shadow: string;
  shadowOpacity: number;
}

// ═══════════════════════════════════════════════════════════════
//  THÈME CLAIR — papier froid, cartes blanches, bleu franc
// ═══════════════════════════════════════════════════════════════
export const lightColors: Palette = {
  isDark: false,

  bg: BRAND.paper,
  surface: BRAND.white,
  surfaceAlt: '#EEF3F9',
  surfaceHigh: BRAND.mist,
  border: '#E2E9F2',
  borderStrong: '#CBD8E8',

  text: BRAND.ink,
  textSoft: '#4A5B72',
  textFaint: '#8496AC',

  accent: BRAND.blue,
  accentPressed: BRAND.blueDeep,
  accentSoft: 'rgba(37,99,235,0.10)',
  accentText: BRAND.white,
  sky: '#0EA5E9', // cyan assombri pour rester lisible sur blanc

  night: BRAND.navy,
  nightDeep: BRAND.ink,
  onNight: BRAND.paper,
  onNightSoft: 'rgba(245,247,250,0.70)',

  success: '#059669',
  warning: '#D97706',
  danger: '#E11D48',

  shadow: '#0D1B2A',
  shadowOpacity: 0.08,
};

// ═══════════════════════════════════════════════════════════════
//  THÈME SOMBRE — celui des maquettes : nuit bleue, bleu vif
// ═══════════════════════════════════════════════════════════════
export const darkColors: Palette = {
  isDark: true,

  bg: BRAND.ink,
  surface: BRAND.navy,
  surfaceAlt: '#0F2036',
  surfaceHigh: BRAND.navyLift,
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#EAF1F9',
  textSoft: '#A3B4CA',
  textFaint: '#6F819A',

  accent: BRAND.blue,
  accentPressed: '#1D4ED8',
  accentSoft: 'rgba(37,99,235,0.18)',
  accentText: BRAND.white,
  sky: BRAND.sky,

  night: BRAND.navy,
  nightDeep: '#0A1524',
  onNight: '#EAF1F9',
  onNightSoft: 'rgba(234,241,249,0.68)',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',

  shadow: '#000000',
  shadowOpacity: 0.45,
};

export const getColors = (isDark: boolean): Palette =>
  isDark ? darkColors : lightColors;

// ═══════════════════════════════════════════════════════════════
//  Rythme d'espacement et rayons — cohérence de tout le design
// ═══════════════════════════════════════════════════════════════
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;
