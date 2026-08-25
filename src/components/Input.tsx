import React, { useState, forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: IconName;
  /** Message d'erreur affiché sous le champ. */
  error?: string;
  /** Champ mot de passe avec l'œil pour révéler. */
  password?: boolean;
}

/**
 * Champ de saisie de l'app.
 *
 * L'état est visible d'un coup d'œil : bordure neutre au repos,
 * bleue quand on écrit, rouge en erreur. L'erreur est écrite en
 * toutes lettres sous le champ, jamais seulement en couleur —
 * pour rester compréhensible en cas de daltonisme.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, icon, error, password, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.accent
      : colors.border;

  return (
    <View>
      {label && (
        <Text style={[type.captionMedium, styles.label, { color: colors.textSoft }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor,
            borderWidth: focused || error ? 1.6 : 1,
          },
        ]}
      >
        {icon && (
          <Icon
            name={icon}
            size={19}
            color={focused ? colors.accent : colors.textFaint}
          />
        )}

        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={password && hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {password && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'
            }
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} size={19} color={colors.textFaint} />
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Icon name="alert" size={13} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger, flex: 1 }]}>{error}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: 7, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    // Annule le padding vertical par défaut d'Android, qui
    // décentre le texte dans un champ de hauteur fixe.
    paddingVertical: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginLeft: 2,
  },
});
