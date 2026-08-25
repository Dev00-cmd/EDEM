import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { APP_NAME } from '@/config/app';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/typography';

/**
 * La marque Ti Pwof : un livre ouvert surmonté d'une étincelle —
 * l'école et l'IA dans un même signe.
 *
 * Dessinée en SVG plutôt qu'en image : nette à toutes les tailles,
 * et elle change de couleur avec le thème sans second fichier.
 */
export function LogoMark({ size = 40, rounded = true }: { size?: number; rounded?: boolean }) {
  const radius = rounded ? 26 : 0;

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
        <Rect x="0" y="0" width="96" height="96" rx={radius} fill="url(#tipwofBg)" />

        {/* Livre ouvert */}
        <Path
          d="M20 34.5c8.5-4.2 16-4.2 24 0v33c-8-4.2-15.5-4.2-24 0Z"
          fill="none"
          stroke={BRAND.white}
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        <Path
          d="M76 34.5c-8.5-4.2-16-4.2-24 0v33c8-4.2 15.5-4.2 24 0Z"
          fill="none"
          stroke={BRAND.white}
          strokeWidth="4.2"
          strokeLinejoin="round"
        />

        {/* Étincelle — l'intelligence qui éclaire la page */}
        <Path
          d="m48 12 3.6 9.4L61 25l-9.4 3.6L48 38l-3.6-9.4L35 25l9.4-3.6Z"
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
