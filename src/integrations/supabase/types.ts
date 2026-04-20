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
      acoes_corretivas: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          rca_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          rca_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          rca_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_corretivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_corretivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "acoes_corretivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_corretivas_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "analise_causa_raiz"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_root_cause_analysis: {
        Row: {
          confidence_score: number | null
          created_at: string
          criticality: string | null
          empresa_id: string | null
          equipamento_id: string | null
          generated_at: string
          id: string
          main_hypothesis: string | null
          mtbf_days: number | null
          os_count: number | null
          possible_causes: Json | null
          preventive_actions: Json | null
          raw_response: Json | null
          requested_by: string | null
          summary: string | null
          tag: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          criticality?: string | null
          empresa_id?: string | null
          equipamento_id?: string | null
          generated_at?: string
          id?: string
          main_hypothesis?: string | null
          mtbf_days?: number | null
          os_count?: number | null
          possible_causes?: Json | null
          preventive_actions?: Json | null
          raw_response?: Json | null
          requested_by?: string | null
          summary?: string | null
          tag: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          criticality?: string | null
          empresa_id?: string | null
          equipamento_id?: string | null
          generated_at?: string
          id?: string
          main_hypothesis?: string | null
          mtbf_days?: number | null
          os_count?: number | null
          possible_causes?: Json | null
          preventive_actions?: Json | null
          raw_response?: Json | null
          requested_by?: string | null
          summary?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_root_cause_analysis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_root_cause_analysis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "ai_root_cause_analysis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_root_cause_analysis_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_causa_raiz: {
        Row: {
          arvore_falhas: Json | null
          causa_raiz_identificada: string | null
          created_at: string
          data_conclusao: string | null
          descricao: string | null
          descricao_problema: string | null
          diagrama_ishikawa: Json | null
          eficacia_verificada: boolean | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          metodo_analise: string | null
          numero_rca: string | null
          os_id: string | null
          porque_1: string | null
          porque_2: string | null
          porque_3: string | null
          porque_4: string | null
          porque_5: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          tag: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          arvore_falhas?: Json | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao?: string | null
          descricao_problema?: string | null
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          numero_rca?: string | null
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          tag?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          arvore_falhas?: Json | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao?: string | null
          descricao_problema?: string | null
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          numero_rca?: string | null
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          tag?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analise_causa_raiz_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_causa_raiz_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "analise_causa_raiz_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_causa_raiz_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_causa_raiz_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      analises_risco: {
        Row: {
          atividade: string
          classificacao: string
          created_at: string
          data_analise: string
          empresa_id: string
          grau_risco: number
          id: string
          local_setor: string | null
          medidas_controle: string | null
          observacoes: string | null
          perigo: string
          prazo_acao: string | null
          probabilidade: number
          responsavel: string
          responsavel_acao: string | null
          risco: string
          severidade: number
          status: string
          updated_at: string
        }
        Insert: {
          atividade: string
          classificacao?: string
          created_at?: string
          data_analise?: string
          empresa_id: string
          grau_risco?: number
          id?: string
          local_setor?: string | null
          medidas_controle?: string | null
          observacoes?: string | null
          perigo: string
          prazo_acao?: string | null
          probabilidade?: number
          responsavel: string
          responsavel_acao?: string | null
          risco: string
          severidade?: number
          status?: string
          updated_at?: string
        }
        Update: {
          atividade?: string
          classificacao?: string
          created_at?: string
          data_analise?: string
          empresa_id?: string
          grau_risco?: number
          id?: string
          local_setor?: string | null
          medidas_controle?: string | null
          observacoes?: string | null
          perigo?: string
          prazo_acao?: string | null
          probabilidade?: number
          responsavel?: string
          responsavel_acao?: string | null
          risco?: string
          severidade?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_risco_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_risco_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "analises_risco_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      anomalias_inspecao: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          inspecao_id: string | null
          severidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          inspecao_id?: string | null
          severidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          inspecao_id?: string | null
          severidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomalias_inspecao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalias_inspecao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "anomalias_inspecao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalias_inspecao_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          planta_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          planta_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          planta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "areas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string
          empresa_id: string
          fim_em: string | null
          id: string
          inicio_em: string
          limites: Json
          plano_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          limites?: Json
          plano_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          limites?: Json
          plano_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_lubrificacao: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string | null
          id: string
          ordem: number
          plano_id: string
          responsavel: string | null
          tempo_estimado_min: number | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          plano_id: string
          responsavel?: string | null
          tempo_estimado_min?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          plano_id?: string
          responsavel?: string | null
          tempo_estimado_min?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "atividades_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_lubrificacao_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_lubrificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_preventivas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          plano_id: string
          responsavel: string | null
          tempo_total_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number
          plano_id: string
          responsavel?: string | null
          tempo_total_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          plano_id?: string
          responsavel?: string | null
          tempo_total_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "atividades_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_preventivas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_preventivos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          metadata: Json
          record_id: string | null
          severity: string
          source: string
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          metadata?: Json
          record_id?: string | null
          severity?: string
          source?: string
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          metadata?: Json
          record_id?: string | null
          severity?: string
          source?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_session_transfer_tokens: {
        Row: {
          access_token: string
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          refresh_token: string
          target_host: string | null
        }
        Insert: {
          access_token: string
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          target_host?: string | null
        }
        Update: {
          access_token?: string
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          target_host?: string | null
        }
        Relationships: []
      }
      avaliacoes_fornecedores: {
        Row: {
          comentario: string | null
          contrato_id: string
          created_at: string
          empresa_id: string
          id: string
          nota: number | null
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          contrato_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nota?: number | null
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          contrato_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nota?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fornecedores_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          created_at: string
          empresa_id: string
          gateway_customer_id: string | null
          gateway_provider: string
          id: string
          metadata: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          gateway_customer_id?: string | null
          gateway_provider?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          gateway_customer_id?: string | null
          gateway_provider?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "billing_customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          company_subscription_id: string | null
          created_at: string
          currency: string
          due_date: string
          empresa_id: string
          gateway_invoice_id: string | null
          id: string
          metadata: Json
          paid_at: string | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_subscription_id?: string | null
          created_at?: string
          currency?: string
          due_date: string
          empresa_id: string
          gateway_invoice_id?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_subscription_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          empresa_id?: string
          gateway_invoice_id?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_company_subscription_id_fkey"
            columns: ["company_subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "billing_invoices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_ssma: {
        Row: {
          created_at: string
          data_admissao: string | null
          empresa_id: string
          funcao: string | null
          id: string
          matricula: string | null
          nome: string
          setor: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_admissao?: string | null
          empresa_id: string
          funcao?: string | null
          id?: string
          matricula?: string | null
          nome: string
          setor?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_admissao?: string | null
          empresa_id?: string
          funcao?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          setor?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "colaboradores_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          empresa_id: string
          ends_at: string | null
          id: string
          metadata: Json
          plan_id: string
          renewal_date: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          empresa_id: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          plan_id: string
          renewal_date?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          empresa_id?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          plan_id?: string
          renewal_date?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "company_subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usage_metrics: {
        Row: {
          created_at: string
          empresa_id: string
          metric_month: string
          orders_created: number
          storage_used: number
          updated_at: string
          users_count: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          metric_month: string
          orders_created?: number
          storage_used?: number
          updated_at?: string
          users_count?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          metric_month?: string
          orders_created?: number
          storage_used?: number
          updated_at?: string
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_metrics_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_usage_metrics_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "company_usage_metrics_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      componentes_equipamento: {
        Row: {
          ativo: boolean
          codigo: string | null
          corrente: string | null
          created_at: string
          criticidade: string | null
          data_instalacao: string | null
          descricao: string | null
          dimensoes: Json | null
          empresa_id: string
          equipamento_id: string
          especificacoes: Json | null
          estado: string | null
          fabricante: string | null
          horas_operacao: number | null
          id: string
          intervalo_manutencao_dias: number | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          parent_id: string | null
          posicao: string | null
          potencia: string | null
          proxima_manutencao: string | null
          quantidade: number | null
          rpm: string | null
          tensao: string | null
          tipo: string | null
          ultima_manutencao: string | null
          updated_at: string
          vida_util_horas: number | null
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          corrente?: string | null
          created_at?: string
          criticidade?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          dimensoes?: Json | null
          empresa_id: string
          equipamento_id: string
          especificacoes?: Json | null
          estado?: string | null
          fabricante?: string | null
          horas_operacao?: number | null
          id?: string
          intervalo_manutencao_dias?: number | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          parent_id?: string | null
          posicao?: string | null
          potencia?: string | null
          proxima_manutencao?: string | null
          quantidade?: number | null
          rpm?: string | null
          tensao?: string | null
          tipo?: string | null
          ultima_manutencao?: string | null
          updated_at?: string
          vida_util_horas?: number | null
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          corrente?: string | null
          created_at?: string
          criticidade?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          dimensoes?: Json | null
          empresa_id?: string
          equipamento_id?: string
          especificacoes?: Json | null
          estado?: string | null
          fabricante?: string | null
          horas_operacao?: number | null
          id?: string
          intervalo_manutencao_dias?: number | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          parent_id?: string | null
          posicao?: string | null
          potencia?: string | null
          proxima_manutencao?: string | null
          quantidade?: number | null
          rpm?: string | null
          tensao?: string | null
          tipo?: string | null
          ultima_manutencao?: string | null
          updated_at?: string
          vida_util_horas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "componentes_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "componentes_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "componentes_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "componentes_equipamento_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "componentes_equipamento_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "componentes_equipamento"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          categoria: string | null
          chave: string
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: number
          tipo: string | null
          updated_at: string | null
          valor: Json | null
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: number
          tipo?: string | null
          updated_at?: string | null
          valor?: Json | null
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: number
          tipo?: string | null
          updated_at?: string | null
          valor?: Json | null
        }
        Relationships: []
      }
      contract_versions: {
        Row: {
          change_summary: string | null
          content: string
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content?: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number | null
          content: string
          created_at: string
          created_by: string | null
          empresa_id: string
          ends_at: string | null
          generated_at: string
          id: string
          payment_method: string | null
          plan_id: string | null
          signed_at: string | null
          signed_by: string | null
          starts_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          amount?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          ends_at?: string | null
          generated_at?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          starts_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          amount?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          ends_at?: string | null
          generated_at?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          starts_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          anexos: Json | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_contrato: string
          penalidade_descricao: string | null
          responsavel_nome: string | null
          sla_atendimento_horas: number
          sla_resolucao_horas: number
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor_mensal: number
          valor_total: number
        }
        Insert: {
          anexos?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_contrato: string
          penalidade_descricao?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number
          sla_resolucao_horas?: number
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          valor_mensal?: number
          valor_total?: number
        }
        Update: {
          anexos?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_contrato?: string
          penalidade_descricao?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number
          sla_resolucao_horas?: number
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor_mensal?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_empresa: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          inscricao_estadual: string | null
          logo_login_url: string | null
          logo_menu_url: string | null
          logo_pdf_url: string | null
          logo_principal_url: string | null
          logo_relatorio_url: string | null
          nome_fantasia: string | null
          razao_social: string | null
          responsavel_cargo: string | null
          responsavel_nome: string | null
          site: string | null
          telefone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          inscricao_estadual?: string | null
          logo_login_url?: string | null
          logo_menu_url?: string | null
          logo_pdf_url?: string | null
          logo_principal_url?: string | null
          logo_relatorio_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          inscricao_estadual?: string | null
          logo_login_url?: string | null
          logo_menu_url?: string | null
          logo_pdf_url?: string | null
          logo_principal_url?: string | null
          logo_relatorio_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      dispositivos_moveis: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          desativado_em: string | null
          desativado_por: string | null
          device_id: string
          device_nome: string | null
          device_os: string | null
          empresa_id: string
          id: string
          mecanico_ultimo_id: string | null
          motivo_desativacao: string | null
          os_pendentes_offline: number | null
          token: string
          ultimo_acesso: string | null
          ultimo_ip: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          desativado_em?: string | null
          desativado_por?: string | null
          device_id: string
          device_nome?: string | null
          device_os?: string | null
          empresa_id: string
          id?: string
          mecanico_ultimo_id?: string | null
          motivo_desativacao?: string | null
          os_pendentes_offline?: number | null
          token?: string
          ultimo_acesso?: string | null
          ultimo_ip?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          desativado_em?: string | null
          desativado_por?: string | null
          device_id?: string
          device_nome?: string | null
          device_os?: string | null
          empresa_id?: string
          id?: string
          mecanico_ultimo_id?: string | null
          motivo_desativacao?: string | null
          os_pendentes_offline?: number | null
          token?: string
          ultimo_acesso?: string | null
          ultimo_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_moveis_desativado_por_fkey"
            columns: ["desativado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_moveis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_moveis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "dispositivos_moveis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_moveis_mecanico_ultimo_id_fkey"
            columns: ["mecanico_ultimo_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
        ]
      }
      document_layouts: {
        Row: {
          ativo: boolean
          configuracao: Json
          created_at: string
          empresa_id: string
          id: string
          nome: string | null
          tipo_documento: string
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          empresa_id: string
          id?: string
          nome?: string | null
          tipo_documento: string
          updated_at?: string
          versao: string
        }
        Update: {
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string | null
          tipo_documento?: string
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_layouts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_layouts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "document_layouts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          prefixo: string
          proximo_numero: number
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          prefixo: string
          proximo_numero?: number
          tipo_documento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          prefixo?: string
          proximo_numero?: number
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_tecnicos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          revisao: string | null
          status: string | null
          tag: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          versao: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          revisao?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          versao?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          revisao?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "documentos_tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tecnicos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          created_at: string | null
          dominio_custom: string | null
          empresa_id: string | null
          id: number
          nome_exibicao: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dominio_custom?: string | null
          empresa_id?: string | null
          id?: number
          nome_exibicao?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dominio_custom?: string | null
          empresa_id?: string | null
          id?: number
          nome_exibicao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          dispositivos_moveis_ativos: boolean | null
          id: string
          max_dispositivos_moveis: number | null
          nome: string
          nome_fantasia: string | null
          plano: string | null
          razao_social: string | null
          slug: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          dispositivos_moveis_ativos?: boolean | null
          id?: string
          max_dispositivos_moveis?: number | null
          nome: string
          nome_fantasia?: string | null
          plano?: string | null
          razao_social?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          dispositivos_moveis_ativos?: boolean | null
          id?: string
          max_dispositivos_moveis?: number | null
          nome?: string
          nome_fantasia?: string | null
          plano?: string | null
          razao_social?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_audit_logs: {
        Row: {
          acao: string | null
          actor_id: string | null
          correlacao_id: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          diferenca: Json | null
          empresa_id: string
          id: string
          impersonado_por_email: string | null
          impersonado_por_id: string | null
          ip_address: unknown
          mensagem_erro: string | null
          new_data: Json | null
          ocorreu_em: string | null
          old_data: Json | null
          operation: string
          record_id: string | null
          registro_id: string | null
          resultado: string | null
          tabela: string | null
          table_name: string
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          acao?: string | null
          actor_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          diferenca?: Json | null
          empresa_id: string
          id?: string
          impersonado_por_email?: string | null
          impersonado_por_id?: string | null
          ip_address?: unknown
          mensagem_erro?: string | null
          new_data?: Json | null
          ocorreu_em?: string | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          registro_id?: string | null
          resultado?: string | null
          tabela?: string | null
          table_name: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string | null
          actor_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          diferenca?: Json | null
          empresa_id?: string
          id?: string
          impersonado_por_email?: string | null
          impersonado_por_id?: string | null
          ip_address?: unknown
          mensagem_erro?: string | null
          new_data?: Json | null
          ocorreu_em?: string | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          registro_id?: string | null
          resultado?: string | null
          tabela?: string | null
          table_name?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_audit_logs_archive: {
        Row: {
          acao: string | null
          actor_id: string | null
          correlacao_id: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          diferenca: Json | null
          empresa_id: string
          id: string
          impersonado_por_email: string | null
          impersonado_por_id: string | null
          ip_address: unknown
          mensagem_erro: string | null
          new_data: Json | null
          ocorreu_em: string | null
          old_data: Json | null
          operation: string
          record_id: string | null
          registro_id: string | null
          resultado: string | null
          tabela: string | null
          table_name: string
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          acao?: string | null
          actor_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          diferenca?: Json | null
          empresa_id: string
          id?: string
          impersonado_por_email?: string | null
          impersonado_por_id?: string | null
          ip_address?: unknown
          mensagem_erro?: string | null
          new_data?: Json | null
          ocorreu_em?: string | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          registro_id?: string | null
          resultado?: string | null
          tabela?: string | null
          table_name: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string | null
          actor_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          diferenca?: Json | null
          empresa_id?: string
          id?: string
          impersonado_por_email?: string | null
          impersonado_por_id?: string | null
          ip_address?: unknown
          mensagem_erro?: string | null
          new_data?: Json | null
          ocorreu_em?: string | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          registro_id?: string | null
          resultado?: string | null
          tabela?: string | null
          table_name?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      entregas_epi: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string
          created_at: string
          data_devolucao: string | null
          data_entrega: string
          empresa_id: string
          epi_id: string
          id: string
          motivo: string | null
          observacoes: string | null
          quantidade: number
        }
        Insert: {
          colaborador_id?: string | null
          colaborador_nome: string
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string
          empresa_id: string
          epi_id: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number
        }
        Update: {
          colaborador_id?: string | null
          colaborador_nome?: string
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string
          empresa_id?: string
          epi_id?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "entregas_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epi_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number
          fabricante: string | null
          id: string
          nome: string
          numero_ca: string | null
          updated_at: string
          validade_ca: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          id?: string
          nome: string
          numero_ca?: string | null
          updated_at?: string
          validade_ca?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          id?: string
          nome?: string
          numero_ca?: string | null
          updated_at?: string
          validade_ca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          criticidade: string
          data_instalacao: string | null
          data_vencimento: string | null
          empresa_id: string | null
          fabricante: string | null
          id: string
          localizacao: string | null
          modelo: string | null
          nivel_risco: string
          nome: string
          numero_serie: string | null
          origem: string
          sistema_id: string | null
          tag: string
          temporario: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criticidade?: string
          data_instalacao?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nivel_risco?: string
          nome: string
          numero_serie?: string | null
          origem?: string
          sistema_id?: string | null
          tag: string
          temporario?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criticidade?: string
          data_instalacao?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nivel_risco?: string
          nome?: string
          numero_serie?: string | null
          origem?: string
          sistema_id?: string | null
          tag?: string
          temporario?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_ponto_lubrificacao: {
        Row: {
          concluido: boolean
          created_at: string
          descricao: string
          id: string
          observacoes: string | null
          ordem: number
          ponto_id: string
          tempo_estimado_min: number
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          descricao: string
          id?: string
          observacoes?: string | null
          ordem?: number
          ponto_id: string
          tempo_estimado_min?: number
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          ordem?: number
          ponto_id?: string
          tempo_estimado_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_ponto_lubrificacao_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "rotas_lubrificacao_pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_lubrificacao: {
        Row: {
          created_at: string
          data_execucao: string
          empresa_id: string | null
          executor_id: string | null
          executor_nome: string | null
          fotos: Json | null
          id: string
          observacoes: string | null
          os_gerada_id: string | null
          plano_id: string
          quantidade_utilizada: number | null
          status: string
          tempo_real_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_execucao?: string
          empresa_id?: string | null
          executor_id?: string | null
          executor_nome?: string | null
          fotos?: Json | null
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id: string
          quantidade_utilizada?: number | null
          status?: string
          tempo_real_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_execucao?: string
          empresa_id?: string | null
          executor_id?: string | null
          executor_nome?: string | null
          fotos?: Json | null
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id?: string
          quantidade_utilizada?: number | null
          status?: string
          tempo_real_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "execucoes_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_lubrificacao_os_gerada_id_fkey"
            columns: ["os_gerada_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_lubrificacao_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_lubrificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_os: {
        Row: {
          causa: string | null
          created_at: string
          custo_mao_obra: number | null
          custo_materiais: number | null
          custo_terceiros: number | null
          custo_total: number | null
          data_execucao: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          mecanico_id: string | null
          mecanico_nome: string | null
          observacoes: string | null
          os_id: string
          servico_executado: string | null
          tempo_execucao: number | null
          tempo_execucao_bruto: number | null
          tempo_execucao_liquido: number | null
          tempo_pausas: number
        }
        Insert: {
          causa?: string | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacoes?: string | null
          os_id: string
          servico_executado?: string | null
          tempo_execucao?: number | null
          tempo_execucao_bruto?: number | null
          tempo_execucao_liquido?: number | null
          tempo_pausas?: number
        }
        Update: {
          causa?: string | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacoes?: string | null
          os_id?: string
          servico_executado?: string | null
          tempo_execucao?: number | null
          tempo_execucao_bruto?: number | null
          tempo_execucao_liquido?: number | null
          tempo_pausas?: number
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "execucoes_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_os_pausas: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          duracao_min: number
          empresa_id: string | null
          execucao_id: string
          fim: string
          id: string
          inicio: string
          motivo: string | null
          os_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          duracao_min: number
          empresa_id?: string | null
          execucao_id: string
          fim: string
          id?: string
          inicio: string
          motivo?: string | null
          os_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          duracao_min?: number
          empresa_id?: string | null
          execucao_id?: string
          fim?: string
          id?: string
          inicio?: string
          motivo?: string | null
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_os_pausas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_pausas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "execucoes_os_pausas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_pausas_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "execucoes_os"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_os_pausas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_preventivas: {
        Row: {
          checklist: Json | null
          created_at: string
          data_execucao: string
          empresa_id: string
          executor_id: string | null
          executor_nome: string
          id: string
          observacoes: string | null
          os_gerada_id: string | null
          plano_id: string
          status: string | null
          tempo_real_min: number | null
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          data_execucao?: string
          empresa_id: string
          executor_id?: string | null
          executor_nome: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id: string
          status?: string | null
          tempo_real_min?: number | null
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          data_execucao?: string
          empresa_id?: string
          executor_id?: string | null
          executor_nome?: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id?: string
          status?: string | null
          tempo_real_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "execucoes_preventivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_preventivas_os_gerada_id_fkey"
            columns: ["os_gerada_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_preventivas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_preventivos"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          empresa_id: string
          enabled: boolean
          feature_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          enabled?: boolean
          feature_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          enabled?: boolean
          feature_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "feature_flags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_seguranca: {
        Row: {
          armazenamento: string | null
          arquivo_url: string | null
          ativo: boolean
          classificacao_ghs: string | null
          codigo: string | null
          created_at: string
          data_validade: string | null
          documentos_anexos: Json
          empresa_id: string
          epi_recomendado: string | null
          fabricante: string | null
          id: string
          medidas_emergencia: string | null
          nome_produto: string
          perigos_principais: string | null
          primeiros_socorros: string | null
          updated_at: string
        }
        Insert: {
          armazenamento?: string | null
          arquivo_url?: string | null
          ativo?: boolean
          classificacao_ghs?: string | null
          codigo?: string | null
          created_at?: string
          data_validade?: string | null
          documentos_anexos?: Json
          empresa_id: string
          epi_recomendado?: string | null
          fabricante?: string | null
          id?: string
          medidas_emergencia?: string | null
          nome_produto: string
          perigos_principais?: string | null
          primeiros_socorros?: string | null
          updated_at?: string
        }
        Update: {
          armazenamento?: string | null
          arquivo_url?: string | null
          ativo?: boolean
          classificacao_ghs?: string | null
          codigo?: string | null
          created_at?: string
          data_validade?: string | null
          documentos_anexos?: Json
          empresa_id?: string
          epi_recomendado?: string | null
          fabricante?: string | null
          id?: string
          medidas_emergencia?: string | null
          nome_produto?: string
          perigos_principais?: string | null
          primeiros_socorros?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fichas_seguranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_seguranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "fichas_seguranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      fmea: {
        Row: {
          acao_recomendada: string | null
          causa_falha: string | null
          created_at: string
          descricao: string | null
          efeito_falha: string | null
          empresa_id: string
          equipamento_id: string | null
          falha_funcional: string | null
          funcao: string | null
          id: string
          prazo: string | null
          responsavel: string | null
          tag: string | null
          updated_at: string
        }
        Insert: {
          acao_recomendada?: string | null
          causa_falha?: string | null
          created_at?: string
          descricao?: string | null
          efeito_falha?: string | null
          empresa_id: string
          equipamento_id?: string | null
          falha_funcional?: string | null
          funcao?: string | null
          id?: string
          prazo?: string | null
          responsavel?: string | null
          tag?: string | null
          updated_at?: string
        }
        Update: {
          acao_recomendada?: string | null
          causa_falha?: string | null
          created_at?: string
          descricao?: string | null
          efeito_falha?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          falha_funcional?: string | null
          funcao?: string | null
          id?: string
          prazo?: string | null
          responsavel?: string | null
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fmea_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmea_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "fmea_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmea_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          avaliacao_media: number
          cnpj: string | null
          codigo: string
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          email: string | null
          empresa_id: string
          endereco: string | null
          especialidade: string | null
          id: string
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          tipo: string
          total_avaliacoes: number
          updated_at: string
        }
        Insert: {
          avaliacao_media?: number
          cnpj?: string | null
          codigo: string
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          tipo?: string
          total_avaliacoes?: number
          updated_at?: string
        }
        Update: {
          avaliacao_media?: number
          cnpj?: string | null
          codigo?: string
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          tipo?: string
          total_avaliacoes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_manutencao: {
        Row: {
          created_at: string
          custo_total: number | null
          data_evento: string
          descricao: string | null
          empresa_id: string
          id: string
          os_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          data_evento?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          os_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          data_evento?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          os_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "historico_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_manutencao_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      incidentes_ssma: {
        Row: {
          acoes_imediatas: string | null
          causas_basicas: string | null
          causas_imediatas: string | null
          created_at: string
          custo_estimado: number | null
          data_ocorrencia: string | null
          descricao: string | null
          dias_afastamento: number | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          local_ocorrencia: string | null
          numero_incidente: string | null
          pessoas_envolvidas: string | null
          rca_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          severidade: string | null
          tag: string | null
          testemunhas: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          acoes_imediatas?: string | null
          causas_basicas?: string | null
          causas_imediatas?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_ocorrencia?: string | null
          descricao?: string | null
          dias_afastamento?: number | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: string | null
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          tag?: string | null
          testemunhas?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          acoes_imediatas?: string | null
          causas_basicas?: string | null
          causas_imediatas?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_ocorrencia?: string | null
          descricao?: string | null
          dias_afastamento?: number | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: string | null
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          tag?: string | null
          testemunhas?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidentes_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "incidentes_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_ssma_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_ssma_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "analise_causa_raiz"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_kpi: {
        Row: {
          backlog_horas: number | null
          created_at: string
          cumprimento_plano_pct: number | null
          disponibilidade_pct: number | null
          empresa_id: string
          id: string
          mtbf_horas: number | null
          mttr_horas: number | null
          referencia: string
        }
        Insert: {
          backlog_horas?: number | null
          created_at?: string
          cumprimento_plano_pct?: number | null
          disponibilidade_pct?: number | null
          empresa_id: string
          id?: string
          mtbf_horas?: number | null
          mttr_horas?: number | null
          referencia: string
        }
        Update: {
          backlog_horas?: number | null
          created_at?: string
          cumprimento_plano_pct?: number | null
          disponibilidade_pct?: number | null
          empresa_id?: string
          id?: string
          mtbf_horas?: number | null
          mttr_horas?: number | null
          referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_kpi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_kpi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "indicadores_kpi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecoes: {
        Row: {
          created_at: string
          data_inspecao: string | null
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          inspetor_id: string | null
          inspetor_nome: string | null
          numero_inspecao: string | null
          rota_nome: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_inspecao?: string | null
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string | null
          numero_inspecao?: string | null
          rota_nome?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_inspecao?: string | null
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string | null
          numero_inspecao?: string | null
          rota_nome?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspecoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "inspecoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_inspetor_id_fkey"
            columns: ["inspetor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          ip_address: string
          last_request_at: string
          request_count: number
          scope: string
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          ip_address: string
          last_request_at?: string
          request_count?: number
          scope: string
          updated_at?: string
          window_start: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          ip_address?: string
          last_request_at?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      log_mecanicos_login: {
        Row: {
          codigo_acesso: string
          created_at: string | null
          device_name: string | null
          device_token: string | null
          dispositivo_id: string | null
          duracao_minutos: number | null
          empresa_id: string
          id: string
          ip_address: unknown
          login_em: string
          logout_em: string | null
          mecanico_id: string
          motivo_logout: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          codigo_acesso: string
          created_at?: string | null
          device_name?: string | null
          device_token?: string | null
          dispositivo_id?: string | null
          duracao_minutos?: number | null
          empresa_id: string
          id?: string
          ip_address?: unknown
          login_em?: string
          logout_em?: string | null
          mecanico_id: string
          motivo_logout?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          codigo_acesso?: string
          created_at?: string | null
          device_name?: string | null
          device_token?: string | null
          dispositivo_id?: string | null
          duracao_minutos?: number | null
          empresa_id?: string
          id?: string
          ip_address?: unknown
          login_em?: string
          logout_em?: string | null
          mecanico_id?: string
          motivo_logout?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_mecanicos_login_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
        ]
      }
      log_tentativas_login: {
        Row: {
          codigo_acesso: string
          criado_em: string
          dispositivo_id: string
          empresa_id: string
          id: string
          ip_address: unknown
          motivo_falha: string | null
          status_bloqueio: string | null
          sucesso: boolean
          tentativa_numero: number
          user_agent: string | null
        }
        Insert: {
          codigo_acesso: string
          criado_em?: string
          dispositivo_id: string
          empresa_id: string
          id?: string
          ip_address?: unknown
          motivo_falha?: string | null
          status_bloqueio?: string | null
          sucesso?: boolean
          tentativa_numero: number
          user_agent?: string | null
        }
        Update: {
          codigo_acesso?: string
          criado_em?: string
          dispositivo_id?: string
          empresa_id?: string
          id?: string
          ip_address?: unknown
          motivo_falha?: string | null
          status_bloqueio?: string | null
          sucesso?: boolean
          tentativa_numero?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_tentativas_login_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_tentativas_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_tentativas_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "log_tentativas_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      log_validacoes_senha: {
        Row: {
          codigo_acesso: string
          criado_em: string
          device_name: string | null
          dispositivo_id: string | null
          empresa_id: string
          id: string
          ip_address: unknown
          mecanico_id: string | null
          resultado: string
          senha_valida: boolean
          user_agent: string | null
        }
        Insert: {
          codigo_acesso: string
          criado_em?: string
          device_name?: string | null
          dispositivo_id?: string | null
          empresa_id: string
          id?: string
          ip_address?: unknown
          mecanico_id?: string | null
          resultado: string
          senha_valida: boolean
          user_agent?: string | null
        }
        Update: {
          codigo_acesso?: string
          criado_em?: string
          device_name?: string | null
          dispositivo_id?: string | null
          empresa_id?: string
          id?: string
          ip_address?: unknown
          mecanico_id?: string | null
          resultado?: string
          senha_valida?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_validacoes_senha_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_validacoes_senha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_validacoes_senha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "log_validacoes_senha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_validacoes_senha_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          email: string
          ip_address: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          email: string
          ip_address: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          email?: string
          ip_address?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      lubrificantes: {
        Row: {
          ativo: boolean
          codigo: string
          cor_identificacao: string | null
          created_at: string
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number
          fabricante: string | null
          id: string
          nome: string
          tipo: string
          unidade_medida: string
          updated_at: string
          viscosidade: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor_identificacao?: string | null
          created_at?: string
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          id?: string
          nome: string
          tipo?: string
          unidade_medida?: string
          updated_at?: string
          viscosidade?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor_identificacao?: string | null
          created_at?: string
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          id?: string
          nome?: string
          tipo?: string
          unidade_medida?: string
          updated_at?: string
          viscosidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lubrificantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lubrificantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "lubrificantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedule: {
        Row: {
          created_at: string
          data_programada: string
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          origem_id: string
          responsavel: string | null
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          data_programada: string
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          origem_id: string
          responsavel?: string | null
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          data_programada?: string
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          origem_id?: string
          responsavel?: string | null
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "maintenance_schedule_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          custo_unitario: number
          empresa_id: string
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          localizacao: string | null
          nome: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          custo_unitario?: number
          empresa_id: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string | null
          nome: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          custo_unitario?: number
          empresa_id?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string | null
          nome?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_os: {
        Row: {
          created_at: string
          custo_unitario: number | null
          empresa_id: string
          id: string
          material_id: string
          os_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          empresa_id: string
          id?: string
          material_id: string
          os_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          empresa_id?: string
          id?: string
          material_id?: string
          os_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "materiais_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "materiais_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_os_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      mecanicos: {
        Row: {
          ativo: boolean
          codigo_acesso: string | null
          created_at: string
          custo_hora: number | null
          deleted_at: string | null
          deleted_by: string | null
          empresa_id: string | null
          escala_trabalho: string | null
          especialidade: string | null
          ferias_fim: string | null
          ferias_inicio: string | null
          folgas_planejadas: string | null
          id: string
          nome: string
          senha_acesso: string | null
          senha_hash: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_acesso?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string | null
          escala_trabalho?: string | null
          especialidade?: string | null
          ferias_fim?: string | null
          ferias_inicio?: string | null
          folgas_planejadas?: string | null
          id?: string
          nome: string
          senha_acesso?: string | null
          senha_hash?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_acesso?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string | null
          escala_trabalho?: string | null
          especialidade?: string | null
          ferias_fim?: string | null
          ferias_inicio?: string | null
          folgas_planejadas?: string | null
          id?: string
          nome?: string
          senha_acesso?: string | null
          senha_hash?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mecanicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "mecanicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      mecanicos_blocked_devices: {
        Row: {
          ativo: boolean | null
          bloqueado_em: string
          bloqueado_por: string | null
          desbloqueado_em: string | null
          desbloqueado_por: string | null
          dispositivo_id: string
          empresa_id: string
          id: string
          motivo: string
        }
        Insert: {
          ativo?: boolean | null
          bloqueado_em?: string
          bloqueado_por?: string | null
          desbloqueado_em?: string | null
          desbloqueado_por?: string | null
          dispositivo_id: string
          empresa_id: string
          id?: string
          motivo: string
        }
        Update: {
          ativo?: boolean | null
          bloqueado_em?: string
          bloqueado_por?: string | null
          desbloqueado_em?: string | null
          desbloqueado_por?: string | null
          dispositivo_id?: string
          empresa_id?: string
          id?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mecanicos_blocked_devices_bloqueado_por_fkey"
            columns: ["bloqueado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_desbloqueado_por_fkey"
            columns: ["desbloqueado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      mecanicos_rate_limit_state: {
        Row: {
          atualizado_em: string | null
          bloqueado_ate: string | null
          dispositivo_id: string
          empresa_id: string
          id: string
          motivo_bloqueio: string | null
          tentativas_ultimas_1h: number | null
          tentativas_ultimas_24h: number | null
        }
        Insert: {
          atualizado_em?: string | null
          bloqueado_ate?: string | null
          dispositivo_id: string
          empresa_id: string
          id?: string
          motivo_bloqueio?: string | null
          tentativas_ultimas_1h?: number | null
          tentativas_ultimas_24h?: number | null
        }
        Update: {
          atualizado_em?: string | null
          bloqueado_ate?: string | null
          dispositivo_id?: string
          empresa_id?: string
          id?: string
          motivo_bloqueio?: string | null
          tentativas_ultimas_1h?: number | null
          tentativas_ultimas_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mecanicos_rate_limit_state_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: true
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_rate_limit_state_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_rate_limit_state_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "mecanicos_rate_limit_state_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes_preditivas: {
        Row: {
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          id: string
          limite_alerta: number | null
          limite_critico: number | null
          observacoes: string | null
          responsavel_nome: string | null
          status: string | null
          tag: string | null
          tipo_medicao: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          limite_alerta?: number | null
          limite_critico?: number | null
          observacoes?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          tipo_medicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          limite_alerta?: number | null
          limite_critico?: number | null
          observacoes?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          tipo_medicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_preditivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_preditivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "medicoes_preditivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_preditivas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      melhorias: {
        Row: {
          anexos: Json | null
          aprovador_id: string | null
          aprovador_nome: string | null
          area: string | null
          beneficios: string | null
          created_at: string
          custo_implementacao: number | null
          data_aprovacao: string | null
          data_implementacao: string | null
          descricao: string | null
          economia_anual: number | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          numero_melhoria: string | null
          proponente_id: string | null
          proponente_nome: string | null
          roi_meses: number | null
          situacao_antes: string | null
          situacao_depois: string | null
          tag: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          anexos?: Json | null
          aprovador_id?: string | null
          aprovador_nome?: string | null
          area?: string | null
          beneficios?: string | null
          created_at?: string
          custo_implementacao?: number | null
          data_aprovacao?: string | null
          data_implementacao?: string | null
          descricao?: string | null
          economia_anual?: number | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          numero_melhoria?: string | null
          proponente_id?: string | null
          proponente_nome?: string | null
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          anexos?: Json | null
          aprovador_id?: string | null
          aprovador_nome?: string | null
          area?: string | null
          beneficios?: string | null
          created_at?: string
          custo_implementacao?: number | null
          data_aprovacao?: string | null
          data_implementacao?: string | null
          descricao?: string | null
          economia_anual?: number | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          numero_melhoria?: string | null
          proponente_id?: string | null
          proponente_nome?: string | null
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "melhorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "melhorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "melhorias_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_empresa: {
        Row: {
          cargo: string | null
          created_at: string
          empresa_id: string
          id: string
          invited_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "membros_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_epi: {
        Row: {
          colaborador_nome: string | null
          created_at: string
          documento_ref: string | null
          empresa_id: string
          epi_id: string
          id: string
          motivo: string | null
          quantidade: number
          saldo_antes: number
          saldo_depois: number
          tipo: string
        }
        Insert: {
          colaborador_nome?: string | null
          created_at?: string
          documento_ref?: string | null
          empresa_id: string
          epi_id: string
          id?: string
          motivo?: string | null
          quantidade: number
          saldo_antes?: number
          saldo_depois?: number
          tipo: string
        }
        Update: {
          colaborador_nome?: string | null
          created_at?: string
          documento_ref?: string | null
          empresa_id?: string
          epi_id?: string
          id?: string
          motivo?: string | null
          quantidade?: number
          saldo_antes?: number
          saldo_depois?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "movimentacoes_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_epi_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_lubrificante: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          lubrificante_id: string
          observacoes: string | null
          quantidade: number
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          lubrificante_id: string
          observacoes?: string | null
          quantidade: number
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          lubrificante_id?: string
          observacoes?: string | null
          quantidade?: number
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_lubrificante_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_lubrificante_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "movimentacoes_lubrificante_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_lubrificante_lubrificante_id_fkey"
            columns: ["lubrificante_id"]
            isOneToOne: false
            referencedRelation: "lubrificantes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_materiais: {
        Row: {
          created_at: string
          custo_unitario: number | null
          empresa_id: string
          id: string
          material_id: string
          os_id: string | null
          quantidade: number
          tipo_movimentacao: string
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          empresa_id: string
          id?: string
          material_id: string
          os_id?: string | null
          quantidade: number
          tipo_movimentacao: string
          usuario_id?: string | null
          usuario_nome: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          empresa_id?: string
          id?: string
          material_id?: string
          os_id?: string | null
          quantidade?: number
          tipo_movimentacao?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "movimentacoes_materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_materiais_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_dashboard_summary: {
        Row: {
          backlog: number
          custo_mes: number
          disponibilidade_pct: number
          empresa_id: string
          mtbf_horas: number
          mttr_horas: number
          os_abertas: number
          os_fechadas: number
          refreshed_at: string
          total_os: number
        }
        Insert: {
          backlog?: number
          custo_mes?: number
          disponibilidade_pct?: number
          empresa_id: string
          mtbf_horas?: number
          mttr_horas?: number
          os_abertas?: number
          os_fechadas?: number
          refreshed_at?: string
          total_os?: number
        }
        Update: {
          backlog?: number
          custo_mes?: number
          disponibilidade_pct?: number
          empresa_id?: string
          mtbf_horas?: number
          mttr_horas?: number
          os_abertas?: number
          os_fechadas?: number
          refreshed_at?: string
          total_os?: number
        }
        Relationships: [
          {
            foreignKeyName: "mv_dashboard_summary_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mv_dashboard_summary_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "mv_dashboard_summary_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_logs: {
        Row: {
          action: string | null
          created_at: string
          duration_ms: number | null
          empresa_id: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          metadata: Json
          request_id: string | null
          scope: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          duration_ms?: number | null
          empresa_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
          scope: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          duration_ms?: number | null
          empresa_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
          scope?: string
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "operational_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          acao_corretiva: string | null
          causa_raiz: string | null
          created_at: string
          data_fechamento: string | null
          data_solicitacao: string
          descricao_execucao: string | null
          empresa_id: string | null
          equipamento: string
          equipamento_id: string | null
          id: string
          licoes_aprendidas: string | null
          maintenance_schedule_id: string | null
          mecanico_responsavel_codigo: string | null
          mecanico_responsavel_id: string | null
          modo_falha: string | null
          motivo_cancelamento: string | null
          numero_os: number | null
          prioridade: string
          problema: string
          solicitante: string
          status: string
          tag: string
          tempo_estimado: number | null
          tempo_total_minutos: number | null
          tipo: string
          updated_at: string
          usuario_abertura: string | null
          usuario_fechamento: string | null
          vista: boolean | null
          vista_em: string | null
          vista_por: string | null
        }
        Insert: {
          acao_corretiva?: string | null
          causa_raiz?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_solicitacao?: string
          descricao_execucao?: string | null
          empresa_id?: string | null
          equipamento: string
          equipamento_id?: string | null
          id?: string
          licoes_aprendidas?: string | null
          maintenance_schedule_id?: string | null
          mecanico_responsavel_codigo?: string | null
          mecanico_responsavel_id?: string | null
          modo_falha?: string | null
          motivo_cancelamento?: string | null
          numero_os?: number | null
          prioridade?: string
          problema: string
          solicitante: string
          status?: string
          tag: string
          tempo_estimado?: number | null
          tempo_total_minutos?: number | null
          tipo?: string
          updated_at?: string
          usuario_abertura?: string | null
          usuario_fechamento?: string | null
          vista?: boolean | null
          vista_em?: string | null
          vista_por?: string | null
        }
        Update: {
          acao_corretiva?: string | null
          causa_raiz?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_solicitacao?: string
          descricao_execucao?: string | null
          empresa_id?: string | null
          equipamento?: string
          equipamento_id?: string | null
          id?: string
          licoes_aprendidas?: string | null
          maintenance_schedule_id?: string | null
          mecanico_responsavel_codigo?: string | null
          mecanico_responsavel_id?: string | null
          modo_falha?: string | null
          motivo_cancelamento?: string | null
          numero_os?: number | null
          prioridade?: string
          problema?: string
          solicitante?: string
          status?: string
          tag?: string
          tempo_estimado?: number | null
          tempo_total_minutos?: number | null
          tipo?: string
          updated_at?: string
          usuario_abertura?: string | null
          usuario_fechamento?: string | null
          vista?: boolean | null
          vista_em?: string | null
          vista_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ordens_servico_empresa_id"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ordens_servico_empresa_id"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "fk_ordens_servico_empresa_id"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ordens_servico_vista_por"
            columns: ["vista_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      os_impressoes: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          impresso_em: string
          impresso_por: string
          impresso_por_nome: string | null
          os_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          impresso_em?: string
          impresso_por: string
          impresso_por_nome?: string | null
          os_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          impresso_em?: string
          impresso_por?: string
          impresso_por_nome?: string | null
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_impressoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_impersonation_sessions: {
        Row: {
          active: boolean
          empresa_id: string
          expires_at: string
          id: string
          issued_at: string
          owner_user_id: string
          session_token: string
        }
        Insert: {
          active?: boolean
          empresa_id: string
          expires_at: string
          id?: string
          issued_at?: string
          owner_user_id: string
          session_token: string
        }
        Update: {
          active?: boolean
          empresa_id?: string
          expires_at?: string
          id?: string
          issued_at?: string
          owner_user_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_impersonation_sessions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_impersonation_sessions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "owner_impersonation_sessions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas_equipamento: {
        Row: {
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          fim: string | null
          id: string
          inicio: string
          mecanico_id: string | null
          mecanico_nome: string | null
          observacao: string | null
          os_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paradas_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "paradas_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_equipamento_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_equipamento_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          escopo: string
          id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          escopo?: string
          id?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          escopo?: string
          id?: string
        }
        Relationships: []
      }
      permissoes_granulares: {
        Row: {
          acessar_historico: boolean | null
          acessar_indicadores: boolean | null
          alterar_status: boolean | null
          created_at: string
          criar: boolean | null
          editar: boolean | null
          empresa_id: string
          excluir: boolean | null
          exportar: boolean | null
          id: string
          importar: boolean | null
          imprimir: boolean | null
          modulo: string
          updated_at: string
          user_id: string
          ver_criticidade: boolean | null
          ver_custos: boolean | null
          ver_dados_financeiros: boolean | null
          ver_obs_internas: boolean | null
          ver_status: boolean | null
          ver_valores: boolean | null
          visualizar: boolean | null
        }
        Insert: {
          acessar_historico?: boolean | null
          acessar_indicadores?: boolean | null
          alterar_status?: boolean | null
          created_at?: string
          criar?: boolean | null
          editar?: boolean | null
          empresa_id: string
          excluir?: boolean | null
          exportar?: boolean | null
          id?: string
          importar?: boolean | null
          imprimir?: boolean | null
          modulo: string
          updated_at?: string
          user_id: string
          ver_criticidade?: boolean | null
          ver_custos?: boolean | null
          ver_dados_financeiros?: boolean | null
          ver_obs_internas?: boolean | null
          ver_status?: boolean | null
          ver_valores?: boolean | null
          visualizar?: boolean | null
        }
        Update: {
          acessar_historico?: boolean | null
          acessar_indicadores?: boolean | null
          alterar_status?: boolean | null
          created_at?: string
          criar?: boolean | null
          editar?: boolean | null
          empresa_id?: string
          excluir?: boolean | null
          exportar?: boolean | null
          id?: string
          importar?: boolean | null
          imprimir?: boolean | null
          modulo?: string
          updated_at?: string
          user_id?: string
          ver_criticidade?: boolean | null
          ver_custos?: boolean | null
          ver_dados_financeiros?: boolean | null
          ver_obs_internas?: boolean | null
          ver_status?: boolean | null
          ver_valores?: boolean | null
          visualizar?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_granulares_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_granulares_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "permissoes_granulares_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_trabalho: {
        Row: {
          aprovador_id: string | null
          aprovador_nome: string | null
          checklist_seguranca: Json | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          descricao_servico: string | null
          empresa_id: string
          epis_requeridos: string | null
          equipamento_id: string | null
          executante_nome: string | null
          id: string
          isolamentos: string | null
          numero_pt: string | null
          observacoes: string | null
          os_id: string | null
          supervisor_nome: string | null
          tag: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          checklist_seguranca?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          descricao_servico?: string | null
          empresa_id: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome?: string | null
          id?: string
          isolamentos?: string | null
          numero_pt?: string | null
          observacoes?: string | null
          os_id?: string | null
          supervisor_nome?: string | null
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          checklist_seguranca?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          descricao_servico?: string | null
          empresa_id?: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome?: string | null
          id?: string
          isolamentos?: string | null
          numero_pt?: string | null
          observacoes?: string | null
          os_id?: string | null
          supervisor_nome?: string | null
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "permissoes_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_trabalho_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_trabalho_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          active: boolean
          asset_limit: number
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          features: Json
          features_json: Json
          id: string
          limite_ativos: number
          limite_os_mes: number
          limite_storage_mb: number
          limite_usuarios: number
          max_companies: number | null
          max_orders_per_month: number | null
          max_storage: number | null
          max_users: number | null
          nome: string
          os_limit: number
          price_month: number
          storage_limit_mb: number
          updated_at: string
          user_limit: number
        }
        Insert: {
          active?: boolean
          asset_limit?: number
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          features?: Json
          features_json?: Json
          id?: string
          limite_ativos?: number
          limite_os_mes?: number
          limite_storage_mb?: number
          limite_usuarios?: number
          max_companies?: number | null
          max_orders_per_month?: number | null
          max_storage?: number | null
          max_users?: number | null
          nome: string
          os_limit?: number
          price_month?: number
          storage_limit_mb?: number
          updated_at?: string
          user_limit?: number
        }
        Update: {
          active?: boolean
          asset_limit?: number
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          features?: Json
          features_json?: Json
          id?: string
          limite_ativos?: number
          limite_os_mes?: number
          limite_storage_mb?: number
          limite_usuarios?: number
          max_companies?: number | null
          max_orders_per_month?: number | null
          max_storage?: number | null
          max_users?: number | null
          nome?: string
          os_limit?: number
          price_month?: number
          storage_limit_mb?: number
          updated_at?: string
          user_limit?: number
        }
        Relationships: []
      }
      planos_lubrificacao: {
        Row: {
          anexos: Json | null
          ativo: boolean
          codigo: string
          codigo_lubrificante: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          equipamento_id: string | null
          ferramenta: string | null
          id: string
          instrucoes: string | null
          localizacao: string | null
          lubrificante: string | null
          nivel_criticidade: string | null
          nome: string
          observacoes: string | null
          periodicidade: number | null
          periodicidade_tipo: string | null
          periodicidade_valor: number | null
          ponto: string | null
          ponto_lubrificacao: string | null
          prioridade: string | null
          proxima_execucao: string | null
          quantidade: number | null
          responsavel: string | null
          responsavel_nome: string | null
          status: string | null
          tag: string | null
          tempo_estimado: number | null
          tempo_estimado_min: number
          tipo_lubrificante: string | null
          tipo_periodicidade: string | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          anexos?: Json | null
          ativo?: boolean
          codigo: string
          codigo_lubrificante?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          equipamento_id?: string | null
          ferramenta?: string | null
          id?: string
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          nivel_criticidade?: string | null
          nome: string
          observacoes?: string | null
          periodicidade?: number | null
          periodicidade_tipo?: string | null
          periodicidade_valor?: number | null
          ponto?: string | null
          ponto_lubrificacao?: string | null
          prioridade?: string | null
          proxima_execucao?: string | null
          quantidade?: number | null
          responsavel?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          tempo_estimado?: number | null
          tempo_estimado_min?: number
          tipo_lubrificante?: string | null
          tipo_periodicidade?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          anexos?: Json | null
          ativo?: boolean
          codigo?: string
          codigo_lubrificante?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          equipamento_id?: string | null
          ferramenta?: string | null
          id?: string
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          nivel_criticidade?: string | null
          nome?: string
          observacoes?: string | null
          periodicidade?: number | null
          periodicidade_tipo?: string | null
          periodicidade_valor?: number | null
          ponto?: string | null
          ponto_lubrificacao?: string | null
          prioridade?: string | null
          proxima_execucao?: string | null
          quantidade?: number | null
          responsavel?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          tempo_estimado?: number | null
          tempo_estimado_min?: number
          tipo_lubrificante?: string | null
          tipo_periodicidade?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "planos_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_preventivos: {
        Row: {
          ativo: boolean
          checklist: Json | null
          codigo: string
          condicao_disparo: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          especialidade: string | null
          frequencia_ciclos: number | null
          frequencia_dias: number | null
          id: string
          instrucoes: string | null
          materiais_previstos: Json | null
          nome: string
          proxima_execucao: string | null
          responsavel_nome: string | null
          tag: string | null
          tempo_estimado_min: number | null
          tipo_gatilho: string | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          checklist?: Json | null
          codigo: string
          condicao_disparo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          especialidade?: string | null
          frequencia_ciclos?: number | null
          frequencia_dias?: number | null
          id?: string
          instrucoes?: string | null
          materiais_previstos?: Json | null
          nome: string
          proxima_execucao?: string | null
          responsavel_nome?: string | null
          tag?: string | null
          tempo_estimado_min?: number | null
          tipo_gatilho?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          checklist?: Json | null
          codigo?: string
          condicao_disparo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          especialidade?: string | null
          frequencia_ciclos?: number | null
          frequencia_dias?: number | null
          id?: string
          instrucoes?: string | null
          materiais_previstos?: Json | null
          nome?: string
          proxima_execucao?: string | null
          responsavel_nome?: string | null
          tag?: string | null
          tempo_estimado_min?: number | null
          tipo_gatilho?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "planos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_preventivos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          code: string
          company_limit: number | null
          created_at: string
          data_limit_mb: number
          description: string | null
          id: string
          module_flags: Json
          name: string
          premium_features: Json
          price_month: number
          updated_at: string
          user_limit: number
        }
        Insert: {
          active?: boolean
          code: string
          company_limit?: number | null
          created_at?: string
          data_limit_mb?: number
          description?: string | null
          id?: string
          module_flags?: Json
          name: string
          premium_features?: Json
          price_month?: number
          updated_at?: string
          user_limit?: number
        }
        Update: {
          active?: boolean
          code?: string
          company_limit?: number | null
          created_at?: string
          data_limit_mb?: number
          description?: string | null
          id?: string
          module_flags?: Json
          name?: string
          premium_features?: Json
          price_month?: number
          updated_at?: string
          user_limit?: number
        }
        Relationships: []
      }
      plantas: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "plantas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics: {
        Row: {
          backlog_horas: number | null
          created_at: string
          cumprimento_plano_pct: number | null
          disponibilidade_pct: number | null
          empresas_ativas: number
          id: string
          metric_date: string
          mtbf_horas: number | null
          mttr_horas: number | null
          os_abertas: number
          os_fechadas: number
          usuarios_ativos: number
        }
        Insert: {
          backlog_horas?: number | null
          created_at?: string
          cumprimento_plano_pct?: number | null
          disponibilidade_pct?: number | null
          empresas_ativas?: number
          id?: string
          metric_date: string
          mtbf_horas?: number | null
          mttr_horas?: number | null
          os_abertas?: number
          os_fechadas?: number
          usuarios_ativos?: number
        }
        Update: {
          backlog_horas?: number | null
          created_at?: string
          cumprimento_plano_pct?: number | null
          disponibilidade_pct?: number | null
          empresas_ativas?: number
          id?: string
          metric_date?: string
          mtbf_horas?: number | null
          mttr_horas?: number | null
          os_abertas?: number
          os_fechadas?: number
          usuarios_ativos?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          empresa_id: string | null
          force_password_change: boolean | null
          id: string
          nome: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id: string
          nome?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id?: string
          nome?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      qrcodes_vinculacao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          empresa_id: string
          expira_em: string | null
          id: string
          max_usos: number | null
          tipo: string
          token: string
          usos: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          empresa_id: string
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          tipo?: string
          token?: string
          usos?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: string
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          tipo?: string
          token?: string
          usos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qrcodes_vinculacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qrcodes_vinculacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qrcodes_vinculacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "qrcodes_vinculacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes_material: {
        Row: {
          created_at: string
          descricao_livre: string | null
          empresa_id: string
          id: string
          material_id: string | null
          mecanico_id: string | null
          mecanico_nome: string | null
          observacao: string | null
          os_id: string | null
          quantidade: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao_livre?: string | null
          empresa_id: string
          id?: string
          material_id?: string | null
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao_livre?: string | null
          empresa_id?: string
          id?: string
          material_id?: string | null
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_material_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_material_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "requisicoes_material_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_material_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_material_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_material_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permissao_codigo: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissao_codigo: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permissao_codigo?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permissao_codigo_fkey"
            columns: ["permissao_codigo"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["codigo"]
          },
        ]
      }
      rotas_lubrificacao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          frequencia: string
          id: string
          nome: string
          observacoes: string | null
          responsavel: string | null
          tempo_estimado_total_min: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          frequencia?: string
          id?: string
          nome: string
          observacoes?: string | null
          responsavel?: string | null
          tempo_estimado_total_min?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          frequencia?: string
          id?: string
          nome?: string
          observacoes?: string | null
          responsavel?: string | null
          tempo_estimado_total_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "rotas_lubrificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_lubrificacao_pontos: {
        Row: {
          codigo_ponto: string
          created_at: string
          descricao: string
          equipamento_tag: string | null
          ferramenta: string | null
          id: string
          imagem_url: string | null
          instrucoes: string | null
          localizacao: string | null
          lubrificante: string | null
          ordem: number
          plano_id: string | null
          quantidade: string | null
          referencia_manual: string | null
          requer_parada: boolean
          rota_id: string | null
          tempo_estimado_min: number | null
          tempo_total_min: number
        }
        Insert: {
          codigo_ponto: string
          created_at?: string
          descricao: string
          equipamento_tag?: string | null
          ferramenta?: string | null
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          ordem?: number
          plano_id?: string | null
          quantidade?: string | null
          referencia_manual?: string | null
          requer_parada?: boolean
          rota_id?: string | null
          tempo_estimado_min?: number | null
          tempo_total_min?: number
        }
        Update: {
          codigo_ponto?: string
          created_at?: string
          descricao?: string
          equipamento_tag?: string | null
          ferramenta?: string | null
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          ordem?: number
          plano_id?: string | null
          quantidade?: string | null
          referencia_manual?: string | null
          requer_parada?: boolean
          rota_id?: string | null
          tempo_estimado_min?: number | null
          tempo_total_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "rotas_lubrificacao_pontos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_lubrificacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_lubrificacao_pontos_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas_lubrificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_metrics_daily: {
        Row: {
          created_at: string
          empresas_ativas: number
          execucoes_realizadas: number
          metric_date: string
          ordens_criadas: number
          updated_at: string
          usuarios_ativos: number
        }
        Insert: {
          created_at?: string
          empresas_ativas?: number
          execucoes_realizadas?: number
          metric_date: string
          ordens_criadas?: number
          updated_at?: string
          usuarios_ativos?: number
        }
        Update: {
          created_at?: string
          empresas_ativas?: number
          execucoes_realizadas?: number
          metric_date?: string
          ordens_criadas?: number
          updated_at?: string
          usuarios_ativos?: number
        }
        Relationships: []
      }
      sequencia_os: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          proximo_numero: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          proximo_numero?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          proximo_numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencia_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequencia_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "sequencia_os_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_preventivos: {
        Row: {
          atividade_id: string
          concluido: boolean
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          observacoes: string | null
          ordem: number
          tempo_estimado_min: number
          updated_at: string
        }
        Insert: {
          atividade_id: string
          concluido?: boolean
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          ordem?: number
          tempo_estimado_min?: number
          updated_at?: string
        }
        Update: {
          atividade_id?: string
          concluido?: boolean
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          ordem?: number
          tempo_estimado_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_preventivos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades_preventivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "servicos_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      sistemas: {
        Row: {
          area_id: string
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          funcao_principal: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          area_id: string
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          funcao_principal?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          funcao_principal?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistemas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistemas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistemas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "sistemas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_manutencao: {
        Row: {
          classificacao: string
          created_at: string
          data_limite: string | null
          descricao_falha: string
          empresa_id: string | null
          equipamento_id: string | null
          id: string
          impacto: string
          numero_solicitacao: number | null
          observacoes: string | null
          os_id: string | null
          sla_horas: number
          solicitante_nome: string
          solicitante_setor: string | null
          status: string
          tag: string
          updated_at: string
        }
        Insert: {
          classificacao?: string
          created_at?: string
          data_limite?: string | null
          descricao_falha: string
          empresa_id?: string | null
          equipamento_id?: string | null
          id?: string
          impacto?: string
          numero_solicitacao?: number | null
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number
          solicitante_nome: string
          solicitante_setor?: string | null
          status?: string
          tag: string
          updated_at?: string
        }
        Update: {
          classificacao?: string
          created_at?: string
          data_limite?: string | null
          descricao_falha?: string
          empresa_id?: string | null
          equipamento_id?: string | null
          id?: string
          impacto?: string
          numero_solicitacao?: number | null
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number
          solicitante_nome?: string
          solicitante_setor?: string | null
          status?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "solicitacoes_manutencao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_manutencao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          due_at: string | null
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          processed_at: string
          provider: string
          provider_event: string | null
          provider_payment_id: string | null
          raw_payload: Json | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          processed_at?: string
          provider?: string
          provider_event?: string | null
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          processed_at?: string
          provider?: string
          provider_event?: string | null
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          asaas_customer_id: string | null
          asaas_last_event_at: string | null
          asaas_subscription_id: string | null
          billing_metadata: Json
          billing_provider: string
          created_at: string
          empresa_id: string
          ends_at: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          period: string | null
          plan_id: string
          renewal_at: string | null
          starts_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          asaas_customer_id?: string | null
          asaas_last_event_at?: string | null
          asaas_subscription_id?: string | null
          billing_metadata?: Json
          billing_provider?: string
          created_at?: string
          empresa_id: string
          ends_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          period?: string | null
          plan_id: string
          renewal_at?: string | null
          starts_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          asaas_customer_id?: string | null
          asaas_last_event_at?: string | null
          asaas_subscription_id?: string | null
          billing_metadata?: Json
          billing_provider?: string
          created_at?: string
          empresa_id?: string
          ends_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          period?: string | null
          plan_id?: string
          renewal_at?: string | null
          starts_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          empresa_id: string
          id: string
          last_message_at: string | null
          last_message_sender: string | null
          message: string
          messages: Json
          notification_email_pending: boolean
          notification_whatsapp_pending: boolean
          owner_notes: string | null
          owner_responder_id: string | null
          owner_response: string | null
          priority: string
          requester_user_id: string | null
          responded_at: string | null
          status: string
          subject: string
          unread_client_messages: number
          unread_owner_messages: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          last_message_at?: string | null
          last_message_sender?: string | null
          message: string
          messages?: Json
          notification_email_pending?: boolean
          notification_whatsapp_pending?: boolean
          owner_notes?: string | null
          owner_responder_id?: string | null
          owner_response?: string | null
          priority?: string
          requester_user_id?: string | null
          responded_at?: string | null
          status?: string
          subject: string
          unread_client_messages?: number
          unread_owner_messages?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          last_message_at?: string | null
          last_message_sender?: string | null
          message?: string
          messages?: Json
          notification_email_pending?: boolean
          notification_whatsapp_pending?: boolean
          owner_notes?: string | null
          owner_responder_id?: string | null
          owner_response?: string | null
          priority?: string
          requester_user_id?: string | null
          responded_at?: string | null
          status?: string
          subject?: string
          unread_client_messages?: number
          unread_owner_messages?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "support_tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      system_error_events: {
        Row: {
          created_at: string
          empresa_id: string | null
          endpoint: string | null
          error_message: string
          error_name: string | null
          id: string
          metadata: Json
          request_id: string | null
          severity: string
          source: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          endpoint?: string | null
          error_message: string
          error_name?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          endpoint?: string | null
          error_message?: string
          error_name?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_error_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_error_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "system_error_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      system_owner_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      templates_preventivos: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          estrutura: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          estrutura?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          estrutura?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "templates_preventivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_ssma: {
        Row: {
          carga_horaria: number | null
          certificado_url: string | null
          concluintes: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          dias_alerta_antes: number
          empresa_id: string
          id: string
          instrutor: string | null
          nome_curso: string
          numero_certificado: string | null
          observacoes: string | null
          participantes: number | null
          status: string
          tipo_curso: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          certificado_url?: string | null
          concluintes?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_alerta_antes?: number
          empresa_id: string
          id?: string
          instrutor?: string | null
          nome_curso: string
          numero_certificado?: string | null
          observacoes?: string | null
          participantes?: number | null
          status?: string
          tipo_curso: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          certificado_url?: string | null
          concluintes?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dias_alerta_antes?: number
          empresa_id?: string
          id?: string
          instrutor?: string | null
          nome_curso?: string
          numero_certificado?: string | null
          observacoes?: string | null
          participantes?: number | null
          status?: string
          tipo_curso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "treinamentos_ssma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nome: string | null
          tipo_usuario: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id: string
          nome?: string | null
          tipo_usuario?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string | null
          tipo_usuario?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      auth_catalog_columns: {
        Row: {
          column_default: string | null
          column_name: string | null
          data_type: string | null
          not_null: boolean | null
          ordinal_position: number | null
          schema_name: string | null
          table_name: string | null
        }
        Relationships: []
      }
      auth_catalog_tables: {
        Row: {
          relkind: string | null
          schema_name: string | null
          table_name: string | null
        }
        Relationships: []
      }
      auth_core_counts_v: {
        Row: {
          count_error: string | null
          identities_count: number | null
          instances_count: number | null
          refresh_tokens_count: number | null
          sessions_count: number | null
          users_count: number | null
        }
        Relationships: []
      }
      auth_instances_snapshot_v: {
        Row: {
          instance_id: string | null
          instance_raw: Json | null
          read_error: string | null
        }
        Relationships: []
      }
      auth_runtime_diagnostics_v: {
        Row: {
          auth_config_hook_enabled_text: string | null
          auth_hooks_access_error: string | null
          auth_hooks_enabled_count: number | null
          has_auth_config_table: boolean | null
          has_auth_custom_hook: boolean | null
          has_auth_hooks_table: boolean | null
          has_public_custom_hook: boolean | null
        }
        Relationships: []
      }
      auth_schema_migrations_diag_v: {
        Row: {
          max_version: string | null
          migrations_count: number | null
          read_error: string | null
          sample_versions: string | null
        }
        Relationships: []
      }
      schema_inventory_columns: {
        Row: {
          column_default: string | null
          column_name: unknown
          data_type: string | null
          is_nullable: string | null
          ordinal_position: number | null
          table_name: unknown
          table_schema: unknown
        }
        Relationships: []
      }
      schema_inventory_fks: {
        Row: {
          column_name: string | null
          constraint_name: string | null
          foreign_column_name: string | null
          foreign_table_name: string | null
          foreign_table_schema: string | null
          table_name: string | null
          table_schema: string | null
        }
        Relationships: []
      }
      schema_inventory_functions: {
        Row: {
          args: string | null
          function_name: unknown
          function_schema: unknown
          language: unknown
          returns: string | null
        }
        Relationships: []
      }
      schema_inventory_tables: {
        Row: {
          table_name: unknown
          table_schema: unknown
          table_type: string | null
        }
        Relationships: []
      }
      v_audit_logs_recent: {
        Row: {
          actor_id: string | null
          created_at: string | null
          diferenca: Json | null
          empresa_id: string | null
          id: string | null
          ip_address: unknown
          operation: string | null
          record_id: string | null
          resultado: string | null
          table_name: string | null
          usuario_email: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          diferenca?: Json | null
          empresa_id?: string | null
          id?: string | null
          ip_address?: unknown
          operation?: string | null
          record_id?: string | null
          resultado?: string | null
          table_name?: string | null
          usuario_email?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          diferenca?: Json | null
          empresa_id?: string | null
          id?: string | null
          ip_address?: unknown
          operation?: string | null
          record_id?: string | null
          resultado?: string | null
          table_name?: string | null
          usuario_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_stats_by_empresa: {
        Row: {
          data: string | null
          empresa_id: string | null
          operation: string | null
          qtd: number | null
          resultado: string | null
          usuarios_unicos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dashboard_kpis: {
        Row: {
          empresa_id: string | null
          empresa_nome: string | null
          os_abertas: number | null
          os_fechadas: number | null
          total_equipamentos: number | null
          total_os: number | null
          total_planos_preventivos: number | null
        }
        Relationships: []
      }
      v_devices_bloqueados: {
        Row: {
          ativo: boolean | null
          bloqueado_ate: string | null
          bloqueado_em: string | null
          bloqueado_por: string | null
          bloqueado_por_nome: string | null
          device_id: string | null
          device_nome: string | null
          dispositivo_id: string | null
          empresa_id: string | null
          empresa_nome: string | null
          id: string | null
          motivo: string | null
          segundos_ate_liberacao: number | null
          tentativas_ultimas_1h: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mecanicos_blocked_devices_bloqueado_por_fkey"
            columns: ["bloqueado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "mecanicos_blocked_devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      v_empresa: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string | null
          nome: string | null
          nome_fantasia: string | null
          plano: string | null
          razao_social: string | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          plano?: string | null
          razao_social?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          plano?: string | null
          razao_social?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_mecanicos_online_agora: {
        Row: {
          codigo_acesso: string | null
          device_id: string | null
          device_nome: string | null
          device_os: string | null
          dispositivo_id: string | null
          empresa_id: string | null
          empresa_nome: string | null
          empresa_slug: string | null
          especialidade: string | null
          ip_address: unknown
          login_em: string | null
          mecanico_id: string | null
          mecanico_nome: string | null
          minutos_conectado: number | null
          os_atual_id: string | null
          os_equipamento: string | null
          session_id: string | null
          status: string | null
          tempo_decorrido: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_mecanicos_login_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_relatorio_mecanicos_sessoes: {
        Row: {
          codigo_acesso: string | null
          created_at: string | null
          device_nome: string | null
          dispositivo_id: string | null
          duracao_horas: number | null
          duracao_minutos: number | null
          empresa_id: string | null
          empresa_nome: string | null
          ip_address: unknown
          login_em: string | null
          logout_em: string | null
          mecanico_id: string | null
          mecanico_nome: string | null
          motivo_logout: string | null
          os_canceladas: number | null
          os_concluidas: number | null
          os_durante_sessao: number | null
          session_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_mecanicos_login_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_moveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_mecanicos_login_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "mecanicos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rls_policies_permissive_true: {
        Row: {
          cmd: string | null
          policyname: unknown
          qual: string | null
          schemaname: unknown
          tablename: unknown
          with_check: string | null
        }
        Relationships: []
      }
      v_tenant_tables_without_rls: {
        Row: {
          table_name: unknown
          table_schema: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_user_role: {
        Args: { p_empresa_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      app_capture_system_error: {
        Args: {
          p_empresa_id?: string
          p_endpoint?: string
          p_error_message?: string
          p_error_name?: string
          p_metadata?: Json
          p_request_id?: string
          p_severity?: string
          p_source?: string
          p_stack_trace?: string
          p_user_id?: string
        }
        Returns: string
      }
      app_check_rate_limit_ip: {
        Args: {
          p_block_seconds?: number
          p_identifier?: string
          p_max_requests?: number
          p_scope: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      app_write_audit_log:
        | {
            Args: {
              p_actor_id?: string
              p_correlacao_id?: string
              p_empresa_id: string
              p_ip_address?: unknown
              p_mensagem_erro?: string
              p_new_data?: Json
              p_old_data?: Json
              p_operation: string
              p_record_id?: string
              p_resultado?: string
              p_table_name: string
              p_user_agent?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_acao?: string
              p_correlacao_id?: string
              p_dados_antes?: Json
              p_dados_depois?: Json
              p_empresa_id: string
              p_impersonado_por_email?: string
              p_impersonado_por_id?: string
              p_ip_address?: unknown
              p_mensagem_erro?: string
              p_registro_id?: string
              p_resultado?: string
              p_tabela?: string
              p_user_agent?: string
              p_usuario_id?: string
            }
            Returns: string
          }
      app_write_operational_log:
        | {
            Args: {
              p_action?: string
              p_duration_ms?: number
              p_empresa_id?: string
              p_endpoint?: string
              p_error_message?: string
              p_metadata?: Json
              p_scope: string
              p_status_code?: number
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action?: string
              p_duration_ms?: number
              p_empresa_id?: string
              p_endpoint?: string
              p_error_message?: string
              p_metadata?: Json
              p_request_id?: string
              p_scope: string
              p_status_code?: number
              p_user_id?: string
            }
            Returns: string
          }
      archive_old_audit_logs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      assert_table_rls_enabled: {
        Args: { p_schema: string; p_table: string }
        Returns: boolean
      }
      atualizar_estoque_lubrificante: {
        Args: {
          p_lubrificante_id: string
          p_quantidade: number
          p_tipo: string
        }
        Returns: undefined
      }
      auth_core_counts: {
        Args: never
        Returns: {
          count_error: string
          identities_count: number
          instances_count: number
          refresh_tokens_count: number
          sessions_count: number
          users_count: number
        }[]
      }
      auth_instances_snapshot: {
        Args: never
        Returns: {
          instance_id: string
          instance_raw: Json
          read_error: string
        }[]
      }
      auth_rls_policy_probe: { Args: never; Returns: Json }
      auth_role_attributes_probe: { Args: never; Returns: Json }
      auth_role_membership_full_probe: { Args: never; Returns: Json }
      auth_runtime_deep_probe: { Args: { p_email?: string }; Returns: Json }
      auth_runtime_diagnostics: {
        Args: never
        Returns: {
          auth_config_hook_enabled_text: string
          auth_hooks_access_error: string
          auth_hooks_enabled_count: number
          has_auth_config_table: boolean
          has_auth_custom_hook: boolean
          has_auth_hooks_table: boolean
          has_public_custom_hook: boolean
        }[]
      }
      auth_runtime_privilege_probe: { Args: never; Returns: Json }
      auth_schema_migrations_diag: {
        Args: never
        Returns: {
          max_version: string
          migrations_count: number
          read_error: string
          sample_versions: string
        }[]
      }
      can_access_empresa: { Args: { p_empresa_id: string }; Returns: boolean }
      check_auth_integrity: {
        Args: never
        Returns: {
          check_name: string
          count: number
          details: Json
          severity: string
        }[]
      }
      check_company_plan_limit: {
        Args: {
          p_empresa_id: string
          p_increment?: number
          p_limit_type: string
        }
        Returns: boolean
      }
      check_company_storage_limit: {
        Args: { p_empresa_id: string; p_increment_bytes?: number }
        Returns: boolean
      }
      check_multitenant_governance: {
        Args: never
        Returns: {
          has_empresa_id: boolean
          null_empresa_rows: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      cleanup_log_validacoes_senha: { Args: never; Returns: undefined }
      cleanup_login_attempts: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      close_os_with_execution_atomic:
        | {
            Args: {
              p_acao_corretiva?: string
              p_causa_raiz?: string
              p_custo_mao_obra: number
              p_custo_materiais: number
              p_custo_terceiros: number
              p_custo_total: number
              p_data_fim: string
              p_data_inicio: string
              p_hora_fim: string
              p_hora_inicio: string
              p_licoes_aprendidas?: string
              p_materiais?: Json
              p_mecanico_id: string
              p_mecanico_nome: string
              p_modo_falha?: string
              p_os_id: string
              p_pausas?: Json
              p_servico_executado: string
              p_tempo_execucao: number
              p_usuario_fechamento?: string
            }
            Returns: {
              execucao_id: string
              os_id: string
              os_status: string
              total_custo: number
              total_materiais: number
            }[]
          }
        | {
            Args: {
              p_acao_corretiva?: string
              p_causa_raiz?: string
              p_custo_mao_obra: number
              p_custo_materiais: number
              p_custo_terceiros: number
              p_custo_total: number
              p_hora_fim: string
              p_hora_inicio: string
              p_licoes_aprendidas?: string
              p_materiais?: Json
              p_mecanico_id: string
              p_mecanico_nome: string
              p_modo_falha?: string
              p_os_id: string
              p_pausas?: Json
              p_servico_executado: string
              p_tempo_execucao: number
              p_usuario_fechamento?: string
            }
            Returns: {
              execucao_id: string
              os_id: string
              os_status: string
              total_custo: number
              total_materiais: number
            }[]
          }
      create_maintenance_action_suggestion: {
        Args: {
          p_descricao: string
          p_empresa_id: string
          p_metadata?: Json
          p_origin_id: string
          p_origin_type: string
          p_prioridade: string
          p_recommendation_type: string
          p_titulo: string
        }
        Returns: string
      }
      cron_enforce_subscription_expiry: { Args: never; Returns: undefined }
      current_empresa_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      dashboard_summary: { Args: { empresa_id: string }; Returns: Json }
      enqueue_system_notification: {
        Args: {
          p_channel: string
          p_empresa_id: string
          p_event_type: string
          p_payload: Json
          p_recipient: string
          p_scheduled_for?: string
        }
        Returns: string
      }
      ensure_updated_at_trigger: {
        Args: { p_table: unknown }
        Returns: undefined
      }
      format_duracao: { Args: { minutos: number }; Returns: string }
      get_current_empresa_id: { Args: never; Returns: string }
      get_empresa_info_by_id: {
        Args: { p_empresa_id: string }
        Returns: {
          id: string
          nome: string
          slug: string
          status: string
        }[]
      }
      get_login_branding_by_email: {
        Args: { p_email: string }
        Returns: {
          logo_login_url: string
          nome_fantasia: string
          razao_social: string
        }[]
      }
      has_permission: {
        Args: { p_empresa_id?: string; p_permission_code: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_control_plane_operator: { Args: never; Returns: boolean }
      is_feature_enabled: {
        Args: { p_empresa_id?: string; p_feature_key: string }
        Returns: boolean
      }
      is_master_ti: { Args: never; Returns: boolean }
      is_system_master: { Args: never; Returns: boolean }
      limpar_rate_limit_bloqueado: {
        Args: { p_admin_motivo?: string; p_dispositivo_id: string }
        Returns: Json
      }
      listar_mecanicos_empresa: {
        Args: { p_empresa_id: string }
        Returns: {
          id: string
          nome: string
          tipo: string
        }[]
      }
      log_audit_event:
        | {
            Args: {
              p_action: string
              p_empresa_id?: string
              p_endpoint?: string
              p_entity_id?: string
              p_entity_type: string
              p_execution_ms?: number
              p_ip_address?: string
              p_payload_json?: Json
              p_severity?: string
              p_source?: string
              p_user_agent?: string
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_empresa_id?: string
              p_endpoint?: string
              p_entity_id?: string
              p_entity_type: string
              p_execution_ms?: number
              p_ip_address?: string
              p_payload_json?: Json
              p_request_id?: string
              p_severity?: string
              p_source?: string
              p_user_agent?: string
              p_user_id?: string
            }
            Returns: string
          }
      login_mecanico: {
        Args: { p_codigo: string; p_empresa_id: string; p_senha: string }
        Returns: Json
      }
      marcar_os_como_vista: {
        Args: { p_os_id: string; p_usuario_id: string }
        Returns: Json
      }
      owner_list_database_tables:
        | {
            Args: never
            Returns: {
              has_empresa_id: boolean
              table_name: string
              total_rows: number
            }[]
          }
        | {
            Args: { p_empresa_id?: string }
            Returns: {
              has_empresa_id: boolean
              table_name: string
              total_rows: number
            }[]
          }
      owner_status_en_to_pt: { Args: { input_status: string }; Returns: string }
      owner_status_pt_to_en: { Args: { input_status: string }; Returns: string }
      process_pending_system_notifications: {
        Args: { p_limit?: number }
        Returns: {
          details: string
          notification_id: string
          processed_status: string
        }[]
      }
      purge_soft_deleted_empresas: { Args: never; Returns: undefined }
      refresh_all_dashboard_summaries: { Args: never; Returns: undefined }
      refresh_company_usage_metrics: {
        Args: { p_metric_month?: string }
        Returns: number
      }
      refresh_mv_dashboard_summary: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      registrar_login_mecanico: {
        Args: {
          p_codigo_acesso?: string
          p_device_name?: string
          p_device_token?: string
          p_dispositivo_id?: string
          p_empresa_id: string
          p_ip_address?: unknown
          p_mecanico_id?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      registrar_logout_mecanico: {
        Args: { p_motivo?: string; p_session_id: string }
        Returns: Json
      }
      registrar_tentativa_login: {
        Args: {
          p_codigo_acesso: string
          p_dispositivo_id: string
          p_empresa_id: string
          p_ip_address?: unknown
          p_motivo_falha?: string
          p_sucesso: boolean
          p_user_agent?: string
        }
        Returns: Json
      }
      resolve_empresa_id_by_slug: { Args: { p_slug: string }; Returns: string }
      resolve_user_tenant_context: {
        Args: { p_user_id: string }
        Returns: {
          empresa_id: string
          empresa_slug: string
          force_password_change: boolean
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      resolver_empresa_mecanico: {
        Args: { p_codigo_acesso: string }
        Returns: string
      }
      restore_empresa: {
        Args: { p_actor_id: string; p_empresa_id: string }
        Returns: Json
      }
      restore_soft_deleted_record: {
        Args: { p_id: string; p_table_name: string }
        Returns: boolean
      }
      run_multitenant_rls_suite: {
        Args: never
        Returns: {
          details: string
          passed: boolean
          test_name: string
        }[]
      }
      search_equipamentos: {
        Args: { limit_val?: number; offset_val?: number; search_term?: string }
        Returns: {
          empresa_id: string
          fabricante: string
          id: string
          localizacao: string
          modelo: string
          nome: string
          total_count: number
        }[]
      }
      sign_my_contract: { Args: { p_contract_id: string }; Returns: undefined }
      soft_delete_empresa: {
        Args: { p_actor_id: string; p_empresa_id: string }
        Returns: Json
      }
      validar_credenciais_mecanico_servidor: {
        Args: {
          p_codigo_acesso?: string
          p_device_name?: string
          p_dispositivo_id?: string
          p_empresa_id: string
          p_ip_address?: unknown
          p_senha_acesso?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      validar_senha_mecanico: {
        Args: { p_mecanico_id: string; p_senha: string }
        Returns: boolean
      }
      verificar_dispositivo: { Args: { p_device_token: string }; Returns: Json }
      vincular_dispositivo: {
        Args: {
          p_device_id: string
          p_device_nome?: string
          p_device_os?: string
          p_qr_token: string
        }
        Returns: Json
      }
      vincular_dispositivo_por_qr:
        | {
            Args: {
              p_device_id: string
              p_device_info?: Json
              p_qr_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_device_id: string
              p_device_nome?: string
              p_device_os?: string
              p_qr_token: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "USUARIO"
        | "MASTER_TI"
        | "SYSTEM_OWNER"
        | "SYSTEM_ADMIN"
        | "OWNER"
        | "MANAGER"
        | "PLANNER"
        | "TECHNICIAN"
        | "VIEWER"
        | "SOLICITANTE"
        | "OWNER_MASTER"
        | "OWNER_SYSTEM"
        | "ADMIN_TI"
        | "USER"
        | "MECANICO"
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
      app_role: [
        "ADMIN",
        "USUARIO",
        "MASTER_TI",
        "SYSTEM_OWNER",
        "SYSTEM_ADMIN",
        "OWNER",
        "MANAGER",
        "PLANNER",
        "TECHNICIAN",
        "VIEWER",
        "SOLICITANTE",
        "OWNER_MASTER",
        "OWNER_SYSTEM",
        "ADMIN_TI",
        "USER",
        "MECANICO",
      ],
    },
  },
} as const
