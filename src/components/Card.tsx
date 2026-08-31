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
import { RADIUS } from '@/theme/theme';
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
 * La surface de base.
 *
 * Elle était une CARTE : bordure, coins de 18, ombre portée sur
 * 16 px et `elevation: 3`. Empilées par cinq sur un écran de
 * 320 dp, ces cartes mangeaient la moitié de la hauteur en marges
 * et en flou, pour un contenu qui tient en deux lignes.
 *
 * C'est maintenant un APLAT : la surface se détache du fond par sa
 * seule couleur, comme une ligne de liste. Plus d'ombre — sur un
 * fond sombre, une ombre noire derrière un panneau sombre ne se
 * voit pas ; elle ne faisait que coûter une couche de rendu à des
 * téléphones qui n'en ont pas à revendre. Les seules ombres qui
 * restent dans l'app sont sous ce qui FLOTTE vraiment : les barres
 * de verre.
 */
export function Card({ children, style, flush, accent, night, onPress }: CardProps) {
  const { colors } = useTheme();

  const body = (pressed: boolean) => (
    <View
      style={[
        styles.card,
        {
          // `night` désignait un encart plus sombre que la page. La
          // page EST sombre désormais : le rôle pointe sur la même
          // surface, et l'encart cesse d'être un trou noir.
          backgroundColor: pressed ? colors.surfaceHigh : night ? colors.night : colors.surface,
        },
        style,
      ]}
    >
      {accent && <View style={[styles.accentBar, { backgroundColor: accent }]} />}
      <View style={flush ? undefined : styles.padding}>{children}</View>
    </View>
  );

  if (!onPress) return body(false);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {/* L'appui teinte la surface au lieu de la faire rétrécir :
          un aplat qui change de valeur se lit mieux qu'une mise à
          l'échelle de 0,5 % que personne ne perçoit. */}
      {({ pressed }) => body(pressed)}
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
 * En-tête de section. Le titre passe en texte secondaire : dans une
 * liste dense, l'intitulé d'un groupe est un repère, pas une
 * annonce — c'est le contenu qui doit ressortir, pas l'étiquette.
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
          <Text style={[type.section, { color: colors.textSoft }]}>{title}</Text>
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
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  padding: { padding: 14 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dash: { width: 14, height: 2, borderRadius: 1 },
  flex: { flex: 1 },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
