import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { FONT_CAP } from '@/theme/responsive';
import { type } from '@/theme/typography';

type Variant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Place l'icône après le texte (flèche « continuer »). */
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<Size, number> = { sm: 36, md: 46, lg: 52 };

/**
 * Bouton de l'app.
 *
 *  primary  — bleu électrique plein, l'action principale d'un écran
 *  soft     — bleu très dilué, action secondaire fréquente
 *  outline  — contour seul, action neutre
 *  ghost    — sans fond, action tertiaire
 *  danger   — rouge, action destructive
 *
 * Un seul `primary` par écran : c'est ce qui rend la hiérarchie
 * lisible d'un coup d'œil.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 45,
      bounciness: 4,
    }).start();

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.accent, fg: colors.accentText },
    soft: { bg: colors.accentSoft, fg: colors.accent },
    ghost: { bg: 'transparent', fg: colors.textSoft },
    outline: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
    danger: { bg: colors.danger, fg: colors.accentText },
  };

  const { bg, fg, border } = palette[variant];
  const inert = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, full && styles.full, style]}
    >
      <Pressable
        onPress={onPress}
        disabled={inert}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!inert, busy: !!loading }}
        style={({ pressed }) => [
          styles.btn,
          {
            height: HEIGHTS[size],
            paddingHorizontal: size === 'sm' ? 14 : 20,
            backgroundColor: bg,
            borderWidth: border ? 1 : 0,
            borderColor: border,
            opacity: inert ? 0.5 : pressed ? 0.9 : 1,
          },
          // L'ancien bouton principal portait une ombre BLEUE, pour
          // dire « c'est ici qu'on appuie ». Sur un fond nuit, une
          // lueur colorée bave et salit ; et l'aplat d'accent, seule
          // couleur saturée de l'écran, se signale déjà tout seul.
          // Les ombres ne subsistent que sous les barres qui flottent.
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <View style={styles.row}>
            {icon && !iconRight && <Icon name={icon} size={iconSize} color={fg} />}
            <Text
              style={[
                type.button,
                { color: fg, fontSize: size === 'sm' ? 13.5 : 15 },
              ]}
              numberOfLines={1}
              // Le bouton a une hauteur fixe : sans plafond, une
              // police système à 130 % ferait déborder le texte.
              maxFontSizeMultiplier={FONT_CAP.tight}
            >
              {label}
            </Text>
            {icon && iconRight && <Icon name={icon} size={iconSize} color={fg} />}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
