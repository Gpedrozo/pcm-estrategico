import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import {
  ArrowLeft,
  Search,
  MapPin,
  Factory,
  Hash,
  Calendar,
  AlertTriangle,
  Wrench,
  Tag,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CRITICIDADE_COLOR: Record<string, string> = {
  A: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  B: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  C: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
};

export default function MecanicoEquipamento() {
  const navigate = useNavigate();
  const { data: equipamentos } = useEquipamentos();
  const { data: ordens } = useOrdensServico();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtrados = (equipamentos || []).filter(e => {
    if (!search.trim()) return false;
    const t = search.toLowerCase();
    return (e.tag || '').toLowerCase().includes(t) || (e.nome || '').toLowerCase().includes(t);
  }).slice(0, 8);

  const equip = selectedId ? (equipamentos || []).find(e => e.id === selectedId) : null;

  const osDoEquip = equip
    ? (ordens || []).filter(o => o.tag === equip.tag).sort((a, b) =>
        new Date(b.data_solicitacao || b.created_at || '').getTime() -
        new Date(a.data_solicitacao || a.created_at || '').getTime()
      ).slice(0, 10)
    : [];

  const STATUS_BADGE: Record<string, string> = {
    ABERTA: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    EM_ANDAMENTO: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
    FECHADA: 'bg-green-500/15 text-green-700 dark:text-green-300',
    CANCELADA: 'bg-zinc-500/15 text-zinc-500',
  };

  /* ─── Detalhe do Equipamento ─── */
  if (equip) {
    return (
      <div className="space-y-5 py-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedId(null); setSearch(''); }}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black truncate">{equip.nome}</h1>
            <p className="text-sm text-muted-foreground font-mono">{equip.tag}</p>
          </div>
        </div>

        {/* Badge Criticidade */}
        {equip.criticidade && (
          <div className="flex gap-2">
            <span className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold', CRITICIDADE_COLOR[equip.criticidade] || 'bg-muted')}>
              <AlertTriangle className="h-4 w-4" />
              Criticidade {equip.criticidade}
            </span>
          </div>
        )}

        {/* Ficha Técnica */}
        <div className="rounded-2xl border-2 overflow-hidden">
          <div className="p-4 bg-muted/50 border-b-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Ficha Técnica
            </h2>
          </div>
          <div className="divide-y">
            <InfoRow icon={Tag} label="TAG" value={equip.tag} />
            <InfoRow icon={Factory} label="Fabricante" value={equip.fabricante} />
            <InfoRow icon={Wrench} label="Modelo" value={equip.modelo} />
            <InfoRow icon={Hash} label="Nº Série" value={equip.numero_serie} />
            <InfoRow icon={MapPin} label="Localização" value={equip.localizacao} />
            <InfoRow icon={Calendar} label="Data Instalação" value={equip.data_instalacao ? new Date(equip.data_instalacao).toLocaleDateString('pt-BR') : undefined} />
          </div>
        </div>

        {/* Histórico de OS */}
        <div className="space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Últimas Ordens de Serviço
          </h2>
          {osDoEquip.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma OS encontrada para este equipamento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {osDoEquip.map(os => (
                <div key={os.id} className="rounded-2xl border-2 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm font-mono">{os.numero_os}</span>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', STATUS_BADGE[os.status] || 'bg-muted')}>
                      {(os.status || '').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{os.problema || os.descricao_falha || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR') : ''}
                    {os.tipo && ` • ${os.tipo}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Tela de Busca ─── */
  return (
    <div className="space-y-5 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mecanico')} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border-2 hover:bg-muted active:scale-90 transition-all">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-black">Consultar Equipamento</h1>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por TAG ou nome..."
            className="pl-11 h-14 text-base rounded-2xl border-2"
            autoFocus
          />
        </div>

        {filtrados.length > 0 && (
          <div className="border-2 rounded-2xl overflow-hidden divide-y max-h-[60vh] overflow-y-auto">
            {filtrados.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="w-full p-4 text-left hover:bg-muted active:bg-muted/80 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base">{e.nome}</p>
                    <p className="text-sm text-muted-foreground font-mono">{e.tag}</p>
                  </div>
                  {e.criticidade && (
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', CRITICIDADE_COLOR[e.criticidade] || 'bg-muted')}>
                      {e.criticidade}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {search.trim() && filtrados.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum equipamento encontrado.</p>
          </div>
        )}

        {!search.trim() && (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">Digite a TAG ou nome do equipamento para consultar.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Componente auxiliar: linha da ficha ─── */
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
