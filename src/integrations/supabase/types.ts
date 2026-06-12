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
      automations: {
        Row: {
          acao_config: Json
          acao_tipo: string
          ativa: boolean
          created_at: string
          gatilho_config: Json
          gatilho_tipo: string
          id: string
          nome: string
          workspace_id: string
        }
        Insert: {
          acao_config?: Json
          acao_tipo: string
          ativa?: boolean
          created_at?: string
          gatilho_config?: Json
          gatilho_tipo: string
          id?: string
          nome: string
          workspace_id: string
        }
        Update: {
          acao_config?: Json
          acao_tipo?: string
          ativa?: boolean
          created_at?: string
          gatilho_config?: Json
          gatilho_tipo?: string
          id?: string
          nome?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_purchases: {
        Row: {
          contact_id: string
          created_at: string
          data: string
          id: string
          valor: number
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          data: string
          id?: string
          valor: number
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          data?: string
          id?: string
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_purchases_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_purchases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          atendente_id: string | null
          cidade: string | null
          classificacao: string
          created_at: string
          icp: string | null
          id: string
          name: string | null
          nicho: string | null
          observacoes: string | null
          phone_number: string
          tipo: string | null
          workspace_id: string
        }
        Insert: {
          atendente_id?: string | null
          cidade?: string | null
          classificacao?: string
          created_at?: string
          icp?: string | null
          id?: string
          name?: string | null
          nicho?: string | null
          observacoes?: string | null
          phone_number: string
          tipo?: string | null
          workspace_id: string
        }
        Update: {
          atendente_id?: string | null
          cidade?: string | null
          classificacao?: string
          created_at?: string
          icp?: string | null
          id?: string
          name?: string | null
          nicho?: string | null
          observacoes?: string | null
          phone_number?: string
          tipo?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          conversation_id: string
          label_id: string
        }
        Insert: {
          conversation_id: string
          label_id: string
        }
        Update: {
          conversation_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_labels_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          last_message_text: string
          status: string
          unread_count: number
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string
          status?: string
          unread_count?: number
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string
          status?: string
          unread_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          confirmation_code: string
          created_at: string
          facebook_user_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmation_code: string
          created_at?: string
          facebook_user_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmation_code?: string
          created_at?: string
          facebook_user_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          reply_preview_text: string | null
          reply_to_id: string | null
          status: string | null
          type: string
          wamid: string | null
          workspace_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          reply_preview_text?: string | null
          reply_to_id?: string | null
          status?: string | null
          type?: string
          wamid?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          reply_preview_text?: string | null
          reply_to_id?: string | null
          status?: string | null
          type?: string
          wamid?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_card_history: {
        Row: {
          alterado_por: string | null
          card_id: string
          created_at: string
          de_etapa: string | null
          id: string
          para_etapa: string
        }
        Insert: {
          alterado_por?: string | null
          card_id: string
          created_at?: string
          de_etapa?: string | null
          id?: string
          para_etapa: string
        }
        Update: {
          alterado_por?: string | null
          card_id?: string
          created_at?: string
          de_etapa?: string | null
          id?: string
          para_etapa?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_history_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pipeline_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_card_labels: {
        Row: {
          card_id: string
          label_id: string
        }
        Insert: {
          card_id: string
          label_id: string
        }
        Update: {
          card_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pipeline_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_card_notes: {
        Row: {
          autor_id: string
          card_id: string
          created_at: string
          id: string
          texto: string
          workspace_id: string
        }
        Insert: {
          autor_id: string
          card_id: string
          created_at?: string
          id?: string
          texto: string
          workspace_id: string
        }
        Update: {
          autor_id?: string
          card_id?: string
          created_at?: string
          id?: string
          texto?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_card_notes_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_card_notes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pipeline_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_card_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_cards: {
        Row: {
          atendente_id: string | null
          contact_id: string
          created_at: string
          etapa: string
          etapa_changed_at: string
          funil: string
          id: string
          workspace_id: string
        }
        Insert: {
          atendente_id?: string | null
          contact_id: string
          created_at?: string
          etapa: string
          etapa_changed_at?: string
          funil?: string
          id?: string
          workspace_id: string
        }
        Update: {
          atendente_id?: string | null
          contact_id?: string
          created_at?: string
          etapa?: string
          etapa_changed_at?: string
          funil?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_cards_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_cards_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_cards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          team_id: string
          user_id: string
        }
        Insert: {
          team_id: string
          user_id: string
        }
        Update: {
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          access_token: string
          created_at: string
          display_name: string
          id: string
          phone_number: string
          phone_number_id: string
          status: string
          waba_id: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name: string
          id?: string
          phone_number: string
          phone_number_id: string
          status?: string
          waba_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string
          id?: string
          phone_number?: string
          phone_number_id?: string
          status?: string
          waba_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_user_workspace_id: { Args: never; Returns: string }
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
