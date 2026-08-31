import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, SectionHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { Countdown } from '@/components/Countdown';
import { Icon } from '@/components/Icon';
import { RichText } from '@/components/MathText';
import { ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { FONTS, type } from '@/theme/typography';
import { generateQuiz } from '@/ai/tutor';
import { studentContextOf } from '@/ai/plan';
import { SUBJECTS, getSubject } from '@/data/subjects';
import { QuizHistoryRow } from '@/components/QuizHistoryRow';
import { fetchQuizHistory, type QuizHistoryEntry } from '@/lib/quizHistory';
import type { GeneratedQuiz, QuizQuestion } from '@/ai/types';
import { DIFFICULTIES, difficultyReward, type Difficulty } from '@/config/app';

/**
 * Une réponse donnée.
 *
 * `pick` est l'indice RÉELLEMENT choisi (null si le temps a
 * manqué). C'est lui qu'on envoie au serveur : `ok` ne sert plus
 * qu'à l'affichage local, la correction se fait en base.
 */
type Answer = { topic: string; ok: boolean; pick: number | null };

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
      difficulty: Difficulty;
    }
  | {
      name: 'results';
      quiz: GeneratedQuiz;
      answers: Answer[];
      xpGained: number;
      difficulty: Difficulty;
    };

export default function QuizScreen() {
  const params = useLocalSearchParams<{ subject?: string; assignment?: string }>();
  const { t, profile, progress, applyQuizResults } = useApp();
  const { colors } = useTheme();
  const lang = profile.lang;

  const [phase, setPhase] = useState<Phase>({ name: 'select' });
  const [saving, setSaving] = useState(false);
  // Le niveau reste choisi d un quiz a l autre : un eleve qui
  // travaille en difficile ne veut pas le re-selectionner a chaque fois.
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen');
  const startedFor = useRef<string | null>(null);
  const router = useRouter();

  // Les trois derniers quiz, rechargés à chaque retour sur
  // l'écran de sélection : sinon celui qu'on vient de passer
  // n'apparaîtrait pas.
  const [recent, setRecent] = useState<QuizHistoryEntry[]>([]);
  useEffect(() => {
    if (phase.name !== 'select') return;
    let alive = true;
    fetchQuizHistory(3).then((rows) => {
      if (alive) setRecent(rows);
    });
    return () => {
      alive = false;
    };
  }, [phase.name]);

  const startQuiz = useCallback(
    async (subjectId: string, level: Difficulty, assignmentId?: string | null) => {
      setPhase({ name: 'loading', subjectId });
      const ctx = studentContextOf(profile, progress, subjectId);
      // Devoir de type quiz : c'est le serveur qui impose la
      // difficulté et les notions, et qui refuse un second essai.
      const quiz = await generateQuiz(ctx, subjectId, level, assignmentId);
      if (!quiz) {
        setPhase({ name: 'error', subjectId });
        return;
      }
      setPhase({
        name: 'active',
        quiz,
        index: 0,
        picked: null,
        answers: [],
        difficulty: level,
      });
    },
    [profile, progress],
  );

  // Lancement direct depuis le parcours ou l'accueil
  useEffect(() => {
    if (params.subject && startedFor.current !== params.subject) {
      startedFor.current = params.subject;
      startQuiz(params.subject, difficulty, params.assignment ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {/* ── Niveau de difficulté ──────────────────────────
            L'élève choisit lui-même son niveau, et voit tout de
            suite ce que ça rapporte : sans ce repère, personne ne
            prend le risque de monter en difficulté. */}
        <SectionHeader dash title={t('quiz.chooseLevel')} style={styles.section} />

        <View style={styles.levelRow}>
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.id;
            const tint =
              d.id === 'facile'
                ? colors.success
                : d.id === 'difficile'
                  ? colors.danger
                  : colors.accent;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDifficulty(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.levelCard,
                  {
                    backgroundColor: active ? tint : colors.surface,
                    borderColor: active ? tint : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    type.captionMedium,
                    { color: active ? colors.accentText : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {t(`quiz.level_${d.id}`)}
                </Text>
                <Text
                  style={[
                    type.caption,
                    {
                      color: active ? colors.accentTextSoft : colors.textFaint,
                      marginTop: 2,
                    },
                  ]}
                >
                  +{d.perCorrect} XP
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[type.caption, styles.levelHint, { color: colors.textFaint }]}>
          {t(`quiz.levelHint_${difficulty}`)}
        </Text>

        {recent.length > 0 && (
          <>
            <SectionHeader
              dash
              title={t('history.recent')}
              actionLabel={t('history.seeAll')}
              onAction={() => router.push('/quiz-history')}
              style={styles.section}
            />
            {recent.map((row) => (
              <QuizHistoryRow
                key={row.id}
                entry={row}
                onPress={() =>
                  router.push({ pathname: '/quiz-review', params: { id: row.id } })
                }
              />
            ))}
          </>
        )}

        <SectionHeader dash title={t('quiz.chooseSubject')} style={styles.section} />

        {SUBJECTS.map((s) => {
          const best = progress.quizBest[s.id];
          return (
            <Card key={s.id} style={styles.subjectCard} onPress={() => startQuiz(s.id, difficulty)}>
              <View style={styles.subjectRow}>
                <View style={[styles.subjectIcon, { backgroundColor: s.color }]}>
                  <Icon name={s.icon} size={18} color={colors.accentText} />
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
            <Icon name={subject.icon} size={32} color={colors.accentText} />
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
            <Icon name="alert" size={30} color={colors.accentText} />
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
              onPress={() => startQuiz(phase.subjectId, difficulty)}
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
              { backgroundColor: perfect ? colors.sky : colors.glassBorder },
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

          <View style={[styles.xpPill, { backgroundColor: colors.surfaceAlt }]}>
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
            onPress={() => startQuiz(quiz.subjectId, difficulty)}
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
      answers: [...answers, { topic: question.topic, ok, pick: i }],
      difficulty: phase.difficulty,
    });
  };

  /**
   * Temps écoulé : la question compte comme manquée, et la bonne
   * réponse est révélée. On enregistre `picked: -1` — aucune option
   * n'est alors marquée comme choisie, ce qui distingue « je me suis
   * trompé » de « je n'ai pas eu le temps ».
   */
  const timeOut = () => {
    if (picked !== null) return;
    setPhase({
      name: 'active',
      quiz,
      index,
      picked: -1,
      answers: [...answers, { topic: question.topic, ok: false, pick: null }],
      difficulty: phase.difficulty,
    });
  };

  const next = async () => {
    if (!isLast) {
      setPhase({
        name: 'active',
        quiz,
        index: index + 1,
        picked: null,
        answers,
        difficulty: phase.difficulty,
      });
      return;
    }
    // Le calcul des XP est fait par le serveur : on attend sa
    // réponse pour afficher un score qui soit bien celui enregistré.
    setSaving(true);
    const xpGained = await applyQuizResults(
      quiz.subjectId,
      answers,
      phase.difficulty,
      quiz.sessionId,
      answers.map((a) => a.pick),
    );
    setSaving(false);
    setPhase({
      name: 'results',
      quiz,
      answers,
      xpGained,
      difficulty: phase.difficulty,
    });
  };

  return (
    <Screen>
      <View style={styles.quizHead}>
        <View style={styles.flex}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('quiz.question')} {index + 1}/{total}
          </Text>
          <View
            style={[
              styles.quizSubject,
              { backgroundColor: `${subject.color}1F`, marginTop: 5 },
            ]}
          >
            <Icon name={subject.icon} size={13} color={subject.color} />
            <Text style={[type.caption, { color: subject.color }]}>
              {subject.name[lang]}
            </Text>
          </View>
        </View>

        {/* Le chrono se fige dès que l'élève a répondu : il lit son
            explication sans pression. */}
        <Countdown
          seconds={subject.seconds}
          resetKey={index}
          paused={picked !== null}
          onExpire={timeOut}
        />
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
                  <Icon name="check" size={14} color={colors.accentText} strokeWidth={2.6} />
                ) : isWrongPick ? (
                  <Icon name="close" size={14} color={colors.accentText} strokeWidth={2.6} />
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
            {picked === question.correct
              ? t('quiz.correct')
              : picked === -1
                ? t('quiz.timeUp')
                : t('quiz.wrong')}
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
  section: { marginTop: 22, marginBottom: 12 },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  levelHint: { marginTop: 9, marginHorizontal: 2 },
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
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  resultActions: { gap: 10, marginTop: 22 },
});
