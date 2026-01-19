import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, Loader2, Printer, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OSPrintTemplate } from '@/components/os/OSPrintTemplate';

type TipoOS = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';
type PrioridadeOS = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';

export default function NovaOS() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { log } = useLogAuditoria();
  const printRef = useRef<HTMLDivElement>(null);
  
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

  const [createdOS, setCreatedOS] = useState<{
    numero_os: number;
    data_solicitacao: string;
    tag: string;
    equipamento: string;
    problema: string;
    solicitante: string;
    tipo: string;
    prioridade: string;
    tempo_estimado?: number | null;
    custo_estimado?: number | null;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('MANUTENÇÃO INDUSTRIAL');

  const selectedEquipamento = equipamentos?.find(eq => eq.tag === formData.tag);
  const equipamentosAtivos = equipamentos?.filter(eq => eq.ativo) || [];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: createdOS ? `OS_${String(createdOS.numero_os).padStart(4, '0')}` : 'OS',
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

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
    
    // Show success modal with print option
    setCreatedOS({
      numero_os: result.numero_os,
      data_solicitacao: result.data_solicitacao,
      tag: formData.tag,
      equipamento: selectedEquipamento?.nome || '',
      problema: formData.problema,
      solicitante: formData.solicitante,
      tipo: formData.tipo,
      prioridade: formData.prioridade,
      tempo_estimado: formData.tempoEstimado ? parseInt(formData.tempoEstimado) : null,
      custo_estimado: formData.custoEstimado ? parseFloat(formData.custoEstimado) : null,
    });
    setShowSuccessModal(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
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

      {/* Success Modal with Print Option */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-6 w-6" />
              Ordem de Serviço Criada com Sucesso!
            </DialogTitle>
            <DialogDescription>
              O.S #{createdOS && String(createdOS.numero_os).padStart(4, '0')} foi criada. 
              Você pode imprimir para entregar ao mecânico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Config */}
            <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1 space-y-2">
                <Label htmlFor="empresa">Nome da Empresa (cabeçalho)</Label>
                <Input
                  id="empresa"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <Button onClick={() => handlePrint()} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>

            {/* Preview */}
            {createdOS && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
                  <Printer className="h-4 w-4" />
                  <span className="text-sm font-medium">Pré-visualização da Impressão</span>
                </div>
                <div className="overflow-auto max-h-[400px] bg-gray-100 p-4">
                  <div className="transform scale-[0.5] origin-top-left" style={{ width: '200%' }}>
                    <OSPrintTemplate ref={printRef} os={createdOS} nomeEmpresa={nomeEmpresa} />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handlePrint()} className="flex-1 gap-2">
                <Printer className="h-4 w-4" />
                Imprimir e Fechar
              </Button>
              <Button variant="outline" onClick={handleCloseSuccess}>
                Fechar sem Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
