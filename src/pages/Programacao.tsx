import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useMecanicos } from '@/hooks/useMecanicos';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Programacao() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedMecanico, setSelectedMecanico] = useState<string>('all');
  
  const { data: ordensServico, isLoading: loadingOS } = useOrdensServico();
  const { data: mecanicos, isLoading: loadingMecanicos } = useMecanicos();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Group OS by day for the current week
  const osByDay = useMemo(() => {
    if (!ordensServico) return {};
    
    const grouped: { [key: string]: typeof ordensServico } = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = ordensServico.filter(os => {
        if (os.status === 'FECHADA') return false;
        const osDate = parseISO(os.data_solicitacao);
        return isSameDay(osDate, day);
      });
    });
    
    return grouped;
  }, [ordensServico, weekDays]);

  // Active mechanics for assignment
  const activeMecanicos = useMemo(() => 
    mecanicos?.filter(m => m.ativo) || [], 
    [mecanicos]
  );

  // Stats
  const stats = useMemo(() => {
    const allOs = Object.values(osByDay).flat();
    return {
      total: allOs.length,
      programadas: allOs.filter(os => os.status === 'EM_ANDAMENTO').length,
      aguardando: allOs.filter(os => os.status === 'AGUARDANDO_MATERIAL').length,
      mecanicosDisponiveis: activeMecanicos.length,
    };
  }, [osByDay, activeMecanicos]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'next' ? addDays(prev, 7) : addDays(prev, -7)
    );
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'border-l-4 border-l-destructive';
      case 'ALTA': return 'border-l-4 border-l-warning';
      case 'MEDIA': return 'border-l-4 border-l-info';
      default: return 'border-l-4 border-l-muted';
    }
  };

  const isLoading = loadingOS || loadingMecanicos;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programação de Manutenção</h1>
          <p className="text-muted-foreground">
            Visualização e alocação de ordens de serviço
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">OS na Semana</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-info" />
              <span className="text-sm text-muted-foreground">Em Andamento</span>
            </div>
            <p className="text-2xl font-bold text-info">{stats.programadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Aguardando</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.aguardando}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Mecânicos</span>
            </div>
            <p className="text-2xl font-bold">{stats.mecanicosDisponiveis}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 font-semibold">
            {format(currentWeekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "dd 'de' MMMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <Select value={selectedMecanico} onValueChange={setSelectedMecanico}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar mecânico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os mecânicos</SelectItem>
            {activeMecanicos.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayOS = osByDay[dayKey] || [];
          const isToday = isSameDay(day, new Date());
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <Card 
              key={dayKey} 
              className={`min-h-[300px] ${isToday ? 'ring-2 ring-primary' : ''} ${isWeekend ? 'bg-muted/50' : ''}`}
            >
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className={isToday ? 'text-primary font-bold' : ''}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={`text-lg ${isToday ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2 overflow-y-auto max-h-[250px]">
                {dayOS.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem OS programadas
                  </p>
                ) : (
                  dayOS.map(os => (
                    <div 
                      key={os.id} 
                      className={`p-2 rounded bg-card border text-xs cursor-pointer hover:shadow-md transition-shadow ${getPriorityBorder(os.prioridade)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold">#{os.numero_os}</span>
                        {os.prioridade === 'URGENTE' && (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <p className="font-medium text-primary truncate">{os.tag}</p>
                      <p className="text-muted-foreground truncate">{os.equipamento}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {os.tipo}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mechanic Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Disponibilidade de Mecânicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeMecanicos.map(mecanico => (
              <div 
                key={mecanico.id} 
                className="p-3 border border-border rounded-lg text-center hover:bg-accent/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">
                    {mecanico.nome.charAt(0)}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{mecanico.nome}</p>
                <p className="text-xs text-muted-foreground">{mecanico.especialidade || mecanico.tipo}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Disponível
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}