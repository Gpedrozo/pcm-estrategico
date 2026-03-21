import { useState, useRef } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useUpdateSolicitacao, type SolicitacaoRow } from '@/hooks/useSolicitacoes';
import { resolvePrioridadeFromClassificacao, useTenantPadronizacoes } from '@/hooks/useTenantPadronizacoes';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, Loader2, Printer, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OSPrintTemplate } from '@/components/os/OSPrintTemplate';

type TipoOS = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA' | 'INSPECAO' | 'MELHORIA';

export default function NovaOS() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { log } = useLogAuditoria();
  const printRef = useRef<HTMLDivElement>(null);
  
  const { data: equipamentos, isLoading: loadingEquipamentos } = useEquipamentos();
  const { data: mecanicosAtivos } = useMecanicosAtivos();
  const { data: padronizacoes } = useTenantPadronizacoes();
  const { data: empresa } = useDadosEmpresa();
  const createOSMutation = useCreateOrdemServico();
  const updateSolicitacaoMutation = useUpdateSolicitacao();

  const prioridadesOS = padronizacoes?.prioridades_os?.length
    ? padronizacoes.prioridades_os
    : ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'];

  const solicitacaoOrigem = (location.state as { solicitacao?: SolicitacaoRow } | null)?.solicitacao ?? null;
  
  const [formData, setFormData] = useState({
    tag: '',
    solicitante: '',
    problema: '',
    tipo: '' as TipoOS | '',
    prioridade: 'MEDIA' as string,
    tempoEstimado: '',
    mecanicoResponsavelId: '',
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
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('MANUTENÇÃO INDUSTRIAL');

  useEffect(() => {
    if (!solicitacaoOrigem) {
      return;
    }

    if (solicitacaoOrigem.status !== 'APROVADA') {
      navigate('/solicitacoes', { replace: true });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tag: solicitacaoOrigem.tag || prev.tag,
      solicitante: solicitacaoOrigem.solicitante_nome || prev.solicitante,
      problema: solicitacaoOrigem.descricao_falha || prev.problema,
      prioridade: resolvePrioridadeFromClassificacao(solicitacaoOrigem.classificacao) || prev.prioridade,
      tipo: prev.tipo || 'CORRETIVA',
    }));
  }, [solicitacaoOrigem, navigate]);

  const selectedEquipamento = equipamentos?.find(eq => eq.tag === formData.tag);
  const selectedMecanico = mecanicosAtivos?.find((m) => m.id === formData.mecanicoResponsavelId);
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
      usuario_abertura: user?.id || null,
      mecanico_responsavel_id: formData.mecanicoResponsavelId || null,
      mecanico_responsavel_codigo: selectedMecanico?.codigo_acesso || null,
    });

    if (solicitacaoOrigem) {
      await updateSolicitacaoMutation.mutateAsync({
        id: solicitacaoOrigem.id,
        status: 'CONVERTIDA',
        os_id: result.id,
      });
    }

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
    <div className="max-w-5xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-info/10 p-5 md:p-7">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-info/20 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <Button variant="outline" size="icon" className="shrink-0 bg-background/70" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Emitir Ordem de Servico</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
              {solicitacaoOrigem
                ? `Conversao da solicitacao #${solicitacaoOrigem.numero_solicitacao} em O.S com preenchimento automatico.`
                : 'Preencha os dados operacionais para criar uma nova O.S com rastreabilidade completa.'}
            </p>
          </div>
        </div>
      </div>

      {solicitacaoOrigem && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-info">
          Solicitação vinculada: #{solicitacaoOrigem.numero_solicitacao} • TAG {solicitacaoOrigem.tag}. Ao salvar, a solicitação será marcada como CONVERTIDA automaticamente.
        </div>
      )}

      {/* Form Card */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-industrial">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-muted/70 to-muted/40 rounded-xl border border-border/60">
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
            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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

            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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
            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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

            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select 
                value={formData.prioridade} 
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prioridadesOS.map((prioridade) => (
                    <SelectItem key={prioridade} value={prioridade}>
                      {prioridade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requester */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
              <Label htmlFor="solicitante">Solicitante *</Label>
              <Input
                id="solicitante"
                value={formData.solicitante}
                onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                placeholder="Nome ou setor solicitante"
                required
              />
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
              <Label>Mecânico responsável (opcional)</Label>
              <Select
                value={formData.mecanicoResponsavelId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, mecanicoResponsavelId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar mecânico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não designar agora</SelectItem>
                  {(mecanicosAtivos || []).map((mecanico) => (
                    <SelectItem key={mecanico.id} value={mecanico.id}>
                      {mecanico.nome}{mecanico.codigo_acesso ? ` • ${mecanico.codigo_acesso}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Problem Description */}
          <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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
          <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-background/70">
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

          {/* User Info */}
          <div className="p-3 bg-muted/50 rounded-xl text-sm border border-border/60">
            <span className="text-muted-foreground">Usuário de abertura: </span>
            <span className="font-medium">{user?.nome}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button 
              type="submit" 
              className="flex-1 gap-2 h-11"
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
            <Button type="button" variant="outline" className="h-11" onClick={() => navigate(-1)}>
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
                    <OSPrintTemplate ref={printRef} os={createdOS} nomeEmpresa={nomeEmpresa} empresa={empresa} />
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
