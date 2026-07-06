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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_type: string
          caller_id: string
          conversation_id: string
          duration_seconds: number
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string
          status: string
        }
        Insert: {
          call_type: string
          caller_id: string
          conversation_id: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string
          status: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          conversation_id?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          receiver_id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number | null
          contact: string | null
          created_at: string
          currency: string | null
          description: string | null
          flagged: boolean
          id: string
          kind: string
          status: string
          title: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          amount?: number | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          flagged?: boolean
          id?: string
          kind: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          amount?: number | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          flagged?: boolean
          id?: string
          kind?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          city: string | null
          country: string | null
          cover_letter: string | null
          created_at: string
          education: string | null
          email: string | null
          experience: string | null
          full_name: string | null
          id: string
          job_id: string
          message: string | null
          phone: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          skills: string[]
          status: string
        }
        Insert: {
          applicant_id: string
          city?: string | null
          country?: string | null
          cover_letter?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          full_name?: string | null
          id?: string
          job_id: string
          message?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          skills?: string[]
          status?: string
        }
        Update: {
          applicant_id?: string
          city?: string | null
          country?: string | null
          cover_letter?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          full_name?: string | null
          id?: string
          job_id?: string
          message?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          skills?: string[]
          status?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          applicants_count: number
          apply_deadline: string | null
          city: string | null
          company: string | null
          contact_link: string | null
          country: string | null
          created_at: string
          description: string
          education_level: string | null
          experience_level: string | null
          id: string
          job_type: string | null
          location: string | null
          poster_id: string
          remote: boolean
          salary_range: string | null
          skills: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          applicants_count?: number
          apply_deadline?: string | null
          city?: string | null
          company?: string | null
          contact_link?: string | null
          country?: string | null
          created_at?: string
          description: string
          education_level?: string | null
          experience_level?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          poster_id: string
          remote?: boolean
          salary_range?: string | null
          skills?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          applicants_count?: number
          apply_deadline?: string | null
          city?: string | null
          company?: string | null
          contact_link?: string | null
          country?: string | null
          created_at?: string
          description?: string
          education_level?: string | null
          experience_level?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          poster_id?: string
          remote?: boolean
          salary_range?: string | null
          skills?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string | null
          comments_count: number
          content: string
          created_at: string
          donation_id: string | null
          hashtags: string[]
          hidden: boolean
          id: string
          image_url: string | null
          job_id: string | null
          language: string | null
          likes_count: number
          location: string | null
          purpose: string
          reposts_count: number
          saves_count: number
          seo_description: string | null
          seo_slug: string | null
          seo_title: string | null
          telegram_file_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          comments_count?: number
          content: string
          created_at?: string
          donation_id?: string | null
          hashtags?: string[]
          hidden?: boolean
          id?: string
          image_url?: string | null
          job_id?: string | null
          language?: string | null
          likes_count?: number
          location?: string | null
          purpose?: string
          reposts_count?: number
          saves_count?: number
          seo_description?: string | null
          seo_slug?: string | null
          seo_title?: string | null
          telegram_file_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          donation_id?: string | null
          hashtags?: string[]
          hidden?: boolean
          id?: string
          image_url?: string | null
          job_id?: string | null
          language?: string | null
          likes_count?: number
          location?: string | null
          purpose?: string
          reposts_count?: number
          saves_count?: number
          seo_description?: string | null
          seo_slug?: string | null
          seo_title?: string | null
          telegram_file_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          bio: string | null
          created_at: string
          display_name: string | null
          followers_count: number
          following_count: number
          id: string
          is_private: boolean
          last_seen: string | null
          notif_prefs: Json
          posts_count: number
          show_activity: boolean
          updated_at: string
          user_id: string
          username: string | null
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          is_private?: boolean
          last_seen?: string | null
          notif_prefs?: Json
          posts_count?: number
          show_activity?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          is_private?: boolean
          last_seen?: string | null
          notif_prefs?: Json
          posts_count?: number
          show_activity?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          id: string
          reel_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          reel_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          reel_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          comments_count: number
          created_at: string
          duration_seconds: number | null
          filter: string | null
          hidden: boolean
          id: string
          likes_count: number
          music_name: string | null
          restricted: boolean
          telegram_file_id: string | null
          text_overlay: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          duration_seconds?: number | null
          filter?: string | null
          hidden?: boolean
          id?: string
          likes_count?: number
          music_name?: string | null
          restricted?: boolean
          telegram_file_id?: string | null
          text_overlay?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          duration_seconds?: number | null
          filter?: string | null
          hidden?: boolean
          id?: string
          likes_count?: number
          music_name?: string | null
          restricted?: boolean
          telegram_file_id?: string | null
          text_overlay?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_flag: boolean
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          ai_flag?: boolean
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          ai_flag?: boolean
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          scheduled_for: string | null
          sent: boolean
          target: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          scheduled_for?: string | null
          sent?: boolean
          target?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          scheduled_for?: string | null
          sent?: boolean
          target?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string
          response: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          response?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_stories: { Args: never; Returns: undefined }
      get_personalized_feed: {
        Args: {
          _limit?: number
          _offset?: number
          _user_id: string
          _videos_only?: boolean
        }
        Returns: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string
          kind: string
          likes_count: number
          reposts_count: number
          saves_count: number
          score: number
          telegram_file_id: string
          user_id: string
          video_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_reel_view: { Args: { _id: string }; Returns: undefined }
      is_admin_tier: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "support"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "support"],
    },
  },
} as const
