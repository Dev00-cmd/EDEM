import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { FONT_CAP } from '@/theme/responsive';
import { FONTS, type } from '@/theme/typography';

// ═══════════════════════════════════════════════════════════════
//  Tuile de statistique — « 87 % · Précision »
// ═══════════════════════════════════════════════════════════════

interface StatTileProps {
  icon: IconName;
  value: string | number;
  label: string;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({ icon, value, label, tint, style }: StatTileProps) {
  const { colors } = useTheme();
  const color = tint ?? colors.accent;

  return (
    <View
      style={[styles.tile, { backgroundColor: colors.surface }, style]}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${color}1F` }]}>
        <Icon name={icon} size={15} color={color} />
      </View>
      <Text
        style={[type.stat, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={FONT_CAP.tight}
      >
        {value}
      </Text>
      <Text
        style={[type.caption, { color: colors.textFaint }]}
        numberOfLines={1}
        maxFontSizeMultiplier={FONT_CAP.tight}
      >
        {label}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Barre de progression
// ═══════════════════════════════════════════════════════════════

interface ProgressBarProps {
  /** 0 → 1 */
  value: number;
  tint?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

// La barre passait 7 px de haut. Une progression est une
// information de second plan : 3 px suffisent à la lire, et sept
// barres empilées cessent de rayer l'écran.
export function ProgressBar({ value, tint, height = 3, style }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.border, height, borderRadius: height / 2 },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: tint ?? colors.accent,
        }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Anneau de maîtrise — pourcentage lisible d'un coup d'œil
// ═══════════════════════════════════════════════════════════════

interface RingProps {
  /** 0 → 100 */
  value: number;
  size?: number;
  tint?: string;
  label?: string;
}

export function MasteryRing({ value, size = 54, tint, label }: RingProps) {
  const { colors } = useTheme();
  const color = tint ?? colors.accent;

  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          // Démarre en haut plutôt qu'à droite
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={{ fontFamily: FONTS.semibold, fontSize: size * 0.27, color: colors.text }}>
          {label ?? `${Math.round(pct)}`}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Courbe d'activité — les XP des derniers jours
// ═══════════════════════════════════════════════════════════════

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  tint?: string;
}

/**
 * Petite courbe lissée. Sans axes ni grille : elle montre une
 * tendance (« ça monte »), pas des valeurs précises — celles-ci
 * sont données par les tuiles de stats juste à côté.
 */
export function Sparkline({ points, width = 280, height = 64, tint }: SparklineProps) {
  const { colors } = useTheme();
  const color = tint ?? colors.accent;

  if (points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const max = Math.max(...points, 1);
  const stepX = width / (points.length - 1);
  const pad = 6;
  const usable = height - pad * 2;

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: pad + usable - (p / max) * usable,
  }));

  // Courbe lissée : chaque segment passe par le milieu de deux points
  let line = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const midX = (prev.x + cur.x) / 2;
    line += ` Q ${prev.x} ${prev.y} ${midX} ${(prev.y + cur.y) / 2}`;
    line += ` Q ${cur.x} ${cur.y} ${cur.x} ${cur.y}`;
  }

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} fillOpacity={0.10} />
      <Path
        d={line}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={3.6}
        fill={color}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 3,
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  track: { width: '100%', overflow: 'hidden' },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
