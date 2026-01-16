// PCM ESTRATÉGICO - Type Definitions

export type UserRole = 'ADMIN' | 'USUARIO';

export interface User {
  id: number;
  nome: string;
  usuario: string;
  tipo: UserRole;
  ativo: boolean;
  dataCriacao: Date;
}

export type TipoMecanico = 'PROPRIO' | 'TERCEIRIZADO';

export interface Mecanico {
  id: number;
  nome: string;
  telefone: string;
  tipo: TipoMecanico;
  especialidade?: string;
  custoHora?: number;
  ativo: boolean;
}

// Criticidade ABC + Matriz de Risco
export type CriticidadeABC = 'A' | 'B' | 'C';
export type NivelRisco = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

export interface Equipamento {
  id: number;
  tag: string;
  nome: string;
  criticidade: CriticidadeABC;
  nivelRisco: NivelRisco;
  localizacao?: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  dataInstalacao?: Date;
  ativo: boolean;
}

// Tipos expandidos de O.S.
export type TipoOS = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';
export type StatusOS = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_MATERIAL' | 'AGUARDANDO_APROVACAO' | 'FECHADA';
export type PrioridadeOS = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';

// Modos de Falha para RCA
export type ModoFalha = 
  | 'DESGASTE' 
  | 'FADIGA' 
  | 'CORROSAO' 
  | 'SOBRECARGA' 
  | 'DESALINHAMENTO' 
  | 'LUBRIFICACAO_DEFICIENTE' 
  | 'CONTAMINACAO' 
  | 'ERRO_OPERACIONAL' 
  | 'FALTA_MANUTENCAO' 
  | 'DEFEITO_FABRICACAO'
  | 'OUTRO';

// Causa Raiz
export type CausaRaiz = 
  | 'MAO_OBRA' 
  | 'METODO' 
  | 'MATERIAL' 
  | 'MAQUINA' 
  | 'MEIO_AMBIENTE' 
  | 'MEDICAO';

export interface OrdemServico {
  id: number;
  numeroOS: number;
  tipo: TipoOS;
  prioridade: PrioridadeOS;
  tag: string;
  equipamento: string;
  solicitante: string;
  problema: string;
  dataSolicitacao: Date;
  status: StatusOS;
  usuarioAbertura: string;
  dataFechamento?: Date;
  usuarioFechamento?: string;
  
  // Campos expandidos
  tempoEstimado?: number; // minutos
  custoEstimado?: number;
  planoPreventivo?: number; // ID do plano
  
  // RCA - Análise de Causa Raiz (preenchido no fechamento)
  modoFalha?: ModoFalha;
  causaRaiz?: CausaRaiz;
  acaoCorretiva?: string;
  licoesAprendidas?: string;
}

export interface MaterialUtilizado {
  id: number;
  materialId: number;
  materialNome: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

export interface ExecucaoOS {
  id: number;
  osId: number;
  mecanicoId: number;
  mecanicoNome: string;
  horaInicio: string;
  horaFim: string;
  tempoExecucao: number; // minutos
  servicoExecutado: string;
  materiais: MaterialUtilizado[];
  custoMaoObra: number;
  custoMateriais: number;
  custoTerceiros: number;
  custoTotal: number;
  dataExecucao: Date;
  popId?: number; // Procedimento Operacional Padrão utilizado
}

export type AcaoAuditoria = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CRIAR_OS' 
  | 'FECHAR_OS' 
  | 'IMPRIMIR_OS' 
  | 'GERAR_PDF'
  | 'CRIAR_USUARIO'
  | 'EDITAR_USUARIO'
  | 'CRIAR_PLANO_PREVENTIVO'
  | 'EXECUTAR_PLANO_PREVENTIVO'
  | 'CADASTRAR_MATERIAL'
  | 'AJUSTAR_ESTOQUE';

export interface Auditoria {
  id: number;
  usuario: string;
  acao: AcaoAuditoria;
  descricao: string;
  tag?: string;
  dataHora: Date;
}

// Dashboard Indicators
export interface Indicadores {
  osAbertas: number;
  osEmAndamento: number;
  osFechadas: number;
  tempoMedioExecucao: number; // minutos
  mtbf: number; // horas
  mttr: number; // horas
  disponibilidade: number; // percentual
  backlogQuantidade: number;
  backlogTempo: number; // horas
  
  // KPIs avançados
  backlogSemanas: number;
  aderenciaProgramacao: number; // percentual
  custoTotalMes: number;
  custoMaoObraMes: number;
  custoMateriaisMes: number;
  custoTerceirosMes: number;
}

// Planos de Manutenção Preventiva
export type PeriodicidadePlano = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface ItemChecklist {
  id: number;
  descricao: string;
  obrigatorio: boolean;
}

export interface PlanoPreventivo {
  id: number;
  nome: string;
  tag: string;
  equipamento: string;
  periodicidade: PeriodicidadePlano;
  duracaoEstimada: number; // minutos
  ultimaExecucao?: Date;
  proximaExecucao: Date;
  checklist: ItemChecklist[];
  responsavel?: string;
  ativo: boolean;
}

export interface ExecucaoPlano {
  id: number;
  planoId: number;
  dataExecucao: Date;
  mecanicoId: number;
  mecanicoNome: string;
  checklistExecutado: { itemId: number; concluido: boolean; observacao?: string }[];
  osGerada?: number;
  observacoes?: string;
}

// Controle de Materiais/Peças
export interface Material {
  id: number;
  codigo: string;
  nome: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  custoUnitario: number;
  localizacao?: string;
  tagsAssociadas: string[]; // TAGs que utilizam este material
  ativo: boolean;
}

export interface MovimentacaoMaterial {
  id: number;
  materialId: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  osId?: number;
  dataMovimentacao: Date;
  usuario: string;
  observacao?: string;
}

// FMEA Simplificado por TAG
export interface FMEAItem {
  id: number;
  tag: string;
  componente: string;
  modoFalha: string;
  efeitoFalha: string;
  causaPotencial: string;
  severidade: number; // 1-10
  ocorrencia: number; // 1-10
  deteccao: number; // 1-10
  rpn: number; // Severidade x Ocorrência x Detecção
  acaoRecomendada: string;
  responsavel?: string;
  prazo?: Date;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}

// Procedimentos Operacionais Padrão (POP)
export interface POP {
  id: number;
  codigo: string;
  titulo: string;
  revisao: number;
  dataRevisao: Date;
  tagsAssociadas: string[];
  tipoManutencao: TipoOS[];
  etapas: { ordem: number; descricao: string; tempoEstimado?: number; imagem?: string }[];
  ferramentasNecessarias: string[];
  epiObrigatorio: string[];
  ativo: boolean;
}

// Histórico de MTBF/MTTR por TAG
export interface HistoricoIndicador {
  id: number;
  tag: string;
  mes: string; // formato YYYY-MM
  mtbf: number;
  mttr: number;
  disponibilidade: number;
  qtdCorretivas: number;
  qtdPreventivas: number;
  custoTotal: number;
}

// Custo por TAG
export interface CustoTAG {
  tag: string;
  equipamento: string;
  custoMaoObra: number;
  custoMateriais: number;
  custoTerceiros: number;
  custoTotal: number;
  qtdOS: number;
  periodo: string;
}

// Índice de Maturidade PCM
export interface AvaliacaoMaturidade {
  id: number;
  dataAvaliacao: Date;
  avaliador: string;
  dimensoes: {
    planejamento: number; // 0-100
    programacao: number;
    execucao: number;
    controle: number;
    indicadores: number;
    documentacao: number;
    treinamento: number;
    confiabilidade: number;
  };
  pontuacaoTotal: number;
  nivel: 'INICIAL' | 'GERENCIADO' | 'DEFINIDO' | 'QUANTIFICADO' | 'OTIMIZADO';
  observacoes?: string;
  planoAcao?: string;
}

// Calendário de Manutenção
export interface EventoCalendario {
  id: number;
  titulo: string;
  tipo: 'PREVENTIVA_PROGRAMADA' | 'PREVENTIVA_EXECUTADA' | 'CORRETIVA' | 'INSPECAO';
  tag: string;
  data: Date;
  osId?: number;
  planoId?: number;
  status: 'PROGRAMADO' | 'EXECUTADO' | 'ATRASADO' | 'CANCELADO';
}
