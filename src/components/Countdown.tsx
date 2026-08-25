// ═══════════════════════════════════════════════════════════════
//  COMPTE À REBOURS DE QUIZ
//
//  Chaque question est limitée dans le temps, et la durée dépend
//  de la matière (voir `seconds` dans src/data/subjects.ts) : une
//  équation demande de poser un calcul, une date d'histoire se
//  sait ou ne se sait pas.
//
//  Le chrono sert à préparer les examens d'État, où le temps est
//  la vraie contrainte. Il doit donc mettre une pression réelle
//  sans stresser inutilement : il ne devient rouge que dans les
//  dernières secondes.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/typography';

interface CountdownProps {
  /** Durée totale accordée, en secondes. */
  seconds: number;
  /** Remet le chrono à zéro quand cette valeur change (n° de question). */
  resetKey: number | string;
  /** Suspend le décompte — dès que l'élève a répondu. */
  paused?: boolean;
  /** Appelé une seule fois quand le temps est écoulé. */
  onExpire: () => void;
  size?: number;
}

export function Countdown({
  seconds,
  resetKey,
  paused,
  onExpire,
  size = 44,
}: CountdownProps) {
  const { colors } = useTheme();
  const [left, setLeft] = useState(seconds);

  // Gardé dans une ref : la fonction change à chaque rendu du
  // parent, et on ne veut surtout pas relancer le minuteur pour ça.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  // Empêche un double appel si le composant se rerend au moment
  // exact où le temps tombe à zéro.
  const fired = useRef(false);

  useEffect(() => {
    setLeft(seconds);
    fired.current = false;
  }, [resetKey, seconds]);

  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!fired.current) {
            fired.current = true;
            expire.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused, resetKey, seconds]);

  const ratio = seconds > 0 ? left / seconds : 0;
  const urgent = left <= 10 && left > 0;
  const tint = urgent ? colors.danger : left <= seconds * 0.35 ? colors.warning : colors.accent;

  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = ratio * circumference;

  const mm = Math.floor(left / 60);
  const ss = left % 60;
  const label = mm > 0 ? `${mm}:${`${ss}`.padStart(2, '0')}` : `${ss}`;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityLabel={`${left} secondes restantes`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          // Le compte à rebours démarre en haut et tourne dans le
          // sens des aiguilles, comme un vrai chronomètre.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center}>
        {left === 0 ? (
          <Icon name="clock" size={size * 0.4} color={colors.danger} />
        ) : (
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: size * (label.length > 2 ? 0.3 : 0.36),
              color: tint,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
