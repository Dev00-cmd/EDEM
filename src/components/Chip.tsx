import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONT_CAP } from '@/theme/responsive';
import { type } from '@/theme/typography';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  small?: boolean;
  /** Teinte propre à la pastille (couleur de matière). */
  tint?: string;
}

/**
 * Pastille sélectionnable. Sélectionnée : fond bleu plein.
 * Au repos : surface neutre bordée — le contraste entre les deux
 * états doit rester évident même en plein soleil.
 */
export function Chip({ label, selected, onPress, icon, small, tint }: ChipProps) {
  const { colors } = useTheme();
  const accent = tint ?? colors.accent;

  const bg = selected ? accent : colors.surface;
  const fg = selected ? '#FFFFFF' : colors.textSoft;
  const border = selected ? accent : colors.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        small && styles.small,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icon && <Icon name={icon} size={small ? 13 : 15} color={fg} />}
      <Text
        style={[type.captionMedium, small ? styles.labelSm : styles.label, { color: fg }]}
        numberOfLines={1}
        maxFontSizeMultiplier={FONT_CAP.tight}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  small: { paddingVertical: 6, paddingHorizontal: 11 },
  label: { fontSize: 13.5 },
  labelSm: { fontSize: 12 },
});
