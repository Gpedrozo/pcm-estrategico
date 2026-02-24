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
          data_conclusao: string | null
          descricao: string
          evidencias: string | null
          id: string
          observacoes: string | null
          prazo: string
          rca_id: string | null
          responsavel_id: string | null
          responsavel_nome: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          descricao: string
          evidencias?: string | null
          id?: string
          observacoes?: string | null
          prazo: string
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          descricao?: string
          evidencias?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
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
          equipamento_id: string | null
          generated_at: string
          id: string
          main_hypothesis: string | null
          possible_causes: Json | null
          preventive_actions: Json | null
          raw_response: Json | null
          summary: string | null
          tag: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          criticality?: string | null
          equipamento_id?: string | null
          generated_at?: string
          id?: string
          main_hypothesis?: string | null
          possible_causes?: Json | null
          preventive_actions?: Json | null
          raw_response?: Json | null
          summary?: string | null
          tag: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          criticality?: string | null
          equipamento_id?: string | null
          generated_at?: string
          id?: string
          main_hypothesis?: string | null
          possible_causes?: Json | null
          preventive_actions?: Json | null
          raw_response?: Json | null
          summary?: string | null
          tag?: string
        }
        Relationships: [
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
          descricao_problema: string
          diagrama_ishikawa: Json | null
          eficacia_verificada: boolean | null
          equipamento_id: string | null
          id: string
          metodo_analise: string | null
          numero_rca: number
          os_id: string | null
          porque_1: string | null
          porque_2: string | null
          porque_3: string | null
          porque_4: string | null
          porque_5: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          tag: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arvore_falhas?: Json | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao_problema: string
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          numero_rca?: number
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arvore_falhas?: Json | null
          causa_raiz_identificada?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao_problema?: string
          diagrama_ishikawa?: Json | null
          eficacia_verificada?: boolean | null
          equipamento_id?: string | null
          id?: string
          metodo_analise?: string | null
          numero_rca?: number
          os_id?: string | null
          porque_1?: string | null
          porque_2?: string | null
          porque_3?: string | null
          porque_4?: string | null
          porque_5?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
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
          descricao: string
          equipamento_id: string | null
          foto_url: string | null
          id: string
          inspecao_id: string | null
          os_gerada_id: string | null
          severidade: string | null
          status: string | null
          tag: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          equipamento_id?: string | null
          foto_url?: string | null
          id?: string
          inspecao_id?: string | null
          os_gerada_id?: string | null
          severidade?: string | null
          status?: string | null
          tag?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          equipamento_id?: string | null
          foto_url?: string | null
          id?: string
          inspecao_id?: string | null
          os_gerada_id?: string | null
          severidade?: string | null
          status?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomalias_inspecao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalias_inspecao_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalias_inspecao_os_gerada_id_fkey"
            columns: ["os_gerada_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
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
          id?: string
          nome?: string
          planta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_preventivas: {
        Row: {
          created_at: string
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
            foreignKeyName: "atividades_preventivas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_preventivos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          data_hora: string
          descricao: string
          id: string
          tag: string | null
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          data_hora?: string
          descricao: string
          id?: string
          tag?: string | null
          usuario_id?: string | null
          usuario_nome: string
        }
        Update: {
          acao?: string
          data_hora?: string
          descricao?: string
          id?: string
          tag?: string | null
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      auditoria_logs: {
        Row: {
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          operacao?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      avaliacoes_fornecedores: {
        Row: {
          avaliador_id: string | null
          avaliador_nome: string
          comentarios: string | null
          contrato_id: string | null
          created_at: string
          fornecedor_id: string | null
          id: string
          nota_custo: number | null
          nota_geral: number | null
          nota_prazo: number | null
          nota_qualidade: number | null
          nota_seguranca: number | null
          os_id: string | null
        }
        Insert: {
          avaliador_id?: string | null
          avaliador_nome: string
          comentarios?: string | null
          contrato_id?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nota_custo?: number | null
          nota_geral?: number | null
          nota_prazo?: number | null
          nota_qualidade?: number | null
          nota_seguranca?: number | null
          os_id?: string | null
        }
        Update: {
          avaliador_id?: string | null
          avaliador_nome?: string
          comentarios?: string | null
          contrato_id?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nota_custo?: number | null
          nota_geral?: number | null
          nota_prazo?: number | null
          nota_qualidade?: number | null
          nota_seguranca?: number | null
          os_id?: string | null
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
            foreignKeyName: "avaliacoes_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      componentes_equipamento: {
        Row: {
          ativo: boolean | null
          codigo: string
          corrente: string | null
          created_at: string
          data_instalacao: string | null
          dimensoes: Json | null
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
          tipo: string
          ultima_manutencao: string | null
          updated_at: string
          vida_util_horas: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          corrente?: string | null
          created_at?: string
          data_instalacao?: string | null
          dimensoes?: Json | null
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
          tipo: string
          ultima_manutencao?: string | null
          updated_at?: string
          vida_util_horas?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          corrente?: string | null
          created_at?: string
          data_instalacao?: string | null
          dimensoes?: Json | null
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
          tipo?: string
          ultima_manutencao?: string | null
          updated_at?: string
          vida_util_horas?: number | null
        }
        Relationships: [
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
          created_at: string
          descricao: string | null
          editavel: boolean | null
          id: string
          tipo: string | null
          updated_at: string
          valor: string | null
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string
          descricao?: string | null
          editavel?: boolean | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string
          descricao?: string | null
          editavel?: boolean | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      contrato_alertas: {
        Row: {
          contrato_id: string
          created_at: string | null
          id: string
          mensagem: string
          tipo: string
          visualizado: boolean | null
        }
        Insert: {
          contrato_id: string
          created_at?: string | null
          id?: string
          mensagem: string
          tipo: string
          visualizado?: boolean | null
        }
        Update: {
          contrato_id?: string
          created_at?: string | null
          id?: string
          mensagem?: string
          tipo?: string
          visualizado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_alertas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
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
          fornecedor_id: string | null
          id: string
          numero_contrato: string
          penalidade_descricao: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          sla_atendimento_horas: number | null
          sla_resolucao_horas: number | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          valor_mensal: number | null
          valor_total: number | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_contrato: string
          penalidade_descricao?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number | null
          sla_resolucao_horas?: number | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_contrato?: string
          penalidade_descricao?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sla_atendimento_horas?: number | null
          sla_resolucao_horas?: number | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Relationships: [
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
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logo_login_url: string | null
          logo_menu_url: string | null
          logo_os_url: string | null
          logo_pdf_url: string | null
          logo_principal_url: string | null
          logo_relatorio_url: string | null
          nome_fantasia: string | null
          razao_social: string
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
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_login_url?: string | null
          logo_menu_url?: string | null
          logo_os_url?: string | null
          logo_pdf_url?: string | null
          logo_principal_url?: string | null
          logo_relatorio_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string
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
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_login_url?: string | null
          logo_menu_url?: string | null
          logo_os_url?: string | null
          logo_pdf_url?: string | null
          logo_principal_url?: string | null
          logo_relatorio_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      document_layouts: {
        Row: {
          ativo: boolean
          autor_nome: string | null
          configuracao: Json
          created_at: string
          id: string
          nome: string
          tipo_documento: string
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          autor_nome?: string | null
          configuracao?: Json
          created_at?: string
          id?: string
          nome: string
          tipo_documento: string
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          autor_nome?: string | null
          configuracao?: Json
          created_at?: string
          id?: string
          nome?: string
          tipo_documento?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      document_sequences: {
        Row: {
          created_at: string
          id: string
          prefixo: string
          tipo_documento: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prefixo: string
          tipo_documento: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prefixo?: string
          tipo_documento?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      documentos_tecnicos: {
        Row: {
          aprovador_id: string | null
          aprovador_nome: string | null
          arquivo_nome: string | null
          arquivo_tamanho: number | null
          arquivo_url: string | null
          codigo: string
          created_at: string
          data_aprovacao: string | null
          data_validade: string | null
          descricao: string | null
          equipamento_id: string | null
          id: string
          status: string | null
          tag: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          versao: string | null
        }
        Insert: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_url?: string | null
          codigo: string
          created_at?: string
          data_aprovacao?: string | null
          data_validade?: string | null
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          versao?: string | null
        }
        Update: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          arquivo_url?: string | null
          codigo?: string
          created_at?: string
          data_aprovacao?: string | null
          data_validade?: string | null
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_tecnicos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
            foreignKeyName: "equipamentos_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
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
          data_execucao: string
          hora_fim: string
          hora_inicio: string
          id: string
          mecanico_id: string | null
          mecanico_nome: string
          os_id: string
          servico_executado: string
          tempo_execucao: number
        }
        Insert: {
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string
          hora_fim: string
          hora_inicio: string
          id?: string
          mecanico_id?: string | null
          mecanico_nome: string
          os_id: string
          servico_executado: string
          tempo_execucao: number
        }
        Update: {
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          custo_total?: number | null
          data_execucao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          mecanico_id?: string | null
          mecanico_nome?: string
          os_id?: string
          servico_executado?: string
          tempo_execucao?: number
        }
        Relationships: [
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
          executor_id: string | null
          executor_nome: string
          id: string
          observacoes: string | null
          os_gerada_id: string | null
          plano_id: string
          status: string
          tempo_real_min: number | null
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          data_execucao?: string
          executor_id?: string | null
          executor_nome: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id: string
          status?: string
          tempo_real_min?: number | null
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          data_execucao?: string
          executor_id?: string | null
          executor_nome?: string
          id?: string
          observacoes?: string | null
          os_gerada_id?: string | null
          plano_id?: string
          status?: string
          tempo_real_min?: number | null
          updated_at?: string
        }
        Relationships: [
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
          causa_falha: string | null
          created_at: string
          deteccao: number | null
          efeito_falha: string | null
          equipamento_id: string | null
          falha_funcional: string
          funcao: string
          id: string
          modo_falha: string
          ocorrencia: number | null
          plano_preventivo_id: string | null
          prazo: string | null
          responsavel: string | null
          rpn: number | null
          severidade: number | null
          status: string | null
          tag: string
          updated_at: string
        }
        Insert: {
          acao_recomendada?: string | null
          causa_falha?: string | null
          created_at?: string
          deteccao?: number | null
          efeito_falha?: string | null
          equipamento_id?: string | null
          falha_funcional: string
          funcao: string
          id?: string
          modo_falha: string
          ocorrencia?: number | null
          plano_preventivo_id?: string | null
          prazo?: string | null
          responsavel?: string | null
          rpn?: number | null
          severidade?: number | null
          status?: string | null
          tag: string
          updated_at?: string
        }
        Update: {
          acao_recomendada?: string | null
          causa_falha?: string | null
          created_at?: string
          deteccao?: number | null
          efeito_falha?: string | null
          equipamento_id?: string | null
          falha_funcional?: string
          funcao?: string
          id?: string
          modo_falha?: string
          ocorrencia?: number | null
          plano_preventivo_id?: string | null
          prazo?: string | null
          responsavel?: string | null
          rpn?: number | null
          severidade?: number | null
          status?: string | null
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fmea_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmea_plano_preventivo_id_fkey"
            columns: ["plano_preventivo_id"]
            isOneToOne: false
            referencedRelation: "planos_preventivos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          avaliacao_media: number | null
          cnpj: string | null
          codigo: string
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          email: string | null
          endereco: string | null
          especialidade: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          tipo: string | null
          total_avaliacoes: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          avaliacao_media?: number | null
          cnpj?: string | null
          codigo: string
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          tipo?: string | null
          total_avaliacoes?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          avaliacao_media?: number | null
          cnpj?: string | null
          codigo?: string
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          tipo?: string | null
          total_avaliacoes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      incidentes_ssma: {
        Row: {
          acoes_imediatas: string | null
          causas_basicas: string | null
          causas_imediatas: string | null
          created_at: string
          custo_estimado: number | null
          data_ocorrencia: string
          descricao: string
          dias_afastamento: number | null
          equipamento_id: string | null
          id: string
          local_ocorrencia: string | null
          numero_incidente: number
          pessoas_envolvidas: string | null
          rca_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          severidade: string | null
          status: string | null
          tag: string | null
          testemunhas: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          acoes_imediatas?: string | null
          causas_basicas?: string | null
          causas_imediatas?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_ocorrencia: string
          descricao: string
          dias_afastamento?: number | null
          equipamento_id?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: number
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          status?: string | null
          tag?: string | null
          testemunhas?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          acoes_imediatas?: string | null
          causas_basicas?: string | null
          causas_imediatas?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_ocorrencia?: string
          descricao?: string
          dias_afastamento?: number | null
          equipamento_id?: string | null
          id?: string
          local_ocorrencia?: string | null
          numero_incidente?: number
          pessoas_envolvidas?: string | null
          rca_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          severidade?: string | null
          status?: string | null
          tag?: string | null
          testemunhas?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
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
          anomalias_encontradas: number | null
          created_at: string
          data_inspecao: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          inspetor_id: string | null
          inspetor_nome: string
          itens_inspecionados: Json | null
          numero_inspecao: number
          observacoes: string | null
          rota_nome: string
          status: string | null
          turno: string | null
          updated_at: string
        }
        Insert: {
          anomalias_encontradas?: number | null
          created_at?: string
          data_inspecao?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome: string
          itens_inspecionados?: Json | null
          numero_inspecao?: number
          observacoes?: string | null
          rota_nome: string
          status?: string | null
          turno?: string | null
          updated_at?: string
        }
        Update: {
          anomalias_encontradas?: number | null
          created_at?: string
          data_inspecao?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string
          itens_inspecionados?: Json | null
          numero_inspecao?: number
          observacoes?: string | null
          rota_nome?: string
          status?: string | null
          turno?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          custo_unitario: number
          estoque_atual: number
          estoque_minimo: number
          id: string
          localizacao: string | null
          nome: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          custo_unitario?: number
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          custo_unitario?: number
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      materiais_os: {
        Row: {
          created_at: string
          custo_total: number
          custo_unitario: number
          id: string
          material_id: string
          os_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          custo_total: number
          custo_unitario: number
          id?: string
          material_id: string
          os_id: string
          quantidade: number
        }
        Update: {
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          id?: string
          material_id?: string
          os_id?: string
          quantidade?: number
        }
        Relationships: [
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
          created_at: string
          custo_hora: number | null
          especialidade: string | null
          id: string
          nome: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_hora?: number | null
          especialidade?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_hora?: number | null
          especialidade?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      medicoes_preditivas: {
        Row: {
          created_at: string
          equipamento_id: string | null
          id: string
          limite_alerta: number | null
          limite_critico: number | null
          observacoes: string | null
          os_gerada_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          tag: string
          tipo_medicao: string
          unidade: string
          valor: number
        }
        Insert: {
          created_at?: string
          equipamento_id?: string | null
          id?: string
          limite_alerta?: number | null
          limite_critico?: number | null
          observacoes?: string | null
          os_gerada_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag: string
          tipo_medicao: string
          unidade: string
          valor: number
        }
        Update: {
          created_at?: string
          equipamento_id?: string | null
          id?: string
          limite_alerta?: number | null
          limite_critico?: number | null
          observacoes?: string | null
          os_gerada_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          tag?: string
          tipo_medicao?: string
          unidade?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_preditivas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_preditivas_os_gerada_id_fkey"
            columns: ["os_gerada_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
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
          descricao: string
          economia_anual: number | null
          equipamento_id: string | null
          id: string
          numero_melhoria: number
          proponente_id: string | null
          proponente_nome: string
          roi_meses: number | null
          situacao_antes: string | null
          situacao_depois: string | null
          status: string | null
          tag: string | null
          tipo: string | null
          titulo: string
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
          descricao: string
          economia_anual?: number | null
          equipamento_id?: string | null
          id?: string
          numero_melhoria?: number
          proponente_id?: string | null
          proponente_nome: string
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo: string
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
          descricao?: string
          economia_anual?: number | null
          equipamento_id?: string | null
          id?: string
          numero_melhoria?: number
          proponente_id?: string | null
          proponente_nome?: string
          roi_meses?: number | null
          situacao_antes?: string | null
          situacao_depois?: string | null
          status?: string | null
          tag?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
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
          custo_total: number | null
          custo_unitario: number | null
          id: string
          material_id: string
          observacao: string | null
          os_id: string | null
          quantidade: number
          tipo: string
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          material_id: string
          observacao?: string | null
          os_id?: string | null
          quantidade: number
          tipo: string
          usuario_id?: string | null
          usuario_nome: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          material_id?: string
          observacao?: string | null
          os_id?: string | null
          quantidade?: number
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
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
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string
          metadata: Json | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          metadata?: Json | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          metadata?: Json | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          acao_corretiva: string | null
          causa_raiz: string | null
          created_at: string
          custo_estimado: number | null
          data_fechamento: string | null
          data_solicitacao: string
          equipamento: string
          id: string
          licoes_aprendidas: string | null
          modo_falha: string | null
          numero_os: number
          prioridade: string
          problema: string
          solicitante: string
          status: string
          tag: string
          tempo_estimado: number | null
          tipo: string
          updated_at: string
          usuario_abertura: string | null
          usuario_fechamento: string | null
        }
        Insert: {
          acao_corretiva?: string | null
          causa_raiz?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_fechamento?: string | null
          data_solicitacao?: string
          equipamento: string
          id?: string
          licoes_aprendidas?: string | null
          modo_falha?: string | null
          numero_os?: number
          prioridade?: string
          problema: string
          solicitante: string
          status?: string
          tag: string
          tempo_estimado?: number | null
          tipo?: string
          updated_at?: string
          usuario_abertura?: string | null
          usuario_fechamento?: string | null
        }
        Update: {
          acao_corretiva?: string | null
          causa_raiz?: string | null
          created_at?: string
          custo_estimado?: number | null
          data_fechamento?: string | null
          data_solicitacao?: string
          equipamento?: string
          id?: string
          licoes_aprendidas?: string | null
          modo_falha?: string | null
          numero_os?: number
          prioridade?: string
          problema?: string
          solicitante?: string
          status?: string
          tag?: string
          tempo_estimado?: number | null
          tipo?: string
          updated_at?: string
          usuario_abertura?: string | null
          usuario_fechamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_tag_fkey"
            columns: ["tag"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["tag"]
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
        Relationships: []
      }
      permissoes_trabalho: {
        Row: {
          aprovador_id: string | null
          aprovador_nome: string | null
          checklist_seguranca: Json | null
          created_at: string
          data_fim: string
          data_inicio: string
          descricao_servico: string
          epis_requeridos: string | null
          equipamento_id: string | null
          executante_nome: string
          id: string
          isolamentos: string | null
          medidas_controle: string | null
          numero_pt: number
          observacoes: string | null
          os_id: string | null
          riscos_identificados: string | null
          status: string | null
          supervisor_nome: string
          tag: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          checklist_seguranca?: Json | null
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao_servico: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome: string
          id?: string
          isolamentos?: string | null
          medidas_controle?: string | null
          numero_pt?: number
          observacoes?: string | null
          os_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
          supervisor_nome: string
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          checklist_seguranca?: Json | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao_servico?: string
          epis_requeridos?: string | null
          equipamento_id?: string | null
          executante_nome?: string
          id?: string
          isolamentos?: string | null
          medidas_controle?: string | null
          numero_pt?: number
          observacoes?: string | null
          os_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
          supervisor_nome?: string
          tag?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
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
      planos_preventivos: {
        Row: {
          ativo: boolean | null
          checklist: Json | null
          codigo: string
          condicao_disparo: string | null
          created_at: string
          descricao: string | null
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
          ativo?: boolean | null
          checklist?: Json | null
          codigo: string
          condicao_disparo?: string | null
          created_at?: string
          descricao?: string | null
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
          ativo?: boolean | null
          checklist?: Json | null
          codigo?: string
          condicao_disparo?: string | null
          created_at?: string
          descricao?: string | null
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
          endereco?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource: string
          resource_id: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource: string
          resource_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string
          resource_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      servicos_preventivos: {
        Row: {
          atividade_id: string
          concluido: boolean
          created_at: string
          descricao: string
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
        ]
      }
      sistemas: {
        Row: {
          area_id: string
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
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
        ]
      }
      solicitacoes_manutencao: {
        Row: {
          classificacao: string | null
          created_at: string
          data_aprovacao: string | null
          data_limite: string | null
          descricao_falha: string
          equipamento_id: string | null
          id: string
          impacto: string | null
          numero_solicitacao: number
          observacoes: string | null
          os_id: string | null
          sla_horas: number | null
          solicitante_nome: string
          solicitante_setor: string | null
          status: string | null
          tag: string
          updated_at: string
          usuario_aprovacao: string | null
        }
        Insert: {
          classificacao?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_limite?: string | null
          descricao_falha: string
          equipamento_id?: string | null
          id?: string
          impacto?: string | null
          numero_solicitacao?: number
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number | null
          solicitante_nome: string
          solicitante_setor?: string | null
          status?: string | null
          tag: string
          updated_at?: string
          usuario_aprovacao?: string | null
        }
        Update: {
          classificacao?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_limite?: string | null
          descricao_falha?: string
          equipamento_id?: string | null
          id?: string
          impacto?: string | null
          numero_solicitacao?: number
          observacoes?: string | null
          os_id?: string | null
          sla_horas?: number | null
          solicitante_nome?: string
          solicitante_setor?: string | null
          status?: string | null
          tag?: string
          updated_at?: string
          usuario_aprovacao?: string | null
        }
        Relationships: [
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
      templates_preventivos: {
        Row: {
          created_at: string
          descricao: string | null
          estrutura: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_expiring_contracts: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_my_profile: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_document_number: { Args: { p_tipo: string }; Returns: string }
      update_my_profile: { Args: { new_name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "ADMIN" | "USUARIO" | "MASTER_TI"
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
      app_role: ["ADMIN", "USUARIO", "MASTER_TI"],
    },
  },
} as const
