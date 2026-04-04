import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit, Package, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import {
  useLubrificantes,
  useCreateLubrificante,
  useUpdateLubrificante,
  useDeleteLubrificante,
  useMovimentacoes,
  useCreateMovimentacao,
} from '@/hooks/useEstoqueLubrificantes';
import type {
  Lubrificante,
  LubrificanteInsert,
  TipoLubrificante,
  MovimentacaoLubrificanteInsert,
} from '@/types/lubrificacao';
import { useToast } from '@/hooks/use-toast';

const TIPO_OPTIONS: { value: TipoLubrificante; label: string }[] = [
  { value: 'graxa', label: 'Graxa' },
  { value: 'oleo', label: 'Óleo' },
  { value: 'spray', label: 'Spray' },
  { value: 'outro', label: 'Outro' },
];

function NivelBadge({ atual, minimo }: { atual: number; minimo: number }) {
  if (atual <= 0) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Zerado</Badge>;
  if (atual <= minimo) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Abaixo do mínimo</Badge>;
  if (atual <= minimo * 1.5) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1">Atenção</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>;
}

export default function EstoqueLubrificantes() {
  const { toast } = useToast();
  const { data: lubrificantes, isLoading } = useLubrificantes();
  const createLub = useCreateLubrificante();
  const updateLub = useUpdateLubrificante();
  const deleteLub = useDeleteLubrificante();
  const createMov = useCreateMovimentacao();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [editing, setEditing] = useState<Lubrificante | null>(null);
  const [selectedLub, setSelectedLub] = useState<Lubrificante | null>(null);
  const [formData, setFormData] = useState<LubrificanteInsert>({
    codigo: '', nome: '', tipo: 'graxa', unidade_medida: 'kg',
    estoque_atual: 0, estoque_minimo: 0,
  });
  const [movData, setMovData] = useState<{ tipo: 'entrada' | 'saida'; quantidade: number; observacoes: string }>({
    tipo: 'entrada', quantidade: 0, observacoes: '',
  });

  const { data: movimentacoes } = useMovimentacoes(selectedLub?.id ?? null);

  const filtered = useMemo(() => {
    if (!lubrificantes) return [];
    const s = search.toLowerCase();
    return lubrificantes.filter((l) =>
      !s || l.codigo.toLowerCase().includes(s) || l.nome.toLowerCase().includes(s)
    );
  }, [lubrificantes, search]);

  const openNew = () => {
    setEditing(null);
    setFormData({ codigo: '', nome: '', tipo: 'graxa', unidade_medida: 'kg', estoque_atual: 0, estoque_minimo: 0 });
    setFormOpen(true);
  };

  const openEdit = (lub: Lubrificante) => {
    setEditing(lub);
    setFormData({
      codigo: lub.codigo, nome: lub.nome, fabricante: lub.fabricante, tipo: lub.tipo,
      viscosidade: lub.viscosidade, unidade_medida: lub.unidade_medida,
      estoque_atual: lub.estoque_atual, estoque_minimo: lub.estoque_minimo,
      cor_identificacao: lub.cor_identificacao,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.codigo || !formData.nome) {
      toast({ title: 'Preencha código e nome', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateLub.mutateAsync({ id: editing.id, ...formData });
    } else {
      await createLub.mutateAsync(formData);
    }
    toast({ title: editing ? 'Lubrificante atualizado' : 'Lubrificante criado' });
    setFormOpen(false);
  };

  const handleDelete = async (lub: Lubrificante) => {
    if (!confirm(`Excluir ${lub.codigo} - ${lub.nome}?`)) return;
    await deleteLub.mutateAsync(lub.id);
    if (selectedLub?.id === lub.id) setSelectedLub(null);
  };

  const handleMov = async () => {
    if (!selectedLub || movData.quantidade <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    await createMov.mutateAsync({
      lubrificante_id: selectedLub.id,
      tipo: movData.tipo,
      quantidade: movData.quantidade,
      observacoes: movData.observacoes || null,
    });
    toast({ title: `${movData.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada` });
    setMovOpen(false);
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Estoque de Lubrificantes
          </h2>
          <p className="text-sm text-muted-foreground">{lubrificantes?.length || 0} itens cadastrados</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Lubrificante</Button>
      </div>

      <Input placeholder="Buscar por código ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

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
                      <th>Tipo</th>
                      <th>Estoque</th>
                      <th>Nível</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum lubrificante encontrado.</td></tr>
                    ) : (
                      filtered.map((lub) => (
                        <tr key={lub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLub(lub)}>
                          <td className="font-mono font-semibold text-primary">
                            <div className="flex items-center gap-2">
                              {lub.cor_identificacao && (
                                <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: lub.cor_identificacao }} />
                              )}
                              {lub.codigo}
                            </div>
                          </td>
                          <td>{lub.nome}</td>
                          <td><Badge variant="outline">{TIPO_OPTIONS.find((t) => t.value === lub.tipo)?.label || lub.tipo}</Badge></td>
                          <td className="font-mono">{lub.estoque_atual} {lub.unidade_medida}</td>
                          <td><NivelBadge atual={lub.estoque_atual} minimo={lub.estoque_minimo} /></td>
                          <td>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(lub)}><Edit className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(lub)}><Trash2 className="h-4 w-4" /></Button>
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
          {selectedLub ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {selectedLub.cor_identificacao && (
                    <span className="inline-block w-4 h-4 rounded-full border" style={{ backgroundColor: selectedLub.cor_identificacao }} />
                  )}
                  <CardTitle>{selectedLub.nome}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{selectedLub.codigo}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Tipo:</span> {TIPO_OPTIONS.find((t) => t.value === selectedLub.tipo)?.label}</div>
                  <div><span className="text-muted-foreground">Fabricante:</span> {selectedLub.fabricante || '—'}</div>
                  <div><span className="text-muted-foreground">Viscosidade:</span> {selectedLub.viscosidade || '—'}</div>
                  <div><span className="text-muted-foreground">Unidade:</span> {selectedLub.unidade_medida}</div>
                  <div className="font-semibold"><span className="text-muted-foreground">Estoque:</span> {selectedLub.estoque_atual} {selectedLub.unidade_medida}</div>
                  <div><span className="text-muted-foreground">Mínimo:</span> {selectedLub.estoque_minimo} {selectedLub.unidade_medida}</div>
                </div>
                <NivelBadge atual={selectedLub.estoque_atual} minimo={selectedLub.estoque_minimo} />

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={() => { setMovData({ tipo: 'entrada', quantidade: 0, observacoes: '' }); setMovOpen(true); }}>
                    <ArrowDownCircle className="h-3.5 w-3.5" /> Entrada
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => { setMovData({ tipo: 'saida', quantidade: 0, observacoes: '' }); setMovOpen(true); }}>
                    <ArrowUpCircle className="h-3.5 w-3.5" /> Saída
                  </Button>
                </div>

                {movimentacoes && movimentacoes.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="font-semibold text-xs mb-2">Últimas movimentações</p>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {movimentacoes.slice(0, 20).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            {m.tipo === 'entrada' ? <ArrowDownCircle className="h-3 w-3 text-green-600" /> : <ArrowUpCircle className="h-3 w-3 text-red-600" />}
                            <span>{m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}</span>
                          </div>
                          <span className="text-muted-foreground">{new Date(m.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Selecione um lubrificante.</CardContent></Card>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Lubrificante' : 'Novo Lubrificante'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData((f) => ({ ...f, tipo: v as TipoLubrificante }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Input value={formData.fabricante || ''} onChange={(e) => setFormData((f) => ({ ...f, fabricante: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Viscosidade</Label>
                <Input value={formData.viscosidade || ''} onChange={(e) => setFormData((f) => ({ ...f, viscosidade: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade *</Label>
                <Select value={formData.unidade_medida} onValueChange={(v) => setFormData((f) => ({ ...f, unidade_medida: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="un">Unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estoque Atual</Label>
                <Input type="number" value={formData.estoque_atual ?? 0} onChange={(e) => setFormData((f) => ({ ...f, estoque_atual: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={formData.estoque_minimo ?? 0} onChange={(e) => setFormData((f) => ({ ...f, estoque_minimo: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={formData.cor_identificacao || '#3B82F6'} onChange={(e) => setFormData((f) => ({ ...f, cor_identificacao: e.target.value }))} className="w-10 h-9 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{formData.cor_identificacao || 'Padrão'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createLub.isPending || updateLub.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movimentação Dialog */}
      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{movData.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quantidade ({selectedLub?.unidade_medida})</Label>
              <Input type="number" value={movData.quantidade || ''} onChange={(e) => setMovData((m) => ({ ...m, quantidade: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={movData.observacoes} onChange={(e) => setMovData((m) => ({ ...m, observacoes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMovOpen(false)}>Cancelar</Button>
              <Button onClick={handleMov} disabled={createMov.isPending}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
