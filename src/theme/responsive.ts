// ═══════════════════════════════════════════════════════════════
//  ADAPTATION À TOUS LES ÉCRANS ANDROID
//
//  Le parc haïtien va du petit téléphone d'entrée de gamme
//  (320 dp de large, écran 4,5") à la tablette scolaire. Trois
//  choses cassent une interface sur ce parc :
//
//   1. LES PETITS ÉCRANS  — les marges et les gros titres pensés
//      pour un écran moderne débordent. On réduit légèrement.
//
//   2. LA TAILLE DE POLICE SYSTÈME — un élève malvoyant peut la
//      régler à 130 %. Sans plafond, les étiquettes d'onglets se
//      chevauchent et les boutons éclatent. On plafonne SANS
//      empêcher l'agrandissement : l'accessibilité est conservée,
//      la mise en page tient.
//
//   3. LES GRANDS ÉCRANS — sur tablette, une colonne de texte
//      pleine largeur devient illisible. On borne la largeur.
//
//  Rien ici ne concerne la netteté : les icônes sont vectorielles
//  (SVG) et les images sont fournies à une résolution suffisante
//  pour les écrans 3x. C'est ce qui garantit qu'aucun élément ne
//  paraît flou, quelle que soit la densité de l'écran.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { PixelRatio, useWindowDimensions } from 'react-native';

/** Largeur de référence : un Android courant (Pixel, Galaxy A…). */
const BASE_WIDTH = 390;

/** En dessous, on considère l'écran « petit ». */
const SMALL_WIDTH = 360;

/** Au-dessus, on est sur une tablette. */
const TABLET_WIDTH = 700;

/** Largeur maximale d'une colonne de contenu confortable à lire. */
export const MAX_CONTENT_WIDTH = 620;

/**
 * Plafonds d'agrandissement du texte.
 * Plus l'élément est contraint, plus le plafond est bas.
 */
export const FONT_CAP = {
  /** Titres : peuvent grandir un peu, ils ont de la place. */
  display: 1.3,
  /** Corps de texte : c'est là que l'accessibilité compte le plus. */
  body: 1.5,
  /** Étiquettes serrées (onglets, pastilles) : très peu de marge. */
  tight: 1.15,
} as const;

export interface Responsive {
  width: number;
  height: number;
  /** Petit téléphone : on resserre les espacements. */
  isSmall: boolean;
  /** Tablette ou grand écran : on borne la largeur du contenu. */
  isTablet: boolean;
  /** Écran très court (paysage, petit appareil) : on allège le vertical. */
  isShort: boolean;
  /**
   * Met une valeur à l'échelle de l'écran, avec des bornes.
   * `scale(20)` donne ~17 sur un petit écran, 20 sur un écran
   * standard, et plafonne sur les très grands.
   */
  scale: (n: number) => number;
  /** Marge latérale des écrans. */
  gutter: number;
}

/**
 * À utiliser dans tout composant dont la mise en page dépend de
 * la taille de l'écran.
 *
 * On passe par `useWindowDimensions` et non `Dimensions.get()` :
 * la valeur se met à jour à la rotation et en écran partagé, que
 * `Dimensions.get()` ne voit pas — c'est la cause classique d'une
 * interface figée de travers après une rotation.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmall = width < SMALL_WIDTH;
    const isTablet = width >= TABLET_WIDTH;
    const isShort = height < 700;

    // On borne le facteur : jamais moins de 88 %, jamais plus de
    // 112 %. Au-delà l'interface se déforme au lieu de s'adapter.
    const factor = Math.min(1.12, Math.max(0.88, width / BASE_WIDTH));

    return {
      width,
      height,
      isSmall,
      isTablet,
      isShort,
      scale: (n: number) => Math.round(n * factor),
      gutter: isSmall ? 16 : isTablet ? 28 : 20,
    };
  }, [width, height]);
}

/**
 * Arrondit une taille à la grille de pixels de l'écran.
 *
 * Une bordure de 1 dp sur un écran 2.75x tombe entre deux pixels
 * et s'affiche floue ou disparaît. Aligner sur la grille rend le
 * trait net sur toutes les densités.
 */
export const crisp = (n: number) =>
  PixelRatio.roundToNearestPixel(n);

/** Épaisseur d'un trait fin, nette sur toutes les densités. */
export const hairline = () => Math.max(1 / PixelRatio.get(), 0.5);
