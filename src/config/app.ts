// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION GLOBALE
// ═══════════════════════════════════════════════════════════════

import Constants from 'expo-constants';

export const APP_NAME = 'EDEM';

/** Le nom du tuteur. C'est lui que l'élève voit et à qui il parle. */
export const AI_NAME = 'M. Thomas';

/**
 * La version montrée à l'élève, lue dans `app.json` — jamais
 * recopiée à la main.
 *
 * Elle l'était, et elle avait divergé : le Profil affichait
 * « 2.1.0 » alors qu'aucun build n'a jamais porté ce numéro.
 * Un élève qui signale un problème donne alors une version qui
 * n'existe pas, et on cherche la panne dans le mauvais code.
 *
 * `expoConfig` est nul dans de rares cas (bundle chargé hors
 * d'un manifeste) : on retombe alors sur un tiret plutôt que
 * d'afficher un numéro inventé.
 */
export const APP_VERSION = Constants.expoConfig?.version ?? '—';

export const APP_TAGLINE_FR = 'Ton prof IA dans ta poche';
export const APP_TAGLINE_HT = 'Pwof AI ou nan poch ou';

// ── Points d'expérience (XP) ──────────────────────────────────
// Valeurs INDICATIVES, pour l'affichage seulement. Le barème réel
// vit dans study_topic côté Supabase, et lui seul fait foi : le
// montant n'est plus envoyé par l'application.
//
// Ce que la base applique en plus, et que l'app ne devine pas :
// une notion ne rapporte qu'UNE fois par jour, et l'étude est
// plafonnée à 5 notions payantes par jour (40 XP). Au-delà, la
// notion compte comme travaillée mais ne rapporte plus rien.
export const XP = {
  STUDY_TOPIC: 8, // notion étudiée avec le tuteur
};

// ── Niveaux de difficulté des quiz ────────────────────────────
// Le barème réel est appliqué par la base (apply_quiz_results) :
// ces valeurs servent UNIQUEMENT à l'affichage. Un élève ne peut
// donc pas s'attribuer les XP du niveau difficile en jouant facile.
export type Difficulty = 'facile' | 'moyen' | 'difficile';

export const DIFFICULTIES: {
  id: Difficulty;
  perCorrect: number;
  bonus: number;
}[] = [
  { id: 'facile', perCorrect: 6, bonus: 10 },
  { id: 'moyen', perCorrect: 10, bonus: 20 },
  { id: 'difficile', perCorrect: 16, bonus: 35 },
];

export const difficultyReward = (id: Difficulty) =>
  DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];

// ── Cache local (accélère l'ouverture, marche hors-ligne) ─────
export const STORAGE_KEYS = {
  SESSION: '@tipwof/session',
  PROFILE: '@tipwof/profile',
  PROGRESS: '@tipwof/progress',
  CHAT: '@tipwof/chat',
  // « Plus tard » sur l'écran de personnalisation. Volontairement
  // local à l'appareil : c'est une préférence d'affichage, pas une
  // donnée de l'élève, et elle n'a rien à faire en base.
  TUNE_SKIPPED: '@tipwof/tune-skipped',
  // Un professeur qui regarde l'app « comme un élève ». Locale à
  // l'appareil pour la même raison : c'est un point de vue, pas un
  // rôle. Le rôle, lui, vit en base et le serveur seul en décide.
  VUE_ELEVE: '@tipwof/vue-eleve',
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
//  GEMINI_API_KEY est un secret de l'Edge Function.)
// ═══════════════════════════════════════════════════════════════
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://qoyebljuvrxhcroxapys.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';

export const isBackendConfigured = () =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
