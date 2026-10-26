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
      alert_config: {
        Row: {
          em_risco_dias: number
          inativo_dias: number
          lead_sem_resposta_dias: number
          sem_recompra_dias: number
          workspace_id: string
        }
        Insert: {
          em_risco_dias?: number
          inativo_dias?: number
          lead_sem_resposta_dias?: number
          sem_recompra_dias?: number
          workspace_id: string
        }
        Update: {
          em_risco_dias?: number
          inativo_dias?: number
          lead_sem_resposta_dias?: number
          sem_recompra_dias?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dismissals: {
        Row: {
          card_id: string
          created_at: string
          id: string
          referencia: string
          tipo: string
          workspace_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          referencia: string
          tipo: string
          workspace_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          referencia?: string
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_dismissals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pipeline_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_dismissals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          ativa: boolean
          created_at: string
          fluxo: Json
          gatilho_tipo: string
          id: string
          nome: string
          repeticao: Json
          workspace_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          fluxo: Json
          gatilho_tipo?: string
          id?: string
          nome: string
          repeticao?: Json
          workspace_id: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          fluxo?: Json
          gatilho_tipo?: string
          id?: string
          nome?: string
          repeticao?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_queue: {
        Row: {
          chave: string
          created_at: string
          evento: Json
          id: string
          iniciado_em: string | null
          motivo: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          chave: string
          created_at?: string
          evento: Json
          id?: string
          iniciado_em?: string | null
          motivo?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          chave?: string
          created_at?: string
          evento?: Json
          id?: string
          iniciado_em?: string | null
          motivo?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          atualizada_em: string | null
          caminho: Json
          contact_id: string | null
          created_at: string
          evento: Json
          gatilho: Json | null
          id: string
          motivo: string | null
          regra_id: string
          regra_nome: string
          regra_origem: string
          resultado: string
          retomada_em: string | null
          retomar_em: string | null
          workspace_id: string
        }
        Insert: {
          atualizada_em?: string | null
          caminho?: Json
          contact_id?: string | null
          created_at?: string
          evento: Json
          gatilho?: Json | null
          id?: string
          motivo?: string | null
          regra_id: string
          regra_nome: string
          regra_origem: string
          resultado: string
          retomada_em?: string | null
          retomar_em?: string | null
          workspace_id: string
        }
        Update: {
          atualizada_em?: string | null
          caminho?: Json
          contact_id?: string | null
          created_at?: string
          evento?: Json
          gatilho?: Json | null
          id?: string
          motivo?: string | null
          regra_id?: string
          regra_nome?: string
          regra_origem?: string
          resultado?: string
          retomada_em?: string | null
          retomar_em?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          dias: number[]
          fim: string
          inicio: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          dias: number[]
          fim: string
          inicio: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          dias?: number[]
          fim?: string
          inicio?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          atualizado_em: string | null
          campaign_id: string
          contact_id: string | null
          created_at: string
          id: string
          motivo: string | null
          nome_snapshot: string | null
          status: string
          telefone_snapshot: string
          wamid: string | null
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string | null
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          nome_snapshot?: string | null
          status?: string
          telefone_snapshot: string
          wamid?: string | null
          workspace_id: string
        }
        Update: {
          atualizado_em?: string | null
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          nome_snapshot?: string | null
          status?: string
          telefone_snapshot?: string
          wamid?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agendada_para: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          conteudo: string | null
          created_at: string
          criado_por: string | null
          enviada_em: string | null
          id: string
          interrompida_em: string | null
          interrompida_motivo: string | null
          nome: string
          segmento: Json
          status: string
          tipo_mensagem: string
          whatsapp_connection_id: string | null
          workspace_id: string
        }
        Insert: {
          agendada_para?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string
          criado_por?: string | null
          enviada_em?: string | null
          id?: string
          interrompida_em?: string | null
          interrompida_motivo?: string | null
          nome: string
          segmento?: Json
          status?: string
          tipo_mensagem?: string
          whatsapp_connection_id?: string | null
          workspace_id: string
        }
        Update: {
          agendada_para?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          created_at?: string
          criado_por?: string | null
          enviada_em?: string | null
          id?: string
          interrompida_em?: string | null
          interrompida_motivo?: string | null
          nome?: string
          segmento?: Json
          status?: string
          tipo_mensagem?: string
          whatsapp_connection_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campo_opcoes: {
        Row: {
          campo_id: string
          created_at: string
          id: string
          nome: string
          ordem: number
          workspace_id: string
        }
        Insert: {
          campo_id: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          workspace_id: string
        }
        Update: {
          campo_id?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campo_opcoes_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "campos_personalizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campo_opcoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_personalizados: {
        Row: {
          created_at: string
          id: string
          mostrar_na_lista: boolean
          nome: string
          ordem: number
          tipo: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mostrar_na_lista?: boolean
          nome: string
          ordem?: number
          tipo: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mostrar_na_lista?: boolean
          nome?: string
          ordem?: number
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_personalizados_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_historico: {
        Row: {
          alterado_por: string | null
          contact_id: string
          created_at: string
          de_atendente_id: string | null
          id: string
          motivo: string
          para_atendente_id: string | null
          workspace_id: string
        }
        Insert: {
          alterado_por?: string | null
          contact_id: string
          created_at?: string
          de_atendente_id?: string | null
          id?: string
          motivo: string
          para_atendente_id?: string | null
          workspace_id: string
        }
        Update: {
          alterado_por?: string | null
          contact_id?: string
          created_at?: string
          de_atendente_id?: string | null
          id?: string
          motivo?: string
          para_atendente_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteira_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_historico_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_historico_de_atendente_id_fkey"
            columns: ["de_atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_historico_para_atendente_id_fkey"
            columns: ["para_atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_historico_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_order_events: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_order_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "catalog_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_order_items: {
        Row: {
          combination: string
          estoque_baixado: number
          id: string
          order_id: string
          photo_path: string | null
          position: number
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          combination?: string
          estoque_baixado?: number
          id?: string
          order_id: string
          photo_path?: string | null
          position?: number
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          combination?: string
          estoque_baixado?: number
          id?: string
          order_id?: string
          photo_path?: string | null
          position?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "catalog_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_orders: {
        Row: {
          contact_id: string | null
          created_at: string
          customer_name: string
          customer_whatsapp: string
          discount: number
          discount_percent: number
          id: string
          number: number
          pieces: number
          status: string
          total: number
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          discount?: number
          discount_percent?: number
          id?: string
          number: number
          pieces: number
          status?: string
          total: number
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          discount?: number
          discount_percent?: number
          id?: string
          number?: number
          pieces?: number
          status?: string
          total?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string
          featured: boolean
          id: string
          min_quantity: number | null
          name: string
          pack_price: number | null
          pack_quantities: Json | null
          photos: Json
          position: number
          price: number
          price_tiers: Json
          sku: string
          updated_at: string
          variant_types: Json
          visible: boolean
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          min_quantity?: number | null
          name: string
          pack_price?: number | null
          pack_quantities?: Json | null
          photos?: Json
          position?: number
          price: number
          price_tiers?: Json
          sku?: string
          updated_at?: string
          variant_types?: Json
          visible?: boolean
          workspace_id: string
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          min_quantity?: number | null
          name?: string
          pack_price?: number | null
          pack_quantities?: Json | null
          photos?: Json
          position?: number
          price?: number
          price_tiers?: Json
          sku?: string
          updated_at?: string
          variant_types?: Json
          visible?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_settings: {
        Row: {
          background_color: string
          banner_path: string | null
          closing_message: string
          font_id: string
          layout: string
          logo_path: string | null
          min_type: string
          min_value: number | null
          order_discounts: Json
          orders_whatsapp: string | null
          primary_color: string
          published: boolean
          slug: string | null
          store_name: string | null
          updated_at: string
          welcome_text: string
          whatsapp_connection_id: string | null
          workspace_id: string
        }
        Insert: {
          background_color?: string
          banner_path?: string | null
          closing_message?: string
          font_id?: string
          layout?: string
          logo_path?: string | null
          min_type?: string
          min_value?: number | null
          order_discounts?: Json
          orders_whatsapp?: string | null
          primary_color?: string
          published?: boolean
          slug?: string | null
          store_name?: string | null
          updated_at?: string
          welcome_text?: string
          whatsapp_connection_id?: string | null
          workspace_id: string
        }
        Update: {
          background_color?: string
          banner_path?: string | null
          closing_message?: string
          font_id?: string
          layout?: string
          logo_path?: string | null
          min_type?: string
          min_value?: number | null
          order_discounts?: Json
          orders_whatsapp?: string | null
          primary_color?: string
          published?: boolean
          slug?: string | null
          store_name?: string | null
          updated_at?: string
          welcome_text?: string
          whatsapp_connection_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_settings_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_stock: {
        Row: {
          combination: string
          product_id: string
          quantity: number
          workspace_id: string
        }
        Insert: {
          combination: string
          product_id: string
          quantity?: number
          workspace_id: string
        }
        Update: {
          combination?: string
          product_id?: string
          quantity?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_stock_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencias_perfil_rfv: {
        Row: {
          dia: string
          feita_em: string
          workspace_id: string
        }
        Insert: {
          dia: string
          feita_em?: string
          workspace_id: string
        }
        Update: {
          dia?: string
          feita_em?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferencias_perfil_rfv_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_purchases: {
        Row: {
          atendente_id: string | null
          catalog_order_id: string | null
          codigo_externo: string | null
          contact_id: string
          created_at: string
          data: string
          desconto: number | null
          forma_pagamento: string | null
          id: string
          origem: string
          pecas: number | null
          valor: number
          workspace_id: string
        }
        Insert: {
          atendente_id?: string | null
          catalog_order_id?: string | null
          codigo_externo?: string | null
          contact_id: string
          created_at?: string
          data: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          origem?: string
          pecas?: number | null
          valor: number
          workspace_id: string
        }
        Update: {
          atendente_id?: string | null
          catalog_order_id?: string | null
          codigo_externo?: string | null
          contact_id?: string
          created_at?: string
          data?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          origem?: string
          pecas?: number | null
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_purchases_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_purchases_catalog_order_id_fkey"
            columns: ["catalog_order_id"]
            isOneToOne: false
            referencedRelation: "catalog_orders"
            referencedColumns: ["id"]
          },
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
          excluido_em: string | null
          excluido_por: string | null
          icp: string | null
          id: string
          name: string | null
          observacoes: string | null
          phone_number: string
          photo_checked_at: string | null
          photo_path: string | null
          tipo: string | null
          uf: string | null
          workspace_id: string
        }
        Insert: {
          atendente_id?: string | null
          cidade?: string | null
          classificacao?: string
          created_at?: string
          excluido_em?: string | null
          excluido_por?: string | null
          icp?: string | null
          id?: string
          name?: string | null
          observacoes?: string | null
          phone_number: string
          photo_checked_at?: string | null
          photo_path?: string | null
          tipo?: string | null
          uf?: string | null
          workspace_id: string
        }
        Update: {
          atendente_id?: string | null
          cidade?: string | null
          classificacao?: string
          created_at?: string
          excluido_em?: string | null
          excluido_por?: string | null
          icp?: string | null
          id?: string
          name?: string | null
          observacoes?: string | null
          phone_number?: string
          photo_checked_at?: string | null
          photo_path?: string | null
          tipo?: string | null
          uf?: string | null
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
            foreignKeyName: "contacts_excluido_por_fkey"
            columns: ["excluido_por"]
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
      contato_campos: {
        Row: {
          atualizado_em: string
          campo_id: string
          contact_id: string
          valor_booleano: boolean | null
          valor_data: string | null
          valor_numero: number | null
          valor_opcoes: string[] | null
          valor_texto: string | null
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          campo_id: string
          contact_id: string
          valor_booleano?: boolean | null
          valor_data?: string | null
          valor_numero?: number | null
          valor_opcoes?: string[] | null
          valor_texto?: string | null
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          campo_id?: string
          contact_id?: string
          valor_booleano?: boolean | null
          valor_data?: string | null
          valor_numero?: number | null
          valor_opcoes?: string[] | null
          valor_texto?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contato_campos_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "campos_personalizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_campos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_campos_workspace_id_fkey"
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
          whatsapp_connection_id: string | null
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
          whatsapp_connection_id?: string | null
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
          whatsapp_connection_id?: string | null
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
            foreignKeyName: "conversations_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
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
      disparos_perfil_rfv: {
        Row: {
          created_at: string
          flow_id: string
          mudanca_id: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          mudanca_id: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          mudanca_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disparos_perfil_rfv_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_perfil_rfv_mudanca_id_fkey"
            columns: ["mudanca_id"]
            isOneToOne: false
            referencedRelation: "mudancas_perfil_rfv"
            referencedColumns: ["id"]
          },
        ]
      }
      filtros_salvos: {
        Row: {
          created_at: string
          criado_por: string | null
          filtro: Json
          id: string
          nome: string
          nome_chave: string
          posicao: number
          tela: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          filtro: Json
          id?: string
          nome: string
          nome_chave: string
          posicao?: number
          tela?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          filtro?: Json
          id?: string
          nome?: string
          nome_chave?: string
          posicao?: number
          tela?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filtros_salvos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filtros_salvos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_etapas: {
        Row: {
          cor: string | null
          created_at: string
          funil_id: string
          id: string
          nome: string
          ordem: number
          parado_dias: number | null
          workspace_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          funil_id: string
          id?: string
          nome: string
          ordem?: number
          parado_dias?: number | null
          workspace_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          parado_dias?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funil_etapas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_etapas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          created_at: string
          id: string
          nome: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_events: {
        Row: {
          event_at: string | null
          event_id: string
          instance_id: string
          processed_at: string | null
          received_at: string
          type: string
          workspace_id: string
        }
        Insert: {
          event_at?: string | null
          event_id: string
          instance_id: string
          processed_at?: string | null
          received_at?: string
          type: string
          workspace_id: string
        }
        Update: {
          event_at?: string | null
          event_id?: string
          instance_id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_terms_acceptance: {
        Row: {
          accepted_at: string
          accepted_by: string
          id: string
          terms_version: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          id?: string
          terms_version: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          id?: string
          terms_version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_terms_acceptance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          deleted_at: string | null
          direction: string
          edited_at: string | null
          id: string
          media_caption: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_thumbnail_url: string | null
          reaction_emoji: string | null
          reply_preview_text: string | null
          reply_to_id: string | null
          sent_from_phone: boolean
          status: string | null
          status_error: string | null
          type: string
          wamid: string | null
          workspace_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          edited_at?: string | null
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_thumbnail_url?: string | null
          reaction_emoji?: string | null
          reply_preview_text?: string | null
          reply_to_id?: string | null
          sent_from_phone?: boolean
          status?: string | null
          status_error?: string | null
          type?: string
          wamid?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          edited_at?: string | null
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_thumbnail_url?: string | null
          reaction_emoji?: string | null
          reply_preview_text?: string | null
          reply_to_id?: string | null
          sent_from_phone?: boolean
          status?: string | null
          status_error?: string | null
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
      mudancas_perfil_rfv: {
        Row: {
          contact_id: string
          created_at: string
          de: string
          dia: string
          id: string
          para: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          de: string
          dia: string
          id?: string
          para: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          de?: string
          dia?: string
          id?: string
          para?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mudancas_perfil_rfv_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_perfil_rfv_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_alerts: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          motivo: string | null
          queued_count: number | null
          resolved_at: string | null
          tipo: string
          workspace_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          queued_count?: number | null
          resolved_at?: string | null
          tipo: string
          workspace_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          queued_count?: number | null
          resolved_at?: string | null
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_rfv_guardados: {
        Row: {
          contact_id: string
          perfil: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          perfil: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          perfil?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_rfv_guardados_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_rfv_guardados_workspace_id_fkey"
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
          tema: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role: string
          status?: string
          tema?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
          status?: string
          tema?: string
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
      reminders: {
        Row: {
          atendente_id: string
          automacao_nome: string | null
          contact_id: string
          created_at: string
          done_at: string | null
          due_at: string
          id: string
          instrucao: string
          origem: string
          sequence_run_id: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          atendente_id: string
          automacao_nome?: string | null
          contact_id: string
          created_at?: string
          done_at?: string | null
          due_at: string
          id?: string
          instrucao: string
          origem: string
          sequence_run_id?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          atendente_id?: string
          automacao_nome?: string | null
          contact_id?: string
          created_at?: string
          done_at?: string | null
          due_at?: string
          id?: string
          instrucao?: string
          origem?: string
          sequence_run_id?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_sequence_run_id_fkey"
            columns: ["sequence_run_id"]
            isOneToOne: false
            referencedRelation: "sequence_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_runs: {
        Row: {
          atendente_id: string | null
          contact_id: string
          created_at: string
          etapa_atual: number
          finished_at: string | null
          id: string
          proxima_execucao: string | null
          sequence_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          atendente_id?: string | null
          contact_id: string
          created_at?: string
          etapa_atual?: number
          finished_at?: string | null
          id?: string
          proxima_execucao?: string | null
          sequence_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          atendente_id?: string | null
          contact_id?: string
          created_at?: string
          etapa_atual?: number
          finished_at?: string | null
          id?: string
          proxima_execucao?: string | null
          sequence_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_runs_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_runs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          conteudo: string | null
          created_at: string
          id: string
          instrucao: string | null
          ordem: number
          prazo_dias: number
          sequence_id: string
          tipo: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          id?: string
          instrucao?: string | null
          ordem: number
          prazo_dias?: number
          sequence_id: string
          tipo: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          id?: string
          instrucao?: string | null
          ordem?: number
          prazo_dias?: number
          sequence_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          ativa: boolean
          created_at: string
          gatilho: string
          id: string
          nome: string
          predefinida: boolean
          workspace_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          gatilho?: string
          id?: string
          nome: string
          predefinida?: boolean
          workspace_id: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          gatilho?: string
          id?: string
          nome?: string
          predefinida?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_workspace_id_fkey"
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
      tentativas_de_acesso: {
        Row: {
          chave: string
          criado_em: string
          id: number
          tipo: string
        }
        Insert: {
          chave: string
          criado_em?: string
          id?: never
          tipo: string
        }
        Update: {
          chave?: string
          criado_em?: string
          id?: never
          tipo?: string
        }
        Relationships: []
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
          access_token: string | null
          canal: string
          created_at: string
          disconnected_at: string | null
          display_name: string | null
          id: string
          instance_id: string | null
          instance_token: string | null
          phone_number: string | null
          phone_number_id: string | null
          state_reason: string | null
          status: string
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          canal?: string
          created_at?: string
          disconnected_at?: string | null
          display_name?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          state_reason?: string | null
          status?: string
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          canal?: string
          created_at?: string
          disconnected_at?: string | null
          display_name?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          state_reason?: string | null
          status?: string
          waba_id?: string | null
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
      apagar_contato_de_vez: {
        Args: { p_contact_id: string }
        Returns: boolean
      }
      apagar_etapa: {
        Args: { p_destino: string; p_etapa: string }
        Returns: undefined
      }
      apagar_funil: { Args: { p_funil: string }; Returns: number }
      atribuir_conversa_ao_time: {
        Args: {
          p_conversation_id: string
          p_team_id: string
          p_workspace_id: string
        }
        Returns: {
          atendente_id: string
          manteve: boolean
        }[]
      }
      cadastrar_empresa: {
        Args: {
          p_nome_empresa: string
          p_nome_responsavel: string
          p_user_id: string
        }
        Returns: string
      }
      condicao_de_contato_sql: { Args: { p_cond: Json }; Returns: string }
      conferir_perfis_rfv: {
        Args: { p_dia: string; p_workspace?: string }
        Returns: number
      }
      contato_na_lixeira: { Args: { p_contact_id: string }; Returns: boolean }
      conversa_na_lixeira: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      conversas_esperando_resposta: {
        Args: { p_limite?: number }
        Returns: {
          contato_id: string
          contato_nome: string
          conversa_id: string
          desde: string
          funil: string
          telefone: string
          tipo: string
          trecho: string
        }[]
      }
      criar_funil: { Args: { p_etapas: Json; p_nome: string }; Returns: string }
      filtrar_contatos: {
        Args: {
          p_busca?: string
          p_filtro?: Json
          p_limite?: number
          p_offset?: number
          p_ordem?: string
          p_rapidos?: Json
        }
        Returns: {
          atendente_nome: string
          cidade: string
          classificacao: string
          created_at: string
          id: string
          name: string
          phone_number: string
          tipo: string
          total: number
          uf: string
        }[]
      }
      filtrar_pedidos: {
        Args: { p_filtros?: Json; p_limite?: number; p_offset?: number }
        Returns: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          discount: number
          discount_percent: number
          id: string
          number: number
          pieces: number
          status: string
          total: number
          total_resultado: number
        }[]
      }
      gerar_compras_de_pedidos_fechados: { Args: never; Returns: number }
      get_auth_user_workspace_id: { Args: never; Returns: string }
      importar_produto_catalogo: {
        Args: { p_dados: Json; p_estoque: Json; p_produto: string }
        Returns: string
      }
      mudar_situacao_pedido_catalogo: {
        Args: { p_para: string; p_pedido: string }
        Returns: undefined
      }
      perfis_rfv_da_empresa: {
        Args: never
        Returns: {
          contact_id: string
          perfil: string
        }[]
      }
      perfis_rfv_do_workspace: {
        Args: { p_workspace: string }
        Returns: {
          contact_id: string
          perfil: string
        }[]
      }
      pode_ver_contato: { Args: { p_contact_id: string }; Returns: boolean }
      pode_ver_conversa: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      produtos_dos_pedidos: {
        Args: never
        Returns: {
          apagado: boolean
          id: string
          nome: string
        }[]
      }
      recalcular_classificacao_do_contato: {
        Args: { p_contact: string }
        Returns: undefined
      }
      registrar_pedido_catalogo: {
        Args: {
          p_contato: string
          p_desconto_percent?: number
          p_itens: Json
          p_nome: string
          p_whatsapp: string
          p_workspace: string
        }
        Returns: {
          numero: number
          pedido_id: string
        }[]
      }
      reivindicar_esperas_vencidas: {
        Args: { p_limite: number; p_workspace_id?: string }
        Returns: {
          atualizada_em: string | null
          caminho: Json
          contact_id: string | null
          created_at: string
          evento: Json
          gatilho: Json | null
          id: string
          motivo: string | null
          regra_id: string
          regra_nome: string
          regra_origem: string
          resultado: string
          retomada_em: string | null
          retomar_em: string | null
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "automation_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reivindicar_evento_de_automacao: {
        Args: { p_chave: string }
        Returns: {
          chave: string
          created_at: string
          evento: Json
          id: string
          iniciado_em: string | null
          motivo: string | null
          status: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "automation_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      salvar_estoque_produto:
        | {
            Args: { p_estoque: Json; p_produto: string; p_tipos: Json }
            Returns: undefined
          }
        | {
            Args: {
              p_combinacoes: Json
              p_estoque: Json
              p_produto: string
              p_tipos: Json
            }
            Returns: undefined
          }
      salvar_sequencia: {
        Args: {
          p_etapas: Json
          p_gatilho: string
          p_id: string
          p_nome: string
        }
        Returns: string
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
    Enums: {},
  },
} as const
