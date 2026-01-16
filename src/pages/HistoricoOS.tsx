import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrdensServico, type OrdemServicoRow } from '@/hooks/useOrdensServico';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useExecucaoByOSId } from '@/hooks/useExecucoesOS';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { Search, FileText, Eye, Filter, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type StatusOS = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_MATERIAL' | 'FECHADA' | 'CANCELADA';

function OSDetailsModal({ 
  os, 
  isOpen, 
  onClose 
}: { 
  os: OrdemServicoRow | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { data: execucao } = useExecucaoByOSId(os?.id);

  if (!os) return null;

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl">O.S {os.numero_os}</span>
            <OSStatusBadge status={os.status as any} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">TAG</Label>
              <p className="font-mono text-primary font-medium">{os.tag}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Equipamento</Label>
              <p>{os.equipamento}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <p><OSTypeBadge tipo={os.tipo as any} /></p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <p className="capitalize">{os.prioridade.toLowerCase()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Solicitante</Label>
              <p>{os.solicitante}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Solicitação</Label>
              <p>{formatDate(os.data_solicitacao)}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Problema Apresentado</Label>
            <p className="mt-1 p-3 bg-muted/50 rounded-lg">{os.problema}</p>
          </div>

          {os.status === 'FECHADA' && execucao && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Dados da Execução</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 p-4 bg-success/5 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mecânico</Label>
                    <p>{execucao.mecanico_nome}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tempo</Label>
                    <p className="font-mono">
                      {execucao.hora_inicio} - {execucao.hora_fim} ({formatDuration(execucao.tempo_execucao)})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Fechamento</Label>
                    <p>{os.data_fechamento ? formatDate(os.data_fechamento) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Custo Total</Label>
                    <p className="font-mono font-medium text-success">
                      R$ {Number(execucao.custo_total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Serviço Executado</Label>
                  <p className="mt-1 p-3 bg-muted/50 rounded-lg">{execucao.servico_executado}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HistoricoOS() {
  const [filters, setFilters] = useState({
    tag: '',
    status: '' as StatusOS | '',
    search: '',
  });
  const [selectedOS, setSelectedOS] = useState<OrdemServicoRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: ordensServico, isLoading: loadingOS, error } = useOrdensServico();
  const { data: equipamentos } = useEquipamentos();

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const filteredOS = ordensServico?.filter(os => {
    if (filters.tag && os.tag !== filters.tag) return false;
    if (filters.status && os.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !os.numero_os.toString().includes(filters.search) &&
        !os.tag.toLowerCase().includes(searchLower) &&
        !os.equipamento.toLowerCase().includes(searchLower) &&
        !os.problema.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  }) || [];

  const handleViewOS = (os: OrdemServicoRow) => {
    setSelectedOS(os);
    setIsModalOpen(true);
  };

  if (loadingOS) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar ordens de serviço</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const uniqueTags = [...new Set(equipamentos?.map(eq => eq.tag) || [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Ordens de Serviço</h1>
        <p className="text-muted-foreground">Consulte e gerencie todas as O.S do sistema</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nº, TAG, equipamento..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>TAG</Label>
            <Select 
              value={filters.tag || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, tag: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value as StatusOS })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="AGUARDANDO_MATERIAL">Aguard. Material</SelectItem>
                <SelectItem value="FECHADA">Fechada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ tag: '', status: '', search: '' })}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredOS.length} registro{filteredOS.length !== 1 ? 's' : ''} encontrado{filteredOS.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-industrial">
            <thead>
              <tr>
                <th>Nº O.S</th>
                <th>TAG</th>
                <th>Equipamento</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Data</th>
                <th>Solicitante</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOS.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              ) : (
                filteredOS.map((os) => (
                  <tr key={os.id}>
                    <td className="font-mono font-medium">{os.numero_os}</td>
                    <td className="font-mono text-primary font-medium">{os.tag}</td>
                    <td className="max-w-[200px] truncate">{os.equipamento}</td>
                    <td><OSTypeBadge tipo={os.tipo as any} /></td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        os.prioridade === 'URGENTE' ? 'bg-destructive/10 text-destructive' :
                        os.prioridade === 'ALTA' ? 'bg-warning/10 text-warning' :
                        os.prioridade === 'MEDIA' ? 'bg-info/10 text-info' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {os.prioridade}
                      </span>
                    </td>
                    <td><OSStatusBadge status={os.status as any} /></td>
                    <td className="text-muted-foreground">{formatDate(os.data_solicitacao)}</td>
                    <td>{os.solicitante}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewOS(os)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View OS Modal */}
      <OSDetailsModal 
        os={selectedOS} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
