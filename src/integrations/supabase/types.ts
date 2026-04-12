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
          descricao: string | null
          empresa_id: string
          id: string
          prazo: string | null
          rca_id: string | null
          responsavel: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          prazo?: string | null
          rca_id?: string | null
          responsavel?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          prazo?: string | null
          rca_id?: string | null
          responsavel?: string | null
          status?: string | null
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
            foreignKeyName: "acoes_corretivas_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "analise_causa_raiz"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_causa_raiz: {
        Row: {
          arvore_falhas: Json | null
          causa_raiz: string | null
          causa_raiz_identificada: string | null
          created_at: string
          data_conclusao: string | null
          descricao_problema: string | null
          diagrama_ishikawa: Json | null
          eficacia_verificada: boolean | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          metodo_analise: string | null
          metodologia: string | null
          numero_rca: string | null
          os_id: string | null
          porque_1: string | null
          porque_2: string | null
          porque_3: string | null
          porque_4: string | null
          porque_5: string | null
          preventive_actions: Json | null
          problema: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          tag: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          arvore_falhas?: Json | null
          causa_raiz?: string | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao_problema?: string | null
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          metodologia?: string | null
          numero_rca?: string | null
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          preventive_actions?: Json | null
          problema?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          arvore_falhas?: Json | null
          causa_raiz?: string | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao_problema?: string | null
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          metodologia?: string | null
          numero_rca?: string | null
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          preventive_actions?: Json | null
          problema?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
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
      anomalias_inspecao: {
        Row: {
          created_at: string
          criticidade: string | null
          descricao: string | null
          empresa_id: string
          id: string
          inspecao_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criticidade?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          inspecao_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criticidade?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          inspecao_id?: string
          status?: string | null
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
            foreignKeyName: "areas_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_lubrificacao: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          plano_id: string
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
        ]
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
            foreignKeyName: "componentes_equipamento_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          categoria: string | null
          chave: string
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          tipo: string | null
          updated_at: string
          valor: Json
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor?: Json
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          empresa_id: string
          fornecedor_id: string
          id: string
          numero: string | null
          numero_contrato: string | null
          penalidade_descricao: string | null
          responsavel_nome: string | null
          sla_atendimento_horas: number | null
          sla_resolucao_horas: number | null
          status: string | null
          tipo: string | null
          titulo: string | null
          updated_at: string
          valor: number | null
          valor_mensal: number | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id: string
          fornecedor_id: string
          id?: string
          numero?: string | null
          numero_contrato?: string | null
          penalidade_descricao?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number | null
          sla_resolucao_horas?: number | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
          valor?: number | null
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id?: string
          fornecedor_id?: string
          id?: string
          numero?: string | null
          numero_contrato?: string | null
          penalidade_descricao?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number | null
          sla_resolucao_horas?: number | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
          valor?: number | null
          valor_mensal?: number | null
          valor_total?: number | null
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
          created_at: string
          email: string | null
          empresa_id: string
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logo_os_url: string | null
          logo_url: string | null
          nome_fantasia: string | null
          razao_social: string | null
          responsavel_cargo: string | null
          responsavel_nome: string | null
          site: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_os_url?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_os_url?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          id: string
          empresa_id: string
          nome_exibicao: string | null
          dominio_custom: string | null
          logo_url: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          inactivity_timeout_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome_exibicao?: string | null
          dominio_custom?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          inactivity_timeout_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome_exibicao?: string | null
          dominio_custom?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          inactivity_timeout_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
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
        Relationships: [
          {
            foreignKeyName: "document_sequences_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_tecnicos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          id: string
          revisao: string | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          revisao?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          revisao?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
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
            foreignKeyName: "documentos_tecnicos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_refactor_contract: {
        Row: {
          function_name: string
          id: string
          must_require_jwt: boolean
          must_use_enterprise_audit: boolean
          must_use_tenant_scope: boolean
          status: string
          updated_at: string
        }
        Insert: {
          function_name: string
          id?: string
          must_require_jwt?: boolean
          must_use_enterprise_audit?: boolean
          must_use_tenant_scope?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          function_name?: string
          id?: string
          must_require_jwt?: boolean
          must_use_enterprise_audit?: boolean
          must_use_tenant_scope?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string | null
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_audit_logs: {
        Row: {
          action_type: string | null
          actor_id: string | null
          created_at: string
          details: Json
          empresa_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string | null
          record_id: string | null
          severity: string
          source: string
          table_name: string | null
        }
        Insert: {
          action_type?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          empresa_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string | null
          severity?: string
          source?: string
          table_name?: string | null
        }
        Update: {
          action_type?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          empresa_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string | null
          severity?: string
          source?: string
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
          empresa_id: string
          fabricante: string | null
          id: string
          localizacao: string | null
          modelo: string | null
          nivel_risco: string
          nome: string
          numero_serie: string | null
          sistema_id: string | null
          tag: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criticidade?: string
          data_instalacao?: string | null
          empresa_id: string
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nivel_risco?: string
          nome: string
          numero_serie?: string | null
          sistema_id?: string | null
          tag: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criticidade?: string
          data_instalacao?: string | null
          empresa_id?: string
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nivel_risco?: string
          nome?: string
          numero_serie?: string | null
          sistema_id?: string | null
          tag?: string
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
            foreignKeyName: "equipamentos_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_lubrificacao: {
        Row: {
          created_at: string
          data_execucao: string
          empresa_id: string
          executor_nome: string
          id: string
          observacoes: string | null
          os_gerada_id: string | null
          plano_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_execucao?: string
          empresa_id: string
          executor_nome: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_execucao?: string
          empresa_id?: string
          executor_nome?: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id?: string
          status?: string | null
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
          created_at: string
          custo_mao_obra: number | null
          custo_materiais: number | null
          custo_terceiros: number | null
          custo_total: number | null
          data_execucao: string | null
          empresa_id: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          mecanico_id: string | null
          mecanico_nome: string | null
          os_id: string
          servico_executado: string | null
          tempo_execucao: number | null
        }
        Insert: {
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string | null
          empresa_id: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          os_id: string
          servico_executado?: string | null
          tempo_execucao?: number | null
        }
        Update: {
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string | null
          empresa_id?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          mecanico_id?: string | null
          mecanico_nome?: string | null
          os_id?: string
          servico_executado?: string | null
          tempo_execucao?: number | null
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
      fmea: {
        Row: {
          acao_recomendada: string | null
          causa: string | null
          causa_falha: string | null
          created_at: string
          deteccao: number | null
          efeito: string | null
          efeito_falha: string | null
          empresa_id: string
          equipamento_id: string | null
          falha_funcional: string | null
          funcao: string | null
          id: string
          modo_falha: string | null
          ocorrencia: number | null
          prazo: string | null
          responsavel: string | null
          rpn: number | null
          severidade: number | null
          status: string | null
          tag: string | null
          updated_at: string
        }
        Insert: {
          acao_recomendada?: string | null
          causa?: string | null
          causa_falha?: string | null
          created_at?: string
          deteccao?: number | null
          efeito?: string | null
          efeito_falha?: string | null
          empresa_id: string
          equipamento_id?: string | null
          falha_funcional?: string | null
          funcao?: string | null
          id?: string
          modo_falha?: string | null
          ocorrencia?: number | null
          prazo?: string | null
          responsavel?: string | null
          rpn?: number | null
          severidade?: number | null
          status?: string | null
          tag?: string | null
          updated_at?: string
        }
        Update: {
          acao_recomendada?: string | null
          causa?: string | null
          causa_falha?: string | null
          created_at?: string
          deteccao?: number | null
          efeito?: string | null
          efeito_falha?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          falha_funcional?: string | null
          funcao?: string | null
          id?: string
          modo_falha?: string | null
          ocorrencia?: number | null
          prazo?: string | null
          responsavel?: string | null
          rpn?: number | null
          severidade?: number | null
          status?: string | null
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
          ativo: boolean
          cnpj: string | null
          contato: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
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
        ]
      }
      incidentes_ssma: {
        Row: {
          acoes_imediatas: string | null
          causas_basicas: string | null
          causas_imediatas: string | null
          created_at: string
          custo_estimado: number | null
          data_incidente: string | null
          data_ocorrencia: string | null
          descricao: string | null
          dias_afastamento: number | null
          empresa_id: string
          equipamento_id: string | null
          gravidade: string | null
          id: string
          local_ocorrencia: string | null
          numero_incidente: string | null
          pessoas_envolvidas: string | null
          rca_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          severidade: string | null
          status: string | null
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
          data_incidente?: string | null
          data_ocorrencia?: string | null
          descricao?: string | null
          dias_afastamento?: number | null
          empresa_id: string
          equipamento_id?: string | null
          gravidade?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: string | null
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          status?: string | null
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
          data_incidente?: string | null
          data_ocorrencia?: string | null
          descricao?: string | null
          dias_afastamento?: number | null
          empresa_id?: string
          equipamento_id?: string | null
          gravidade?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: string | null
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          status?: string | null
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
            foreignKeyName: "inspecoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
            foreignKeyName: "maintenance_schedule_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          empresa_id: string
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          nome: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
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
          empresa_id: string
          escala_trabalho: string | null
          especialidade: string | null
          ferias_fim: string | null
          ferias_inicio: string | null
          folgas_planejadas: string | null
          id: string
          nome: string
          senha_hash: string | null
          telefone: string | null
          tipo: string | null
          ultimo_login_portal: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_acesso?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id: string
          escala_trabalho?: string | null
          especialidade?: string | null
          ferias_fim?: string | null
          ferias_inicio?: string | null
          folgas_planejadas?: string | null
          id?: string
          nome: string
          senha_hash?: string | null
          telefone?: string | null
          tipo?: string | null
          ultimo_login_portal?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_acesso?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string
          escala_trabalho?: string | null
          especialidade?: string | null
          ferias_fim?: string | null
          ferias_inicio?: string | null
          folgas_planejadas?: string | null
          id?: string
          nome?: string
          senha_hash?: string | null
          telefone?: string | null
          tipo?: string | null
          ultimo_login_portal?: string | null
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
          unidade: string | null
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
          unidade?: string | null
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
          unidade?: string | null
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
          ganho_estimado: number | null
          id: string
          numero_melhoria: string | null
          padronizada: boolean
          proponente_id: string | null
          proponente_nome: string | null
          roi_meses: number | null
          situacao_antes: string | null
          situacao_depois: string | null
          status: string | null
          tag: string | null
          tipo: string | null
          titulo: string | null
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
          ganho_estimado?: number | null
          id?: string
          numero_melhoria?: string | null
          padronizada?: boolean
          proponente_id?: string | null
          proponente_nome?: string | null
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo?: string | null
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
          ganho_estimado?: number | null
          id?: string
          numero_melhoria?: string | null
          padronizada?: boolean
          proponente_id?: string | null
          proponente_nome?: string | null
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo?: string | null
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
            foreignKeyName: "melhorias_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
      ordens_servico: {
        Row: {
          created_at: string
          data_fechamento: string | null
          data_solicitacao: string
          empresa_id: string
          equipamento: string | null
          id: string
          numero_os: number
          prioridade: string
          problema: string | null
          solicitante: string | null
          status: string
          tag: string | null
          tempo_estimado: number | null
          tipo: string
          updated_at: string
          usuario_abertura: string | null
        }
        Insert: {
          created_at?: string
          data_fechamento?: string | null
          data_solicitacao?: string
          empresa_id: string
          equipamento?: string | null
          id?: string
          numero_os?: number
          prioridade: string
          problema?: string | null
          solicitante?: string | null
          status: string
          tag?: string | null
          tempo_estimado?: number | null
          tipo: string
          updated_at?: string
          usuario_abertura?: string | null
        }
        Update: {
          created_at?: string
          data_fechamento?: string | null
          data_solicitacao?: string
          empresa_id?: string
          equipamento?: string | null
          id?: string
          numero_os?: number
          prioridade?: string
          problema?: string | null
          solicitante?: string | null
          status?: string
          tag?: string | null
          tempo_estimado?: number | null
          tipo?: string
          updated_at?: string
          usuario_abertura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
          descricao_servico: string | null
          empresa_id: string
          epis_requeridos: string | null
          equipamento_id: string | null
          executante_nome: string | null
          id: string
          isolamentos: string | null
          medidas_controle: string | null
          numero: string | null
          numero_pt: string | null
          observacoes: string | null
          os_id: string | null
          riscos_identificados: string | null
          status: string | null
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
          descricao_servico?: string | null
          empresa_id: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome?: string | null
          id?: string
          isolamentos?: string | null
          medidas_controle?: string | null
          numero?: string | null
          numero_pt?: string | null
          observacoes?: string | null
          os_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
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
          descricao_servico?: string | null
          empresa_id?: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome?: string | null
          id?: string
          isolamentos?: string | null
          medidas_controle?: string | null
          numero?: string | null
          numero_pt?: string | null
          observacoes?: string | null
          os_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
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
      planos_lubrificacao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          lubrificante: string | null
          nome: string
          periodicidade: number | null
          ponto_lubrificacao: string | null
          prioridade: string | null
          proxima_execucao: string | null
          responsavel_nome: string | null
          status: string | null
          tempo_estimado: number | null
          tipo_periodicidade: string | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          lubrificante?: string | null
          nome: string
          periodicidade?: number | null
          ponto_lubrificacao?: string | null
          prioridade?: string | null
          proxima_execucao?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tempo_estimado?: number | null
          tipo_periodicidade?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          lubrificante?: string | null
          nome?: string
          periodicidade?: number | null
          ponto_lubrificacao?: string | null
          prioridade?: string | null
          proxima_execucao?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tempo_estimado?: number | null
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
            foreignKeyName: "planos_lubrificacao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
            foreignKeyName: "planos_preventivos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantas: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
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
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string
          force_password_change: boolean
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id: string
          force_password_change?: boolean
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string
          force_password_change?: boolean
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string
          empresa_id: string | null
          hits: number
          id: string
          key: string
          window_started_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          hits?: number
          id?: string
          key: string
          window_started_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          hits?: number
          id?: string
          key?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
        }
        Relationships: []
      }
      rbac_user_roles: {
        Row: {
          created_at: string
          empresa_id: string | null
          granted_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          granted_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          granted_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          empresa_id: string | null
          event_type: string
          id: string
          metadata: Json
          severity: string
          source: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          empresa_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          severity?: string
          source?: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          empresa_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          severity?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
        ]
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
        ]
      }
      plans: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          user_limit: number
          asset_limit: number
          os_limit: number
          storage_limit_mb: number
          price_month: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          user_limit?: number
          asset_limit?: number
          os_limit?: number
          storage_limit_mb?: number
          price_month?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          user_limit?: number
          asset_limit?: number
          os_limit?: number
          storage_limit_mb?: number
          price_month?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          empresa_id: string
          plan_id: string
          status: string
          renewal_at: string | null
          trial_ends_at: string | null
          payment_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          plan_id: string
          status?: string
          renewal_at?: string | null
          trial_ends_at?: string | null
          payment_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          plan_id?: string
          status?: string
          renewal_at?: string | null
          trial_ends_at?: string | null
          payment_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
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
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          id: string
          empresa_id: string
          requester_user_id: string | null
          status: string
          priority: string
          subject: string
          message: string
          owner_notes: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          requester_user_id?: string | null
          status?: string
          priority?: string
          subject: string
          message: string
          owner_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          requester_user_id?: string | null
          status?: string
          priority?: string
          subject?: string
          message?: string
          owner_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
        ]
      }
      lubrificantes: {
        Row: {
          ativo: boolean
          codigo: string
          cor_identificacao: string | null
          created_at: string
          empresa_id: string
          estoque_atual: number | null
          estoque_minimo: number | null
          fabricante: string | null
          id: string
          nome: string
          tipo: string | null
          unidade_medida: string | null
          updated_at: string
          viscosidade: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor_identificacao?: string | null
          created_at?: string
          empresa_id: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          id?: string
          nome: string
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string
          viscosidade?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor_identificacao?: string | null
          created_at?: string
          empresa_id?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          unidade_medida?: string | null
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
        ]
      }
      paradas_equipamento: {
        Row: {
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          fim: string | null
          id: string
          inicio: string | null
          mecanico_id: string | null
          mecanico_nome: string | null
          observacao: string | null
          os_id: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          mecanico_id?: string | null
          mecanico_nome?: string | null
          observacao?: string | null
          os_id?: string | null
          tipo?: string | null
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
          quantidade: number | null
          status: string | null
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
          quantidade?: number | null
          status?: string | null
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
          quantidade?: number | null
          status?: string | null
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
        ]
      }
      rotas_lubrificacao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          empresa_id: string
          frequencia: string | null
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
          frequencia?: string | null
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
          frequencia?: string | null
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
        ]
      }
      rotas_lubrificacao_pontos: {
        Row: {
          codigo_ponto: string | null
          created_at: string
          descricao: string | null
          equipamento_tag: string | null
          ferramenta: string | null
          id: string
          imagem_url: string | null
          instrucoes: string | null
          localizacao: string | null
          lubrificante: string | null
          ordem: number | null
          plano_id: string | null
          quantidade: string | null
          referencia_manual: string | null
          requer_parada: boolean | null
          rota_id: string | null
          tempo_estimado_min: number | null
        }
        Insert: {
          codigo_ponto?: string | null
          created_at?: string
          descricao?: string | null
          equipamento_tag?: string | null
          ferramenta?: string | null
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          ordem?: number | null
          plano_id?: string | null
          quantidade?: string | null
          referencia_manual?: string | null
          requer_parada?: boolean | null
          rota_id?: string | null
          tempo_estimado_min?: number | null
        }
        Update: {
          codigo_ponto?: string | null
          created_at?: string
          descricao?: string | null
          equipamento_tag?: string | null
          ferramenta?: string | null
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          localizacao?: string | null
          lubrificante?: string | null
          ordem?: number | null
          plano_id?: string | null
          quantidade?: string | null
          referencia_manual?: string | null
          requer_parada?: boolean | null
          rota_id?: string | null
          tempo_estimado_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_lubrificacao_pontos_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas_lubrificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_manutencao: {
        Row: {
          classificacao: string | null
          created_at: string
          data_aprovacao: string | null
          data_limite: string | null
          descricao_falha: string | null
          empresa_id: string
          equipamento_id: string | null
          id: string
          impacto: string | null
          numero_solicitacao: string | null
          observacoes: string | null
          os_id: string | null
          sla_horas: number | null
          solicitante_nome: string | null
          solicitante_setor: string | null
          status: string | null
          tag: string | null
          updated_at: string
          usuario_aprovacao: string | null
        }
        Insert: {
          classificacao?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_limite?: string | null
          descricao_falha?: string | null
          empresa_id: string
          equipamento_id?: string | null
          id?: string
          impacto?: string | null
          numero_solicitacao?: string | null
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number | null
          solicitante_nome?: string | null
          solicitante_setor?: string | null
          status?: string | null
          tag?: string | null
          updated_at?: string
          usuario_aprovacao?: string | null
        }
        Update: {
          classificacao?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_limite?: string | null
          descricao_falha?: string | null
          empresa_id?: string
          equipamento_id?: string | null
          id?: string
          impacto?: string | null
          numero_solicitacao?: string | null
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number | null
          solicitante_nome?: string | null
          solicitante_setor?: string | null
          status?: string | null
          tag?: string | null
          updated_at?: string
          usuario_aprovacao?: string | null
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
            foreignKeyName: "solicitacoes_manutencao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_manutencao_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_ssma: {
        Row: {
          carga_horaria: number | null
          certificado_url: string | null
          colaborador_id: string | null
          colaborador_nome: string | null
          created_at: string
          data_realizacao: string | null
          data_validade: string | null
          dias_alerta_antes: number | null
          empresa_id: string
          id: string
          instituicao: string | null
          nome_curso: string | null
          numero_certificado: string | null
          observacoes: string | null
          status: string | null
          tipo_curso: string | null
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          certificado_url?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          data_realizacao?: string | null
          data_validade?: string | null
          dias_alerta_antes?: number | null
          empresa_id: string
          id?: string
          instituicao?: string | null
          nome_curso?: string | null
          numero_certificado?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_curso?: string | null
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          certificado_url?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          data_realizacao?: string | null
          data_validade?: string | null
          dias_alerta_antes?: number | null
          empresa_id?: string
          id?: string
          instituicao?: string | null
          nome_curso?: string | null
          numero_certificado?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_curso?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_write_audit_log: {
        Args: {
          p_action: string
          p_correlation_id?: string
          p_empresa_id?: string
          p_metadata?: Json
          p_record_id?: string
          p_severity?: string
          p_source?: string
          p_table: string
        }
        Returns: string
      }
      get_current_empresa_id: { Args: never; Returns: string }
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
    }
    Enums: {
      app_role: "ADMIN" | "USUARIO" | "MASTER_TI" | "SYSTEM_OWNER"
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
      app_role: ["ADMIN", "USUARIO", "MASTER_TI", "SYSTEM_OWNER"],
    },
  },
} as const
