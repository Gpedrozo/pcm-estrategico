import { useMemo, useRef, useState } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useMecanicosAtivos } from '@/hooks/useMecanicos';
import { useLogAuditoria } from '@/hooks/useAuditoria';
import { useSolicitacoesPendentes, useUpdateSolicitacao, type SolicitacaoRow } from '@/hooks/useSolicitacoes';
import { resolvePrioridadeFromClassificacao, useTenantPadronizacoes } from '@/hooks/useTenantPadronizacoes';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { useAuth } from '@/contexts/AuthContext';
import { useFormDraft, readDraft } from '@/hooks/useFormDraft';
import { ArrowLeft, Check, Loader2, Printer, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OSPrintTemplate } from '@/components/os/OSPrintTemplate';
import { useRecentOrdensServico } from '@/hooks/useOrdensServico';

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
  const { data: solicitacoesPendentes = [] } = useSolicitacoesPendentes();
  const createOSMutation = useCreateOrdemServico();
  const updateSolicitacaoMutation = useUpdateSolicitacao();
  const { data: recentOS = [] } = useRecentOrdensServico(10);

  const prioridadesOS = padronizacoes?.prioridades_os?.length
    ? padronizacoes.prioridades_os
    : ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'];

  const solicitacaoOrigem = (location.state as { solicitacao?: SolicitacaoRow } | null)?.solicitacao ?? null;
  const [solicitacaoVinculada, setSolicitacaoVinculada] = useState<SolicitacaoRow | null>(solicitacaoOrigem);

  // ── Synchronous draft restoration (zero-flash) ──
  const _novaOSDraft = readDraft<{
    formData: { tag: string; solicitante: string; problema: string; tipo: TipoOS | ''; prioridade: string; tempoEstimado: string; mecanicoResponsavelId: string };
    semTag: boolean;
    equipamentoManual: string;
  }>('draft:nova-os');

  const [formData, setFormData] = useState(_novaOSDraft?.formData || {
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
  const [showSolicitacoesModal, setShowSolicitacoesModal] = useState(false);
  const [dismissedTagWarnings, setDismissedTagWarnings] = useState<Record<string, boolean>>({});
  const [semTag, setSemTag] = useState(_novaOSDraft?.semTag || false);
  const [equipamentoManual, setEquipamentoManual] = useState(_novaOSDraft?.equipamentoManual || '');
  const [tagComboOpen, setTagComboOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [showCadastrarAtivoDialog, setShowCadastrarAtivoDialog] = useState(false);
  const problemaMinLength = 5;
  const problemaValido = formData.problema.trim().length >= problemaMinLength;

  const { clearDraft: clearNovaOSDraft } = useFormDraft(
    'draft:nova-os',
    { formData, semTag, equipamentoManual },
  );

  const solicitacoesAbertasDaTag = useMemo(() => {
    if (!formData.tag) return [];
    return solicitacoesPendentes.filter((ss) => ss.tag === formData.tag && !ss.os_id);
  }, [solicitacoesPendentes, formData.tag]);

  const solicitacaoAppliedRef = useRef(false);
  useEffect(() => {
    if (solicitacaoAppliedRef.current) return;
    setSolicitacaoVinculada(solicitacaoOrigem);
    if (!solicitacaoOrigem) return;

    if (solicitacaoOrigem.status !== 'APROVADA') {
      navigate('/solicitacoes', { replace: true });
      return;
    }

    solicitacaoAppliedRef.current = true;
    setFormData((prev) => ({
      ...prev,
      tag: solicitacaoOrigem.tag || prev.tag,
      solicitante: solicitacaoOrigem.solicitante_nome || prev.solicitante,
      problema: solicitacaoOrigem.descricao_falha || prev.problema,
      prioridade: resolvePrioridadeFromClassificacao(solicitacaoOrigem.classificacao) || prev.prioridade,
      tipo: prev.tipo || 'CORRETIVA',
    }));
  }, [solicitacaoOrigem, navigate]);

  useEffect(() => {
    if (!formData.tag) return;
    if (dismissedTagWarnings[formData.tag]) return;
    if (solicitacoesAbertasDaTag.length === 0) return;
    setShowSolicitacoesModal(true);
  }, [formData.tag, dismissedTagWarnings, solicitacoesAbertasDaTag]);

  const selectedEquipamento = equipamentos?.find(eq => eq.tag === formData.tag);
  const selectedMecanico = mecanicosAtivos?.find((m) => m.id === formData.mecanicoResponsavelId);
  const equipamentosAtivos = equipamentos?.filter(eq => eq.ativo) || [];

  const handleTagChange = (tag: string) => {
    setFormData((prev) => ({ ...prev, tag }));
  };

  const handleContinuarSemSS = () => {
    if (formData.tag) {
      setDismissedTagWarnings((prev) => ({ ...prev, [formData.tag]: true }));
    }
    setShowSolicitacoesModal(false);
  };

  const handleGerarAPartirDaSS = (ss: SolicitacaoRow) => {
    setSolicitacaoVinculada(ss);
    setFormData((prev) => ({
      ...prev,
      tag: ss.tag || prev.tag,
      solicitante: ss.solicitante_nome || prev.solicitante,
      problema: ss.descricao_falha || prev.problema,
      prioridade: resolvePrioridadeFromClassificacao(ss.classificacao) || prev.prioridade,
      tipo: prev.tipo || 'CORRETIVA',
    }));
    setDismissedTagWarnings((prev) => ({ ...prev, [ss.tag]: true }));
    setShowSolicitacoesModal(false);
  };

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
    
    const tagValue = semTag ? `SEM-TAG-${Date.now()}` : formData.tag;
    const equipamentoNome = semTag ? equipamentoManual : (selectedEquipamento?.nome || '');
    
    if ((!semTag && !formData.tag) || (semTag && !equipamentoManual.trim()) || !formData.tipo || !formData.solicitante || !problemaValido) {
      return;
    }

    const result = await createOSMutation.mutateAsync({
      tag: tagValue,
      equipamento: equipamentoNome,
      tipo: formData.tipo,
      prioridade: formData.prioridade,
      solicitante: formData.solicitante,
      problema: formData.problema,
      tempo_estimado: formData.tempoEstimado ? parseInt(formData.tempoEstimado) : null,
      usuario_abertura: user?.id || null,
      mecanico_responsavel_id: formData.mecanicoResponsavelId || null,
      mecanico_responsavel_codigo: selectedMecanico?.codigo_acesso || null,
    });

    if (solicitacaoVinculada) {
      await updateSolicitacaoMutation.mutateAsync({
        id: solicitacaoVinculada.id,
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
    clearNovaOSDraft();
    setFormData({
      tag: '',
      solicitante: '',
      problema: '',
      tipo: '' as TipoOS | '',
      prioridade: 'MEDIA',
      tempoEstimado: '',
      mecanicoResponsavelId: '',
    });
    setSemTag(false);
    setEquipamentoManual('');
    setTagSearch('');
    setSolicitacaoVinculada(null);
    setDismissedTagWarnings({});
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
    <div className="module-page max-w-7xl mx-auto space-y-3 pb-4">
      {/* Header */}
      <div className="module-page-header flex items-start gap-3">
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground">Emitir Ordem de Servico</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            {solicitacaoOrigem
              ? `Conversao da solicitacao #${solicitacaoOrigem.numero_solicitacao} em O.S com preenchimento automatico.`
              : 'Preencha os dados para criar uma nova O.S com rastreabilidade completa.'}
          </p>
        </div>
      </div>

      {solicitacaoVinculada && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-2.5 text-sm text-info">
          Solicitação vinculada: #{solicitacaoVinculada.numero_solicitacao} • TAG {solicitacaoVinculada.tag}. Ao salvar, a solicitação será marcada como CONVERTIDA automaticamente.
        </div>
      )}

      {formData.tag && solicitacoesAbertasDaTag.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900">
          <p className="font-semibold">Esta TAG possui {solicitacoesAbertasDaTag.length} solicitacao(oes) em aberto.</p>
          <p>Verifique antes de emitir uma nova Ordem de Servico.</p>
        </div>
      )}

      {/* Two-column layout: Form (left) + Recent OS (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4 items-start">
        {/* Form Card */}
        <div className="bg-card border border-border rounded-lg p-3 md:p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Date */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Nº da O.S</Label>
                <p className="text-xl font-bold font-mono text-primary">(Auto)</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Solicitação</Label>
                <p className="text-base font-medium">
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* TAG and Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tag">{semTag ? 'Descrição do Equipamento *' : 'TAG do Equipamento *'}</Label>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="sem-tag"
                      checked={semTag}
                      onCheckedChange={(checked) => {
                        setSemTag(!!checked);
                        if (checked) {
                          setFormData((prev) => ({ ...prev, tag: '' }));
                        } else {
                          setEquipamentoManual('');
                        }
                      }}
                    />
                    <Label htmlFor="sem-tag" className="text-xs text-muted-foreground cursor-pointer">Sem TAG</Label>
                  </div>
                </div>
                {semTag ? (
                  <Input
                    placeholder="Ex: Elevador de caneca setor B"
                    value={equipamentoManual}
                    onChange={(e) => setEquipamentoManual(e.target.value)}
                  />
                ) : (
                  <Popover open={tagComboOpen} onOpenChange={setTagComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={tagComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {formData.tag
                          ? `${formData.tag} - ${selectedEquipamento?.nome || ''}`
                          : 'Digite ou selecione a TAG...'}
                        <ArrowLeft className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-[-90deg]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Digite a TAG... (ex: EL-)"
                          value={tagSearch}
                          onValueChange={setTagSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-3 text-center space-y-2">
                              <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => {
                                  setTagComboOpen(false);
                                  setShowCadastrarAtivoDialog(true);
                                }}
                              >
                                Não encontrou? Cadastrar ou continuar sem TAG
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {equipamentosAtivos
                              .filter((eq) =>
                                !tagSearch ||
                                eq.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
                                eq.nome.toLowerCase().includes(tagSearch.toLowerCase())
                              )
                              .slice(0, 50)
                              .map((eq) => (
                                <CommandItem
                                  key={eq.id}
                                  value={eq.tag}
                                  onSelect={() => {
                                    handleTagChange(eq.tag);
                                    setTagSearch('');
                                    setTagComboOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.tag === eq.tag ? 'opacity-100' : 'opacity-0'}`} />
                                  <span className="font-mono font-medium">{eq.tag}</span>
                                  <span className="ml-2 text-muted-foreground">{eq.nome}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Equipamento</Label>
                <Input
                  value={semTag ? equipamentoManual : (selectedEquipamento?.nome || '')}
                  disabled={!semTag}
                  className={semTag ? '' : 'bg-muted'}
                  placeholder={semTag ? 'Descrição do equipamento' : 'Selecione uma TAG'}
                  onChange={semTag ? (e) => setEquipamentoManual(e.target.value) : undefined}
                />
              </div>
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
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

            {/* Requester + Mechanic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="solicitante">Solicitante *</Label>
                <Input
                  id="solicitante"
                  value={formData.solicitante}
                  onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                  placeholder="Nome ou setor solicitante"
                  required
                />
              </div>

              <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="problema">Problema Apresentado *</Label>
              <Textarea
                id="problema"
                value={formData.problema}
                onChange={(e) => setFormData({ ...formData, problema: e.target.value })}
                placeholder="Descreva detalhadamente o problema ou serviço a ser executado..."
                rows={3}
                minLength={problemaMinLength}
                required
              />
              {!problemaValido && formData.problema.length > 0 && (
                <p className="text-xs text-destructive">Descrição do problema deve ter no mínimo 5 caracteres.</p>
              )}
            </div>

            {/* Estimates + User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="flex items-end">
                <div className="p-2.5 bg-muted/50 rounded-lg text-sm w-full">
                  <span className="text-muted-foreground">Usuário: </span>
                  <span className="font-medium">{user?.nome}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
              <Button 
                type="submit" 
                className="flex-1 gap-2 h-10"
                disabled={createOSMutation.isPending || !formData.tag || !formData.tipo || !formData.solicitante || !problemaValido}
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
              <Button type="button" variant="outline" className="h-10" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>

        {/* Recently Emitted OS — sidebar */}
        {recentOS.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-3 lg:sticky lg:top-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              Últimas O.S. Emitidas
            </h2>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>TAG</th>
                    <th>Tipo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOS.map((os) => (
                    <tr key={os.id}>
                      <td className="font-mono font-medium">{String(os.numero_os).padStart(4, '0')}</td>
                      <td className="font-mono text-primary">{os.tag}</td>
                      <td>{os.tipo}</td>
                      <td><span className="text-xs font-medium">{os.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal with Print Option */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-6 w-6" />
              Ordem de Serviço Criada!
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              A O.S <span className="font-semibold text-foreground">#{createdOS && String(createdOS.numero_os).padStart(4, '0')}</span> foi registrada com sucesso.
              {'\n'}Deseja imprimir a ficha para entregar ao mecânico?
            </DialogDescription>
          </DialogHeader>

          {/* Hidden print target */}
          {createdOS && (
            <div style={{ display: 'none' }}>
              <OSPrintTemplate ref={printRef} os={createdOS} nomeEmpresa={nomeEmpresa} empresa={empresa} solicitacaoNumero={solicitacaoVinculada?.numero_solicitacao} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={() => { handlePrint(); handleCloseSuccess(); }} className="flex-1 gap-2">
              <Printer className="h-4 w-4" />
              Sim, imprimir
            </Button>
            <Button variant="outline" onClick={handleCloseSuccess} className="flex-1">
              Não, obrigado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSolicitacoesModal} onOpenChange={setShowSolicitacoesModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Esta TAG possui solicitações em aberto
            </DialogTitle>
            <DialogDescription>
              TAG: {formData.tag}. Verifique antes de emitir uma nova Ordem de Serviço.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[320px] overflow-auto">
            {solicitacoesAbertasDaTag.map((ss) => (
              <div key={ss.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">SS-{ss.numero_solicitacao} • {ss.status}</p>
                <p className="text-sm text-muted-foreground mt-1">{ss.descricao_falha}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(ss.created_at).toLocaleDateString('pt-BR')}</p>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleGerarAPartirDaSS(ss)}>
                    Gerar O.S a partir da SS
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate('/solicitacoes')}>
              Abrir Solicitações
            </Button>
            <Button onClick={handleContinuarSemSS}>Continuar emissão</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Equipamento não encontrado */}
      <Dialog open={showCadastrarAtivoDialog} onOpenChange={setShowCadastrarAtivoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Equipamento não encontrado
            </DialogTitle>
            <DialogDescription>
              O equipamento que você procura não está cadastrado no sistema. Deseja cadastrá-lo agora?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se for um equipamento locado, emprestado ou temporário, você pode continuar sem cadastro.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="gap-2"
              onClick={() => {
                setShowCadastrarAtivoDialog(false);
                navigate('/equipamentos');
              }}
            >
              Sim, cadastrar ativo
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCadastrarAtivoDialog(false);
                setSemTag(true);
                setFormData((prev) => ({ ...prev, tag: '' }));
                setEquipamentoManual(tagSearch);
                setTagSearch('');
              }}
            >
              Não, continuar sem cadastro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
