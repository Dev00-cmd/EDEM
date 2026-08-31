// ═══════════════════════════════════════════════════════════════
//  LES ONGLETS DE L'ÉLÈVE
//
//  La barre elle-même vit dans `src/components/TabBar.tsx` : le
//  professeur a la sienne, avec d'autres onglets, et une barre
//  recopiée aurait divergé au premier oubli.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

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
      <Tabs.Screen name="board" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
