import { useMemo, useRef, useState } from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePendingOrdensServico, type OrdemServicoRow } from '@/hooks/useOrdensServico';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useMateriaisAtivos, useAddMaterialOS, type MaterialRow } from '@/hooks/useMateriais';
import { useCreateExecucaoOS, useCloseOSAtomic } from '@/hooks/useExecucoesOS';
import { useUploadOSAnexo } from '@/hooks/useOSAnexos';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useTenantAdminConfig } from '@/hooks/useTenantAdminConfig';
import { useFormDraft, readDraft } from '@/hooks/useFormDraft';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { updateWithColumnFallback } from '@/lib/supabaseCompat';
import { supabase } from '@/integrations/supabase/client';
import { useScheduledMaintenanceContext } from '@/hooks/useScheduledMaintenanceContext';
import type { ChecklistItem } from '@/schemas/checklist.schema';
import { 
  ArrowLeft, 
  Check, 
  FileCheck, 
  Loader2, 
  Plus, 
  Trash2, 
  Package, 
  AlertTriangle,
  Wrench,
  Clock,
  Search,
  ClipboardList,
  Upload,
  FileText,
  CalendarClock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeOSStatus, normalizeOSType } from '@/lib/osBadges';

interface MaterialUsado {
  material: MaterialRow;
  quantidade: number;
}

interface PausaExecucao {
  id: string;
  data_inicio: string;
  inicio: string;
  data_fim: string;
  fim: string;
  motivo: string;
}

export default function FecharOS() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const { log } = useLogAuditoria();

  const { data: pendingOS, isLoading: loadingOS } = usePendingOrdensServico();
  const { data: mecanicos, isLoading: loadingMecanicos } = useMecanicosAtivos();
  const { data: materiaisDisponiveis } = useMateriaisAtivos();
  const { data: processoConfig } = useTenantAdminConfig<{ bloquear_fechamento_futuro?: boolean }>('tenant.admin.processo', { bloquear_fechamento_futuro: true });
  const createExecucaoMutation = useCreateExecucaoOS();
  const closeOSAtomicMutation = useCloseOSAtomic();
  const addMaterialOSMutation = useAddMaterialOS();
  const uploadAnexoMutation = useUploadOSAnexo();
  
  // ── Synchronous draft restoration (zero-flash) ──
  const _draft = readDraft<{
    formData: typeof _defaultFormData;
    selectedOSId: string | null;
    materiaisUsados: { materialId: string; quantidade: number }[];
    pausasExecucao: PausaExecucao[];
    teveIntervalos: boolean;
    activeTab: string;
  }>('draft:fechar-os');

  const _defaultFormData = {
    mecanicoId: '',
    dataInicio: new Date().toISOString().slice(0, 10),
    horaInicio: '',
    dataFim: new Date().toISOString().slice(0, 10),
    horaFim: '',
    servicoExecutado: '',
    custoTerceiros: '',
  };

  const [selectedOS, setSelectedOS] = useState<OrdemServicoRow | null>(null);
  const [activeTab, setActiveTab] = useState(_draft?.activeTab || 'execucao');
  const [formData, setFormData] = useState(_draft?.formData || _defaultFormData);
  const [materiaisUsados, setMateriaisUsados] = useState<MaterialUsado[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState('');
  const [pausaInicio, setPausaInicio] = useState('');
  const [pausaDataInicio, setPausaDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [pausaFim, setPausaFim] = useState('');
  const [pausaDataFim, setPausaDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [pausaMotivo, setPausaMotivo] = useState('Intervalo');
  const [pausasExecucao, setPausasExecucao] = useState<PausaExecucao[]>(_draft?.pausasExecucao || []);
  const [teveIntervalos, setTeveIntervalos] = useState(_draft?.teveIntervalos || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchOS, setSearchOS] = useState('');
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const servicoMinLength = 20;

  // ── Checklist técnico do plano (quando O.S. vem de programação) ──
  const scheduleId = selectedOS ? (selectedOS as Record<string, unknown>).maintenance_schedule_id as string | null : null;
  const { data: scheduledContext } = useScheduledMaintenanceContext(scheduleId);
  const hasPlanoChecklist = (scheduledContext?.checklist?.length ?? 0) > 0;

  interface ChecklistResposta { item_id: string; resultado: 'OK' | 'NOK' | 'NA'; observacao: string; }
  const [checklistRespostas, setChecklistRespostas] = useState<ChecklistResposta[]>([]);

  useEffect(() => {
    if (!scheduledContext?.checklist?.length) {
      setChecklistRespostas([]);
      return;
    }
    setChecklistRespostas((prev) => {
      return scheduledContext.checklist.map((item) => {
        const existing = prev.find(r => r.item_id === item.id);
        return existing || { item_id: item.id, resultado: 'OK' as const, observacao: '' };
      });
    });
  }, [scheduledContext?.checklist]);

  const updateChecklistResposta = (itemId: string, field: 'resultado' | 'observacao', value: string) => {
    setChecklistRespostas((prev) =>
      prev.map((r) => r.item_id === itemId ? { ...r, [field]: value } : r),
    );
  };

  const checklistNokSemJustificativa = useMemo(() => {
    if (!hasPlanoChecklist) return [];
    return checklistRespostas.filter((r) => {
      const item = scheduledContext?.checklist.find(c => c.id === r.item_id);
      return item?.obrigatorio && r.resultado === 'NOK' && !r.observacao.trim();
    });
  }, [checklistRespostas, scheduledContext?.checklist, hasPlanoChecklist]);

  const filteredPendingOS = useMemo(() => {
    if (!pendingOS) return [];
    if (!searchOS.trim()) return pendingOS;
    const s = searchOS.toLowerCase();
    return pendingOS.filter(
      (os) =>
        os.numero_os?.toLowerCase().includes(s) ||
        os.tag?.toLowerCase().includes(s) ||
        os.equipamento?.toLowerCase().includes(s) ||
        os.problema?.toLowerCase().includes(s),
    );
  }, [pendingOS, searchOS]);

  const getDiasAberto = (os: OrdemServicoRow) => {
    const criacao = os.created_at;
    if (!criacao) return null;
    const diff = Math.floor((Date.now() - new Date(criacao).getTime()) / 86400000);
    return diff;
  };

  const { clearDraft: clearFecharOSDraft } = useFormDraft(
    'draft:fechar-os',
    {
      formData,
      selectedOSId: selectedOS?.id || null,
      materiaisUsados: materiaisUsados.map((m) => ({
        materialId: m.material.id,
        quantidade: m.quantidade,
      })),
      pausasExecucao,
      teveIntervalos,
      activeTab,
    },
  );

  // Restore selectedOS + materiais from draft once query data is loaded
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current || !_draft) return;
    if (!pendingOS || pendingOS.length === 0) return;

    draftRestoredRef.current = true;

    if (_draft.selectedOSId && !selectedOS) {
      const os = pendingOS.find((item) => item.id === _draft.selectedOSId);
      if (os) setSelectedOS(os);
    }

    if (_draft.materiaisUsados?.length && materiaisDisponiveis?.length) {
      const restored: MaterialUsado[] = [];
      for (const item of _draft.materiaisUsados) {
        const mat = materiaisDisponiveis.find((m) => m.id === item.materialId);
        if (mat) restored.push({ material: mat, quantidade: item.quantidade });
      }
      if (restored.length) setMateriaisUsados(restored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOS, materiaisDisponiveis]);

  const selectedMecanico = mecanicos?.find(m => m.id === formData.mecanicoId);

  const parseDateTime = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) return null;
    const parsed = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const calculateDuration = () => {
    const inicio = parseDateTime(formData.dataInicio, formData.horaInicio);
    const fim = parseDateTime(formData.dataFim, formData.horaFim);
    if (!inicio || !fim || fim <= inicio) return null;
    return Math.max(1, Math.floor((fim.getTime() - inicio.getTime()) / 60000));
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calculatePauseMinutes = () => {
    const total = pausasExecucao.reduce((acc, pausa) => {
      const inicio = parseDateTime(pausa.data_inicio, pausa.inicio);
      const fim = parseDateTime(pausa.data_fim, pausa.fim);
      if (!inicio || !fim || fim <= inicio) {
        return acc;
      }
      return acc + Math.max(1, Math.floor((fim.getTime() - inicio.getTime()) / 60000));
    }, 0);

    return total;
  };

  const calculateNetDuration = () => {
    const bruto = calculateDuration();
    if (!bruto) return null;
    const liquido = bruto - calculatePauseMinutes();
    return Math.max(liquido, 0);
  };

  const handleAddPausa = () => {
    if (!pausaInicio || !pausaFim) return;

    const inicio = timeToMinutes(pausaInicio);
    const fim = timeToMinutes(pausaFim);
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
      toast({
        title: 'Pausa inválida',
        description: 'A hora final da pausa deve ser maior que a hora inicial.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.horaInicio && formData.horaFim && formData.dataInicio && formData.dataFim) {
      const inicioExec = parseDateTime(formData.dataInicio, formData.horaInicio);
      const fimExec = parseDateTime(formData.dataFim, formData.horaFim);
      const inicioPausa = parseDateTime(pausaDataInicio, pausaInicio);
      const fimPausa = parseDateTime(pausaDataFim, pausaFim);
      if (!inicioExec || !fimExec || !inicioPausa || !fimPausa || inicioPausa < inicioExec || fimPausa > fimExec) {
        toast({
          title: 'Pausa fora da execução',
          description: 'A pausa deve estar dentro do horário de início/fim da execução.',
          variant: 'destructive',
        });
        return;
      }
    }

    const intersectsExisting = pausasExecucao.some((p) => {
      const pInicio = parseDateTime(p.data_inicio, p.inicio);
      const pFim = parseDateTime(p.data_fim, p.fim);
      const inicioPausa = parseDateTime(pausaDataInicio, pausaInicio);
      const fimPausa = parseDateTime(pausaDataFim, pausaFim);
      if (!pInicio || !pFim || !inicioPausa || !fimPausa) return false;
      return !(fimPausa <= pInicio || inicioPausa >= pFim);
    });

    if (intersectsExisting) {
      toast({
        title: 'Pausa sobreposta',
        description: 'Já existe uma pausa neste intervalo de horário.',
        variant: 'destructive',
      });
      return;
    }

    setPausasExecucao((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        data_inicio: pausaDataInicio,
        inicio: pausaInicio,
        data_fim: pausaDataFim,
        fim: pausaFim,
        motivo: pausaMotivo || 'Intervalo',
      },
    ]);

    setTeveIntervalos(true);
    setPausaDataInicio(formData.dataInicio || new Date().toISOString().slice(0, 10));
    setPausaInicio('');
    setPausaDataFim(formData.dataFim || new Date().toISOString().slice(0, 10));
    setPausaFim('');
    setPausaMotivo('Intervalo');
  };

  const handleRemovePausa = (id: string) => {
    setPausasExecucao((prev) => prev.filter((p) => p.id !== id));
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const custoMateriais = materiaisUsados.reduce((total, item) => {
    return total + (item.quantidade * item.material.custo_unitario);
  }, 0);

  const duracaoBruta = calculateDuration();
  const minutosPausas = calculatePauseMinutes();
  const duracaoLiquida = calculateNetDuration();
  const custoMaoObraEstimado = selectedMecanico?.custo_hora
    ? ((duracaoLiquida || 0) / 60) * Number(selectedMecanico.custo_hora)
    : 0;
  const custoTerceirosValor = formData.custoTerceiros ? Number.parseFloat(formData.custoTerceiros) || 0 : 0;
  const custoTotalEstimado = custoMaoObraEstimado + custoMateriais + custoTerceirosValor;
  const servicoValido = formData.servicoExecutado.trim().length >= servicoMinLength;
  const janelaExecucaoPreenchida = Boolean(formData.dataInicio && formData.horaInicio && formData.dataFim && formData.horaFim);
  const janelaExecucaoValida = !janelaExecucaoPreenchida || Boolean(duracaoBruta);

  // Validação data/hora futura
  const dataFimFutura = (() => {
    if (!janelaExecucaoPreenchida) return false;
    const fim = parseDateTime(formData.dataFim, formData.horaFim);
    return fim ? fim > new Date() : false;
  })();
  const bloquearFuturo = processoConfig?.bloquear_fechamento_futuro !== false;
  const dataFimBloqueada = bloquearFuturo && dataFimFutura;

  const canSubmit = Boolean(
    selectedOS &&
      janelaExecucaoPreenchida &&
      janelaExecucaoValida &&
      !dataFimBloqueada &&
      servicoValido &&
      checklistNokSemJustificativa.length === 0,
  );
  const checklist: Array<{ label: string; ok: boolean; optional?: boolean }> = [
    { label: 'Mecânico selecionado', ok: Boolean(formData.mecanicoId), optional: true },
    { label: 'Horário de execução válido', ok: janelaExecucaoPreenchida && janelaExecucaoValida },
    ...(bloquearFuturo ? [{ label: 'Data/hora de fim não é futura', ok: !dataFimFutura }] : []),
    { label: `Serviço com mínimo de ${servicoMinLength} caracteres`, ok: servicoValido },
    ...(hasPlanoChecklist ? [{ label: 'Itens obrigatórios do checklist técnico respondidos', ok: checklistNokSemJustificativa.length === 0 }] : []),
  ];
  const requiredChecklist = checklist.filter((item) => !item.optional);
  const progressoChecklist = requiredChecklist.length > 0 ? Math.round((requiredChecklist.filter((item) => item.ok).length / requiredChecklist.length) * 100) : 0;

  const handleAddMaterial = () => {
    if (!materialSelecionado || !quantidadeMaterial) return;
    
    const material = materiaisDisponiveis?.find(m => m.id === materialSelecionado);
    if (!material) return;

    const quantidade = parseFloat(quantidadeMaterial);
    if (quantidade <= 0) return;

    // Check if material already added
    const existingIndex = materiaisUsados.findIndex(m => m.material.id === material.id);
    if (existingIndex >= 0) {
      const updated = [...materiaisUsados];
      updated[existingIndex].quantidade += quantidade;
      setMateriaisUsados(updated);
    } else {
      setMateriaisUsados([...materiaisUsados, { material, quantidade }]);
    }

    setMaterialSelecionado('');
    setQuantidadeMaterial('');
  };

  const handleRemoveMaterial = (index: number) => {
    setMateriaisUsados(materiaisUsados.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;
    
    setIsSubmitting(true);

    try {
      const mecanicoNome = selectedMecanico?.nome || 'Não informado';
      const tempoExecucaoBruto = calculateDuration() || 0;
      const tempoPausas = calculatePauseMinutes();
      const tempoExecucao = Math.max(0, tempoExecucaoBruto - tempoPausas);
      const custoMaoObra = selectedMecanico?.custo_hora 
        ? (tempoExecucao / 60) * Number(selectedMecanico.custo_hora) 
        : 0;
      const custoTerceiros = formData.custoTerceiros ? parseFloat(formData.custoTerceiros) : 0;
      const custoTotal = custoMaoObra + custoMateriais + custoTerceiros;

      const pausaResumo = pausasExecucao
        .map((p) => `${p.inicio}-${p.fim} (${p.motivo})`)
        .join(', ');

      const servicoExecutadoComPausas = pausaResumo
        ? `${formData.servicoExecutado}\n\n[Pausas apontadas] ${pausaResumo}. Total pausas: ${tempoPausas} min. Tempo bruto: ${tempoExecucaoBruto} min. Tempo liquido: ${tempoExecucao} min.`
        : formData.servicoExecutado;

      try {
        await closeOSAtomicMutation.mutateAsync({
          os_id: selectedOS.id,
          mecanico_id: formData.mecanicoId || null,
          mecanico_nome: mecanicoNome,
          data_inicio: formData.dataInicio,
          hora_inicio: formData.horaInicio,
          data_fim: formData.dataFim,
          hora_fim: formData.horaFim,
          tempo_execucao: tempoExecucaoBruto,
          servico_executado: servicoExecutadoComPausas,
          custo_mao_obra: custoMaoObra,
          custo_materiais: custoMateriais,
          custo_terceiros: custoTerceiros,
          custo_total: custoTotal,
          materiais: materiaisUsados.map((item) => ({
            material_id: item.material.id,
            quantidade: item.quantidade,
            custo_unitario: item.material.custo_unitario,
            custo_total: item.quantidade * item.material.custo_unitario,
          })),
          pausas: pausasExecucao.map((p) => ({
            data_inicio: p.data_inicio,
            inicio: p.inicio,
            data_fim: p.data_fim,
            fim: p.fim,
            motivo: p.motivo,
          })),
          usuario_fechamento: user?.id || null,
        });
      } catch (atomicError: any) {
        logger.warn('atomic_close_fallback', { error: String(atomicError) });

        // Backward compatibility fallback when migration is not applied yet.
        // Build full ISO timestamps: hora_inicio/hora_fim are TIMESTAMPTZ since migration 20260404060000
        const fallbackHoraInicio = `${formData.dataInicio}T${formData.horaInicio || '08:00'}:00`;
        const fallbackHoraFim = `${formData.dataFim}T${formData.horaFim || '17:00'}:00`;
        await createExecucaoMutation.mutateAsync({
          os_id: selectedOS.id,
          mecanico_id: formData.mecanicoId || null,
          mecanico_nome: mecanicoNome,
          data_inicio: formData.dataInicio,
          hora_inicio: fallbackHoraInicio,
          data_fim: formData.dataFim,
          hora_fim: fallbackHoraFim,
          tempo_execucao: tempoExecucao,
          tempo_execucao_bruto: tempoExecucaoBruto,
          tempo_pausas: tempoPausas,
          tempo_execucao_liquido: tempoExecucao,
          servico_executado: servicoExecutadoComPausas,
          custo_mao_obra: custoMaoObra,
          custo_materiais: custoMateriais,
          custo_terceiros: custoTerceiros,
          custo_total: custoTotal,
        });

        for (const item of materiaisUsados) {
          await addMaterialOSMutation.mutateAsync({
            os_id: selectedOS.id,
            material_id: item.material.id,
            quantidade: item.quantidade,
            custo_unitario: item.material.custo_unitario,
          });
        }

        await updateWithColumnFallback(
          async (payload) =>
            supabase
              .from('ordens_servico')
              .update(payload)
              .eq('id', selectedOS.id)
              .eq('empresa_id', tenantId!)
              .select()
              .single()
              .then((r) => r),
          {
            status: 'FECHADA',
            data_fechamento: new Date().toISOString(),
            usuario_fechamento: user?.id || null,
          },
        );

        toast({
          title: 'Fechamento concluído com fallback',
          description: 'O modo atômico falhou e o sistema finalizou usando o fluxo de compatibilidade.',
          variant: 'default',
        });
      }

      await log('FECHAR_OS', `Fechamento da O.S ${selectedOS.numero_os} - Custo total: ${formatCurrency(custoTotal)} - Tempo bruto: ${tempoExecucaoBruto} min - Pausas: ${tempoPausas} min - Tempo líquido: ${tempoExecucao} min`, selectedOS.tag);

      // Upload de anexos (não-bloqueante)
      if (anexosPendentes.length > 0) {
        let uploadFails = 0;
        for (const file of anexosPendentes) {
          try {
            await uploadAnexoMutation.mutateAsync({ osId: selectedOS.id, file });
          } catch {
            uploadFails++;
          }
        }
        if (uploadFails > 0) {
          toast({
            title: 'Aviso: Anexos',
            description: `${uploadFails} de ${anexosPendentes.length} arquivo(s) não foram enviados. Você pode anexá-los depois.`,
            variant: 'default',
          });
        }
        setAnexosPendentes([]);
      }

      toast({
        title: 'O.S Fechada com Sucesso!',
        description: `Ordem de Serviço nº ${selectedOS.numero_os} foi encerrada.`,
      });

      clearFecharOSDraft();
      navigate('/os/historico');
    } catch (error: any) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : typeof error?.message === 'string'
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Falha inesperada ao concluir fechamento.';
      logger.error('fechar_os_failed', { error: errorMsg, raw: String(error) });
      toast({
        title: 'Erro ao fechar O.S',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOS = (os: OrdemServicoRow) => {
    setSelectedOS(os);
    setActiveTab('execucao');
    setFormData({
      mecanicoId: '',
      dataInicio: new Date().toISOString().slice(0, 10),
      horaInicio: '',
      dataFim: new Date().toISOString().slice(0, 10),
      horaFim: '',
      servicoExecutado: '',
      custoTerceiros: '',
    });
    setMateriaisUsados([]);
    setPausasExecucao([]);
    setTeveIntervalos(false);
    setAnexosPendentes([]);
    setPausaDataInicio(new Date().toISOString().slice(0, 10));
    setPausaInicio('');
    setPausaDataFim(new Date().toISOString().slice(0, 10));
    setPausaFim('');
    setPausaMotivo('Intervalo');
  };

  const isLoading = loadingOS || loadingMecanicos;

  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const osId = searchParams.get('osId');
    const mecanicoId = searchParams.get('mecanicoId');
    if (!osId || !pendingOS || pendingOS.length === 0) return;

    const os = pendingOS.find((item) => item.id === osId);
    if (!os) return;

    deepLinkAppliedRef.current = true;
    handleSelectOS(os);
    if (mecanicoId) {
      setFormData((prev) => ({ ...prev, mecanicoId }));
    }
  }, [searchParams, pendingOS]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-4 pb-8">
      {/* Header */}
      <div className="module-page-header flex items-start gap-4">
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fechamento de Ordem de Serviço</h1>
          <p className="text-muted-foreground text-sm">Registre execução e custos para concluir a O.S com rastreabilidade.</p>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        {/* LEFT PANEL — Lista de O.S Pendentes */}
        <div className="bg-card border border-border rounded-lg overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                O.S Pendentes
              </h2>
              <Badge variant="secondary" className="text-xs">{filteredPendingOS.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nº, TAG, equipamento..."
                value={searchOS}
                onChange={(e) => setSearchOS(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <div className="overflow-y-auto xl:max-h-[calc(100vh-12rem)] p-2 space-y-1.5">
            {filteredPendingOS.length === 0 ? (
              <div className="py-10 text-center">
                <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {pendingOS && pendingOS.length > 0 ? 'Nenhuma O.S encontrada para o filtro.' : 'Não há ordens de serviço pendentes.'}
                </p>
              </div>
            ) : (
              filteredPendingOS.map((os) => {
                const diasAberto = getDiasAberto(os);
                const isSelected = selectedOS?.id === os.id;
                return (
                  <button
                    key={os.id}
                    type="button"
                    onClick={() => handleSelectOS(os)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/60 hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm truncate">{os.numero_os}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <OSTypeBadge tipo={normalizeOSType(os.tipo)} />
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-xs text-primary font-medium">{os.tag}</span>
                      <OSStatusBadge status={normalizeOSStatus(os.status)} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{os.equipamento}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{os.problema}</p>
                    {diasAberto != null && diasAberto > 0 && (
                      <p className={`text-xs mt-1 ${diasAberto > 7 ? 'text-destructive' : diasAberto > 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        há {diasAberto} {diasAberto === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Formulário de Fechamento ou Placeholder */}
        {!selectedOS ? (
          <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-20 px-6 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">Selecione uma O.S pendente</h2>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              Escolha uma ordem de serviço na lista ao lado para iniciar o processo de fechamento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Card Info da O.S Selecionada */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Fechamento — {selectedOS.numero_os}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <Label className="text-xs text-muted-foreground">O.S</Label>
                  <p className="font-mono font-bold">{selectedOS.numero_os}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">TAG</Label>
                  <p className="font-mono text-primary font-medium">{selectedOS.tag}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Equipamento</Label>
                  <p className="text-sm truncate">{selectedOS.equipamento}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Progresso</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progressoChecklist}%` }} />
                    </div>
                    <span className="font-mono font-medium text-sm">{progressoChecklist}%</span>
                  </div>
                </div>
              </div>

              {/* Problema Apresentado */}
              {selectedOS.problema && (
                <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Problema Apresentado</Label>
                  <p className="mt-1 text-sm">{selectedOS.problema}</p>
                </div>
              )}

              {/* Origem: Programação de Manutenção */}
              {(selectedOS as Record<string, unknown>).maintenance_schedule_id && (
                <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Origem: Programação de Manutenção</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ao fechar esta O.S., o ciclo de manutenção será atualizado automaticamente (agenda, execução e próxima data).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Form Tabs */}
            <div className="bg-card border border-border rounded-lg p-4 md:p-6">
              <form id="close-os-form" onSubmit={handleSubmit} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className={`grid w-full ${hasPlanoChecklist ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <TabsTrigger value="execucao" className="gap-2"><Wrench className="h-4 w-4" />Execução</TabsTrigger>
                    <TabsTrigger value="materiais" className="gap-2"><Package className="h-4 w-4" />Materiais</TabsTrigger>
                    {hasPlanoChecklist && (
                      <TabsTrigger value="checklist-tecnico" className="gap-2">
                        <ClipboardList className="h-4 w-4" />Checklist
                        {checklistNokSemJustificativa.length > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-red-600 bg-red-100 rounded-full">!</span>
                        )}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="execucao" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mecanico">Mecânico (opcional)</Label>
                        <Select
                          value={formData.mecanicoId}
                          onValueChange={(value) => setFormData({ ...formData, mecanicoId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {mecanicos?.map((mec) => (
                              <SelectItem key={mec.id} value={mec.id}>
                                {mec.nome} ({mec.tipo === 'PROPRIO' ? 'Próprio' : mec.tipo === 'INTERNO' ? 'Interno' : 'Terceirizado'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dataInicio">Data Início *</Label>
                        <Input
                          id="dataInicio"
                          type="date"
                          value={formData.dataInicio}
                          onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="horaInicio">Hora Início *</Label>
                        <Input
                          id="horaInicio"
                          type="time"
                          value={formData.horaInicio}
                          onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dataFim">Data Fim *</Label>
                        <Input
                          id="dataFim"
                          type="date"
                          value={formData.dataFim}
                          onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="horaFim">Hora Fim *</Label>
                        <Input
                          id="horaFim"
                          type="time"
                          value={formData.horaFim}
                          onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                          required
                        />
                        {dataFimBloqueada && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Data/hora de fim não pode ser futura
                          </p>
                        )}
                      </div>
                    </div>

                    {janelaExecucaoPreenchida && !janelaExecucaoValida && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        Horário inválido: a data/hora final precisa ser maior que a inicial.
                      </div>
                    )}

                    {duracaoBruta && (
                      <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-sm flex flex-wrap gap-4">
                        <span>Bruto: <strong>{formatDuration(duracaoBruta)}</strong></span>
                        <span>Pausas: <strong>{formatDuration(minutosPausas) || '0min'}</strong></span>
                        <span>Líquido: <strong>{formatDuration(duracaoLiquida) || '0min'}</strong></span>
                      </div>
                    )}

                    <div className="space-y-4 border-t pt-5">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <Label className="text-base font-semibold">Pausas durante a execução</Label>
                      </div>

                      <div className="rounded-lg border border-border/60 p-3 bg-background/50">
                        <p className="text-sm text-muted-foreground mb-3">Houve intervalos?</p>
                        <div className="flex gap-2">
                          <Button type="button" variant={teveIntervalos ? 'default' : 'outline'} onClick={() => setTeveIntervalos(true)}>Sim</Button>
                          <Button
                            type="button"
                            variant={!teveIntervalos ? 'default' : 'outline'}
                            onClick={() => {
                              setTeveIntervalos(false);
                              setPausasExecucao([]);
                            }}
                          >
                            Não
                          </Button>
                        </div>
                      </div>

                      {teveIntervalos && (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-lg border border-border/60 p-3 bg-background/50">
                          <Input type="date" value={pausaDataInicio} onChange={(e) => setPausaDataInicio(e.target.value)} />
                          <Input type="time" value={pausaInicio} onChange={(e) => setPausaInicio(e.target.value)} placeholder="Início pausa" />
                          <Input type="date" value={pausaDataFim} onChange={(e) => setPausaDataFim(e.target.value)} />
                          <Input type="time" value={pausaFim} onChange={(e) => setPausaFim(e.target.value)} placeholder="Fim pausa" />
                          <Input value={pausaMotivo} onChange={(e) => setPausaMotivo(e.target.value)} placeholder="Motivo (ex.: almoço)" />
                          <Button type="button" variant="outline" onClick={handleAddPausa} disabled={!pausaInicio || !pausaFim}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar pausa
                          </Button>
                        </div>
                      )}

                      {pausasExecucao.length > 0 && (
                        <div className="space-y-2">
                          {pausasExecucao.map((pausa) => (
                            <div key={pausa.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border border-border/50">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{pausa.data_inicio} {pausa.inicio} - {pausa.data_fim} {pausa.fim}</Badge>
                                <span className="text-sm text-muted-foreground">{pausa.motivo}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemovePausa(pausa.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-background/50">
                      <Label htmlFor="servico">Serviço Executado *</Label>
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700">
                        <p className="font-semibold">Descreva passo a passo e estado final do equipamento.</p>
                      </div>
                      <Textarea
                        id="servico"
                        value={formData.servicoExecutado}
                        onChange={(e) => setFormData({ ...formData, servicoExecutado: e.target.value })}
                        placeholder="Descreva tecnicamente ações realizadas, ajustes, testes e resultado final."
                        rows={4}
                        required
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={servicoValido ? 'text-success' : 'text-muted-foreground'}>
                          Mínimo recomendado: {servicoMinLength} caracteres
                        </span>
                        <span className={servicoValido ? 'text-success' : 'text-warning'}>
                          {formData.servicoExecutado.trim().length}/{servicoMinLength}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="materiais" className="space-y-6 mt-6">
                    <div className="space-y-4 border-t pt-5">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <Label className="text-base font-semibold">Materiais Utilizados</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-border/60 p-3 bg-background/50">
                        <div className="md:col-span-1">
                          <Select
                            value={materialSelecionado}
                            onValueChange={setMaterialSelecionado}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione material" />
                            </SelectTrigger>
                            <SelectContent>
                              {materiaisDisponiveis?.filter(m => m.estoque_atual > 0).map((mat) => (
                                <SelectItem key={mat.id} value={mat.id}>
                                  {mat.codigo} - {mat.nome} (Est: {mat.estoque_atual})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={quantidadeMaterial}
                            onChange={(e) => setQuantidadeMaterial(e.target.value)}
                            placeholder="Quantidade"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddMaterial}
                          disabled={!materialSelecionado || !quantidadeMaterial}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      {materiaisUsados.length > 0 && (
                        <div className="space-y-2">
                          {materiaisUsados.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border border-border/50">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">{item.material.codigo}</Badge>
                                <span className="text-sm">{item.material.nome}</span>
                                <span className="text-muted-foreground">x {item.quantidade} {item.material.unidade}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-medium">
                                  {formatCurrency(item.quantidade * item.material.custo_unitario)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMaterial(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-background/50">
                      <Label htmlFor="custoTerceiros">Custo Terceiros (R$)</Label>
                      <Input
                        id="custoTerceiros"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.custoTerceiros}
                        onChange={(e) => setFormData({ ...formData, custoTerceiros: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </TabsContent>

                  {/* ── Tab Checklist Técnico (condicional) ── */}
                  {hasPlanoChecklist && scheduledContext && (
                    <TabsContent value="checklist-tecnico" className="space-y-4 mt-6">
                      <div className="px-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ClipboardList className="h-5 w-5 text-blue-500" />
                          <h3 className="font-semibold text-sm">
                            Checklist Técnico — {scheduledContext.plano_codigo}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          {scheduledContext.plano_nome} • {scheduledContext.tipo === 'preventiva' ? 'Preventiva' : 'Lubrificação'}
                        </p>

                        {(() => {
                          const total = scheduledContext.checklist.length;
                          const respondidos = checklistRespostas.filter(r => r.resultado === 'OK' || r.resultado === 'NA').length;
                          const pct = total > 0 ? Math.round((respondidos / total) * 100) : 0;
                          return (
                            <div className="flex items-center gap-2 mb-4">
                              <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono font-medium text-xs">{respondidos}/{total}</span>
                            </div>
                          );
                        })()}

                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border">
                                <th className="text-left px-3 py-2 font-medium">Item</th>
                                <th className="w-16 text-center px-1 py-2 font-medium text-green-600">OK</th>
                                <th className="w-16 text-center px-1 py-2 font-medium text-red-600">NOK</th>
                                <th className="w-16 text-center px-1 py-2 font-medium text-muted-foreground">N/A</th>
                                <th className="w-40 text-left px-3 py-2 font-medium">Obs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scheduledContext.checklist.map((item, idx) => {
                                const resp = checklistRespostas.find(r => r.item_id === item.id);
                                const resultado = resp?.resultado ?? 'OK';
                                const isNokSemObs = item.obrigatorio && resultado === 'NOK' && !resp?.observacao?.trim();
                                return (
                                  <tr
                                    key={item.id}
                                    className={`border-b border-border/50 last:border-0 ${isNokSemObs ? 'bg-red-500/5' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                  >
                                    <td className="px-3 py-2">
                                      <span>{item.descricao}</span>
                                      {item.obrigatorio && <span className="ml-1 text-red-500 text-xs font-bold">*</span>}
                                    </td>
                                    <td className="text-center px-1 py-2">
                                      <input type="radio" name={`check-${item.id}`} checked={resultado === 'OK'} onChange={() => updateChecklistResposta(item.id, 'resultado', 'OK')} className="accent-green-600 w-4 h-4" />
                                    </td>
                                    <td className="text-center px-1 py-2">
                                      <input type="radio" name={`check-${item.id}`} checked={resultado === 'NOK'} onChange={() => updateChecklistResposta(item.id, 'resultado', 'NOK')} className="accent-red-600 w-4 h-4" />
                                    </td>
                                    <td className="text-center px-1 py-2">
                                      <input type="radio" name={`check-${item.id}`} checked={resultado === 'NA'} onChange={() => updateChecklistResposta(item.id, 'resultado', 'NA')} className="accent-gray-500 w-4 h-4" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="text" value={resp?.observacao ?? ''} onChange={(e) => updateChecklistResposta(item.id, 'observacao', e.target.value)} placeholder={isNokSemObs ? 'Justificativa obrigatória' : ''} className={`w-full text-xs px-2 py-1 rounded border ${isNokSemObs ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-border bg-background'}`} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {checklistNokSemJustificativa.length > 0 && (
                          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {checklistNokSemJustificativa.length} item(ns) obrigatório(s) marcado(s) como NOK sem justificativa.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  )}

                </Tabs>

                {/* Upload de Anexos (Preventiva / Preditiva / Inspeção) */}
                {selectedOS.tipo && ['PREVENTIVA', 'PREDITIVA', 'INSPECAO', 'LUBRIFICACAO'].includes(selectedOS.tipo.toUpperCase()) && (
                  <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-background/50">
                    <Label className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Anexos (fotos, laudos, relatórios)
                    </Label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAnexosPendentes((prev) => [...prev, ...Array.from(e.target.files!)]);
                          e.target.value = '';
                        }
                      }}
                    />
                    {anexosPendentes.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {anexosPendentes.map((file, idx) => (
                          <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                            <span className="flex items-center gap-1.5 truncate">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setAnexosPendentes((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="p-3 bg-muted/40 rounded-lg text-sm border border-border/50">
                  <span className="text-muted-foreground">Usuário de fechamento: </span>
                  <span className="font-medium">{user?.nome}</span>
                </div>
              </form>
            </div>

            {/* Resumo e Validação — inline no painel direito */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo e Validação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Tempo bruto</p>
                    <p className="font-mono font-bold">{formatDuration(duracaoBruta) || '-'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Pausas</p>
                    <p className="font-mono font-bold">{formatDuration(minutosPausas) || '0min'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Tempo líquido</p>
                    <p className="font-mono font-bold">{formatDuration(duracaoLiquida) || '-'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Mão de obra</p>
                    <p className="font-mono font-bold">{formatCurrency(custoMaoObraEstimado)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Materiais</p>
                    <p className="font-mono font-bold">{formatCurrency(custoMateriais)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Terceiros</p>
                    <p className="font-mono font-bold">{formatCurrency(custoTerceirosValor)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <span className="font-semibold">Total estimado</span>
                  <span className="font-mono font-bold text-lg text-primary">{formatCurrency(custoTotalEstimado)}</span>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground font-medium">Checklist de validação</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progressoChecklist}%` }} />
                  </div>
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      {item.ok ? <Check className="h-4 w-4 text-success" /> : item.optional ? <span className="h-4 w-4 text-muted-foreground text-xs text-center">—</span> : <AlertTriangle className="h-4 w-4 text-warning" />}
                      <span>{item.label}{item.optional ? ' (opcional)' : ''}</span>
                    </div>
                  ))}
                </div>

                <Button
                  type="submit"
                  form="close-os-form"
                  className="w-full gap-2 h-11 mt-2"
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fechando...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      Fechar O.S
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
