import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { useLocation } from 'react-router-dom';

export default function Lubrificacao() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [equipamentoFilter, setEquipamentoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPlano, setSelectedPlano] = useState<PlanoLubrificacao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoLubrificacao | null>(null);

  type CalendarNavState = { dataProgramada?: string };
  const dataProgramadaFromCalendar = (location.state as CalendarNavState | null)?.dataProgramada;

  const calendarFormAppliedRef = useRef(false);
  useEffect(() => {
    if (calendarFormAppliedRef.current) return;
    if (dataProgramadaFromCalendar) {
      calendarFormAppliedRef.current = true;
      setEditingPlano(null);
      setFormOpen(true);
    }
  }, [dataProgramadaFromCalendar]);

  const { data: planos, isLoading, isError, error } = usePlanosLubrificacao();
  const { data: equipamentos } = useEquipamentos();
  const createPlano = useCreatePlanoLubrificacao();
  const updatePlano = useUpdatePlanoLubrificacao();
  const deletePlano = useDeletePlanoLubrificacao();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const filteredPlanos = useMemo(() => {
    if (!planos) return [];
    const s = search.toLowerCase();
    return planos.filter((item) => {
      const matchesSearch = !s
        || item.codigo.toLowerCase().includes(s)
        || item.nome.toLowerCase().includes(s)
        || (item.lubrificante || '').toLowerCase().includes(s);

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
    let result;
    if (editingPlano) {
      result = await updatePlano.mutateAsync({ id: editingPlano.id, ...payload });
    } else {
      result = await createPlano.mutateAsync(payload);
    }

    return result;
  };

  const handleDelete = (plano: PlanoLubrificacao) => {
    confirm({
      title: 'Excluir plano',
      description: `Deseja excluir o plano ${plano.codigo}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        await deletePlano.mutateAsync(plano.id);
        if (selectedPlano?.id === plano.id) setSelectedPlano(null);
      },
    });
  };

  return (
    <div className="module-page space-y-4">
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplet className="h-6 w-6 text-primary" />
            Lubrificação
          </h1>
          <p className="text-muted-foreground text-sm">
            Planos de Lubrificação
          </p>
        </div>
      </div>

      <div className="flex justify-end">
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
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlano(null);
        }}
        equipamentos={equipamentos || []}
        initialData={editingPlano}
        onSubmit={handleSubmit}
        dataProgramada={dataProgramadaFromCalendar}
      />
      {ConfirmDialogElement}
    </div>
  );
}

