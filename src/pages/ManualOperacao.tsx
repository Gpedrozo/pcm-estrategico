import { useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle2, Printer } from 'lucide-react';
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
    id: '07',
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
    id: '08',
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
    id: '09',
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
    id: '10',
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
    id: '11',
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
    id: '12',
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
    id: '13',
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

export default function ManualOperacao() {
  const { user } = useAuth();
  const { perfil } = useParams();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="mb-6 rounded-xl border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <BookOpen className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Manuais de Operacao do Sistema</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{tituloManual}</h1>
          <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
            Pagina operacional completa com imagens estampadas na tela, passo a passo, criterios de validacao
            e erros comuns por processo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <Printer className="h-4 w-4" />
              Imprimir este manual
            </button>
          </div>
        </header>

        {podeAcessarTreinamento && (
          <section className="mb-8 rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Acesso de treinamento</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Admin e Master TI podem acessar os manuais de todos os perfis para suporte e treinamento de equipes.
            </p>
            <div className="flex flex-wrap gap-2">
              {perfisTreinamento.map((opcao) => (
                <button
                  key={opcao.id}
                  onClick={() => navigate(`/manuais-operacao/${mapRoleToSlug(opcao.id)}`)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    roleEfetivo === opcao.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-muted'
                  }`}
                  type="button"
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <main className="space-y-8">
          {operacoesFiltradas.map((op) => (
            <article key={op.id} className="overflow-hidden rounded-xl border bg-card">
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
  );
}
