// Une ligne d'historique de quiz.
//
// Partagée entre l'écran Quiz (les trois derniers) et l'historique
// complet : une seule définition, donc un seul endroit à corriger
// si l'affichage doit changer.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { formatDate, type QuizHistoryEntry } from '@/lib/quizHistory';

export function QuizHistoryRow({
  entry,
  onPress,
}: {
  entry: QuizHistoryEntry;
  onPress: () => void;
}) {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const subject = getSubject(entry.subjectId);

  // Le score se lit d'un coup d'œil grâce à sa couleur : c'est ce
  // que l'élève cherche en parcourant la liste.
  const tint =
    entry.scorePct >= 80
      ? colors.success
      : entry.scorePct >= 50
        ? colors.warning
        : colors.danger;

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: subject.color }]}>
          <Icon name={subject.icon} size={17} color="#FFFFFF" />
        </View>

        <View style={styles.flex}>
          <Text style={[type.bodyMedium, { color: colors.text }]} numberOfLines={1}>
            {subject.name[profile.lang]}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
            {t(`quiz.level_${entry.difficulty}`)} · {formatDate(entry.gradedAt, profile.lang)}
          </Text>
        </View>

        <View style={styles.score}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: tint }}>
            {entry.scorePct}%
          </Text>
          <Text style={[type.caption, { color: colors.textFaint }]}>
            {Math.round((entry.scorePct / 100) * entry.total)}/{entry.total}
          </Text>
        </View>

        <Icon name="chevron-right" size={15} color={colors.textFaint} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { alignItems: 'flex-end', marginRight: 2 },
});
