import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  ClipboardCheck,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeOSStatus, normalizeOSType } from '@/lib/osBadges';

// Modo de Falha options
const MODOS_FALHA = [
  { value: 'DESGASTE', label: 'Desgaste' },
  { value: 'FADIGA', label: 'Fadiga' },
  { value: 'CORROSAO', label: 'Corrosão' },
  { value: 'SOBRECARGA', label: 'Sobrecarga' },
  { value: 'DESALINHAMENTO', label: 'Desalinhamento' },
  { value: 'LUBRIFICACAO_DEFICIENTE', label: 'Lubrificação Deficiente' },
  { value: 'CONTAMINACAO', label: 'Contaminação' },
  { value: 'ERRO_OPERACIONAL', label: 'Erro Operacional' },
  { value: 'FALTA_MANUTENCAO', label: 'Falta de Manutenção' },
  { value: 'DEFEITO_FABRICACAO', label: 'Defeito de Fabricação' },
  { value: 'OUTRO', label: 'Outro' },
];

// Causa Raiz options (6M - Ishikawa)
const CAUSAS_RAIZ = [
  { value: 'MAO_OBRA', label: 'Mão de Obra', description: 'Falha humana, treinamento' },
  { value: 'METODO', label: 'Método', description: 'Procedimento inadequado' },
  { value: 'MATERIAL', label: 'Material', description: 'Peça defeituosa, qualidade' },
  { value: 'MAQUINA', label: 'Máquina', description: 'Falha do equipamento' },
  { value: 'MEIO_AMBIENTE', label: 'Meio Ambiente', description: 'Condições externas' },
  { value: 'MEDICAO', label: 'Medição', description: 'Erro de instrumentação' },
];

interface MaterialUsado {
  material: MaterialRow;
  quantidade: number;
}

interface PausaExecucao {
  id: string;
  inicio: string;
  fim: string;
  motivo: string;
}

interface RCAFormData {
  modoFalha: string;
  causaRaiz: string;
  acaoCorretiva: string;
  licoesAprendidas: string;
  requireRCA: boolean;
}

export default function FecharOS() {
  const navigate = useNavigate();
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
    horaInicio: '',
    horaFim: '',
    servicoExecutado: '',
    custoTerceiros: '',
  });
  const [rcaData, setRcaData] = useState<RCAFormData>({
    modoFalha: '',
    causaRaiz: '',
    acaoCorretiva: '',
    licoesAprendidas: '',
    requireRCA: false,
  });
  const [materiaisUsados, setMateriaisUsados] = useState<MaterialUsado[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState('');
  const [pausaInicio, setPausaInicio] = useState('');
  const [pausaFim, setPausaFim] = useState('');
  const [pausaMotivo, setPausaMotivo] = useState('Intervalo');
  const [pausasExecucao, setPausasExecucao] = useState<PausaExecucao[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMecanico = mecanicos?.find(m => m.id === formData.mecanicoId);
  
  // Determine if RCA is required based on OS type
  const isCorretiva = selectedOS?.tipo === 'CORRETIVA';

  const calculateDuration = () => {
    if (!formData.horaInicio || !formData.horaFim) return null;
    
    const [h1, m1] = formData.horaInicio.split(':').map(Number);
    const [h2, m2] = formData.horaFim.split(':').map(Number);
    
    const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutes <= 0) return null;

    return minutes;
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calculatePauseMinutes = () => {
    const total = pausasExecucao.reduce((acc, pausa) => {
      const inicio = timeToMinutes(pausa.inicio);
      const fim = timeToMinutes(pausa.fim);
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
        return acc;
      }
      return acc + (fim - inicio);
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

    if (formData.horaInicio && formData.horaFim) {
      const inicioExec = timeToMinutes(formData.horaInicio);
      const fimExec = timeToMinutes(formData.horaFim);
      if (inicio < inicioExec || fim > fimExec) {
        toast({
          title: 'Pausa fora da execução',
          description: 'A pausa deve estar dentro do horário de início/fim da execução.',
          variant: 'destructive',
        });
        return;
      }
    }

    const intersectsExisting = pausasExecucao.some((p) => {
      const pInicio = timeToMinutes(p.inicio);
      const pFim = timeToMinutes(p.fim);
      return !(fim <= pInicio || inicio >= pFim);
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
        inicio: pausaInicio,
        fim: pausaFim,
        motivo: pausaMotivo || 'Intervalo',
      },
    ]);

    setPausaInicio('');
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
          hora_inicio: formData.horaInicio,
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
            inicio: p.inicio,
            fim: p.fim,
            motivo: p.motivo,
          })),
          usuario_fechamento: user?.id || null,
          modo_falha: rcaData.requireRCA && isCorretiva ? rcaData.modoFalha : null,
          causa_raiz: rcaData.requireRCA && isCorretiva ? rcaData.causaRaiz : null,
          acao_corretiva: rcaData.requireRCA && isCorretiva ? rcaData.acaoCorretiva : null,
          licoes_aprendidas: rcaData.requireRCA && isCorretiva ? rcaData.licoesAprendidas : null,
        });
      } catch (atomicError: any) {
        const message = String(atomicError?.message || '').toLowerCase();
        const functionMissing = message.includes('close_os_with_execution_atomic') && message.includes('does not exist');

        if (!functionMissing) {
          throw atomicError;
        }

        // Backward compatibility fallback when migration is not applied yet.
        await createExecucaoMutation.mutateAsync({
          os_id: selectedOS.id,
          mecanico_id: formData.mecanicoId,
          mecanico_nome: selectedMecanico.nome,
          hora_inicio: formData.horaInicio,
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
          modo_falha: rcaData.requireRCA && isCorretiva ? rcaData.modoFalha : null,
          causa_raiz: rcaData.requireRCA && isCorretiva ? rcaData.causaRaiz : null,
          acao_corretiva: rcaData.requireRCA && isCorretiva ? rcaData.acaoCorretiva : null,
          licoes_aprendidas: rcaData.requireRCA && isCorretiva ? rcaData.licoesAprendidas : null,
        });
      }

      await log('FECHAR_OS', `Fechamento da O.S ${selectedOS.numero_os} - Custo total: ${formatCurrency(custoTotal)} - Tempo bruto: ${tempoExecucaoBruto} min - Pausas: ${tempoPausas} min - Tempo líquido: ${tempoExecucao} min${rcaData.requireRCA ? ' (com RCA)' : ''}`, selectedOS.tag);

      toast({
        title: 'O.S Fechada com Sucesso!',
        description: `Ordem de Serviço nº ${selectedOS.numero_os} foi encerrada.`,
      });

      navigate('/os/historico');
    } catch (error) {
      console.error('Erro ao fechar O.S:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOS = (os: OrdemServicoRow) => {
    setSelectedOS(os);
    setActiveTab('execucao');
    setFormData({
      mecanicoId: '',
      horaInicio: '',
      horaFim: '',
      servicoExecutado: '',
      custoTerceiros: '',
    });
    setRcaData({
      modoFalha: '',
      causaRaiz: '',
      acaoCorretiva: '',
      licoesAprendidas: '',
      requireRCA: os.tipo === 'CORRETIVA',
    });
    setMateriaisUsados([]);
    setPausasExecucao([]);
    setPausaInicio('');
    setPausaFim('');
    setPausaMotivo('Intervalo');
  };

  const isLoading = loadingOS || loadingMecanicos;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-success/10 p-5 md:p-7">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-success/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <Button variant="outline" size="icon" className="shrink-0 bg-background/70" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Fechamento de Ordem de Servico</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-3xl">Consolide execucao, pausas, materiais e RCA para encerrar a O.S com rastreabilidade tecnica e custo apurado.</p>
          </div>
        </div>
      </div>

      {/* Select OS */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-industrial">
        <Label className="text-base font-semibold">Selecione a O.S para fechar</Label>
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
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
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  selectedOS?.id === os.id
                    ? 'border-primary bg-gradient-to-r from-primary/10 to-info/10'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-lg">{os.numero_os}</span>
                    <span className="font-mono text-primary font-medium">{os.tag}</span>
                    <OSTypeBadge tipo={normalizeOSType(os.tipo)} />
                    <OSStatusBadge status={normalizeOSStatus(os.status)} />
                  </div>
                  {selectedOS?.id === os.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                  {os.problema}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Execution Form */}
      {selectedOS && (
        <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-industrial animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <FileCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Dados da Execução</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OS Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-muted/70 to-muted/40 rounded-xl border border-border/60">
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
                <Label className="text-xs text-muted-foreground">Data Execução</Label>
                <p className="font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Mechanic and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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
                        {mec.nome} ({mec.tipo === 'PROPRIO' ? 'Próprio' : 'Terceirizado'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
                <Label htmlFor="horaInicio">Hora Início *</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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

            {/* Duration and Cost Display */}
            {calculateDuration() && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Tempo bruto: </span>
                  <span className="font-bold text-success">{formatDuration(calculateDuration())}</span>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Pausas: </span>
                  <span className="font-bold text-warning">{formatDuration(calculatePauseMinutes()) || '0min'}</span>
                </div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Tempo líquido: </span>
                  <span className="font-bold text-primary">{formatDuration(calculateNetDuration()) || '0min'}</span>
                </div>
                {selectedMecanico?.custo_hora && (
                  <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">Custo mão de obra: </span>
                    <span className="font-bold text-info">
                      {formatCurrency(((calculateNetDuration() || 0) / 60) * Number(selectedMecanico.custo_hora))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Breaks / Intervals */}
            <div className="space-y-4 border-t pt-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Pausas durante a execução</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-border/70 p-4 bg-background/70">
                <Input type="time" value={pausaInicio} onChange={(e) => setPausaInicio(e.target.value)} placeholder="Início pausa" />
                <Input type="time" value={pausaFim} onChange={(e) => setPausaFim(e.target.value)} placeholder="Fim pausa" />
                <Input value={pausaMotivo} onChange={(e) => setPausaMotivo(e.target.value)} placeholder="Motivo (ex.: almoço)" />
                <Button type="button" variant="outline" onClick={handleAddPausa} disabled={!pausaInicio || !pausaFim}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar pausa
                </Button>
              </div>

              {pausasExecucao.length > 0 && (
                <div className="space-y-2">
                  {pausasExecucao.map((pausa) => (
                    <div key={pausa.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/60">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pausa.inicio} - {pausa.fim}</Badge>
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

            {/* Service Description */}
            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
              <Label htmlFor="servico">Serviço Executado *</Label>
              <Textarea
                id="servico"
                value={formData.servicoExecutado}
                onChange={(e) => setFormData({ ...formData, servicoExecutado: e.target.value })}
                placeholder="Descreva o serviço executado..."
                rows={3}
                required
              />
            </div>

            {/* Materials Used Section */}
            <div className="space-y-4 border-t pt-5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Materiais Utilizados</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-border/70 p-4 bg-background/70">
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
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/60">
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
                  <div className="flex justify-end p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="text-sm text-muted-foreground mr-2">Total Materiais:</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(custoMateriais)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Other Costs */}
            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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

            {/* User Info */}
            <div className="p-3 bg-muted/50 rounded-xl text-sm border border-border/60">
              <span className="text-muted-foreground">Usuário de fechamento: </span>
              <span className="font-medium">{user?.nome}</span>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full gap-2 h-11"
              disabled={isSubmitting || !formData.mecanicoId || !formData.horaInicio || !formData.horaFim || !formData.servicoExecutado}
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
          </form>
        </div>
      )}
    </div>
  );
}
