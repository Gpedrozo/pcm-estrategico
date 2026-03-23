import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertTriangle, Filter, LayoutGrid, List } from 'lucide-react';
import { useOrdensServico, useUpdateOrdemServico } from '@/hooks/useOrdensServico';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { format, startOfWeek, addWeeks, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeOSStatus, normalizeOSType } from '@/lib/osBadges';
import { getPriorityToneClass, useTenantPadronizacoes } from '@/hooks/useTenantPadronizacoes';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Backlog() {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [osToCancel, setOsToCancel] = useState<{ id: string; numero_os: number } | null>(null);
  
  const { data: ordensServico, isLoading } = useOrdensServico();
  const updateOrdemServico = useUpdateOrdemServico();
  const { data: padronizacoes } = useTenantPadronizacoes();
  const { toast } = useToast();
  const { user } = useAuth();

  const prioridadesOS = padronizacoes?.prioridades_os?.length
    ? padronizacoes.prioridades_os
    : ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'];
  const prioridadePrincipal = prioridadesOS[0] ?? 'URGENTE';
  const prioridadeSecundaria = prioridadesOS[1] ?? 'ALTA';

  // Filter for open OS (backlog)
  const backlog = useMemo(() => {
    if (!ordensServico) return [];
    
    return ordensServico.filter(os => {
      const isInBacklog = os.status === 'ABERTA' || os.status === 'EM_ANDAMENTO' || os.status === 'AGUARDANDO_MATERIAL';
      if (!isInBacklog) return false;
      
      if (filterPriority !== 'all' && os.prioridade !== filterPriority) return false;
      
      if (search) {
        const searchLower = search.toLowerCase();
        return os.tag.toLowerCase().includes(searchLower) ||
               os.equipamento.toLowerCase().includes(searchLower) ||
               os.problema.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [ordensServico, search, filterPriority]);

  // Group by week
  const weeklyGroups = useMemo(() => {
    const groups: { [key: string]: typeof backlog } = {};
    const now = new Date();
    
    // Create 4 week groups
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addWeeks(now, i), { locale: ptBR });
      const weekKey = format(weekStart, "dd/MM", { locale: ptBR });
      groups[`Semana ${i + 1} (${weekKey})`] = [];
    }
    groups['Atrasadas'] = [];
    groups['Futuras'] = [];
    
    backlog.forEach(os => {
      const osDate = parseISO(os.data_solicitacao);
      const now = new Date();
      
      // Check if overdue (opened more than 7 days ago and still open)
      const daysSinceOpen = Math.floor((now.getTime() - osDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOpen > 7 && os.status === 'ABERTA') {
        groups['Atrasadas'].push(os);
      } else {
        // Assign to current week for now
        const firstWeekKey = Object.keys(groups)[0];
        if (groups[firstWeekKey]) {
          groups[firstWeekKey].push(os);
        }
      }
    });
    
    return groups;
  }, [backlog]);

  // Statistics
  const stats = useMemo(() => ({
    total: backlog.length,
    principal: backlog.filter(os => os.prioridade === prioridadePrincipal).length,
    secundaria: backlog.filter(os => os.prioridade === prioridadeSecundaria).length,
    atrasadas: weeklyGroups['Atrasadas']?.length || 0,
    horasEstimadas: backlog.reduce((acc, os) => acc + (os.tempo_estimado || 0), 0),
  }), [backlog, weeklyGroups, prioridadePrincipal, prioridadeSecundaria]);

  const handleCancelOS = async () => {
    if (!osToCancel) return;

    try {
      await updateOrdemServico.mutateAsync({
        id: osToCancel.id,
        status: 'CANCELADA',
        data_fechamento: new Date().toISOString(),
        usuario_fechamento: user?.email ?? null,
      });

      toast({
        title: 'O.S cancelada',
        description: `A ordem de serviço nº ${osToCancel.numero_os} foi cancelada.`,
      });
      setOsToCancel(null);
    } catch {
      // O erro é tratado no hook de atualização.
    }
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backlog de Manutenção</h1>
          <p className="text-muted-foreground">
            Gestão e priorização das ordens de serviço pendentes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Backlog</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">{prioridadePrincipal}</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.principal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">{prioridadeSecundaria}</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.secundaria}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.atrasadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <span className="text-sm text-muted-foreground">Horas Estimadas</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(stats.horasEstimadas / 60)}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por TAG, equipamento, problema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {prioridadesOS.map((prioridade) => (
              <SelectItem key={prioridade} value={prioridade}>{prioridade}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekly View */}
      <div className="space-y-4">
        {Object.entries(weeklyGroups).map(([weekName, osGroup]) => (
          osGroup.length > 0 && (
            <Card key={weekName}>
              <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {weekName}
                  <Badge variant="outline">{osGroup.length} OS</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Nº OS</th>
                      <th>TAG</th>
                      <th>Equipamento</th>
                      <th>Problema</th>
                      <th>Tipo</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                      <th>Tempo Est.</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osGroup.map(os => (
                      <tr key={os.id}>
                        <td className="font-mono font-medium">{os.numero_os}</td>
                        <td className="font-mono text-primary font-medium">{os.tag}</td>
                        <td>{os.equipamento}</td>
                        <td className="max-w-[200px] truncate">{os.problema}</td>
                        <td><OSTypeBadge tipo={normalizeOSType(os.tipo)} /></td>
                        <td>
                          <Badge className={getPriorityToneClass(os.prioridade, prioridadesOS)}>
                            {os.prioridade}
                          </Badge>
                        </td>
                        <td><OSStatusBadge status={normalizeOSStatus(os.status)} /></td>
                        <td>{os.tempo_estimado ? `${os.tempo_estimado} min` : '-'}</td>
                        <td className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setOsToCancel({ id: os.id, numero_os: os.numero_os })}
                          >
                            Cancelar O.S
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {backlog.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhuma ordem de serviço no backlog</p>
          <p className="text-sm">Todas as OS foram concluídas!</p>
        </div>
      )}

      <AlertDialog open={!!osToCancel} onOpenChange={(open) => !open && setOsToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar ordem de serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o cancelamento da O.S nº {osToCancel?.numero_os}? Esta ação remove a O.S do backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOrdemServico.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOS}
              disabled={updateOrdemServico.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateOrdemServico.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}