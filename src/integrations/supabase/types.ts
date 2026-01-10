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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_global_learning: {
        Row: {
          accuracy_percentage: number | null
          avg_trend_accuracy: number | null
          avg_volatility: number | null
          bias_confidence: number | null
          consensus_bias: string | null
          contributor_count: number | null
          correct_predictions: number | null
          strong_resistance: number | null
          strong_support: number | null
          symbol: string
          total_predictions: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          avg_trend_accuracy?: number | null
          avg_volatility?: number | null
          bias_confidence?: number | null
          consensus_bias?: string | null
          contributor_count?: number | null
          correct_predictions?: number | null
          strong_resistance?: number | null
          strong_support?: number | null
          symbol: string
          total_predictions?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          avg_trend_accuracy?: number | null
          avg_volatility?: number | null
          bias_confidence?: number | null
          consensus_bias?: string | null
          contributor_count?: number | null
          correct_predictions?: number | null
          strong_resistance?: number | null
          strong_support?: number | null
          symbol?: string
          total_predictions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_learning_data: {
        Row: {
          avg_price_24h: number | null
          avg_velocity: number | null
          bias_changes: number | null
          confidence_adjustment: number | null
          correct_predictions: number | null
          created_at: string
          exchange_flow_sensitivity: number | null
          id: string
          last_bias: string | null
          last_learning_at: string | null
          learning_sessions: number | null
          overconfidence_penalty: number | null
          price_range_24h: number | null
          resistance_levels: number[] | null
          samples_collected: number | null
          support_levels: number[] | null
          symbol: string
          total_predictions: number | null
          trend_accuracy: number | null
          underconfidence_bonus: number | null
          updated_at: string
          user_id: string | null
          volatility: number | null
          whale_buy_threshold: number | null
          whale_sell_threshold: number | null
        }
        Insert: {
          avg_price_24h?: number | null
          avg_velocity?: number | null
          bias_changes?: number | null
          confidence_adjustment?: number | null
          correct_predictions?: number | null
          created_at?: string
          exchange_flow_sensitivity?: number | null
          id?: string
          last_bias?: string | null
          last_learning_at?: string | null
          learning_sessions?: number | null
          overconfidence_penalty?: number | null
          price_range_24h?: number | null
          resistance_levels?: number[] | null
          samples_collected?: number | null
          support_levels?: number[] | null
          symbol: string
          total_predictions?: number | null
          trend_accuracy?: number | null
          underconfidence_bonus?: number | null
          updated_at?: string
          user_id?: string | null
          volatility?: number | null
          whale_buy_threshold?: number | null
          whale_sell_threshold?: number | null
        }
        Update: {
          avg_price_24h?: number | null
          avg_velocity?: number | null
          bias_changes?: number | null
          confidence_adjustment?: number | null
          correct_predictions?: number | null
          created_at?: string
          exchange_flow_sensitivity?: number | null
          id?: string
          last_bias?: string | null
          last_learning_at?: string | null
          learning_sessions?: number | null
          overconfidence_penalty?: number | null
          price_range_24h?: number | null
          resistance_levels?: number[] | null
          samples_collected?: number | null
          support_levels?: number[] | null
          symbol?: string
          total_predictions?: number | null
          trend_accuracy?: number | null
          underconfidence_bonus?: number | null
          updated_at?: string
          user_id?: string | null
          volatility?: number | null
          whale_buy_threshold?: number | null
          whale_sell_threshold?: number | null
        }
        Relationships: []
      }
      alert_digest_queue: {
        Row: {
          alert_type: string
          body: string
          digest_sent_at: string | null
          id: string
          included_in_digest: boolean
          symbol: string
          title: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          body: string
          digest_sent_at?: string | null
          id?: string
          included_in_digest?: boolean
          symbol: string
          title: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          body?: string
          digest_sent_at?: string | null
          id?: string
          included_in_digest?: boolean
          symbol?: string
          title?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_history: {
        Row: {
          analysis_text: string
          bias: string | null
          change_24h: number
          confidence: number | null
          created_at: string
          feedback_at: string | null
          id: string
          price: number
          symbol: string
          user_id: string | null
          was_correct: boolean | null
        }
        Insert: {
          analysis_text: string
          bias?: string | null
          change_24h: number
          confidence?: number | null
          created_at?: string
          feedback_at?: string | null
          id?: string
          price: number
          symbol: string
          user_id?: string | null
          was_correct?: boolean | null
        }
        Update: {
          analysis_text?: string
          bias?: string | null
          change_24h?: number
          confidence?: number | null
          created_at?: string
          feedback_at?: string | null
          id?: string
          price?: number
          symbol?: string
          user_id?: string | null
          was_correct?: boolean | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          current_price_at_creation: number
          id: string
          is_triggered: boolean
          name: string
          symbol: string
          target_price: number
          triggered_at: string | null
          user_id: string | null
          user_wallet_id: string | null
        }
        Insert: {
          condition: string
          created_at?: string
          current_price_at_creation: number
          id?: string
          is_triggered?: boolean
          name: string
          symbol: string
          target_price: number
          triggered_at?: string | null
          user_id?: string | null
          user_wallet_id?: string | null
        }
        Update: {
          condition?: string
          created_at?: string
          current_price_at_creation?: number
          id?: string
          is_triggered?: boolean
          name?: string
          symbol?: string
          target_price?: number
          triggered_at?: string | null
          user_id?: string | null
          user_wallet_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_2fa: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          created_at: string
          digest_frequency: string
          digest_time: number
          email: string
          id: string
          include_market_summary: boolean
          include_price_alerts: boolean
          include_sentiment: boolean
          include_whale_activity: boolean
          last_digest_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string
          digest_time?: number
          email: string
          id?: string
          include_market_summary?: boolean
          include_price_alerts?: boolean
          include_sentiment?: boolean
          include_whale_activity?: boolean
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string
          digest_time?: number
          email?: string
          id?: string
          include_market_summary?: boolean
          include_price_alerts?: boolean
          include_sentiment?: boolean
          include_whale_activity?: boolean
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_current: boolean
          last_active_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ai_learning_stats: {
        Row: {
          accuracy_percentage: number | null
          avg_confidence_when_correct: number | null
          avg_confidence_when_incorrect: number | null
          correct_predictions: number | null
          incorrect_predictions: number | null
          symbol: string | null
          total_feedback: number | null
        }
        Relationships: []
      }
      push_subscriptions_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_subscribed: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_subscribed?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_subscribed?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_2fa_safe: {
        Row: {
          backup_codes_remaining: number | null
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          backup_codes_remaining?: never
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          backup_codes_remaining?: never
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions_safe: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string | null
          ip_address_masked: string | null
          is_current: boolean | null
          last_active_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string | null
          ip_address_masked?: never
          is_current?: boolean | null
          last_active_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string | null
          ip_address_masked?: never
          is_current?: boolean | null
          last_active_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_email: string
          p_ip_address?: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      contribute_to_global_learning: {
        Args: {
          p_bias: string
          p_symbol: string
          p_trend_accuracy: number
          p_volatility: number
          p_was_correct: boolean
        }
        Returns: undefined
      }
      get_my_login_attempts: {
        Args: { p_limit?: number }
        Returns: {
          attempted_at: string
          ip_masked: string
          success: boolean
        }[]
      }
      is_authenticated: { Args: never; Returns: boolean }
      record_login_attempt: {
        Args: { p_email: string; p_ip_address?: string; p_success: boolean }
        Returns: undefined
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
