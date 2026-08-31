// ═══════════════════════════════════════════════════════════════
//  SIGNALER, EN DEUX TOUCHES
//
//  Une touche sur le drapeau, une touche sur le motif. C'est tout :
//  pas de champ à remplir, pas de confirmation. Un élève de 14 ans
//  qui vient de lire quelque chose de blessant ne remplit pas un
//  formulaire — il ferme l'application.
//
//  Le motif part directement. La précision est facultative et
//  vient après, quand il y en a une.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { useResponsive } from '@/theme/responsive';
import { type } from '@/theme/typography';
import { REPORT_REASONS, type ReportReason } from '@/lib/moderation';

interface Props {
  visible: boolean;
  onPick: (reason: ReportReason) => void;
  onCancel: () => void;
}

export function ReportDialog({ visible, onPick, onCancel }: Props) {
  const { t } = useApp();
  const { colors } = useTheme();
  const { isSmall } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              padding: isSmall ? 18 : 22,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.danger}1F` }]}>
            <Icon name="flag" size={22} color={colors.danger} />
          </View>

          <Text style={[type.section, { color: colors.text, textAlign: 'center' }]}>
            {t('fil.reportTitle')}
          </Text>
          {/* Ce que l'élève a besoin de savoir avant de cliquer :
              qui va le lire, et que son nom ne circulera pas. */}
          <Text
            style={[
              type.caption,
              { color: colors.textFaint, textAlign: 'center', marginTop: 6 },
            ]}
          >
            {t('fil.reportSub')}
          </Text>

          <View style={styles.motifs}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => onPick(r)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.motif,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? `${colors.danger}14` : 'transparent',
                  },
                ]}
              >
                <Text style={[type.body, { color: colors.text, flex: 1 }]}>
                  {t(`fil.reason_${r}`)}
                </Text>
                <Icon name="chevron-right" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={8}>
            <Text
              style={[
                type.caption,
                { color: colors.textFaint, textAlign: 'center', paddingVertical: 10 },
              ]}
            >
              {t('common.cancel')}
            </Text>
          </Pressable>
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
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  motifs: { gap: 8, marginTop: 18 },
  motif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
