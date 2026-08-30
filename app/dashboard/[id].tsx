// ═══════════════════════════════════════════════════════════════
//  TABLEAU DE BORD DE LA CLASSE
//
//  Ce que le professeur ne peut obtenir nulle part ailleurs : où en
//  est sa classe, notion par notion, sans avoir corrigé une seule
//  copie.
//
//  Il ne demande AUCUNE saisie. Tout vient de `topic_mastery`, qui
//  se remplit toute seule au fil des quiz. C'est de la donnée
//  MESURÉE, pas déclarée — et c'est ce qui la rend utile.
//
//  Deux limites posées volontairement, côté serveur :
//  seulement la matière de la classe, et seulement les notions du
//  programme. Un professeur de maths n'a pas à voir où en est son
//  élève en créole.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import {
  fetchDashboard, fetchSummary,
  type ClassSummary, type DashboardRow,
} from '@/lib/assignments';
import { fetchClassrooms, type Classroom } from '@/lib/classrooms';

export default function TableauDeBord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const lang = profile.lang;
  const [lignes, setLignes] = useState<DashboardRow[]>([]);
  const [resume, setResume] = useState<ClassSummary | null>(null);
  const [classe, setClasse] = useState<Classroom | null>(null);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    const [rows, s, classes] = await Promise.all([
      fetchDashboard(id),
      fetchSummary(id),
      fetchClassrooms(),
    ]);
    setLignes(rows);
    setResume(s);
    setClasse(classes.find((c) => c.id === id) ?? null);
    setChargement(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const mesurees = lignes.filter((l) => l.eleves_mesures > 0);
  const jamais = lignes.filter((l) => l.eleves_mesures === 0);

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={recharger} tintColor={colors.accent} />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>
              {t('dashboard.title')}
            </Text>
            {classe ? (
              <Text style={[type.caption, { color: colors.textFaint }]}>{classe.name}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Les quatre chiffres qui comptent ───────────────── */}
        {resume && (
          <View style={styles.chiffres}>
            <Chiffre valeur={resume.membres} label={t('dashboard.members')} />
            <Chiffre
              valeur={resume.a_corriger}
              label={t('dashboard.toGrade')}
              alerte={resume.a_corriger > 0}
            />
            <Chiffre
              valeur={resume.en_attente}
              label={t('dashboard.pending')}
              alerte={resume.en_attente > 0}
            />
            {/* Le signal le plus utile : qui a décroché. */}
            <Chiffre
              valeur={resume.inactifs_7j}
              label={t('dashboard.inactive')}
              alerte={resume.inactifs_7j > 0}
            />
          </View>
        )}

        <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
          {t('dashboard.byTopic')}
        </Text>
        <Text style={[type.caption, { color: colors.textFaint, marginBottom: 12 }]}>
          {t('dashboard.byTopicSub')}
        </Text>

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint }]}>{t('common.loading')}</Text>
        ) : mesurees.length === 0 ? (
          <Card>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('dashboard.empty')}</Text>
          </Card>
        ) : (
          mesurees.map((l) => (
            <Card key={l.topic_id} style={{ marginBottom: 8 }}>
              <View style={styles.ligneHaut}>
                <Text style={[type.bodyMedium, { color: colors.text, flex: 1 }]}>
                  {lang === 'ht' ? l.label_ht : l.label_fr}
                </Text>
                <Text
                  style={[
                    type.cardTitle,
                    { color: l.maitrise < 40 ? colors.danger : l.maitrise < 70 ? colors.warning : colors.success },
                  ]}
                >
                  {l.maitrise}%
                </Text>
              </View>

              {/* La barre dit d'un coup d'œil ce que le chiffre dit
                  précisément : on lit une classe en trois secondes. */}
              <View style={[styles.rail, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.jauge,
                    {
                      width: `${Math.max(2, l.maitrise)}%`,
                      backgroundColor:
                        l.maitrise < 40 ? colors.danger : l.maitrise < 70 ? colors.warning : colors.success,
                    },
                  ]}
                />
              </View>

              <Text style={[type.caption, { color: colors.textFaint, marginTop: 8 }]}>
                {t('dashboard.measured', { n: String(l.eleves_mesures) })}
              </Text>

              {l.noms.length > 0 && (
                <View style={[styles.difficulte, { borderColor: colors.border }]}>
                  <Icon name="alert" size={12} color={colors.danger} />
                  <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
                    {t('dashboard.struggling')} {l.noms.join(', ')}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}

        {jamais.length > 0 && (
          <>
            <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
              {t('dashboard.notYet')}
            </Text>
            <Card>
              <Text style={[type.caption, { color: colors.textSoft }]}>
                {jamais.map((l) => (lang === 'ht' ? l.label_ht : l.label_fr)).join(' · ')}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: 8 }]}>
                {t('dashboard.notYetSub')}
              </Text>
            </Card>
          </>
        )}

        <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
          {t('dashboard.privacy')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Chiffre({ valeur, label, alerte }: { valeur: number; label: string; alerte?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chiffre, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[type.display, { color: alerte ? colors.warning : colors.text, fontSize: 26 }]}>
        {valeur}
      </Text>
      <Text style={[type.caption, { color: colors.textFaint }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  chiffres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  chiffre: {
    flexGrow: 1, flexBasis: '46%', borderWidth: 1, borderRadius: RADIUS.lg,
    paddingVertical: 12, paddingHorizontal: 14, gap: 2,
  },
  section: { marginTop: 26, marginBottom: 4 },
  ligneHaut: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rail: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  jauge: { height: 6, borderRadius: 3 },
  difficulte: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, marginTop: 10, paddingTop: 9,
  },
});
