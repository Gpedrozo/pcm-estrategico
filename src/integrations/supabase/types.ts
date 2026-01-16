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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "USUARIO"
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
      app_role: ["ADMIN", "USUARIO"],
    },
  },
} as const
