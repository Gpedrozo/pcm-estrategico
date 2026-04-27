import { useEffect, useState } from 'react';

// ─── Mockup do Dashboard PCM ────────────────────────────────────────────────
export function DashboardMockup() {
  const [activeOS, setActiveOS] = useState(0);
  const osList = [
    { id: 'OS-2847', tipo: 'Corretiva', equipamento: 'Compressor Atlas Copco', status: 'Em andamento', cor: 'bg-amber-500' },
    { id: 'OS-2848', tipo: 'Preventiva', equipamento: 'Torno CNC Romi', status: 'Concluída', cor: 'bg-emerald-500' },
    { id: 'OS-2849', tipo: 'Preditiva', equipamento: 'Ponte Rolante 10t', status: 'Aberta', cor: 'bg-blue-500' },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveOS(p => (p + 1) % osList.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <div className="ml-3 flex-1 bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400">
          app.gppis.com.br/dashboard
        </div>
      </div>

      {/* App layout */}
      <div className="flex h-[340px]">
        {/* Sidebar */}
        <div className="w-14 bg-slate-950 flex flex-col items-center py-4 gap-3 border-r border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">P</div>
          {['⚙', '📋', '📅', '🔧', '📊', '👥'].map((icon, i) => (
            <button key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${i === 0 ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {icon}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="text-white/90 text-sm font-semibold mb-3">Dashboard PCM</div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'OS Abertas', value: '12', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Em andamento', value: '5', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Concluídas hoje', value: '8', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Preventivas', value: '3', color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map((kpi, i) => (
              <div key={i} className={`${kpi.bg} rounded-lg p-2 border border-slate-700/50`}>
                <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-slate-400 text-[10px] leading-tight">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* OS List */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700/50 text-slate-400 text-[10px] font-semibold uppercase tracking-wide">
              Ordens de Serviço Recentes
            </div>
            {osList.map((os, i) => (
              <div
                key={os.id}
                className={`flex items-center gap-2 px-3 py-2 border-b border-slate-700/30 last:border-0 transition-all duration-500 ${i === activeOS ? 'bg-blue-500/8' : ''}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${os.cor} flex-shrink-0`} />
                <span className="text-slate-300 text-[11px] font-mono font-medium">{os.id}</span>
                <span className="text-slate-400 text-[10px] flex-1 truncate">{os.equipamento}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${i === activeOS ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700/50 text-slate-400'}`}>
                  {os.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mockup do Calendário Preventivo ─────────────────────────────────────────
export function CalendarioMockup() {
  const [highlight, setHighlight] = useState(5);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const events: Record<number, { color: string; label: string }> = {
    5: { color: 'bg-blue-500', label: 'Revisão' },
    12: { color: 'bg-emerald-500', label: 'Lubrif.' },
    18: { color: 'bg-amber-500', label: 'Inspeção' },
    24: { color: 'bg-purple-500', label: 'Troca filtro' },
    28: { color: 'bg-red-500', label: 'Calibração' },
  };

  useEffect(() => {
    const eventDays = Object.keys(events).map(Number);
    let idx = 0;
    const t = setInterval(() => {
      setHighlight(eventDays[idx % eventDays.length]);
      idx++;
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <div className="ml-3 flex-1 bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400">
          app.gppis.com.br/preventiva
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/90 text-sm font-semibold">Calendário PCM — Abril 2026</span>
          <span className="text-xs text-slate-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            5 preventivas agendadas
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[9px] text-slate-500 font-semibold py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Dias vazios para começar em terça */}
          {[...Array(2)].map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const ev = events[day];
            const isHighlight = day === highlight;
            return (
              <div
                key={day}
                className={`
                  aspect-square rounded-md flex flex-col items-center justify-center text-[10px] transition-all duration-300
                  ${ev ? `${ev.color}/20 border ${ev.color.replace('bg-', 'border-')}/40` : 'hover:bg-slate-800'}
                  ${isHighlight ? 'ring-2 ring-white/30 scale-110 z-10' : ''}
                `}
              >
                <span className={ev ? 'text-white font-semibold' : 'text-slate-500'}>{day}</span>
                {ev && <span className={`w-1.5 h-1.5 rounded-full ${ev.color} mt-0.5`} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Mockup do App Mecânico (mobile) ─────────────────────────────────────────
export function MobileAppMockup() {
  const [step, setStep] = useState(0);
  const steps = [
    { title: 'Minhas OS', subtitle: '3 tarefas hoje', icon: '🔧' },
    { title: 'OS-2847 — Compressor', subtitle: 'Clique para iniciar', icon: '▶️' },
    { title: 'Executando...', subtitle: 'Registrar ocorrência', icon: '📝' },
    { title: 'OS Concluída ✓', subtitle: 'Registrado com sucesso', icon: '✅' },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(p => (p + 1) % steps.length), 2000);
    return () => clearInterval(t);
  }, []);

  const cur = steps[step];

  return (
    <div className="mx-auto w-[200px] rounded-[28px] overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-900">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-[10px] text-slate-400">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Header */}
      <div className="bg-blue-700 px-4 py-3">
        <div className="text-white text-xs font-bold">PCM Mecânico</div>
        <div className="text-blue-200 text-[10px]">Carlos Silva</div>
      </div>

      {/* Content */}
      <div className="p-3 min-h-[180px] flex flex-col items-center justify-center">
        <div className="text-3xl mb-2 transition-all duration-500">{cur.icon}</div>
        <div className="text-white text-xs font-semibold text-center transition-all duration-500">{cur.title}</div>
        <div className="text-slate-400 text-[10px] text-center mt-1">{cur.subtitle}</div>

        {step === 0 && (
          <div className="mt-3 w-full space-y-1.5">
            {['OS-2847 Corretiva', 'OS-2848 Preventiva', 'OS-2849 Inspeção'].map(os => (
              <div key={os} className="bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {os}
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="mt-3 w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
            <div className="text-emerald-400 text-[10px] font-semibold">Aprovado pela gestão</div>
          </div>
        )}
      </div>

      {/* Nav bar */}
      <div className="flex bg-slate-800 border-t border-slate-700">
        {['🏠', '📋', '🔧', '👤'].map((icon, i) => (
          <button key={i} className={`flex-1 py-2 text-sm ${i === 0 ? 'text-blue-400' : 'text-slate-500'}`}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mockup de Relatórios / KPIs ─────────────────────────────────────────────
export function RelatoriosMockup() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const bars = [65, 82, 45, 90, 73, 88, 55];
  const months = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <div className="ml-3 flex-1 bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400">
          app.gppis.com.br/relatorios
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/90 text-sm font-semibold">Eficiência da Manutenção</span>
          <span className="text-emerald-400 text-xs font-semibold">↑ 12% vs. mês anterior</span>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-2 h-28 mb-2">
          {bars.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-blue-700 to-blue-500 transition-all duration-1000"
                style={{ height: animate ? `${height}%` : '0%' }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          {months.map(m => <div key={m} className="flex-1 text-center text-[9px] text-slate-500">{m}</div>)}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'MTBF', value: '142h', up: true },
            { label: 'MTTR', value: '2.3h', up: false },
            { label: 'Disponib.', value: '97.2%', up: true },
          ].map((kpi, i) => (
            <div key={i} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <div className="text-white text-sm font-bold">{kpi.value}</div>
              <div className={`text-[9px] ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.up ? '↑' : '↓'} {kpi.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
