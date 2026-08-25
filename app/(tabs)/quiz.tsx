import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { RichText } from '@/components/MathText';
import { ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { generateQuiz } from '@/ai/tutor';
import { studentContextOf } from '@/ai/plan';
import { SUBJECTS, getSubject } from '@/data/subjects';
import type { GeneratedQuiz, QuizQuestion } from '@/ai/types';

type Answer = { topic: string; ok: boolean };

type Phase =
  | { name: 'select' }
  | { name: 'loading'; subjectId: string }
  | { name: 'error'; subjectId: string }
  | {
      name: 'active';
      quiz: GeneratedQuiz;
      index: number;
      picked: number | null;
      answers: Answer[];
    }
  | { name: 'results'; quiz: GeneratedQuiz; answers: Answer[]; xpGained: number };

export default function QuizScreen() {
  const params = useLocalSearchParams<{ subject?: string }>();
  const { t, profile, progress, applyQuizResults } = useApp();
  const { colors } = useTheme();
  const lang = profile.lang;

  const [phase, setPhase] = useState<Phase>({ name: 'select' });
  const [saving, setSaving] = useState(false);
  const startedFor = useRef<string | null>(null);

  const startQuiz = useCallback(
    async (subjectId: string) => {
      setPhase({ name: 'loading', subjectId });
      const ctx = studentContextOf(profile, progress, subjectId);
      const quiz = await generateQuiz(ctx, subjectId);
      if (!quiz) {
        setPhase({ name: 'error', subjectId });
        return;
      }
      setPhase({ name: 'active', quiz, index: 0, picked: null, answers: [] });
    },
    [profile, progress],
  );

  // Lancement direct depuis le parcours ou l'accueil
  useEffect(() => {
    if (params.subject && startedFor.current !== params.subject) {
      startedFor.current = params.subject;
      startQuiz(params.subject);
    }
  }, [params.subject, startQuiz]);

  // ══ Choix de la matière ═══════════════════════════════════
  if (phase.name === 'select') {
    return (
      <Screen>
        <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
          {t('quiz.title')}
        </Text>
        <Text style={[type.caption, { color: colors.textSoft, marginTop: 2 }]}>
          {t('quiz.subtitle')}
        </Text>

        <Card night style={{ marginTop: 18 }}>
          <View style={styles.row6}>
            <Icon name="sparkles" size={13} color={colors.sky} />
            <Text style={[type.eyebrow, { color: colors.sky }]}>
              {t('quiz.heroEyebrow')}
            </Text>
          </View>
          <Text style={[type.title, { color: colors.onNight, marginTop: 8 }]}>
            {t('quiz.heroTitle')}
          </Text>
          <Text style={[type.body, { color: colors.onNightSoft, marginTop: 6 }]}>
            {t('quiz.heroSub')}
          </Text>
        </Card>

        <View style={{ height: 16 }} />

        {SUBJECTS.map((s) => {
          const best = progress.quizBest[s.id];
          return (
            <Card key={s.id} style={styles.subjectCard} onPress={() => startQuiz(s.id)}>
              <View style={styles.subjectRow}>
                <View style={[styles.subjectIcon, { backgroundColor: s.color }]}>
                  <Icon name={s.icon} size={18} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Text style={[type.cardTitle, { color: colors.text }]}>
                    {s.name[lang]}
                  </Text>
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                    {best !== undefined
                      ? `${t('quiz.bestScore')} · ${best}%`
                      : `${t('quiz.byAi')} ✦`}
                  </Text>
                </View>
                <View style={[styles.playBtn, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="arrow-right" size={16} color={colors.accent} />
                </View>
              </View>
            </Card>
          );
        })}
      </Screen>
    );
  }

  // ══ Génération en cours ═══════════════════════════════════
  if (phase.name === 'loading') {
    const subject = getSubject(phase.subjectId);
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <View style={[styles.bigIcon, { backgroundColor: subject.color }]}>
            <Icon name={subject.icon} size={32} color="#FFFFFF" />
          </View>
          <Text
            style={[type.section, { color: colors.text, marginTop: 18, textAlign: 'center' }]}
          >
            {t('quiz.generating')}
          </Text>
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={{ marginTop: 22 }}
          />
        </View>
      </Screen>
    );
  }

  // ══ Échec de génération ═══════════════════════════════════
  if (phase.name === 'error') {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <View style={[styles.bigIcon, { backgroundColor: colors.danger }]}>
            <Icon name="alert" size={30} color="#FFFFFF" />
          </View>
          <Text style={[type.section, { color: colors.text, marginTop: 18 }]}>
            {t('quiz.genErrorTitle')}
          </Text>
          <Text
            style={[
              type.body,
              { color: colors.textSoft, textAlign: 'center', marginTop: 10, maxWidth: 300 },
            ]}
          >
            {t('quiz.genErrorBody')}
          </Text>
          <View style={styles.errorActions}>
            <Button
              label={t('common.retry')}
              icon="refresh"
              full
              onPress={() => startQuiz(phase.subjectId)}
            />
            <Button
              label={t('quiz.back')}
              variant="ghost"
              full
              onPress={() => setPhase({ name: 'select' })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ══ Résultats ═════════════════════════════════════════════
  if (phase.name === 'results') {
    const { quiz, answers, xpGained } = phase;
    const correct = answers.filter((a) => a.ok).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const perfect = correct === total && total > 0;

    return (
      <Screen>
        <Card night style={styles.resultCard}>
          <View
            style={[
              styles.resultBadge,
              { backgroundColor: perfect ? colors.sky : 'rgba(255,255,255,0.10)' },
            ]}
          >
            <Icon
              name={perfect ? 'award' : pct >= 60 ? 'star' : 'target'}
              size={34}
              color={perfect ? colors.nightDeep : colors.sky}
            />
          </View>

          <Text style={[type.eyebrow, { color: colors.onNightSoft, marginTop: 16 }]}>
            {t('quiz.results')}
          </Text>
          <Text style={[styles.resultScore, { color: colors.onNight }]}>
            {correct}/{total}
          </Text>
          <Text style={[type.cardTitle, { color: colors.onNightSoft }]}>{pct}%</Text>

          {perfect && (
            <View style={[styles.perfectPill, { backgroundColor: colors.sky }]}>
              <Text
                style={{ fontFamily: FONTS.bold, fontSize: 13, color: colors.nightDeep }}
              >
                {t('quiz.perfect')}
              </Text>
            </View>
          )}

          <View style={styles.xpPill}>
            <Icon name="star" size={14} color={colors.sky} />
            <Text style={[type.captionMedium, { color: colors.onNight }]}>
              +{xpGained} {t('quiz.xpEarned')}
            </Text>
          </View>
        </Card>

        <View style={styles.resultActions}>
          <Button
            label={t('quiz.newQuiz')}
            icon="refresh"
            full
            onPress={() => startQuiz(quiz.subjectId)}
          />
          <Button
            label={t('quiz.otherSubject')}
            variant="outline"
            full
            onPress={() => setPhase({ name: 'select' })}
          />
        </View>
      </Screen>
    );
  }

  // ══ Question en cours ═════════════════════════════════════
  const { quiz, index, picked, answers } = phase;
  const question: QuizQuestion = quiz.questions[index];
  const total = quiz.questions.length;
  const subject = getSubject(quiz.subjectId);
  const isLast = index === total - 1;

  const pick = (i: number) => {
    if (picked !== null) return;
    const ok = i === question.correct;
    setPhase({
      name: 'active',
      quiz,
      index,
      picked: i,
      answers: [...answers, { topic: question.topic, ok }],
    });
  };

  const next = async () => {
    if (!isLast) {
      setPhase({ name: 'active', quiz, index: index + 1, picked: null, answers });
      return;
    }
    // Le calcul des XP est fait par le serveur : on attend sa
    // réponse pour afficher un score qui soit bien celui enregistré.
    setSaving(true);
    const xpGained = await applyQuizResults(quiz.subjectId, answers);
    setSaving(false);
    setPhase({ name: 'results', quiz, answers, xpGained });
  };

  return (
    <Screen>
      <View style={styles.quizHead}>
        <Text style={[type.captionMedium, { color: colors.textSoft }]}>
          {t('quiz.question')} {index + 1}/{total}
        </Text>
        <View style={[styles.quizSubject, { backgroundColor: `${subject.color}1F` }]}>
          <Icon name={subject.icon} size={13} color={subject.color} />
          <Text style={[type.caption, { color: subject.color }]}>
            {subject.name[lang]}
          </Text>
        </View>
      </View>

      <ProgressBar
        value={(index + (picked !== null ? 1 : 0)) / total}
        tint={subject.color}
        height={5}
      />

      <Card style={{ marginTop: 18 }}>
        <RichText size={18} color={colors.text} boldColor={colors.accent}>
          {question.q[lang]}
        </RichText>
      </Card>

      <View style={styles.options}>
        {question.opts.map((opt, i) => {
          const revealed = picked !== null;
          const isAnswer = i === question.correct;
          const isCorrectPick = revealed && isAnswer;
          const isWrongPick = picked === i && !isAnswer;

          return (
            <Pressable
              key={i}
              onPress={() => pick(i)}
              disabled={revealed}
              accessibilityRole="button"
              accessibilityLabel={opt[lang]}
              style={[
                styles.option,
                {
                  backgroundColor: isCorrectPick
                    ? `${colors.success}14`
                    : isWrongPick
                      ? `${colors.danger}12`
                      : colors.surface,
                  borderColor: isCorrectPick
                    ? colors.success
                    : isWrongPick
                      ? colors.danger
                      : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.optionLetter,
                  {
                    backgroundColor: isCorrectPick
                      ? colors.success
                      : isWrongPick
                        ? colors.danger
                        : colors.surfaceAlt,
                  },
                ]}
              >
                {isCorrectPick ? (
                  <Icon name="check" size={14} color="#FFFFFF" strokeWidth={2.6} />
                ) : isWrongPick ? (
                  <Icon name="close" size={14} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <Text
                    style={{ fontFamily: FONTS.bold, fontSize: 13, color: colors.textSoft }}
                  >
                    {String.fromCharCode(65 + i)}
                  </Text>
                )}
              </View>
              <View style={styles.optionBody}>
                <RichText size={14.8} color={colors.text}>
                  {opt[lang]}
                </RichText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {picked !== null && (
        <View style={styles.feedback}>
          <Text
            style={[
              type.section,
              { color: picked === question.correct ? colors.success : colors.danger },
            ]}
          >
            {picked === question.correct ? t('quiz.correct') : t('quiz.wrong')}
          </Text>

          {picked !== question.correct && (
            <View style={styles.answerRow}>
              <Text style={[type.body, { color: colors.textSoft }]}>
                {t('quiz.theAnswerWas')}
              </Text>
              <RichText size={14.8} color={colors.text} style={{ fontFamily: FONTS.bold }}>
                {question.opts[question.correct][lang]}
              </RichText>
            </View>
          )}

          {question.expl[lang] !== '' && (
            <Card night style={{ marginTop: 14 }}>
              <View style={styles.row6}>
                <Icon name="bulb" size={14} color={colors.sky} />
                <Text style={[type.eyebrow, { color: colors.sky }]}>
                  {t('quiz.explanation')}
                </Text>
              </View>
              <View style={{ marginTop: 7 }}>
                <RichText color={colors.onNight} boldColor={colors.sky}>
                  {question.expl[lang]}
                </RichText>
              </View>
            </Card>
          )}

          <Button
            label={isLast ? t('quiz.seeResults') : t('quiz.nextQuestion')}
            icon="arrow-right"
            iconRight
            full
            loading={saving}
            onPress={next}
            style={{ marginTop: 16 }}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  subjectCard: { marginBottom: 10 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 110,
    paddingHorizontal: 20,
  },
  bigIcon: {
    width: 78,
    height: 78,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorActions: { gap: 10, marginTop: 26, alignSelf: 'stretch', maxWidth: 300 },

  quizHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  quizSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  questionText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  options: { marginTop: 14, gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    padding: 13,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },

  feedback: { marginTop: 18 },

  resultCard: { marginTop: 26, alignItems: 'center', paddingVertical: 28 },
  resultBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultScore: {
    fontFamily: FONTS.extrabold,
    fontSize: 46,
    letterSpacing: -1.5,
    marginTop: 2,
  },
  perfectPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
  },
  xpPill: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  resultActions: { gap: 10, marginTop: 22 },
});
