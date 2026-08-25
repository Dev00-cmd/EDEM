import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Retire le padding interne (carte qui contient une liste). */
  flush?: boolean;
  /** Barre d'accent colorée sur le bord gauche (comme les notes). */
  accent?: string;
  /** Carte en bleu nuit, même en thème clair (encart héro). */
  night?: boolean;
  onPress?: () => void;
}

/**
 * Carte de base. Surface plane, bordure fine, coins généreux.
 * L'ombre est discrète : c'est la bordure qui découpe, pas le flou.
 */
export function Card({ children, style, flush, accent, night, onPress }: CardProps) {
  const { colors } = useTheme();

  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: night ? colors.night : colors.surface,
          borderColor: night ? 'transparent' : colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: colors.shadowOpacity,
        },
        style,
      ]}
    >
      {accent && <View style={[styles.accentBar, { backgroundColor: accent }]} />}
      <View style={flush ? undefined : styles.padding}>{children}</View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Lien d'action à droite — « Voir tout → ». */
  actionLabel?: string;
  onAction?: () => void;
  /** Petit tiret bleu avant le titre, signature des maquettes. */
  dash?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * En-tête de section : « — AUJOURD'HUI » avec son lien à droite.
 * Le tiret bleu est le motif récurrent qui rythme les écrans.
 */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  dash,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionHead, style]}>
      <View style={styles.sectionLeft}>
        {dash && <View style={[styles.dash, { backgroundColor: colors.accent }]} />}
        <View style={styles.flex}>
          <Text style={[type.section, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 1 }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[type.captionMedium, { color: colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
}

/** Écran vide — jamais une page blanche, toujours une explication. */
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[type.cardTitle, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[
          type.body,
          { color: colors.textSoft, textAlign: 'center', marginTop: 4 },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  padding: { padding: 16 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dash: { width: 16, height: 2.5, borderRadius: 2 },
  flex: { flex: 1 },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
