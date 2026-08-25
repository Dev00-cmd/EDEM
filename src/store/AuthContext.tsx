// ═══════════════════════════════════════════════════════════════
//  COMPTES ÉLÈVES
//
//  Gère la session Supabase : inscription, connexion, déconnexion.
//  La session est persistée : l'élève ne se reconnecte pas à
//  chaque ouverture de l'app.
// ═══════════════════════════════════════════════════════════════

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, authErrorMessage } from '@/lib/supabase';
import type { Lang } from '@/i18n';

interface AuthResult {
  ok: boolean;
  /** Message déjà traduit, prêt à afficher. */
  error?: string;
  /** true quand le compte est créé mais l'email doit être confirmé. */
  needsEmailConfirmation?: boolean;
}

interface AuthState {
  /** false tant qu'on n'a pas encore lu la session stockée. */
  ready: boolean;
  session: Session | null;
  user: User | null;
  signUp: (
    email: string,
    password: string,
    name: string,
    lang: Lang,
  ) => Promise<AuthResult>;
  signIn: (email: string, password: string, lang: Lang) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string, lang: Lang) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string, lang: Lang): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        // Repris par le trigger SQL pour pré-remplir le profil.
        options: { data: { name: name.trim(), lang } },
      });

      if (error) return { ok: false, error: authErrorMessage(error.message, lang) };

      // Pas de session renvoyée : Supabase attend une confirmation
      // d'e-mail. Comme les comptes sont confirmés d'office côté
      // base, on enchaîne directement sur une connexion — l'élève
      // n'a rien à faire de plus.
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        // Si même la connexion refuse, c'est que la confirmation
        // est réellement exigée : on l'explique plutôt que de
        // laisser l'élève devant un écran figé.
        if (signInError) return { ok: true, needsEmailConfirmation: true };
      }

      return { ok: true };
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string, lang: Lang): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, error: authErrorMessage(error.message, lang) };
      return { ok: true };
    },
    [],
  );

  // Lève en cas d'échec, pour que l'écran puisse le dire à
  // l'élève : Supabase renvoie l'erreur plutôt que de la lancer.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  const sendPasswordReset = useCallback(
    async (email: string, lang: Lang): Promise<AuthResult> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) return { ok: false, error: authErrorMessage(error.message, lang) };
      return { ok: true };
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
    }),
    [ready, session, signUp, signIn, signOut, sendPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
