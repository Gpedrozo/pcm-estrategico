import { useState } from 'react';
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
import { usePendingOrdensServico, useUpdateOrdemServico, type OrdemServicoRow } from '@/hooks/useOrdensServico';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useMateriaisAtivos, useAddMaterialOS, type MaterialRow } from '@/hooks/useMateriais';
import { useCreateExecucaoOS, useCloseOSAtomic } from '@/hooks/useExecucoesOS';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const { log } = useLogAuditoria();

  const { data: pendingOS, isLoading: loadingOS } = usePendingOrdensServico();
  const { data: mecanicos, isLoading: loadingMecanicos } = useMecanicosAtivos();
  const { data: materiaisDisponiveis } = useMateriaisAtivos();
  const updateOSMutation = useUpdateOrdemServico();
  const createExecucaoMutation = useCreateExecucaoOS();
  const closeOSAtomicMutation = useCloseOSAtomic();
  const addMaterialOSMutation = useAddMaterialOS();
  
  const [selectedOS, setSelectedOS] = useState<OrdemServicoRow | null>(null);
  const [activeTab, setActiveTab] = useState('execucao');
  const [formData, setFormData] = useState({
    mecanicoId: '',
    dataInicio: new Date().toISOString().slice(0, 10),
    horaInicio: '',
    dataFim: new Date().toISOString().slice(0, 10),
    horaFim: '',
    servicoExecutado: '',
    custoTerceiros: '',
  });
  const [materiaisUsados, setMateriaisUsados] = useState<MaterialUsado[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState('');
  const [pausaInicio, setPausaInicio] = useState('');
  const [pausaDataInicio, setPausaDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [pausaFim, setPausaFim] = useState('');
  const [pausaDataFim, setPausaDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [pausaMotivo, setPausaMotivo] = useState('Intervalo');
  const [pausasExecucao, setPausasExecucao] = useState<PausaExecucao[]>([]);
  const [teveIntervalos, setTeveIntervalos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const servicoMinLength = 20;

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
  const canSubmit = Boolean(
    selectedOS &&
      formData.mecanicoId &&
      janelaExecucaoPreenchida &&
      janelaExecucaoValida &&
      servicoValido,
  );
  const checklist = [
    { label: 'Mecânico selecionado', ok: Boolean(formData.mecanicoId) },
    { label: 'Horário de execução válido', ok: janelaExecucaoPreenchida && janelaExecucaoValida },
    { label: `Serviço com mínimo de ${servicoMinLength} caracteres`, ok: servicoValido },
  ];
  const progressoChecklist = Math.round((checklist.filter((item) => item.ok).length / checklist.length) * 100);

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
    if (!selectedOS || !selectedMecanico) return;
    
    setIsSubmitting(true);

    try {
      const tempoExecucaoBruto = calculateDuration() || 0;
      const tempoPausas = calculatePauseMinutes();
      const tempoExecucao = Math.max(0, tempoExecucaoBruto - tempoPausas);
      const custoMaoObra = selectedMecanico.custo_hora 
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
          mecanico_nome: selectedMecanico.nome,
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
        await createExecucaoMutation.mutateAsync({
          os_id: selectedOS.id,
          mecanico_id: formData.mecanicoId,
          mecanico_nome: selectedMecanico.nome,
          data_inicio: formData.dataInicio,
          hora_inicio: formData.horaInicio,
          data_fim: formData.dataFim,
          hora_fim: formData.horaFim,
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
            custo_total: item.quantidade * item.material.custo_unitario,
          });
        }

        await updateOSMutation.mutateAsync({
          id: selectedOS.id,
          status: 'FECHADA',
          data_fechamento: new Date().toISOString(),
          usuario_fechamento: user?.id || null,
        });

        toast({
          title: 'Fechamento concluído com fallback',
          description: 'O modo atômico falhou e o sistema finalizou usando o fluxo de compatibilidade.',
          variant: 'default',
        });
      }

      await log('FECHAR_OS', `Fechamento da O.S ${selectedOS.numero_os} - Custo total: ${formatCurrency(custoTotal)} - Tempo bruto: ${tempoExecucaoBruto} min - Pausas: ${tempoPausas} min - Tempo líquido: ${tempoExecucao} min`, selectedOS.tag);

      toast({
        title: 'O.S Fechada com Sucesso!',
        description: `Ordem de Serviço nº ${selectedOS.numero_os} foi encerrada.`,
      });

      navigate('/os/historico');
    } catch (error) {
      logger.error('fechar_os_failed', { error: String(error) });
      toast({
        title: 'Erro ao fechar O.S',
        description: error instanceof Error ? error.message : 'Falha inesperada ao concluir fechamento.',
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
    setPausaDataInicio(new Date().toISOString().slice(0, 10));
    setPausaInicio('');
    setPausaDataFim(new Date().toISOString().slice(0, 10));
    setPausaFim('');
    setPausaMotivo('Intervalo');
  };

  const isLoading = loadingOS || loadingMecanicos;

  useEffect(() => {
    const osId = searchParams.get('osId');
    const mecanicoId = searchParams.get('mecanicoId');
    if (!osId || !pendingOS || pendingOS.length === 0) return;

    const os = pendingOS.find((item) => item.id === osId);
    if (!os) return;

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
    <div className="module-page max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="module-page-header flex items-start gap-4">
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fechamento de Ordem de Servico</h1>
          <p className="text-muted-foreground max-w-3xl">Registre execução e custos para concluir a O.S com rastreabilidade.</p>
        </div>
      </div>

      {/* Select OS */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <Label className="text-base font-semibold">Selecione a O.S para fechar</Label>
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
          {!pendingOS || pendingOS.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Não há ordens de serviço pendentes.
            </p>
          ) : (
            pendingOS.map((os) => (
              <button
                key={os.id}
                type="button"
                onClick={() => handleSelectOS(os)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedOS?.id === os.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold">{os.numero_os}</span>
                    <span className="font-mono text-primary font-medium">{os.tag}</span>
                    <OSTypeBadge tipo={normalizeOSType(os.tipo)} />
                    <OSStatusBadge status={normalizeOSStatus(os.status)} />
                  </div>
                  {selectedOS?.id === os.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {os.problema}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Execution Form */}
      {selectedOS && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="bg-card border border-border rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Fechamento Guiado da Execução</h2>
            </div>

            <form id="close-os-form" onSubmit={handleSubmit} className="space-y-6">
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
                  <p className="text-sm">{selectedOS.equipamento}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Progresso</Label>
                  <p className="font-medium">{progressoChecklist}%</p>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="execucao" className="gap-2"><Wrench className="h-4 w-4" />Execução</TabsTrigger>
                  <TabsTrigger value="materiais" className="gap-2"><Package className="h-4 w-4" />Materiais</TabsTrigger>
                </TabsList>

                <TabsContent value="execucao" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mecanico">Mecânico *</Label>
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

              </Tabs>

              <div className="p-3 bg-muted/40 rounded-lg text-sm border border-border/50">
                <span className="text-muted-foreground">Usuário de fechamento: </span>
                <span className="font-medium">{user?.nome}</span>
              </div>
            </form>
          </div>

          <div className="space-y-4 xl:sticky xl:top-24">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo e Validação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span>Tempo bruto</span><strong>{formatDuration(duracaoBruta) || '-'}</strong></div>
                <div className="flex items-center justify-between"><span>Pausas</span><strong>{formatDuration(minutosPausas) || '0min'}</strong></div>
                <div className="flex items-center justify-between"><span>Tempo líquido</span><strong>{formatDuration(duracaoLiquida) || '-'}</strong></div>
                <div className="flex items-center justify-between"><span>Mão de obra</span><strong>{formatCurrency(custoMaoObraEstimado)}</strong></div>
                <div className="flex items-center justify-between"><span>Materiais</span><strong>{formatCurrency(custoMateriais)}</strong></div>
                <div className="flex items-center justify-between"><span>Terceiros</span><strong>{formatCurrency(custoTerceirosValor)}</strong></div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-base"><span>Total estimado</span><strong className="text-primary">{formatCurrency(custoTotalEstimado)}</strong></div>

                <div className="h-px bg-border my-1" />
                <p className="text-xs text-muted-foreground">Checklist</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progressoChecklist}%` }} />
                </div>
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.ok ? <Check className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                    <span>{item.label}</span>
                  </div>
                ))}
                <Button
                  type="submit"
                  form="close-os-form"
                  className="w-full gap-2 h-11"
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
        </div>
      )}
    </div>
  );
}
