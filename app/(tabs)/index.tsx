import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, SectionHeader } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { EducareMark } from '@/components/EducareMark';
import { StatTile, ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { useResponsive } from '@/theme/responsive';
import { FONTS, type } from '@/theme/typography';
import { dailyPlan } from '@/ai/plan';
import { getSubject } from '@/data/subjects';
import { tipOfToday } from '@/data/tips';

function dayOfYear(): number {
  const now = new Date();
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    t,
    profile,
    progress,
    level,
    levelProgress,
    touchActivity,
    offline,
    syncing,
    refresh,
    shouldTune,
  } = useApp();
  const { colors } = useTheme();
  const { width, isSmall } = useResponsive();
  const [question, setQuestion] = useState('');

  // L'illustration du héro suit la largeur de l'écran plutôt que
  // d'être figée : sur un petit téléphone elle écraserait le texte.
  const heroArt = Math.round(Math.min(240, Math.max(150, width * 0.52)));

  const lang = profile.lang;
  const hour = new Date().getHours();
  const greetKey =
    hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening';

  // « Personnalise ton tuteur » — le moment 2 de l'onboarding.
  //
  // Il s'ouvre depuis l'accueil, et de nulle part ailleurs : c'est
  // l'écran où l'élève revient une fois son travail terminé. Le
  // déclencher depuis un quiz ou une conversation lui couperait la
  // main en plein milieu.
  useEffect(() => {
    if (shouldTune) router.replace('/tune-profile');
  }, [shouldTune, router]);

  const plan = useMemo(() => dailyPlan(profile, progress), [profile, progress]);
  const tip = tipOfToday(dayOfYear());
  const accuracy =
    progress.answered > 0
      ? Math.round((progress.correct / progress.answered) * 100)
      : 0;

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    touchActivity();
    router.push({ pathname: '/(tabs)/chat', params: { prefill: q } });
    setQuestion('');
  };

  return (
    <Screen onRefresh={refresh} refreshing={syncing}>
      {/* ── En-tête ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[type.caption, { color: colors.textSoft }]}>
            {t(greetKey)},
          </Text>
          <Text style={[type.display, { color: colors.text }]} numberOfLines={1}>
            {profile.name || 'Elève'} 👋
          </Text>
        </View>
        <EducareMark size={44} />
      </View>

      {offline && (
        <View style={[styles.offline, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name="alert" size={14} color={colors.warning} />
          <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
            {t('sync.offline')}
          </Text>
        </View>
      )}

      {/* ── Panneau héro ────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: colors.night }]}>
        <Image
          source={require('../../assets/hero.png')}
          // L'illustration est fournie en 1024² et affichée à ~200 dp :
          // elle reste nette jusqu'aux écrans 4x.
          style={[
            styles.heroImg,
            { width: heroArt, height: heroArt, right: -heroArt * 0.14 },
          ]}
          resizeMode="cover"
        />
        <View style={[styles.heroBody, { paddingRight: heroArt * 0.42 }]}>
          <View style={styles.heroTop}>
            <Icon name="sparkles" size={13} color={colors.sky} />
            <Text style={[type.eyebrow, { color: colors.sky, flex: 1 }]}>
              {t('home.heroEyebrow')}
            </Text>
            <View style={[styles.streak, { backgroundColor: colors.accentSoft }]}>
              <Icon name="flame" size={13} color={colors.sky} />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: colors.sky }}>
                {progress.streak}
              </Text>
            </View>
          </View>

          <Text style={[type.title, styles.heroTitle, { color: colors.onNight }]}>
            {t('home.heroTitle')}
          </Text>

          {/* Poser une question sans quitter l'accueil.
              Le champ déborde sous l'illustration pour gagner en
              largeur — la marge est calculée, jamais codée en dur,
              sinon il sortirait de l'écran sur un petit téléphone. */}
          <View
            style={[
              styles.askBox,
              { backgroundColor: colors.surfaceAlt, marginRight: -heroArt * 0.36 },
            ]}
          >
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={t('home.askPlaceholder')}
              placeholderTextColor={colors.textFaint}
              multiline
              style={[styles.askInput, { color: colors.text }]}
              onSubmitEditing={() => ask(question)}
            />
            <Pressable
              onPress={() => ask(question)}
              accessibilityRole="button"
              accessibilityLabel={t('home.askPlaceholder')}
              style={[styles.sendBtn, { backgroundColor: colors.accent }]}
            >
              <Icon name="send" size={18} color={colors.accentText} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Statistiques ────────────────────────────────────── */}
      <View style={[styles.statsRow, { gap: isSmall ? 7 : 10 }]}>
        <StatTile
          icon="star"
          value={`${t('home.level')} ${level}`}
          label={`${progress.xp} XP`}
        />
        <StatTile
          icon="target"
          value={`${accuracy}%`}
          label={t('home.accuracy')}
          tint={colors.success}
        />
        <StatTile
          icon="book"
          value={progress.studiedCount}
          label={t('home.studied')}
          tint={colors.sky}
        />
      </View>
      <ProgressBar value={levelProgress} style={{ marginTop: 12 }} />

      {/* ── Plan du jour ────────────────────────────────────── */}
      <SectionHeader
        dash
        title={t('home.todayPlan')}
        subtitle={t('home.todayPlanSub')}
        actionLabel={`${t('home.seePath')} →`}
        onAction={() => router.push('/(tabs)/path')}
        style={styles.section}
      />

      {plan.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: colors.textSoft }]}>{t('path.empty')}</Text>
        </Card>
      ) : (
        plan.map((item) => {
          const subject = getSubject(item.subjectId);
          const isLearn = item.kind === 'learn';

          return (
            <Card
              key={item.id}
              accent={subject.color}
              style={styles.planCard}
              onPress={() =>
                isLearn
                  ? router.push({
                      pathname: '/(tabs)/chat',
                      params: {
                        subject: item.subjectId,
                        planTopic: item.topicId ?? '',
                        prefill:
                          lang === 'ht'
                            ? `Esplike m « ${item.title.ht} » pou yon elèv ${profile.level}.`
                            : `Explique-moi « ${item.title.fr} » pour un élève de ${profile.level}.`,
                      },
                    })
                  : router.push({
                      pathname: '/(tabs)/quiz',
                      params: { subject: item.subjectId },
                    })
              }
            >
              <View style={styles.planRow}>
                <View
                  style={[styles.planIcon, { backgroundColor: `${subject.color}1F` }]}
                >
                  <Icon
                    name={isLearn ? subject.icon : 'flash'}
                    size={19}
                    color={subject.color}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title[lang]}
                  </Text>
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                    {isLearn ? t('path.learn') : t('path.practice')} ·{' '}
                    {subject.name[lang]}
                  </Text>
                </View>
                <Icon name="chevron-right" size={17} color={colors.textFaint} />
              </View>
            </Card>
          );
        })
      )}

      {/* ── Astuce du jour ──────────────────────────────────── */}
      <Card night style={styles.tipCard}>
        <View style={styles.tipRow}>
          <View style={[styles.tipIcon, { backgroundColor: colors.accentSoft }]}>
            <Icon name="bulb" size={18} color={colors.sky} />
          </View>
          <View style={styles.flex}>
            <Text style={[type.captionMedium, { color: colors.onNight }]}>
              {t('home.tipOfDay')}
            </Text>
            <Text style={[type.body, { color: colors.onNightSoft, marginTop: 3 }]}>
              {tip[lang]}
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 18,
  },

  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 14,
  },

  hero: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  heroImg: { position: 'absolute', top: -24, opacity: 0.9 },
  heroBody: { padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroTitle: { marginTop: 12 },
  askBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 7,
    marginTop: 18,
  },
  askInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14.5,
    lineHeight: 20,
    maxHeight: 80,
    paddingTop: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', marginTop: 16 },

  section: { marginTop: 22, marginBottom: 10 },

  // 2 px entre deux lignes : c'est le fond de la page qui passe au
  // travers, et il tient lieu de filet de séparation. Dix pixels de
  // marge faisaient de chaque étape une carte isolée.
  planCard: { marginBottom: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4 },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipCard: { marginTop: 16 },
  tipRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
