// ============================================================
// Types — Mecânico Industrial App
// ============================================================

export type OSStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada' | 'solicitada' | 'emitida' | 'em_execucao' | 'pausada' | 'aguardando_materiais';
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

// Navigation
export type RootStackParamList = {
  DeviceBinding: undefined;
  Main: undefined;
  OSDetail: { osId: string };
  Execution: { osId: string; execucaoId?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  QRTab: undefined;
  HistoryTab: undefined;
};

// Auth
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
  empresa_id: string;
  mecanico_id: string;
  mecanico_nome: string;
  expires_at: number;
  last_activity: number;
}
