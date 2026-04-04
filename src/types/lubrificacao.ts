export interface PlanoLubrificacao {
  id: string;
  empresa_id: string;
  equipamento_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  ponto_lubrificacao: string | null;
  lubrificante: string | null;
  periodicidade: number | null;
  tipo_periodicidade: 'dias' | 'semanas' | 'meses' | 'horas' | null;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  tempo_estimado: number | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica' | null;
  responsavel_nome: string | null;
  status: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoLubrificacaoInsert {
  codigo: string;
  nome: string;
  equipamento_id?: string | null;
  descricao?: string | null;
  ponto_lubrificacao?: string | null;
  lubrificante?: string | null;
  periodicidade?: number | null;
  tipo_periodicidade?: 'dias' | 'semanas' | 'meses' | 'horas' | null;
  tempo_estimado?: number | null;
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica' | null;
  responsavel_nome?: string | null;
  ultima_execucao?: string | null;
  proxima_execucao?: string | null;
  status?: string | null;
  ativo?: boolean;
}

export interface AtividadeLubrificacao {
  id: string;
  plano_id: string;
  descricao: string;
  tempo_estimado_min: number | null;
  responsavel: string | null;
  tipo: string | null;
  ordem: number | null;
}

export interface ExecucaoLubrificacao {
  id: string;
  plano_id: string;
  executor_id: string | null;
  executor_nome: string | null;
  data_execucao: string;
  tempo_real_min: number | null;
  status: 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'ATRASADO';
  observacoes: string | null;
  fotos: any;
  quantidade_utilizada: number | null;
  created_at: string;
}

// --- Rotas de Lubrificação ---

export type FrequenciaRota = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export const FREQUENCIA_LABELS: Record<FrequenciaRota, string> = {
  DIARIA: 'Diária (DI)',
  SEMANAL: 'Semanal (SE)',
  MENSAL: 'Mensal (ME)',
  TRIMESTRAL: 'Trimestral (TM)',
  SEMESTRAL: 'Semestral (SM)',
  ANUAL: 'Anual (AN)',
};

export interface RotaLubrificacao {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  frequencia: FrequenciaRota;
  tempo_estimado_total_min: number;
  responsavel: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RotaLubrificacaoInsert {
  codigo: string;
  nome: string;
  descricao?: string | null;
  frequencia: FrequenciaRota;
  tempo_estimado_total_min?: number;
  responsavel?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export interface RotaPonto {
  id: string;
  rota_id: string | null;
  plano_id: string | null;
  ordem: number;
  codigo_ponto: string;
  descricao: string;
  equipamento_tag: string | null;
  localizacao: string | null;
  lubrificante: string | null;
  quantidade: string | null;
  ferramenta: string | null;
  tempo_estimado_min: number;
  instrucoes: string | null;
  referencia_manual: string | null;
  created_at: string;
}

export interface RotaPontoInsert {
  rota_id?: string | null;
  plano_id?: string | null;
  ordem: number;
  codigo_ponto: string;
  descricao: string;
  equipamento_tag?: string | null;
  localizacao?: string | null;
  lubrificante?: string | null;
  quantidade?: string | null;
  ferramenta?: string | null;
  tempo_estimado_min?: number;
  instrucoes?: string | null;
  referencia_manual?: string | null;
}
