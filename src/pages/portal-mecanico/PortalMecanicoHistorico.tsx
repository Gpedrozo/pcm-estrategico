import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { usePortalMecanico } from '@/contexts/PortalMecanicoContext';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import {
  Search, History, CheckCircle2, Clock,
  Wrench, ClipboardList, Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortalMecanicoHistorico() {
  const navigate = useNavigate();
  const { mecanico } = usePortalMecanico();
  const { data: mecanicosDB } = useMecanicosAtivos();
  const { data: todasOrdens } = useOrdensServico();
  const [search, setSearch] = useState('');

  const mecDB = useMemo(() => {
    if (!mecanico) return null;
    return (mecanicosDB || []).find(m => m.id === mecanico.id) ?? null;
  }, [mecanicosDB, mecanico]);

  const minhasOrdens = useMemo(() => {
    if (!mecanico || !mecDB) return [];
    return (todasOrdens || []).filter(os =>
      os.mecanico_responsavel_id === mecanico.id ||
      (mecDB.codigo_acesso && os.mecanico_responsavel_codigo === mecDB.codigo_acesso)
    );
  }, [mecanico, mecDB, todasOrdens]);

  const ordensFechadas = useMemo(() => {
    const t = search.trim().toLowerCase();
    return minhasOrdens
      .filter(os => os.status === 'FECHADA')
      .filter(os => {
        if (!t) return true;
        return (
          String(os.numero_os).includes(t) ||
          (os.tag || '').toLowerCase().includes(t) ||
          (os.equipamento || '').toLowerCase().includes(t) ||
          (os.problema || '').toLowerCase().includes(t)
        );
      })
      .sort((a, b) =>
        new Date(b.data_fechamento || b.updated_at).getTime() -
        new Date(a.data_fechamento || a.updated_at).getTime()
      );
  }, [minhasOrdens, search]);

  const ordensPendentes = useMemo(() =>
    minhasOrdens.filter(os => os.status !== 'FECHADA' && os.status !== 'CANCELADA'),
    [minhasOrdens]
  );

  if (!mecanico) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Wrench className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-bold">Faça login primeiro</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-6 md:pt-16">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <History className="h-6 w-6 text-orange-500" />
          Histórico de O.S.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{mecanico.nome}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Fechadas', value: ordensFechadas.length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Pendentes', value: ordensPendentes.length, icon: ClipboardList, color: 'text-blue-600' },
          { label: 'Total', value: minhasOrdens.length, icon: Timer, color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border-2 p-3 text-center">
            <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por OS, TAG, equipamento..." className="pl-11 h-14 text-base rounded-2xl border-2" />
      </div>

      {/* Lista */}
      {ordensFechadas.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-bold">Sem histórico</p>
          <p className="text-base">Nenhuma O.S. fechada encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordensFechadas.map(os => (
            <button
              key={os.id}
              className="w-full text-left rounded-2xl border-2 p-4 active:scale-[0.97] transition-all"
              onClick={() => navigate(`/portal-mecanico/os/${os.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-sm">#{os.numero_os}</Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">FECHADA</Badge>
                  </div>
                  <p className="font-bold text-base truncate">{os.equipamento}</p>
                  <p className="text-sm text-muted-foreground truncate">{os.tag}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{os.problema}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {os.data_fechamento ? new Date(os.data_fechamento).toLocaleDateString('pt-BR') : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{os.tipo}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
