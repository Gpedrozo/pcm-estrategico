import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Printer, Edit, Play, Clock, Calendar, ChevronDown, ChevronRight,
  GripVertical, Droplets, History, Timer, ListChecks, Settings,
  Plus, Trash2, ArrowUp, ArrowDown,
} from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao, RotaPonto } from '@/types/lubrificacao';
import { LubrificacaoPrintTemplate } from '@/components/lubrificacao/LubrificacaoPrintTemplate';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { usePontosPlano, useCreatePontoPlano, useUpdatePontoPlano, useDeletePontoPlano } from '@/hooks/usePontosPlano';
import { useEtapasByPlano, useCreateEtapa, useUpdateEtapa, useDeleteEtapa, type EtapaPontoLubrificacao } from '@/hooks/useEtapasPontoLubrificacao';
import { useExecucoesByPlanoLubrificacao, useCreateExecucaoLubrificacao, useDeletePlanoLubrificacao, useUpdatePlanoLubrificacao } from '@/hooks/useLubrificacao';

const prioridadeCores: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800 border-green-300',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alta: 'bg-orange-100 text-orange-800 border-orange-300',
  critica: 'bg-red-100 text-red-800 border-red-300',
};

const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

interface LubrificacaoDetalheProps {
  plano: PlanoLubrificacao | null;
  equipamentos: EquipamentoRow[];
  onEdit: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoDetalhe({ plano, equipamentos, onEdit, onDelete }: LubrificacaoDetalheProps) {
  const [tab, setTab] = useState('pontos');
  const [expandedPontos, setExpandedPontos] = useState<Set<string>>(new Set());
  const [execFormOpen, setExecFormOpen] = useState(false);
  const [execNome, setExecNome] = useState('');
  const [execObs, setExecObs] = useState('');

  // CRUD state — Pontos
  const [addPontoOpen, setAddPontoOpen] = useState(false);
  const [newPonto, setNewPonto] = useState({ descricao: '', lubrificante: '', quantidade: '', ferramenta: '', tempo_estimado_min: 5 });
  const [editingPonto, setEditingPonto] = useState<RotaPonto | null>(null);
  const [editingPontoData, setEditingPontoData] = useState({ descricao: '', lubrificante: '', quantidade: '', ferramenta: '', tempo_estimado_min: 5 });

  // CRUD state — Etapas
  const [addEtapaFor, setAddEtapaFor] = useState<string | null>(null);
  const [newEtapa, setNewEtapa] = useState({ descricao: '', tempo_estimado_min: 5 });
  const [editingEtapa, setEditingEtapa] = useState<{ etapa: EtapaPontoLubrificacao; pontoId: string } | null>(null);
  const [editingEtapaData, setEditingEtapaData] = useState({ descricao: '', tempo_estimado_min: 5, observacoes: '' });

  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const togglePonto = (id: string) => {
    setExpandedPontos(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const printRef = useRef<HTMLDivElement>(null);
  const { data: empresa } = useDadosEmpresa();
  const { data: pontosPlano } = usePontosPlano(plano?.id);
  const { data: execucoes } = useExecucoesByPlanoLubrificacao(plano?.id ?? null);
  const createExecucao = useCreateExecucaoLubrificacao();
  const deletePlano = useDeletePlanoLubrificacao();
  const updatePlano = useUpdatePlanoLubrificacao();

  // Pontos mutations
  const createPonto = useCreatePontoPlano();
  const updatePonto = useUpdatePontoPlano();
  const deletePonto = useDeletePontoPlano();

  // Etapas mutations + batch query
  const pontoIds = pontosPlano?.map(p => p.id);
  const { data: etapasMap } = useEtapasByPlano(pontoIds);
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();

  // ── Handlers: Pontos ──────────────────────────────────────

  const handleAddPonto = async () => {
    if (!plano || !newPonto.descricao.trim()) return;
    const maxOrdem = Math.max(0, ...(pontosPlano || []).map(p => p.ordem));
    await createPonto.mutateAsync({
      plano_id: plano.id,
      descricao: newPonto.descricao,
      lubrificante: newPonto.lubrificante || null,
      quantidade: newPonto.quantidade || null,
      ferramenta: newPonto.ferramenta || null,
      tempo_estimado_min: newPonto.tempo_estimado_min || 5,
      ordem: maxOrdem + 1,
    });
    setNewPonto({ descricao: '', lubrificante: '', quantidade: '', ferramenta: '', tempo_estimado_min: 5 });
    setAddPontoOpen(false);
  };

  const handleMovePonto = async (ponto: RotaPonto, direction: 'up' | 'down') => {
    if (!pontosPlano || !plano) return;
    const sorted = [...pontosPlano].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(p => p.id === ponto.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    await Promise.all([
      updatePonto.mutateAsync({ id: ponto.id, plano_id: plano.id, ordem: sorted[swapIdx].ordem }),
      updatePonto.mutateAsync({ id: sorted[swapIdx].id, plano_id: plano.id, ordem: ponto.ordem }),
    ]);
  };

  const handleMoveEtapa = async (etapa, pontoId, direction) => {
    const pontoEtapas = etapasMap?.get(pontoId) || [];
    const sorted = [...pontoEtapas].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(e => e.id === etapa.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    await Promise.all([
      updateEtapa.mutateAsync({ id: etapa.id, ponto_id: pontoId, ordem: sorted[swapIdx].ordem }),
      updateEtapa.mutateAsync({ id: sorted[swapIdx].id, ponto_id: pontoId, ordem: etapa.ordem }),
    ]);
  };

  const handleOpenEditPonto = (ponto: RotaPonto) => {
    setEditingPonto(ponto);
    setEditingPontoData({
      descricao: ponto.descricao,
      lubrificante: ponto.lubrificante || '',
      quantidade: ponto.quantidade || '',
      ferramenta: ponto.ferramenta || '',
      tempo_estimado_min: ponto.tempo_estimado_min || 5,
    });
  };

  const handleSaveEditPonto = async () => {
    if (!editingPonto || !editingPontoData.descricao.trim() || !plano) return;
    await updatePonto.mutateAsync({
      id: editingPonto.id,
      plano_id: plano.id,
      descricao: editingPontoData.descricao,
      lubrificante: editingPontoData.lubrificante || null,
      quantidade: editingPontoData.quantidade || null,
      ferramenta: editingPontoData.ferramenta || null,
      tempo_estimado_min: editingPontoData.tempo_estimado_min,
    });
    setEditingPonto(null);
  };

  // ── Handlers: Etapas ──────────────────────────────────────

  const handleAddEtapa = async () => {
    if (!addEtapaFor || !newEtapa.descricao.trim()) return;
    const etapas = etapasMap?.get(addEtapaFor) || [];
    const maxOrdem = Math.max(0, ...etapas.map(e => e.ordem));
    await createEtapa.mutateAsync({
      ponto_id: addEtapaFor,
      descricao: newEtapa.descricao,
      tempo_estimado_min: newEtapa.tempo_estimado_min,
      ordem: maxOrdem + 1,
    });
    setNewEtapa({ descricao: '', tempo_estimado_min: 5 });
    setAddEtapaFor(null);
  };

  const handleOpenEditEtapa = (etapa: EtapaPontoLubrificacao, pontoId: string) => {
    setEditingEtapa({ etapa, pontoId });
    setEditingEtapaData({ descricao: etapa.descricao, tempo_estimado_min: etapa.tempo_estimado_min, observacoes: etapa.observacoes || '' });
  };

  const handleSaveEditEtapa = async () => {
    if (!editingEtapa || !editingEtapaData.descricao.trim()) return;
    await updateEtapa.mutateAsync({
      id: editingEtapa.etapa.id,
      ponto_id: editingEtapa.pontoId,
      descricao: editingEtapaData.descricao,
      tempo_estimado_min: editingEtapaData.tempo_estimado_min,
      observacoes: editingEtapaData.observacoes || null,
    });
    setEditingEtapa(null);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: plano ? `Lubrificacao-${plano.codigo}` : 'Lubrificacao',
    pageStyle: `@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; } }`,
  });

  const handleRegisterExecucao = async () => {
    if (!plano || !execNome.trim()) return;
    await createExecucao.mutateAsync({
      plano_id: plano.id,
      executor_nome: execNome,
      observacoes: execObs || undefined,
    });
    setExecNome('');
    setExecObs('');
    setExecFormOpen(false);
  };

  if (!plano) {
    return (
      <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden items-center justify-center">
        <Droplets className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground">Selecione um plano para visualizar os detalhes.</p>
      </div>
    );
  }

  const equipamento = equipamentos.find((item) => item.id === plano.equipamento_id);
  const prioridade = plano.prioridade || 'media';
  const tempoTotal = pontosPlano && pontosPlano.length > 0
    ? pontosPlano.reduce((s, p) => s + (p.tempo_estimado_min || 0), 0)
    : (plano.tempo_estimado || 0);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Header — mesmo padrão de Preventivas */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary text-lg">{plano.codigo}</span>
              <Badge variant={plano.ativo !== false ? 'default' : 'secondary'}>
                {plano.ativo !== false ? 'Ativo' : 'Inativo'}
              </Badge>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${prioridadeCores[prioridade]}`}>
                {prioridadeLabels[prioridade]}
              </span>
            </div>
            <h2 className="text-lg font-semibold">{plano.nome}</h2>
            {equipamento && <p className="text-sm text-muted-foreground">TAG: {equipamento.tag} — {equipamento.nome}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(plano)}>
              <Edit className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" onClick={() => setExecFormOpen(true)}>
              <Play className="h-4 w-4 mr-1" /> Executar
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Timer className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatMin(tempoTotal)}</span>
            <span className="text-muted-foreground">tempo total</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="font-semibold">{pontosPlano?.length || 0}</span>
            <span className="text-muted-foreground">pontos</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold">{plano.periodicidade || '—'}{plano.tipo_periodicidade ? ` ${plano.tipo_periodicidade}` : ''}</span>
            <span className="text-muted-foreground">periodicidade</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <History className="h-4 w-4 text-primary" />
            <span className="font-semibold">{execucoes?.length || 0}</span>
            <span className="text-muted-foreground">execuções</span>
          </div>
        </div>
      </div>

      {/* Tabs — mesmo padrão de Preventivas */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 justify-start bg-muted/50">
          <TabsTrigger value="pontos" className="gap-1"><ListChecks className="h-3.5 w-3.5" />Pontos</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings className="h-3.5 w-3.5" />Configuração</TabsTrigger>
        </TabsList>

        {/* Tab: Pontos de Lubrificação — CRUD hierárquico */}
        <TabsContent value="pontos" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="flex items-center justify-between py-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Pontos & Etapas</h3>
            <div className="flex gap-2">
              {pontosPlano && pontosPlano.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  onClick={() => {
                    const allIds = new Set(pontosPlano.map(p => p.id));
                    const allExpanded = pontosPlano.every(p => expandedPontos.has(p.id));
                    setExpandedPontos(allExpanded ? new Set() : allIds);
                  }}
                >
                  {pontosPlano.every(p => expandedPontos.has(p.id)) ? 'Recolher todos' : 'Expandir todos'}
                </button>
              )}
              <Button size="sm" onClick={() => setAddPontoOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ponto
              </Button>
            </div>
          </div>

          {!pontosPlano || pontosPlano.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Droplets className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum ponto de lubrificação cadastrado</p>
              <Button size="sm" className="mt-3" onClick={() => setAddPontoOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Ponto
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(pontosPlano || [])].sort((a, b) => a.ordem - b.ordem).map((p, pIdx) => {
                const isExpanded = expandedPontos.has(p.id);
                const etapas = etapasMap?.get(p.id) || [];
                const lubDiferente = p.lubrificante && p.lubrificante !== plano.lubrificante;
                return (
                  <div key={p.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Ponto header */}
                    <div
                      className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePonto(p.id)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {pIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.descricao}</p>
                        {!plano.equipamento_id && p.equipamento_tag && (
                          <p className="text-xs text-muted-foreground font-mono">TAG: {p.equipamento_tag}</p>
                        )}
                      </div>
                      {lubDiferente && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Droplets className="h-3 w-3" /> {p.lubrificante}
                        </span>
                      )}
                      <Badge variant="outline" className="gap-1 flex-shrink-0">
                        <Clock className="h-3 w-3" /> {p.tempo_estimado_min} min
                      </Badge>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{etapas.length} etapas</span>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMovePonto(p, 'up')} disabled={pIdx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMovePonto(p, 'down')} disabled={pIdx === (pontosPlano?.length || 0) - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEditPonto(p)} title="Editar ponto">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => confirm({ title: 'Excluir ponto', description: `Excluir o ponto "${p.descricao}" e todas as suas etapas?`, onConfirm: () => deletePonto.mutateAsync({ id: p.id, plano_id: plano.id }) })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Etapas (sub-itens expandidos) */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {/* Spreadsheet header */}
                        <div className="grid grid-cols-[40px_1fr_100px_80px_130px] gap-2 px-3 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <span>#</span>
                          <span>Etapa</span>
                          <span>Tempo</span>
                          <span>Status</span>
                          <span>Ações</span>
                        </div>

                        {etapas.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            Nenhuma etapa cadastrada para este ponto.
                          </div>
                        ) : (
                          etapas.map((et, eIdx) => (
                            <div key={et.id} className="grid grid-cols-[40px_1fr_100px_80px_90px] gap-2 px-3 py-2 border-t border-border/50 items-center hover:bg-muted/20 text-sm">
                              <span className="text-muted-foreground font-mono text-xs">{eIdx + 1}</span>
                              <span className="truncate">{et.descricao}</span>
                              <span className="font-mono text-xs">{formatMin(et.tempo_estimado_min)}</span>
                              <Badge variant={et.concluido ? 'default' : 'outline'} className="text-[10px] h-5 w-fit">
                                {et.concluido ? 'OK' : 'Pendente'}
                              </Badge>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMoveEtapa(et, p.id, 'up')} disabled={eIdx === 0} title="Mover acima">
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMoveEtapa(et, p.id, 'down')} disabled={eIdx === etapas.length - 1} title="Mover abaixo">
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleOpenEditEtapa(et, p.id)} title="Editar etapa">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => confirm({ title: 'Excluir etapa', description: `Excluir a etapa "${et.descricao}"?`, onConfirm: () => deleteEtapa.mutateAsync({ id: et.id, ponto_id: p.id }) })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Add etapa button */}
                        <div className="px-3 py-2 border-t border-border/50">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setAddEtapaFor(p.id); setNewEtapa({ descricao: '', tempo_estimado_min: 5 }); }}>
                            <Plus className="h-3 w-3" /> Adicionar Etapa
                          </Button>
                        </div>

                        {/* Info compacta do ponto */}
                        <div className="border-t border-border/50 px-3 py-2 bg-muted/10">
                          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Lubrificante: {p.lubrificante || plano.lubrificante || '—'}</span>
                            <span>Qtd: {p.quantidade || '—'}</span>
                            <span>Ferramenta: {p.ferramenta || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider py-3">Histórico de Execuções</h3>
          {!execucoes || execucoes.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <History className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma execução registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {execucoes.map((exec: any) => (
                <div key={exec.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{exec.executor_nome || 'Não informado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exec.data_execucao).toLocaleDateString('pt-BR')}{' '}às{' '}{new Date(exec.data_execucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={exec.status === 'CONCLUIDO' ? 'default' : 'outline'}>
                      {exec.status}
                    </Badge>
                  </div>
                  {exec.quantidade_utilizada && (
                    <p className="text-xs mt-1 text-muted-foreground">Quantidade utilizada: {exec.quantidade_utilizada}</p>
                  )}
                  {exec.observacoes && <p className="text-xs mt-1 text-muted-foreground">{exec.observacoes}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Configuração */}
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
                <span className="text-muted-foreground">Equipamento</span>
                <span>{equipamento ? `${equipamento.tag} — ${equipamento.nome}` : '—'}</span>
                <span className="text-muted-foreground">Lubrificante</span>
                <span>{plano.lubrificante || '—'}</span>
                <span className="text-muted-foreground">Periodicidade</span>
                <span>{plano.periodicidade || '—'} {plano.tipo_periodicidade || ''}</span>
                <span className="text-muted-foreground">Tempo Estimado</span>
                <span>{formatMin(tempoTotal)}</span>
                <span className="text-muted-foreground">Responsável</span>
                <span>{plano.responsavel_nome || '—'}</span>
                <span className="text-muted-foreground">Prioridade</span>
                <span>{prioridadeLabels[prioridade]}</span>
                <span className="text-muted-foreground">Status</span>
                <span>{plano.status || 'programado'}</span>
                {plano.ultima_execucao && (
                  <><span className="text-muted-foreground">Última execução</span><span>{new Date(plano.ultima_execucao).toLocaleDateString('pt-BR')}</span></>
                )}
                {plano.proxima_execucao && (
                  <><span className="text-muted-foreground">Próxima execução</span><span>{new Date(plano.proxima_execucao).toLocaleDateString('pt-BR')}</span></>
                )}
                <span className="text-muted-foreground">Criado em</span>
                <span>{plano.created_at ? new Date(plano.created_at).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
            </div>
            {plano.descricao && (
              <div className="p-3 border border-border rounded-lg">
                <p className="font-medium text-sm mb-1">Escopo / Instruções</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plano.descricao}</p>
              </div>
            )}
            <Separator />
            <Button variant="destructive" size="sm" onClick={() => confirm({ title: 'Excluir plano', description: 'Tem certeza que deseja excluir este plano de lubrificação? Todos os pontos e etapas serão removidos.', onConfirm: async () => { await deletePlano.mutateAsync(plano.id); onDelete?.(); } })}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir Plano
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Registrar Execução */}
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
          </div>
          <DialogFooter>
            <Button onClick={handleRegisterExecucao} disabled={createExecucao.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Ponto */}
      <Dialog open={addPontoOpen} onOpenChange={setAddPontoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Ponto de Lubrificação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input value={newPonto.descricao} onChange={e => setNewPonto(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mancal lado acoplamento" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lubrificante</Label>
              <Input value={newPonto.lubrificante} onChange={e => setNewPonto(p => ({ ...p, lubrificante: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input value={newPonto.quantidade} onChange={e => setNewPonto(p => ({ ...p, quantidade: e.target.value }))} placeholder="Ex: 50ml" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tempo (min)</Label>
                <Input type="number" value={newPonto.tempo_estimado_min} onChange={e => setNewPonto(p => ({ ...p, tempo_estimado_min: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ferramenta</Label>
              <Input value={newPonto.ferramenta} onChange={e => setNewPonto(p => ({ ...p, ferramenta: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddPonto} disabled={createPonto.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Ponto */}
      <Dialog open={!!editingPonto} onOpenChange={() => setEditingPonto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Ponto</DialogTitle><DialogDescription>Altere os dados do ponto de lubrificação</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input value={editingPontoData.descricao} onChange={e => setEditingPontoData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição do ponto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lubrificante</Label>
              <Input value={editingPontoData.lubrificante} onChange={e => setEditingPontoData(p => ({ ...p, lubrificante: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input value={editingPontoData.quantidade} onChange={e => setEditingPontoData(p => ({ ...p, quantidade: e.target.value }))} placeholder="Ex: 50ml" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tempo (min)</Label>
                <Input type="number" value={editingPontoData.tempo_estimado_min} onChange={e => setEditingPontoData(p => ({ ...p, tempo_estimado_min: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ferramenta</Label>
              <Input value={editingPontoData.ferramenta} onChange={e => setEditingPontoData(p => ({ ...p, ferramenta: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPonto(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditPonto} disabled={updatePonto.isPending || !editingPontoData.descricao.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Etapa */}
      <Dialog open={!!addEtapaFor} onOpenChange={() => setAddEtapaFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input value={newEtapa.descricao} onChange={e => setNewEtapa(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Limpar ponto de graxa" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tempo Estimado (min)</Label>
              <Input type="number" value={newEtapa.tempo_estimado_min} onChange={e => setNewEtapa(p => ({ ...p, tempo_estimado_min: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddEtapa} disabled={createEtapa.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Etapa */}
      <Dialog open={!!editingEtapa} onOpenChange={() => setEditingEtapa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Etapa</DialogTitle><DialogDescription>Altere os dados da etapa</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input value={editingEtapaData.descricao} onChange={e => setEditingEtapaData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição da etapa" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tempo Estimado (min)</Label>
              <Input type="number" value={editingEtapaData.tempo_estimado_min} onChange={e => setEditingEtapaData(p => ({ ...p, tempo_estimado_min: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={editingEtapaData.observacoes} onChange={e => setEditingEtapaData(p => ({ ...p, observacoes: e.target.value }))} rows={2} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEtapa(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditEtapa} disabled={updateEtapa.isPending || !editingEtapaData.descricao.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialogElement}

      {/* Hidden print template */}
      <div style={{ display: 'none' }}>
        <LubrificacaoPrintTemplate ref={printRef} plano={plano} pontos={pontosPlano || []} empresa={empresa} equipamentoNome={equipamento ? `${equipamento.tag} - ${equipamento.nome}` : undefined} />
      </div>
    </div>
  );
}
