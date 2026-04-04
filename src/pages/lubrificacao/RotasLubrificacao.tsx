import { useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Trash2,
  Edit,
  Printer,
  ArrowUp,
  ArrowDown,
  Route,
  GripVertical,
  Lock,
  Camera,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useRotasLubrificacao,
  useCreateRotaLubrificacao,
  useUpdateRotaLubrificacao,
  useDeleteRotaLubrificacao,
  usePontosRota,
  useSavePontosRota,
} from '@/hooks/useRotasLubrificacao';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import type {
  RotaLubrificacao,
  RotaLubrificacaoInsert,
  RotaPontoInsert,
  FrequenciaRota,
} from '@/types/lubrificacao';
import { RotaPrintTemplate } from '@/components/lubrificacao/RotaPrintTemplate';
import { useToast } from '@/hooks/use-toast';

const FREQ_OPTIONS: { value: FrequenciaRota; label: string }[] = [
  { value: 'DIARIA', label: 'Diária (DI)' },
  { value: 'SEMANAL', label: 'Semanal (SE)' },
  { value: 'MENSAL', label: 'Mensal (ME)' },
  { value: 'TRIMESTRAL', label: 'Trimestral (TM)' },
  { value: 'SEMESTRAL', label: 'Semestral (SM)' },
  { value: 'ANUAL', label: 'Anual (AN)' },
];

interface PontoForm {
  key: string;
  codigo_ponto: string;
  descricao: string;
  equipamento_tag: string;
  localizacao: string;
  lubrificante: string;
  quantidade: string;
  ferramenta: string;
  tempo_estimado_min: number;
  instrucoes: string;
  referencia_manual: string;
  requer_parada: boolean;
  imagem_url: string;
  plano_id: string;
}

const emptyPonto = (): PontoForm => ({
  key: `${Date.now()}-${Math.random()}`,
  codigo_ponto: '',
  descricao: '',
  equipamento_tag: '',
  localizacao: '',
  lubrificante: '',
  quantidade: '',
  ferramenta: '',
  tempo_estimado_min: 0,
  instrucoes: '',
  referencia_manual: '',
  requer_parada: false,
  imagem_url: '',
  plano_id: '',
});

export default function RotasLubrificacao() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { data: empresa } = useDadosEmpresa();
  const { data: rotas, isLoading } = useRotasLubrificacao();
  const createRota = useCreateRotaLubrificacao();
  const updateRota = useUpdateRotaLubrificacao();
  const deleteRota = useDeleteRotaLubrificacao();
  const savePontos = useSavePontosRota();

  const [selectedRota, setSelectedRota] = useState<RotaLubrificacao | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<RotaLubrificacao | null>(null);
  const [search, setSearch] = useState('');
  const [freqFilter, setFreqFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState<RotaLubrificacaoInsert>({
    codigo: '',
    nome: '',
    descricao: '',
    frequencia: 'SEMANAL',
    responsavel: '',
    observacoes: '',
  });
  const [pontos, setPontos] = useState<PontoForm[]>([]);

  const { data: pontosDB } = usePontosRota(selectedRota?.id);

  const filteredRotas = useMemo(() => {
    if (!rotas) return [];
    const s = search.toLowerCase();
    return rotas.filter((r) => {
      const matchSearch = !s || r.codigo.toLowerCase().includes(s) || r.nome.toLowerCase().includes(s);
      const matchFreq = freqFilter === 'all' || r.frequencia === freqFilter;
      return matchSearch && matchFreq;
    });
  }, [rotas, search, freqFilter]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedRota ? `Rota-${selectedRota.codigo}` : 'Rota',
    pageStyle: '@page { size: A4 landscape; margin: 8mm; } @media print { body { -webkit-print-color-adjust: exact; } }',
  });

  const openNewForm = () => {
    setEditingRota(null);
    setFormData({ codigo: '', nome: '', descricao: '', frequencia: 'SEMANAL', responsavel: '', observacoes: '' });
    setPontos([emptyPonto()]);
    setFormOpen(true);
  };

  const openEditForm = (rota: RotaLubrificacao) => {
    setEditingRota(rota);
    setFormData({
      codigo: rota.codigo,
      nome: rota.nome,
      descricao: rota.descricao || '',
      frequencia: rota.frequencia,
      responsavel: rota.responsavel || '',
      observacoes: rota.observacoes || '',
    });
    // load existing pontos
    if (pontosDB && selectedRota?.id === rota.id) {
      setPontos(pontosDB.map((p) => ({
        key: p.id,
        codigo_ponto: p.codigo_ponto,
        descricao: p.descricao,
        equipamento_tag: p.equipamento_tag || '',
        localizacao: p.localizacao || '',
        lubrificante: p.lubrificante || '',
        quantidade: p.quantidade || '',
        ferramenta: p.ferramenta || '',
        tempo_estimado_min: p.tempo_estimado_min,
        instrucoes: p.instrucoes || '',
        referencia_manual: p.referencia_manual || '',
        requer_parada: p.requer_parada ?? false,
        imagem_url: p.imagem_url || '',
        plano_id: p.plano_id || '',
      })));
    } else {
      setPontos([emptyPonto()]);
    }
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.codigo || !formData.nome) {
      toast({ title: 'Preencha código e nome da rota', variant: 'destructive' });
      return;
    }

    const tempoTotal = pontos.reduce((acc, p) => acc + (p.tempo_estimado_min || 0), 0);

    let rotaId: string;
    if (editingRota) {
      await updateRota.mutateAsync({ id: editingRota.id, ...formData, tempo_estimado_total_min: tempoTotal });
      rotaId = editingRota.id;
    } else {
      const created = await createRota.mutateAsync({ ...formData, tempo_estimado_total_min: tempoTotal });
      rotaId = created.id;
    }

    const pontosPayload: RotaPontoInsert[] = pontos
      .filter((p) => p.descricao)
      .map((p, i) => ({
        rota_id: rotaId,
        ordem: i,
        codigo_ponto: `P${i + 1}`,
        descricao: p.descricao,
        equipamento_tag: p.equipamento_tag || null,
        localizacao: p.localizacao || null,
        lubrificante: p.lubrificante || null,
        quantidade: p.quantidade || null,
        ferramenta: p.ferramenta || null,
        tempo_estimado_min: p.tempo_estimado_min || 0,
        instrucoes: p.instrucoes || null,
        referencia_manual: p.referencia_manual || null,
        requer_parada: p.requer_parada,
        imagem_url: p.imagem_url || null,
        plano_id: p.plano_id || null,
      }));

    await savePontos.mutateAsync({ rotaId, pontos: pontosPayload });

    toast({ title: editingRota ? 'Rota atualizada' : 'Rota criada com sucesso' });
    setFormOpen(false);
  };

  const handleDelete = async (rota: RotaLubrificacao) => {
    if (!confirm(`Excluir rota ${rota.codigo}?`)) return;
    await deleteRota.mutateAsync(rota.id);
    if (selectedRota?.id === rota.id) setSelectedRota(null);
  };

  const movePonto = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pontos.length) return;
    const newPontos = [...pontos];
    [newPontos[index], newPontos[newIndex]] = [newPontos[newIndex], newPontos[index]];
    setPontos(newPontos);
  };

  const updatePonto = (index: number, field: keyof PontoForm, value: string | number) => {
    setPontos((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePonto = (index: number) => {
    setPontos((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Rotas de Lubrificação
          </h2>
          <p className="text-sm text-muted-foreground">{rotas?.length || 0} rotas cadastradas</p>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Rota
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Buscar por código ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={freqFilter} onValueChange={setFreqFilter}>
          <SelectTrigger><SelectValue placeholder="Frequência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as frequências</SelectItem>
            {FREQ_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List + Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th>Frequência</th>
                      <th>Tempo Total</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRotas.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma rota encontrada.</td></tr>
                    ) : (
                      filteredRotas.map((rota) => (
                        <tr key={rota.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRota(rota)}>
                          <td className="font-mono font-semibold text-primary">{rota.codigo}</td>
                          <td>{rota.nome}</td>
                          <td><Badge variant="outline">{FREQ_OPTIONS.find((f) => f.value === rota.frequencia)?.label || rota.frequencia}</Badge></td>
                          <td>{rota.tempo_estimado_total_min} min</td>
                          <td>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" onClick={() => { setSelectedRota(rota); openEditForm(rota); }}><Edit className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => { setSelectedRota(rota); handlePrint(); }}><Printer className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(rota)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div>
          {selectedRota ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{selectedRota.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedRota.codigo}</p>
                </div>
                <Badge variant="outline">{FREQ_OPTIONS.find((f) => f.value === selectedRota.frequencia)?.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {selectedRota.descricao && <p>{selectedRota.descricao}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Responsável:</span> {selectedRota.responsavel || '—'}</div>
                  <div><span className="text-muted-foreground">Tempo Total:</span> {selectedRota.tempo_estimado_total_min} min</div>
                </div>

                <div className="border-t pt-3">
                  <p className="font-semibold mb-2">Pontos da Rota ({pontosDB?.length || 0})</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {pontosDB?.map((p, i) => (
                      <div key={p.id} className="p-2 rounded border border-border bg-muted/30 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">Item {i + 1}.</span>
                          {p.equipamento_tag && <Badge variant="secondary" className="text-[10px]">{p.equipamento_tag}</Badge>}
                          {p.requer_parada && <Badge variant="destructive" className="text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" /> Parada</Badge>}
                        </div>
                        <p className="mt-0.5">{p.descricao}</p>
                        {p.lubrificante && <p className="text-muted-foreground">Lub: {p.lubrificante} {p.quantidade ? `(${p.quantidade})` : ''}</p>}
                        {p.tempo_estimado_min > 0 && <p className="text-muted-foreground">Tempo: {p.tempo_estimado_min} min</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditForm(selectedRota)}>
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handlePrint()}>
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Selecione uma rota para ver os detalhes.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRota ? 'Editar Rota' : 'Nova Rota de Lubrificação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ex: ROTA-SE-01" />
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))} placeholder="Rota Semanal - Setor A" />
              </div>
              <div className="space-y-1.5">
                <Label>Frequência *</Label>
                <Select value={formData.frequencia} onValueChange={(v) => setFormData((f) => ({ ...f, frequencia: v as FrequenciaRota }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQ_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input value={formData.responsavel || ''} onChange={(e) => setFormData((f) => ({ ...f, responsavel: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={formData.descricao || ''} onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
            </div>

            {/* Pontos */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Pontos de Lubrificação</h3>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setPontos((prev) => [...prev, emptyPonto()])}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
                </Button>
              </div>

              <div className="space-y-3">
                {pontos.map((ponto, index) => (
                  <div key={ponto.key} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-bold text-primary text-sm">{index + 1}</span>
                      <div className="flex gap-1 ml-auto">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, 1)} disabled={index === pontos.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removePonto(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Input placeholder="Descrição do ponto *" value={ponto.descricao} onChange={(e) => updatePonto(index, 'descricao', e.target.value)} className="md:col-span-2" />
                      <Input placeholder="TAG do equipamento" value={ponto.equipamento_tag} onChange={(e) => updatePonto(index, 'equipamento_tag', e.target.value)} />
                      <Input placeholder="Tempo (min)" type="number" value={ponto.tempo_estimado_min || ''} onChange={(e) => updatePonto(index, 'tempo_estimado_min', Number(e.target.value))} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Input placeholder="Localização" value={ponto.localizacao} onChange={(e) => updatePonto(index, 'localizacao', e.target.value)} />
                      <Input placeholder="Lubrificante" value={ponto.lubrificante} onChange={(e) => updatePonto(index, 'lubrificante', e.target.value)} />
                      <Input placeholder="Quantidade" value={ponto.quantidade} onChange={(e) => updatePonto(index, 'quantidade', e.target.value)} />
                      <Input placeholder="Método / Ferramenta" value={ponto.ferramenta} onChange={(e) => updatePonto(index, 'ferramenta', e.target.value)} />
                    </div>

                    <Input placeholder="Instruções / Recomendações" value={ponto.instrucoes} onChange={(e) => updatePonto(index, 'instrucoes', e.target.value)} />

                    <Input placeholder="Referência manual (ex: página 5:15)" value={ponto.referencia_manual} onChange={(e) => updatePonto(index, 'referencia_manual', e.target.value)} />

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`rota-parada-${index}`}
                          checked={ponto.requer_parada}
                          onCheckedChange={(v) => updatePonto(index, 'requer_parada' as any, !!v as any)}
                        />
                        <label htmlFor={`rota-parada-${index}`} className="text-xs flex items-center gap-1 cursor-pointer">
                          <Lock className="h-3 w-3" /> Requer parada de máquina
                        </label>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="URL da imagem do ponto" value={ponto.imagem_url} onChange={(e) => updatePonto(index, 'imagem_url', e.target.value)} className="flex-1 text-xs h-7" />
                      </div>
                    </div>
                    {ponto.imagem_url && (
                      <img src={ponto.imagem_url} alt="Ponto" className="max-h-20 rounded border object-contain" />
                    )}
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground mt-2">
                Tempo total estimado: <strong>{pontos.reduce((a, p) => a + (p.tempo_estimado_min || 0), 0)} min</strong>
              </div>
            </div>

            <Textarea
              placeholder="Observações gerais da rota..."
              value={formData.observacoes || ''}
              onChange={(e) => setFormData((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createRota.isPending || updateRota.isPending || savePontos.isPending}>
                {editingRota ? 'Salvar Alterações' : 'Criar Rota'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden print template */}
      {selectedRota && (
        <div className="hidden">
          <RotaPrintTemplate ref={printRef} rota={selectedRota} pontos={pontosDB || []} empresa={empresa} />
        </div>
      )}
    </div>
  );
}
