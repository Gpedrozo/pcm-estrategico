// ============================================================
// Types — Mecânico Industrial App v2.0
// ============================================================

// ── O.S. ──
export type OSStatus = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_MATERIAL' | 'FECHADA' | 'CANCELADA';
export type OSPrioridade = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';
export type OSTipo = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';

export interface OrdemServico {
  id: string;
  empresa_id: string;
  numero_os: number;
  tipo: OSTipo;
  prioridade: OSPrioridade;
  status: OSStatus;
  tag: string;
  equipamento: string;
  problema: string;
  solicitante: string;
  data_solicitacao: string;
  data_fechamento?: string;
  tempo_estimado?: number;
  usuario_abertura?: string;
  usuario_fechamento?: string;
  mecanico_responsavel_id?: string;
  mecanico_responsavel_codigo?: string;
  created_at: string;
  updated_at: string;
}

// ── Execução ──
export interface ExecucaoOS {
  id: string;
  empresa_id: string;
  os_id: string;
  mecanico_id?: string;
  mecanico_nome?: string;
  data_inicio?: string;
  data_fim?: string;
  hora_inicio?: string;
  hora_fim?: string;
  tempo_execucao?: number;
  tempo_execucao_bruto?: number;
  tempo_pausas?: number;
  tempo_execucao_liquido?: number;
  servico_executado?: string;
  causa?: string;
  observacoes?: string;
  custo_mao_obra?: number;
  custo_materiais?: number;
  custo_terceiros?: number;
  custo_total?: number;
  created_at: string;
}

// ── Pausa de Execução ──
export interface PausaExecucao {
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  motivo: string;
}

// ── Material ──
export interface Material {
  id: string;
  empresa_id: string;
  codigo?: string;
  descricao: string;
  unidade?: string;
  custo_unitario?: number;
  estoque_atual?: number;
}

export interface MaterialOS {
  material_id: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
}

// ── Mecânico ──
export interface Mecanico {
  id: string;
  empresa_id: string;
  nome: string;
  tipo?: string;
  especialidade?: string;
  custo_hora?: number;
  codigo_acesso?: string;
  escala_trabalho?: string;
  ferias_inicio?: string;
  ferias_fim?: string;
  ativo: boolean;
}

// ── Equipamento ──
export interface Equipamento {
  id: string;
  empresa_id: string;
  nome: string;
  tag?: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  localizacao?: string;
  ativo?: boolean;
}

// ── Solicitação de Manutenção ──
export type SolicitacaoStatus = 'PENDENTE' | 'APROVADA' | 'CONVERTIDA' | 'REJEITADA' | 'CANCELADA';
export type SolicitacaoImpacto = 'ALTO' | 'MEDIO' | 'BAIXO';
export type SolicitacaoClassificacao = 'EMERGENCIAL' | 'URGENTE' | 'PROGRAMAVEL';

export interface SolicitacaoManutencao {
  id: string;
  empresa_id: string;
  numero_solicitacao?: number;
  equipamento_id?: string;
  tag: string;
  solicitante_nome: string;
  solicitante_setor?: string;
  descricao_falha: string;
  impacto: SolicitacaoImpacto;
  classificacao: SolicitacaoClassificacao;
  status: SolicitacaoStatus;
  sla_horas?: number;
  data_limite?: string;
  os_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// ── Maintenance Schedule (Calendário) ──
export interface MaintenanceEvent {
  id: string;
  empresa_id: string;
  tipo: 'preventiva' | 'lubrificacao' | 'inspecao' | 'preditiva';
  titulo: string;
  descricao?: string;
  data_programada: string;
  status: string;
  responsavel?: string;
  equipamento_id?: string;
}

// ── Dados Empresa ──
export interface DadosEmpresa {
  id: string;
  empresa_id: string;
  nome_empresa?: string;
}

// ── Navigation ──
export type RootStackParamList = {
  DeviceBinding: undefined;
  Login: undefined;
  Main: undefined;
  OSDetail: { osId: string };
  FecharOS: { osId: string };
  CriarOS: { solicitacao?: SolicitacaoManutencao };
  CriarSolicitacao: undefined;
  SolicitacaoDetalhe: { solicitacao: SolicitacaoManutencao };
  QRScan: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SolicitacaoTab: undefined;
  NovaOSTab: undefined;
  HistoricoTab: undefined;
  AgendaTab: undefined;
};