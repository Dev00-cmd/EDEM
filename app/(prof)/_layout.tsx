// ═══════════════════════════════════════════════════════════════
//  LES ONGLETS DU PROFESSEUR
//
//  Pas de Classement, pas de Parcours, pas de Quiz : ce sont la
//  progression et les XP d'un ÉLÈVE. Un professeur n'ouvre pas
//  l'app pour voir son propre rang.
//
//  Il garde M. Thomas, parce qu'un professeur s'en sert vraiment —
//  pour préparer une explication, retrouver une formulation. Son
//  compte est resté un compte d'élève : la bascule « voir comme
//  élève » est dans son profil, et lui rend les quatre onglets
//  manquants.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function ProfLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // L'accueil du professeur, ce sont ses classes.
      tabBar={(props) => <TabBar {...props} homeLabelKey="tabs.classes" />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="suivi" />
      <Tabs.Screen name="devoirs" />
      <Tabs.Screen name="tuteur" />
      <Tabs.Screen name="compte" />
    </Tabs>
  );
}
