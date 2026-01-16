import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useCreateExecucaoOS } from '@/hooks/useExecucoesOS';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, FileCheck, Loader2, Plus, Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { OSTypeBadge } from '@/components/os/OSTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface MaterialUsado {
  material: MaterialRow;
  quantidade: number;
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
  const addMaterialOSMutation = useAddMaterialOS();
  
  const [selectedOS, setSelectedOS] = useState<OrdemServicoRow | null>(null);
  const [formData, setFormData] = useState({
    mecanicoId: '',
    horaInicio: '',
    horaFim: '',
    servicoExecutado: '',
    custoTerceiros: '',
  });
  const [materiaisUsados, setMateriaisUsados] = useState<MaterialUsado[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMecanico = mecanicos?.find(m => m.id === formData.mecanicoId);

  const calculateDuration = () => {
    if (!formData.horaInicio || !formData.horaFim) return null;
    
    const [h1, m1] = formData.horaInicio.split(':').map(Number);
    const [h2, m2] = formData.horaFim.split(':').map(Number);
    
    const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutes <= 0) return null;

    return minutes;
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
      const tempoExecucao = calculateDuration() || 0;
      const custoMaoObra = selectedMecanico.custo_hora 
        ? (tempoExecucao / 60) * Number(selectedMecanico.custo_hora) 
        : 0;
      const custoTerceiros = formData.custoTerceiros ? parseFloat(formData.custoTerceiros) : 0;
      const custoTotal = custoMaoObra + custoMateriais + custoTerceiros;

      // Create execution record
      await createExecucaoMutation.mutateAsync({
        os_id: selectedOS.id,
        mecanico_id: formData.mecanicoId,
        mecanico_nome: selectedMecanico.nome,
        hora_inicio: formData.horaInicio,
        hora_fim: formData.horaFim,
        tempo_execucao: tempoExecucao,
        servico_executado: formData.servicoExecutado,
        custo_mao_obra: custoMaoObra,
        custo_materiais: custoMateriais,
        custo_terceiros: custoTerceiros,
        custo_total: custoTotal,
      });

      // Add materials used to OS
      for (const item of materiaisUsados) {
        await addMaterialOSMutation.mutateAsync({
          os_id: selectedOS.id,
          material_id: item.material.id,
          quantidade: item.quantidade,
          custo_unitario: item.material.custo_unitario,
          custo_total: item.quantidade * item.material.custo_unitario,
        });
      }

      // Update OS status to closed
      await updateOSMutation.mutateAsync({
        id: selectedOS.id,
        status: 'FECHADA',
        data_fechamento: new Date().toISOString(),
        usuario_fechamento: user?.id || null,
      });

      await log('FECHAR_OS', `Fechamento da O.S ${selectedOS.numero_os} - Custo total: ${formatCurrency(custoTotal)}`, selectedOS.tag);

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
    setFormData({
      mecanicoId: '',
      horaInicio: '',
      horaFim: '',
      servicoExecutado: '',
      custoTerceiros: '',
    });
    setMateriaisUsados([]);
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fechar Ordem de Serviço</h1>
          <p className="text-muted-foreground">Registre a execução, materiais usados e encerre a O.S</p>
        </div>
      </div>

      {/* Select OS */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-industrial">
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
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  selectedOS?.id === os.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-lg">{os.numero_os}</span>
                    <span className="font-mono text-primary font-medium">{os.tag}</span>
                    <OSTypeBadge tipo={os.tipo as any} />
                    <OSStatusBadge status={os.status as any} />
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
        <div className="bg-card border border-border rounded-lg p-6 shadow-industrial animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <FileCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Dados da Execução</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OS Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
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
                        {mec.nome} ({mec.tipo === 'PROPRIO' ? 'Próprio' : 'Terceirizado'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Tempo de execução: </span>
                  <span className="font-bold text-success">{formatDuration(calculateDuration())}</span>
                </div>
                {selectedMecanico?.custo_hora && (
                  <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">Custo mão de obra: </span>
                    <span className="font-bold text-info">
                      {formatCurrency((calculateDuration()! / 60) * Number(selectedMecanico.custo_hora))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Service Description */}
            <div className="space-y-2">
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
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Materiais Utilizados</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                  <div className="flex justify-end p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm text-muted-foreground mr-2">Total Materiais:</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(custoMateriais)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Other Costs */}
            <div className="space-y-2">
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
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-muted-foreground">Usuário de fechamento: </span>
              <span className="font-medium">{user?.nome}</span>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full gap-2"
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
