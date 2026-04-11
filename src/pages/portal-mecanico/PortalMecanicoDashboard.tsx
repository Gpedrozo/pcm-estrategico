import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { usePortalMecanico } from '@/contexts/PortalMecanicoContext';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import {
  AlertTriangle,
  Timer,
  ClipboardCheck,
  CheckCircle2,
  ChevronRight,
  Zap,
  Activity,
  Search,
  Calendar,
  Plus,
  Clock,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIO: Record<string, { color: string; border: string; bg: string; order: number; pulse: boolean }> = {
  URGENTE:    { color: 'bg-red-600',    border: 'border-red-500',    bg: 'bg-red-500/10',    order: 0, pulse: true },
  EMERGENCIA: { color: 'bg-red-600',    border: 'border-red-500',    bg: 'bg-red-500/10',    order: 0, pulse: true },
  ALTA:       { color: 'bg-orange-500', border: 'border-orange-400', bg: 'bg-orange-500/10', order: 1, pulse: false },
  MEDIA:      { color: 'bg-yellow-500', border: 'border-yellow-400', bg: 'bg-yellow-500/10', order: 2, pulse: false },
  BAIXA:      { color: 'bg-green-500',  border: 'border-green-400',  bg: 'bg-green-500/10',  order: 3, pulse: false },
};
const getPrio = (p: string) => PRIO[p?.toUpperCase()] ?? { color: 'bg-gray-500', border: 'border-gray-300', bg: 'bg-gray-500/10', order: 9, pulse: false };

export default function PortalMecanicoDashboard() {
  const navigate = useNavigate();
  const { mecanico } = usePortalMecanico();
  const { data: mecanicosDB } = useMecanicosAtivos();
  const { data: todasOrdens } = useOrdensServico();

  const _mecDB = useMemo(() => {
    if (!mecanico) return null;
    return (mecanicosDB || []).find(m => m.id === mecanico.id) ?? null;
  }, [mecanicosDB, mecanico]);

  const minhasOrdens = useMemo(() => {
    if (!mecanico) return [];
    return (todasOrdens || []).filter(os =>
      os.mecanico_responsavel_id === mecanico.id ||
      (mecanico.codigo_acesso && os.mecanico_responsavel_codigo === mecanico.codigo_acesso)
    );
  }, [mecanico, todasOrdens]);

  const pendentes = useMemo(() =>
    minhasOrdens
      .filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA')
      .sort((a, b) => getPrio(a.prioridade).order - getPrio(b.prioridade).order),
    [minhasOrdens]
  );

  const urgentes = pendentes.filter(os => {
    const p = os.prioridade?.toUpperCase();
    return p === 'URGENTE' || p === 'EMERGENCIA';
  });
  const emAndamento = pendentes.filter(os => os.status === 'EM_ANDAMENTO');
  const fechadas = minhasOrdens.filter(os => os.status === 'FECHADA');

  if (!mecanico) return null;

  return (
    <div className="space-y-6 py-6 md:pt-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Olá, {mecanico.nome.split(' ')[0]}!
        </h1>
        <p className="text-base text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-4 w-4" />
          {pendentes.length} O.S. pendente{pendentes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Urgentes', value: urgentes.length, icon: AlertTriangle, gradient: 'from-red-500 to-red-600', pulse: urgentes.length > 0 },
          { label: 'Em Andamento', value: emAndamento.length, icon: Timer, gradient: 'from-amber-500 to-amber-600', pulse: false },
          { label: 'Pendentes', value: pendentes.length, icon: ClipboardCheck, gradient: 'from-blue-500 to-blue-600', pulse: false },
          { label: 'Concluídas', value: fechadas.length, icon: CheckCircle2, gradient: 'from-green-500 to-green-600', pulse: false },
        ].map(stat => (
          <div
            key={stat.label}
            className={cn(
              'relative rounded-2xl p-4 bg-gradient-to-br text-white shadow-lg min-h-[100px] flex flex-col justify-between',
              stat.gradient,
              stat.pulse && 'animate-pulse'
            )}
          >
            <stat.icon className="h-7 w-7 opacity-80" />
            <div>
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-sm font-medium opacity-90">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta urgente */}
      {urgentes.length > 0 && (
        <div className="rounded-2xl bg-red-500/10 border-2 border-red-500/30 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-400">
              {urgentes.length} O.S. URGENTE{urgentes.length !== 1 ? 'S' : ''}
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">Requer atenção imediata</p>
          </div>
        </div>
      )}

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Equipamentos', icon: Search, to: '/portal-mecanico/equipamentos' },
          { label: 'Preventivas', icon: Calendar, to: '/portal-mecanico/preventivas' },
          { label: 'Solicitar', icon: Plus, to: '/portal-mecanico/solicitar' },
          { label: 'Histórico', icon: History, to: '/portal-mecanico/historico' },
        ].map(a => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 border-border bg-card hover:bg-muted active:scale-95 transition-all"
          >
            <a.icon className="h-6 w-6 text-orange-500" />
            <span className="text-xs font-bold text-center">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Lista de O.S. pendentes */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Suas Ordens de Serviço</h2>

        {pendentes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">Tudo em dia!</p>
            <p className="text-base">Nenhuma O.S. pendente</p>
          </div>
        ) : (
          pendentes.map(os => {
            const pri = getPrio(os.prioridade);
            return (
              <button
                key={os.id}
                onClick={() => navigate(`/portal-mecanico/os/${os.id}`)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.97]',
                  pri.border, pri.bg,
                  pri.pulse && 'ring-2 ring-red-400/50 ring-offset-2'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-sm px-2 py-0.5">
                        OS #{os.numero_os}
                      </Badge>
                      <Badge className={cn(pri.color, 'text-white text-sm')}>
                        {os.prioridade}
                      </Badge>
                      {os.status === 'EM_ANDAMENTO' && (
                        <Badge className="bg-amber-500 text-white text-sm animate-pulse">
                          EM ANDAMENTO
                        </Badge>
                      )}
                    </div>
                    <p className="font-bold text-base">{os.equipamento}</p>
                    <p className="text-sm text-muted-foreground">{os.tag}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{os.problema}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(os.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
                    <ChevronRight className="h-6 w-6 text-white" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
