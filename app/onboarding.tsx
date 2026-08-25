import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { LEVELS } from '@/data/levels';
import { SUBJECTS } from '@/data/subjects';
import type { Lang } from '@/i18n';

// Le prénom et la langue sont déjà connus depuis l'inscription :
// il ne reste que ce qui construit vraiment le parcours.
const STEPS = 3;

const GOALS: { id: string; icon: IconName }[] = [
  { id: 'exams', icon: 'award' },
  { id: 'grades', icon: 'chart' },
  { id: 'learn', icon: 'bulb' },
  { id: 'english', icon: 'language' },
];

export default function Onboarding() {
  const { t, profile, updateProfile } = useApp();
  const { colors } = useTheme();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const lang = profile.lang;

  const canNext = useMemo(() => {
    if (step === 1) return profile.level !== '';
    if (step === 2) return profile.favorites.length > 0 && profile.goal !== '';
    return true;
  }, [step, profile]);

  const errorMsg = (s: number): string => {
    if (s === 1) return t('onboarding.levelNeeded');
    if (s === 2) return t('onboarding.subjectsNeeded');
    return '';
  };

  const next = () => {
    if (!canNext) {
      setError(errorMsg(step));
      return;
    }
    setError('');
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    // L'aiguillage du layout racine bascule vers les onglets.
    updateProfile({ onboarded: true });
  };

  const toggleFavorite = (id: string) => {
    const favorites = profile.favorites.includes(id)
      ? profile.favorites.filter((f) => f !== id)
      : [...profile.favorites, id];
    updateProfile({ favorites });
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progression segmentée */}
          <View style={styles.progressTrack}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSeg,
                  { backgroundColor: i <= step ? colors.accent : colors.surfaceAlt },
                ]}
              />
            ))}
          </View>

          {/* ══ Étape 0 : bienvenue ═══════════════════════════ */}
          {step === 0 && (
            <View>
              <View style={[styles.heroWrap, { borderColor: colors.border }]}>
                <Image
                  source={require('../assets/hero.png')}
                  style={styles.hero}
                  resizeMode="cover"
                />
              </View>

              <Text style={[styles.megaTitle, { color: colors.text }]}>
                {profile.name
                  ? lang === 'ht'
                    ? `Bonjou ${profile.name} ✦`
                    : `Bonjour ${profile.name} ✦`
                  : t('onboarding.welcome')}
              </Text>
              <Text style={[type.body, { color: colors.textSoft, marginTop: 12 }]}>
                {t('onboarding.welcomeSub')}
              </Text>

              <View style={styles.badgeRow}>
                {(['badgeAI', 'badgePersonal', 'badgeBilingual'] as const).map((k) => (
                  <View
                    key={k}
                    style={[
                      styles.badge,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  >
                    <Icon
                      name={
                        k === 'badgeAI'
                          ? 'sparkles'
                          : k === 'badgePersonal'
                            ? 'user'
                            : 'language'
                      }
                      size={12}
                      color={colors.accent}
                    />
                    <Text style={[type.caption, { color: colors.textSoft }]}>
                      {t(`onboarding.${k}`)}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[type.eyebrow, styles.sectionLabel, { color: colors.textFaint }]}>
                {t('onboarding.chooseLang')} · Chwazi lang ou
              </Text>

              <View style={styles.langRow}>
                {(['fr', 'ht'] as Lang[]).map((l) => {
                  const selected = lang === l;
                  return (
                    <Pressable
                      key={l}
                      onPress={() => updateProfile({ lang: l })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.langCard,
                        {
                          backgroundColor: selected ? colors.accent : colors.surface,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          type.cardTitle,
                          { color: selected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {t(`onboarding.${l === 'fr' ? 'french' : 'creole'}`)}
                      </Text>
                      <View style={styles.langCheckRow}>
                        {selected && (
                          <Icon name="check-circle" size={15} color="#FFFFFF" />
                        )}
                        <Text
                          style={[
                            type.caption,
                            {
                              color: selected
                                ? 'rgba(255,255,255,0.75)'
                                : colors.textFaint,
                            },
                          ]}
                        >
                          {l === 'fr' ? 'Aa' : 'Ou konprann'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ══ Étape 1 : classe ══════════════════════════════ */}
          {step === 1 && (
            <View>
              <Text style={[type.eyebrow, { color: colors.accent, marginTop: 20 }]}>
                {lang === 'ht' ? 'ETAP 2/3' : 'ÉTAPE 2/3'}
              </Text>
              <Text style={[type.display, { color: colors.text, marginTop: 6 }]}>
                {t('onboarding.whatsLevel')}
              </Text>
              <Text style={[type.body, { color: colors.textFaint, marginTop: 8 }]}>
                {t('onboarding.whatsLevelSub')}
              </Text>

              <View style={styles.chipsWrap}>
                {LEVELS.map((lv) => (
                  <Chip
                    key={lv}
                    label={lv}
                    selected={profile.level === lv}
                    onPress={() => updateProfile({ level: lv })}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ══ Étape 2 : objectif + matières ═════════════════ */}
          {step === 2 && (
            <View>
              <Text style={[type.eyebrow, { color: colors.accent, marginTop: 20 }]}>
                {lang === 'ht' ? 'ETAP 3/3' : 'ÉTAPE 3/3'}
              </Text>
              <Text style={[type.display, { color: colors.text, marginTop: 6 }]}>
                {t('onboarding.whatsGoal')}
              </Text>

              <View style={styles.goalGrid}>
                {GOALS.map((g) => {
                  const selected = profile.goal === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => updateProfile({ goal: g.id })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: selected ? colors.accent : colors.surface,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Icon
                        name={g.icon}
                        size={20}
                        color={selected ? '#FFFFFF' : colors.textSoft}
                      />
                      <Text
                        style={[
                          type.captionMedium,
                          { color: selected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {t(`onboarding.goal_${g.id}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[type.eyebrow, styles.sectionLabel, { color: colors.textFaint }]}>
                {t('onboarding.whatsSubjects')}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>
                {t('onboarding.whatsSubjectsSub')}
              </Text>

              <View style={styles.chipsWrap}>
                {SUBJECTS.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name[lang]}
                    icon={s.icon}
                    tint={s.color}
                    selected={profile.favorites.includes(s.id)}
                    onPress={() => toggleFavorite(s.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorRow}>
              <Icon name="alert" size={14} color={colors.danger} />
              <Text style={[type.captionMedium, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 0 ? (
              <Button
                label={t('common.back')}
                variant="ghost"
                icon="arrow-left"
                size="sm"
                onPress={() => setStep(step - 1)}
              />
            ) : (
              <View />
            )}
            <View style={styles.flex} />
            <Button
              label={step === STEPS - 1 ? t('common.letsGo') : t('common.next')}
              icon="arrow-right"
              iconRight
              onPress={next}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 },

  progressTrack: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },

  heroWrap: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 22,
  },
  hero: { width: '100%', height: 205 },

  megaTitle: {
    fontFamily: FONTS.extrabold,
    fontSize: 38,
    letterSpacing: -1.3,
    lineHeight: 42,
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  sectionLabel: { marginTop: 26, marginBottom: 12 },

  langRow: { flexDirection: 'row', gap: 12 },
  langCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 6,
  },
  langCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },

  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  goalCard: {
    width: '47.5%',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },

  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
});
