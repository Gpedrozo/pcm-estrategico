export interface PlanoLubrificacao {
  id: string;
  codigo: string;
  nome: string;
  equipamento_id: string | null;
  tag: string | null;
  localizacao: string | null;
  ponto: string | null;
  tipo_lubrificante: string | null;
  codigo_lubrificante: string | null;
  quantidade: number | null;
  ferramenta: string | null;
  periodicidade_tipo: 'DIAS' | 'SEMANAS' | 'MESES' | 'HORAS';
  periodicidade_valor: number | null;
  tempo_estimado_min: number;
  responsavel: string | null;
  observacoes: string | null;
  nivel_criticidade: 'ALTA' | 'MEDIA' | 'BAIXA' | null;
  instrucoes: string | null;
  anexos: any;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoLubrificacaoInsert {
  codigo: string;
  nome: string;
  equipamento_id?: string | null;
  tag?: string | null;
  localizacao?: string | null;
  ponto?: string | null;
  tipo_lubrificante?: string | null;
  codigo_lubrificante?: string | null;
  quantidade?: number | null;
  ferramenta?: string | null;
  periodicidade_tipo?: 'DIAS' | 'SEMANAS' | 'MESES' | 'HORAS';
  periodicidade_valor?: number | null;
  tempo_estimado_min?: number;
  responsavel?: string | null;
  observacoes?: string | null;
  nivel_criticidade?: 'ALTA' | 'MEDIA' | 'BAIXA' | null;
  instrucoes?: string | null;
  anexos?: any;
  ativo?: boolean;
}
