// ============================================================
// Types — Mecânico Industrial App
// ============================================================

export type OSStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada' | 'solicitada' | 'emitida' | 'em_execucao' | 'pausada' | 'aguardando_materiais' | 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_MATERIAL' | 'AGUARDANDO_APROVACAO' | 'FECHADA';
export type OSPrioridade = 'alta' | 'media' | 'baixa' | 'emergencial';
export type OSTipo = 'Corretiva' | 'Preventiva' | 'Preditiva' | 'Lubrificacao' | 'Inspecao';

export interface OrdemServico {
  id: string;
  empresa_id: string;
  numero_os: number;
  tipo: OSTipo;
  prioridade: OSPrioridade;
  status: OSStatus;
  tag?: string;
  equipamento?: string;
  problema?: string;
  solicitante?: string;
  data_solicitacao: string;
  data_fechamento?: string;
  tempo_estimado?: number;
  created_at: string;
  updated_at: string;
}

export interface ExecucaoOS {
  id: string;
  empresa_id: string;
  os_id: string;
  mecanico_id?: string;
  mecanico_nome?: string;
  hora_inicio?: string;
  hora_fim?: string;
  tempo_execucao?: number;
  servico_executado?: string;
  causa?: string;
  observacoes?: string;
  data_execucao?: string;
  custo_mao_obra?: number;
  custo_materiais?: number;
  custo_total?: number;
  created_at: string;
  // Local fields
  fotos?: string[];
  sync_status?: SyncStatus;
  local_updated_at?: string;
}

export interface Mecanico {
  id: string;
  empresa_id: string;
  nome: string;
  tipo?: string;
  ativo: boolean;
}

export interface Equipamento {
  id: string;
  empresa_id: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  localizacao?: string;
  qr_code?: string;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPLOAD';
  payload: string;
  created_at: string;
  attempts: number;
  last_error?: string;
  status: 'pending' | 'syncing' | 'done' | 'error';
}

export interface AutoSaveState {
  screen: string;
  os_id: string;
  data: Record<string, unknown>;
  saved_at: string;
}

// ── Paradas de Equipamento ──
export type TipoParada = 'mecanica' | 'eletrica' | 'operacional' | 'instrumentacao';

export interface ParadaEquipamento {
  id: string;
  empresa_id: string;
  equipamento_id?: string;
  os_id?: string;
  mecanico_id?: string;
  mecanico_nome?: string;
  tipo: TipoParada;
  inicio: string;
  fim?: string;
  observacao?: string;
  created_at: string;
  updated_at?: string;
  sync_status?: SyncStatus;
  local_updated_at?: string;
}

// ── Requisição de Material ──
export type StatusRequisicao = 'pendente' | 'aprovada' | 'entregue' | 'recusada';

export interface RequisicaoMaterial {
  id: string;
  empresa_id: string;
  os_id?: string;
  mecanico_id?: string;
  mecanico_nome?: string;
  material_id?: string;
  descricao_livre?: string;
  quantidade: number;
  status: StatusRequisicao;
  observacao?: string;
  created_at: string;
  sync_status?: SyncStatus;
  local_updated_at?: string;
}

// ── Material (catálogo) ──
export interface Material {
  id: string;
  empresa_id: string;
  codigo?: string;
  descricao: string;
  unidade?: string;
  estoque_atual?: number;
}

// ── Documento Técnico ──
export interface DocumentoTecnico {
  id: string;
  empresa_id: string;
  equipamento_id?: string;
  tipo?: string;
  nome: string;
  arquivo_url?: string;
  created_at?: string;
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
  os_id?: string;
  observacoes?: string;
  usuario_aprovacao?: string;
  data_aprovacao?: string;
  data_limite?: string;
  created_at: string;
  updated_at: string;
  sync_status?: SyncStatus;
}

// Navigation
export type RootStackParamList = {
  DeviceBinding: undefined;
  MecanicoSelect: undefined;
  Main: undefined;
  OSDetail: { osId: string };
  CriarOS: undefined;
  Execution: { osId: string; execucaoId?: string; mode?: 'auto' | 'manual' };
  Parada: { osId: string; equipamentoId?: string; equipamentoNome?: string };
  SolicitarServico: { equipamentoId?: string; equipamentoNome?: string };
  SolicitacoesList: undefined;
  EquipamentoDetalhe: { equipamentoId: string };
  RequisicaoMaterial: { osId: string };
  Checklist: { osId: string; execucaoId: string; checklistData?: string };
  Catalogo: { equipamentoId?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  OrdensTab: undefined;
  SolicitacoesTab: undefined;
  MaisTab: undefined;
};