// ═══════════════════════════════════════════════════════════════
//  TYPOGRAPHIE — quatre tailles, pas une de plus
//
//  L'ancienne échelle avait dix tailles entre 10,5 et 30, des
//  interlettrages négatifs sur les titres et un sur-titre en
//  capitales espacées. C'était une typographie d'affiche.
//
//  Celle-ci en a QUATRE, et c'est tout ce qu'une liste dense
//  demande :
//
//    17 / 600   titre d'écran
//    15 / 500   titre de ligne
//    13 / 400   texte courant
//    11 / 400   métadonnée
//
//  Ni capitales forcées, ni lettrage espacé : les deux ralentissent
//  la lecture, et le second fait de la place là où il n'y en a pas
//  sur un écran de 320 dp.
//
//  LA FAMILLE RESTE SORA. Passer à Inter demandait un paquet de
//  polices supplémentaire — donc plusieurs centaines de kilo-octets
//  à télécharger, sur des forfaits payés au mégaoctet, pour une
//  différence que personne ne verrait à 13 px. Sora en graisses 400
//  à 600 tient exactement le rôle demandé.
//
//  On n'utilise JAMAIS fontWeight : sur Android il reste sans effet
//  sur une police chargée. C'est la FAMILLE qui porte la graisse.
// ═══════════════════════════════════════════════════════════════

import { StyleSheet } from 'react-native';

export const FONTS = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;

/** Les quatre tailles, et leur interlignage. */
export const SIZE = {
  screen: 17,
  row: 15,
  body: 13,
  meta: 11,
} as const;

export const type = StyleSheet.create({
  // ── 17 / 600 — titre d'écran ──────────────────────────────
  display: {
    fontFamily: FONTS.semibold,
    fontSize: SIZE.screen,
    lineHeight: 22,
  },
  title: {
    fontFamily: FONTS.semibold,
    fontSize: SIZE.screen,
    lineHeight: 22,
  },

  // ── 15 / 500 — titre de ligne, titre de section ───────────
  section: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.row,
    lineHeight: 20,
  },
  cardTitle: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.row,
    lineHeight: 20,
  },

  // ── 13 / 400 — texte courant ──────────────────────────────
  body: {
    fontFamily: FONTS.regular,
    fontSize: SIZE.body,
    lineHeight: 18,
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.body,
    lineHeight: 18,
  },

  // ── 11 / 400 — métadonnée, date, légende ──────────────────
  caption: {
    fontFamily: FONTS.regular,
    fontSize: SIZE.meta,
    lineHeight: 15,
  },
  captionMedium: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.meta,
    lineHeight: 15,
  },

  // ── Cas particuliers ──────────────────────────────────────
  /** Étiquette d'onglet : l'endroit le plus contraint de l'app. */
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  /**
   * Intitulé de groupe dans une liste — « Réglages », « Compte ».
   * Il était en capitales espacées ; c'est maintenant une simple
   * ligne de texte secondaire, comme dans Telegram.
   */
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.body,
  },
  button: {
    fontFamily: FONTS.medium,
    fontSize: SIZE.row,
  },
  /** Le seul chiffre autorisé à dépasser 17. */
  stat: {
    fontFamily: FONTS.semibold,
    fontSize: 20,
    lineHeight: 25,
  },
});
