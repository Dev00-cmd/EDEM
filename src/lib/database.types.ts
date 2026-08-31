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
      assignments: {
        Row: {
          classroom_id: string
          created_at: string
          created_by: string
          difficulty: string | null
          due_at: string | null
          id: string
          instructions: string | null
          kind: string
          published: boolean
          subject_id: string
          title: string
          topic_ids: string[]
          updated_at: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          created_by: string
          difficulty?: string | null
          due_at?: string | null
          id?: string
          instructions?: string | null
          kind: string
          published?: boolean
          subject_id: string
          title: string
          topic_ids?: string[]
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          created_by?: string
          difficulty?: string | null
          due_at?: string | null
          id?: string
          instructions?: string | null
          kind?: string
          published?: boolean
          subject_id?: string
          title?: string
          topic_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
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
      classroom_members: {
        Row: {
          classroom_id: string
          created_at: string
          joined_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          joined_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          joined_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_messages: {
        Row: {
          attachment_path: string | null
          classroom_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          flagged: boolean
          id: string
          text: string
          user_id: string
        }
        Insert: {
          attachment_path?: string | null
          classroom_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          flagged?: boolean
          id?: string
          text: string
          user_id: string
        }
        Update: {
          attachment_path?: string | null
          classroom_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          flagged?: boolean
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_messages_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          archived_at: string | null
          created_at: string
          current_focus: string | null
          focus_note: string | null
          grade_level: string
          id: string
          is_open: boolean
          join_code: string
          name: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_focus?: string | null
          focus_note?: string | null
          grade_level: string
          id?: string
          is_open?: boolean
          join_code: string
          name: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_focus?: string | null
          focus_note?: string | null
          grade_level?: string
          id?: string
          is_open?: boolean
          join_code?: string
          name?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_grade_level_fkey"
            columns: ["grade_level"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          departement_id: string
          id: string
          name: string
          official: boolean
          pcode: string
        }
        Insert: {
          departement_id: string
          id: string
          name: string
          official?: boolean
          pcode: string
        }
        Update: {
          departement_id?: string
          id?: string
          name?: string
          official?: boolean
          pcode?: string
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
      moderation_events: {
        Row: {
          actor: string | null
          classroom_id: string | null
          created_at: string
          detail: string | null
          event: string
          id: number
          target_id: string | null
          target_user: string | null
        }
        Insert: {
          actor?: string | null
          classroom_id?: string | null
          created_at?: string
          detail?: string | null
          event: string
          id?: never
          target_id?: string | null
          target_user?: string | null
        }
        Update: {
          actor?: string | null
          classroom_id?: string | null
          created_at?: string
          detail?: string | null
          event?: string
          id?: never
          target_id?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          created_at: string
          essais: number
          message_id: string
          model: string | null
          raison: string
          reviewed_at: string | null
          score: number | null
          status: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          essais?: number
          message_id: string
          model?: string | null
          raison: string
          reviewed_at?: string | null
          score?: number | null
          status?: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          essais?: number
          message_id?: string
          model?: string | null
          raison?: string
          reviewed_at?: string | null
          score?: number | null
          status?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "classroom_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_terms: {
        Row: {
          created_at: string
          gravite: string
          id: number
          lang: string
          mot_entier: boolean
          terme: string
          terme_norm: string | null
        }
        Insert: {
          created_at?: string
          gravite: string
          id?: never
          lang?: string
          mot_entier?: boolean
          terme: string
          terme_norm?: string | null
        }
        Update: {
          created_at?: string
          gravite?: string
          id?: never
          lang?: string
          mot_entier?: boolean
          terme?: string
          terme_norm?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          board_alias: string | null
          board_visible: boolean
          charter_accepted_at: string | null
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
          charter_accepted_at?: string | null
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
          charter_accepted_at?: string | null
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
          assignment_id: string | null
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
          assignment_id?: string | null
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
          assignment_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          classroom_id: string | null
          created_at: string
          detail: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          detail?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          detail?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      role_events: {
        Row: {
          actor: string | null
          created_at: string
          event: string
          id: number
          reason: string | null
          user_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          event: string
          id?: never
          reason?: string | null
          user_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          event?: string
          id?: never
          reason?: string | null
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
          acronym: string
          commune_id: string
          created_at: string
          created_by: string | null
          id: string
          levels: string | null
          menfp_code: string | null
          name: string
          name_norm: string
          source: string
          status: string
          type: string
        }
        Insert: {
          acronym: string
          commune_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          levels?: string | null
          menfp_code?: string | null
          name: string
          name_norm: string
          source?: string
          status?: string
          type?: string
        }
        Update: {
          acronym?: string
          commune_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          levels?: string | null
          menfp_code?: string | null
          name?: string
          name_norm?: string
          source?: string
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
      submissions: {
        Row: {
          assignment_id: string
          attachment_path: string | null
          feedback: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          quiz_session_id: string | null
          score_pct: number | null
          submitted_at: string
          text: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          attachment_path?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          quiz_session_id?: string | null
          score_pct?: number | null
          submitted_at?: string
          text?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          attachment_path?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          quiz_session_id?: string | null
          score_pct?: number | null
          submitted_at?: string
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_requests: {
        Row: {
          contact: string
          created_at: string
          full_name: string
          id: string
          message: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          subjects: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          contact: string
          created_at?: string
          full_name: string
          id?: string
          message?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          subjects?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          contact?: string
          created_at?: string
          full_name?: string
          id?: string
          message?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          subjects?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
      topics: {
        Row: {
          band: string
          label_fr: string
          label_ht: string
          rank: number
          subject_id: string
          topic_id: string
        }
        Insert: {
          band: string
          label_fr: string
          label_ht: string
          rank: number
          subject_id: string
          topic_id: string
        }
        Update: {
          band?: string
          label_fr?: string
          label_ht?: string
          rank?: number
          subject_id?: string
          topic_id?: string
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
      accept_charter: { Args: never; Returns: Json }
      apply_quiz_results: {
        Args: { p_difficulty?: string; p_results: Json; p_subject_id: string }
        Returns: Json
      }
      approve_member: {
        Args: { p_classroom_id: string; p_user_id: string }
        Returns: Json
      }
      approve_teacher_role: {
        Args: { p_note?: string; p_user_id: string }
        Returns: Json
      }
      archive_classroom: { Args: { p_classroom_id: string }; Returns: Json }
      assignment_classroom: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      assignment_quiz_params: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      assignment_submissions: {
        Args: { p_assignment_id: string }
        Returns: {
          affiche: string
          attachment_path: string
          feedback: string
          grade: number
          score_pct: number
          submission_id: string
          submitted_at: string
          text: string
          user_id: string
          vrai_nom: string
        }[]
      }
      bump_usage: {
        Args: { p_kind: string; p_limit: number; p_user_id: string }
        Returns: Json
      }
      classroom_assignments: {
        Args: { p_classroom_id: string }
        Returns: {
          a_corriger: number
          difficulty: string
          due_at: string
          id: string
          kind: string
          moyenne: number
          published: boolean
          rendus: number
          title: string
          topic_ids: string[]
        }[]
      }
      classroom_blocked_attempts: {
        Args: { p_classroom_id: string; p_days?: number }
        Returns: {
          affiche: string
          derniere: string
          tentatives: number
          user_id: string
          vrai_nom: string
        }[]
      }
      classroom_dashboard: {
        Args: { p_classroom_id: string }
        Returns: {
          eleves_mesures: number
          en_difficulte: number
          label_fr: string
          label_ht: string
          maitrise: number
          noms: string[]
          topic_id: string
        }[]
      }
      classroom_messages: {
        Args: { p_before?: string; p_classroom_id: string; p_limit?: number }
        Returns: {
          affiche: string
          attachment_path: string
          created_at: string
          flagged: boolean
          id: string
          is_teacher: boolean
          mine: boolean
          text: string
          user_id: string
          vrai_nom: string
        }[]
      }
      classroom_moderation: {
        Args: { p_classroom_id: string }
        Returns: {
          affiche: string
          attachment: boolean
          auteur_id: string
          created_at: string
          details: string[]
          extrait: string
          flagged: boolean
          message_id: string
          raisons: string[]
          score_ia: number
          signalements: number
          verdict_ia: string
          vrai_nom: string
        }[]
      }
      classroom_roster: {
        Args: { p_classroom_id: string }
        Returns: {
          affiche: string
          is_teacher: boolean
          joined_at: string
          status: string
          user_id: string
          vrai_nom: string
        }[]
      }
      classroom_summary: { Args: { p_classroom_id: string }; Returns: Json }
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
      create_classroom: {
        Args: {
          p_grade_level: string
          p_name: string
          p_school_id: string
          p_subject_id: string
        }
        Returns: Json
      }
      delete_assignment: { Args: { p_assignment_id: string }; Returns: Json }
      delete_classroom_message: {
        Args: { p_message_id: string }
        Returns: Json
      }
      generate_join_code: { Args: never; Returns: string }
      grade_quiz: {
        Args: { p_picked: Json; p_session_id: string }
        Returns: Json
      }
      grade_submission: {
        Args: { p_feedback?: string; p_grade: number; p_submission_id: string }
        Returns: Json
      }
      is_classroom_member: {
        Args: { p_classroom_id: string }
        Returns: boolean
      }
      is_classroom_teacher: {
        Args: { p_classroom_id: string }
        Returns: boolean
      }
      is_teacher_of_attachment: { Args: { p_name: string }; Returns: boolean }
      join_classroom: { Args: { p_code: string }; Returns: Json }
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
      moderate_message: {
        Args: { p_decision: string; p_message_id: string }
        Returns: Json
      }
      moderation_audit: {
        Args: { p_days?: number }
        Returns: {
          actor: string
          classes: number
          derniere: string
          exclusions: number
          masquages: number
          nom: string
          role: string
          suppressions: number
        }[]
      }
      moderation_next_batch: {
        Args: { p_limit?: number }
        Returns: {
          lang: string
          message_id: string
          raison: string
          texte: string
        }[]
      }
      moderation_record_verdict: {
        Args: {
          p_message_id: string
          p_model?: string
          p_score: number
          p_verdict: string
        }
        Returns: Json
      }
      moderation_verdict: { Args: { p_text: string }; Returns: string }
      my_assignments: {
        Args: never
        Returns: {
          classroom: string
          classroom_id: string
          difficulty: string
          due_at: string
          feedback: string
          grade: number
          id: string
          instructions: string
          kind: string
          score_pct: number
          subject_id: string
          submitted_at: string
          title: string
          topic_ids: string[]
        }[]
      }
      my_classrooms: {
        Args: never
        Returns: {
          current_focus: string
          focus_note: string
          grade_level: string
          id: string
          is_open: boolean
          is_teacher: boolean
          join_code: string
          members: number
          my_status: string
          name: string
          pending: number
          school: string
          subject_id: string
          teacher: string
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
      norm_moderation: { Args: { p_text: string }; Returns: string }
      norm_text: { Args: { p_text: string }; Returns: string }
      post_classroom_message: {
        Args: {
          p_attachment_path?: string
          p_classroom_id: string
          p_text: string
        }
        Returns: Json
      }
      profile_completion: { Args: never; Returns: Json }
      propose_school: {
        Args: { p_commune_id: string; p_name: string; p_type?: string }
        Returns: Json
      }
      publish_assignment: {
        Args: { p_assignment_id: string; p_published?: boolean }
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
      reject_teacher_role: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      remove_member: {
        Args: { p_classroom_id: string; p_user_id: string }
        Returns: Json
      }
      report_content: {
        Args: {
          p_detail?: string
          p_reason: string
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      request_teacher_role: {
        Args: {
          p_contact: string
          p_full_name: string
          p_message?: string
          p_school_id?: string
          p_subjects?: string[]
        }
        Returns: Json
      }
      reset_progress: { Args: never; Returns: undefined }
      revoke_teacher_role: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      rotate_join_code: { Args: { p_classroom_id: string }; Returns: Json }
      save_assignment: {
        Args: {
          p_classroom_id: string
          p_difficulty?: string
          p_due_at?: string
          p_id?: string
          p_instructions?: string
          p_kind: string
          p_title: string
          p_topic_ids?: string[]
        }
        Returns: Json
      }
      school_acronym: { Args: { p_name: string }; Returns: string }
      search_schools: {
        Args: {
          p_commune_id?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          commune: string
          commune_id: string
          departement: string
          id: string
          name: string
          status: string
          total: number
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
      set_classroom_focus: {
        Args: { p_classroom_id: string; p_focus: string; p_note?: string }
        Returns: Json
      }
      set_classroom_open: {
        Args: { p_classroom_id: string; p_open: boolean }
        Returns: Json
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
      submit_assignment: {
        Args: {
          p_assignment_id: string
          p_attachment_path?: string
          p_text?: string
        }
        Returns: Json
      }
      teacher_requests_to_review: {
        Args: { p_status?: string }
        Returns: {
          commune: string
          compte_cree: string
          contact: string
          demande_le: string
          ecole: string
          matieres: string[]
          message: string
          nom_declare: string
          quiz_faits: number
          statut: string
          user_id: string
          xp: number
        }[]
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
