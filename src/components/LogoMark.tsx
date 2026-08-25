import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { APP_NAME } from '@/config/app';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/typography';

/**
 * La marque Ti Pwof : une bulle de dialogue portant l'étincelle
 * de l'IA — l'app, c'est une conversation avec un prof qui sait.
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
        <Defs>
          <LinearGradient id="tipwofBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BRAND.blue} />
            <Stop offset="1" stopColor={BRAND.blueDeep} />
          </LinearGradient>
        </Defs>

        {/* Pastille de marque */}
        <Rect
          x="0"
          y="0"
          width="96"
          height="96"
          rx={rounded ? 26 : 0}
          fill="url(#tipwofBg)"
        />

        {/* La pointe, posée avant le trait qui vient la recouvrir */}
        <Path d="M35 58 L30 73 L51 58 Z" fill={BRAND.white} />

        {/* Le corps de la bulle */}
        <Rect
          x="21"
          y="23"
          width="54"
          height="37"
          rx="14"
          fill="none"
          stroke={BRAND.white}
          strokeWidth="4.6"
        />

        {/* L'étincelle — l'intelligence qui répond */}
        <Path
          d="M48 27 L52.2 36.8 L62 41 L52.2 45.2 L48 55 L43.8 45.2 L34 41 L43.8 36.8 Z"
          fill={BRAND.sky}
        />
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
          fontFamily: FONTS.extrabold,
          fontSize: size * 0.52,
          letterSpacing: -0.8,
          color,
        }}
      >
        {name}
      </Text>
    </View>
  );
}
