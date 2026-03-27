import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Wrench,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIO_COLOR: Record<string, string> = {
  URGENTE: 'border-red-500 bg-red-500/10',
  ALTA: 'border-orange-500 bg-orange-500/10',
  MEDIA: 'border-yellow-500 bg-yellow-500/10',
  BAIXA: 'border-green-500 bg-green-500/10',
};

type Filtro = 'TODAS' | 'PENDENTES' | 'CONCLUIDAS';

export default function MecanicoPreventivas() {
  const navigate = useNavigate();
  const { data: ordens } = useOrdensServico();
  const [filtro, setFiltro] = useState<Filtro>('PENDENTES');

  const mecanico_id = typeof window !== 'undefined' ? sessionStorage.getItem('mecanico_logado_id') : null;

  const preventivas = useMemo(() => {
    return (ordens || []).filter(o => {
      if (o.tipo !== 'PREVENTIVA') return false;
      if (mecanico_id && o.mecanico_responsavel_id && o.mecanico_responsavel_id !== mecanico_id) return false;
      if (filtro === 'PENDENTES') return o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO';
      if (filtro === 'CONCLUIDAS') return o.status === 'FECHADA';
      return true;
    }).sort((a, b) => {
      const da = a.data_solicitacao || a.created_at || '';
      const db = b.data_solicitacao || b.created_at || '';
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [ordens, filtro, mecanico_id]);

  const countPendentes = (ordens || []).filter(o => o.tipo === 'PREVENTIVA' && (o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')).length;
  const countConcluidas = (ordens || []).filter(o => o.tipo === 'PREVENTIVA' && o.status === 'FECHADA').length;

  return (
    <div className="space-y-5 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mecanico')} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-xl font-black">Preventivas</h1>
          <p className="text-xs text-muted-foreground">{countPendentes} pendentes • {countConcluidas} concluídas</p>
        </div>
      </div>

      {/* Filtro chips */}
      <div className="flex gap-2">
        {([
          { val: 'PENDENTES' as Filtro, label: 'Pendentes' },
          { val: 'CONCLUIDAS' as Filtro, label: 'Concluídas' },
          { val: 'TODAS' as Filtro, label: 'Todas' },
        ]).map(f => (
          <button
            key={f.val}
            onClick={() => setFiltro(f.val)}
            className={cn(
              'px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all active:scale-95',
              filtro === f.val ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card',
            )}
          >
            <Filter className="inline h-3 w-3 mr-1" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {preventivas.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            {filtro === 'PENDENTES' ? 'Nenhuma preventiva pendente.' : 'Nenhuma preventiva encontrada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {preventivas.map(os => {
            const dataStr = os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR') : '';
            const prioClass = PRIO_COLOR[os.prioridade || ''] || 'border-border bg-card';
            const isAberta = os.status === 'ABERTA' || os.status === 'EM_ANDAMENTO';

            return (
              <button
                key={os.id}
                onClick={() => isAberta ? navigate(`/mecanico/os/${os.id}`) : undefined}
                disabled={!isAberta}
                className={cn(
                  'w-full rounded-2xl border-2 p-4 text-left transition-all',
                  isAberta ? 'active:scale-[0.98] hover:bg-muted/50' : 'opacity-70',
                  prioClass,
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm font-mono">{os.numero_os}</span>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    os.status === 'FECHADA' ? 'bg-green-500/15 text-green-700 dark:text-green-300' :
                    os.status === 'EM_ANDAMENTO' ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300' :
                    'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                  )}>
                    {(os.status || '').replace('_', ' ')}
                  </span>
                </div>

                <p className="text-base font-semibold">{os.equipamento || os.tag || '—'}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{os.problema || '—'}</p>

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {dataStr && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {dataStr}
                    </span>
                  )}
                  {os.tempo_estimado && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {os.tempo_estimado}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> PREVENTIVA
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
