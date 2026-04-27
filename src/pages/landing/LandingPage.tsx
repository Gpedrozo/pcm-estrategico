import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Smartphone,
  Calendar,
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  Star,
  MessageCircle,
  ExternalLink,
  Wrench,
  AlertTriangle,
  Activity,
  TrendingDown,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  CheckSquare,
  Droplets,
  Search,
  FileText,
  Layers,
} from 'lucide-react';
import { DashboardMockup, CalendarioMockup, RelatoriosMockup } from '@/components/landing/SystemMockups';
import { TrialForm } from '@/components/landing/TrialForm';
import { DemoWhatsAppForm } from '@/components/landing/DemoWhatsAppForm';

// ─── Constantes ───────────────────────────────────────────────────────────────
const WHATSAPP = 'https://wa.me/5546991106129?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCM%20Estrat%C3%A9gico%20e%20gostaria%20de%20conhecer%20o%20sistema.';

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ onTrialClick }: { onTrialClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">PCM Estratégico</span>
          <span className="hidden sm:inline-block text-slate-600 text-xs ml-1">by GPPIS</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
          <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contato</a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Entrar
          </a>
          <button
            onClick={onTrialClick}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-all shadow-lg shadow-blue-500/20"
          >
            Testar grátis
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function HeroSection({ onTrialClick }: { onTrialClick: () => void }) {
  const [machines, setMachines] = useState('');
  const [hoursDown, setHoursDown] = useState('');

  const costPerYear = (() => {
    const m = parseInt(machines) || 0;
    const h = parseInt(hoursDown) || 0;
    if (m === 0 || h === 0) return null;
    return (m * h * 850 * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  })();

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-700/6 rounded-full blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-sm text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sua fábrica parou hoje. Quanto isso custou?</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              Acabe com o{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                ciclo vicioso
              </span>
              <br />da manutenção.
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              Máquina quebra → produção para → gestor apaga incêndio → máquina quebra de novo.
              O PCM Estratégico quebra esse ciclo com gestão digital completa da manutenção industrial.
            </p>

            {/* Calculadora de custo */}
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                <DollarSign className="w-4 h-4" />
                Calcule seu prejuízo com paradas não planejadas
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Nº de máquinas críticas</label>
                  <input
                    type="number"
                    min="0"
                    value={machines}
                    onChange={e => setMachines(e.target.value)}
                    placeholder="Ex: 12"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Horas paradas / mês</label>
                  <input
                    type="number"
                    min="0"
                    value={hoursDown}
                    onChange={e => setHoursDown(e.target.value)}
                    placeholder="Ex: 8"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {costPerYear ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-red-300 text-sm">Prejuízo estimado / ano:</span>
                  <span className="text-red-400 text-xl font-bold">{costPerYear}</span>
                </div>
              ) : (
                <div className="text-slate-600 text-xs italic">Preencha os campos para ver o custo estimado anual</div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onTrialClick}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl px-7 py-4 transition-all duration-200 text-sm shadow-xl shadow-blue-500/25 group"
              >
                Testar 30 dias grátis — sem cartão
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-slate-700 hover:border-green-500/50 text-slate-300 hover:text-white font-medium rounded-xl px-6 py-4 transition-all duration-200 text-sm"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                Quero uma demo ao vivo
              </a>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              {[
                { value: '1.200+', label: 'OS gerenciadas' },
                { value: '18', label: 'empresas ativas' },
                { value: '97%', label: 'disponibilidade média' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 animate-bounce">
        <span className="text-xs">Conheça o sistema</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </section>
  );
}

// ─── Antes vs Depois ──────────────────────────────────────────────────────────
function AntesDepoisSection() {
  const items = [
    {
      antes: 'OS anotada no papel, mecânico descobre o serviço por ligação telefônica',
      depois: 'OS criada no sistema, mecânico recebe notificação imediata com todos os detalhes',
    },
    {
      antes: 'Planilha de preventivas desatualizada, máquina quebra sem aviso',
      depois: 'Plano PCM automático gera OS preventivas antes do prazo vencer',
    },
    {
      antes: 'Gestor não sabe o que está acontecendo na oficina em tempo real',
      depois: 'Dashboard ao vivo: status de cada OS, quem está fazendo o quê, tempo decorrido',
    },
    {
      antes: 'Relatório de MTBF feito no Excel, levando horas toda semana',
      depois: 'KPIs calculados automaticamente: MTBF, MTTR, disponibilidade, custo por equipamento',
    },
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 text-xs text-slate-400 mb-4">
            <Clock className="w-3.5 h-3.5" />
            Antes e depois do PCM Estratégico
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Reconhece essa situação?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Esses são os problemas mais comuns. Veja como o sistema resolve cada um deles.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center text-xs font-semibold text-red-400 uppercase tracking-widest py-2 bg-red-500/5 rounded-t-xl border border-red-500/10">
            ✗ Antes
          </div>
          <div className="text-center text-xs font-semibold text-emerald-400 uppercase tracking-widest py-2 bg-emerald-500/5 rounded-t-xl border border-emerald-500/10">
            ✓ Com PCM Estratégico
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 rounded-xl px-4 py-4 bg-red-500/5 border border-red-500/10">
                <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-400 text-sm">{item.antes}</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl px-4 py-4 bg-emerald-500/5 border border-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-200 text-sm font-medium">{item.depois}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Funcionalidades com mockups ──────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      label: 'Gestão de Ordens de Serviço',
      icon: ClipboardList,
      description: 'Crie, atribua e acompanhe OS corretivas, preventivas e preditivas em tempo real. Histórico completo por equipamento com fotos, peças utilizadas e tempo de execução.',
      badges: ['OS Corretiva', 'OS Preventiva', 'Preditiva', 'Histórico completo', 'Relatórios PDF'],
      mockup: <DashboardMockup />,
      hint: null,
    },
    {
      label: 'Calendário PCM e Preventivas',
      icon: Calendar,
      description: 'Monte planos de manutenção com periodicidade por horas, dias ou produção. O sistema alerta automaticamente quando a manutenção está próxima — clique em qualquer data para ver os detalhes.',
      badges: ['Planos PCM', 'Alertas automáticos', 'Lubrificação', 'Inspeções', 'Calendário interativo'],
      mockup: <CalendarioMockup />,
      hint: '👆 Clique em uma data colorida no calendário!',
    },
    {
      label: 'KPIs e Relatórios Gerenciais',
      icon: BarChart3,
      description: 'MTBF, MTTR, disponibilidade, backlog de manutenção e custo por equipamento. Relatórios prontos para exportar em PDF. Tome decisões com dados reais, não com suposições.',
      badges: ['MTBF / MTTR', 'Disponibilidade', 'Custo por equip.', 'Backlog PCM', 'PDF automático'],
      mockup: <RelatoriosMockup />,
      hint: null,
    },
  ];

  return (
    <section className="py-20 bg-slate-950" id="funcionalidades">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-4">
            <Activity className="w-3.5 h-3.5" />
            Funcionalidades completas
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Tudo que você precisa, em um só lugar</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Do gestor de manutenção ao técnico de campo — cada perfil tem exatamente o que precisa.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feat, i) => (
            <div
              key={feat.label}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}
            >
              <div className={i % 2 === 1 ? 'lg:col-start-2' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                    <feat.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feat.label}</h3>
                </div>
                <p className="text-slate-400 leading-relaxed mb-5">{feat.description}</p>
                {feat.hint && (
                  <div className="mb-4 flex items-center gap-2 text-amber-400/80 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                    <span>{feat.hint}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {feat.badges.map(b => (
                    <span key={b} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-1 rounded-full">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div className={i % 2 === 1 ? 'lg:col-start-1' : ''}>{feat.mockup}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── App mobile (em desenvolvimento) ─────────────────────────────────────────
function AppMobileSection() {
  return (
    <section className="py-16 bg-slate-900 border-y border-slate-800/60">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/20 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-7 h-7 text-blue-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs text-amber-400 mb-3">
              <Zap className="w-3 h-3" />
              Em desenvolvimento — em breve disponível
            </div>
            <h3 className="text-white text-xl font-bold mb-2">App do Mecânico (Android & iOS)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              O mecânico vai receber as OS diretamente no celular, registrar o que foi feito, adicionar fotos e fechar o atendimento — sem papel, sem ligação, sem demora.
              Com suporte offline, ele trabalha mesmo sem internet e sincroniza ao retornar à rede.
            </p>
          </div>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 border border-slate-700 hover:border-green-500/40 text-slate-300 hover:text-white text-sm rounded-xl px-5 py-3 transition-all"
          >
            <MessageCircle className="w-4 h-4 text-green-400" />
            Quero ser avisado
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Módulos com Accordion ────────────────────────────────────────────────────
interface Modulo {
  icon: React.ElementType;
  label: string;
  tagColor: string;
  tag: string;
  paraQuem: string;
  problema: string;
  funcionalidades: string[];
}

const modulos: Modulo[] = [
  {
    icon: ClipboardList,
    label: 'Ordens de Serviço (OS)',
    tag: 'Core',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    paraQuem: 'Gestor, Supervisor, Técnico',
    problema: 'Sabe aquela OS que ficou perdida no papel e a máquina quebrou de novo porque ninguém executou? O módulo de OS elimina isso.',
    funcionalidades: [
      'Criação de OS corretiva, preventiva e preditiva',
      'Atribuição para mecânico responsável',
      'Acompanhamento de status em tempo real',
      'Registro de peças e materiais utilizados',
      'Fotos e evidências fotográficas',
      'Histórico completo por equipamento',
      'Relatórios automáticos em PDF',
      'Prioridade e criticidade configurável',
    ],
  },
  {
    icon: Calendar,
    label: 'PCM e Manutenção Preventiva',
    tag: 'Core',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    paraQuem: 'Gestor PCM, Engenheiro de Manutenção',
    problema: 'Planilha de preventivas desatualizada significa máquina quebrando quando menos se espera. O módulo PCM automatiza tudo.',
    funcionalidades: [
      'Planos de manutenção por horas, dias ou produção',
      'Geração automática de OS preventivas',
      'Alertas antes do prazo vencer',
      'Calendário visual de atividades programadas',
      'Histórico de execuções e conformidade',
      'Indicadores de cumprimento do plano',
      'Integração com estoque de peças',
    ],
  },
  {
    icon: Droplets,
    label: 'Lubrificação',
    tag: 'PCM',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    paraQuem: 'Técnico de Lubrificação, Gestor',
    problema: 'Lubrificação esquecida é uma das principais causas de falha em equipamentos rotativos. O módulo cria rotas e não deixa nada passar.',
    funcionalidades: [
      'Cadastro de pontos de lubrificação por equipamento',
      'Rotas de lubrificação otimizadas',
      'Cronogramas automáticos',
      'Registro do produto e quantidade aplicada',
      'Histórico de lubrificações por ponto',
      'Alertas de vencimento de lubrificação',
      'Controle de estoque de lubrificantes',
    ],
  },
  {
    icon: CheckSquare,
    label: 'Inspeções e Checklists',
    tag: 'PCM',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    paraQuem: 'Técnico, Inspetor, Supervisor',
    problema: 'Inspeção feita na memória e anotada em papel perde evidências e não cria histórico. O módulo digitaliza e rastreia tudo.',
    funcionalidades: [
      'Modelos de checklist configuráveis',
      'Inspeção com fotos e evidências',
      'Checklist por equipamento ou rota',
      'Registro de não-conformidades',
      'Geração automática de OS a partir de falhas',
      'Histórico de inspeções por período',
      'Relatórios de conformidade',
    ],
  },
  {
    icon: Activity,
    label: 'Manutenção Preditiva',
    tag: 'Avançado',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    paraQuem: 'Engenheiro de Confiabilidade, Gestor',
    problema: 'Manutenção corretiva custa 3x mais que preditiva. O módulo registra análises de condição para antecipar falhas.',
    funcionalidades: [
      'Registro de análise de vibração',
      'Monitoramento de temperatura',
      'Análise de óleo e fluidos',
      'Tendências e histórico de parâmetros',
      'Alertas de desvio de condição',
      'Relatórios técnicos de condição',
      'Integração com OS preditiva',
    ],
  },
  {
    icon: Search,
    label: 'FMEA / RCM',
    tag: 'Confiabilidade',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    paraQuem: 'Engenheiro de Manutenção, Gestor',
    problema: 'Sem análise de falha e criticidade, a equipe só reage. O FMEA permite priorizar o que realmente importa.',
    funcionalidades: [
      'Análise de modos e efeitos de falha (FMEA)',
      'RCM — Manutenção Centrada na Confiabilidade',
      'Matriz de criticidade de equipamentos',
      'Planos de ação baseados em risco',
      'Histórico de análises por equipamento',
      'Relatórios de confiabilidade',
    ],
  },
  {
    icon: FileText,
    label: 'RCA — Análise de Causa Raiz',
    tag: 'IA',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    paraQuem: 'Engenheiro, Gestor, Diretor',
    problema: 'A mesma máquina quebrou 3 vezes no mês? Sem RCA, a equipe sempre conserta o efeito, nunca a causa.',
    funcionalidades: [
      'Árvore de causa raiz visual',
      'Métodos: 5 Porquês, Diagrama de Ishikawa',
      'Sugestão de causas via IA integrada',
      'Plano de ação corretivo',
      'Acompanhamento de eficácia',
      'Histórico de análises por falha',
    ],
  },
  {
    icon: Shield,
    label: 'SSMA — Saúde, Segurança e Meio Ambiente',
    tag: 'Compliance',
    tagColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    paraQuem: 'SSMA, Supervisor, Gestor',
    problema: 'Manutenção sem controle de segurança é risco de acidente e autuação. O módulo integra SSMA ao fluxo de trabalho.',
    funcionalidades: [
      'Registro de incidentes e quase-acidentes',
      'APR — Análise Preliminar de Risco',
      'Controle de EPIs por atividade',
      'Treinamentos e certificações da equipe',
      'Indicadores de segurança (TRIF, LTIR)',
      'Relatórios de conformidade SSMA',
    ],
  },
  {
    icon: DollarSign,
    label: 'Custos de Manutenção',
    tag: 'Gestão',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    paraQuem: 'Gestor, Diretor, Controller',
    problema: 'Sem controle de custos, a empresa não sabe qual máquina consome mais, impossibilitando decisões de reforma ou substituição.',
    funcionalidades: [
      'Custo por OS (mão de obra + materiais)',
      'Custo acumulado por equipamento',
      'Custo por centro de custo',
      'Comparativo corretiva vs. preventiva',
      'Orçamentos e aprovações',
      'Relatórios financeiros de manutenção',
      'Tendências de custo por período',
    ],
  },
  {
    icon: Layers,
    label: 'Backlog e Programação PCM',
    tag: 'Gestão',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    paraQuem: 'Gestor PCM, Supervisor',
    problema: 'Sem programação visual, a equipe trabalha apagando incêndio. O backlog garante que nada fique esquecido.',
    funcionalidades: [
      'Painel de backlog priorizado',
      'Programação semanal visual',
      'Paradas programadas e janelas de manutenção',
      'Balanceamento de carga da equipe',
      'Evolução do backlog no tempo',
      'Integração com preventivas e OS',
    ],
  },
  {
    icon: BarChart3,
    label: 'Relatórios e KPIs',
    tag: 'Indicadores',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    paraQuem: 'Gestor, Diretor, Engenheiro',
    problema: 'Sem KPIs, a gestão opera no escuro. O módulo entrega os indicadores que mostram se a manutenção está evoluindo.',
    funcionalidades: [
      'MTBF — Tempo Médio Entre Falhas',
      'MTTR — Tempo Médio de Reparo',
      'Disponibilidade operacional',
      'Índice de manutenção preventiva vs. corretiva',
      'Gráficos de tendência por período',
      'Exportação em PDF e Excel',
      'Dashboard executivo',
    ],
  },
  {
    icon: Users,
    label: 'Perfis e Administração',
    tag: 'Acesso',
    tagColor: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    paraQuem: 'Administrador, RH',
    problema: 'Todo mundo acessa tudo? O módulo define exatamente o que cada perfil pode ver e fazer dentro do sistema.',
    funcionalidades: [
      'Perfis: Gestor, Supervisor, Técnico, Solicitante, Engenheiro',
      'Permissões granulares por módulo',
      'Cadastro de mecânicos e equipes',
      'Log de auditoria de todas as ações',
      'Múltiplas plantas ou unidades',
      'Relatório de atividade por usuário',
    ],
  },
];

function ModulosSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 bg-slate-950" id="modulos">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 text-xs text-slate-400 mb-4">
            <Settings className="w-3.5 h-3.5" />
            12 módulos integrados
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Módulos completos do sistema</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Clique em cada módulo para entender o que ele faz, para quem serve e quais problemas resolve.
          </p>
        </div>

        <div className="space-y-2">
          {modulos.map((m, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={m.label}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-blue-500/30 bg-slate-800/60'
                    : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600/60 hover:bg-slate-800/40'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? 'bg-blue-500/20' : 'bg-slate-700/60'}`}>
                    <m.icon className={`w-4 h-4 ${isOpen ? 'text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isOpen ? 'text-white' : 'text-slate-200'}`}>{m.label}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${m.tagColor}`}>{m.tag}</span>
                    </div>
                    {!isOpen && (
                      <span className="text-slate-500 text-xs">{m.funcionalidades.length} funcionalidades · Para: {m.paraQuem}</span>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-400' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500">Para: <span className="text-slate-300">{m.paraQuem}</span></span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-3 mb-4">
                      <p className="text-amber-200/80 text-sm leading-relaxed">💡 {m.problema}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {m.funcionalidades.map(f => (
                        <div key={f} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-xs">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Timeline de implantação ──────────────────────────────────────────────────
function ImplantacaoSection() {
  const steps = [
    { day: 'Hoje', title: 'Cria sua conta', desc: 'Trial ativo em menos de 2 minutos, sem cartão.' },
    { day: 'D+1', title: 'Cadastra as máquinas', desc: 'Hierarquia de equipamentos configurada.' },
    { day: 'D+3', title: 'Primeira OS digital', desc: 'Equipe abrindo e fechando OS no sistema.' },
    { day: 'D+7', title: 'Equipe toda operando', desc: 'Todo o time treinado e usando o sistema.' },
    { day: 'D+30', title: 'Primeiros KPIs', desc: 'MTBF, MTTR e disponibilidade calculados.' },
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Implantação em 1 dia, não em meses</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Sem instalação. Sem TI. Sem projeto de meses. Você cria a conta hoje e a equipe começa a usar amanhã.
          </p>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 mb-4 z-10 ${
                  i === 0 ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-800 border-slate-700'
                }`}>
                  <span className={`text-xs font-bold ${i === 0 ? 'text-white' : 'text-blue-400'}`}>{s.day}</span>
                </div>
                <div className={`text-sm font-semibold mb-1 ${i === 0 ? 'text-white' : 'text-slate-200'}`}>{s.title}</div>
                <div className="text-slate-500 text-xs leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Prova social ─────────────────────────────────────────────────────────────
function ProvaSection() {
  const numeros = [
    { value: '94%', label: 'Redução de OS perdidas', detail: 'nos primeiros 30 dias', icon: TrendingDown, color: 'text-emerald-400' },
    { value: '+31%', label: 'Aumento em disponibilidade', detail: 'média nos clientes ativos', icon: TrendingUp, color: 'text-blue-400' },
    { value: '-60%', label: 'Menos manutenção corretiva', detail: 'após 3 meses de uso', icon: TrendingDown, color: 'text-purple-400' },
    { value: '1 dia', label: 'Para entrar em operação', detail: 'sem TI, sem instalação', icon: Clock, color: 'text-amber-400' },
  ];

  const depoimentos = [
    {
      texto: 'Antes tínhamos OS perdidas em papel e planilhas desatualizadas. Com o PCM Estratégico organizamos toda a equipe em 1 semana. Nunca mais perdemos uma OS.',
      nome: 'Carlos S.', cargo: 'Gerente de Manutenção', segmento: 'Metalúrgica · Paraná', stars: 5,
    },
    {
      texto: 'Os relatórios de MTBF e disponibilidade que o sistema gera automaticamente me poupam horas toda semana. Em 3 meses reduzi a corretiva em mais de 50%.',
      nome: 'Ricardo F.', cargo: 'Engenheiro de Manutenção', segmento: 'Têxtil · São Paulo', stars: 5,
    },
    {
      texto: 'O módulo de lubrificação e inspeções nos fez descobrir falhas antes de elas acontecerem. Nossa disponibilidade subiu de 88% para 96% em 4 meses.',
      nome: 'Mariana L.', cargo: 'Coordenadora PCM', segmento: 'Alimentício · SC', stars: 5,
    },
  ];

  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Resultados reais de quem usa</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {numeros.map((n, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 text-center">
              <n.icon className={`w-5 h-5 mx-auto mb-2 ${n.color}`} />
              <div className={`text-3xl font-bold mb-1 ${n.color}`}>{n.value}</div>
              <div className="text-white text-xs font-semibold mb-0.5">{n.label}</div>
              <div className="text-slate-500 text-[10px]">{n.detail}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {depoimentos.map((d, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4 flex flex-col">
              <div className="flex gap-0.5">
                {Array.from({ length: d.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">"{d.texto}"</p>
              <div className="border-t border-slate-700/50 pt-4">
                <div className="text-white font-semibold text-sm">{d.nome}</div>
                <div className="text-slate-400 text-xs">{d.cargo}</div>
                <div className="text-slate-500 text-xs">{d.segmento}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Planos ───────────────────────────────────────────────────────────────────
function PricingSection({ onTrialClick }: { onTrialClick: () => void }) {
  const plans = [
    {
      name: 'Trial',
      price: 'Grátis',
      period: '30 dias completos',
      description: 'Experimente o sistema inteiro sem compromisso. Todos os módulos liberados.',
      features: ['Todos os 12 módulos', 'Dados reais da sua empresa', 'Suporte por e-mail', 'Onboarding guiado', 'Exportação de relatórios'],
      cta: 'Começar agora — grátis',
      ctaAction: onTrialClick,
      highlight: false,
    },
    {
      name: 'Profissional',
      price: 'Sob consulta',
      period: '/ mês por empresa',
      description: 'Para equipes que precisam de suporte próximo e integrações.',
      features: ['Tudo do Trial', 'Suporte prioritário WhatsApp', 'Onboarding assistido', 'Treinamento da equipe', 'SLA contratado'],
      cta: 'Falar com vendas',
      ctaAction: () => window.open(WHATSAPP, '_blank', 'noopener,noreferrer'),
      highlight: true,
    },
    {
      name: 'Anual',
      price: 'Melhor custo',
      period: '+ 2 meses grátis',
      description: 'O plano de menor custo total para quem quer o melhor resultado.',
      features: ['Tudo do Profissional', '2 meses sem custo', 'Relatórios avançados', 'API de integração', 'Gerente de conta dedicado'],
      cta: 'Falar com vendas',
      ctaAction: () => window.open(WHATSAPP, '_blank', 'noopener,noreferrer'),
      highlight: false,
    },
  ];

  return (
    <section className="py-20 bg-slate-900" id="planos">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Planos simples e transparentes</h2>
          <p className="text-slate-400">Comece grátis. Assine somente quando quiser. Cancele quando quiser.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border flex flex-col gap-5 ${
                plan.highlight
                  ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-800/30 border-slate-700/50'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg shadow-blue-500/30">
                  Mais escolhido
                </div>
              )}
              <div>
                <div className="text-slate-400 text-sm mb-1">{plan.name}</div>
                <div className="text-white text-2xl font-bold">{plan.price}</div>
                <div className="text-slate-500 text-sm">{plan.period}</div>
              </div>
              <p className="text-slate-400 text-sm">{plan.description}</p>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.ctaAction}
                className={`w-full rounded-xl py-3 font-semibold text-sm transition-all duration-200 ${
                  plan.highlight
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trial + Demo ─────────────────────────────────────────────────────────────
function TrialSection() {
  const [activeTab, setActiveTab] = useState<'trial' | 'demo'>('trial');

  return (
    <section className="py-20 bg-slate-950" id="trial">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Comece hoje mesmo</h2>
          <p className="text-slate-400 text-sm">30 dias de acesso completo. Sem cartão. Sem pegadinha.</p>
        </div>
        <div className="flex rounded-xl bg-slate-800 border border-slate-700 p-1 mb-8">
          <button
            onClick={() => setActiveTab('trial')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === 'trial'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🚀 Criar conta trial grátis
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === 'demo'
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Demo ao vivo
            </span>
          </button>
        </div>

        {activeTab === 'trial' ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <TrialForm />
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Demo ao vivo com especialista</h3>
              <p className="text-slate-400 text-sm mt-1">
                Apresentamos o sistema para sua equipe, usando os dados do seu segmento. Resposta em até 2h.
              </p>
            </div>
            <DemoWhatsAppForm />
          </div>
        )}
      </div>
    </section>
  );
}

// ─── CTA final ────────────────────────────────────────────────────────────────
function FinalCTA({ onTrialClick }: { onTrialClick: () => void }) {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Sua equipe pode estar organizada amanhã.
        </h2>
        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          Crie sua conta agora e veja o sistema funcionando em menos de 24 horas.
          Sem TI. Sem instalação. Sem risco.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTrialClick}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-8 py-4 transition-all text-sm shadow-xl shadow-blue-500/25 group"
          >
            Criar conta grátis agora
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-green-500/30 hover:border-green-500/60 text-slate-300 hover:text-white font-medium rounded-xl px-8 py-4 transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4 text-green-400" />
            Prefiro falar com a equipe
          </a>
        </div>
        <p className="text-slate-600 text-xs mt-5">Sem cartão de crédito · Sem instalação · Cancele quando quiser</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/60 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-slate-400 text-sm">PCM Estratégico — GPPIS Tecnologia</span>
        </div>
        <div className="flex gap-5 text-slate-600 text-xs">
          <a href="#" className="hover:text-slate-400 transition-colors">Política de Privacidade</a>
          <a href="#" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Contato</a>
        </div>
        <div className="text-slate-700 text-xs">© 2026 GPPIS. Todos os direitos reservados.</div>
      </div>
    </footer>
  );
}

// ─── WhatsApp flutuante ───────────────────────────────────────────────────────
function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-full px-4 py-3 shadow-2xl shadow-green-500/30 transition-all hover:scale-105"
      aria-label="Falar pelo WhatsApp"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-sm hidden sm:inline">Fale pelo WhatsApp</span>
    </a>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const scrollToTrial = () => {
    document.getElementById('trial')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased">
      <Header onTrialClick={scrollToTrial} />
      <HeroSection onTrialClick={scrollToTrial} />
      <AntesDepoisSection />
      <FeaturesSection />
      <AppMobileSection />
      <ModulosSection />
      <ImplantacaoSection />
      <ProvaSection />
      <PricingSection onTrialClick={scrollToTrial} />
      <TrialSection />
      <FinalCTA onTrialClick={scrollToTrial} />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
