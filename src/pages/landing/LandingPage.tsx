import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Play,
  Zap,
  Shield,
  BarChart3,
  Smartphone,
  Calendar,
  ClipboardList,
  Settings,
  ChevronDown,
  Star,
  MessageCircle,
  ExternalLink,
  Wrench,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { DashboardMockup, CalendarioMockup, MobileAppMockup, RelatoriosMockup } from '@/components/landing/SystemMockups';
import { TrialForm } from '@/components/landing/TrialForm';
import { DemoWhatsAppForm } from '@/components/landing/DemoWhatsAppForm';

// ─── Constantes ───────────────────────────────────────────────────────────────
const WHATSAPP = 'https://wa.me/5546991106129?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20conhecer%20o%20PCM%20Estrat%C3%A9gico.';

// ─── Seção de hero ────────────────────────────────────────────────────────────
function HeroSection({ onTrialClick }: { onTrialClick: () => void }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-slate-950">
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-600/6 rounded-full blur-[80px]" />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              <span>PCM Estratégico — Gestão de Manutenção Industrial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              Chega de{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                manutenção
              </span>
              <br />no papel.
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              Gerencie ordens de serviço, preventivas, lubrificações e toda a equipe de manutenção em um único sistema — do computador ao celular do mecânico.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 py-2">
              {[
                { value: '1.200+', label: 'OS abertas' },
                { value: '18', label: 'empresas ativas' },
                { value: '3', label: 'estados' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onTrialClick}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl px-6 py-4 transition-all duration-200 text-sm shadow-lg shadow-blue-500/25 group"
              >
                Testar 30 dias grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-xl px-6 py-4 transition-all duration-200 text-sm"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                Solicitar demo guiada
              </a>
            </div>

            <p className="text-slate-600 text-xs">
              Sem cartão de crédito · Sem instalação · Cancele quando quiser
            </p>
          </div>

          {/* Mockup do Dashboard */}
          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 animate-bounce">
        <span className="text-xs">Saiba mais</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </section>
  );
}

// ─── Seção de problemas/soluções ──────────────────────────────────────────────
function ProblemsSection() {
  const pairs = [
    {
      prob: { icon: AlertTriangle, text: 'OS se perdem no papel, atrasos viram rotina', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
      sol: { icon: ClipboardList, text: 'OS digitais com rastreamento em tempo real e histórico completo', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    },
    {
      prob: { icon: AlertTriangle, text: 'Planilha de preventivas desatualizada, máquinas quebram sem aviso', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
      sol: { icon: Calendar, text: 'PCM automatizado com alertas e calendário inteligente de manutenção', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    },
    {
      prob: { icon: AlertTriangle, text: 'Mecânico não sabe o que precisa fazer, espera ordem verbal', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
      sol: { icon: Smartphone, text: 'App do mecânico no celular: recebe OS, executa e fecha sem papel', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    },
    {
      prob: { icon: AlertTriangle, text: 'Sem indicadores, gestão toma decisões no escuro', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
      sol: { icon: BarChart3, text: 'KPIs de MTBF, MTTR e disponibilidade gerados automaticamente', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    },
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Reconhece essa situação?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Esses são os problemas mais comuns em equipes de manutenção. O PCM Estratégico resolve todos eles.
          </p>
        </div>

        <div className="space-y-4">
          {pairs.map(({ prob, sol }, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-start gap-3 rounded-xl px-4 py-4 border ${prob.bg}`}>
                <prob.icon className={`w-5 h-5 ${prob.color} flex-shrink-0 mt-0.5`} />
                <p className="text-slate-300 text-sm">{prob.text}</p>
              </div>
              <div className={`flex items-start gap-3 rounded-xl px-4 py-4 border ${sol.bg}`}>
                <sol.icon className={`w-5 h-5 ${sol.color} flex-shrink-0 mt-0.5`} />
                <p className="text-slate-200 text-sm font-medium">{sol.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Seção de features com mockups ───────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      label: 'Gestão de Ordens de Serviço',
      icon: ClipboardList,
      description: 'Crie, atribua e acompanhe OS corretivas, preventivas e preditivas. Histórico completo por equipamento, com fotos e relatórios automáticos.',
      badges: ['OS Corretiva', 'OS Preventiva', 'Histórico', 'Relatórios PDF'],
      mockup: <DashboardMockup />,
    },
    {
      label: 'PCM e Preventivas Automáticas',
      icon: Calendar,
      description: 'Monte planos de manutenção preventiva com periodicidade por horas, dias ou produção. O sistema alerta automaticamente quando a manutenção está próxima.',
      badges: ['Planos PCM', 'Alertas automáticos', 'Calendário', 'Lubrificação'],
      mockup: <CalendarioMockup />,
    },
    {
      label: 'App do Mecânico (Mobile)',
      icon: Smartphone,
      description: 'O mecânico recebe as OS no celular, registra o que foi feito, adiciona fotos e fecha o atendimento — sem papel, sem ligação, sem demora.',
      badges: ['Android & iOS', 'Offline first', 'Assinatura digital', 'GPS'],
      mockup: (
        <div className="flex justify-center">
          <MobileAppMockup />
        </div>
      ),
    },
    {
      label: 'KPIs e Relatórios Gerenciais',
      icon: BarChart3,
      description: 'MTBF, MTTR, disponibilidade, backlog de manutenção, custo por equipamento. Relatórios prontos para imprimir ou exportar em PDF.',
      badges: ['MTBF / MTTR', 'Disponibilidade', 'Custo por equip.', 'PDF automático'],
      mockup: <RelatoriosMockup />,
    },
  ];

  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>Funcionalidades completas</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Tudo que você precisa, em um só lugar</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Do gestor de manutenção ao mecânico de campo — cada perfil tem o que precisa.
          </p>
        </div>

        <div className="space-y-20">
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

// ─── Seção de módulos extras ──────────────────────────────────────────────────
function ModulosSection() {
  const modulos = [
    { icon: Activity, label: 'Manutenção Preditiva', desc: 'Análise de vibração, temperatura e óleo' },
    { icon: ClipboardList, label: 'FMEA / RCM', desc: 'Análise de falha e criticidade de equipamentos' },
    { icon: Shield, label: 'SSMA', desc: 'Saúde, segurança e meio ambiente integrados' },
    { icon: BarChart3, label: 'Custos', desc: 'Controle de custo por equipamento e centro de custo' },
    { icon: Settings, label: 'Inspeções', desc: 'Checklists digitais com evidências fotográficas' },
    { icon: Wrench, label: 'Lubrificação', desc: 'Rotas e cronogramas de lubrificação automatizados' },
    { icon: ClipboardList, label: 'RCA', desc: 'Análise de causa raiz com IA integrada' },
    { icon: Zap, label: 'Backlog PCM', desc: 'Programação visual de paradas e intervenções' },
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Módulos completos para toda a manutenção</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Mais de 20 módulos integrados para cobrir todo o ciclo de manutenção industrial.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {modulos.map(m => (
            <div key={m.label} className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/30 rounded-xl p-4 transition-all duration-200 cursor-default">
              <m.icon className="w-6 h-6 text-blue-400 mb-3" />
              <div className="text-white text-sm font-semibold mb-1">{m.label}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Seção de demo em vídeo ───────────────────────────────────────────────────
function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">Veja o sistema em 3 minutos</h2>
          <p className="text-slate-400">Uma visão geral rápida de como o PCM Estratégico funciona na prática.</p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 aspect-video flex items-center justify-center group cursor-pointer"
          onClick={() => setPlaying(true)}
        >
          {/* Thumbnail / mockup da tela */}
          {!playing ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-full max-w-2xl px-8">
                    <DashboardMockup />
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white/20 flex items-center justify-center shadow-2xl shadow-blue-500/40 group-hover:scale-110 transition-transform duration-200">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
                <div className="text-white font-semibold text-lg">Assistir demonstração</div>
                <div className="text-slate-400 text-sm">~3 minutos</div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center text-slate-400">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Vídeo em breve — enquanto isso,</p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline text-sm"
                >
                  solicite uma demo ao vivo pelo WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl px-5 py-3 transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Prefiro uma demo ao vivo
          </a>
          <span className="text-slate-600 text-sm">Nossa equipe responde em até 2h</span>
        </div>
      </div>
    </section>
  );
}

// ─── Seção de depoimentos ─────────────────────────────────────────────────────
function TestimonialsSection() {
  const depoimentos = [
    {
      texto: 'Antes tínhamos OS perdidas em papel e planilhas desatualizadas. Com o PCM Estratégico organizamos toda a equipe em 1 semana.',
      nome: 'Carlos S.',
      cargo: 'Gerente de Manutenção',
      segmento: 'Metalúrgica · Paraná',
      stars: 5,
    },
    {
      texto: 'O app do mecânico foi um divisor de águas. Eles recebem as OS no celular e a gestão acompanha tudo em tempo real. Sem papel.',
      nome: 'Mariana L.',
      cargo: 'Coordenadora PCM',
      segmento: 'Alimentício · SC',
      stars: 5,
    },
    {
      texto: 'Os relatórios de MTBF e MTTR que o sistema gera automaticamente me poupam horas toda semana. Recomendo muito.',
      nome: 'Ricardo F.',
      cargo: 'Engenheiro de Manutenção',
      segmento: 'Têxtil · SP',
      stars: 5,
    },
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">O que as equipes dizem</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {depoimentos.map((d, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <div className="flex gap-0.5">
                {Array.from({ length: d.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">"{d.texto}"</p>
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

// ─── Seção de planos ──────────────────────────────────────────────────────────
function PricingSection({ onTrialClick }: { onTrialClick: () => void }) {
  const plans = [
    {
      name: 'Trial',
      price: 'Grátis',
      period: '30 dias',
      description: 'Experimente o sistema completo sem compromisso.',
      features: ['Acesso completo', 'App do mecânico', 'Todos os módulos', 'Dados reais', 'Suporte por e-mail'],
      cta: 'Começar grátis',
      ctaAction: onTrialClick,
      highlight: false,
    },
    {
      name: 'Mensal',
      price: 'Sob consulta',
      period: '/mês',
      description: 'Para empresas que precisam de flexibilidade.',
      features: ['Tudo do Trial', 'Suporte prioritário', 'Onboarding assistido', 'Integrações', 'SLA garantido'],
      cta: 'Falar com vendas',
      ctaAction: () => window.open(WHATSAPP, '_blank', 'noopener,noreferrer'),
      highlight: true,
    },
    {
      name: 'Anual',
      price: 'Melhor preço',
      period: '2 meses grátis',
      description: 'Para quem quer economizar e ter a melhor experiência.',
      features: ['Tudo do Mensal', 'Desconto exclusivo', 'Relatórios avançados', 'API dedicada', 'Gerente de conta'],
      cta: 'Falar com vendas',
      ctaAction: () => window.open(WHATSAPP, '_blank', 'noopener,noreferrer'),
      highlight: false,
    },
  ];

  return (
    <section className="py-20 bg-slate-950" id="planos">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Planos para toda empresa</h2>
          <p className="text-slate-400">Comece grátis, sem cartão. Assine quando quiser.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border flex flex-col gap-5 ${
                plan.highlight
                  ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-800/40 border-slate-700/50'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais popular
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

// ─── Seção de trial + demo ────────────────────────────────────────────────────
function TrialSection() {
  const [activeTab, setActiveTab] = useState<'trial' | 'demo'>('trial');

  return (
    <section className="py-20 bg-slate-900" id="trial">
      <div className="max-w-2xl mx-auto px-6">
        {/* Tabs */}
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
              Solicitar demo guiada
            </span>
          </button>
        </div>

        {activeTab === 'trial' ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Comece agora — é grátis</h2>
              <p className="text-slate-400 text-sm mt-1">30 dias com acesso completo. Sem cartão de crédito.</p>
            </div>
            <TrialForm />
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Demo guiada</h2>
              <p className="text-slate-400 text-sm mt-1">
                Nosso especialista apresenta o sistema para sua equipe ao vivo — 100% personalizado para o seu segmento.
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
          Pronto para transformar sua manutenção?
        </h2>
        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          Comece hoje mesmo, sem compromisso. Sua equipe estará organizada em menos de 1 dia.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTrialClick}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-8 py-4 transition-all text-sm shadow-xl shadow-blue-500/25 group"
          >
            Criar conta grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-slate-600 hover:border-green-500/50 text-slate-300 hover:text-white font-medium rounded-xl px-8 py-4 transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4 text-green-400" />
            Falar com a equipe
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ onTrialClick }: { onTrialClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">PCM Estratégico</span>
          <span className="hidden sm:inline-block text-slate-600 text-xs ml-1">by GPPIS</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#trial" className="hover:text-white transition-colors">Funcionalidades</a>
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
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-all"
          >
            Testar grátis
          </button>
        </div>
      </div>
    </header>
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const scrollToTrial = () => {
    document.getElementById('trial')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased">
      <Header onTrialClick={scrollToTrial} />
      <HeroSection onTrialClick={scrollToTrial} />
      <ProblemsSection />
      <FeaturesSection />
      <ModulosSection />
      <VideoSection />
      <TestimonialsSection />
      <PricingSection onTrialClick={scrollToTrial} />
      <TrialSection />
      <FinalCTA onTrialClick={scrollToTrial} />
      <Footer />
    </div>
  );
}
