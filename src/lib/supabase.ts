// ═══════════════════════════════════════════════════════════════
//  CLIENT SUPABASE
//
//  Un seul client pour toute l'app : comptes élèves, base de
//  données et appel du tuteur IA (Edge Function « tutor »).
//
//  La session est gardée dans AsyncStorage : l'élève reste
//  connecté même après avoir fermé l'app.
// ═══════════════════════════════════════════════════════════════

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/app';
import type { Database } from './database.types';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sur mobile il n'y a pas d'URL de retour à analyser ; sur le web si.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Rafraîchit le jeton tant que l'app est au premier plan, et
// arrête de le faire en arrière-plan (économise la batterie).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * Traduit les erreurs d'authentification Supabase (anglaises et
 * techniques) en messages compréhensibles par un élève.
 */
export function authErrorMessage(
  message: string,
  lang: 'fr' | 'ht',
): string {
  const m = message.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return lang === 'ht'
      ? 'Imel oswa modpas la pa bon.'
      : 'Email ou mot de passe incorrect.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return lang === 'ht'
      ? 'Gen yon kont ki deja itilize imel sa a.'
      : 'Un compte existe déjà avec cet email.';
  }
  if (m.includes('password should be at least')) {
    return lang === 'ht'
      ? 'Modpas la dwe gen omwen 6 karaktè.'
      : 'Le mot de passe doit faire au moins 6 caractères.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return lang === 'ht' ? 'Imel la pa valab.' : "L'adresse email n'est pas valide.";
  }
  if (m.includes('email not confirmed')) {
    return lang === 'ht'
      ? 'Ou dwe konfime imel ou anvan ou konekte.'
      : 'Tu dois confirmer ton email avant de te connecter.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return lang === 'ht'
      ? 'Pa gen koneksyon entènèt. Tcheke rezo ou.'
      : 'Pas de connexion internet. Vérifie ton réseau.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return lang === 'ht'
      ? 'Twòp tantativ. Tann yon ti moman.'
      : 'Trop de tentatives. Attends un moment.';
  }

  return lang === 'ht'
    ? 'Yon bagay pa mache. Eseye ankò.'
    : "Quelque chose n'a pas marché. Réessaie.";
}
