// ═══════════════════════════════════════════════════════════════
//  HISTORIQUE DES CONVERSATIONS
//
//  Toutes les discussions avec M. Thomas, de la plus récente à la
//  plus ancienne. Un appui la rouvre là où elle s'était arrêtée.
//
//  Avant, l'élève n'avait qu'un fil par matière, écrasé au fil du
//  temps : poser une nouvelle question effaçait celui de la veille,
//  et retrouver l'explication d'un exercice passé imposait de la
//  redemander — donc de repayer l'appel.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { useApp, type Conversation } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { formatDate } from '@/lib/quizHistory';

export default function ChatHistoryScreen() {
  const router = useRouter();
  const {
    t,
    profile,
    conversations,
    refreshConversations,
    deleteConversation,
    openConversation,
  } = useApp();
  const { colors } = useTheme();
  const lang = profile.lang;

  const [loading, setLoading] = useState(conversations.length === 0);
  const [askingDelete, setAskingDelete] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    await refreshConversations();
    setLoading(false);
  }, [refreshConversations]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id: string) => {
    await openConversation(id);
    // On revient au tuteur en passant l'identifiant : l'écran sait
    // alors quelle conversation afficher, même s'il était monté
    // sur une autre.
    router.push({ pathname: '/(tabs)/chat', params: { conversation: id } });
  };

  return (
    <Screen bottomInset={24} onRefresh={load} refreshing={false}>
      <View style={styles.head}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="arrow-left" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={[type.section, { color: colors.text }]}>
            {t('chat.history')}
          </Text>
          {!loading && conversations.length > 0 && (
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {t('chat.historyCount', { count: `${conversations.length}` })}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : conversations.length === 0 ? (
        <Card style={styles.block}>
          <EmptyState
            icon="tutor"
            title={t('chat.historyEmptyTitle')}
            message={t('chat.historyEmptyBody')}
          />
        </Card>
      ) : (
        conversations.map((c) => {
          const subject = getSubject(c.subjectId);
          return (
            <Card key={c.id} style={styles.card} onPress={() => open(c.id)}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: subject.color }]}>
                  <Icon name={subject.icon} size={16} color={colors.accentText} />
                </View>

                <View style={styles.flex}>
                  <Text
                    style={[type.bodyMedium, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {c.title ?? t('chat.untitled')}
                  </Text>
                  {c.preview !== '' && (
                    <Text
                      style={[type.caption, { color: colors.textSoft, marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {c.preview}
                    </Text>
                  )}
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 3 }]}>
                    {formatDate(new Date(c.updatedAt).toISOString(), lang)} ·{' '}
                    {t('chat.messageCount', { count: `${c.messageCount}` })}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setAskingDelete(c)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.deleteConversation')}
                  style={styles.trash}
                >
                  <Icon name="trash" size={17} color={colors.textFaint} />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      <ConfirmDialog
        visible={askingDelete !== null}
        icon="trash"
        destructive
        title={t('chat.deleteConversation')}
        message={t('chat.deleteConfirm')}
        confirmLabel={t('chat.deleteConversation')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (askingDelete) void deleteConversation(askingDelete.id);
          setAskingDelete(null);
        }}
        onCancel={() => setAskingDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { marginTop: 40 },
  block: { marginTop: 12 },

  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trash: { padding: 4 },
});
