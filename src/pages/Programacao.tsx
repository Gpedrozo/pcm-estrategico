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
  XCircle,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useMaintenanceSchedule, useUpdateMaintenanceStatus } from '@/hooks/useMaintenanceSchedule';
import { usePontosPlano } from '@/hooks/usePontosPlano';
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
  const [newActivityDate, setNewActivityDate] = useState<string | null>(null);
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

  const lubrificacaoPlanoId = selectedEvent?.tipo === 'lubrificacao' ? selectedEvent.origem_id : undefined;
  const { data: pontosLubrificacao } = usePontosPlano(lubrificacaoPlanoId);

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

    const tipoLabels: Record<string, string> = {
      preventiva: 'MANUTENÇÃO PREVENTIVA',
      lubrificacao: 'LUBRIFICAÇÃO',
      inspecao: 'INSPEÇÃO',
      preditiva: 'MANUTENÇÃO PREDITIVA',
    };
    const tipoLabel = tipoLabels[selectedEvent.tipo] || 'MANUTENÇÃO';
    const tipoPrefix: Record<string, string> = {
      preventiva: 'PRV', lubrificacao: 'LUB', inspecao: 'INS', preditiva: 'PRD',
    };
    const docNum = `${tipoPrefix[selectedEvent.tipo] || 'MNT'}-${(selectedEvent.origem_id || '').substring(0, 8).toUpperCase()}`;
    const logoUrl = empresa?.logo_os_url || empresa?.logo_url || '';
    const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || 'MANUTENÇÃO INDUSTRIAL';
    const dataFormatada = format(new Date(selectedEvent.data_programada), 'dd/MM/yyyy', { locale: ptBR });
    const dataEmissao = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    const equipNome = equipamento?.nome || 'Não informado';
    const equipTag = equipamento?.tag || 'N/A';
    const equipSetor = (equipamento as Record<string, unknown>)?.setor as string || '';

    const doc = printWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ficha ${tipoLabel}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; color: #111; padding: 8mm; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc { border: 2px solid #000; width: 194mm; min-height: 279mm; margin: 0 auto; }

  /* HEADER */
  .header { display: flex; border-bottom: 2px solid #000; }
  .header-logo { width: 25mm; border-right: 2px solid #000; padding: 2mm; display: flex; align-items: center; justify-content: center; background: #fff; }
  .header-logo img { max-height: 18mm; max-width: 22mm; object-fit: contain; }
  .header-logo .placeholder { font-size: 8px; color: #999; font-weight: bold; }
  .header-center { flex: 1; text-align: center; padding: 2mm; display: flex; flex-direction: column; justify-content: center; }
  .header-company { font-size: 9px; font-weight: bold; letter-spacing: 2px; color: #555; }
  .header-title { font-size: 16px; font-weight: 900; margin-top: 1mm; letter-spacing: -0.3px; }
  .header-right { width: 48mm; border-left: 2px solid #000; font-size: 9px; }
  .header-right div { padding: 1.5mm 2mm; display: flex; justify-content: space-between; }
  .header-right div + div { border-top: 1px solid #000; }
  .header-right .lbl { font-weight: bold; }
  .header-right .doc-num { font-weight: 900; font-size: 12px; }

  /* COMPANY INFO BAR */
  .company-bar { border-bottom: 2px solid #000; padding: 1mm 3mm; font-size: 8px; background: #f8f8f8; color: #666; display: flex; justify-content: space-between; }

  /* INFO GRID */
  .info-grid { display: grid; border-bottom: 2px solid #000; font-size: 9px; }
  .info-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .info-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .info-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .info-cell { padding: 2mm; border-right: 1px solid #000; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-weight: bold; font-size: 8px; color: #666; display: block; margin-bottom: 0.5mm; }
  .info-value { font-weight: 600; }
  .info-value.mono { font-family: 'Courier New', monospace; font-weight: 900; font-size: 11px; }

  /* SECTION HEADER */
  .section-hdr { background: #e8e8e8; padding: 2mm; font-weight: bold; font-size: 9px; border-bottom: 1px solid #000; letter-spacing: 0.5px; }
  .section-content { padding: 2mm; min-height: 10mm; font-size: 9px; }
  .section-block { border-bottom: 2px solid #000; }

  /* BLANK LINES */
  .blank-lines { padding: 2mm; }
  .blank-line { border-bottom: 1px dashed #bbb; height: 6mm; }

  /* TABLE */
  .tbl { width: 100%; border-collapse: collapse; font-size: 9px; }
  .tbl th { background: #e8e8e8; font-weight: bold; font-size: 8px; color: #555; padding: 1.5mm 2mm; border: 1px solid #000; text-align: left; letter-spacing: 0.3px; }
  .tbl td { padding: 1.5mm 2mm; border: 1px solid #000; }
  .tbl .center { text-align: center; }
  .tbl .checkbox-cell { text-align: center; vertical-align: middle; }
  .tbl .checkbox { display: inline-block; width: 4mm; height: 4mm; border: 1px solid #000; }

  /* EXECUTORS */
  .executor-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #000; font-size: 9px; }
  .executor-block { }
  .executor-block:first-child { border-right: 2px solid #000; }
  .executor-hdr { background: #e8e8e8; padding: 2mm; font-weight: bold; border-bottom: 1px solid #000; letter-spacing: 0.5px; }
  .executor-name { padding: 2mm; height: 7mm; border-bottom: 1px solid #000; }
  .executor-sign { display: grid; grid-template-columns: 1fr 1fr; }
  .executor-sign div { padding: 1.5mm; }
  .executor-sign div:first-child { border-right: 1px solid #000; }

  /* TIME ROW */
  .time-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 2px solid #000; font-size: 9px; }
  .time-cell { padding: 2mm; }
  .time-cell + .time-cell { border-left: 1px solid #000; }
  .time-cell .lbl { font-weight: bold; font-size: 8px; color: #666; }
  .time-cell .val { height: 5mm; margin-top: 1mm; border-bottom: 1px dashed #999; }

  /* STATUS */
  .status-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #000; font-size: 9px; }
  .status-cell { padding: 2mm; }
  .status-cell:first-child { border-right: 2px solid #000; }
  .status-cell .lbl { font-weight: bold; }
  .status-opts { margin-top: 1.5mm; display: flex; gap: 6mm; }
  .status-opt { display: flex; align-items: center; gap: 1.5mm; }

  /* SIGNATURES */
  .signatures { padding: 4mm; text-align: center; font-size: 9px; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 4mm; }
  .sign-block .line { border-bottom: 1px solid #000; margin: 0 6mm; }
  .sign-block .name { font-weight: bold; margin-top: 1mm; }

  /* FOOTER */
  .footer { margin-top: 3mm; display: flex; justify-content: space-between; font-size: 7px; color: #999; padding: 0 1mm; }
</style>
</head><body></body></html>`);
    doc.close();

    const body = doc.body;

    /* ═══ BUILD HTML ═══ */
    let html = '<div class="doc">';

    /* HEADER */
    html += '<div class="header">';
    html += '<div class="header-logo">';
    html += logoUrl ? `<img src="${logoUrl}" alt="Logo">` : '<div class="placeholder">LOGO</div>';
    html += '</div>';
    html += '<div class="header-center">';
    html += `<div class="header-company">${nomeEmpresa.toUpperCase()}</div>`;
    html += `<div class="header-title">FICHA DE EXECUÇÃO — ${tipoLabel}</div>`;
    html += '</div>';
    html += '<div class="header-right">';
    html += `<div><span class="lbl">Nº Documento:</span><span class="doc-num">${docNum}</span></div>`;
    html += `<div><span class="lbl">Emissão:</span><span>${dataEmissao}</span></div>`;
    html += `<div><span class="lbl">Revisão:</span><span>00</span></div>`;
    html += `<div><span class="lbl">Página:</span><span>1 / 1</span></div>`;
    html += '</div></div>';

    /* COMPANY BAR */
    const barParts: string[] = [];
    if (empresa?.cnpj) barParts.push(`CNPJ: ${empresa.cnpj}`);
    if (empresa?.telefone) barParts.push(`Tel: ${empresa.telefone}`);
    if (empresa?.email) barParts.push(empresa.email);
    if (barParts.length > 0) {
      html += `<div class="company-bar">${barParts.map(p => `<span>${p}</span>`).join('')}</div>`;
    }

    /* INFO GRID - ROW 1 */
    html += '<div class="info-grid cols-4">';
    html += `<div class="info-cell"><span class="info-label">TAG / MÁQUINA</span><span class="info-value mono">${equipTag}</span></div>`;
    html += `<div class="info-cell"><span class="info-label">EQUIPAMENTO</span><span class="info-value">${equipNome}</span></div>`;
    html += `<div class="info-cell"><span class="info-label">TIPO</span><span class="info-value">${tipoLabel}</span></div>`;
    html += `<div class="info-cell"><span class="info-label">STATUS</span><span class="info-value">${(selectedEvent.status || 'programado').toUpperCase()}</span></div>`;
    html += '</div>';

    /* INFO GRID - ROW 2 */
    html += '<div class="info-grid cols-3">';
    html += `<div class="info-cell"><span class="info-label">DATA PROGRAMADA</span><span class="info-value">${dataFormatada}</span></div>`;
    html += `<div class="info-cell"><span class="info-label">RESPONSÁVEL</span><span class="info-value">${selectedEvent.responsavel || '—'}</span></div>`;
    html += `<div class="info-cell"><span class="info-label">SETOR</span><span class="info-value">${equipSetor || '—'}</span></div>`;
    html += '</div>';

    /* TITLE */
    html += '<div class="section-block">';
    html += `<div style="padding:2mm;font-size:9px;"><strong style="color:#666;font-size:8px;">TÍTULO: </strong><strong>${(selectedEvent.titulo || '—').toUpperCase()}</strong></div>`;
    html += '</div>';

    /* DESCRIPTION */
    html += '<div class="section-block">';
    html += '<div class="section-hdr">DESCRIÇÃO DA ATIVIDADE</div>';
    html += `<div class="section-content">${selectedEvent.descricao || '—'}</div>`;
    html += '</div>';

    /* TYPE-SPECIFIC SECTIONS */
    if (selectedEvent.tipo === 'inspecao') {
      /* Inspeção: checklist table */
      html += '<div class="section-block">';
      html += '<div class="section-hdr">CHECKLIST DE INSPEÇÃO</div>';
      html += '<table class="tbl"><thead><tr>';
      html += '<th style="width:8mm" class="center">#</th>';
      html += '<th>ITEM A INSPECIONAR</th>';
      html += '<th style="width:18mm" class="center">CONFORME</th>';
      html += '<th style="width:18mm" class="center">NÃO CONF.</th>';
      html += '<th style="width:18mm" class="center">N/A</th>';
      html += '<th style="width:40mm">OBSERVAÇÃO</th>';
      html += '</tr></thead><tbody>';
      for (let i = 1; i <= 10; i++) {
        html += '<tr>';
        html += `<td class="center" style="color:#999">${i}</td>`;
        html += '<td style="height:6mm"></td>';
        html += '<td class="checkbox-cell"><span class="checkbox"></span></td>';
        html += '<td class="checkbox-cell"><span class="checkbox"></span></td>';
        html += '<td class="checkbox-cell"><span class="checkbox"></span></td>';
        html += '<td></td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
      html += '</div>';
    } else if (selectedEvent.tipo === 'preditiva') {
      /* Preditiva: measurements table */
      html += '<div class="section-block">';
      html += '<div class="section-hdr">MEDIÇÕES / LEITURAS PREDITIVAS</div>';
      html += '<table class="tbl"><thead><tr>';
      html += '<th style="width:8mm" class="center">#</th>';
      html += '<th>PARÂMETRO / PONTO DE MEDIÇÃO</th>';
      html += '<th style="width:20mm" class="center">UNIDADE</th>';
      html += '<th style="width:22mm" class="center">VALOR LIDO</th>';
      html += '<th style="width:22mm" class="center">LIMITE OK</th>';
      html += '<th style="width:22mm" class="center">LIMITE CRIT.</th>';
      html += '<th style="width:14mm" class="center">STATUS</th>';
      html += '</tr></thead><tbody>';
      for (let i = 1; i <= 8; i++) {
        html += '<tr>';
        html += `<td class="center" style="color:#999">${i}</td>`;
        html += '<td style="height:6mm"></td>';
        html += '<td></td>';
        html += '<td></td>';
        html += '<td></td>';
        html += '<td></td>';
        html += '<td class="checkbox-cell"><span class="checkbox"></span></td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
      html += '</div>';

      /* Análise preditiva */
      html += '<div class="section-block">';
      html += '<div class="section-hdr">ANÁLISE / DIAGNÓSTICO PREDITIVO</div>';
      html += '<div class="blank-lines">';
      for (let i = 0; i < 4; i++) html += '<div class="blank-line"></div>';
      html += '</div></div>';
    } else {
      /* Preventiva / Lubrificação: activity lines */
      html += '<div class="section-block">';
      html += `<div class="section-hdr">ATIVIDADES E SERVIÇOS${selectedEvent.tipo === 'lubrificacao' ? ' — LUBRIFICAÇÃO' : ''}</div>`;
      html += '<table class="tbl"><thead><tr>';
      html += '<th style="width:8mm" class="center">#</th>';
      html += '<th>SERVIÇO / ATIVIDADE</th>';
      if (selectedEvent.tipo === 'lubrificacao') {
        html += '<th style="width:25mm" class="center">LUBRIFICANTE</th>';
        html += '<th style="width:18mm" class="center">QTD.</th>';
      }
      html += '<th style="width:18mm" class="center">TEMPO</th>';
      html += '<th style="width:14mm" class="center">OK</th>';
      html += '</tr></thead><tbody>';
      for (let i = 1; i <= 8; i++) {
        html += '<tr>';
        html += `<td class="center" style="color:#999">${i}</td>`;
        html += '<td style="height:6mm"></td>';
        if (selectedEvent.tipo === 'lubrificacao') {
          html += '<td></td><td></td>';
        }
        html += '<td></td>';
        html += '<td class="checkbox-cell"><span class="checkbox"></span></td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
      html += '</div>';
    }

    /* EXECUTORS */
    html += '<div class="executor-grid">';
    for (let n = 1; n <= 2; n++) {
      html += `<div class="executor-block">`;
      html += `<div class="executor-hdr">EXECUTOR ${n}</div>`;
      html += '<div class="executor-name"></div>';
      html += '<div class="executor-sign">';
      html += '<div><strong>Assinatura:</strong></div>';
      html += '<div><strong>Data:</strong> ___/___/______</div>';
      html += '</div></div>';
    }
    html += '</div>';

    /* TIME ROW */
    html += '<div class="time-row">';
    ['HORA INÍCIO', 'HORA FIM', 'TEMPO TOTAL'].forEach(label => {
      html += `<div class="time-cell"><span class="lbl">${label}:</span><div class="val"></div></div>`;
    });
    html += '</div>';

    /* MATERIALS */
    html += '<div class="section-block">';
    html += '<div class="section-hdr">PEÇAS / MATERIAIS UTILIZADOS</div>';
    html += '<table class="tbl"><thead><tr>';
    html += '<th style="width:25mm">CÓDIGO</th>';
    html += '<th>DESCRIÇÃO</th>';
    html += '<th style="width:15mm" class="center">QTD.</th>';
    html += '<th style="width:15mm" class="center">UN.</th>';
    html += '</tr></thead><tbody>';
    for (let i = 0; i < 4; i++) {
      html += '<tr><td style="height:6mm"></td><td></td><td></td><td></td></tr>';
    }
    html += '</tbody></table>';
    html += '</div>';

    /* STATUS CHECKBOXES */
    html += '<div class="status-grid">';
    ['Serviço finalizado', 'Equipamento liberado'].forEach(label => {
      html += '<div class="status-cell">';
      html += `<span class="lbl">${label}:</span>`;
      html += '<div class="status-opts">';
      ['Sim', 'Não'].forEach(opt => {
        html += `<div class="status-opt"><span class="checkbox"></span><span>${opt}</span></div>`;
      });
      html += '</div></div>';
    });
    html += '</div>';

    /* OBSERVATIONS */
    html += '<div class="section-block">';
    html += '<div class="section-hdr">OBSERVAÇÕES</div>';
    html += '<div class="blank-lines">';
    for (let i = 0; i < 3; i++) html += '<div class="blank-line"></div>';
    html += '</div></div>';

    /* SIGNATURES */
    html += '<div class="signatures">';
    html += '<div class="sign-grid">';
    html += '<div class="sign-block"><div class="line"></div><div class="name">Responsável Manutenção</div></div>';
    html += '<div class="sign-block"><div class="line"></div><div class="name">Responsável Produção</div></div>';
    html += '</div>';
    html += '<div style="margin-top:3mm;color:#666;">Data: ___/___/______</div>';
    html += '</div>';

    html += '</div>'; /* close .doc */

    /* FOOTER */
    const footerParts = [nomeEmpresa];
    if (empresa?.endereco) footerParts.push(empresa.endereco);
    if (empresa?.cidade) footerParts.push(`${empresa.cidade}/${empresa?.estado || ''}`);
    html += `<div class="footer"><span>${footerParts.join(' • ')}</span><span>Página 1/1 • Emitido em ${dataEmissao}</span></div>`;

    body.innerHTML = html;

    setTimeout(() => { printWindow.print(); }, 300);
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setNewActivityDate(dayKey)}
                      className="h-5 w-5 rounded-full hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Programar atividade"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className={`text-lg ${isToday ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
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

              {selectedEvent.tipo === 'lubrificacao' && pontosLubrificacao && pontosLubrificacao.length > 0 && (
                <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <p className="text-sm font-medium">Pontos de Lubrificação ({pontosLubrificacao.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {pontosLubrificacao.map((ponto, idx) => (
                      <div key={ponto.id} className="text-xs flex items-center gap-2 py-1 border-b last:border-b-0">
                        <Badge variant="outline" className="text-[10px] px-1">{idx + 1}</Badge>
                        <span className="font-medium">{ponto.tag || '—'}</span>
                        <span className="text-muted-foreground truncate">{ponto.descricao || ponto.localizacao || ''}</span>
                        {ponto.lubrificante && <span className="ml-auto text-muted-foreground">{ponto.lubrificante} {ponto.quantidade ? `(${ponto.quantidade})` : ''}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                <Button
                  variant="outline"
                  className="gap-2 sm:col-span-2"
                  onClick={handlePrintFicha}
                >
                  <Printer className="h-4 w-4" /> Imprimir ficha para execução
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!newActivityDate} onOpenChange={(open) => !open && setNewActivityDate(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Programar Atividade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o tipo para {newActivityDate && format(parseISO(newActivityDate), 'dd/MM/yyyy')}:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Preventiva', path: '/preventiva' },
              { label: 'Lubrificação', path: '/lubrificacao' },
              { label: 'Inspeção', path: '/inspecoes' },
              { label: 'Preditiva', path: '/preditiva' },
            ].map((item) => (
              <Button
                key={item.path}
                variant="outline"
                className="justify-start"
                onClick={() => {
                  navigate(item.path, { state: { dataProgramada: newActivityDate } });
                  setNewActivityDate(null);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}