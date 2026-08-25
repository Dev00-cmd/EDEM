// ═══════════════════════════════════════════════════════════════
//  TYPOGRAPHIE — Sora
//
//  Une seule famille, quatre graisses. Sora a des formes
//  géométriques et une belle personnalité en gros titre : c'est
//  elle qui donne à l'app son air « conçu », pas générique.
//
//  On n'utilise JAMAIS fontWeight directement : sur Android,
//  fontWeight ne fonctionne pas avec les polices chargées.
//  On choisit la famille (Sora_700Bold) — c'est la graisse.
// ═══════════════════════════════════════════════════════════════

import { StyleSheet } from 'react-native';

export const FONTS = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;

/**
 * Échelle typographique de l'app.
 * Les gros titres sont serrés (letterSpacing négatif) — c'est ce
 * qui donne le côté net et affirmé des maquettes.
 */
export const type = StyleSheet.create({
  // Titres d'écran — « Mes notes », « Agenda »
  display: {
    fontFamily: FONTS.extrabold,
    fontSize: 30,
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  // Titres de section — « Aujourd'hui »
  section: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  // Titre de carte
  cardTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15.5,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  // Corps de texte
  body: {
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: 14.5,
    lineHeight: 21,
  },
  // Texte secondaire, méta, dates
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    lineHeight: 17,
  },
  captionMedium: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  // Étiquettes de la barre d'onglets
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  // Sur-titre en capitales — « PALETTE DE COULEURS »
  eyebrow: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  // Étiquette de bouton
  button: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  // Chiffres mis en avant (XP, score, niveau)
  stat: {
    fontFamily: FONTS.extrabold,
    fontSize: 22,
    letterSpacing: -0.6,
  },
});
