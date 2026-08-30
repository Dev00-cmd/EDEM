export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          text: string
          thread: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          text: string
          thread?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          text?: string
          thread?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          departement_id: string
          id: string
          name: string
        }
        Insert: {
          departement_id: string
          id: string
          name: string
        }
        Update: {
          departement_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "communes_departement_id_fkey"
            columns: ["departement_id"]
            isOneToOne: false
            referencedRelation: "departements"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          day: string
          quizzes_done: number
          topics_studied: number
          user_id: string
          xp_gained: number
        }
        Insert: {
          day: string
          quizzes_done?: number
          topics_studied?: number
          user_id: string
          xp_gained?: number
        }
        Update: {
          day?: string
          quizzes_done?: number
          topics_studied?: number
          user_id?: string
          xp_gained?: number
        }
        Relationships: []
      }
      departements: {
        Row: {
          id: string
          name: string
          rank: number
        }
        Insert: {
          id: string
          name: string
          rank: number
        }
        Update: {
          id?: string
          name?: string
          rank?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          board_alias: string | null
          board_visible: boolean
          commune_id: string | null
          created_at: string
          exam_year: number | null
          favorites: string[]
          goal: string
          id: string
          lang: string
          level: string
          name: string
          onboarded: boolean
          profile_completed_at: string | null
          role: string
          school_id: string | null
          section: string | null
          study_minutes: number | null
          theme: string
          updated_at: string
          weak_subjects: string[]
        }
        Insert: {
          board_alias?: string | null
          board_visible?: boolean
          commune_id?: string | null
          created_at?: string
          exam_year?: number | null
          favorites?: string[]
          goal?: string
          id: string
          lang?: string
          level?: string
          name?: string
          onboarded?: boolean
          profile_completed_at?: string | null
          role?: string
          school_id?: string | null
          section?: string | null
          study_minutes?: number | null
          theme?: string
          updated_at?: string
          weak_subjects?: string[]
        }
        Update: {
          board_alias?: string | null
          board_visible?: boolean
          commune_id?: string | null
          created_at?: string
          exam_year?: number | null
          favorites?: string[]
          goal?: string
          id?: string
          lang?: string
          level?: string
          name?: string
          onboarded?: boolean
          profile_completed_at?: string | null
          role?: string
          school_id?: string | null
          section?: string | null
          study_minutes?: number | null
          theme?: string
          updated_at?: string
          weak_subjects?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_section_fkey"
            columns: ["section"]
            isOneToOne: false
            referencedRelation: "school_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          answered: number
          correct: number
          last_active: string | null
          quizzes_done: number
          streak: number
          studied_count: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          answered?: number
          correct?: number
          last_active?: string | null
          quizzes_done?: number
          streak?: number
          studied_count?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          answered?: number
          correct?: number
          last_active?: string | null
          quizzes_done?: number
          streak?: number
          studied_count?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          correct: number
          created_at: string
          difficulty: string
          id: string
          score_pct: number
          subject_id: string
          total: number
          user_id: string
        }
        Insert: {
          correct: number
          created_at?: string
          difficulty?: string
          id?: string
          score_pct: number
          subject_id: string
          total: number
          user_id: string
        }
        Update: {
          correct?: number
          created_at?: string
          difficulty?: string
          id?: string
          score_pct?: number
          subject_id?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      quiz_seen_questions: {
        Row: {
          created_at: string
          id: string
          qhash: string | null
          question: string
          subject_id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          qhash?: string | null
          question: string
          subject_id: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          qhash?: string | null
          question?: string
          subject_id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          answers: Json
          created_at: string
          difficulty: string
          graded_at: string | null
          id: string
          picked: Json | null
          questions: Json | null
          score_pct: number | null
          subject_id: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          difficulty?: string
          graded_at?: string | null
          id?: string
          picked?: Json | null
          questions?: Json | null
          score_pct?: number | null
          subject_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          difficulty?: string
          graded_at?: string | null
          id?: string
          picked?: Json | null
          questions?: Json | null
          score_pct?: number | null
          subject_id?: string
          user_id?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string
          name: string
        }
        Insert: {
          applied_at?: string
          name: string
        }
        Update: {
          applied_at?: string
          name?: string
        }
        Relationships: []
      }
      school_levels: {
        Row: {
          cycle: string
          has_exam: boolean
          id: string
          label_fr: string
          label_ht: string
          needs_section: boolean
          rank: number
        }
        Insert: {
          cycle: string
          has_exam?: boolean
          id: string
          label_fr: string
          label_ht: string
          needs_section?: boolean
          rank: number
        }
        Update: {
          cycle?: string
          has_exam?: boolean
          id?: string
          label_fr?: string
          label_ht?: string
          needs_section?: boolean
          rank?: number
        }
        Relationships: []
      }
      school_sections: {
        Row: {
          id: string
          label_fr: string
          label_ht: string
          rank: number
        }
        Insert: {
          id: string
          label_fr: string
          label_ht: string
          rank: number
        }
        Update: {
          id?: string
          label_fr?: string
          label_ht?: string
          rank?: number
        }
        Relationships: []
      }
      schools: {
        Row: {
          commune_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: string
          type: string
        }
        Insert: {
          commune_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: string
          type?: string
        }
        Update: {
          commune_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_mastery: {
        Row: {
          last_study_on: string | null
          mastery: number
          subject_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_study_on?: string | null
          mastery?: number
          subject_id: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_study_on?: string | null
          mastery?: number
          subject_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          kind: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_quiz_results: {
        Args: { p_difficulty?: string; p_results: Json; p_subject_id: string }
        Returns: Json
      }
      bump_usage: {
        Args: { p_kind: string; p_limit: number; p_user_id: string }
        Returns: Json
      }
      conversation_list: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          message_count: number
          preview: string
          subject_id: string
          title: string
          updated_at: string
        }[]
      }
      grade_quiz: {
        Args: { p_picked: Json; p_session_id: string }
        Returns: Json
      }
      leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          is_me: boolean
          level: number
          name: string
          rank: number
          xp: number
        }[]
      }
      my_rank: {
        Args: never
        Returns: {
          rank: number
          total: number
          xp: number
        }[]
      }
      norm_text: { Args: { p_text: string }; Returns: string }
      profile_completion: { Args: never; Returns: Json }
      propose_school: {
        Args: { p_commune_id: string; p_name: string; p_type?: string }
        Returns: Json
      }
      purge_seen_questions: { Args: { p_keep?: number }; Returns: number }
      quiz_history: {
        Args: { p_limit?: number }
        Returns: {
          difficulty: string
          graded_at: string
          id: string
          score_pct: number
          subject_id: string
          total: number
        }[]
      }
      recent_seen_questions: {
        Args: { p_limit?: number; p_subject_id: string }
        Returns: {
          stem: string
        }[]
      }
      reset_progress: { Args: never; Returns: undefined }
      search_schools: {
        Args: { p_commune_id?: string; p_query?: string }
        Returns: {
          commune: string
          commune_id: string
          departement: string
          id: string
          name: string
          status: string
          type: string
        }[]
      }
      seen_topics: {
        Args: { p_subject_id: string }
        Returns: {
          nb: number
          topic: string
        }[]
      }
      study_topic: {
        Args: { p_subject_id: string; p_topic_id: string }
        Returns: {
          answered: number
          correct: number
          last_active: string | null
          quizzes_done: number
          streak: number
          studied_count: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      touch_activity: {
        Args: never
        Returns: {
          answered: number
          correct: number
          last_active: string | null
          quizzes_done: number
          streak: number
          studied_count: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
