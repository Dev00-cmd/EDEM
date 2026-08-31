// ═══════════════════════════════════════════════════════════════
//  L'ACCUEIL DU PROFESSEUR — SES CLASSES
//
//  Ce que voyait un professeur jusqu'ici : « Bonjour, voici ton
//  plan du jour, tes XP et ton rang au classement ». Ses classes
//  étaient enterrées dans Profil → Mes classes, et son tableau de
//  bord à quatre touches de là.
//
//  Cet écran met en premier CE QUI APPELLE UNE ACTION : les
//  demandes en attente, les copies à corriger, les élèves en
//  difficulté. Le serveur les range déjà dans cet ordre. Un tableau
//  de bord qui n'appelle aucune action n'est qu'un affichage.
//
//  Une seule requête pour toutes les classes — boucler côté client
//  ferait dix appels pour dix classes, sur un forfait payé à
//  l'unité.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, TABS_CLEARANCE } from '@/theme/theme';
import { type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { fetchTeacherOverview, type TeacherClass } from '@/lib/assignments';

export default function AccueilProf() {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const lang = profile.lang;
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    setClasses(await fetchTeacherOverview());
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const attente = classes.reduce((n, c) => n + c.en_attente, 0);
  const aCorriger = classes.reduce((n, c) => n + c.a_corriger, 0);

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={recharger} tintColor={colors.accent} />
        }
      >
        <Text style={[type.eyebrow, { color: colors.textFaint }]}>
          {t('prof.eyebrow')}
        </Text>
        <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
          {t('prof.hello', { name: profile.name || '' })}
        </Text>

        {/* Ce qui attend, en une phrase. S'il n'y a rien à faire,
            on le dit aussi — c'est une information, pas un vide. */}
        <Text style={[type.body, { color: colors.textSoft, marginTop: 8 }]}>
          {attente + aCorriger === 0
            ? t('prof.rienAFaire')
            : t('prof.aFaire', {
                attente: String(attente),
                copies: String(aCorriger),
              })}
        </Text>

        <Button
          label={t('classes.create')}
          icon="plus"
          full
          style={{ marginTop: 18 }}
          onPress={() => router.push('/classroom/new')}
        />

        <Text style={[type.eyebrow, { color: colors.textFaint, marginTop: 26, marginBottom: 10 }]}>
          {t('prof.mesSalles')}
        </Text>

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint }]}>{t('common.loading')}</Text>
        ) : classes.length === 0 ? (
          <Card>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('prof.aucuneSalle')}</Text>
          </Card>
        ) : (
          classes.map((c) => {
            const matiere = getSubject(c.subject_id);
            return (
              <Card
                key={c.classroom_id}
                style={{ marginBottom: 2 }}
                onPress={() => router.push(`/classroom/${c.classroom_id}`)}
              >
                <View style={styles.row}>
                  <View style={[styles.pastille, { backgroundColor: matiere.color }]}>
                    <Icon name={matiere.icon} size={15} color={colors.accentText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.cardTitle, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                      {matiere.name[lang]} · {c.grade_level} ·{' '}
                      {t('prof.nEleves', { n: String(c.membres) })}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textFaint} />
                </View>

                {/* Le code, à même la carte : c'est ce qu'un
                    professeur redonne le plus souvent. */}
                <View style={[styles.codeBoite, { borderColor: colors.border }]}>
                  <Text style={[type.caption, { color: colors.textFaint }]}>
                    {t('classroom.codeLabel')}
                  </Text>
                  <Text style={[styles.code, { color: colors.accent }]}>{c.join_code}</Text>
                </View>

                <View style={styles.badges}>
                  {c.en_attente > 0 && (
                    <Pastille
                      label={t('prof.badgeAttente', { n: String(c.en_attente) })}
                      tint={colors.warning}
                    />
                  )}
                  {c.a_corriger > 0 && (
                    <Pastille
                      label={t('prof.badgeCorriger', { n: String(c.a_corriger) })}
                      tint={colors.danger}
                    />
                  )}
                  {c.en_difficulte > 0 && (
                    <Pastille
                      label={t('prof.badgeDifficulte', { n: String(c.en_difficulte) })}
                      tint={colors.sky}
                    />
                  )}
                  {/* Null tant que rien n'est mesuré : afficher
                      « 0 % » à une classe qui vient d'ouvrir serait
                      un mensonge sur ses élèves. */}
                  {c.maitrise !== null && (
                    <Pastille
                      label={t('prof.badgeMaitrise', { n: String(c.maitrise) })}
                      tint={colors.textFaint}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Pastille({ label, tint }: { label: string; tint: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { borderColor: colors.border }]}>
      <Text style={[type.caption, { color: tint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: TABS_CLEARANCE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pastille: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  codeBoite: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 10,
  },
  code: { fontSize: 18, letterSpacing: 3, fontFamily: 'Sora_700Bold' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 9, paddingVertical: 3,
  },
});
