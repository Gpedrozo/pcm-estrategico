import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  ExternalLink,
  Edit,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useMaintenanceSchedule, useUpdateMaintenanceStatus } from '@/hooks/useMaintenanceSchedule';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type EventTone = 'executado' | 'vencido' | 'proximo' | 'futuro';
type CalendarFilter = 'all' | 'preventiva' | 'lubrificacao' | 'pred-inspecao';

function mapMaintenanceTipoToOsTipo(tipo: string) {
  if (tipo === 'preventiva') return 'PREVENTIVA';
  if (tipo === 'lubrificacao') return 'PREVENTIVA';
  if (tipo === 'inspecao') return 'INSPECAO';
  if (tipo === 'preditiva') return 'PREDITIVA';
  return 'PREVENTIVA';
}

export default function Programacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');

  const weekStartIso = currentWeekStart.toISOString();
  const weekEndIso = addDays(currentWeekStart, 6).toISOString();

  const { data: eventos, isLoading } = useMaintenanceSchedule(weekStartIso, weekEndIso);
  const { data: equipamentos } = useEquipamentos();
  const { data: empresa } = useDadosEmpresa();
  const updateSchedule = useUpdateMaintenanceStatus();
  const createOSMutation = useCreateOrdemServico();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const selectedEvent = useMemo(
    () => (eventos || []).find((item) => item.id === selectedEventId) || null,
    [eventos, selectedEventId],
  );

  const eventTone = (status: string, dataProgramada: string): EventTone => {
    const lower = (status || '').toLowerCase();
    if (['executado', 'concluido', 'concluida'].includes(lower)) return 'executado';

    const today = new Date();
    const eventDate = new Date(dataProgramada);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / msPerDay);

    if (diffDays < 0) return 'vencido';
    if (diffDays <= 7) return 'proximo';
    return 'futuro';
  };

  const toneClasses = (tone: EventTone) => {
    if (tone === 'executado') return 'border-l-4 border-l-green-500 bg-green-500/5';
    if (tone === 'vencido') return 'border-l-4 border-l-red-500 bg-red-500/5';
    if (tone === 'proximo') return 'border-l-4 border-l-yellow-500 bg-yellow-500/5';
    return 'border-l-4 border-l-blue-500 bg-blue-500/5';
  };

  const toneLabel = (tone: EventTone) => {
    if (tone === 'executado') return 'Executado';
    if (tone === 'vencido') return 'Vencido';
    if (tone === 'proximo') return 'Próximo';
    return 'Futuro';
  };

  const eventosByDay = useMemo(() => {
    if (!eventos) return {};

    const eventsFilteredByType = eventos.filter((evento) => {
      if (calendarFilter === 'all') return true;
      if (calendarFilter === 'pred-inspecao') return ['preditiva', 'inspecao'].includes(evento.tipo);
      return evento.tipo === calendarFilter;
    });
    
    const grouped: { [key: string]: typeof eventos } = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = eventsFilteredByType.filter((evento) => {
        const eventDate = parseISO(evento.data_programada);
        return isSameDay(eventDate, day);
      });
    });
    
    return grouped;
  }, [eventos, weekDays, calendarFilter]);

  const stats = useMemo(() => {
    const allEvents = Object.values(eventosByDay).flat();
    const executed = allEvents.filter((item) => eventTone(item.status, item.data_programada) === 'executado').length;
    const overdue = allEvents.filter((item) => eventTone(item.status, item.data_programada) === 'vencido').length;
    const near = allEvents.filter((item) => eventTone(item.status, item.data_programada) === 'proximo').length;

    return {
      total: allEvents.length,
      executadas: executed,
      vencidas: overdue,
      proximas: near,
    };
  }, [eventosByDay]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'next' ? addDays(prev, 7) : addDays(prev, -7)
    );
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const resolveEquipamentoByEvent = (event: { equipamento_id: string | null; titulo: string }) => {
    const byId = equipamentos?.find((item) => item.id === event.equipamento_id);
    if (byId) return byId;

    const possibleTag = event.titulo.split('•')[0]?.trim();
    if (!possibleTag) return undefined;

    return equipamentos?.find((item) => item.tag === possibleTag);
  };

  const handleEmitirOS = async () => {
    if (!selectedEvent) return;

    const equipamento = resolveEquipamentoByEvent(selectedEvent);
    const tag = equipamento?.tag || '';

    if (!tag) {
      toast({
        title: 'Não foi possível emitir O.S',
        description: 'Este item não possui TAG de equipamento vinculada.',
        variant: 'destructive',
      });
      return;
    }

    const novaOS = await createOSMutation.mutateAsync({
      tipo: mapMaintenanceTipoToOsTipo(selectedEvent.tipo),
      prioridade: 'MEDIA',
      tag,
      equipamento: equipamento?.nome || selectedEvent.titulo,
      solicitante: 'Programação de Manutenção',
      problema: selectedEvent.descricao || `Execução programada: ${selectedEvent.titulo}`,
      tempo_estimado: null,
      usuario_abertura: null,
    });

    await updateSchedule.mutateAsync({ id: selectedEvent.id, status: 'emitido' });

    toast({
      title: 'O.S emitida com sucesso',
      description: `Ordem de Serviço nº ${novaOS.numero_os} gerada a partir da programação.`,
    });
  };

  const handlePrintFicha = () => {
    if (!selectedEvent) return;

    const equipamento = equipamentos?.find((item) => item.id === selectedEvent.equipamento_id);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const tipoLabel = selectedEvent.tipo === 'lubrificacao' ? 'Lubrificação' : 'Preventiva';
    const logoUrl = empresa?.logo_os_url || empresa?.logo_pdf_url || empresa?.logo_url || '';
    const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || 'MANUTENÇÃO INDUSTRIAL';
    const doc = printWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();

    doc.title = `Ficha ${tipoLabel}`;

    const style = doc.createElement('style');
    style.textContent = [
      'body { font-family: Arial, sans-serif; margin: 24px; color: #111; }',
      'h1 { font-size: 20px; margin-bottom: 12px; }',
      '.line { margin: 8px 0; }',
      '.label { font-weight: bold; }',
      '.box { border: 1px solid #ccc; border-radius: 6px; padding: 12px; margin-top: 14px; }',
      '.sign { margin-top: 32px; display: flex; justify-content: space-between; gap: 24px; }',
      '.sign div { width: 45%; border-top: 1px solid #999; padding-top: 8px; text-align: center; }',
    ].join('\n');
    doc.head.appendChild(style);

    const body = doc.body;

    if (logoUrl) {
      const logo = doc.createElement('img');
      logo.src = logoUrl;
      logo.alt = 'Logo da empresa';
      logo.style.maxHeight = '48px';
      logo.style.maxWidth = '180px';
      logo.style.objectFit = 'contain';
      logo.style.marginBottom = '10px';
      body.appendChild(logo);
    }

    const title = doc.createElement('h1');
    title.textContent = `${nomeEmpresa} - Ficha de Execução - ${tipoLabel}`;
    body.appendChild(title);

    const addLine = (label: string, value: string) => {
      const line = doc.createElement('div');
      line.className = 'line';

      const labelSpan = doc.createElement('span');
      labelSpan.className = 'label';
      labelSpan.textContent = `${label}: `;

      const valueSpan = doc.createElement('span');
      valueSpan.textContent = value;

      line.appendChild(labelSpan);
      line.appendChild(valueSpan);
      body.appendChild(line);
    };

    addLine('Título', selectedEvent.titulo || '—');
    addLine('Equipamento', equipamento?.nome || 'Não informado');
    addLine('TAG', equipamento?.tag || 'Não informado');
    addLine('Data programada', new Date(selectedEvent.data_programada).toLocaleString('pt-BR'));
    addLine('Responsável', selectedEvent.responsavel || '—');

    const descricaoBox = doc.createElement('div');
    descricaoBox.className = 'box';
    const descricaoLabel = doc.createElement('div');
    descricaoLabel.className = 'label';
    descricaoLabel.textContent = 'Descrição da atividade:';
    const descricaoValue = doc.createElement('div');
    descricaoValue.textContent = selectedEvent.descricao || '—';
    descricaoBox.appendChild(descricaoLabel);
    descricaoBox.appendChild(descricaoValue);
    body.appendChild(descricaoBox);

    const anotacoesBox = doc.createElement('div');
    anotacoesBox.className = 'box';
    anotacoesBox.style.minHeight = '140px';
    const anotacoesLabel = doc.createElement('div');
    anotacoesLabel.className = 'label';
    anotacoesLabel.textContent = 'Anotações de execução:';
    anotacoesBox.appendChild(anotacoesLabel);
    body.appendChild(anotacoesBox);

    const sign = doc.createElement('div');
    sign.className = 'sign';
    const sign1 = doc.createElement('div');
    sign1.textContent = 'Mecânico responsável';
    const sign2 = doc.createElement('div');
    sign2.textContent = 'Supervisor / Aprovação';
    sign.appendChild(sign1);
    sign.appendChild(sign2);
    body.appendChild(sign);

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programação de Manutenção</h1>
          <p className="text-muted-foreground">
            Calendário central de manutenções programadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Programações</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Executadas</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.executadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Vencidas</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{stats.vencidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Próximas</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{stats.proximas}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-lg p-3">
        <Tabs value={calendarFilter} onValueChange={(value) => setCalendarFilter(value as CalendarFilter)}>
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="preventiva">Preventiva</TabsTrigger>
            <TabsTrigger value="lubrificacao">Lubrificação</TabsTrigger>
            <TabsTrigger value="pred-inspecao">Preditiva/Inspeções</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
        <p className="text-sm text-muted-foreground">Sem ordens de serviço nesta agenda</p>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventosByDay[dayKey] || [];
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
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem itens programados
                  </p>
                ) : (
                  dayEvents.map((evento) => {
                    const tone = eventTone(evento.status, evento.data_programada);
                    return (
                    <div 
                      key={evento.id}
                      onClick={() => {
                        setSelectedEventId(evento.id);
                        setRescheduleDate(evento.data_programada.slice(0, 16));
                      }}
                      className={`p-2 rounded border text-xs cursor-pointer hover:shadow-md transition-shadow ${toneClasses(tone)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{evento.tipo}</Badge>
                        <span className="text-[10px] text-muted-foreground">{toneLabel(tone)}</span>
                      </div>
                      <p className="font-medium text-primary truncate">{evento.titulo}</p>
                      <p className="text-muted-foreground truncate">{new Date(evento.data_programada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Programação de Manutenção</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {selectedEvent.tipo}</p>
                <p>
                  <span className="text-muted-foreground">Equipamento:</span>{' '}
                  {equipamentos?.find((item) => item.id === selectedEvent.equipamento_id)?.nome || 'Não informado'}
                </p>
                <p><span className="text-muted-foreground">Descrição:</span> {selectedEvent.descricao || '—'}</p>
                <p><span className="text-muted-foreground">Data programada:</span> {new Date(selectedEvent.data_programada).toLocaleString('pt-BR')}</p>
                <p><span className="text-muted-foreground">Responsável:</span> {selectedEvent.responsavel || '—'}</p>
                <p><span className="text-muted-foreground">Status:</span> {selectedEvent.status}</p>
              </div>

              <div className="space-y-2">
                <Label>Reagendar data</Label>
                <Input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['executado', 'concluido', 'concluida'].includes((selectedEvent.status || '').toLowerCase()) ? (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => updateSchedule.mutate({ id: selectedEvent.id, status: 'programado' })}
                  >
                    <XCircle className="h-4 w-4" /> Marcar como não executado
                  </Button>
                ) : (
                  <Button
                    className="gap-2"
                    onClick={() => updateSchedule.mutate({ id: selectedEvent.id, status: 'executado' })}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Marcar como executado
                  </Button>
                )}

                <Button
                  className="gap-2"
                  onClick={() => void handleEmitirOS()}
                  disabled={createOSMutation.isPending || ['emitido', 'executado', 'concluido', 'concluida'].includes((selectedEvent.status || '').toLowerCase())}
                >
                  {createOSMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Emitir O.S
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (!rescheduleDate) return;
                    updateSchedule.mutate({
                      id: selectedEvent.id,
                      dataProgramada: new Date(rescheduleDate).toISOString(),
                      status: 'programado',
                    });
                  }}
                >
                  <Clock className="h-4 w-4" /> Reagendar data
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate(`/${selectedEvent.tipo === 'inspecao' ? 'inspecoes' : selectedEvent.tipo}?edit=${selectedEvent.origem_id}`)}
                >
                  <Edit className="h-4 w-4" /> Editar plano
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate(`/${selectedEvent.tipo === 'inspecao' ? 'inspecoes' : selectedEvent.tipo}?item=${selectedEvent.origem_id}`)}
                >
                  <ExternalLink className="h-4 w-4" /> Abrir item original
                </Button>

                {['preventiva', 'lubrificacao'].includes(selectedEvent.tipo) && (
                  <Button
                    variant="outline"
                    className="gap-2 sm:col-span-2"
                    onClick={handlePrintFicha}
                  >
                    <Printer className="h-4 w-4" /> Imprimir ficha para execução
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}