// ═══════════════════════════════════════════════════════════════
//  LE SUIVI — QUI A BESOIN D'AIDE, ET SUR QUOI
//
//  C'est la fonctionnalité qui décide un professeur à recommander
//  EDEM ou à l'interdire dans sa classe. Elle existait en base
//  depuis l'étape 6 et n'était atteignable qu'en quatre touches,
//  au fond d'une classe.
//
//  Elle ne demande AUCUNE saisie. Tout vient de `topic_mastery`,
//  qui se remplit toute seule au fil des quiz : de la donnée
//  MESURÉE, pas déclarée. C'est ce qui la rend utile — un
//  professeur sait déjà ce que ses élèves DISENT comprendre.
//
//  Différence avec le tableau de bord d'une classe : celui-ci
//  n'énumère pas le programme, il montre d'abord CE QUI CLOCHE.
//  Les notions les plus faibles en haut, avec les élèves nommés
//  dessous. C'est la liste sur laquelle on agit lundi matin.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import {
  fetchDashboard, fetchTeacherOverview,
  type DashboardRow, type TeacherClass,
} from '@/lib/assignments';

export default function Suivi() {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const lang = profile.lang;
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [lignes, setLignes] = useState<DashboardRow[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    const cs = await fetchTeacherOverview();
    setClasses(cs);
    // Une seule classe : on ne fait pas choisir. Un sélecteur à un
    // seul choix est une touche de plus pour rien.
    const cible = choisie && cs.some((c) => c.classroom_id === choisie)
      ? choisie
      : cs[0]?.classroom_id ?? null;
    setChoisie(cible);
    setLignes(cible ? await fetchDashboard(cible) : []);
    setChargement(false);
  }, [choisie]);

  useFocusEffect(
    useCallback(() => {
      recharger();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const changer = async (id: string) => {
    setChoisie(id);
    setChargement(true);
    setLignes(await fetchDashboard(id));
    setChargement(false);
  };

  // Les plus faibles d'abord : c'est là qu'un professeur agit.
  const triees = [...lignes].sort((a, b) => a.maitrise - b.maitrise);
  const fragiles = triees.filter((r) => r.maitrise < 60);
  const solides = triees.filter((r) => r.maitrise >= 60);
  const classe = classes.find((c) => c.classroom_id === choisie) ?? null;

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={recharger} tintColor={colors.accent} />
        }
      >
        <Text style={[type.eyebrow, { color: colors.textFaint }]}>{t('suivi.eyebrow')}</Text>
        <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
          {t('suivi.title')}
        </Text>
        <Text style={[type.caption, { color: colors.textSoft, marginTop: 8 }]}>
          {t('suivi.sub')}
        </Text>

        {classes.length > 1 && (
          <View style={styles.chips}>
            {classes.map((c) => (
              <Chip
                key={c.classroom_id}
                label={c.name}
                selected={c.classroom_id === choisie}
                onPress={() => changer(c.classroom_id)}
              />
            ))}
          </View>
        )}

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
            {t('common.loading')}
          </Text>
        ) : classes.length === 0 ? (
          <Card style={{ marginTop: 20 }}>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('prof.aucuneSalle')}</Text>
          </Card>
        ) : lignes.length === 0 ? (
          // Pas de mesure ≠ classe nulle. On dit POURQUOI c'est vide
          // et ce qui le remplira, sinon le professeur croit à une
          // panne.
          <Card style={{ marginTop: 20 }}>
            <View style={styles.row}>
              <Icon name="info" size={16} color={colors.sky} />
              <Text style={[type.captionMedium, { color: colors.text, flex: 1 }]}>
                {t('suivi.videTitre')}
              </Text>
            </View>
            <Text style={[type.caption, { color: colors.textSoft, marginTop: 8 }]}>
              {t('suivi.videCorps')}
            </Text>
          </Card>
        ) : (
          <>
            {classe && (
              <View style={[styles.resume, { borderColor: colors.border, marginTop: 18 }]}>
                <Chiffre
                  valeur={classe.maitrise === null ? '—' : `${classe.maitrise}%`}
                  label={t('suivi.moyenne')}
                />
                <Chiffre valeur={String(classe.en_difficulte)} label={t('suivi.endifficulte')} />
                <Chiffre valeur={String(classe.inactifs_7j)} label={t('suivi.inactifs')} />
              </View>
            )}

            {fragiles.length > 0 && (
              <>
                <Text style={[type.eyebrow, { color: colors.danger, marginTop: 24, marginBottom: 10 }]}>
                  {t('suivi.aTravailler')}
                </Text>
                {fragiles.map((r) => (
                  <Notion key={r.topic_id} row={r} lang={lang} />
                ))}
              </>
            )}

            {solides.length > 0 && (
              <>
                <Text style={[type.eyebrow, { color: colors.textFaint, marginTop: 24, marginBottom: 10 }]}>
                  {t('suivi.acquis')}
                </Text>
                {solides.map((r) => (
                  <Notion key={r.topic_id} row={r} lang={lang} />
                ))}
              </>
            )}

            {classe && (
              <Card style={{ marginTop: 20 }} onPress={() => router.push(`/dashboard/${classe.classroom_id}`)}>
                <View style={styles.row}>
                  <Icon name="chart" size={16} color={colors.accent} />
                  <Text style={[type.captionMedium, { color: colors.accent, flex: 1 }]}>
                    {t('suivi.toutLeProgramme')}
                  </Text>
                  <Icon name="chevron-right" size={15} color={colors.textFaint} />
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Une notion, sa maîtrise, et les élèves qui décrochent dessus. */
function Notion({ row, lang }: { row: DashboardRow; lang: 'fr' | 'ht' }) {
  const { t } = useApp();
  const { colors } = useTheme();
  const tint =
    row.maitrise < 40 ? colors.danger : row.maitrise < 60 ? colors.warning : colors.accent;

  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.row}>
        <Text style={[type.captionMedium, { color: colors.text, flex: 1 }]}>
          {lang === 'ht' ? row.label_ht : row.label_fr}
        </Text>
        <Text style={[type.captionMedium, { color: tint }]}>{row.maitrise}%</Text>
      </View>

      <View style={{ marginTop: 8 }}>
        <ProgressBar value={row.maitrise / 100} tint={tint} />
      </View>

      <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
        {t('suivi.mesureSur', { n: String(row.eleves_mesures) })}
      </Text>

      {/* Les élèves sous 40 %, nommés. C'est la liste sur laquelle
          on agit — un pourcentage seul ne dit pas qui aider. */}
      {row.noms.length > 0 && (
        <View style={[styles.noms, { borderColor: colors.border }]}>
          <Icon name="alert" size={12} color={colors.danger} />
          <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
            {row.noms.join(', ')}
          </Text>
        </View>
      )}
    </Card>
  );
}

function Chiffre({ valeur, label }: { valeur: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[type.cardTitle, { color: colors.text }]}>{valeur}</Text>
      <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resume: {
    flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: 10,
  },
  noms: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    borderTopWidth: 1, marginTop: 9, paddingTop: 8,
  },
});
