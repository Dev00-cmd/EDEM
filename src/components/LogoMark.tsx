import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { APP_NAME } from '@/config/app';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/typography';

/**
 * La marque EDEM : un E dans un D.
 *
 * La forme extérieure est un D — trois coins largement arrondis, le
 * quatrième carré en bas à gauche. C'est ce coin unique qui donne
 * son assise au signe : quatre coins arrondis auraient donné une
 * pastille de plus, indistincte des dizaines d'autres sur l'écran
 * d'accueil d'un téléphone.
 *
 * Le E est ÉVIDÉ, pas posé dessus : il est peint dans la couleur du
 * fond de la tuile. Les deux lettres ne sont donc qu'une seule
 * forme, et le signe reste lisible réduit à 28 px dans une bulle de
 * conversation comme agrandi à 1024 px sur une fiche de store.
 *
 * ⚠️ Ce tracé est le MÊME que celui de `scripts/make_icons.py`,
 * en grille 96×96. Si tu modifies l'un, relance l'autre :
 *     python scripts/make_icons.py
 *
 * Dessinée en vectoriel plutôt qu'en image : nette à toutes les
 * tailles et sur toutes les densités d'écran, sans second fichier.
 */
export function LogoMark({
  size = 40,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 96 96">
        {/* La tuile */}
        <Rect
          x="0"
          y="0"
          width="96"
          height="96"
          rx={rounded ? 22 : 0}
          fill={BRAND.ink}
        />

        {/* Le D — arrondi partout sauf en bas à gauche */}
        <Path
          d="M18 38 A20 20 0 0 1 38 18 L58 18 A20 20 0 0 1 78 38 L78 58 A20 20 0 0 1 58 78 L18 78 Z"
          fill={BRAND.blue}
        />

        {/* Le E, évidé dans le D. La barre du milieu est plus
            courte : c'est ce qui l'empêche de se lire comme un
            simple empilement de trois traits. */}
        <Rect x="30" y="29" width="9" height="38" rx="4.5" fill={BRAND.ink} />
        <Rect x="30" y="29" width="35.5" height="9" rx="4.5" fill={BRAND.ink} />
        <Rect x="30" y="43.5" width="22.5" height="9" rx="4.5" fill={BRAND.ink} />
        <Rect x="30" y="58" width="32.5" height="9" rx="4.5" fill={BRAND.ink} />
      </Svg>
    </View>
  );
}

/**
 * Marque + nom, pour l'écran de connexion et les en-têtes.
 */
export function LogoLockup({
  size = 40,
  color,
  name = APP_NAME,
}: {
  size?: number;
  color: string;
  name?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <LogoMark size={size} />
      <Text
        style={{
          fontFamily: FONTS.semibold,
          fontSize: size * 0.5,
          letterSpacing: -0.4,
          color,
        }}
      >
        {name}
      </Text>
    </View>
  );
}
