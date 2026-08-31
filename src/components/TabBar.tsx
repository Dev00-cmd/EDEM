// ═══════════════════════════════════════════════════════════════
//  LA BARRE D'ONGLETS, PARTAGÉE PAR LES DEUX INTERFACES
//
//  L'élève et le professeur n'ont pas les mêmes onglets, mais ils
//  ont la même barre. Elle vivait dans `app/(tabs)/_layout.tsx` ;
//  la recopier pour le professeur aurait donné deux barres à
//  corriger à chaque retouche, et elles auraient divergé au premier
//  oubli.
//
//  Elle ne connaît aucun onglet : elle lit le nom de la route dans
//  deux tables. Ajouter un onglet, c'est ajouter deux lignes.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { FONT_CAP } from '@/theme/responsive';
import { useKeyboard } from '@/theme/useKeyboard';
import { type } from '@/theme/typography';

export interface TabStateLike {
  index: number;
  routes: { key: string; name: string }[];
}

/** Élève et professeur réunis : les noms de route ne se croisent pas. */
const ICONS: Record<string, IconName> = {
  // Élève
  index: 'home',
  path: 'chart',
  chat: 'tutor',
  quiz: 'quiz',
  board: 'award',
  profile: 'profile',
  // Professeur
  suivi: 'chart',
  devoirs: 'book',
  tuteur: 'tutor',
  compte: 'profile',
};

const LABEL_KEYS: Record<string, string> = {
  index: 'tabs.home',
  path: 'tabs.path',
  chat: 'tabs.tutor',
  quiz: 'tabs.quiz',
  board: 'tabs.board',
  profile: 'tabs.profile',
  suivi: 'tabs.suivi',
  devoirs: 'tabs.devoirs',
  tuteur: 'tabs.tutor',
  compte: 'tabs.profile',
};

/**
 * Posée à plat en bas, comme dans les maquettes. L'onglet actif est
 * bleu et porte un point sous son étiquette — deux signaux plutôt
 * qu'un, pour rester lisible sans distinguer les couleurs.
 */
export function TabBar({
  state,
  navigation,
  /** L'onglet d'accueil, dont le libellé change selon l'interface. */
  homeLabelKey = 'tabs.home',
}: {
  state: TabStateLike;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  homeLabelKey?: string;
}) {
  const { colors } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();

  // Clavier ouvert : la barre s'efface. Elle volerait de la place à
  // ce que l'élève écrit, et l'écran de conversation calcule son
  // décalage en supposant qu'elle n'est plus là.
  if (keyboard.visible) return null;

  const libelle = (route: string) =>
    route === 'index' ? homeLabelKey : (LABEL_KEYS[route] ?? 'tabs.home');

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.textFaint;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(libelle(route.name))}
          >
            <Icon
              name={ICONS[route.name] ?? 'home'}
              size={22}
              color={color}
              strokeWidth={focused ? 2 : 1.7}
            />
            <Text
              style={[type.tabLabel, { color }]}
              numberOfLines={1}
              // Cinq étiquettes côte à côte : c'est l'endroit le plus
              // contraint de l'app, le plafond y est le plus bas.
              maxFontSizeMultiplier={FONT_CAP.tight}
            >
              {t(libelle(route.name))}
            </Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: focused ? colors.accent : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// Repris à l'identique de l'ancienne barre : l'élève ne doit voir
// aucune différence, c'est un déplacement de code, pas une retouche.
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    paddingTop: 11,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
