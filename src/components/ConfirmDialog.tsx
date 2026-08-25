import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { useResponsive } from '@/theme/responsive';
import { type } from '@/theme/typography';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  /** Libellé du bouton qui valide. */
  confirmLabel: string;
  cancelLabel: string;
  /** Rouge + icône d'alerte, pour une action irréversible. */
  destructive?: boolean;
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
  /** Affiche un état de chargement sur le bouton de validation. */
  busy?: boolean;
}

/**
 * Boîte de confirmation de l'app.
 *
 * Pourquoi pas `Alert.alert` ? Parce qu'il n'existe pas sur le web
 * (react-native-web ne l'implémente pas) : le bouton semble alors
 * mort, sans le moindre message d'erreur. Cette boîte fonctionne
 * sur Android, iOS et le web, et porte l'identité de l'app plutôt
 * qu'une fenêtre système.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  icon,
  onConfirm,
  onCancel,
  busy,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { isSmall } = useResponsive();

  const tint = destructive ? colors.danger : colors.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Le bouton retour d'Android doit fermer la boîte, pas
      // quitter l'écran.
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Le fond sombre ferme aussi la boîte : geste attendu partout. */}
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      >
        {/* On stoppe la propagation : toucher la carte ne ferme pas. */}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              padding: isSmall ? 20 : 24,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${tint}1F` }]}>
            <Icon name={icon ?? (destructive ? 'alert' : 'info')} size={24} color={tint} />
          </View>

          <Text style={[type.section, { color: colors.text, textAlign: 'center' }]}>
            {title}
          </Text>
          <Text
            style={[
              type.body,
              { color: colors.textSoft, textAlign: 'center', marginTop: 8 },
            ]}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={busy}
              full
            />
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} full />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,12,24,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 22 },
});
