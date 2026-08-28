// ═══════════════════════════════════════════════════════════════
//  ÉTAT DE L'ÉLÈVE — profil, progression, maîtrise, conversations
//
//  Deux sources :
//    · Supabase = la vérité (synchro entre appareils, rien perdu)
//    · AsyncStorage = un cache (ouverture instantanée + hors-ligne)
//
//  Les calculs sensibles (XP, maîtrise, séries) sont faits par des
//  fonctions SQL côté serveur : impossible de tricher, et pas de
//  conflit si l'élève utilise deux appareils.
// ═══════════════════════════════════════════════════════════════

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, type Difficulty } from '@/config/app';
import { supabase } from '@/lib/supabase';
import { removeAttachments } from '@/lib/attachments';
import { useAuth } from './AuthContext';
import type { Lang } from '@/i18n';
import { translate } from '@/i18n';
import type { ThemeMode } from '@/theme/colors';

// ─── Types (conservés à l'identique pour le moteur de parcours) ──

export interface Profile {
  name: string;
  lang: Lang;
  level: string; // classe, ex. "9e AF"
  goal: string; // 'exams' | 'grades' | 'learn' | 'english' | ''
  favorites: string[]; // ids de matières choisies
  theme: ThemeMode;
  onboarded: boolean;
}

export interface Progress {
  xp: number;
  streak: number;
  lastActive: string | null;
  topics: Record<string, number>; // "matiere:notion" → maîtrise 0-100
  quizBest: Record<string, number>; // meilleur score (%) par matière
  quizzesDone: number;
  answered: number;
  correct: number;
  studiedCount: number;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  ts: number;
  /** Pièce jointe : photo du devoir, document. */
  attachment?: {
    path: string; // emplacement dans le bucket privé
    type: string; // type MIME
    name: string; // nom lisible
  } | null;
}

export type ChatThreads = Record<string, ChatMsg[]>;

/** Un point du graphique de progression (écran Parcours). */
export interface ActivityPoint {
  day: string; // "AAAA-MM-JJ"
  xp: number;
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  lang: 'fr',
  level: '',
  goal: '',
  favorites: [],
  theme: 'dark',
  onboarded: false,
};

const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: 0,
  lastActive: null,
  topics: {},
  quizBest: {},
  quizzesDone: 0,
  answered: 0,
  correct: 0,
  studiedCount: 0,
};

// ─── Contexte ─────────────────────────────────────────────────

interface AppState {
  ready: boolean;
  syncing: boolean;
  /** true si la dernière synchro a échoué (mode hors-ligne). */
  offline: boolean;
  profile: Profile;
  progress: Progress;
  threads: ChatThreads;
  activity: ActivityPoint[];
  level: number;
  levelProgress: number;
  t: (path: string, vars?: Record<string, string>) => string;
  updateProfile: (patch: Partial<Profile>) => void;
  studyTopic: (subjectId: string, topicId: string) => Promise<void>;
  applyQuizResults: (
    subjectId: string,
    results: { topic: string; ok: boolean }[],
    difficulty: Difficulty,
    /** Session ouverte par le serveur, qui corrigera lui-même. */
    sessionId?: string | null,
    /** Indice choisi par question, null si le temps a manqué. */
    picked?: (number | null)[],
  ) => Promise<number>; // XP gagnés
  addChatMessages: (thread: string, msgs: ChatMsg[]) => void;
  clearChat: (thread: string) => void;
  touchActivity: () => void;
  resetAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

// ─── Aides ────────────────────────────────────────────────────

const cacheKey = (base: string, userId: string) => `${base}:${userId}`;

async function readCache<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const writeCache = (key: string, value: unknown) =>
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

/** Ligne « progress » de la base → forme utilisée par l'app. */
type ProgressRow = {
  xp: number;
  streak: number;
  last_active: string | null;
  quizzes_done: number;
  answered: number;
  correct: number;
  studied_count: number;
};

const mergeProgressRow = (prev: Progress, row: ProgressRow): Progress => ({
  ...prev,
  xp: row.xp,
  streak: row.streak,
  lastActive: row.last_active,
  quizzesDone: row.quizzes_done,
  answered: row.answered,
  correct: row.correct,
  studiedCount: row.studied_count,
});

// ═══════════════════════════════════════════════════════════════

export function AppProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const userId = session?.user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [threads, setThreads] = useState<ChatThreads>({});
  const [activity, setActivity] = useState<ActivityPoint[]>([]);

  // Évite d'écrire le cache pendant le tout premier chargement.
  const hydrated = useRef(false);

  // ── Chargement depuis Supabase ──────────────────────────────
  const loadFromServer = useCallback(async (uid: string) => {
    setSyncing(true);
    try {
      const [profileRes, progressRes, masteryRes, quizRes, chatRes, activityRes] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
          supabase.from('progress').select('*').eq('user_id', uid).maybeSingle(),
          supabase.from('topic_mastery').select('subject_id, topic_id, mastery').eq('user_id', uid),
          supabase.from('quiz_results').select('subject_id, score_pct').eq('user_id', uid),
          supabase
            .from('chat_messages')
            .select(
              'id, thread, role, text, created_at, attachment_path, attachment_type, attachment_name',
            )
            .eq('user_id', uid)
            .order('created_at', { ascending: true })
            .limit(300),
          supabase
            .from('daily_activity')
            .select('day, xp_gained')
            .eq('user_id', uid)
            .order('day', { ascending: false })
            .limit(30),
        ]);

      if (profileRes.error) throw profileRes.error;

      // Profil
      const p = profileRes.data;
      const nextProfile: Profile = p
        ? {
            name: p.name,
            lang: (p.lang as Lang) ?? 'fr',
            level: p.level,
            goal: p.goal,
            favorites: p.favorites ?? [],
            theme: (p.theme as ThemeMode) ?? 'dark',
            onboarded: p.onboarded,
          }
        : DEFAULT_PROFILE;

      // Maîtrise par notion
      const topics: Record<string, number> = {};
      for (const row of masteryRes.data ?? []) {
        topics[`${row.subject_id}:${row.topic_id}`] = row.mastery;
      }

      // Meilleur score par matière
      const quizBest: Record<string, number> = {};
      for (const row of quizRes.data ?? []) {
        quizBest[row.subject_id] = Math.max(
          quizBest[row.subject_id] ?? 0,
          row.score_pct,
        );
      }

      const pr = progressRes.data;
      const nextProgress: Progress = {
        ...DEFAULT_PROGRESS,
        ...(pr
          ? {
              xp: pr.xp,
              streak: pr.streak,
              lastActive: pr.last_active,
              quizzesDone: pr.quizzes_done,
              answered: pr.answered,
              correct: pr.correct,
              studiedCount: pr.studied_count,
            }
          : {}),
        topics,
        quizBest,
      };

      // Conversations
      const nextThreads: ChatThreads = {};
      for (const row of chatRes.data ?? []) {
        (nextThreads[row.thread] ??= []).push({
          id: row.id,
          role: row.role === 'user' ? 'user' : 'tutor',
          text: row.text,
          ts: new Date(row.created_at).getTime(),
          attachment: row.attachment_path
            ? {
                path: row.attachment_path,
                type: row.attachment_type ?? 'application/octet-stream',
                name: row.attachment_name ?? 'fichier',
              }
            : null,
        });
      }

      const nextActivity: ActivityPoint[] = (activityRes.data ?? [])
        .map((r) => ({ day: r.day, xp: r.xp_gained }))
        .reverse();

      setProfile(nextProfile);
      setProgress(nextProgress);
      setThreads(nextThreads);
      setActivity(nextActivity);
      setOffline(false);

      writeCache(cacheKey(STORAGE_KEYS.PROFILE, uid), nextProfile);
      writeCache(cacheKey(STORAGE_KEYS.PROGRESS, uid), nextProgress);
      writeCache(cacheKey(STORAGE_KEYS.CHAT, uid), nextThreads);
    } catch {
      // Pas de réseau : on garde ce que le cache a donné.
      setOffline(true);
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── Cycle de vie : à la connexion / déconnexion ─────────────
  useEffect(() => {
    if (!authReady) return;

    if (!userId) {
      hydrated.current = false;
      setProfile(DEFAULT_PROFILE);
      setProgress(DEFAULT_PROGRESS);
      setThreads({});
      setActivity([]);
      setReady(true);
      return;
    }

    let alive = true;
    (async () => {
      // 1) cache d'abord — l'app s'ouvre sans attendre le réseau
      const [cp, cpr, ct] = await Promise.all([
        readCache(cacheKey(STORAGE_KEYS.PROFILE, userId), DEFAULT_PROFILE),
        readCache(cacheKey(STORAGE_KEYS.PROGRESS, userId), DEFAULT_PROGRESS),
        readCache(cacheKey(STORAGE_KEYS.CHAT, userId), {} as ChatThreads),
      ]);
      if (!alive) return;
      setProfile(cp);
      setProgress(cpr);
      setThreads(ct);
      setReady(true);
      hydrated.current = true;

      // 2) puis le serveur, qui fait autorité
      await loadFromServer(userId);
    })();

    return () => {
      alive = false;
    };
  }, [userId, authReady, loadFromServer]);

  // ── Écriture du cache à chaque changement ───────────────────
  useEffect(() => {
    if (!hydrated.current || !userId) return;
    writeCache(cacheKey(STORAGE_KEYS.PROFILE, userId), profile);
  }, [profile, userId]);

  useEffect(() => {
    if (!hydrated.current || !userId) return;
    writeCache(cacheKey(STORAGE_KEYS.PROGRESS, userId), progress);
  }, [progress, userId]);

  useEffect(() => {
    if (!hydrated.current || !userId) return;
    writeCache(cacheKey(STORAGE_KEYS.CHAT, userId), threads);
  }, [threads, userId]);

  // ── Profil ──────────────────────────────────────────────────
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        if (userId) {
          supabase
            .from('profiles')
            .upsert({
              id: userId,
              name: next.name,
              lang: next.lang,
              level: next.level,
              goal: next.goal,
              favorites: next.favorites,
              theme: next.theme,
              onboarded: next.onboarded,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => setOffline(!!error));
        }
        return next;
      });
    },
    [userId],
  );

  // ── Activité / série quotidienne ────────────────────────────
  const touchActivity = useCallback(() => {
    if (!userId) return;
    supabase.rpc('touch_activity').then(({ data, error }) => {
      if (error || !data) return;
      setProgress((prev) => mergeProgressRow(prev, data as ProgressRow));
    });
  }, [userId]);

  // ── L'élève étudie une notion ───────────────────────────────
  const studyTopic = useCallback(
    async (subjectId: string, topicId: string) => {
      const key = `${subjectId}:${topicId}`;

      // Mise à jour optimiste : l'interface réagit tout de suite.
      setProgress((prev) => ({
        ...prev,
        topics: { ...prev.topics, [key]: Math.min(100, (prev.topics[key] ?? 0) + 34) },
      }));

      if (!userId) return;

      const { data, error } = await supabase.rpc('study_topic', {
        p_subject_id: subjectId,
        p_topic_id: topicId,
      });

      if (error || !data) {
        setOffline(true);
        return;
      }
      setProgress((prev) => mergeProgressRow(prev, data as ProgressRow));
      setOffline(false);
    },
    [userId],
  );

  // ── Résultats d'un quiz ─────────────────────────────────────
  //
  // On envoie les CHOIX de l'élève, pas notre verdict : c'est le
  // serveur qui corrige, à partir des bonnes réponses qu'il a
  // gardées en ouvrant la session. Auparavant l'app annonçait
  // elle-même « 10 bonnes réponses », et la base la croyait.
  const applyQuizResults = useCallback(
    async (
      subjectId: string,
      results: { topic: string; ok: boolean }[],
      difficulty: Difficulty,
      sessionId?: string | null,
      picked?: (number | null)[],
    ) => {
      if (!userId || results.length === 0) return 0;

      // Sans session — quiz local, ou enregistrement qui a échoué
      // côté serveur — on retombe sur l'ancienne voie plutôt que
      // de priver l'élève des XP qu'il a mérités.
      const call =
        sessionId && picked
          ? supabase.rpc('grade_quiz', {
              p_session_id: sessionId,
              p_picked: picked,
            })
          : supabase.rpc('apply_quiz_results', {
              p_subject_id: subjectId,
              p_results: results,
              p_difficulty: difficulty,
            });

      const { data, error } = await call;

      if (error || !data) {
        setOffline(true);
        return 0;
      }

      const payload = data as {
        gained: number;
        pct: number;
        progress: ProgressRow;
      };

      setProgress((prev) => ({
        ...mergeProgressRow(prev, payload.progress),
        quizBest: {
          ...prev.quizBest,
          [subjectId]: Math.max(prev.quizBest[subjectId] ?? 0, payload.pct),
        },
      }));
      setOffline(false);

      // Recharge la maîtrise et le graphique, recalculés côté serveur.
      loadFromServer(userId);

      return payload.gained;
    },
    [userId, loadFromServer],
  );

  // ── Conversations ───────────────────────────────────────────
  const addChatMessages = useCallback(
    (thread: string, msgs: ChatMsg[]) => {
      setThreads((prev) => ({
        ...prev,
        [thread]: [...(prev[thread] ?? []), ...msgs].slice(-80),
      }));

      if (!userId) return;
      supabase
        .from('chat_messages')
        .insert(
          msgs.map((m) => ({
            user_id: userId,
            thread,
            role: m.role,
            text: m.text,
            attachment_path: m.attachment?.path ?? null,
            attachment_type: m.attachment?.type ?? null,
            attachment_name: m.attachment?.name ?? null,
          })),
        )
        .then(({ error }) => setOffline(!!error));
    },
    [userId],
  );

  const clearChat = useCallback(
    (thread: string) => {
      // Les fichiers joints partent avec la conversation : sans ça
      // ils resteraient dans le stockage sans plus rien y renvoyer.
      const paths = (threads[thread] ?? [])
        .map((m) => m.attachment?.path)
        .filter((p): p is string => !!p);

      setThreads((prev) => ({ ...prev, [thread]: [] }));

      if (!userId) return;
      void removeAttachments(paths);
      supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .eq('thread', thread)
        .then(() => {});
    },
    [userId, threads],
  );

  // ── Remise à zéro ───────────────────────────────────────────
  // Lève en cas d'échec : l'appelant doit pouvoir prévenir
  // l'élève. Supabase renvoie l'erreur au lieu de la lancer,
  // donc sans ce test l'échec passerait totalement inaperçu.
  const resetAll = useCallback(async () => {
    if (userId) {
      const { error } = await supabase.rpc('reset_progress');
      if (error) throw new Error(error.message);
    }
    setProgress(DEFAULT_PROGRESS);
    setThreads({});
    setActivity([]);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (userId) await loadFromServer(userId);
  }, [userId, loadFromServer]);

  const t = useCallback(
    (path: string, vars?: Record<string, string>) => translate(profile.lang, path, vars),
    [profile.lang],
  );

  // Niveau = √(XP/60) : progression douce et motivante
  const level = useMemo(() => Math.floor(Math.sqrt(progress.xp / 60)) + 1, [progress.xp]);
  const levelProgress = useMemo(() => {
    const cur = 60 * (level - 1) ** 2;
    const next = 60 * level ** 2;
    return Math.min(1, Math.max(0, (progress.xp - cur) / (next - cur)));
  }, [progress.xp, level]);

  const value: AppState = {
    ready: ready && authReady,
    syncing,
    offline,
    profile,
    progress,
    threads,
    activity,
    level,
    levelProgress,
    t,
    updateProfile,
    studyTopic,
    applyQuizResults,
    addChatMessages,
    clearChat,
    touchActivity,
    resetAll,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return ctx;
}
