// PCM ESTRATÉGICO - Mock Data for Development
import type { 
  User, Mecanico, Equipamento, OrdemServico, ExecucaoOS, Auditoria, Indicadores,
  PlanoPreventivo, Material, FMEAItem, POP, HistoricoIndicador, CustoTAG, 
  AvaliacaoMaturidade, EventoCalendario, MovimentacaoMaterial, ExecucaoPlano
} from '@/types';

export const mockUsers: User[] = [
  { id: 1, nome: 'Administrador', usuario: 'admin', tipo: 'ADMIN', ativo: true, dataCriacao: new Date('2024-01-01') },
  { id: 2, nome: 'João Silva', usuario: 'joao.silva', tipo: 'USUARIO', ativo: true, dataCriacao: new Date('2024-02-15') },
  { id: 3, nome: 'Maria Santos', usuario: 'maria.santos', tipo: 'USUARIO', ativo: true, dataCriacao: new Date('2024-03-10') },
];

export const mockMecanicos: Mecanico[] = [
  { id: 1, nome: 'Carlos Oliveira', telefone: '(11) 99999-1111', tipo: 'PROPRIO', especialidade: 'Mecânica Geral', custoHora: 45, ativo: true },
  { id: 2, nome: 'Pedro Costa', telefone: '(11) 99999-2222', tipo: 'PROPRIO', especialidade: 'Elétrica Industrial', custoHora: 50, ativo: true },
  { id: 3, nome: 'Técnica Industrial LTDA', telefone: '(11) 3333-4444', tipo: 'TERCEIRIZADO', especialidade: 'Automação', custoHora: 120, ativo: true },
  { id: 4, nome: 'Manutenção Express', telefone: '(11) 3333-5555', tipo: 'TERCEIRIZADO', especialidade: 'Hidráulica', custoHora: 95, ativo: true },
];

export const mockEquipamentos: Equipamento[] = [
  { id: 1, tag: 'COMP-001', nome: 'Compressor de Ar Principal', criticidade: 'A', nivelRisco: 'CRITICO', localizacao: 'Sala de Compressores', fabricante: 'Atlas Copco', ativo: true },
  { id: 2, tag: 'BOMB-001', nome: 'Bomba Centrífuga Linha 1', criticidade: 'A', nivelRisco: 'ALTO', localizacao: 'Casa de Bombas', fabricante: 'KSB', ativo: true },
  { id: 3, tag: 'BOMB-002', nome: 'Bomba Centrífuga Linha 2', criticidade: 'B', nivelRisco: 'MEDIO', localizacao: 'Casa de Bombas', fabricante: 'KSB', ativo: true },
  { id: 4, tag: 'MOTO-001', nome: 'Motor Elétrico 50CV', criticidade: 'A', nivelRisco: 'ALTO', localizacao: 'Linha de Produção 1', fabricante: 'WEG', ativo: true },
  { id: 5, tag: 'MOTO-002', nome: 'Motor Elétrico 25CV', criticidade: 'B', nivelRisco: 'MEDIO', localizacao: 'Linha de Produção 2', fabricante: 'WEG', ativo: true },
  { id: 6, tag: 'ESTE-001', nome: 'Esteira Transportadora A', criticidade: 'B', nivelRisco: 'MEDIO', localizacao: 'Expedição', fabricante: 'Rexnord', ativo: true },
  { id: 7, tag: 'ESTE-002', nome: 'Esteira Transportadora B', criticidade: 'C', nivelRisco: 'BAIXO', localizacao: 'Expedição', fabricante: 'Rexnord', ativo: true },
  { id: 8, tag: 'GERA-001', nome: 'Gerador Diesel 100KVA', criticidade: 'A', nivelRisco: 'CRITICO', localizacao: 'Casa de Força', fabricante: 'Cummins', ativo: true },
  { id: 9, tag: 'CLIM-001', nome: 'Climatizador Industrial', criticidade: 'C', nivelRisco: 'BAIXO', localizacao: 'Administrativo', fabricante: 'Carrier', ativo: true },
  { id: 10, tag: 'TORN-001', nome: 'Torno CNC', criticidade: 'A', nivelRisco: 'ALTO', localizacao: 'Usinagem', fabricante: 'Romi', ativo: true },
];

export const mockOrdensServico: OrdemServico[] = [
  {
    id: 1,
    numeroOS: 2024001,
    tipo: 'CORRETIVA',
    prioridade: 'ALTA',
    tag: 'COMP-001',
    equipamento: 'Compressor de Ar Principal',
    solicitante: 'Produção',
    problema: 'Ruído anormal e vibração excessiva durante operação',
    dataSolicitacao: new Date('2024-12-01'),
    status: 'FECHADA',
    usuarioAbertura: 'joao.silva',
    dataFechamento: new Date('2024-12-02'),
    usuarioFechamento: 'maria.santos',
    tempoEstimado: 240,
    custoEstimado: 1500,
    modoFalha: 'DESGASTE',
    causaRaiz: 'MAQUINA',
    acaoCorretiva: 'Substituição dos rolamentos e balanceamento do eixo',
    licoesAprendidas: 'Implementar monitoramento de vibração contínuo',
  },
  {
    id: 2,
    numeroOS: 2024002,
    tipo: 'PREVENTIVA',
    prioridade: 'MEDIA',
    tag: 'BOMB-001',
    equipamento: 'Bomba Centrífuga Linha 1',
    solicitante: 'Manutenção',
    problema: 'Manutenção preventiva programada - troca de selo mecânico',
    dataSolicitacao: new Date('2024-12-05'),
    status: 'EM_ANDAMENTO',
    usuarioAbertura: 'maria.santos',
    tempoEstimado: 180,
    custoEstimado: 800,
    planoPreventivo: 1,
  },
  {
    id: 3,
    numeroOS: 2024003,
    tipo: 'CORRETIVA',
    prioridade: 'URGENTE',
    tag: 'MOTO-001',
    equipamento: 'Motor Elétrico 50CV',
    solicitante: 'Operador Linha 1',
    problema: 'Motor não parte - possível problema no disjuntor',
    dataSolicitacao: new Date('2024-12-10'),
    status: 'ABERTA',
    usuarioAbertura: 'joao.silva',
    tempoEstimado: 120,
    custoEstimado: 500,
  },
  {
    id: 4,
    numeroOS: 2024004,
    tipo: 'CORRETIVA',
    prioridade: 'ALTA',
    tag: 'ESTE-001',
    equipamento: 'Esteira Transportadora A',
    solicitante: 'Supervisão',
    problema: 'Correia desalinhada causando desgaste irregular',
    dataSolicitacao: new Date('2024-12-12'),
    status: 'AGUARDANDO_MATERIAL',
    usuarioAbertura: 'maria.santos',
    tempoEstimado: 90,
    custoEstimado: 350,
  },
  {
    id: 5,
    numeroOS: 2024005,
    tipo: 'PREVENTIVA',
    prioridade: 'MEDIA',
    tag: 'GERA-001',
    equipamento: 'Gerador Diesel 100KVA',
    solicitante: 'Manutenção',
    problema: 'Troca de óleo e filtros - 500 horas',
    dataSolicitacao: new Date('2024-12-14'),
    status: 'EM_ANDAMENTO',
    usuarioAbertura: 'joao.silva',
    tempoEstimado: 120,
    custoEstimado: 600,
    planoPreventivo: 2,
  },
  {
    id: 6,
    numeroOS: 2024006,
    tipo: 'PREDITIVA',
    prioridade: 'MEDIA',
    tag: 'MOTO-002',
    equipamento: 'Motor Elétrico 25CV',
    solicitante: 'Engenharia',
    problema: 'Análise de vibração detectou tendência de deterioração',
    dataSolicitacao: new Date('2024-12-16'),
    status: 'ABERTA',
    usuarioAbertura: 'joao.silva',
    tempoEstimado: 60,
    custoEstimado: 200,
  },
  {
    id: 7,
    numeroOS: 2024007,
    tipo: 'INSPECAO',
    prioridade: 'BAIXA',
    tag: 'TORN-001',
    equipamento: 'Torno CNC',
    solicitante: 'Qualidade',
    problema: 'Inspeção periódica de precisão geométrica',
    dataSolicitacao: new Date('2024-12-17'),
    status: 'ABERTA',
    usuarioAbertura: 'maria.santos',
    tempoEstimado: 240,
    custoEstimado: 0,
  },
  {
    id: 8,
    numeroOS: 2024008,
    tipo: 'MELHORIA',
    prioridade: 'BAIXA',
    tag: 'COMP-001',
    equipamento: 'Compressor de Ar Principal',
    solicitante: 'Engenharia',
    problema: 'Instalação de sensor de vibração para monitoramento preditivo',
    dataSolicitacao: new Date('2024-12-18'),
    status: 'AGUARDANDO_APROVACAO',
    usuarioAbertura: 'joao.silva',
    tempoEstimado: 180,
    custoEstimado: 2500,
  },
];

export const mockExecucoes: ExecucaoOS[] = [
  {
    id: 1,
    osId: 1,
    mecanicoId: 1,
    mecanicoNome: 'Carlos Oliveira',
    horaInicio: '08:00',
    horaFim: '11:30',
    tempoExecucao: 210,
    servicoExecutado: 'Substituição de rolamentos e balanceamento do eixo',
    materiais: [
      { id: 1, materialId: 1, materialNome: 'Rolamento 6308', quantidade: 2, custoUnitario: 180, custoTotal: 360 },
      { id: 2, materialId: 2, materialNome: 'Graxa EP2', quantidade: 1, custoUnitario: 45, custoTotal: 45 },
    ],
    custoMaoObra: 157.50,
    custoMateriais: 405,
    custoTerceiros: 0,
    custoTotal: 562.50,
    dataExecucao: new Date('2024-12-02'),
    popId: 1,
  },
];

export const mockAuditoria: Auditoria[] = [
  { id: 1, usuario: 'admin', acao: 'LOGIN', descricao: 'Login no sistema', dataHora: new Date('2024-12-15T08:00:00') },
  { id: 2, usuario: 'joao.silva', acao: 'CRIAR_OS', descricao: 'Criação da O.S 2024003', tag: 'MOTO-001', dataHora: new Date('2024-12-10T09:15:00') },
  { id: 3, usuario: 'maria.santos', acao: 'FECHAR_OS', descricao: 'Fechamento da O.S 2024001', tag: 'COMP-001', dataHora: new Date('2024-12-02T11:45:00') },
  { id: 4, usuario: 'maria.santos', acao: 'GERAR_PDF', descricao: 'PDF gerado para O.S 2024001', tag: 'COMP-001', dataHora: new Date('2024-12-02T12:00:00') },
  { id: 5, usuario: 'joao.silva', acao: 'CRIAR_OS', descricao: 'Criação da O.S 2024005', tag: 'GERA-001', dataHora: new Date('2024-12-14T14:30:00') },
  { id: 6, usuario: 'admin', acao: 'CRIAR_PLANO_PREVENTIVO', descricao: 'Criação do plano preventivo para BOMB-001', tag: 'BOMB-001', dataHora: new Date('2024-12-01T10:00:00') },
];

export const mockIndicadores: Indicadores = {
  osAbertas: 4,
  osEmAndamento: 2,
  osFechadas: 1,
  tempoMedioExecucao: 210,
  mtbf: 720, // 30 dias
  mttr: 3.5, // 3.5 horas
  disponibilidade: 99.5,
  backlogQuantidade: 6,
  backlogTempo: 24,
  backlogSemanas: 0.6,
  aderenciaProgramacao: 87.5,
  custoTotalMes: 4562.50,
  custoMaoObraMes: 1575,
  custoMateriaisMes: 2487.50,
  custoTerceirosMes: 500,
};

// Planos de Manutenção Preventiva
export const mockPlanosPreventivos: PlanoPreventivo[] = [
  {
    id: 1,
    nome: 'Preventiva Mensal - Bomba Centrífuga',
    tag: 'BOMB-001',
    equipamento: 'Bomba Centrífuga Linha 1',
    periodicidade: 'MENSAL',
    duracaoEstimada: 180,
    ultimaExecucao: new Date('2024-11-05'),
    proximaExecucao: new Date('2024-12-05'),
    checklist: [
      { id: 1, descricao: 'Verificar vazamentos no selo mecânico', obrigatorio: true },
      { id: 2, descricao: 'Medir temperatura dos mancais', obrigatorio: true },
      { id: 3, descricao: 'Verificar nível de óleo', obrigatorio: true },
      { id: 4, descricao: 'Inspecionar acoplamento', obrigatorio: true },
      { id: 5, descricao: 'Verificar alinhamento', obrigatorio: false },
      { id: 6, descricao: 'Limpar área ao redor', obrigatorio: false },
    ],
    responsavel: 'Carlos Oliveira',
    ativo: true,
  },
  {
    id: 2,
    nome: 'Preventiva 500h - Gerador Diesel',
    tag: 'GERA-001',
    equipamento: 'Gerador Diesel 100KVA',
    periodicidade: 'TRIMESTRAL',
    duracaoEstimada: 120,
    ultimaExecucao: new Date('2024-09-14'),
    proximaExecucao: new Date('2024-12-14'),
    checklist: [
      { id: 1, descricao: 'Trocar óleo do motor', obrigatorio: true },
      { id: 2, descricao: 'Trocar filtro de óleo', obrigatorio: true },
      { id: 3, descricao: 'Trocar filtro de combustível', obrigatorio: true },
      { id: 4, descricao: 'Trocar filtro de ar', obrigatorio: true },
      { id: 5, descricao: 'Verificar nível do líquido de arrefecimento', obrigatorio: true },
      { id: 6, descricao: 'Testar partida e funcionamento', obrigatorio: true },
      { id: 7, descricao: 'Verificar tensão das correias', obrigatorio: false },
    ],
    responsavel: 'Pedro Costa',
    ativo: true,
  },
  {
    id: 3,
    nome: 'Preventiva Semanal - Compressor',
    tag: 'COMP-001',
    equipamento: 'Compressor de Ar Principal',
    periodicidade: 'SEMANAL',
    duracaoEstimada: 60,
    ultimaExecucao: new Date('2024-12-09'),
    proximaExecucao: new Date('2024-12-16'),
    checklist: [
      { id: 1, descricao: 'Drenar condensado do reservatório', obrigatorio: true },
      { id: 2, descricao: 'Verificar pressão de trabalho', obrigatorio: true },
      { id: 3, descricao: 'Verificar ruídos anormais', obrigatorio: true },
      { id: 4, descricao: 'Limpar filtro de ar', obrigatorio: false },
    ],
    responsavel: 'Carlos Oliveira',
    ativo: true,
  },
];

// Materiais/Peças
export const mockMateriais: Material[] = [
  { id: 1, codigo: 'ROL-6308', nome: 'Rolamento 6308', unidade: 'UN', estoqueAtual: 8, estoqueMinimo: 4, custoUnitario: 180, localizacao: 'A1-01', tagsAssociadas: ['COMP-001', 'MOTO-001'], ativo: true },
  { id: 2, codigo: 'GRX-EP2', nome: 'Graxa EP2', unidade: 'KG', estoqueAtual: 15, estoqueMinimo: 5, custoUnitario: 45, localizacao: 'A1-02', tagsAssociadas: ['COMP-001', 'BOMB-001', 'MOTO-001'], ativo: true },
  { id: 3, codigo: 'OLE-HID68', nome: 'Óleo Hidráulico ISO 68', unidade: 'L', estoqueAtual: 40, estoqueMinimo: 20, custoUnitario: 25, localizacao: 'A2-01', tagsAssociadas: ['BOMB-001', 'BOMB-002'], ativo: true },
  { id: 4, codigo: 'SEL-MEC-50', nome: 'Selo Mecânico 50mm', unidade: 'UN', estoqueAtual: 2, estoqueMinimo: 2, custoUnitario: 450, localizacao: 'A3-01', tagsAssociadas: ['BOMB-001', 'BOMB-002'], ativo: true },
  { id: 5, codigo: 'FIL-OLE-G', nome: 'Filtro de Óleo Gerador', unidade: 'UN', estoqueAtual: 6, estoqueMinimo: 3, custoUnitario: 85, localizacao: 'B1-01', tagsAssociadas: ['GERA-001'], ativo: true },
  { id: 6, codigo: 'FIL-COMB-G', nome: 'Filtro de Combustível Gerador', unidade: 'UN', estoqueAtual: 4, estoqueMinimo: 3, custoUnitario: 120, localizacao: 'B1-02', tagsAssociadas: ['GERA-001'], ativo: true },
  { id: 7, codigo: 'COR-A68', nome: 'Correia A68', unidade: 'UN', estoqueAtual: 3, estoqueMinimo: 2, custoUnitario: 35, localizacao: 'C1-01', tagsAssociadas: ['ESTE-001', 'ESTE-002'], ativo: true },
  { id: 8, codigo: 'OLE-MOT-15W40', nome: 'Óleo Motor 15W40', unidade: 'L', estoqueAtual: 25, estoqueMinimo: 10, custoUnitario: 28, localizacao: 'B2-01', tagsAssociadas: ['GERA-001'], ativo: true },
];

export const mockMovimentacoes: MovimentacaoMaterial[] = [
  { id: 1, materialId: 1, tipo: 'SAIDA', quantidade: 2, osId: 1, dataMovimentacao: new Date('2024-12-02'), usuario: 'carlos.oliveira', observacao: 'Utilizado na OS 2024001' },
  { id: 2, materialId: 2, tipo: 'SAIDA', quantidade: 1, osId: 1, dataMovimentacao: new Date('2024-12-02'), usuario: 'carlos.oliveira', observacao: 'Utilizado na OS 2024001' },
  { id: 3, materialId: 1, tipo: 'ENTRADA', quantidade: 10, dataMovimentacao: new Date('2024-12-01'), usuario: 'admin', observacao: 'Reposição de estoque - NF 12345' },
];

// FMEA Simplificado
export const mockFMEA: FMEAItem[] = [
  {
    id: 1,
    tag: 'COMP-001',
    componente: 'Rolamentos do eixo',
    modoFalha: 'Desgaste prematuro',
    efeitoFalha: 'Vibração excessiva e parada não programada',
    causaPotencial: 'Lubrificação inadequada ou contaminação',
    severidade: 8,
    ocorrencia: 4,
    deteccao: 5,
    rpn: 160,
    acaoRecomendada: 'Implementar análise de vibração mensal e lubrificação semanal',
    responsavel: 'Carlos Oliveira',
    prazo: new Date('2025-01-15'),
    status: 'EM_ANDAMENTO',
  },
  {
    id: 2,
    tag: 'BOMB-001',
    componente: 'Selo mecânico',
    modoFalha: 'Vazamento',
    efeitoFalha: 'Perda de produto e contaminação',
    causaPotencial: 'Desgaste natural ou operação a seco',
    severidade: 7,
    ocorrencia: 5,
    deteccao: 3,
    rpn: 105,
    acaoRecomendada: 'Inspeção visual diária e troca preventiva anual',
    responsavel: 'Pedro Costa',
    prazo: new Date('2025-02-01'),
    status: 'PENDENTE',
  },
  {
    id: 3,
    tag: 'GERA-001',
    componente: 'Sistema de combustível',
    modoFalha: 'Falha na partida',
    efeitoFalha: 'Indisponibilidade em emergência',
    causaPotencial: 'Diesel contaminado ou filtro obstruído',
    severidade: 9,
    ocorrencia: 3,
    deteccao: 4,
    rpn: 108,
    acaoRecomendada: 'Teste de partida semanal e troca de filtros trimestral',
    responsavel: 'Pedro Costa',
    prazo: new Date('2025-01-30'),
    status: 'CONCLUIDO',
  },
];

// Procedimentos Operacionais (POP)
export const mockPOPs: POP[] = [
  {
    id: 1,
    codigo: 'POP-MEC-001',
    titulo: 'Troca de Rolamentos em Compressores',
    revisao: 2,
    dataRevisao: new Date('2024-06-15'),
    tagsAssociadas: ['COMP-001'],
    tipoManutencao: ['CORRETIVA', 'PREVENTIVA'],
    etapas: [
      { ordem: 1, descricao: 'Desligar e bloquear o equipamento (LOTO)', tempoEstimado: 10 },
      { ordem: 2, descricao: 'Drenar óleo e remover proteções', tempoEstimado: 15 },
      { ordem: 3, descricao: 'Remover polias e acoplamentos', tempoEstimado: 30 },
      { ordem: 4, descricao: 'Extrair rolamentos danificados', tempoEstimado: 20 },
      { ordem: 5, descricao: 'Limpar alojamentos e eixo', tempoEstimado: 15 },
      { ordem: 6, descricao: 'Instalar novos rolamentos', tempoEstimado: 25 },
      { ordem: 7, descricao: 'Remontar componentes', tempoEstimado: 30 },
      { ordem: 8, descricao: 'Abastecer óleo e testar', tempoEstimado: 20 },
    ],
    ferramentasNecessarias: ['Chave de fenda', 'Chave combinada jogo', 'Extrator de rolamentos', 'Aquecedor indutivo', 'Torquímetro'],
    epiObrigatorio: ['Óculos de proteção', 'Luvas de vaqueta', 'Protetor auricular', 'Calçado de segurança'],
    ativo: true,
  },
  {
    id: 2,
    codigo: 'POP-ELE-001',
    titulo: 'Troca de Óleo e Filtros - Gerador Diesel',
    revisao: 1,
    dataRevisao: new Date('2024-03-10'),
    tagsAssociadas: ['GERA-001'],
    tipoManutencao: ['PREVENTIVA'],
    etapas: [
      { ordem: 1, descricao: 'Verificar se o motor está frio', tempoEstimado: 5 },
      { ordem: 2, descricao: 'Posicionar bandeja coletora', tempoEstimado: 5 },
      { ordem: 3, descricao: 'Drenar óleo usado', tempoEstimado: 15 },
      { ordem: 4, descricao: 'Substituir filtro de óleo', tempoEstimado: 10 },
      { ordem: 5, descricao: 'Substituir filtro de combustível', tempoEstimado: 10 },
      { ordem: 6, descricao: 'Abastecer com óleo novo', tempoEstimado: 10 },
      { ordem: 7, descricao: 'Verificar nível e vazamentos', tempoEstimado: 5 },
      { ordem: 8, descricao: 'Testar funcionamento', tempoEstimado: 15 },
    ],
    ferramentasNecessarias: ['Chave de filtro', 'Funil', 'Bandeja coletora', 'Panos absorventes'],
    epiObrigatorio: ['Luvas nitrílicas', 'Óculos de proteção', 'Avental'],
    ativo: true,
  },
];

// Histórico de Indicadores por TAG
export const mockHistoricoIndicadores: HistoricoIndicador[] = [
  { id: 1, tag: 'COMP-001', mes: '2024-07', mtbf: 650, mttr: 4.2, disponibilidade: 99.3, qtdCorretivas: 1, qtdPreventivas: 4, custoTotal: 850 },
  { id: 2, tag: 'COMP-001', mes: '2024-08', mtbf: 720, mttr: 3.8, disponibilidade: 99.5, qtdCorretivas: 0, qtdPreventivas: 4, custoTotal: 320 },
  { id: 3, tag: 'COMP-001', mes: '2024-09', mtbf: 680, mttr: 4.0, disponibilidade: 99.4, qtdCorretivas: 1, qtdPreventivas: 4, custoTotal: 780 },
  { id: 4, tag: 'COMP-001', mes: '2024-10', mtbf: 750, mttr: 3.5, disponibilidade: 99.5, qtdCorretivas: 0, qtdPreventivas: 5, custoTotal: 400 },
  { id: 5, tag: 'COMP-001', mes: '2024-11', mtbf: 710, mttr: 3.8, disponibilidade: 99.5, qtdCorretivas: 1, qtdPreventivas: 4, custoTotal: 920 },
  { id: 6, tag: 'COMP-001', mes: '2024-12', mtbf: 720, mttr: 3.5, disponibilidade: 99.5, qtdCorretivas: 1, qtdPreventivas: 4, custoTotal: 562 },
  
  { id: 7, tag: 'BOMB-001', mes: '2024-07', mtbf: 580, mttr: 2.5, disponibilidade: 99.6, qtdCorretivas: 1, qtdPreventivas: 1, custoTotal: 650 },
  { id: 8, tag: 'BOMB-001', mes: '2024-08', mtbf: 600, mttr: 2.3, disponibilidade: 99.6, qtdCorretivas: 0, qtdPreventivas: 1, custoTotal: 280 },
  { id: 9, tag: 'BOMB-001', mes: '2024-09', mtbf: 620, mttr: 2.4, disponibilidade: 99.6, qtdCorretivas: 0, qtdPreventivas: 1, custoTotal: 290 },
  { id: 10, tag: 'BOMB-001', mes: '2024-10', mtbf: 610, mttr: 2.2, disponibilidade: 99.6, qtdCorretivas: 1, qtdPreventivas: 1, custoTotal: 520 },
  { id: 11, tag: 'BOMB-001', mes: '2024-11', mtbf: 640, mttr: 2.1, disponibilidade: 99.7, qtdCorretivas: 0, qtdPreventivas: 1, custoTotal: 300 },
  { id: 12, tag: 'BOMB-001', mes: '2024-12', mtbf: 650, mttr: 2.0, disponibilidade: 99.7, qtdCorretivas: 0, qtdPreventivas: 1, custoTotal: 310 },
];

// Custos por TAG
export const mockCustosTAG: CustoTAG[] = [
  { tag: 'COMP-001', equipamento: 'Compressor de Ar Principal', custoMaoObra: 450, custoMateriais: 765, custoTerceiros: 0, custoTotal: 1215, qtdOS: 3, periodo: '2024-12' },
  { tag: 'BOMB-001', equipamento: 'Bomba Centrífuga Linha 1', custoMaoObra: 280, custoMateriais: 450, custoTerceiros: 0, custoTotal: 730, qtdOS: 1, periodo: '2024-12' },
  { tag: 'GERA-001', equipamento: 'Gerador Diesel 100KVA', custoMaoObra: 150, custoMateriais: 350, custoTerceiros: 0, custoTotal: 500, qtdOS: 1, periodo: '2024-12' },
  { tag: 'MOTO-001', equipamento: 'Motor Elétrico 50CV', custoMaoObra: 0, custoMateriais: 0, custoTerceiros: 0, custoTotal: 0, qtdOS: 1, periodo: '2024-12' },
];

// Avaliação de Maturidade PCM
export const mockAvaliacaoMaturidade: AvaliacaoMaturidade = {
  id: 1,
  dataAvaliacao: new Date('2024-12-01'),
  avaliador: 'Gerente de Manutenção',
  dimensoes: {
    planejamento: 65,
    programacao: 70,
    execucao: 75,
    controle: 60,
    indicadores: 55,
    documentacao: 50,
    treinamento: 45,
    confiabilidade: 40,
  },
  pontuacaoTotal: 57.5,
  nivel: 'GERENCIADO',
  observacoes: 'Necessário melhorar documentação técnica e treinamentos. Implementar análise de confiabilidade.',
  planoAcao: 'Criar POPs para todos equipamentos críticos. Capacitar equipe em análise de falhas.',
};

// Eventos do Calendário
export const mockEventosCalendario: EventoCalendario[] = [
  { id: 1, titulo: 'Preventiva - Compressor', tipo: 'PREVENTIVA_PROGRAMADA', tag: 'COMP-001', data: new Date('2024-12-16'), planoId: 3, status: 'PROGRAMADO' },
  { id: 2, titulo: 'Preventiva - Bomba', tipo: 'PREVENTIVA_EXECUTADA', tag: 'BOMB-001', data: new Date('2024-12-05'), planoId: 1, osId: 2, status: 'EXECUTADO' },
  { id: 3, titulo: 'Corretiva - Motor', tipo: 'CORRETIVA', tag: 'MOTO-001', data: new Date('2024-12-10'), osId: 3, status: 'PROGRAMADO' },
  { id: 4, titulo: 'Preventiva - Gerador', tipo: 'PREVENTIVA_PROGRAMADA', tag: 'GERA-001', data: new Date('2024-12-14'), planoId: 2, osId: 5, status: 'EXECUTADO' },
  { id: 5, titulo: 'Inspeção - Torno CNC', tipo: 'INSPECAO', tag: 'TORN-001', data: new Date('2024-12-17'), osId: 7, status: 'PROGRAMADO' },
  { id: 6, titulo: 'Preventiva - Compressor', tipo: 'PREVENTIVA_PROGRAMADA', tag: 'COMP-001', data: new Date('2024-12-23'), planoId: 3, status: 'PROGRAMADO' },
  { id: 7, titulo: 'Preventiva - Compressor', tipo: 'PREVENTIVA_EXECUTADA', tag: 'COMP-001', data: new Date('2024-12-09'), planoId: 3, status: 'EXECUTADO' },
];

export const mockExecucoesPlano: ExecucaoPlano[] = [
  {
    id: 1,
    planoId: 3,
    dataExecucao: new Date('2024-12-09'),
    mecanicoId: 1,
    mecanicoNome: 'Carlos Oliveira',
    checklistExecutado: [
      { itemId: 1, concluido: true },
      { itemId: 2, concluido: true },
      { itemId: 3, concluido: true },
      { itemId: 4, concluido: true, observacao: 'Filtro limpo, bom estado' },
    ],
    observacoes: 'Equipamento em boas condições',
  },
];

// Helper function to get next OS number
export const getNextOSNumber = (): number => {
  const maxOS = Math.max(...mockOrdensServico.map(os => os.numeroOS));
  return maxOS + 1;
};

// Helper to get equipment by TAG
export const getEquipamentoByTag = (tag: string): Equipamento | undefined => {
  return mockEquipamentos.find(eq => eq.tag === tag);
};

// Helper to get materials for a TAG
export const getMateriaisByTag = (tag: string): Material[] => {
  return mockMateriais.filter(m => m.tagsAssociadas.includes(tag));
};

// Helper to get planos for a TAG
export const getPlanosByTag = (tag: string): PlanoPreventivo[] => {
  return mockPlanosPreventivos.filter(p => p.tag === tag);
};

// Helper to get FMEA for a TAG
export const getFMEAByTag = (tag: string): FMEAItem[] => {
  return mockFMEA.filter(f => f.tag === tag);
};

// Helper to get histórico for a TAG
export const getHistoricoByTag = (tag: string): HistoricoIndicador[] => {
  return mockHistoricoIndicadores.filter(h => h.tag === tag);
};
