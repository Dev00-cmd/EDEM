import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card, EmptyState } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';

interface Row {
  rank: number;
  name: string;
  xp: number;
  level: number;
  is_me: boolean;
}

/** Médailles pour le podium ; simple numéro ensuite. */
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function BoardScreen() {
  const { t, profile } = useApp();
  const { colors } = useTheme();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<{ rank: number; total: number; xp: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      // Ces deux appels passent par des fonctions SQL : le classement
      // est calculé côté serveur, l'app ne voit jamais les données
      // brutes des autres élèves.
      const [top, rank] = await Promise.all([
        supabase.rpc('leaderboard', { p_limit: 50 }),
        supabase.rpc('my_rank'),
      ]);

      if (top.error) throw top.error;
      setRows((top.data ?? []) as Row[]);

      const r = Array.isArray(rank.data) ? rank.data[0] : null;
      setMe(r ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // L'élève est-il hors du top affiché ? Alors on lui montre quand
  // même son rang, sinon il n'a aucun repère.
  const outsideTop = me !== null && me.rank > 0 && !rows?.some((r) => r.is_me);

  return (
    <Screen onRefresh={load} refreshing={loading}>
      <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
        {t('board.title')}
      </Text>
      <Text style={[type.caption, { color: colors.textSoft, marginTop: 2 }]}>
        {t('board.subtitle')}
      </Text>

      {/* ── Ma position ─────────────────────────────────────── */}
      {me !== null && me.rank > 0 && (
        <Card night style={{ marginTop: 18 }}>
          <View style={styles.meRow}>
            <View style={[styles.meBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.meRank}>#{me.rank}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[type.cardTitle, { color: colors.onNight }]}>
                {t('board.yourRank')}
              </Text>
              <Text style={[type.caption, { color: colors.onNightSoft, marginTop: 2 }]}>
                {t('board.outOf', { total: `${me.total}` })} · {me.xp} XP
              </Text>
            </View>
            <Icon name="award" size={22} color={colors.sky} />
          </View>
        </Card>
      )}

      {/* ── Le classement ───────────────────────────────────── */}
      {rows === null && loading && (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      )}

      {failed && (
        <Card style={{ marginTop: 18 }}>
          <EmptyState
            icon="alert"
            title={t('board.errorTitle')}
            message={t('board.errorBody')}
          />
        </Card>
      )}

      {rows !== null && rows.length === 0 && !failed && (
        <Card style={{ marginTop: 18 }}>
          <EmptyState
            icon="award"
            title={t('board.emptyTitle')}
            message={t('board.emptyBody')}
          />
        </Card>
      )}

      {rows !== null && rows.length > 0 && (
        <Card flush style={{ marginTop: 18 }}>
          {rows.map((r, i) => (
            <View
              key={`${r.rank}-${r.name}-${i}`}
              style={[
                styles.row,
                i < rows.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                // Sa propre ligne est mise en évidence : c'est celle
                // qu'on cherche des yeux en ouvrant un classement.
                r.is_me && { backgroundColor: colors.accentSoft },
              ]}
            >
              <View style={styles.rankCell}>
                {MEDALS[r.rank] ? (
                  <Text style={styles.medal}>{MEDALS[r.rank]}</Text>
                ) : (
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: 13,
                      color: colors.textFaint,
                    }}
                  >
                    {r.rank}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.avatar,
                  { backgroundColor: r.is_me ? colors.accent : colors.surfaceAlt },
                ]}
              >
                <Text
                  style={{
                    fontFamily: FONTS.bold,
                    fontSize: 14,
                    color: r.is_me ? '#FFFFFF' : colors.textSoft,
                  }}
                >
                  {(r.name.trim()[0] ?? '·').toUpperCase()}
                </Text>
              </View>

              <View style={styles.flex}>
                <Text
                  style={[
                    type.bodyMedium,
                    { color: colors.text, fontFamily: r.is_me ? FONTS.bold : FONTS.medium },
                  ]}
                  numberOfLines={1}
                >
                  {r.is_me ? `${r.name} · ${t('board.you')}` : r.name}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint }]}>
                  {t('home.level')} {r.level}
                </Text>
              </View>

              <Text
                style={{ fontFamily: FONTS.bold, fontSize: 14, color: colors.accent }}
              >
                {r.xp} XP
              </Text>
            </View>
          ))}
        </Card>
      )}

      {outsideTop && (
        <Text style={[type.caption, styles.note, { color: colors.textFaint }]}>
          {t('board.keepGoing')}
        </Text>
      )}

      {/* Le classement n'affiche qu'un prénom : aucun élève ne peut
          être identifié ni contacté depuis cet écran. */}
      <View style={[styles.privacy, { borderColor: colors.border }]}>
        <Icon name="shield" size={15} color={colors.success} />
        <Text style={[type.caption, { color: colors.textFaint, flex: 1 }]}>
          {t('board.privacy', { name: profile.name || '—' })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  meRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meBadge: {
    minWidth: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  meRank: { fontFamily: FONTS.extrabold, fontSize: 16, color: '#FFFFFF' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  rankCell: { width: 26, alignItems: 'center' },
  medal: { fontSize: 17 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  note: { textAlign: 'center', marginTop: 14 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
