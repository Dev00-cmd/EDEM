// ═══════════════════════════════════════════════════════════════
//  HISTORIQUE COMPLET DES QUIZ
//
//  La liste de tout ce que l'élève a passé. Chaque ligne ouvre la
//  correction, avec les explications.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, EmptyState } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { type } from '@/theme/typography';
import { QuizHistoryRow } from '@/components/QuizHistoryRow';
import { fetchQuizHistory, type QuizHistoryEntry } from '@/lib/quizHistory';

export default function QuizHistoryScreen() {
  const router = useRouter();
  const { t } = useApp();
  const { colors } = useTheme();

  const [rows, setRows] = useState<QuizHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchQuizHistory(50);
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen bottomInset={24} onRefresh={load} refreshing={false}>
      <View style={styles.head}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="arrow-left" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={[type.section, { color: colors.text }]}>
            {t('history.title')}
          </Text>
          {!loading && rows.length > 0 && (
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {t('history.count', { count: `${rows.length}` })}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : rows.length === 0 ? (
        <Card style={styles.block}>
          <EmptyState
            icon="award"
            title={t('history.emptyTitle')}
            message={t('history.emptyBody')}
          />
        </Card>
      ) : (
        rows.map((row) => (
          <QuizHistoryRow
            key={row.id}
            entry={row}
            onPress={() =>
              router.push({ pathname: '/quiz-review', params: { id: row.id } })
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { marginTop: 40 },
  block: { marginTop: 12 },
});
