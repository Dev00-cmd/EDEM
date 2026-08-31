// ═══════════════════════════════════════════════════════════════
//  MOMENT 1 DE L'ONBOARDING — trente secondes, pas plus
//
//  Quatre champs en tout : le prénom (déjà saisi à l'inscription),
//  la langue, la classe, et la série pour ceux qui en ont une.
//
//  L'objectif et les matières ont quitté cet écran. Ils sont
//  utiles, mais les demander ICI, c'est trois écrans de formulaire
//  entre un élève curieux et sa première réponse — et la moitié
//  s'arrête en route. Ils reviennent au moment 2, après que
//  l'élève a vu ce que M. Thomas sait faire, quand il a une raison
//  de vouloir l'améliorer.
//
//  Le parcours ne reste pas vide pour autant : il travaille sur
//  des matières de repli (voir planSubjects) jusqu'à ce que
//  l'élève choisisse les siennes.
// ═══════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/theme';
import { FONTS, type } from '@/theme/typography';
import { useRouter } from 'expo-router';
import { LEVELS } from '@/data/levels';
import { SUBJECTS } from '@/data/subjects';
import { declareTeacherRole } from '@/lib/teacher';
import { SCHOOL_SECTIONS, levelNeedsSection } from '@/data/haiti';
import type { Lang } from '@/i18n';

// ═══════════════════════════════════════════════════════════════
//  QUI ES-TU ? — la question posée dès l'inscription
//
//  Elle vient AVANT tout le reste, parce que la suite en dépend :
//  un professeur n'a ni classe, ni série, ni année d'examen d'État.
//  Lui poser ces questions, c'était lui faire remplir un formulaire
//  d'élève avant de lui donner des droits de professeur.
//
//  Le rôle ne s'écrit PAS ici. L'écran appelle
//  `declare_teacher_role`, seule à pouvoir le poser : un trigger
//  refuse toute écriture de `profiles.role` venue du client. Ce que
//  cet écran choisit, c'est le chemin — pas le droit.
// ═══════════════════════════════════════════════════════════════

const STEPS = 3;


export default function Onboarding() {
  const { t, profile, updateProfile, refresh } = useApp();
  const router = useRouter();
  const { colors } = useTheme();
  const keyboard = useKeyboard();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [envoi, setEnvoi] = useState(false);

  // null = la question n'a pas encore été posée. On ne présume pas
  // « élève » : c'est justement ce que faisait l'ancienne version.
  const [estProf, setEstProf] = useState<boolean | null>(null);

  // La déclaration du professeur, saisie ici plutôt que plus tard :
  // trois champs valent mieux qu'un écran de plus à retrouver.
  const [nomComplet, setNomComplet] = useState('');
  const [contact, setContact] = useState('');
  const [matieres, setMatieres] = useState<string[]>([]);

  const lang = profile.lang;

  // La série se choisit à l'entrée en NS3, pas au NS4 : un élève
  // de NS3 a déjà la sienne. Ne pas la lui demander, ce serait se
  // priver pendant deux ans de ce qui oriente le mieux le tuteur.
  const needsSection = levelNeedsSection(profile.level);

  const canNext = useMemo(() => {
    if (step === 1) return estProf !== null;
    if (step === 2 && !estProf) return profile.level !== '';
    return true;
  }, [step, estProf, profile.level]);

  const next = async () => {
    if (!canNext) {
      setError(t(step === 1 ? 'onboarding.roleNeeded' : 'onboarding.levelNeeded'));
      return;
    }
    setError('');
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }

    // ── Élève : rien de plus, l'aiguillage fait le reste ──────
    if (!estProf) {
      updateProfile({ onboarded: true });
      return;
    }

    // ── Professeur : on déclare, PUIS on ouvre ────────────────
    if (nomComplet.trim().length < 3) return setError(t('teacher.nameNeeded'));
    if (contact.trim().length < 5) return setError(t('teacher.contactNeeded'));
    if (matieres.length === 0) return setError(t('teacher.subjectsNeeded'));

    setEnvoi(true);
    const r = await declareTeacherRole({
      fullName: nomComplet,
      contact,
      subjects: matieres,
      schoolId: profile.schoolId,
    });
    if (!r.ok) {
      setEnvoi(false);
      return setError(r.detail ?? t(`teacher.err_${r.error ?? 'echec'}`));
    }

    updateProfile({ onboarded: true });
    // Le rôle vient d'être posé par le serveur. On relit le profil
    // avant de laisser l'aiguillage décider : sans ça il enverrait
    // le professeur du côté élève, avec un profil encore périmé.
    await refresh();
    setEnvoi(false);
    router.replace('/prof');
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <View style={styles.flex}>
        {/* Contenu rallongé de la hauteur du clavier : en
            edge-to-edge la fenêtre ne se redimensionne plus, et
            sans ce rallongement on ne peut pas atteindre le champ
            masqué. */}
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 40 + keyboard.height },
          ]}
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

          {/* ══ Étape 0 : bienvenue et langue ═════════════════ */}
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
                          { color: selected ? colors.accentText : colors.text },
                        ]}
                      >
                        {t(`onboarding.${l === 'fr' ? 'french' : 'creole'}`)}
                      </Text>
                      <View style={styles.langCheckRow}>
                        {selected && (
                          <Icon name="check-circle" size={15} color={colors.accentText} />
                        )}
                        <Text
                          style={[
                            type.caption,
                            {
                              color: selected
                                ? colors.accentTextSoft
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

          {/* ══ Étape 1 : élève ou professeur ? ═══════════════
              Posée avant tout le reste parce que la suite en
              dépend. Deux cartes larges plutôt que des cases à
              cocher : c'est le choix qui décide de toute
              l'application, il mérite la place. */}
          {step === 1 && (
            <View>
              <Text style={[type.eyebrow, { color: colors.accent, marginTop: 20 }]}>
                {t('onboarding.stepOf', { n: '2', total: String(STEPS) })}
              </Text>
              <Text style={[type.display, { color: colors.text, marginTop: 6 }]}>
                {t('onboarding.whoAreYou')}
              </Text>
              <Text style={[type.body, { color: colors.textFaint, marginTop: 8 }]}>
                {t('onboarding.whoAreYouSub')}
              </Text>

              <View style={{ marginTop: 22, gap: 12 }}>
                {([false, true] as const).map((prof) => {
                  const selected = estProf === prof;
                  return (
                    <Pressable
                      key={String(prof)}
                      onPress={() => setEstProf(prof)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: selected ? colors.accent : colors.surface,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Icon
                        name={prof ? 'landmark' : 'user'}
                        size={22}
                        color={selected ? colors.accentText : colors.accent}
                      />
                      <View style={styles.flex}>
                        <Text
                          style={[
                            type.cardTitle,
                            { color: selected ? colors.accentText : colors.text },
                          ]}
                        >
                          {t(prof ? 'onboarding.iAmTeacher' : 'onboarding.iAmStudent')}
                        </Text>
                        <Text
                          style={[
                            type.caption,
                            {
                              color: selected ? colors.accentTextSoft : colors.textFaint,
                              marginTop: 3,
                            },
                          ]}
                        >
                          {t(prof ? 'onboarding.iAmTeacherSub' : 'onboarding.iAmStudentSub')}
                        </Text>
                      </View>
                      {selected && <Icon name="check-circle" size={18} color={colors.accentText} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ══ Étape 2 (professeur) : sa déclaration ═════════
              Trois champs, et sa salle s'ouvre juste après. Le
              moyen de joindre ne sert pas à autoriser : il sert à
              répondre s'il se passe quelque chose dans sa classe,
              et n'est jamais montré à un élève. */}
          {step === 2 && estProf && (
            <View>
              <Text style={[type.eyebrow, { color: colors.accent, marginTop: 20 }]}>
                {t('onboarding.stepOf', { n: '3', total: String(STEPS) })}
              </Text>
              <Text style={[type.display, { color: colors.text, marginTop: 6 }]}>
                {t('teacher.title')}
              </Text>
              <Text style={[type.body, { color: colors.textFaint, marginTop: 8 }]}>
                {t('teacher.intro')}
              </Text>

              <View style={{ marginTop: 20 }}>
                <Input
                  label={t('teacher.nameLabel')}
                  placeholder={t('teacher.namePlaceholder')}
                  value={nomComplet}
                  onChangeText={setNomComplet}
                  autoCapitalize="words"
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <Input
                  label={t('teacher.contactLabel')}
                  placeholder={t('teacher.contactPlaceholder')}
                  value={contact}
                  onChangeText={setContact}
                  autoCapitalize="none"
                />
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
                  {t('teacher.contactWhy')}
                </Text>
              </View>

              <Text style={[type.captionMedium, { color: colors.textSoft, marginTop: 20 }]}>
                {t('teacher.subjectsLabel')}
              </Text>
              <View style={styles.chipsWrap}>
                {SUBJECTS.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name[lang]}
                    selected={matieres.includes(m.id)}
                    onPress={() =>
                      setMatieres((prev) =>
                        prev.includes(m.id)
                          ? prev.filter((x) => x !== m.id)
                          : [...prev, m.id],
                      )
                    }
                  />
                ))}
              </View>
            </View>
          )}

          {/* ══ Étape 2 (élève) : classe, et série s'il y a lieu ══ */}
          {step === 2 && !estProf && (
            <View>
              <Text style={[type.eyebrow, { color: colors.accent, marginTop: 20 }]}>
                {t('onboarding.stepOf', { n: '3', total: String(STEPS) })}
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
                    onPress={() =>
                      updateProfile({
                        level: lv,
                        // Changer de classe invalide la série : un
                        // élève passé de NS III à 8e AF ne peut pas
                        // garder « Sciences mathématiques ».
                        section: levelNeedsSection(lv) ? profile.section : null,
                      })
                    }
                  />
                ))}
              </View>

              {needsSection && (
                <View style={styles.sectionBlock}>
                  <Text style={[type.title, { color: colors.text }]}>
                    {t('onboarding.whatsSection')}
                  </Text>
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
                    {t('onboarding.whatsSectionSub')}
                  </Text>

                  <View style={styles.chipsWrap}>
                    {SCHOOL_SECTIONS.map((s) => (
                      <Chip
                        key={s.id}
                        label={lang === 'ht' ? s.labelHt : s.labelFr}
                        selected={profile.section === s.id}
                        onPress={() =>
                          updateProfile({
                            section: profile.section === s.id ? null : s.id,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              )}
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
              loading={envoi}
              onPress={next}
            />
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },

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
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: RADIUS.lg,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  sectionBlock: { marginTop: 30 },

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

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },

  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
});
