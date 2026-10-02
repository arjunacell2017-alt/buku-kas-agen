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
      account_settings: {
        Row: {
          actual_bank_balance: number
          actual_cash_balance: number
          business_name: string
          created_at: string
          id: string
          opening_bank_balance: number
          opening_cash_balance: number
          start_date: string
          user_id: string
        }
        Insert: {
          actual_bank_balance?: number
          actual_cash_balance?: number
          business_name?: string
          created_at?: string
          id?: string
          opening_bank_balance?: number
          opening_cash_balance?: number
          start_date?: string
          user_id: string
        }
        Update: {
          actual_bank_balance?: number
          actual_cash_balance?: number
          business_name?: string
          created_at?: string
          id?: string
          opening_bank_balance?: number
          opening_cash_balance?: number
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_activity: {
        Row: {
          action: string
          admin_id: string | null
          client_id: string | null
          client_label: string
          created_at: string
          detail: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          client_id?: string | null
          client_label?: string
          created_at?: string
          detail?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          client_id?: string | null
          client_label?: string
          created_at?: string
          detail?: string | null
          id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          account_name: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          transaction_date: string
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_date?: string
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_date?: string
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          active_from: string
          active_until: string
          agent_name: string
          agent_type: string
          created_at: string
          email: string
          owner_name: string
          phone: string
          suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active_from?: string
          active_until?: string
          agent_name?: string
          agent_type?: string
          created_at?: string
          email?: string
          owner_name?: string
          phone?: string
          suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active_from?: string
          active_until?: string
          agent_name?: string
          agent_type?: string
          created_at?: string
          email?: string
          owner_name?: string
          phone?: string
          suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          cost_method: string
          created_at: string
          description: string | null
          fee: number
          fee_method: string
          id: string
          payment_method: string
          transaction_cost: number
          transaction_date: string
          transaction_number: string | null
          transaction_time: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cost_method?: string
          created_at?: string
          description?: string | null
          fee?: number
          fee_method?: string
          id?: string
          payment_method?: string
          transaction_cost?: number
          transaction_date?: string
          transaction_number?: string | null
          transaction_time?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cost_method?: string
          created_at?: string
          description?: string | null
          fee?: number
          fee_method?: string
          id?: string
          payment_method?: string
          transaction_cost?: number
          transaction_date?: string
          transaction_number?: string | null
          transaction_time?: string
          transaction_type?: string
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
      ledger_view: {
        Row: {
          amount: number | null
          cost_method: string | null
          created_at: string | null
          description: string | null
          fee: number | null
          fee_method: string | null
          mutasi_kas: number | null
          mutasi_rekening: number | null
          pendapatan_fee: number | null
          saldo_kas: number | null
          saldo_rekening: number | null
          transaction_cost: number | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_number: string | null
          transaction_time: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "client"],
    },
  },
} as const
