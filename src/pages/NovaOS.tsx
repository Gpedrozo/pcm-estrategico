import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useAuth } from '@/contexts/AuthContext';
import { FilePlus, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TipoOS = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';
type PrioridadeOS = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';

export default function NovaOS() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { log } = useLogAuditoria();
  
  const { data: equipamentos, isLoading: loadingEquipamentos } = useEquipamentos();
  const createOSMutation = useCreateOrdemServico();
  
  const [formData, setFormData] = useState({
    tag: '',
    solicitante: '',
    problema: '',
    tipo: '' as TipoOS | '',
    prioridade: 'MEDIA' as PrioridadeOS,
    tempoEstimado: '',
    custoEstimado: '',
  });

  const selectedEquipamento = equipamentos?.find(eq => eq.tag === formData.tag);
  const equipamentosAtivos = equipamentos?.filter(eq => eq.ativo) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tag || !formData.tipo || !formData.solicitante || !formData.problema) {
      return;
    }

    const result = await createOSMutation.mutateAsync({
      tag: formData.tag,
      equipamento: selectedEquipamento?.nome || '',
      tipo: formData.tipo,
      prioridade: formData.prioridade,
      solicitante: formData.solicitante,
      problema: formData.problema,
      tempo_estimado: formData.tempoEstimado ? parseInt(formData.tempoEstimado) : null,
      custo_estimado: formData.custoEstimado ? parseFloat(formData.custoEstimado) : null,
      usuario_abertura: user?.id || null,
    });

    await log('CRIAR_OS', `Criação da O.S ${result.numero_os}`, formData.tag);
    navigate('/os/historico');
  };

  if (loadingEquipamentos) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
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
          <h1 className="text-2xl font-bold text-foreground">Emitir Ordem de Serviço</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma nova O.S</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-industrial">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Nº da O.S</Label>
              <p className="text-2xl font-bold font-mono text-primary">(Auto)</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de Solicitação</Label>
              <p className="text-lg font-medium">
                {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* TAG and Equipment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tag">TAG do Equipamento *</Label>
              <Select 
                value={formData.tag} 
                onValueChange={(value) => setFormData({ ...formData, tag: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a TAG" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentosAtivos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.tag}>
                      {eq.tag} - {eq.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Input
                value={selectedEquipamento?.nome || ''}
                disabled
                className="bg-muted"
                placeholder="Selecione uma TAG"
              />
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Manutenção *</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoOS })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                  <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                  <SelectItem value="PREDITIVA">Preditiva</SelectItem>
                  <SelectItem value="INSPECAO">Inspeção</SelectItem>
                  <SelectItem value="MELHORIA">Melhoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select 
                value={formData.prioridade} 
                onValueChange={(value) => setFormData({ ...formData, prioridade: value as PrioridadeOS })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requester */}
          <div className="space-y-2">
            <Label htmlFor="solicitante">Solicitante *</Label>
            <Input
              id="solicitante"
              value={formData.solicitante}
              onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
              placeholder="Nome ou setor solicitante"
              required
            />
          </div>

          {/* Problem Description */}
          <div className="space-y-2">
            <Label htmlFor="problema">Problema Apresentado *</Label>
            <Textarea
              id="problema"
              value={formData.problema}
              onChange={(e) => setFormData({ ...formData, problema: e.target.value })}
              placeholder="Descreva detalhadamente o problema ou serviço a ser executado..."
              rows={4}
              required
            />
          </div>

          {/* Estimates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tempoEstimado">Tempo Estimado (min)</Label>
              <Input
                id="tempoEstimado"
                type="number"
                min="0"
                value={formData.tempoEstimado}
                onChange={(e) => setFormData({ ...formData, tempoEstimado: e.target.value })}
                placeholder="Ex: 120"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custoEstimado">Custo Estimado (R$)</Label>
              <Input
                id="custoEstimado"
                type="number"
                min="0"
                step="0.01"
                value={formData.custoEstimado}
                onChange={(e) => setFormData({ ...formData, custoEstimado: e.target.value })}
                placeholder="Ex: 500.00"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Usuário de abertura: </span>
            <span className="font-medium">{user?.nome}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button 
              type="submit" 
              className="flex-1 gap-2"
              disabled={createOSMutation.isPending || !formData.tag || !formData.tipo || !formData.solicitante || !formData.problema}
            >
              {createOSMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Salvar O.S
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
