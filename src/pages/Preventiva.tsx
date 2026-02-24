import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Search, Calendar, Clock, Settings, ChevronDown, ChevronRight,
  GripVertical, Trash2, Edit, Play, FileText, Copy, History, CheckSquare,
  Download, ListChecks, Timer, Wrench, LayoutList
} from 'lucide-react';
import { usePlanosPreventivos, useCreatePlanoPreventivo, useUpdatePlanoPreventivo, useDeletePlanoPreventivo, type PlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAtividadesByPlano, useCreateAtividade, useUpdateAtividade, useDeleteAtividade, useCreateServico, useUpdateServico, useDeleteServico, type AtividadePreventiva, type ServicoPreventivo } from '@/hooks/useAtividadesPreventivas';
import { useExecucoesByPlano, useCreateExecucao, type ExecucaoPreventiva } from '@/hooks/useExecucoesPreventivas';
import { useTemplatesPreventivos, useCreateTemplate, useDeleteTemplate } from '@/hooks/useTemplatesPreventivos';
import { useMecanicos } from '@/hooks/useMecanicos';
import PlanoDetailPanel from '@/components/preventiva/PlanoDetailPanel';
import PlanoFormDialog from '@/components/preventiva/PlanoFormDialog';

export default function Preventiva() {
  const [search, setSearch] = useState('');
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterAtivo, setFilterAtivo] = useState<boolean | null>(true);

  const { data: planos, isLoading } = usePlanosPreventivos();
  const { data: equipamentos } = useEquipamentos();

  const filteredPlanos = useMemo(() => {
    if (!planos) return [];
    return planos.filter(p => {
      if (filterAtivo !== null && p.ativo !== filterAtivo) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return p.codigo.toLowerCase().includes(s) || p.nome.toLowerCase().includes(s) || p.tag?.toLowerCase().includes(s);
    });
  }, [planos, search, filterAtivo]);

  const selectedPlano = planos?.find(p => p.id === selectedPlanoId) || null;

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Manutenção Preventiva
          </h1>
          <p className="text-muted-foreground text-sm">
            {planos?.length || 0} planos • {planos?.filter(p => p.ativo).length || 0} ativos
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left panel - Plan list */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar planos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={filterAtivo === true ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setFilterAtivo(true)}>Ativos</Button>
              <Button size="sm" variant={filterAtivo === false ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setFilterAtivo(false)}>Inativos</Button>
              <Button size="sm" variant={filterAtivo === null ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setFilterAtivo(null)}>Todos</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredPlanos.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Nenhum plano encontrado
              </div>
            ) : (
              filteredPlanos.map((plano) => (
                <button
                  key={plano.id}
                  onClick={() => setSelectedPlanoId(plano.id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedPlanoId === plano.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-primary">{plano.codigo}</span>
                    <Badge variant={plano.ativo ? 'default' : 'secondary'} className="text-[10px] h-5">
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{plano.nome}</p>
                  {plano.tag && <p className="text-xs text-muted-foreground">TAG: {plano.tag}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{plano.frequencia_dias}d</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(plano.tempo_estimado_min)}</span>
                  </div>
                  {plano.proxima_execucao && (
                    <p className="text-[10px] mt-1 text-info">
                      Próxima: {new Date(plano.proxima_execucao).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel - Detail */}
        <div className="flex-1 overflow-hidden">
          {selectedPlano ? (
            <PlanoDetailPanel plano={selectedPlano} equipamentos={equipamentos || []} />
          ) : (
            <div className="h-full flex items-center justify-center bg-card border border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <LayoutList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Selecione um plano</p>
                <p className="text-sm">Escolha um plano na lista à esquerda para ver detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <PlanoFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        equipamentos={equipamentos || []}
      />
    </div>
  );
}
