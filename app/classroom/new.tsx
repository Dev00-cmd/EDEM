// ═══════════════════════════════════════════════════════════════
//  OUVRIR UNE CLASSE
//
//  Réservé aux comptes professeur — et le serveur le vérifie, pas
//  seulement cet écran : `create_classroom` refuse tout appel dont
//  le profil n'a pas le rôle.
//
//  L'école est reprise du profil du professeur plutôt que d'ouvrir
//  une seconde recherche : il l'a déjà renseignée, et une classe
//  rattachée à la mauvaise école fausserait tout le reste.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SchoolPicker } from '@/components/SchoolPicker';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { type } from '@/theme/typography';
import { SUBJECTS } from '@/data/subjects';
import { SCHOOL_LEVELS } from '@/data/haiti';
import { createClassroom } from '@/lib/classrooms';
import { lastSchool, rememberSchool, type School } from '@/lib/schools';

export default function NouvelleClasse() {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;
  const [nom, setNom] = useState('');
  const [matiere, setMatiere] = useState('');
  const [niveau, setNiveau] = useState(profile.level || '');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [code, setCode] = useState('');

  // L'école appartient à la SALLE, pas au professeur : beaucoup
  // enseignent dans deux ou trois établissements. La dernière
  // utilisée revient par défaut — celui qui n'en a qu'une ne la
  // rechoisit jamais.
  const [ecole, setEcole] = useState<School | null>(null);

  useEffect(() => {
    lastSchool().then((e) => {
      if (e) setEcole(e);
    });
  }, []);

  const creer = async () => {
    if (!ecole) return setErreur(t('classroom.schoolNeeded'));
    if (nom.trim().length < 2) return setErreur(t('classroom.nameNeeded'));
    if (!matiere) return setErreur(t('classroom.subjectNeeded'));
    if (!niveau) return setErreur(t('classroom.levelNeeded'));

    setErreur('');
    setEnvoi(true);
    const r = await createClassroom({
      schoolId: ecole.id,
      name: nom,
      subjectId: matiere,
      gradeLevel: niveau,
    });
    setEnvoi(false);
    // Retenue pour la prochaine salle, sur cet appareil seulement.
    rememberSchool(ecole);
    if (!r.ok) {
      return setErreur(
        r.error === 'trop_de_classes'
          ? t('classroom.tooMany')
          : t('classroom.failed'),
      );
    }
    setCode(r.joinCode ?? '');
  };

  // ── Le rôle professeur n'est pas accordé ────────────────────
  //
  // Le serveur refuse déjà : `create_classroom` vérifie le rôle, et
  // trois autres chemins ont été essayés sans succès. Mais laisser
  // remplir tout un formulaire pour finir sur un refus, c'est faire
  // croire que ça a failli marcher. On le dit d'emblée.
  //
  // En pratique un élève n'arrive plus jamais ici : ni son profil
  // ni sa liste de classes n'y mènent. Cet écran reste le dernier
  // filet, pas un chemin.
  if (profile.role !== 'prof') {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <Text style={[type.title, { color: colors.text }]}>{t('classroom.newTitle')}</Text>
        </View>

        <Card accent={colors.warning} style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={16} color={colors.warning} />
            <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
              {t('classroom.needRoleTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 10 }]}>
            {t('classroom.needRoleBody')}
          </Text>
          {/* Plus de raccourci « Je suis professeur » ici. Le
              choix se fait à l'inscription, sur un écran qui le
              pose franchement — pas au détour d'un refus, où il se
              lit comme une porte à pousser. */}
          <Button
            label={t('common.back')}
            variant="ghost"
            full
            style={{ marginTop: 14 }}
            onPress={() => router.back()}
          />
        </Card>
      </Screen>
    );
  }

  // ── La classe est créée : on montre le code ─────────────────
  if (code) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/classes')} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <Text style={[type.title, { color: colors.text }]}>{t('classroom.created')}</Text>
        </View>

        <Card night style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={[type.eyebrow, { color: colors.sky }]}>{t('classroom.codeLabel')}</Text>
          <Text style={[styles.code, { color: colors.onNight }]}>{code}</Text>
          <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10 }]}>
            {t('classroom.codeHint')}
          </Text>
        </Card>

        <Button
          label={t('classroom.backToClasses')}
          full
          style={{ marginTop: 20 }}
          onPress={() => router.replace('/classes')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 60 + keyboard.height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <Text style={[type.title, { color: colors.text }]}>{t('classroom.newTitle')}</Text>
        </View>

        {/* ── L'école de CETTE salle ────────────────────────
            L'écran renvoyait vers « Personnalise ton tuteur » —
            un formulaire d'élève qui demande la série et l'année
            d'examen d'État. Un professeur n'a rien à y répondre.

            Et l'école n'est pas une propriété du professeur : en
            Haïti on complète souvent un poste au lycée public par
            des heures dans le privé. Elle se choisit donc ici, pour
            chaque salle. */}
        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('classroom.schoolLabel')}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 4 }]}>
            {t('classroom.schoolHint')}
          </Text>
          <SchoolPicker
            value={ecole}
            onPick={setEcole}
            communeId={profile.communeId}
          />
        </View>

        <View style={styles.field}>
          <Input
            label={t('classroom.nameLabel')}
            placeholder={t('classroom.namePlaceholder')}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('classroom.subjectLabel')}
          </Text>
          <View style={styles.chips}>
            {SUBJECTS.map((s) => (
              <Chip
                key={s.id}
                label={s.name[lang]}
                icon={s.icon}
                tint={s.color}
                selected={matiere === s.id}
                onPress={() => setMatiere(s.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('classroom.levelLabel')}
          </Text>
          <View style={styles.chips}>
            {SCHOOL_LEVELS.filter((l) => l.cycle !== 'autre').map((l) => (
              <Chip
                key={l.id}
                label={l.id}
                selected={niveau === l.id}
                onPress={() => setNiveau(l.id)}
              />
            ))}
          </View>
        </View>

        {erreur !== '' && (
          <View style={styles.msg}>
            <Icon name="alert" size={14} color={colors.danger} />
            <Text style={[type.captionMedium, { color: colors.danger }]}>{erreur}</Text>
          </View>
        )}

        <Button
          label={t('classroom.create')}
          icon="plus"
          full
          loading={envoi}
          style={{ marginTop: 24 }}
          onPress={creer}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  field: { marginTop: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  msg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 18,
  },
  code: { fontSize: 40, letterSpacing: 8, fontWeight: '800', marginTop: 8 },
});
