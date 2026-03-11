import { BookOpen, CheckCircle2 } from 'lucide-react';

const processos = [
  {
    id: '01',
    titulo: 'Login no sistema',
    imagem: '/manual-processos/01-login.svg',
    passos: [
      'Abrir a tela de login do tenant.',
      'Informar email e senha.',
      'Clicar em Entrar e validar o carregamento do menu.',
      'Iniciar rotina com Dashboard e Backlog.'
    ]
  },
  {
    id: '02',
    titulo: 'Abertura de solicitacao',
    imagem: '/manual-processos/02-solicitacao.svg',
    passos: [
      'Acessar Ordens de Servico > Solicitacoes.',
      'Selecionar a TAG correta do equipamento.',
      'Descrever a falha com impacto e contexto.',
      'Classificar urgencia e salvar para gerar SLA.'
    ]
  },
  {
    id: '03',
    titulo: 'Emissao de O.S',
    imagem: '/manual-processos/03-emitir-os.svg',
    passos: [
      'Abrir tela de Emitir O.S.',
      'Definir TAG, tipo e prioridade.',
      'Informar solicitante e problema.',
      'Salvar e imprimir ficha de execucao quando necessario.'
    ]
  },
  {
    id: '04',
    titulo: 'Fechamento de O.S',
    imagem: '/manual-processos/04-fechar-os.svg',
    passos: [
      'Selecionar O.S em aberto.',
      'Lancar horas de inicio/fim e servico executado.',
      'Apontar materiais e custos.',
      'Encerrar a O.S e validar historico atualizado.'
    ]
  },
  {
    id: '05',
    titulo: 'Programacao semanal',
    imagem: '/manual-processos/05-programacao.svg',
    passos: [
      'Abrir Planejamento > Programacao.',
      'Priorizar backlog vencido e urgencias.',
      'Distribuir atividades por recursos disponiveis.',
      'Emitir O.S a partir da agenda semanal.'
    ]
  },
  {
    id: '06',
    titulo: 'Plano preventivo',
    imagem: '/manual-processos/06-preventiva.svg',
    passos: [
      'Cadastrar plano por TAG e frequencia.',
      'Definir atividades de manutencao.',
      'Ativar o plano e enviar para programacao.',
      'Registrar historico de execucao e aderencia.'
    ]
  },
  {
    id: '07',
    titulo: 'Preditiva e alertas ativos',
    imagem: '/manual-processos/07-preditiva.svg',
    passos: [
      'Registrar medicao por TAG e tipo.',
      'Aplicar limites de alerta e critico.',
      'Tratar itens da aba Alertas Ativos.',
      'Abrir O.S ou RCA para ocorrencias criticas.'
    ]
  },
  {
    id: '08',
    titulo: 'SSMA - incidente',
    imagem: '/manual-processos/08-ssma-incidente.svg',
    passos: [
      'Abrir Seguranca > SSMA na aba Incidentes.',
      'Classificar tipo e severidade do evento.',
      'Registrar evidencias, envolvidos e acoes imediatas.',
      'Salvar e escalar para o gestor responsavel.'
    ]
  },
  {
    id: '09',
    titulo: 'SSMA - permissao de trabalho',
    imagem: '/manual-processos/09-ssma-pt.svg',
    passos: [
      'Criar nova permissao de trabalho (PT).',
      'Selecionar tipo de PT conforme risco.',
      'Informar riscos, medidas de controle e EPIs.',
      'Definir executante/supervisor/aprovador e liberar.'
    ]
  },
  {
    id: '10',
    titulo: 'RCA e analise de custos',
    imagem: '/manual-processos/10-rca-custos.svg',
    passos: [
      'Abrir RCA para ocorrencias relevantes.',
      'Identificar causa raiz e plano de acao.',
      'Avaliar eficacia da acao corretiva.',
      'Consolidar custos em Relatorios > Custos.'
    ]
  }
];

export default function ManualOperacao() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-8 rounded-xl border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <BookOpen className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Manuais de Operacao do Sistema</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Manual completo de operacao</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Esta pagina apresenta o passo a passo operacional com imagens de apoio para cada processo critico.
            O objetivo e permitir consulta rapida durante a execucao diaria da manutencao.
          </p>
        </header>

        <main className="space-y-8">
          {processos.map((processo) => (
            <section key={processo.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/40 px-6 py-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {processo.id}. {processo.titulo}
                </h2>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.6fr_1fr]">
                <div className="rounded-lg border bg-background p-3">
                  <img
                    src={processo.imagem}
                    alt={`Fluxo visual do processo ${processo.id} - ${processo.titulo}`}
                    className="h-auto w-full rounded-md"
                    loading="lazy"
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Passo a passo operacional
                  </h3>
                  <ol className="space-y-3">
                    {processo.passos.map((passo) => (
                      <li key={passo} className="flex items-start gap-3 rounded-md border bg-background px-3 py-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                        <span className="text-sm text-foreground">{passo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
