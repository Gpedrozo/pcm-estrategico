import { useMemo, useState } from 'react';
import { Plus, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import {
  useCreatePlanoLubrificacao,
  useDeletePlanoLubrificacao,
  usePlanosLubrificacao,
  useUpdatePlanoLubrificacao,
} from '@/hooks/useLubrificacao';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert } from '@/types/lubrificacao';
import { LubrificacaoForm } from './lubrificacao/LubrificacaoForm';
import { LubrificacaoList } from './lubrificacao/LubrificacaoList';
import { LubrificacaoDetalhe } from './lubrificacao/LubrificacaoDetalhe';

export default function Lubrificacao() {
  const [search, setSearch] = useState('');
  const [equipamentoFilter, setEquipamentoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPlano, setSelectedPlano] = useState<PlanoLubrificacao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoLubrificacao | null>(null);

  const { data: planos, isLoading, isError, error } = usePlanosLubrificacao();
  const { data: equipamentos } = useEquipamentos();
  const createPlano = useCreatePlanoLubrificacao();
  const updatePlano = useUpdatePlanoLubrificacao();
  const deletePlano = useDeletePlanoLubrificacao();

  const filteredPlanos = useMemo(() => {
    if (!planos) return [];
    const s = search.toLowerCase();
    return planos.filter((item) => {
      const matchesSearch = !s
        || item.codigo.toLowerCase().includes(s)
        || item.nome.toLowerCase().includes(s)
        || (item.lubrificante || item.tipo_lubrificante || '').toLowerCase().includes(s);

      const matchesEquipamento = equipamentoFilter === 'all' || item.equipamento_id === equipamentoFilter;
      const currentStatus = item.status || (item.ativo ? 'programado' : 'inativo');
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

      return matchesSearch && matchesEquipamento && matchesStatus;
    });
  }, [planos, search, equipamentoFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-destructive">Erro ao carregar planos</h2>
        <pre className="mt-2 text-sm text-muted-foreground">{String((error as any)?.message || error)}</pre>
      </div>
    );
  }

  const handleSubmit = async (payload: PlanoLubrificacaoInsert) => {
    if (editingPlano) {
      await updatePlano.mutateAsync({ id: editingPlano.id, ...payload } as any);
    } else {
      await createPlano.mutateAsync(payload);
    }

    setFormOpen(false);
    setEditingPlano(null);
  };

  const handleDelete = async (plano: PlanoLubrificacao) => {
    if (!confirm(`Deseja excluir o plano ${plano.codigo}?`)) return;
    await deletePlano.mutateAsync(plano.id);
    if (selectedPlano?.id === plano.id) setSelectedPlano(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplet className="h-6 w-6 text-primary" />
            Plano de Lubrificação
          </h1>
          <p className="text-muted-foreground text-sm">
            {planos?.length || 0} planos • {filteredPlanos.length} filtrados
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPlano(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <LubrificacaoList
            planos={filteredPlanos}
            equipamentos={equipamentos || []}
            search={search}
            equipamentoFilter={equipamentoFilter}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onEquipamentoFilterChange={setEquipamentoFilter}
            onStatusFilterChange={setStatusFilter}
            onSelect={setSelectedPlano}
            onEdit={(plano) => {
              setEditingPlano(plano);
              setFormOpen(true);
            }}
            onDelete={handleDelete}
          />
        </div>

        <div>
          <LubrificacaoDetalhe plano={selectedPlano} equipamentos={equipamentos || []} onEdit={(plano) => {
            setEditingPlano(plano);
            setFormOpen(true);
          }} />
        </div>
      </div>

      <LubrificacaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipamentos={equipamentos || []}
        initialData={editingPlano}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

