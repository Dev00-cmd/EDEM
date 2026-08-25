// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION GLOBALE
// ═══════════════════════════════════════════════════════════════

export const APP_NAME = 'Ti Pwof';
export const APP_VERSION = '2.0.0';

export const APP_TAGLINE_FR = 'Ton prof IA dans ta poche';
export const APP_TAGLINE_HT = 'Pwof AI ou nan poch ou';

// ── Points d'expérience (XP) ──────────────────────────────────
// Doivent rester alignés avec les fonctions SQL côté Supabase
// (study_topic / apply_quiz_results).
export const XP = {
  STUDY_TOPIC: 8, // notion étudiée avec le tuteur
  QUIZ_CORRECT: 10, // bonne réponse au quiz
  QUIZ_PERFECT_BONUS: 20, // bonus si 100 %
};

// ── Cache local (accélère l'ouverture, marche hors-ligne) ─────
export const STORAGE_KEYS = {
  SESSION: '@tipwof/session',
  PROFILE: '@tipwof/profile',
  PROGRESS: '@tipwof/progress',
  CHAT: '@tipwof/chat',
};

// ═══════════════════════════════════════════════════════════════
//  SUPABASE — base de données, comptes élèves et tuteur IA
//
//  La clé « publishable » est faite pour vivre dans l'application :
//  elle n'ouvre aucune donnée par elle-même. Ce sont les règles
//  RLS de la base qui garantissent qu'un élève ne voit que SES
//  données. Elle peut donc être versionnée sans risque.
//
//  (La vraie clé secrète, elle, est côté serveur uniquement :
//  ANTHROPIC_API_KEY est un secret de l'Edge Function.)
// ═══════════════════════════════════════════════════════════════
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://qoyebljuvrxhcroxapys.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';

export const isBackendConfigured = () =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
