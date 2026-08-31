// ═══════════════════════════════════════════════════════════════
//  LA CHARTE DE LA CLASSE
//
//  Cinq lignes, à la première entrée dans une classe, écrites pour
//  être comprises par un élève de 14 ans. Pas une politique de
//  confidentialité de trois pages : personne ne les lit, et une
//  règle qu'on n'a pas lue ne protège personne.
//
//  Elle n'est PAS purement décorative : tant qu'elle n'est pas
//  acceptée, le serveur refuse les messages de cet élève. L'écran
//  n'est pas seul à garder la porte, un client modifié ne
//  contourne rien.
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { useResponsive } from '@/theme/responsive';
import { type } from '@/theme/typography';

const REGLES = ['charte.r1', 'charte.r2', 'charte.r3', 'charte.r4', 'charte.r5'];

interface Props {
  visible: boolean;
  /** Acceptée : on laisse entrer. */
  onAccepted: () => void;
  /** « Plus tard » : on sort de l'écran, on n'entre pas sans avoir lu. */
  onDecline: () => void;
}

export function CharteDialog({ visible, onAccepted, onDecline }: Props) {
  const { t, acceptCharter } = useApp();
  const { colors } = useTheme();
  const { isSmall } = useResponsive();
  const [envoi, setEnvoi] = useState(false);

  const accepter = async () => {
    setEnvoi(true);
    const ok = await acceptCharter();
    setEnvoi(false);
    if (ok) onAccepted();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              padding: isSmall ? 20 : 24,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.accent}1F` }]}>
            <Icon name="shield" size={24} color={colors.accent} />
          </View>

          <Text style={[type.section, { color: colors.text, textAlign: 'center' }]}>
            {t('charte.title')}
          </Text>
          <Text
            style={[
              type.caption,
              { color: colors.textFaint, textAlign: 'center', marginTop: 6 },
            ]}
          >
            {t('charte.subtitle')}
          </Text>

          <ScrollView
            style={styles.regles}
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {REGLES.map((cle, i) => (
              <View key={cle} style={styles.regle}>
                <View style={[styles.puce, { borderColor: colors.accent }]}>
                  <Text style={[type.captionMedium, { color: colors.accent }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[type.body, { color: colors.textSoft, flex: 1 }]}>
                  {t(cle)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label={t('charte.accept')}
              onPress={accepter}
              loading={envoi}
              full
            />
            <Pressable onPress={onDecline} accessibilityRole="button" hitSlop={8}>
              <Text
                style={[
                  type.caption,
                  { color: colors.textFaint, textAlign: 'center', paddingVertical: 8 },
                ]}
              >
                {t('charte.later')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
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
    alignSelf: 'center',
    marginBottom: 14,
  },
  // Bornée : sur un petit téléphone en 130 % de police, les cinq
  // règles dépasseraient l'écran et le bouton deviendrait
  // inatteignable.
  regles: { marginTop: 18, maxHeight: 260 },
  regle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  puce: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: 4, marginTop: 20 },
});
