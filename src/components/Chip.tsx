import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
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
 * Pastille sélectionnable. Sélectionnée : accent plein.
 * Au repos : un aplat neutre SANS bordure — le contour de 1,5 px
 * dessinait autant de traits qu'il y avait de pastilles, et une
 * rangée de matières finissait en grillage. C'est la valeur du
 * fond qui distingue les deux états, et elle tient en plein soleil.
 */
export function Chip({ label, selected, onPress, icon, small, tint }: ChipProps) {
  const { colors } = useTheme();
  const accent = tint ?? colors.accent;

  const bg = selected ? accent : colors.surfaceAlt;
  const fg = selected ? colors.accentText : colors.textSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        small && styles.small,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
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
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: RADIUS.pill,
  },
  small: { paddingVertical: 6, paddingHorizontal: 11 },
  label: { fontSize: 13 },
  labelSm: { fontSize: 11 },
});
