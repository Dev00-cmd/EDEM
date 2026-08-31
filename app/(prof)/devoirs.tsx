// ═══════════════════════════════════════════════════════════════
//  LES DEVOIRS, TOUTES CLASSES CONFONDUES
//
//  Les devoirs n'existaient que DANS une classe. Un professeur qui
//  en a trois devait ouvrir trois écrans pour savoir ce qu'il avait
//  à corriger — et rien ne lui disait où ça pressait.
//
//  Le serveur les range par ce qui presse : les copies à corriger
//  d'abord, puis l'échéance. Un professeur n'ouvre pas cet écran
//  pour lire une liste, il l'ouvre pour savoir quoi faire
//  maintenant.
//
//  Un brouillon non publié est marqué comme tel : c'est l'erreur
//  qu'on fait tous — préparer un devoir, oublier de le publier, et
//  s'étonner que personne ne rende.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { fetchTeacherAssignments, type TeacherAssignment } from '@/lib/assignments';

export default function Devoirs() {
  const { t } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const [devoirs, setDevoirs] = useState<TeacherAssignment[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    setDevoirs(await fetchTeacherAssignments());
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const aCorriger = devoirs.reduce((n, d) => n + d.a_corriger, 0);

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={recharger} tintColor={colors.accent} />
        }
      >
        <Text style={[type.eyebrow, { color: colors.textFaint }]}>{t('devoirs.eyebrow')}</Text>
        <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
          {t('devoirs.title')}
        </Text>
        <Text style={[type.caption, { color: colors.textSoft, marginTop: 8 }]}>
          {aCorriger > 0
            ? t('devoirs.aCorriger', { n: String(aCorriger) })
            : t('devoirs.rienACorriger')}
        </Text>

        <Button
          label={t('devoirs.nouveau')}
          icon="plus"
          full
          style={{ marginTop: 18 }}
          onPress={() => router.push('/assignment/new')}
        />

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
            {t('common.loading')}
          </Text>
        ) : devoirs.length === 0 ? (
          <Card style={{ marginTop: 20 }}>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('devoirs.aucun')}</Text>
          </Card>
        ) : (
          <View style={{ marginTop: 22 }}>
            {devoirs.map((d) => {
              const rendu = d.membres > 0 ? d.rendus / d.membres : 0;
              const echeance = d.due_at ? new Date(d.due_at) : null;
              const enRetard = echeance !== null && echeance.getTime() < Date.now();

              return (
                <Card
                  key={d.id}
                  style={{ marginBottom: 10 }}
                  onPress={() => router.push(`/assignment/${d.id}`)}
                >
                  <View style={styles.row}>
                    <Icon
                      name={d.kind === 'quiz' ? 'quiz' : 'book'}
                      size={16}
                      color={colors.textSoft}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {d.title}
                      </Text>
                      <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                        {d.classroom}
                        {echeance
                          ? ` · ${t(enRetard ? 'devoirs.echue' : 'devoirs.pour', {
                              date: echeance.toLocaleDateString('fr-FR', {
                                day: '2-digit', month: '2-digit',
                              }),
                            })}`
                          : ''}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={colors.textFaint} />
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <ProgressBar value={rendu} tint={colors.accent} />
                  </View>
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
                    {t('devoirs.rendus', {
                      n: String(d.rendus),
                      total: String(d.membres),
                    })}
                    {d.moyenne !== null
                      ? ` · ${t('devoirs.moyenne', { n: String(d.moyenne) })}`
                      : ''}
                  </Text>

                  <View style={styles.badges}>
                    {!d.published && (
                      <Pastille label={t('devoirs.brouillon')} tint={colors.warning} />
                    )}
                    {d.a_corriger > 0 && (
                      <Pastille
                        label={t('devoirs.badgeCorriger', { n: String(d.a_corriger) })}
                        tint={colors.danger}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
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
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 9, paddingVertical: 3,
  },
});
