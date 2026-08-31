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
import { acceptCharter as acceptCharterRpc } from '@/lib/moderation';
import { useAuth } from './AuthContext';
import type { Lang } from '@/i18n';
import { translate } from '@/i18n';
import type { ThemeMode } from '@/theme/colors';

// ─── Types (conservés à l'identique pour le moteur de parcours) ──

export interface Profile {
  name: string;
  lang: Lang;
  level: string; // classe, ex. "9e AF"
  goal: string; // 'exams' | 'grades' | 'learn' | 'english' | 'catchup' | ''
  favorites: string[]; // ids de matières choisies
  theme: ThemeMode;
  onboarded: boolean;
  /**
   * Pseudonyme affiché au classement, à la place du prénom.
   *
   * Le classement montre l'élève à tous les autres utilisateurs,
   * et ce sont des mineurs. Chaîne vide = on affiche le prénom.
   */
  boardAlias: string;
  /** Apparaître ou non dans la liste publique du classement. */
  boardVisible: boolean;

  // ── Profil scolaire (moment 2 de l'onboarding) ──────────────
  //
  // Tout est facultatif : rien ici ne bloque l'élève. Chaque champ
  // doit pouvoir être justifié à l'élève en une phrase, affichée
  // sous la question.

  /** Série du Nouveau Secondaire — choisie dès l'entrée en NS3. */
  section: string | null;
  /** École, choisie dans le référentiel ou proposée par l'élève. */
  schoolId: string | null;
  /** Commune. Le département s'en déduit, on ne le demande pas. */
  communeId: string | null;
  /** Matières les plus difficiles, 5 au plus. M. Thomas insiste dessus. */
  weakSubjects: string[];
  /** Année de l'examen visé, si l'objectif est « examens d'État ». */
  examYear: number | null;
  /** Minutes d'étude par jour : 15, 30, 60 ou 120. Taille le plan. */
  studyMinutes: number | null;
  /** Rôle. Accordé par le serveur, jamais modifiable ici. */
  role: 'eleve' | 'prof';
  /**
   * Quand l'élève a accepté la charte de la classe. null tant
   * qu'il ne l'a pas lue — le serveur refuse alors ses messages,
   * l'écran n'est pas seul à garder la porte.
   */
  charterAcceptedAt: string | null;
  /** Date du bonus de profil complet. Non nul = déjà versé. */
  profileCompletedAt: string | null;
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

/**
 * Une conversation avec M. Thomas.
 *
 * L'élève n'avait qu'un fil par matière, écrasé au fil du temps :
 * poser une nouvelle question effaçait celui de la veille. Il en
 * ouvre maintenant autant qu'il veut, et les retrouve toutes.
 */
export interface Conversation {
  id: string;
  subjectId: string;
  /** Repris du premier message. null tant qu'il n'a rien écrit. */
  title: string | null;
  updatedAt: number;
  messageCount: number;
  /** Extrait du dernier message, pour la liste. */
  preview: string;
}

/** Un point du graphique de progression (écran Parcours). */
export interface ActivityPoint {
  day: string; // "AAAA-MM-JJ"
  xp: number;
}

/**
 * Où en est le profil de l'élève.
 *
 * Calculé par le serveur, jamais ici : il accorde des XP, et
 * depuis le verrouillage des écritures, toute XP passe par une
 * fonction SECURITY DEFINER. Un pourcentage calculé sur le
 * téléphone serait un pourcentage négociable.
 */
export interface Completion {
  pct: number;
  done: number;
  total: number;
  /** Clés des champs encore vides, dans l'ordre où les demander. */
  missing: string[];
  /** XP versés à l'instant. 0 la plupart du temps. */
  bonus: number;
  completed: boolean;
}

const DEFAULT_COMPLETION: Completion = {
  pct: 0,
  done: 0,
  total: 0,
  missing: [],
  bonus: 0,
  completed: false,
};

const DEFAULT_PROFILE: Profile = {
  name: '',
  lang: 'fr',
  level: '',
  goal: '',
  favorites: [],
  theme: 'dark',
  onboarded: false,
  boardAlias: '',
  // Visible par défaut : rendre les comptes existants invisibles
  // les ferait disparaître d'un classement où ils figurent déjà,
  // sans explication.
  boardVisible: true,

  section: null,
  schoolId: null,
  communeId: null,
  weakSubjects: [],
  examYear: null,
  studyMinutes: null,
  role: 'eleve',
  profileCompletedAt: null,
  charterAcceptedAt: null,
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
  /** Conversations, de la plus récente à la plus ancienne. */
  conversations: Conversation[];
  /** Celle qui est ouverte dans le tuteur. */
  currentConversationId: string | null;
  messages: ChatMsg[];
  /** Ouvre une conversation existante et charge ses messages. */
  openConversation: (id: string) => Promise<void>;
  /** Repart de zéro. Rien n'est écrit en base tant que l'élève
   *  n'a pas parlé : sinon la liste se remplirait de fils vides. */
  startConversation: (subjectId: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  addChatMessages: (msgs: ChatMsg[]) => Promise<void>;
  clearChat: () => void;
  touchActivity: () => void;
  resetAll: () => Promise<void>;
  refresh: () => Promise<void>;

  // ── Complétion du profil (moment 2 de l'onboarding) ─────────
  /** Dernier état connu. Recalculé par le serveur, jamais ici. */
  completion: Completion;
  /** Redemande le pourcentage au serveur. Verse le bonus si 100 %. */
  refreshCompletion: () => Promise<Completion>;
  /**
   * L'élève a-t-il déjà fait quelque chose de réel, sans avoir vu
   * l'écran « Personnalise ton tuteur » ni l'avoir écarté ?
   */
  shouldTune: boolean;
  /** « Plus tard ». On ne le repropose pas sur cet appareil. */
  dismissTune: () => void;

  // ── Le point de vue, pour un compte professeur ──────────────
  /**
   * Un professeur regarde l'app comme un élève. Ce n'est PAS un
   * changement de rôle : le rôle vit en base et le serveur seul en
   * décide. Ici on ne change que ce qui s'affiche.
   */
  vueEleve: boolean;
  basculerVue: (eleve: boolean) => void;

  /**
   * Accepte la charte de la classe. Écrit par une fonction
   * SECURITY DEFINER : `charter_accepted_at` ne figure pas dans
   * les colonnes que l'application a le droit de modifier.
   */
  acceptCharter: () => Promise<boolean>;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  // Matière d'une conversation pas encore créée en base : l'élève
  // a ouvert un fil neuf mais n'a pas encore parlé.
  const pendingSubject = useRef<string>('general');
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [completion, setCompletion] = useState<Completion>(DEFAULT_COMPLETION);
  /** « Plus tard » sur l'écran de personnalisation, par appareil. */
  const [tuneDismissed, setTuneDismissed] = useState(false);
  // Un professeur peut regarder l'app comme un élève : son compte
  // EST resté un compte d'élève, avec ses XP et son tuteur.
  const [vueEleve, setVueEleve] = useState(false);

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
          supabase.rpc('conversation_list', { p_limit: 60 }),
          supabase
            .from('daily_activity')
            .select('day, xp_gained')
            .eq('user_id', uid)
            .order('day', { ascending: false })
            .limit(30),
        ]);

      if (profileRes.error) throw profileRes.error;

      // ── UNE SESSION PEUT SURVIVRE À SON COMPTE ────────────────
      //
      // Le téléphone garde un jeton valide jusqu'à son expiration.
      // Si le compte a disparu entre-temps, ce jeton continue de
      // passer pour authentifié : `auth.uid()` rend un identifiant
      // qui ne correspond plus à personne.
      //
      // L'app envoyait alors l'utilisateur dans l'onboarding — un
      // profil vide, ça ressemble à un compte neuf — et TOUT
      // échouait ensuite sans explication : la moindre écriture
      // butait sur une clé étrangère vers `auth.users`, rendue à
      // l'écran comme « Ça n'a pas marché. Réessaie. »
      //
      // Vu en vrai. On vérifie donc auprès d'Auth avant de conclure
      // au compte neuf, et on déconnecte : se reconnecter est la
      // seule issue, autant y conduire.
      if (!profileRes.data) {
        const { error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          await supabase.auth.signOut();
          return;
        }
      }

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
            boardAlias: p.board_alias ?? '',
            boardVisible: p.board_visible ?? true,
            section: p.section ?? null,
            schoolId: p.school_id ?? null,
            communeId: p.commune_id ?? null,
            weakSubjects: p.weak_subjects ?? [],
            examYear: p.exam_year ?? null,
            studyMinutes: p.study_minutes ?? null,
            role: p.role === 'prof' ? 'prof' : 'eleve',
            profileCompletedAt: p.profile_completed_at ?? null,
            charterAcceptedAt: p.charter_accepted_at ?? null,
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

      // Conversations : on ne charge que la LISTE. Rapatrier tous
      // les messages de toutes les conversations pour afficher un
      // écran d'accueil serait coûteux sur un réseau haïtien — le
      // contenu se charge à l'ouverture d'une conversation.
      const nextConversations: Conversation[] = (chatRes.data ?? []).map((c) => ({
        id: c.id,
        subjectId: c.subject_id,
        title: c.title,
        updatedAt: new Date(c.updated_at).getTime(),
        messageCount: c.message_count ?? 0,
        preview: c.preview ?? '',
      }));

      const nextActivity: ActivityPoint[] = (activityRes.data ?? [])
        .map((r) => ({ day: r.day, xp: r.xp_gained }))
        .reverse();

      setProfile(nextProfile);
      setProgress(nextProgress);
      setConversations(nextConversations);
      setActivity(nextActivity);
      setOffline(false);

      writeCache(cacheKey(STORAGE_KEYS.PROFILE, uid), nextProfile);
      writeCache(cacheKey(STORAGE_KEYS.PROGRESS, uid), nextProgress);
      writeCache(cacheKey(STORAGE_KEYS.CHAT, uid), nextConversations);
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
      setConversations([]);
      setCurrentConversationId(null);
      setMessages([]);
      setActivity([]);
      setReady(true);
      return;
    }

    let alive = true;
    (async () => {
      // 1) cache d'abord — l'app s'ouvre sans attendre le réseau
      const [cp, cpr, ct, skipped, vue] = await Promise.all([
        readCache(cacheKey(STORAGE_KEYS.PROFILE, userId), DEFAULT_PROFILE),
        readCache(cacheKey(STORAGE_KEYS.PROGRESS, userId), DEFAULT_PROGRESS),
        readCache(cacheKey(STORAGE_KEYS.CHAT, userId), [] as Conversation[]),
        readCache(cacheKey(STORAGE_KEYS.TUNE_SKIPPED, userId), false),
        readCache(cacheKey(STORAGE_KEYS.VUE_ELEVE, userId), false),
      ]);
      if (!alive) return;
      setProfile(cp);
      setProgress(cpr);
      setConversations(Array.isArray(ct) ? ct : []);
      setTuneDismissed(skipped === true);
      setVueEleve(vue === true);
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
    writeCache(cacheKey(STORAGE_KEYS.CHAT, userId), conversations);
  }, [conversations, userId]);

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
              // La contrainte en base refuse un pseudonyme vide :
              // on envoie null plutôt qu'une chaîne vide.
              board_alias: next.boardAlias.trim() || null,
              board_visible: next.boardVisible,
              section: next.section,
              school_id: next.schoolId,
              commune_id: next.communeId,
              weak_subjects: next.weakSubjects,
              exam_year: next.examYear,
              study_minutes: next.studyMinutes,
              updated_at: new Date().toISOString(),
              // NE JAMAIS ajouter `role` ni `profile_completed_at`
              // ici : l'application n'a pas le droit d'écrire ces
              // colonnes, et Postgres refuserait TOUT l'upsert —
              // le profil ne s'enregistrerait plus du tout.
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
  //
  // Il n'y a plus de voie de secours, et c'est voulu. Le repli
  // sur `apply_quiz_results` accordait des XP sur la seule parole
  // de l'application : un POST sur /rest/v1/rpc, avec la clé anon
  // qui est dans l'app, suffisait à s'en attribuer autant qu'on
  // voulait. La fonction n'est plus appelable depuis le client.
  //
  // Un quiz sans session ne peut donc plus être noté — c'est pour
  // ça qu'il n'est plus lancé du tout (voir remoteTutor).
  const applyQuizResults = useCallback(
    async (
      subjectId: string,
      results: { topic: string; ok: boolean }[],
      difficulty: Difficulty,
      sessionId?: string | null,
      picked?: (number | null)[],
    ) => {
      if (!userId || results.length === 0) return 0;
      if (!sessionId || !picked) return 0;

      const { data, error } = await supabase.rpc('grade_quiz', {
        p_session_id: sessionId,
        p_picked: picked,
      });

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

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('conversation_list', { p_limit: 60 });
    if (error || !data) return;
    setConversations(
      data.map((c) => ({
        id: c.id,
        subjectId: c.subject_id,
        title: c.title,
        updatedAt: new Date(c.updated_at).getTime(),
        messageCount: c.message_count ?? 0,
        preview: c.preview ?? '',
      })),
    );
  }, [userId]);

  /** Ouvre une conversation et charge SES messages seulement. */
  const openConversation = useCallback(
    async (id: string) => {
      setCurrentConversationId(id);
      setMessages([]);
      if (!userId) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select(
          'id, role, text, created_at, attachment_path, attachment_type, attachment_name',
        )
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error || !data) {
        setOffline(true);
        return;
      }

      setMessages(
        data.map((row) => ({
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
        })),
      );
    },
    [userId],
  );

  /**
   * Repart d'une conversation vide.
   *
   * Rien n'est écrit en base tant que l'élève n'a pas parlé :
   * sinon un appui distrait sur « nouvelle » remplirait sa liste
   * de fils vides.
   */
  const startConversation = useCallback((subjectId: string) => {
    pendingSubject.current = subjectId;
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  const addChatMessages = useCallback(
    async (msgs: ChatMsg[]) => {
      setMessages((prev) => [...prev, ...msgs]);
      if (!userId) return;

      let convId = currentConversationId;

      // Première parole : c'est maintenant qu'on crée la
      // conversation, titrée par ce que l'élève vient d'écrire.
      if (!convId) {
        const first = msgs.find((m) => m.role === 'user');
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            subject_id: pendingSubject.current,
            title: first ? first.text.trim().slice(0, 60) : null,
          })
          .select('id')
          .single();

        if (error || !data) {
          setOffline(true);
          return;
        }
        convId = data.id;
        setCurrentConversationId(convId);
      }

      const { error } = await supabase.from('chat_messages').insert(
        msgs.map((m) => ({
          user_id: userId,
          conversation_id: convId,
          // `thread` reste rempli : la colonne est NOT NULL, et
          // d'anciennes versions de l'app la lisent encore.
          thread: pendingSubject.current,
          role: m.role,
          text: m.text,
          attachment_path: m.attachment?.path ?? null,
          attachment_type: m.attachment?.type ?? null,
          attachment_name: m.attachment?.name ?? null,
        })),
      );
      setOffline(!!error);
      if (!error) void refreshConversations();
    },
    [userId, currentConversationId, refreshConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      if (!userId) return;

      // Les fichiers joints partent avec la conversation : sans ça
      // ils resteraient dans le stockage sans plus rien y renvoyer.
      const { data } = await supabase
        .from('chat_messages')
        .select('attachment_path')
        .eq('conversation_id', id);

      const paths = (data ?? [])
        .map((r) => r.attachment_path)
        .filter((p): p is string => !!p);
      if (paths.length > 0) void removeAttachments(paths);

      // Les messages suivent par cascade (clé étrangère).
      await supabase.from('conversations').delete().eq('id', id);
    },
    [userId, currentConversationId],
  );

  /** Efface la conversation ouverte. */
  const clearChat = useCallback(() => {
    if (currentConversationId) void deleteConversation(currentConversationId);
    else setMessages([]);
  }, [currentConversationId, deleteConversation]);

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
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
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

  // ── Complétion du profil ────────────────────────────────────
  //
  // Le serveur est seul juge : c'est lui qui sait quels champs
  // s'appliquent à ce niveau (un élève de 5e AF n'a pas de série)
  // et lui seul qui peut verser le bonus.
  // ── La charte ───────────────────────────────────────────────
  //
  // On ne passe pas par `updateProfile` : `charter_accepted_at`
  // ne fait pas partie des colonnes que l'application a le droit
  // d'écrire, et Postgres refuserait TOUT l'upsert — le profil ne
  // s'enregistrerait plus du tout. C'est le serveur qui date
  // l'acceptation, on ne fait que relire ce qu'il a écrit.
  const acceptCharter = useCallback(async (): Promise<boolean> => {
    const at = await acceptCharterRpc();
    if (!at) return false;
    setProfile((prev) => ({ ...prev, charterAcceptedAt: at }));
    return true;
  }, []);

  const refreshCompletion = useCallback(async (): Promise<Completion> => {
    if (!userId) return DEFAULT_COMPLETION;
    const { data, error } = await supabase.rpc('profile_completion');
    if (error || !data) return completion;

    const next = data as unknown as Completion;
    setCompletion(next);

    // Le bonus vient d'être versé : la progression a changé en
    // base, on la recharge plutôt que de la recalculer à la main.
    if (next.bonus > 0) loadFromServer(userId);
    return next;
  }, [userId, completion, loadFromServer]);

  // Recalcul à l'ouverture et à chaque modification du profil.
  useEffect(() => {
    if (!userId || !ready) return;
    refreshCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready, profile.level, profile.section, profile.schoolId,
      profile.communeId, profile.goal, profile.examYear, profile.studyMinutes,
      profile.name, profile.favorites.length, profile.weakSubjects.length]);

  const basculerVue = useCallback(
    (eleve: boolean) => {
      setVueEleve(eleve);
      if (userId) writeCache(cacheKey(STORAGE_KEYS.VUE_ELEVE, userId), eleve);
    },
    [userId],
  );

  const dismissTune = useCallback(() => {
    setTuneDismissed(true);
    if (userId) writeCache(cacheKey(STORAGE_KEYS.TUNE_SKIPPED, userId), true);
  }, [userId]);

  /**
   * L'écran « Personnalise ton tuteur » n'apparaît qu'APRÈS une
   * vraie utilisation : une question posée ou un quiz passé. Le
   * demander avant, c'est un formulaire de plus entre l'élève et
   * sa première réponse — et la moitié s'arrête là.
   */
  const aDejaTravaille = progress.quizzesDone > 0 || conversations.length > 0;
  const shouldTune =
    ready &&
    !!userId &&
    profile.onboarded &&
    // Jamais à un professeur. « Personnalise ton tuteur » demande
    // la série, l'objectif d'examen et les matières où l'on se sent
    // faible : ce sont les questions d'un élève. Les poser à un
    // professeur, c'est lui faire remplir un formulaire qui ne le
    // concerne pas pour atteindre 100 % d'un profil d'élève.
    profile.role !== 'prof' &&
    aDejaTravaille &&
    !tuneDismissed &&
    !completion.completed &&
    completion.total > 0;

  const value: AppState = {
    ready: ready && authReady,
    syncing,
    offline,
    profile,
    progress,
    activity,
    level,
    levelProgress,
    t,
    updateProfile,
    studyTopic,
    applyQuizResults,
    conversations,
    currentConversationId,
    messages,
    openConversation,
    startConversation,
    deleteConversation,
    refreshConversations,
    addChatMessages,
    clearChat,
    touchActivity,
    resetAll,
    refresh,
    completion,
    refreshCompletion,
    shouldTune,
    dismissTune,
    vueEleve,
    basculerVue,
    acceptCharter,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return ctx;
}
