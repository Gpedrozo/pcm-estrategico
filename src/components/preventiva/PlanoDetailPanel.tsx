import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, Edit, Play, Clock, Calendar, ChevronDown, ChevronRight,
  GripVertical, Copy, History, CheckSquare, Download, Timer, Save, X,
  FileText, ListChecks, Settings, ArrowUp, ArrowDown
} from 'lucide-react';
import type { PlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useUpdatePlanoPreventivo, useDeletePlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import {
  useAtividadesByPlano, useCreateAtividade, useUpdateAtividade, useDeleteAtividade,
  useCreateServico, useUpdateServico, useDeleteServico,
  type AtividadePreventiva, type ServicoPreventivo
} from '@/hooks/useAtividadesPreventivas';
import { useExecucoesByPlano, useCreateExecucao } from '@/hooks/useExecucoesPreventivas';
import { useTemplatesPreventivos, useCreateTemplate } from '@/hooks/useTemplatesPreventivos';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import jsPDF from 'jspdf';

interface Props {
  plano: PlanoPreventivo;
  equipamentos: EquipamentoRow[];
}

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function PlanoDetailPanel({ plano, equipamentos }: Props) {
  const [tab, setTab] = useState('estrutura');
  const [isEditingPlano, setIsEditingPlano] = useState(false);
  const [addAtividadeOpen, setAddAtividadeOpen] = useState(false);
  const [addServicoFor, setAddServicoFor] = useState<string | null>(null);
  const [expandedAtividades, setExpandedAtividades] = useState<Set<string>>(new Set());
  const [editingPlanoData, setEditingPlanoData] = useState<any>({});
  const [newAtividade, setNewAtividade] = useState({ nome: '', responsavel: '' });
  const [newServico, setNewServico] = useState({ descricao: '', tempo_estimado_min: 10 });
  const [execFormOpen, setExecFormOpen] = useState(false);
  const [execNome, setExecNome] = useState('');
  const [execObs, setExecObs] = useState('');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateNome, setTemplateNome] = useState('');

  const { data: atividades, isLoading: loadAtiv } = useAtividadesByPlano(plano.id);
  const { data: execucoes } = useExecucoesByPlano(plano.id);
  const { data: templates } = useTemplatesPreventivos();

  const updatePlano = useUpdatePlanoPreventivo();
  const deletePlano = useDeletePlanoPreventivo();
  const createAtividade = useCreateAtividade();
  const updateAtividade = useUpdateAtividade();
  const deleteAtividade = useDeleteAtividade();
  const createServico = useCreateServico();
  const updateServico = useUpdateServico();
  const deleteServico = useDeleteServico();
  const createExecucao = useCreateExecucao();
  const createTemplate = useCreateTemplate();

  const tempoTotalPlano = useMemo(() => {
    if (!atividades) return 0;
    return atividades.reduce((sum, a) => sum + (a.tempo_total_min || 0), 0);
  }, [atividades]);

  const toggleExpand = (id: string) => {
    setExpandedAtividades(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAddAtividade = async () => {
    if (!newAtividade.nome.trim()) return;
    const maxOrdem = Math.max(0, ...(atividades || []).map(a => a.ordem));
    await createAtividade.mutateAsync({
      plano_id: plano.id,
      nome: newAtividade.nome,
      responsavel: newAtividade.responsavel || undefined,
      ordem: maxOrdem + 1,
    });
    setNewAtividade({ nome: '', responsavel: '' });
    setAddAtividadeOpen(false);
  };

  const handleAddServico = async () => {
    if (!addServicoFor || !newServico.descricao.trim()) return;
    const atv = atividades?.find(a => a.id === addServicoFor);
    const maxOrdem = Math.max(0, ...(atv?.servicos || []).map(s => s.ordem));
    await createServico.mutateAsync({
      atividade_id: addServicoFor,
      descricao: newServico.descricao,
      tempo_estimado_min: newServico.tempo_estimado_min,
      ordem: maxOrdem + 1,
      _plano_id: plano.id,
    });
    setNewServico({ descricao: '', tempo_estimado_min: 10 });
    setAddServicoFor(null);
  };

  const handleMoveAtividade = async (atv: AtividadePreventiva, direction: 'up' | 'down') => {
    if (!atividades) return;
    const sorted = [...atividades].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(a => a.id === atv.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    await Promise.all([
      updateAtividade.mutateAsync({ id: atv.id, plano_id: plano.id, ordem: sorted[swapIdx].ordem }),
      updateAtividade.mutateAsync({ id: sorted[swapIdx].id, plano_id: plano.id, ordem: atv.ordem }),
    ]);
  };

  const handleSavePlanoEdit = async () => {
    await updatePlano.mutateAsync({ id: plano.id, ...editingPlanoData });
    setIsEditingPlano(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Plano Preventivo: ${plano.codigo}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Nome: ${plano.nome}`, 14, 30);
    doc.text(`TAG: ${plano.tag || 'N/A'}`, 14, 37);
    doc.text(`Frequência: ${plano.frequencia_dias} dias`, 14, 44);
    doc.text(`Tempo Total: ${formatMin(tempoTotalPlano)}`, 14, 51);
    doc.text(`Próxima Execução: ${plano.proxima_execucao ? new Date(plano.proxima_execucao).toLocaleDateString('pt-BR') : 'N/A'}`, 14, 58);

    let y = 72;
    doc.setFontSize(13);
    doc.text('Atividades e Serviços', 14, y);
    y += 10;

    (atividades || []).forEach((atv, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${atv.nome} (${formatMin(atv.tempo_total_min)})`, 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      (atv.servicos || []).forEach((s, j) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`   ${j + 1}. ${s.descricao} — ${formatMin(s.tempo_estimado_min)}`, 18, y);
        y += 6;
      });
      y += 4;
    });

    doc.save(`plano-${plano.codigo}.pdf`);
  };

  const handleSaveTemplate = async () => {
    if (!templateNome.trim() || !atividades) return;
    const estrutura = atividades.map(a => ({
      nome: a.nome,
      responsavel: a.responsavel,
      ordem: a.ordem,
      servicos: (a.servicos || []).map(s => ({
        descricao: s.descricao,
        tempo_estimado_min: s.tempo_estimado_min,
        ordem: s.ordem,
      })),
    }));
    await createTemplate.mutateAsync({ nome: templateNome, estrutura });
    setTemplateNome('');
    setSaveTemplateOpen(false);
  };

  const handleRegisterExecucao = async () => {
    if (!execNome.trim()) return;
    const checklist = (atividades || []).flatMap(a =>
      (a.servicos || []).map(s => ({
        atividade: a.nome,
        servico: s.descricao,
        tempo_estimado_min: s.tempo_estimado_min,
        concluido: false,
      }))
    );
    await createExecucao.mutateAsync({
      plano_id: plano.id,
      executor_nome: execNome,
      checklist,
      observacoes: execObs || undefined,
    });
    setExecNome('');
    setExecObs('');
    setExecFormOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary text-lg">{plano.codigo}</span>
              <Badge variant={plano.ativo ? 'default' : 'secondary'}>{plano.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
            <h2 className="text-lg font-semibold">{plano.nome}</h2>
            {plano.tag && <p className="text-sm text-muted-foreground">TAG: {plano.tag}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingPlanoData({ nome: plano.nome, descricao: plano.descricao, frequencia_dias: plano.frequencia_dias, instrucoes: plano.instrucoes, ativo: plano.ativo }); setIsEditingPlano(true); }}>
              <Edit className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button size="sm" onClick={() => setExecFormOpen(true)}>
              <Play className="h-4 w-4 mr-1" /> Executar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Timer className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatMin(tempoTotalPlano)}</span>
            <span className="text-muted-foreground">tempo total</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="font-semibold">{atividades?.length || 0}</span>
            <span className="text-muted-foreground">atividades</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold">{plano.frequencia_dias}d</span>
            <span className="text-muted-foreground">frequência</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <History className="h-4 w-4 text-primary" />
            <span className="font-semibold">{execucoes?.length || 0}</span>
            <span className="text-muted-foreground">execuções</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 justify-start bg-muted/50">
          <TabsTrigger value="estrutura" className="gap-1"><ListChecks className="h-3.5 w-3.5" />Estrutura</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1"><Copy className="h-3.5 w-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings className="h-3.5 w-3.5" />Configuração</TabsTrigger>
        </TabsList>

        {/* Estrutura Tab */}
        <TabsContent value="estrutura" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="flex items-center justify-between py-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Atividades & Serviços</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSaveTemplateOpen(true)}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Salvar Template
              </Button>
              <Button size="sm" onClick={() => setAddAtividadeOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Atividade
              </Button>
            </div>
          </div>

          {loadAtiv ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (atividades || []).length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <ListChecks className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma atividade cadastrada</p>
              <Button size="sm" className="mt-3" onClick={() => setAddAtividadeOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Atividade
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(atividades || [])].sort((a, b) => a.ordem - b.ordem).map((atv, aIdx) => {
                const isExpanded = expandedAtividades.has(atv.id);
                return (
                  <div key={atv.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Atividade header */}
                    <div className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(atv.id)}>
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {aIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{atv.nome}</p>
                        {atv.responsavel && <p className="text-xs text-muted-foreground">Resp: {atv.responsavel}</p>}
                      </div>
                      <Badge variant="outline" className="gap-1 flex-shrink-0">
                        <Clock className="h-3 w-3" /> {formatMin(atv.tempo_total_min)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{atv.servicos?.length || 0} serviços</span>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMoveAtividade(atv, 'up')} disabled={aIdx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMoveAtividade(atv, 'down')} disabled={aIdx === (atividades?.length || 0) - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAtividade.mutate({ id: atv.id, plano_id: plano.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Serviços */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {/* Spreadsheet header */}
                        <div className="grid grid-cols-[40px_1fr_100px_80px_60px] gap-2 px-3 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <span>#</span>
                          <span>Serviço</span>
                          <span>Tempo</span>
                          <span>Status</span>
                          <span></span>
                        </div>

                        {(atv.servicos || []).map((srv, sIdx) => (
                          <div key={srv.id} className="grid grid-cols-[40px_1fr_100px_80px_60px] gap-2 px-3 py-2 border-t border-border/50 items-center hover:bg-muted/20 text-sm">
                            <span className="text-muted-foreground font-mono text-xs">{sIdx + 1}</span>
                            <span className="truncate">{srv.descricao}</span>
                            <span className="font-mono text-xs">{formatMin(srv.tempo_estimado_min)}</span>
                            <Badge variant={srv.concluido ? 'default' : 'outline'} className="text-[10px] h-5 w-fit">
                              {srv.concluido ? 'OK' : 'Pendente'}
                            </Badge>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteServico.mutate({ id: srv.id, _plano_id: plano.id, _atividade_id: atv.id })}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Add service button */}
                        <div className="px-3 py-2 border-t border-border/50">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setAddServicoFor(atv.id); setNewServico({ descricao: '', tempo_estimado_min: 10 }); }}>
                            <Plus className="h-3 w-3" /> Adicionar Serviço
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider py-3">Histórico de Execuções</h3>
          {!execucoes || execucoes.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <History className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma execução registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {execucoes.map((exec) => (
                <div key={exec.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{exec.executor_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exec.data_execucao).toLocaleDateString('pt-BR')} às {new Date(exec.data_execucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={exec.status === 'CONCLUIDA' ? 'default' : exec.status === 'EM_ANDAMENTO' ? 'secondary' : 'outline'}>
                      {exec.status}
                    </Badge>
                  </div>
                  {exec.tempo_real_min && (
                    <p className="text-xs mt-1 text-muted-foreground">Tempo real: {formatMin(exec.tempo_real_min)}</p>
                  )}
                  {exec.observacoes && <p className="text-xs mt-1 text-muted-foreground">{exec.observacoes}</p>}
                  {/* Checklist preview */}
                  {Array.isArray(exec.checklist) && exec.checklist.length > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      {exec.checklist.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox checked={item.concluido} disabled className="h-3 w-3" />
                          <span className="truncate">{item.servico}</span>
                        </div>
                      ))}
                      {exec.checklist.length > 5 && <p className="text-muted-foreground">+{exec.checklist.length - 5} itens</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider py-3">Templates Disponíveis</h3>
          {!templates || templates.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Copy className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum template salvo</p>
              <p className="text-xs text-muted-foreground mt-1">Salve a estrutura atual como template na aba Estrutura</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(t.estrutura) ? t.estrutura.length : 0} atividades • Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider py-3">Configuração do Plano</h3>
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium text-sm">Plano Ativo</p>
                <p className="text-xs text-muted-foreground">Ativar ou desativar este plano</p>
              </div>
              <Switch
                checked={plano.ativo}
                onCheckedChange={(v) => updatePlano.mutate({ id: plano.id, ativo: v })}
              />
            </div>
            <div className="p-3 border border-border rounded-lg space-y-2">
              <p className="font-medium text-sm">Informações</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Tipo Gatilho</span><span>{plano.tipo_gatilho}</span>
                <span className="text-muted-foreground">Frequência</span><span>{plano.frequencia_dias} dias</span>
                <span className="text-muted-foreground">Especialidade</span><span>{plano.especialidade || 'N/A'}</span>
                <span className="text-muted-foreground">Criado em</span><span>{new Date(plano.created_at).toLocaleDateString('pt-BR')}</span>
                <span className="text-muted-foreground">Atualizado</span><span>{new Date(plano.updated_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            {plano.instrucoes && (
              <div className="p-3 border border-border rounded-lg">
                <p className="font-medium text-sm mb-1">Instruções</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plano.instrucoes}</p>
              </div>
            )}
            <Separator />
            <Button variant="destructive" size="sm" onClick={() => { if (confirm('Tem certeza que deseja excluir este plano?')) deletePlano.mutate(plano.id); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir Plano
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}

      {/* Add Atividade */}
      <Dialog open={addAtividadeOpen} onOpenChange={setAddAtividadeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={newAtividade.nome} onChange={e => setNewAtividade(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Limpeza de lubrificantes" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável</Label>
              <Input value={newAtividade.responsavel} onChange={e => setNewAtividade(p => ({ ...p, responsavel: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddAtividade} disabled={createAtividade.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Servico */}
      <Dialog open={!!addServicoFor} onOpenChange={() => setAddServicoFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input value={newServico.descricao} onChange={e => setNewServico(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Limpar eixo principal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tempo Estimado (min)</Label>
              <Input type="number" value={newServico.tempo_estimado_min} onChange={e => setNewServico(p => ({ ...p, tempo_estimado_min: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddServico} disabled={createServico.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plano */}
      <Dialog open={isEditingPlano} onOpenChange={setIsEditingPlano}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Plano</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={editingPlanoData.nome || ''} onChange={e => setEditingPlanoData((p: any) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={editingPlanoData.descricao || ''} onChange={e => setEditingPlanoData((p: any) => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frequência (dias)</Label>
              <Input type="number" value={editingPlanoData.frequencia_dias || 0} onChange={e => setEditingPlanoData((p: any) => ({ ...p, frequencia_dias: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instruções</Label>
              <Textarea value={editingPlanoData.instrucoes || ''} onChange={e => setEditingPlanoData((p: any) => ({ ...p, instrucoes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingPlano(false)}>Cancelar</Button>
            <Button onClick={handleSavePlanoEdit} disabled={updatePlano.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Execution */}
      <Dialog open={execFormOpen} onOpenChange={setExecFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Execução</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Executor *</Label>
              <Input value={execNome} onChange={e => setExecNome(e.target.value)} placeholder="Nome do técnico" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={execObs} onChange={e => setExecObs(e.target.value)} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Um checklist com {atividades?.reduce((s, a) => s + (a.servicos?.length || 0), 0) || 0} serviços será gerado automaticamente.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleRegisterExecucao} disabled={createExecucao.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar como Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome do Template *</Label>
              <Input value={templateNome} onChange={e => setTemplateNome(e.target.value)} placeholder="Ex: Preventiva CNC mensal" />
            </div>
            <p className="text-xs text-muted-foreground">
              Será salvo com {atividades?.length || 0} atividades e seus serviços.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
