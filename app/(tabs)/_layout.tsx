import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { FONT_CAP } from '@/theme/responsive';
import { type } from '@/theme/typography';

interface TabStateLike {
  index: number;
  routes: { key: string; name: string }[];
}

const ICONS: Record<string, IconName> = {
  index: 'home',
  path: 'chart',
  chat: 'tutor',
  quiz: 'quiz',
  profile: 'profile',
};

const LABEL_KEYS: Record<string, string> = {
  index: 'tabs.home',
  path: 'tabs.path',
  chat: 'tabs.tutor',
  quiz: 'tabs.quiz',
  profile: 'tabs.profile',
};

/**
 * Barre d'onglets : posée à plat en bas, comme dans les maquettes.
 * L'onglet actif est bleu et porte un point sous son étiquette —
 * deux signaux plutôt qu'un, pour rester lisible sans distinguer
 * les couleurs.
 */
function TabBar({
  state,
  navigation,
}: {
  state: TabStateLike;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}) {
  const { colors } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();

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
            accessibilityLabel={t(LABEL_KEYS[route.name] ?? 'tabs.home')}
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
              // Cinq étiquettes côte à côte : c'est l'endroit le
              // plus contraint de l'app, le plafond y est le plus bas.
              maxFontSizeMultiplier={FONT_CAP.tight}
            >
              {t(LABEL_KEYS[route.name] ?? 'tabs.home')}
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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="path" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="quiz" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

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
