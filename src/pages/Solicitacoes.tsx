import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Clock, Eye, CheckCircle2, XCircle, GitBranch, AlertTriangle } from 'lucide-react';
import { useSolicitacoes, useCreateSolicitacao, useUpdateSolicitacao, type SolicitacaoRow } from '@/hooks/useSolicitacoes';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveSlaHorasByClassificacao, useTenantPadronizacoes } from '@/hooks/useTenantPadronizacoes';

export default function Solicitacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSol, setSelectedSol] = useState<SolicitacaoRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [linkedOSNumero, setLinkedOSNumero] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tag: '',
    solicitante_nome: '',
    solicitante_setor: '',
    descricao_falha: '',
    impacto: 'MEDIO' as 'ALTO' | 'MEDIO' | 'BAIXO',
    classificacao: 'PROGRAMAVEL' as string,
  });

  const { data: solicitacoes, isLoading } = useSolicitacoes();
  const { data: equipamentos } = useEquipamentos();
  const { data: padronizacoes } = useTenantPadronizacoes();
  const createMutation = useCreateSolicitacao();
  const updateMutation = useUpdateSolicitacao();

  const classificacoesOS = padronizacoes?.classificacoes_os?.length
    ? padronizacoes.classificacoes_os
    : ['EMERGENCIAL', 'URGENTE', 'PROGRAMAVEL'];

  useEffect(() => {
    if (!classificacoesOS.length) return;
    if (classificacoesOS.includes(formData.classificacao)) return;

    setFormData((prev) => ({
      ...prev,
      classificacao: classificacoesOS[0],
    }));
  }, [classificacoesOS, formData.classificacao]);

  const canReviewSolicitacao = user?.tipo !== 'SOLICITANTE';

  const handleOpenDetail = (sol: SolicitacaoRow) => {
    setSelectedSol(sol);
    setShowRejectInput(false);
    setRejectReason('');
    setLinkedOSNumero(null);
    if (sol.os_id) {
      supabase.from('ordens_servico').select('numero_os').eq('id', sol.os_id).single()
        .then(({ data }) => { if (data) setLinkedOSNumero(data.numero_os); });
    }
  };

  const handleCloseDetail = () => {
    setSelectedSol(null);
    setShowRejectInput(false);
    setRejectReason('');
  };

  const handleAprovar = async () => {
    if (!selectedSol) return;
    await updateMutation.mutateAsync({ id: selectedSol.id, status: 'APROVADA' });
    setSelectedSol({ ...selectedSol, status: 'APROVADA' });
  };

  const handleRejeitar = async () => {
    if (!selectedSol || !rejectReason.trim()) return;
    await updateMutation.mutateAsync({
      id: selectedSol.id,
      status: 'REJEITADA',
      observacoes: rejectReason.trim(),
    });
    handleCloseDetail();
  };

  const handleConverterParaOS = () => {
    if (!selectedSol) return;
    handleCloseDetail();
    navigate('/os/nova', { state: { solicitacao: selectedSol } });
  };

  const filteredSolicitacoes = solicitacoes?.filter(s => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return s.tag.toLowerCase().includes(searchLower) ||
           s.solicitante_nome.toLowerCase().includes(searchLower) ||
           s.descricao_falha.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({
      tag: '',
      solicitante_nome: '',
      solicitante_setor: '',
      descricao_falha: '',
      impacto: 'MEDIO',
      classificacao: classificacoesOS[0] ?? 'PROGRAMAVEL',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDENTE': 'bg-warning/10 text-warning',
      'APROVADA': 'bg-info/10 text-info',
      'CONVERTIDA': 'bg-success/10 text-success',
      'REJEITADA': 'bg-destructive/10 text-destructive',
      'CANCELADA': 'bg-muted text-muted-foreground',
    };
    return styles[status] || styles['PENDENTE'];
  };

  const getClassificacaoBadge = (classificacao: string) => {
    const styles: Record<string, string> = {
      'EMERGENCIAL': 'bg-destructive text-destructive-foreground',
      'URGENTE': 'bg-warning text-warning-foreground',
      'PROGRAMAVEL': 'bg-info/10 text-info',
    };
    return styles[classificacao] || '';
  };

  const getImpactoBadge = (impacto: string) => {
    const styles: Record<string, string> = {
      'ALTO': 'bg-destructive/10 text-destructive',
      'MEDIO': 'bg-warning/10 text-warning',
      'BAIXO': 'bg-success/10 text-success',
    };
    return styles[impacto] || '';
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Manutenção</h1>
          <p className="text-muted-foreground">Gerencie as solicitações da produção • {solicitacoes?.length || 0} registros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por TAG, solicitante..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>TAG</th>
              <th>Solicitante</th>
              <th>Classificação</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Data</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSolicitacoes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada</td></tr>
            ) : (
              filteredSolicitacoes.map((sol) => (
                <tr key={sol.id} className={sol.status === 'PENDENTE' ? 'border-l-4 border-l-warning bg-warning/5' : ''}>
                  <td className="font-mono font-medium">{sol.numero_solicitacao}</td>
                  <td className="font-mono text-primary">{sol.tag}</td>
                  <td>{sol.solicitante_nome}</td>
                  <td><Badge className={getClassificacaoBadge(sol.classificacao)}>{sol.classificacao}</Badge></td>
                  <td><Badge className={`${getStatusBadge(sol.status)}${sol.status === 'PENDENTE' ? ' animate-pulse' : ''}`}>{sol.status}</Badge></td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />{sol.sla_horas}h
                    </span>
                  </td>
                  <td>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleOpenDetail(sol)}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de Detalhes da Solicitação ── */}
      <Dialog open={!!selectedSol} onOpenChange={(open) => { if (!open) handleCloseDetail(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Solicitação #{selectedSol?.numero_solicitacao}
              {selectedSol && <Badge className={getStatusBadge(selectedSol.status)}>{selectedSol.status}</Badge>}
            </DialogTitle>
            <DialogDescription>Detalhes completos da solicitação de manutenção</DialogDescription>
          </DialogHeader>

          {selectedSol && (
            <div className="space-y-5 pt-2">
              {/* Informações principais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">TAG do Equipamento</p>
                  <p className="font-mono text-primary font-semibold">{selectedSol.tag}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Solicitante</p>
                  <p className="font-medium">{selectedSol.solicitante_nome}</p>
                  {selectedSol.solicitante_setor && (
                    <p className="text-xs text-muted-foreground">{selectedSol.solicitante_setor}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Classificação</p>
                  <Badge className={getClassificacaoBadge(selectedSol.classificacao)}>{selectedSol.classificacao}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Impacto</p>
                  <Badge className={getImpactoBadge(selectedSol.impacto)}>{selectedSol.impacto}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">SLA</p>
                  <p className="inline-flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedSol.sla_horas}h
                    {selectedSol.data_limite && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (até {new Date(selectedSol.data_limite).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Descrição da Falha */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Descrição da Falha</p>
                <div className="bg-muted/50 border border-border rounded-md p-3 text-sm whitespace-pre-wrap">
                  {selectedSol.descricao_falha}
                </div>
              </div>

              {/* Observações (motivo de rejeição, etc.) */}
              {selectedSol.observacoes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Observações</p>
                  <div className="bg-muted/50 border border-border rounded-md p-3 text-sm whitespace-pre-wrap">
                    {selectedSol.observacoes}
                  </div>
                </div>
              )}

              {/* Data */}
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <p>Criada em: {new Date(selectedSol.created_at).toLocaleString('pt-BR')}</p>
                {selectedSol.os_id && (
                  <p className="text-success font-medium">
                    Vinculada à O.S #{linkedOSNumero ? String(linkedOSNumero).padStart(4, '0') : '...'}
                  </p>
                )}
              </div>

              {/* ── Área de Input de Rejeição ── */}
              {showRejectInput && (
                <div className="space-y-2 border border-destructive/30 bg-destructive/5 rounded-md p-3">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Informe o motivo da rejeição
                  </div>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Descreva o motivo da rejeição..."
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!rejectReason.trim() || updateMutation.isPending}
                      onClick={handleRejeitar}
                    >
                      {updateMutation.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Botões de Ação ── */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                {/* PENDENTE → Aprovar / Rejeitar */}
                {canReviewSolicitacao && selectedSol.status === 'PENDENTE' && !showRejectInput && (
                  <>
                    <Button className="gap-1.5" onClick={handleAprovar} disabled={updateMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4" />
                      {updateMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                    </Button>
                    <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setShowRejectInput(true)}>
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </>
                )}

                {/* APROVADA e sem OS → Converter em O.S */}
                {selectedSol.status === 'APROVADA' && !selectedSol.os_id && (
                  <Button className="gap-1.5" onClick={handleConverterParaOS}>
                    <GitBranch className="h-4 w-4" />
                    Converter em Ordem de Serviço
                  </Button>
                )}

                {/* Status finais */}
                {selectedSol.os_id && (
                  <span className="text-sm text-success font-medium">
                    Vinculada à O.S #{linkedOSNumero ? String(linkedOSNumero).padStart(4, '0') : '...'}
                  </span>
                )}
                {selectedSol.status === 'REJEITADA' && (
                  <span className="text-sm text-destructive font-medium">Solicitação rejeitada</span>
                )}
                {selectedSol.status === 'CANCELADA' && (
                  <span className="text-sm text-muted-foreground font-medium">Solicitação cancelada</span>
                )}

                <Button variant="ghost" className="ml-auto" onClick={handleCloseDetail}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal Nova Solicitação ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>TAG do Equipamento *</Label>
              <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {equipamentos?.filter(e => e.ativo).map(e => (
                    <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Solicitante *</Label>
                <Input value={formData.solicitante_nome} onChange={(e) => setFormData({...formData, solicitante_nome: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.solicitante_setor} onChange={(e) => setFormData({...formData, solicitante_setor: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Impacto</Label>
                <Select value={formData.impacto} onValueChange={(v: any) => setFormData({...formData, impacto: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTO">Alto</SelectItem>
                    <SelectItem value="MEDIO">Médio</SelectItem>
                    <SelectItem value="BAIXO">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classificação</Label>
                <Select value={formData.classificacao} onValueChange={(v) => setFormData({...formData, classificacao: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classificacoesOS.map((classificacao) => (
                      <SelectItem key={classificacao} value={classificacao}>
                        {classificacao} ({resolveSlaHorasByClassificacao(classificacao)}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Falha *</Label>
              <Textarea value={formData.descricao_falha} onChange={(e) => setFormData({...formData, descricao_falha: e.target.value})} rows={3} required />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Registrar Solicitação</Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
