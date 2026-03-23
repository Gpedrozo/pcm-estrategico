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
import { getSupabaseErrorMessage } from '@/lib/supabaseCompat';

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

  const errorMessage = error instanceof Error
    ? error.message
    : getSupabaseErrorMessage(error) || 'Falha inesperada ao carregar planos de lubrificação.';
  const missingTableError =
    errorMessage.includes("Could not find the table 'public.planos_lubrificacao'")
    || errorMessage.includes('A tabela public.planos_lubrificacao não existe neste ambiente')
    || errorMessage.includes('PGRST205')
    || errorMessage.includes('schema cache');

  if (isLoading) {
    return (
      <div className="module-page space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="module-page p-6">
        <h2 className="text-lg font-bold text-destructive">Erro ao carregar planos</h2>
        {missingTableError ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted-foreground">
              O módulo de lubrificação está implementado, mas a tabela ainda não existe no banco conectado do Supabase.
            </p>
            <div className="bg-card border border-border rounded-md p-3">
              <p className="font-medium mb-1">Como corrigir agora:</p>
              <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                <li>Abrir Supabase Dashboard → SQL Editor</li>
                <li>Executar a migration <span className="font-mono">supabase/migrations/20260224020000_create_lubrificacao.sql</span></li>
                <li>Executar também <span className="font-mono">supabase/migrations/20260301050000_create_maintenance_schedule.sql</span></li>
                <li>Atualizar a página</li>
              </ol>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{errorMessage}</pre>
          </div>
        ) : (
          <pre className="mt-2 text-sm text-muted-foreground">{errorMessage}</pre>
        )}
      </div>
    );
  }

  const handleSubmit = async (payload: PlanoLubrificacaoInsert) => {
    if (editingPlano) {
      await updatePlano.mutateAsync({ id: editingPlano.id, ...payload });
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
    <div className="module-page space-y-4">
      <div className="module-page-header flex items-center justify-between">
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

