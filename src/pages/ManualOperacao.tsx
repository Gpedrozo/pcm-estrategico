import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2, PlayCircle, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

type RoleManual = 'USUARIO' | 'ADMIN' | 'MASTER_TI';

interface OperacaoManual {
  id: string;
  titulo: string;
  modulo: string;
  objetivo: string;
  quandoUsar: string;
  imagem: string;
  perfis: RoleManual[];
  preRequisitos: string[];
  passos: string[];
  validacao: string[];
  errosComuns: string[];
}

interface ManualDemoScene {
  id: string;
  modulo: string;
  titulo: string;
  imagem: string;
  etapas: string[];
  simulacao: {
    tela: string;
    campos: { label: string; valor: string; mascarado?: boolean }[];
    acao: string;
    resultado: string;
  };
}

const operacoes: OperacaoManual[] = [
  {
    id: '01',
    titulo: 'Login e validacao de ambiente',
    modulo: 'Acesso ao Sistema',
    objetivo: 'Garantir acesso ao tenant correto com perfil apropriado para a rotina do turno.',
    quandoUsar: 'Inicio do turno e sempre que houver encerramento de sessao.',
    imagem: '/manual-processos/01-login.svg',
    perfis: ['USUARIO', 'ADMIN', 'MASTER_TI'],
    preRequisitos: ['Usuario ativo no tenant.', 'Credenciais validas (email e senha).', 'Conexao de rede estavel.'],
    passos: [
      'Abrir a tela de login no dominio do tenant.',
      'Preencher email e senha e clicar em Entrar.',
      'Validar se o menu lateral corresponde ao seu perfil de acesso.',
      'Confirmar que Dashboard e modulos operacionais carregaram sem erro.'
    ],
    validacao: [
      'Nome do usuario aparece no rodape do menu.',
      'Sem redirecionamento para /login apos autenticacao.',
      'Modulo Dashboard acessivel.'
    ],
    errosComuns: [
      'Entrar no dominio incorreto (owner vs tenant).',
      'Senha expirada ou digitada com espaco extra.',
      'Perfil sem permissao para modulo esperado.'
    ]
  },
  {
    id: '02',
    titulo: 'Abertura de solicitacao de manutencao',
    modulo: 'Ordens de Servico > Solicitacoes',
    objetivo: 'Registrar demanda com qualidade para priorizacao correta do atendimento.',
    quandoUsar: 'Sempre que houver anomalia ou necessidade de manutencao nao planejada.',
    imagem: '/manual-processos/02-solicitacao.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['Equipamento cadastrado com TAG.', 'Solicitante ciente do impacto operacional.'],
    passos: [
      'Acessar menu Solicitacoes.',
      'Selecionar TAG correta do equipamento.',
      'Descrever falha com sintoma, local e impacto.',
      'Classificar urgencia (Emergencial/Urgente/Programavel).',
      'Salvar e confirmar geracao da solicitacao na fila.'
    ],
    validacao: [
      'Solicitacao aparece na listagem com status inicial.',
      'SLA condizente com a classificacao escolhida.',
      'TAG e descricao visualmente corretas no registro.'
    ],
    errosComuns: [
      'Selecionar TAG errada ou generica.',
      'Descricao vaga sem sintoma observavel.',
      'Classificacao de urgencia incompatível com risco real.'
    ]
  },
  {
    id: '03',
    titulo: 'Backlog e priorizacao diaria',
    modulo: 'Ordens de Servico > Backlog',
    objetivo: 'Ordenar carteira pendente para reduzir vencimentos e risco operacional.',
    quandoUsar: 'No inicio do turno e em reunioes rapidas de alinhamento.',
    imagem: '/manual-processos/05-programacao.svg',
    perfis: ['USUARIO', 'ADMIN', 'MASTER_TI'],
    preRequisitos: ['Solicitacoes e O.S em aberto no periodo.', 'Criterio de prioridade definido pela gestao.'],
    passos: [
      'Abrir Backlog e aplicar filtros de prioridade/status.',
      'Identificar itens vencidos e criticos.',
      'Separar demandas por impacto de producao e seguranca.',
      'Encaminhar para emissao de O.S ou reprogramacao.'
    ],
    validacao: [
      'Itens criticos definidos com dono e prazo.',
      'Pendencias antigas com acao registrada.',
      'Fila do dia alinhada com equipe executante.'
    ],
    errosComuns: [
      'Priorizar apenas por data e ignorar risco.',
      'Nao revisar pendencias sem TAG valida.',
      'Nao tratar bloqueios de material no planejamento.'
    ]
  },
  {
    id: '04',
    titulo: 'Emissao de O.S',
    modulo: 'Ordens de Servico > Emitir O.S',
    objetivo: 'Converter demanda em ordem executavel com escopo tecnico claro.',
    quandoUsar: 'Apos aprovacao/priorizacao da solicitacao.',
    imagem: '/manual-processos/03-emitir-os.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['Solicitacao aprovada ou demanda autorizada.', 'TAG e tipo de manutencao definidos.'],
    passos: [
      'Abrir Emitir O.S.',
      'Selecionar TAG e tipo de manutencao.',
      'Definir prioridade e solicitante/setor.',
      'Registrar problema com detalhes executaveis.',
      'Salvar e, se necessario, imprimir ficha.'
    ],
    validacao: [
      'Numero da O.S gerado.',
      'Tipo, prioridade e TAG corretos.',
      'Ordem visivel para fechamento/historico.'
    ],
    errosComuns: [
      'Tipo de O.S incoerente com atividade.',
      'Problema sem descricao tecnica.',
      'Prioridade elevada sem justificativa.'
    ]
  },
  {
    id: '05',
    titulo: 'Fechamento tecnico de O.S',
    modulo: 'Ordens de Servico > Fechar O.S',
    objetivo: 'Encerrar ordem com rastreabilidade de tempo, servico e custos.',
    quandoUsar: 'Apos conclusao da execucao em campo.',
    imagem: '/manual-processos/04-fechar-os.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['O.S em status executavel.', 'Executante definido.', 'Informacoes de consumo disponiveis.'],
    passos: [
      'Selecionar O.S em aberto.',
      'Informar inicio/fim e tempo de execucao.',
      'Descrever servico executado com padrao tecnico.',
      'Apontar materiais, mao de obra e terceiros.',
      'Em corretiva, registrar RCA de fechamento.',
      'Concluir fechamento.'
    ],
    validacao: [
      'O.S muda para status fechado.',
      'Custos consolidados no modulo de custos.',
      'Registro completo no historico da O.S.'
    ],
    errosComuns: [
      'Fechar sem apontar tempo real.',
      'Nao registrar materiais consumidos.',
      'RCA incompleto em falhas recorrentes.'
    ]
  },
  {
    id: '06',
    titulo: 'Historico de O.S e filtros operacionais',
    modulo: 'Ordens de Servico > Historico O.S',
    objetivo: 'Analisar ordens encerradas e em aberto com filtros para tomada de decisao rapida.',
    quandoUsar: 'Analise diaria de desempenho, reincidencia de falhas e auditoria de execucao.',
    imagem: '/manual-processos/04-fechar-os.svg',
    perfis: ['USUARIO', 'ADMIN', 'MASTER_TI'],
    preRequisitos: ['O.S emitidas e/ou fechadas no periodo.', 'Criterios de filtro definidos (status, TAG, periodo, prioridade).'],
    passos: [
      'Abrir Historico de O.S.',
      'Filtrar por periodo e status para foco da analise.',
      'Aplicar filtro por TAG, tipo e prioridade quando necessario.',
      'Inspecionar tempo de atendimento, reincidencia e custo associado.',
      'Exportar ou compartilhar os resultados com a equipe.'
    ],
    validacao: [
      'Filtro aplicado retorna apenas dados esperados.',
      'Indicadores de lead time e reincidencia ficam visiveis.',
      'Analise gera acao clara para backlog/programacao.'
    ],
    errosComuns: [
      'Filtrar sem delimitar periodo e comparar dados incompletos.',
      'Analisar somente quantidade e ignorar impacto operacional.',
      'Nao registrar conclusoes da analise para o proximo turno.'
    ]
  },
  {
    id: '07',
    titulo: 'Programacao semanal',
    modulo: 'Planejamento > Programacao',
    objetivo: 'Distribuir carga de manutencao com visao de capacidade e prazo.',
    quandoUsar: 'Planejamento semanal e ajustes de janela operacional.',
    imagem: '/manual-processos/05-programacao.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['Backlog atualizado.', 'Equipe e recursos disponiveis mapeados.'],
    passos: [
      'Selecionar semana de trabalho.',
      'Priorizar ordens com base em risco e vencimento.',
      'Alocar atividades por equipe e turno.',
      'Emitir O.S diretamente da agenda quando aplicavel.',
      'Acompanhar indicadores de executadas e vencidas.'
    ],
    validacao: [
      'Agenda semanal publicada.',
      'Sem ordens criticas sem dono.',
      'Percentual de vencidas monitorado.'
    ],
    errosComuns: [
      'Programar sem validar recurso disponivel.',
      'Ignorar janela de producao.',
      'Nao revisar backlog apos mudanca de prioridade.'
    ]
  },
  {
    id: '08',
    titulo: 'Planos preventivos e aderencia',
    modulo: 'Planejamento > Preventiva',
    objetivo: 'Manter planos ativos, executaveis e com historico de cumprimento.',
    quandoUsar: 'Criacao/revisao de planos e consolidacao semanal.',
    imagem: '/manual-processos/06-preventiva.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['TAG cadastrada e criticidade definida.', 'Periodicidade validada com engenharia.'],
    passos: [
      'Cadastrar plano preventivo com frequencia.',
      'Definir atividades e tempo padrao.',
      'Ativar plano e vincular a programacao.',
      'Registrar execucoes e atrasos.',
      'Ajustar plano com base no historico real.'
    ],
    validacao: [
      'Planos ativos por equipamento critico.',
      'Historico de execucao preenchido.',
      'Aderencia preventiva acompanhada no periodo.'
    ],
    errosComuns: [
      'Plano criado sem atividades detalhadas.',
      'Periodicidade inadequada para criticidade.',
      'Nao registrar motivo de atraso.'
    ]
  },
  {
    id: '09',
    titulo: 'Preditiva e tratamento de alertas',
    modulo: 'Planejamento > Preditiva',
    objetivo: 'Antecipar falhas por condicao e acionar manutencao antes da quebra.',
    quandoUsar: 'Coletas de condicao e monitoramento diario de alertas.',
    imagem: '/manual-processos/07-preditiva.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['Pontos de medicao definidos.', 'Limites de alerta e critico parametrizados.'],
    passos: [
      'Registrar medicao por TAG e tipo (vibracao, temperatura etc).',
      'Conferir classificacao automatica de status.',
      'Abrir aba Alertas Ativos para itens fora da normalidade.',
      'Encaminhar para O.S/RCA conforme gravidade.',
      'Acompanhar retorno apos intervencao.'
    ],
    validacao: [
      'Alertas sem tratativa nao ficam acumulados.',
      'Itens criticos convertidos em acao formal.',
      'Historico de medicao consistente por TAG.'
    ],
    errosComuns: [
      'Lancar medicao em TAG incorreta.',
      'Ignorar alertas repetidos do mesmo ativo.',
      'Nao fechar ciclo de verificacao apos acao.'
    ]
  },
  {
    id: '10',
    titulo: 'Materiais e baixo estoque',
    modulo: 'Cadastros > Materiais',
    objetivo: 'Assegurar disponibilidade de itens criticos e rastreabilidade de movimentacao.',
    quandoUsar: 'Movimentacao diaria de entrada/saida e revisao de estoque minimo.',
    imagem: '/manual-processos/04-fechar-os.svg',
    perfis: ['USUARIO', 'ADMIN'],
    preRequisitos: ['Cadastro de material com unidade/custo.', 'Politica de estoque minimo definida.'],
    passos: [
      'Buscar material por codigo ou nome.',
      'Registrar movimentacao de entrada ou saida.',
      'Informar motivo da movimentacao para rastreabilidade.',
      'Validar alerta de baixo estoque.',
      'Acionar compra/reposicao quando necessario.'
    ],
    validacao: [
      'Saldo atualizado apos movimentacao.',
      'Itens criticos sem ruptura.',
      'Historico de movimentacao auditavel.'
    ],
    errosComuns: [
      'Saida sem justificativa.',
      'Custo unitario desatualizado.',
      'Estoque minimo fora da realidade operacional.'
    ]
  },
  {
    id: '11',
    titulo: 'SSMA - incidentes e permissao de trabalho',
    modulo: 'Seguranca > SSMA',
    objetivo: 'Registrar ocorrencias e controlar liberacoes de atividade de risco.',
    quandoUsar: 'Sempre que houver incidente, quase incidente ou atividade com PT.',
    imagem: '/manual-processos/08-ssma-incidente.svg',
    perfis: ['USUARIO', 'ADMIN', 'MASTER_TI'],
    preRequisitos: ['Classificacao de risco conhecida.', 'Responsaveis definidos para execucao e supervisao.'],
    passos: [
      'Na aba Incidentes, registrar tipo, severidade e descricao.',
      'Informar local, envolvidos e acoes imediatas.',
      'Na aba PT, abrir permissao para atividade de risco.',
      'Definir riscos, controles, EPIs e responsaveis.',
      'Salvar e acompanhar status da liberacao.'
    ],
    validacao: [
      'Incidente registrado com dados minimos completos.',
      'PT vinculada ao servico e periodo.',
      'Historico SSMA disponivel para consulta.'
    ],
    errosComuns: [
      'Severidade subestimada.',
      'PT sem controles de risco claros.',
      'EPIs obrigatorios nao informados.'
    ]
  },
  {
    id: '12',
    titulo: 'RCA, melhorias e licoes aprendidas',
    modulo: 'Analises > RCA e Melhorias',
    objetivo: 'Eliminar causa raiz de falhas recorrentes e registrar ganhos.',
    quandoUsar: 'Falhas repetitivas, alto custo de manutencao ou impacto de seguranca.',
    imagem: '/manual-processos/10-rca-custos.svg',
    perfis: ['USUARIO', 'ADMIN', 'MASTER_TI'],
    preRequisitos: ['Historico da falha disponivel.', 'Responsavel tecnico nomeado.'],
    passos: [
      'Abrir RCA e selecionar metodo (5 porques, Ishikawa etc).',
      'Descrever problema e causa raiz confirmada.',
      'Definir acao corretiva e criterio de eficacia.',
      'Cadastrar melhoria associada (quando aplicavel).',
      'Acompanhar status ate implementacao.'
    ],
    validacao: [
      'RCA concluida com acao executavel.',
      'Melhoria registrada com ganho esperado.',
      'Falha recorrente com tendencia de reducao.'
    ],
    errosComuns: [
      'Confundir sintoma com causa raiz.',
      'Acao sem dono e prazo.',
      'Nao medir eficacia apos implementacao.'
    ]
  },
  {
    id: '13',
    titulo: 'Custos, relatorios e fechamento gerencial',
    modulo: 'Relatorios > Custos e Relatorios',
    objetivo: 'Consolidar desempenho tecnico-financeiro para decisao gerencial.',
    quandoUsar: 'Fechamento semanal/mensal e reuniao de resultados.',
    imagem: '/manual-processos/10-rca-custos.svg',
    perfis: ['ADMIN', 'MASTER_TI'],
    preRequisitos: ['O.S fechadas com custos completos.', 'Periodo de analise definido.'],
    passos: [
      'Abrir modulo Custos e selecionar periodo.',
      'Analisar composicao (mao de obra, material, terceiros).',
      'Verificar ranking por equipamento/ativo.',
      'Cruzar com MTBF, MTTR e backlog.',
      'Gerar relatorio para plano de acao.'
    ],
    validacao: [
      'Top custos por ativo identificados.',
      'Desvios relevantes com acao definida.',
      'Indicadores apresentados em reuniao de rotina.'
    ],
    errosComuns: [
      'Comparar periodos com dados incompletos.',
      'Nao separar custo reativo vs planejado.',
      'Decidir sem cruzar com criticidade do ativo.'
    ]
  },
  {
    id: '14',
    titulo: 'Usuarios, auditoria e governanca',
    modulo: 'Administracao > Usuarios e Auditoria',
    objetivo: 'Controlar acesso e rastrear acoes criticas no tenant.',
    quandoUsar: 'Onboarding de usuario, troca de perfil e investigacao de ocorrencias.',
    imagem: '/manual-processos/01-login.svg',
    perfis: ['ADMIN', 'MASTER_TI'],
    preRequisitos: ['Permissao administrativa ativa.', 'Politica de perfis definida pela empresa.'],
    passos: [
      'Revisar usuarios e perfis ativos.',
      'Atualizar papel conforme funcao atual.',
      'Consultar auditoria por usuario/acao.',
      'Investigar divergencias de uso e registrar tratativa.',
      'Aplicar revisao periodica de acessos.'
    ],
    validacao: [
      'Usuarios ativos com perfil adequado.',
      'Trilha de auditoria consultavel por periodo.',
      'Sem acessos administrativos indevidos.'
    ],
    errosComuns: [
      'Manter usuario desligado com acesso ativo.',
      'Conceder ADMIN sem necessidade de funcao.',
      'Nao revisar logs apos incidente operacional.'
    ]
  }
];

const perfisTreinamento: { id: RoleManual; label: string; slug: string }[] = [
  { id: 'USUARIO', label: 'Usuario' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'MASTER_TI', label: 'Master TI' }
];

function mapSlugToRole(slug?: string): RoleManual | null {
  if (!slug) return null;
  if (slug === 'usuario') return 'USUARIO';
  if (slug === 'admin') return 'ADMIN';
  if (slug === 'master-ti') return 'MASTER_TI';
  return null;
}

function mapRoleToSlug(role: RoleManual): string {
  if (role === 'USUARIO') return 'usuario';
  if (role === 'ADMIN') return 'admin';
  return 'master-ti';
}

function mapToRoleManual(role?: string): RoleManual {
  if (role === 'MASTER_TI' || role === 'SYSTEM_OWNER' || role === 'SYSTEM_ADMIN') return 'MASTER_TI';
  if (role === 'ADMIN') return 'ADMIN';
  return 'USUARIO';
}

function resolveManualGroup(modulo: string): string {
  if (modulo.startsWith('Acesso')) return 'Acesso e Fluxo Operacional';
  if (modulo.startsWith('Ordens de Servico')) return 'Acesso e Fluxo Operacional';
  if (modulo.startsWith('Planejamento')) return 'Planejamento';
  if (modulo.startsWith('Cadastros')) return 'Cadastros e Suprimentos';
  if (modulo.startsWith('Seguranca')) return 'Seguranca e Conformidade';
  if (modulo.startsWith('Analises')) return 'Analises e Melhoria Continua';
  if (modulo.startsWith('Relatorios')) return 'Gestao e Indicadores';
  if (modulo.startsWith('Administracao')) return 'Administracao e Governanca';
  return 'Outros';
}

function buildSceneEtapas(op: OperacaoManual): string[] {
  return op.passos.slice(0, 4);
}

function buildSceneSimulacao(op: OperacaoManual): ManualDemoScene['simulacao'] {
  if (op.id === '01') {
    return {
      tela: 'Tela de Login',
      campos: [
        { label: 'Email', valor: 'teste@gmail.com' },
        { label: 'Senha', valor: 'Senha@123', mascarado: true }
      ],
      acao: 'Entrar',
      resultado: 'Sessao iniciada e menu carregado.'
    };
  }

  if (op.id === '02') {
    return {
      tela: 'Nova Solicitacao',
      campos: [
        { label: 'TAG', valor: 'BOMBA-101' },
        { label: 'Urgencia', valor: 'Urgente' },
        { label: 'Descricao', valor: 'Vazamento no selo mecanico com risco de parada.' }
      ],
      acao: 'Salvar Solicitacao',
      resultado: 'Solicitacao enviada para a fila de triagem.'
    };
  }

  if (op.id === '03') {
    return {
      tela: 'Backlog Diario',
      campos: [
        { label: 'Filtro Prioridade', valor: 'Critica + Alta' },
        { label: 'Filtro Status', valor: 'Em Aberto' },
        { label: 'Ordenacao', valor: 'Maior risco operacional' }
      ],
      acao: 'Aplicar Filtros',
      resultado: 'Backlog priorizado com itens criticos no topo.'
    };
  }

  if (op.id === '04') {
    return {
      tela: 'Emissao de O.S',
      campos: [
        { label: 'Solicitacao', valor: 'SOL-2026-00421' },
        { label: 'Tipo', valor: 'Corretiva' },
        { label: 'Prioridade', valor: 'Alta' },
        { label: 'Escopo', valor: 'Troca de selo e alinhamento do conjunto.' }
      ],
      acao: 'Gerar O.S',
      resultado: 'O.S OS-2026-00891 emitida com sucesso.'
    };
  }

  if (op.id === '05') {
    return {
      tela: 'Fechamento de O.S',
      campos: [
        { label: 'O.S', valor: 'OS-2026-00891' },
        { label: 'Horas Executadas', valor: '03:40' },
        { label: 'Materiais', valor: 'Selo mecanico 2" + junta vedacao' },
        { label: 'Servico Realizado', valor: 'Substituicao e teste funcional aprovado.' }
      ],
      acao: 'Concluir Fechamento',
      resultado: 'O.S fechada e custos consolidados.'
    };
  }

  if (op.id === '06') {
    return {
      tela: 'Historico de O.S',
      campos: [
        { label: 'Periodo', valor: '01/03/2026 - 16/03/2026' },
        { label: 'Status', valor: 'Fechadas' },
        { label: 'TAG', valor: 'BOMBA-101' },
        { label: 'Filtro Analitico', valor: 'Reincidencia + Lead Time' }
      ],
      acao: 'Analisar Historico',
      resultado: 'Relacao de falhas recorrentes e gargalos exibida.'
    };
  }

  return {
    tela: op.modulo,
    campos: [
      { label: 'Contexto', valor: op.quandoUsar },
      { label: 'Objetivo', valor: op.objetivo }
    ],
    acao: 'Executar Rotina',
    resultado: 'Rotina concluida com checklist aprovado.'
  };
}

function buildDemoScenes(ops: OperacaoManual[]): ManualDemoScene[] {
  const ordenadas = [...ops].sort((a, b) => a.id.localeCompare(b.id, 'pt-BR', { numeric: true }));

  return ordenadas.map((op) => ({
    id: op.id,
    modulo: op.modulo,
    titulo: op.titulo,
    imagem: op.imagem,
    etapas: buildSceneEtapas(op),
    simulacao: buildSceneSimulacao(op)
  }));
}

export default function ManualOperacao() {
  const { user } = useAuth();
  const { perfil } = useParams();
  const navigate = useNavigate();
  const [simStep, setSimStep] = useState<'typing' | 'ready' | 'submitting' | 'done'>('typing');
  const [videoSceneIndex, setVideoSceneIndex] = useState(0);
  const [videoStepIndex, setVideoStepIndex] = useState(0);
  const [campoAtivoIndex, setCampoAtivoIndex] = useState(0);
  const [charCampoAtual, setCharCampoAtual] = useState(0);

  const roleAtual = mapToRoleManual(user?.tipo);
  const rolePorRota = mapSlugToRole(perfil);
  const podeAcessarTreinamento = roleAtual === 'ADMIN' || roleAtual === 'MASTER_TI';
  const roleEfetivo = rolePorRota || roleAtual;

  useEffect(() => {
    if (!perfil) {
      navigate(`/manuais-operacao/${mapRoleToSlug(roleAtual)}`, { replace: true });
      return;
    }

    if (!rolePorRota) {
      navigate(`/manuais-operacao/${mapRoleToSlug(roleAtual)}`, { replace: true });
      return;
    }

    // Usuario comum sempre visualiza apenas o proprio manual.
    if (!podeAcessarTreinamento && rolePorRota !== roleAtual) {
      navigate(`/manuais-operacao/${mapRoleToSlug(roleAtual)}`, { replace: true });
    }
  }, [perfil, roleAtual, rolePorRota, navigate, podeAcessarTreinamento]);

  const tituloManual = useMemo(() => {
    return `Manual do perfil ${roleEfetivo}`;
  }, [roleEfetivo]);

  const operacoesFiltradas = useMemo(() => {
    return operacoes.filter((op) => op.perfis.includes(roleEfetivo));
  }, [roleEfetivo]);

  const demoScenes = useMemo(() => {
    return buildDemoScenes(operacoesFiltradas);
  }, [operacoesFiltradas]);

  const groupedChapters = useMemo(() => {
    const grouped = new Map<string, OperacaoManual[]>();
    operacoesFiltradas.forEach((op) => {
      const group = resolveManualGroup(op.modulo);
      const current = grouped.get(group) || [];
      current.push(op);
      grouped.set(group, current);
    });

    return Array.from(grouped.entries()).map(([group, items]) => ({ group, items }));
  }, [operacoesFiltradas]);

  useEffect(() => {
    if (!demoScenes.length) {
      setVideoSceneIndex(0);
      setVideoStepIndex(0);
      setCampoAtivoIndex(0);
      setCharCampoAtual(0);
      setSimStep('typing');
      return;
    }

    setVideoSceneIndex(0);
    setVideoStepIndex(0);
    setCampoAtivoIndex(0);
    setCharCampoAtual(0);
    setSimStep('typing');
  }, [roleEfetivo, demoScenes.length]);

  const cenaAtualDemo = demoScenes[videoSceneIndex] ?? null;

  useEffect(() => {
    if (!cenaAtualDemo) return;

    const campos = cenaAtualDemo.simulacao.campos;

    if (simStep === 'typing') {
      const campoAtual = campos[campoAtivoIndex];
      if (!campoAtual) {
        setSimStep('ready');
        return;
      }

      if (charCampoAtual < campoAtual.valor.length) {
        const timerChar = window.setTimeout(() => {
          setCharCampoAtual((current) => current + 1);
        }, 35);
        return () => window.clearTimeout(timerChar);
      }

      if (campoAtivoIndex < campos.length - 1) {
        const timerCampo = window.setTimeout(() => {
          setCampoAtivoIndex((current) => current + 1);
          setCharCampoAtual(0);
        }, 180);
        return () => window.clearTimeout(timerCampo);
      }

      const timerReady = window.setTimeout(() => {
        setSimStep('ready');
      }, 280);
      return () => window.clearTimeout(timerReady);
    }

    if (simStep === 'ready') {
      const timerSubmit = window.setTimeout(() => {
        setSimStep('submitting');
        setVideoStepIndex(0);
      }, 500);
      return () => window.clearTimeout(timerSubmit);
    }

    if (simStep === 'submitting') {
      if (videoStepIndex >= cenaAtualDemo.etapas.length - 1) {
        const timerDone = window.setTimeout(() => {
          setSimStep('done');
        }, 750);
        return () => window.clearTimeout(timerDone);
      }

      const timerEtapa = window.setTimeout(() => {
        setVideoStepIndex((current) => current + 1);
      }, 700);
      return () => window.clearTimeout(timerEtapa);
    }

    if (simStep !== 'done') return;

    const timerCena = window.setTimeout(() => {
      setVideoSceneIndex((current) => (current + 1) % demoScenes.length);
      setVideoStepIndex(0);
      setCampoAtivoIndex(0);
      setCharCampoAtual(0);
      setSimStep('typing');
    }, 1400);

    return () => window.clearTimeout(timerCena);
  }, [simStep, demoScenes.length, cenaAtualDemo, videoStepIndex, campoAtivoIndex, charCampoAtual]);

  const progressoVideo = demoScenes.length
    ? Math.round(((videoSceneIndex + 1) / demoScenes.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#101f35_0%,#0b1422_35%,#090f1a_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="mb-6 rounded-xl border border-slate-700/70 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <BookOpen className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Manuais de Operacao do Sistema</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100">{tituloManual}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Pagina operacional completa com imagens estampadas na tela, passo a passo, criterios de validacao
            e erros comuns por processo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir este manual
            </button>
          </div>
        </header>

        <section className="mb-8 overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900/70 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-slate-700/70 p-6 lg:border-b-0 lg:border-r">
              <div className="mb-4 flex items-center gap-2 text-cyan-300">
                <PlayCircle className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">Simulador Completo do Usuario Final</h2>
              </div>
              <div className="rounded-lg border border-slate-700 bg-[#0d1728] p-4">
                <p className="mb-3 text-xs text-slate-400">Todos os modulos executam no mesmo estilo do login: digitacao, acao e confirmacao.</p>
                <div className="space-y-3">
                  <div className="rounded border border-slate-700 bg-slate-950 p-3">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Tela atual</p>
                    <p className="text-sm font-semibold text-cyan-100">{cenaAtualDemo?.simulacao.tela ?? 'Carregando simulacao...'}</p>
                  </div>

                  {(cenaAtualDemo?.simulacao.campos ?? []).map((campo, index) => {
                    const valorCompleto = campo.mascarado ? '•'.repeat(campo.valor.length) : campo.valor;
                    let valorRenderizado = '';
                    if (index < campoAtivoIndex) {
                      valorRenderizado = valorCompleto;
                    } else if (index === campoAtivoIndex) {
                      valorRenderizado = valorCompleto.slice(0, charCampoAtual);
                    }

                    const campoAtivo = simStep === 'typing' && index === campoAtivoIndex;

                    return (
                      <div key={`${cenaAtualDemo?.id ?? 'scene'}-${campo.label}-${index}`} className="rounded border border-slate-700 bg-slate-950 p-3">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{campo.label}</p>
                        <p className="font-mono text-sm text-slate-100">
                          {valorRenderizado}
                          {campoAtivo && <span className="animate-pulse">|</span>}
                        </p>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className={`w-full rounded-md px-4 py-2 text-sm font-semibold transition-all ${simStep === 'submitting' ? 'scale-[1.03] bg-cyan-400 text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.45)]' : simStep === 'done' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-700 text-slate-200'}`}
                  >
                    {simStep === 'submitting' ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processando...</span>
                    ) : simStep === 'done' ? (cenaAtualDemo?.simulacao.resultado ?? 'Concluido com sucesso') : (cenaAtualDemo?.simulacao.acao ?? 'Executar')}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 text-cyan-300">
                <PlayCircle className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">Video Guiado Operacional</h2>
              </div>
              {cenaAtualDemo ? (
                <>
                  <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                    <div className="relative">
                      <img src={cenaAtualDemo.imagem} alt={`Demo ${cenaAtualDemo.modulo}`} className="h-52 w-full object-cover transition-all duration-700" />
                      <div className="absolute left-3 top-3 rounded-full border border-red-300/70 bg-red-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-100">
                        Ao vivo
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/80">
                        <div className="h-full bg-cyan-400 transition-all duration-700" style={{ width: `${progressoVideo}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Roteiro em execucao</p>
                    <h3 className="text-lg font-semibold text-slate-100">{cenaAtualDemo.modulo}</h3>
                    <p className="text-sm text-slate-300">{cenaAtualDemo.titulo}</p>
                  </div>
                  <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">Simulacao etapa por etapa</p>
                    <ul className="space-y-2">
                      {cenaAtualDemo.etapas.map((etapa, index) => {
                        const concluida = index < videoStepIndex;
                        const ativa = index === videoStepIndex && simStep === 'submitting';

                        return (
                          <li key={`${cenaAtualDemo.id}-${etapa}`} className={`flex items-start gap-2 rounded-md border px-2 py-2 text-xs transition-all ${concluida ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100' : ativa ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 text-slate-400'}`}>
                            {concluida ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" />
                            ) : ativa ? (
                              <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-none animate-spin" />
                            ) : (
                              <PlayCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                            )}
                            <span>{etapa}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {demoScenes.map((item, index) => (
                      <span key={item.id} className={`rounded-full border px-2 py-1 text-[11px] ${index === videoSceneIndex ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>
                        {item.id} {item.modulo}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-300">Nenhum modulo disponivel para este perfil.</p>
              )}
            </div>
          </div>
        </section>

        {podeAcessarTreinamento && (
          <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Acesso de treinamento</h2>
            <p className="mb-3 text-sm text-slate-300">
              Admin e Master TI podem acessar os manuais de todos os perfis para suporte e treinamento de equipes.
            </p>
            <div className="flex flex-wrap gap-2">
              {perfisTreinamento.map((opcao) => (
                <button
                  key={opcao.id}
                  onClick={() => navigate(`/manuais-operacao/${mapRoleToSlug(opcao.id)}`)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    roleEfetivo === opcao.id
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                      : 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800'
                  }`}
                  type="button"
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-xl border border-slate-700 bg-slate-900/80 p-4 lg:sticky lg:top-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Capitulos do Manual</h2>
            <div className="space-y-4">
              {groupedChapters.map(({ group, items }) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group}</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        href={`#manual-op-${item.id}`}
                        className="block rounded-md border border-slate-800 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-100"
                      >
                        {item.id}. {item.titulo}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="space-y-8">
            {operacoesFiltradas.map((op) => (
            <article id={`manual-op-${op.id}`} key={op.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/40 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{op.modulo}</p>
                <h2 className="text-xl font-semibold text-foreground">{op.id}. {op.titulo}</h2>
                <p className="mt-2 text-sm text-muted-foreground"><strong>Objetivo:</strong> {op.objetivo}</p>
                <p className="text-sm text-muted-foreground"><strong>Quando usar:</strong> {op.quandoUsar}</p>
              </div>

              <div className="grid gap-6 p-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-background p-3">
                    <img
                      src={op.imagem}
                      alt={`Fluxo visual da operacao ${op.id} - ${op.titulo}`}
                      className="h-auto w-full rounded-md"
                      loading="lazy"
                    />
                  </div>

                  <div className="rounded-lg border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pre-requisitos</h3>
                    <ul className="space-y-2">
                      {op.preRequisitos.map((item) => (
                        <li key={item} className="text-sm text-foreground">- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="rounded-lg border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Passo a passo</h3>
                    <ol className="space-y-2">
                      {op.passos.map((passo) => (
                        <li key={passo} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                          <span>{passo}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="rounded-lg border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Checklist de validacao</h3>
                    <ul className="space-y-2">
                      {op.validacao.map((item) => (
                        <li key={item} className="text-sm text-foreground">- {item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-lg border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Erros comuns e prevencao</h3>
                    <ul className="space-y-2">
                      {op.errosComuns.map((item) => (
                        <li key={item} className="text-sm text-foreground">- {item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </article>
          ))}
          </main>
        </div>
      </div>
    </div>
  );
}
