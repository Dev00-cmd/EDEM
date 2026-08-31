// ═══════════════════════════════════════════════════════════════
//  CHOISIR UNE ÉCOLE
//
//  Écrit pour le PROFESSEUR, dont le besoin n'est pas celui de
//  l'élève. Un élève a une école, une seule, et elle vit dans son
//  profil. Un professeur enseigne souvent dans DEUX OU TROIS
//  établissements — c'est la norme en Haïti, pas l'exception : on
//  complète un poste au lycée public par des heures dans le privé.
//
//  L'école appartient donc à la SALLE, pas au professeur. La base
//  le prévoyait déjà — `classrooms.school_id` existe depuis
//  l'étape 5 — c'est l'écran qui imposait celle du profil, et qui
//  renvoyait le professeur vers « Personnalise ton tuteur », un
//  formulaire d'élève qui lui demandait sa série et son année
//  d'examen d'État.
//
//  La recherche est NATIONALE par défaut. La restreindre à la
//  commune du profil aurait reproduit le même défaut : elle
//  supposerait qu'il n'enseigne qu'à côté de chez lui.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Icon } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { type } from '@/theme/typography';
import { MIN_QUERY, searchSchools, type School } from '@/lib/schools';

interface Props {
  value: School | null;
  onPick: (school: School | null) => void;
  /** Commune de départ, seulement pour trier les premiers résultats. */
  communeId?: string | null;
}

export function SchoolPicker({ value, onPick, communeId }: Props) {
  const { t } = useApp();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [resultats, setResultats] = useState<School[]>([]);
  const [chargement, setChargement] = useState(false);

  const chercher = useCallback(async (q: string) => {
    setChargement(true);
    setResultats(await searchSchools(q, communeId ?? null));
    setChargement(false);
  }, [communeId]);

  // Une liste s'affiche d'emblée : la plupart du temps on ne
  // cherche pas, on RECONNAÎT. Exiger de taper avant de montrer
  // quoi que ce soit, c'est demander d'écrire un nom exact qu'on
  // n'a pas forcément en tête.
  useEffect(() => {
    if (value) return;
    const minuteur = setTimeout(() => {
      const propre = query.trim();
      if (propre !== '' && propre.length < MIN_QUERY) return;
      chercher(propre);
    }, 350);
    return () => clearTimeout(minuteur);
  }, [query, value, chercher]);

  // ── Une école est choisie : on la montre, et on peut en changer ──
  if (value) {
    return (
      <Card style={{ marginTop: 10 }}>
        <View style={styles.ligne}>
          <Icon name="landmark" size={16} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.captionMedium, { color: colors.text }]} numberOfLines={2}>
              {value.name}
            </Text>
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
              {value.commune} · {value.departement}
            </Text>
          </View>
        </View>
        <Button
          label={t('common.change')}
          variant="ghost"
          size="sm"
          style={{ marginTop: 8 }}
          onPress={() => {
            onPick(null);
            setQuery('');
          }}
        />
      </Card>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <Input
        placeholder={t('tune.schoolSearchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="characters"
      />

      {chargement ? (
        <Text style={[type.caption, { color: colors.textFaint, marginTop: 10 }]}>
          {t('common.loading')}
        </Text>
      ) : resultats.length === 0 ? (
        <Text style={[type.caption, { color: colors.textFaint, marginTop: 10 }]}>
          {t('tune.schoolNoResult')}
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {resultats.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => onPick(e)}
              accessibilityRole="button"
              style={[styles.resultat, { borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.caption, { color: colors.text }]} numberOfLines={2}>
                  {e.name}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 1 }]}>
                  {e.commune} · {e.departement}
                </Text>
              </View>
              <Icon name="chevron-right" size={14} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultat: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, paddingVertical: 11,
  },
});
