// ═══════════════════════════════════════════════════════════════
//  ROUTE INTROUVABLE
//
//  Sans cet écran, expo-router affiche le sien : « Unmatched Route
//  — Page could not be found », en anglais, avec un lien « Sitemap »
//  destiné à un développeur. Pour un élève haïtien, c'est un
//  cul-de-sac dans une langue qu'il ne lit peut-être pas, sur une
//  application qu'il vient d'ouvrir.
//
//  Vu en vrai : deux fichiers `index` réclamaient la racine — un
//  groupe entre parenthèses n'ajoute AUCUN segment d'URL, donc
//  `(prof)/index` et `(tabs)/index` pointaient tous les deux sur
//  `/`. L'app s'ouvrait sur ce 404 pour tout le monde.
//
//  Le correctif tient dans le nom du dossier. Cet écran, lui, reste
//  comme filet : le jour où une route disparaît, on atterrit chez
//  soi et dans sa langue, pas sur un écran de développeur.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { type } from '@/theme/typography';

export default function Introuvable() {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  // On renvoie chacun chez lui : un professeur sur ses salles, un
  // élève sur son accueil.
  const rentrer = () =>
    router.replace(profile.role === 'prof' ? '/prof' : '/(tabs)');

  return (
    <Screen>
      <View style={styles.centre}>
        <Icon name="info" size={28} color={colors.textFaint} />
        <Text style={[type.cardTitle, { color: colors.text, marginTop: 14 }]}>
          {t('introuvable.titre')}
        </Text>
        <Text
          style={[type.caption, { color: colors.textSoft, textAlign: 'center', marginTop: 8 }]}
        >
          {t('introuvable.corps')}
        </Text>
        <Button
          label={t('introuvable.retour')}
          style={{ marginTop: 22 }}
          onPress={rentrer}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 30,
  },
});
