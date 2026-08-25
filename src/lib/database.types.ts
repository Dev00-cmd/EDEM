// ═══════════════════════════════════════════════════════════════
//  TYPES DE LA BASE — générés depuis Supabase.
//  Ne pas modifier à la main : régénérer avec
//    npx supabase gen types typescript --project-id qoyebljuvrxhcroxapys
// ═══════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.17';
  };
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachment_name: string | null;
          attachment_path: string | null;
          attachment_type: string | null;
          created_at: string;
          id: string;
          role: string;
          text: string;
          thread: string;
          user_id: string;
        };
        Insert: {
          attachment_name?: string | null;
          attachment_path?: string | null;
          attachment_type?: string | null;
          created_at?: string;
          id?: string;
          role: string;
          text: string;
          thread?: string;
          user_id: string;
        };
        Update: {
          attachment_name?: string | null;
          attachment_path?: string | null;
          attachment_type?: string | null;
          created_at?: string;
          id?: string;
          role?: string;
          text?: string;
          thread?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_activity: {
        Row: {
          day: string;
          quizzes_done: number;
          topics_studied: number;
          user_id: string;
          xp_gained: number;
        };
        Insert: {
          day: string;
          quizzes_done?: number;
          topics_studied?: number;
          user_id: string;
          xp_gained?: number;
        };
        Update: {
          day?: string;
          quizzes_done?: number;
          topics_studied?: number;
          user_id?: string;
          xp_gained?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          favorites: string[];
          goal: string;
          id: string;
          lang: string;
          level: string;
          name: string;
          onboarded: boolean;
          theme: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          favorites?: string[];
          goal?: string;
          id: string;
          lang?: string;
          level?: string;
          name?: string;
          onboarded?: boolean;
          theme?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          favorites?: string[];
          goal?: string;
          id?: string;
          lang?: string;
          level?: string;
          name?: string;
          onboarded?: boolean;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          answered: number;
          correct: number;
          last_active: string | null;
          quizzes_done: number;
          streak: number;
          studied_count: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          answered?: number;
          correct?: number;
          last_active?: string | null;
          quizzes_done?: number;
          streak?: number;
          studied_count?: number;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          answered?: number;
          correct?: number;
          last_active?: string | null;
          quizzes_done?: number;
          streak?: number;
          studied_count?: number;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [];
      };
      quiz_results: {
        Row: {
          correct: number;
          created_at: string;
          id: string;
          score_pct: number;
          subject_id: string;
          total: number;
          user_id: string;
        };
        Insert: {
          correct: number;
          created_at?: string;
          id?: string;
          score_pct: number;
          subject_id: string;
          total: number;
          user_id: string;
        };
        Update: {
          correct?: number;
          created_at?: string;
          id?: string;
          score_pct?: number;
          subject_id?: string;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      topic_mastery: {
        Row: {
          mastery: number;
          subject_id: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          mastery?: number;
          subject_id: string;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          mastery?: number;
          subject_id?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_quiz_results: {
        Args: { p_results: Json; p_subject_id: string; p_difficulty?: string };
        Returns: Json;
      };
      leaderboard: {
        Args: { p_limit?: number };
        Returns: {
          rank: number;
          name: string;
          xp: number;
          level: number;
          is_me: boolean;
        }[];
      };
      my_rank: {
        Args: never;
        Returns: { rank: number; total: number; xp: number }[];
      };
      reset_progress: { Args: never; Returns: undefined };
      study_topic: {
        Args: { p_subject_id: string; p_topic_id: string; p_xp?: number };
        Returns: {
          answered: number;
          correct: number;
          last_active: string | null;
          quizzes_done: number;
          streak: number;
          studied_count: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        SetofOptions: {
          from: '*';
          to: 'progress';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      touch_activity: {
        Args: never;
        Returns: {
          answered: number;
          correct: number;
          last_active: string | null;
          quizzes_done: number;
          streak: number;
          studied_count: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        SetofOptions: {
          from: '*';
          to: 'progress';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views']),
> = (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends {
  Row: infer R;
}
  ? R
  : never;

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never;
