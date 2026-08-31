// ═══════════════════════════════════════════════════════════════
//  RELECTURE D'UN QUIZ PASSÉ
//
//  Le même écran de correction qu'à la fin du quiz, mais
//  consultable des semaines plus tard. C'est là que se trouve
//  l'essentiel de la valeur pédagogique : les explications, et le
//  rappel de ce qu'on avait répondu.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, EmptyState } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { RichText } from '@/components/MathText';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { FONTS, type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { fetchQuizReview, formatDate, type QuizReview } from '@/lib/quizHistory';

export default function QuizReviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const lang = profile.lang;

  const [review, setReview] = useState<QuizReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let alive = true;
    fetchQuizReview(id).then((r) => {
      if (!alive) return;
      setReview(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const header = (
    <View style={styles.head}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="arrow-left" size={18} color={colors.text} />
      </Pressable>
      <Text style={[type.section, { color: colors.text, flex: 1 }]} numberOfLines={1}>
        {t('history.reviewTitle')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Screen bottomInset={24}>
        {header}
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      </Screen>
    );
  }

  if (!review) {
    return (
      <Screen bottomInset={24}>
        {header}
        <Card style={styles.block}>
          <EmptyState
            icon="alert"
            title={t('history.goneTitle')}
            message={t('history.goneBody')}
          />
        </Card>
      </Screen>
    );
  }

  const subject = getSubject(review.subjectId);
  const correct = review.questions.filter((q) => q.picked === q.answer).length;

  return (
    <Screen bottomInset={24}>
      {header}

      {/* ── Résumé ──────────────────────────────────────────── */}
      <Card night style={styles.block}>
        <View style={styles.summaryRow}>
          <View style={[styles.subjectIcon, { backgroundColor: subject.color }]}>
            <Icon name={subject.icon} size={18} color={colors.accentText} />
          </View>
          <View style={styles.flex}>
            <Text style={[type.cardTitle, { color: colors.onNight }]}>
              {subject.name[lang]}
            </Text>
            <Text style={[type.caption, { color: colors.onNightSoft, marginTop: 2 }]}>
              {t(`quiz.level_${review.difficulty}`)} · {formatDate(review.gradedAt, lang)}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: colors.sky }}>
            {review.scorePct}%
          </Text>
        </View>
        <Text style={[type.caption, { color: colors.onNightSoft, marginTop: 10 }]}>
          {t('history.correctOf', {
            correct: `${correct}`,
            total: `${review.questions.length}`,
          })}
        </Text>
      </Card>

      {/* ── Les questions, une par une ──────────────────────── */}
      {review.questions.map((q, i) => {
        const juste = q.picked === q.answer;
        const sansReponse = q.picked === null;

        return (
          <Card key={i} style={styles.block}>
            <View style={styles.qHead}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: juste
                      ? colors.success
                      : sansReponse
                        ? colors.textFaint
                        : colors.danger,
                  },
                ]}
              >
                <Icon
                  name={juste ? 'check' : sansReponse ? 'clock' : 'close'}
                  size={12}
                  color={colors.accentText}
                  strokeWidth={2.6}
                />
              </View>
              <Text style={[type.eyebrow, { color: colors.textFaint }]}>
                {t('quiz.question')} {i + 1}
              </Text>
            </View>

            <View style={styles.qText}>
              <RichText color={colors.text} boldColor={colors.accent}>
                {q.question}
              </RichText>
            </View>

            {q.choices.map((choice, ci) => {
              const estBonne = ci === q.answer;
              const estChoisie = ci === q.picked;

              // Vert = la bonne réponse, toujours visible.
              // Rouge = ce que l'élève avait choisi, à tort.
              const tint = estBonne
                ? colors.success
                : estChoisie
                  ? colors.danger
                  : colors.border;

              return (
                <View
                  key={ci}
                  style={[
                    styles.choice,
                    {
                      borderColor: tint,
                      backgroundColor:
                        estBonne || estChoisie ? `${tint}14` : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <RichText
                      color={estBonne || estChoisie ? colors.text : colors.textSoft}
                      boldColor={colors.accent}
                    >
                      {choice}
                    </RichText>
                  </View>
                  {estChoisie && (
                    <Text
                      style={[
                        type.caption,
                        { color: tint, marginLeft: 8, flexShrink: 0 },
                      ]}
                    >
                      {t('history.yourAnswer')}
                    </Text>
                  )}
                </View>
              );
            })}

            {sansReponse && (
              <Text style={[type.caption, styles.noAnswer, { color: colors.textFaint }]}>
                {t('history.noAnswer')}
              </Text>
            )}

            {q.explanation !== '' && (
              <View
                style={[
                  styles.explain,
                  { backgroundColor: colors.accentSoft, borderColor: colors.border },
                ]}
              >
                <Icon name="sparkles" size={13} color={colors.accent} />
                <View style={styles.flex}>
                  <RichText color={colors.text} boldColor={colors.accent}>
                    {q.explanation}
                  </RichText>
                </View>
              </View>
            )}
          </Card>
        );
      })}
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
    marginBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { marginTop: 40 },

  block: { marginTop: 12 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qText: { marginTop: 10, marginBottom: 12 },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  noAnswer: { marginBottom: 8 },

  explain: {
    flexDirection: 'row',
    gap: 9,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: 11,
    marginTop: 4,
  },
});
