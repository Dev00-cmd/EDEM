// ═══════════════════════════════════════════════════════════════
//  MODÉRATION — L'ÉCRAN DU PROFESSEUR
//
//  L'avantage structurel du modèle : il y a déjà un adulte
//  responsable dans chaque classe. Tout ce que cet écran fait,
//  c'est lui montrer vite ce qui mérite son attention — et rien
//  d'autre.
//
//  N'arrive ici qu'un message SIGNALÉ, MASQUÉ, ou marqué par le
//  filtre. Le fil ordinaire n'est pas dans cette pile : un outil de
//  modération qui affiche toute la conversation n'est plus un outil
//  de modération, c'est une surveillance.
//
//  Trois issues, et « laisser » compte autant que les deux autres.
//  Un outil qui ne sait que sanctionner pousse à sanctionner.
//
//  Ce que le professeur ne voit PAS ici : qui a signalé. Sinon un
//  élève qui signale son harceleur se retrouverait exposé au
//  premier mot du professeur devant la classe.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, EmptyState } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { type } from '@/theme/typography';
import { fetchClassrooms, removeMember, type Classroom } from '@/lib/classrooms';
import {
  fetchBlockedAttempts, fetchModeration, moderateMessage, requestReview,
  type BlockedAttempt, type Decision, type ModerationItem,
} from '@/lib/moderation';

export default function Moderation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<ModerationItem[]>([]);
  const [bloques, setBloques] = useState<BlockedAttempt[]>([]);
  const [classe, setClasse] = useState<Classroom | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [aSupprimer, setASupprimer] = useState<ModerationItem | null>(null);
  const [aRetirer, setARetirer] = useState<ModerationItem | null>(null);

  const recharger = useCallback(async (): Promise<ModerationItem[]> => {
    const [pile, tentatives, classes] = await Promise.all([
      fetchModeration(id),
      fetchBlockedAttempts(id),
      fetchClassrooms(),
    ]);
    setItems(pile);
    setBloques(tentatives);
    setClasse(classes.find((c) => c.id === id) ?? null);
    setChargement(false);
    return pile;
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      (async () => {
        const pile = await recharger();
        // La relecture automatique ne part QUE s'il reste des
        // messages sans avis. Ouvrir deux fois l'écran ne paie pas
        // deux fois — et un écran vide ne paie rien du tout.
        if (!vivant || !pile.some((m) => m.verdict_ia === null)) return;
        if ((await requestReview(id)) > 0 && vivant) recharger();
      })();
      return () => {
        vivant = false;
      };
    }, [id, recharger]),
  );

  const decider = async (messageId: string, decision: Decision) => {
    setEnCours(true);
    await moderateMessage(messageId, decision);
    await recharger();
    setEnCours(false);
  };

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
              {t('moderation.title')}
            </Text>
            {classe ? (
              <Text style={[type.caption, { color: colors.textFaint }]}>{classe.name}</Text>
            ) : null}
          </View>
        </View>

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
            {t('common.loading')}
          </Text>
        ) : items.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="shield"
              title={t('moderation.empty')}
              message={t('moderation.emptySub')}
            />
          </View>
        ) : (
          items.map((m) => (
            <Card key={m.message_id} style={{ marginBottom: 10 }}>
              {/* ── Qui, et dans quel état ──────────────────── */}
              <View style={styles.ligneHaut}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyMedium, { color: colors.text }]}>
                    {m.affiche}
                    {m.vrai_nom ? (
                      <Text style={[type.caption, { color: colors.textFaint }]}>
                        {'  ·  '}{m.vrai_nom}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[type.caption, { color: colors.textFaint }]}>
                    {new Date(m.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View
                  style={[
                    styles.etat,
                    { backgroundColor: m.flagged ? `${colors.danger}1F` : `${colors.warning}1F` },
                  ]}
                >
                  <Text
                    style={[
                      type.caption,
                      { color: m.flagged ? colors.danger : colors.warning },
                    ]}
                  >
                    {m.flagged ? t('moderation.hidden') : t('moderation.visible')}
                  </Text>
                </View>
              </View>

              {/* ── Le message lui-même ─────────────────────── */}
              <View
                style={[
                  styles.extrait,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <Text style={[type.body, { color: colors.text }]}>{m.extrait}</Text>
                {m.attachment ? (
                  <View style={styles.piece}>
                    <Icon name="image" size={12} color={colors.textFaint} />
                    <Text style={[type.caption, { color: colors.textFaint }]}>
                      {t('moderation.attachment')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ── Pourquoi ce message est ici ─────────────── */}
              <View style={styles.motifs}>
                {m.signalements > 0 ? (
                  <Text style={[type.caption, { color: colors.textSoft }]}>
                    {t('moderation.reportedBy', { n: String(m.signalements) })}
                    {' — '}
                    {m.raisons.map((r) => t(`fil.reason_${r}`)).join(', ')}
                  </Text>
                ) : (
                  <Text style={[type.caption, { color: colors.textSoft }]}>
                    {t('moderation.filterOnly')}
                  </Text>
                )}

                {/* La précision libre laissée par celui qui
                    signale. Jamais son nom. */}
                {m.details.map((d, i) => (
                  <Text key={i} style={[type.caption, { color: colors.textFaint }]}>
                    « {d} »
                  </Text>
                ))}

                {/* L'avis du modèle : un avis, pas une décision.
                    Il n'arrive que sur les messages déjà marqués. */}
                {m.verdict_ia ? (
                  <Text style={[type.caption, { color: colors.textFaint }]}>
                    {t('moderation.aiNote', {
                      verdict: m.verdict_ia,
                      score: String(m.score_ia ?? 0),
                    })}
                  </Text>
                ) : (
                  <Text style={[type.caption, { color: colors.textFaint }]}>
                    {t('moderation.aiPending')}
                  </Text>
                )}
              </View>

              {/* ── La décision ─────────────────────────────── */}
              <Text style={[type.eyebrow, { color: colors.textFaint, marginTop: 14 }]}>
                {t('moderation.decide')}
              </Text>
              <View style={styles.actions}>
                <Button
                  label={t('moderation.keep')}
                  variant="ghost"
                  size="sm"
                  onPress={() => decider(m.message_id, 'laisser')}
                  disabled={enCours}
                />
                {!m.flagged && (
                  <Button
                    label={t('moderation.hide')}
                    variant="outline"
                    size="sm"
                    onPress={() => decider(m.message_id, 'masquer')}
                    disabled={enCours}
                  />
                )}
                <Button
                  label={t('moderation.delete')}
                  variant="danger"
                  size="sm"
                  onPress={() => setASupprimer(m)}
                  disabled={enCours}
                />
              </View>

              {/* Exclure est le geste le plus lourd : il est à part,
                  et il passe par une confirmation. */}
              <Pressable
                onPress={() => setARetirer(m)}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={[type.caption, { color: colors.danger, marginTop: 10 }]}>
                  {t('moderation.removeMember')}
                </Text>
              </Pressable>
            </Card>
          ))
        )}

        {/* ══ Ce que personne n'a lu ═══════════════════════════
            Le filtre refuse en silence. Sans ce bloc, un élève qui
            essaie dix fois par jour d'insulter un camarade serait
            parfaitement invisible. Le nombre suffit : le
            professeur n'a pas besoin de relire les insultes. */}
        {bloques.length > 0 && (
          <>
            <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
              {t('moderation.blocked')}
            </Text>
            <Text style={[type.caption, { color: colors.textFaint, marginBottom: 10 }]}>
              {t('moderation.blockedSub')}
            </Text>
            {bloques.map((b) => (
              <Card key={b.user_id} style={{ marginBottom: 8 }}>
                <View style={styles.ligneHaut}>
                  <Text style={[type.bodyMedium, { color: colors.text, flex: 1 }]}>
                    {b.affiche}
                    {b.vrai_nom ? (
                      <Text style={[type.caption, { color: colors.textFaint }]}>
                        {'  ·  '}{b.vrai_nom}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[type.cardTitle, { color: colors.danger }]}>
                    {b.tentatives}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Dit au professeur ce que le journal enregistre. Ses
            gestes sont tracés, et il doit le savoir. */}
        <Text style={[type.caption, styles.note, { color: colors.textFaint }]}>
          {t('moderation.note')}
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={aSupprimer !== null}
        title={t('moderation.deleteTitle')}
        message={t('moderation.deleteBody')}
        confirmLabel={t('moderation.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={enCours}
        onCancel={() => setASupprimer(null)}
        onConfirm={async () => {
          const m = aSupprimer;
          setASupprimer(null);
          if (m) await decider(m.message_id, 'supprimer');
        }}
      />

      <ConfirmDialog
        visible={aRetirer !== null}
        title={t('moderation.removeTitle', { nom: aRetirer?.affiche ?? '' })}
        message={t('moderation.removeBody')}
        confirmLabel={t('moderation.removeMember')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={enCours}
        onCancel={() => setARetirer(null)}
        onConfirm={async () => {
          const m = aRetirer;
          setARetirer(null);
          if (!m) return;
          setEnCours(true);
          await removeMember(id, m.auteur_id);
          await recharger();
          setEnCours(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ligneHaut: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  etat: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  extrait: {
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 10,
  },
  piece: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  motifs: { gap: 3, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  section: { marginTop: 28, marginBottom: 4 },
  note: { marginTop: 24, lineHeight: 18 },
});
