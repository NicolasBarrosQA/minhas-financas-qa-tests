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
      accounts: {
        Row: {
          balance: number
          color: string | null
          created_at: string
          id: string
          initial_balance: number
          institution: string | null
          is_archived: boolean
          is_auto: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          institution?: string | null
          is_archived?: boolean
          is_auto?: boolean
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          institution?: string | null
          is_archived?: boolean
          is_auto?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          period: Database["public"]["Enums"]["budget_period"]
          progress: number
          remaining: number
          spent: number
          start_date: string
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          period?: Database["public"]["Enums"]["budget_period"]
          progress?: number
          remaining?: number
          spent?: number
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period?: Database["public"]["Enums"]["budget_period"]
          progress?: number
          remaining?: number
          spent?: number
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          account_id: string | null
          available_limit: number | null
          brand: string | null
          closing_day: number
          color: string | null
          created_at: string
          credit_limit: number
          current_spend: number
          due_day: number
          id: string
          is_archived: boolean
          last_four_digits: string | null
          name: string
          type: Database["public"]["Enums"]["card_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          available_limit?: number | null
          brand?: string | null
          closing_day: number
          color?: string | null
          created_at?: string
          credit_limit: number
          current_spend?: number
          due_day: number
          id?: string
          is_archived?: boolean
          last_four_digits?: string | null
          name: string
          type?: Database["public"]["Enums"]["card_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          available_limit?: number | null
          brand?: string | null
          closing_day?: number
          color?: string | null
          created_at?: string
          credit_limit?: number
          current_spend?: number
          due_day?: number
          id?: string
          is_archived?: boolean
          last_four_digits?: string | null
          name?: string
          type?: Database["public"]["Enums"]["card_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_movements: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          goal_id: string
          id: string
          type: Database["public"]["Enums"]["goal_movement_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          type: Database["public"]["Enums"]["goal_movement_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          type?: Database["public"]["Enums"]["goal_movement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_movements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          current_amount: number
          deadline: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          progress: number
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          card_id: string
          closing_balance: number
          created_at: string
          due_date: string
          id: string
          minimum_payment: number
          month: number
          opening_date: string
          paid_amount: number
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          card_id: string
          closing_balance?: number
          created_at?: string
          due_date: string
          id?: string
          minimum_payment?: number
          month: number
          opening_date: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          card_id?: string
          closing_balance?: number
          created_at?: string
          due_date?: string
          id?: string
          minimum_payment?: number
          month?: number
          opening_date?: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurrences: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          is_active: boolean
          last_run: string | null
          name: string
          next_run: string
          type: Database["public"]["Enums"]["recurrence_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          last_run?: string | null
          name: string
          next_run: string
          type: Database["public"]["Enums"]["recurrence_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          last_run?: string | null
          name?: string
          next_run?: string
          type?: Database["public"]["Enums"]["recurrence_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          channel: string
          created_at: string
          id: string
          message: string
          metadata: Json
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          created_at: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          installment_number: number | null
          installment_series_id: string | null
          invoice_id: string | null
          is_pending: boolean
          is_recurring: boolean
          note: string | null
          origin: Database["public"]["Enums"]["transaction_origin"]
          recurrence_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          total_installments: number | null
          transfer_to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          installment_number?: number | null
          installment_series_id?: string | null
          invoice_id?: string | null
          is_pending?: boolean
          is_recurring?: boolean
          note?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"]
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_installments?: number | null
          transfer_to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          installment_number?: number | null
          installment_series_id?: string | null
          invoice_id?: string | null
          is_pending?: boolean
          is_recurring?: boolean
          note?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"]
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_installments?: number | null
          transfer_to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avatar_accessory: string
          avatar_background: string
          avatar_base_color: string
          created_at: string
          notification_budget_alert: boolean
          notification_daily_reminder: boolean
          notification_goal_progress: boolean
          notification_invoice_due: boolean
          notification_promotions: boolean
          security_biometric: boolean
          security_pin_enabled: boolean
          security_recovery_key_enabled: boolean
          security_two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_accessory?: string
          avatar_background?: string
          avatar_base_color?: string
          created_at?: string
          notification_budget_alert?: boolean
          notification_daily_reminder?: boolean
          notification_goal_progress?: boolean
          notification_invoice_due?: boolean
          notification_promotions?: boolean
          security_biometric?: boolean
          security_pin_enabled?: boolean
          security_recovery_key_enabled?: boolean
          security_two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_accessory?: string
          avatar_background?: string
          avatar_base_color?: string
          created_at?: string
          notification_budget_alert?: boolean
          notification_daily_reminder?: boolean
          notification_goal_progress?: boolean
          notification_invoice_due?: boolean
          notification_promotions?: boolean
          security_biometric?: boolean
          security_pin_enabled?: boolean
          security_recovery_key_enabled?: boolean
          security_two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pay_invoice: {
        Args: {
          p_account_id: string
          p_amount: number
          p_invoice_id: string
          p_payment_date?: string | null
        }
        Returns: {
          card_id: string
          closing_balance: number
          created_at: string
          due_date: string
          id: string
          minimum_payment: number
          month: number
          opening_date: string
          paid_amount: number
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
          year: number
        }
      }
    }
    Enums: {
      account_type:
        | "CORRENTE"
        | "POUPANCA"
        | "CARTEIRA"
        | "INVESTIMENTO"
        | "CREDITO"
        | "OUTROS"
      budget_period: "SEMANAL" | "MENSAL" | "ANUAL" | "CUSTOM"
      budget_status: "ON_TRACK" | "WARNING" | "OVER"
      card_type: "CREDITO" | "DEBITO" | "CREDITO_E_DEBITO"
      category_type: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
      goal_movement_type: "APORTE" | "RETIRADA"
      goal_status: "ANDAMENTO" | "CONCLUIDA" | "CANCELADA" | "PAUSADA"
      invoice_status: "ABERTA" | "PARCIALMENTE_PAGA" | "PAGA" | "ATRASADA"
      recurrence_frequency:
        | "DIARIA"
        | "SEMANAL"
        | "QUINZENAL"
        | "MENSAL"
        | "BIMESTRAL"
        | "TRIMESTRAL"
        | "SEMESTRAL"
        | "ANUAL"
      recurrence_type: "RECEITA" | "DESPESA"
      transaction_origin:
        | "MANUAL"
        | "RECORRENTE"
        | "TRANSFERENCIA"
        | "IMPORTADA"
      transaction_status: "PENDENTE" | "EFETIVADA" | "CANCELADA"
      transaction_type: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
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
      account_type: [
        "CORRENTE",
        "POUPANCA",
        "CARTEIRA",
        "INVESTIMENTO",
        "CREDITO",
        "OUTROS",
      ],
      budget_period: ["SEMANAL", "MENSAL", "ANUAL", "CUSTOM"],
      budget_status: ["ON_TRACK", "WARNING", "OVER"],
      card_type: ["CREDITO", "DEBITO", "CREDITO_E_DEBITO"],
      category_type: ["RECEITA", "DESPESA", "TRANSFERENCIA"],
      goal_movement_type: ["APORTE", "RETIRADA"],
      goal_status: ["ANDAMENTO", "CONCLUIDA", "CANCELADA", "PAUSADA"],
      invoice_status: ["ABERTA", "PARCIALMENTE_PAGA", "PAGA", "ATRASADA"],
      recurrence_frequency: [
        "DIARIA",
        "SEMANAL",
        "QUINZENAL",
        "MENSAL",
        "BIMESTRAL",
        "TRIMESTRAL",
        "SEMESTRAL",
        "ANUAL",
      ],
      recurrence_type: ["RECEITA", "DESPESA"],
      transaction_origin: [
        "MANUAL",
        "RECORRENTE",
        "TRANSFERENCIA",
        "IMPORTADA",
      ],
      transaction_status: ["PENDENTE", "EFETIVADA", "CANCELADA"],
      transaction_type: ["RECEITA", "DESPESA", "TRANSFERENCIA"],
    },
  },
} as const
