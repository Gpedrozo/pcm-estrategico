import { useState, useMemo } from 'react';
import { Plus, Search, Droplet, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PlanoFormDialog from '@/components/lubrificacao/PlanoFormDialog';
import PlanoDetailPanel from '@/components/lubrificacao/PlanoDetailPanel';
import { usePlanosLubrificacao } from '@/hooks/useLubrificacao';

export default function Lubrificacao() {
  const [search, setSearch] = useState('');
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: planos, isLoading } = usePlanosLubrificacao();

  const filteredPlanos = useMemo(() => {
    if (!planos) return [];
    if (!search) return planos;
    const s = search.toLowerCase();
    return planos.filter(p => p.nome.toLowerCase().includes(s) || (p.tag || '').toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s));
  }, [planos, search]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const selectedPlano = planos?.find(p => p.id === selectedPlanoId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-1 py-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplet className="h-6 w-6 text-primary" />
            Plano de Lubrificação
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
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedPlano ? (
            <PlanoDetailPanel plano={selectedPlano} />
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

      <PlanoFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
