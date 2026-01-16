import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertTriangle, Filter, LayoutGrid, List } from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { format, startOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Backlog() {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const { data: ordensServico, isLoading } = useOrdensServico();

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
    urgente: backlog.filter(os => os.prioridade === 'URGENTE').length,
    alta: backlog.filter(os => os.prioridade === 'ALTA').length,
    atrasadas: weeklyGroups['Atrasadas']?.length || 0,
    horasEstimadas: backlog.reduce((acc, os) => acc + (os.tempo_estimado || 0), 0),
  }), [backlog, weeklyGroups]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'bg-destructive text-destructive-foreground';
      case 'ALTA': return 'bg-warning text-warning-foreground';
      case 'MEDIA': return 'bg-info/10 text-info';
      case 'BAIXA': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
              <span className="text-sm text-destructive">Urgentes</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.urgente}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">Alta Prioridade</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.alta}</p>
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
            <SelectItem value="URGENTE">Urgente</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
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
                    </tr>
                  </thead>
                  <tbody>
                    {osGroup.map(os => (
                      <tr key={os.id}>
                        <td className="font-mono font-medium">{os.numero_os}</td>
                        <td className="font-mono text-primary font-medium">{os.tag}</td>
                        <td>{os.equipamento}</td>
                        <td className="max-w-[200px] truncate">{os.problema}</td>
                        <td><OSTypeBadge tipo={os.tipo as any} /></td>
                        <td>
                          <Badge className={getPriorityColor(os.prioridade)}>
                            {os.prioridade}
                          </Badge>
                        </td>
                        <td><OSStatusBadge status={os.status as any} /></td>
                        <td>{os.tempo_estimado ? `${os.tempo_estimado} min` : '-'}</td>
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
    </div>
  );
}