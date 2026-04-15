import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search } from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao } from '@/types/lubrificacao';

const prioridadeBadge: Record<string, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-green-100 text-green-800 border-green-300' },
  media: { label: 'Média', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  alta: { label: 'Alta', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  critica: { label: 'Crítica', className: 'bg-red-100 text-red-800 border-red-300' },
};

function isVencido(prox: string | null | undefined) {
  if (!prox) return false;
  return new Date(prox).getTime() < Date.now();
}

interface LubrificacaoListProps {
  planos: PlanoLubrificacao[];
  equipamentos: EquipamentoRow[];
  search: string;
  statusFilter: string;
  selectedPlanoId?: string | null;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelect: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoList({
  planos,
  equipamentos,
  search,
  statusFilter,
  selectedPlanoId,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
}: LubrificacaoListProps) {
  const equipamentoNome = (equipamentoId: string | null) => {
    if (!equipamentoId) return null;
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    return equipamento ? `${equipamento.tag} - ${equipamento.nome}` : null;
  };

  return (
    <>
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => onStatusFilterChange('all')}>Todos</Button>
          <Button size="sm" variant={statusFilter === 'programado' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => onStatusFilterChange('programado')}>Programados</Button>
          <Button size="sm" variant={statusFilter === 'vencido' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => onStatusFilterChange('vencido')}>Vencidos</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {planos.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            Nenhum plano encontrado
          </div>
        ) : (
          planos.map((plano) => {
            const vencido = isVencido(plano.proxima_execucao);
            const prio = prioridadeBadge[plano.prioridade || 'media'] || prioridadeBadge.media;
            const nomeEquip = equipamentoNome(plano.equipamento_id);
            return (
              <button
                key={plano.id}
                onClick={() => onSelect(plano)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedPlanoId === plano.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-primary">{plano.codigo}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${prio.className}`}>{prio.label}</span>
                </div>
                <p className="text-sm font-medium truncate">{plano.nome}</p>
                {nomeEquip && <p className="text-xs text-muted-foreground">{nomeEquip}</p>}
                <div className="flex items-center gap-1 mt-1">
                  {vencido && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  {plano.proxima_execucao && (
                    <p className={`text-[10px] ${vencido ? 'text-red-600 font-semibold' : 'text-info'}`}>
                      {vencido ? 'Vencido: ' : 'Próxima: '}
                      {new Date(plano.proxima_execucao).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
