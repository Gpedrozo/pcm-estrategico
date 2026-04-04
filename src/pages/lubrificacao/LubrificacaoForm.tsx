import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert, RotaPontoInsert } from '@/types/lubrificacao';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import { usePontosPlano, useSavePontosPlano } from '@/hooks/usePontosPlano';
import { useNextDocumentNumber } from '@/hooks/useDocumentEngine';
import { Hash, Loader2, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';

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
  tagComboOpen?: boolean;
  tagSearch?: string;
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
});

interface LubrificacaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentos: EquipamentoRow[];
  initialData?: PlanoLubrificacao | null;
  onSubmit: (data: PlanoLubrificacaoInsert) => Promise<any>;
  dataProgramada?: string;
}

const addPeriod = (baseIso: string, tipo: 'dias' | 'semanas' | 'meses' | 'horas', valor: number) => {
  const d = new Date(baseIso);
  if (tipo === 'dias') d.setDate(d.getDate() + valor);
  if (tipo === 'semanas') d.setDate(d.getDate() + valor * 7);
  if (tipo === 'meses') d.setMonth(d.getMonth() + valor);
  if (tipo === 'horas') d.setHours(d.getHours() + valor);
  return d.toISOString();
};

export function LubrificacaoForm({ open, onOpenChange, equipamentos, initialData, onSubmit, dataProgramada }: LubrificacaoFormProps) {
  const { toast } = useToast();
  const nextNumber = useNextDocumentNumber();
  const savePontos = useSavePontosPlano();
  const { data: pontosDB } = usePontosPlano(initialData?.id);
  const [pontos, setPontos] = useState<PontoForm[]>([]);
  const equipamentosAtivos = equipamentos.filter((eq) => eq.ativo);
  const [form, setForm] = useState<PlanoLubrificacaoInsert>({
    codigo: '',
    nome: '',
    equipamento_id: null,
    ponto_lubrificacao: '',
    descricao: '',
    lubrificante: '',
    periodicidade: 30,
    tipo_periodicidade: 'dias',
    tempo_estimado: 60,
    responsavel_nome: '',
    prioridade: 'media',
    ultima_execucao: new Date().toISOString(),
    proxima_execucao: addPeriod(new Date().toISOString(), 'dias', 30),
    status: 'programado',
    ativo: true,
  });
  const { clearDraft: clearLubDraft } = useFormDraft('draft:lubrificacao', form, setForm);

  useEffect(() => {
    if (!open) return;
    if (!initialData) {
      const now = new Date().toISOString();
      const proxExec = dataProgramada
        ? new Date(dataProgramada + 'T08:00:00').toISOString()
        : addPeriod(now, 'dias', 30);
      setForm({
        codigo: '',
        nome: '',
        equipamento_id: null,
        ponto_lubrificacao: '',
        descricao: '',
        lubrificante: '',
        periodicidade: 30,
        tipo_periodicidade: 'dias',
        tempo_estimado: 60,
        responsavel_nome: '',
        prioridade: 'media',
        ultima_execucao: now,
        proxima_execucao: proxExec,
        status: 'programado',
        ativo: true,
      });
      return;
    }

    setForm({
      codigo: initialData.codigo,
      nome: initialData.nome,
      equipamento_id: initialData.equipamento_id,
      ponto_lubrificacao: initialData.ponto_lubrificacao || '',
      descricao: initialData.descricao || '',
      lubrificante: initialData.lubrificante || '',
      periodicidade: initialData.periodicidade || 30,
      tipo_periodicidade: initialData.tipo_periodicidade || 'dias',
      tempo_estimado: initialData.tempo_estimado || 60,
      responsavel_nome: initialData.responsavel_nome || '',
      prioridade: initialData.prioridade || 'media',
      ultima_execucao: initialData.ultima_execucao || new Date().toISOString(),
      proxima_execucao: initialData.proxima_execucao || new Date().toISOString(),
      status: initialData.status || 'programado',
      ativo: initialData.ativo,
    });
  }, [open, initialData]);

  // Load existing pontos when editing
  useEffect(() => {
    if (!open) return;
    if (initialData && pontosDB && pontosDB.length > 0) {
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
      })));
    } else if (!initialData) {
      setPontos([]);
    }
  }, [open, initialData, pontosDB]);

  useEffect(() => {
    if (!open || initialData) return;
    nextNumber.mutate('LUBRIFICACAO', {
      onSuccess: (codigo) => {
        setForm((prev) => ({ ...prev, codigo }));
      },
    });
  }, [open, initialData]);

  const nextExecution = useMemo(() => {
    const base = form.ultima_execucao || new Date().toISOString();
    const tipo = form.tipo_periodicidade || 'dias';
    const valor = Number(form.periodicidade || 0);
    return addPeriod(base, tipo, valor);
  }, [form.ultima_execucao, form.tipo_periodicidade, form.periodicidade]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, proxima_execucao: nextExecution }));
  }, [nextExecution]);

  // Auto-calculate tempo_estimado from pontos when pontos exist
  useEffect(() => {
    if (pontos.length === 0) return;
    const total = pontos.reduce((sum, p) => sum + (p.tempo_estimado_min || 0), 0);
    if (total > 0) {
      setForm((prev) => ({ ...prev, tempo_estimado: total }));
    }
  }, [pontos]);

  const setField = <K extends keyof PlanoLubrificacaoInsert>(key: K, value: PlanoLubrificacaoInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePonto = (index: number, field: keyof PontoForm, value: string | number) => {
    setPontos((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const movePonto = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= pontos.length) return;
    const arr = [...pontos];
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    setPontos(arr);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate pontos: all must have codigo_ponto and descricao
    const invalidPontos = pontos.filter((p) => !p.codigo_ponto || !p.descricao);
    if (invalidPontos.length > 0) {
      toast({ title: 'Pontos incompletos', description: `${invalidPontos.length} ponto(s) sem código ou descrição. Preencha ou remova-os.`, variant: 'destructive' });
      return;
    }

    try {
      const result = await onSubmit({
        ...form,
        responsavel_nome: form.responsavel_nome || null,
        proxima_execucao: form.proxima_execucao,
      });

      // Save pontos after plano is persisted
      const planoId = initialData?.id || result?.id;
      if (planoId) {
        const pontosPayload: RotaPontoInsert[] = pontos.map((p, i) => ({
          plano_id: planoId,
          rota_id: null,
          ordem: i,
          codigo_ponto: p.codigo_ponto,
          descricao: p.descricao,
          equipamento_tag: p.equipamento_tag || null,
          localizacao: p.localizacao || null,
          lubrificante: p.lubrificante || null,
          quantidade: p.quantidade || null,
          ferramenta: p.ferramenta || null,
          tempo_estimado_min: p.tempo_estimado_min || 0,
          instrucoes: p.instrucoes || null,
          referencia_manual: p.referencia_manual || null,
        }));
        await savePontos.mutateAsync({ planoId, pontos: pontosPayload });
      }

      clearLubDraft();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Falha ao salvar plano ou pontos.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Plano de Lubrificação' : 'Novo Plano de Lubrificação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.codigo || ''}
                  onChange={(e) => setField('codigo', e.target.value.toUpperCase())}
                  placeholder="LB-000001"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => nextNumber.mutate('LUBRIFICACAO', { onSuccess: (codigo) => setField('codigo', codigo) })}
                  disabled={nextNumber.isPending}
                  title="Gerar próximo código"
                >
                  {nextNumber.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição do Plano *</Label>
              <Input value={form.nome || ''} onChange={(e) => setField('nome', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select
                value={form.equipamento_id || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setForm((prev) => ({ ...prev, equipamento_id: null }));
                    return;
                  }
                  setForm((prev) => ({ ...prev, equipamento_id: value }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {equipamentos.filter((item) => item.ativo).map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.tag} - {item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ponto de Lubrificação (opcional)</Label>
              <Input value={form.ponto_lubrificacao || ''} onChange={(e) => setField('ponto_lubrificacao', e.target.value)} placeholder="Ex: Mancal lado acoplamento" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lubrificante (opcional)</Label>
              <Input value={form.lubrificante || ''} onChange={(e) => setField('lubrificante', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel_nome || ''} onChange={(e) => setField('responsavel_nome', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Input type="number" value={form.periodicidade ?? 0} onChange={(e) => setField('periodicidade', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo_periodicidade || 'dias'} onValueChange={(value: 'dias' | 'semanas' | 'meses' | 'horas') => setField('tipo_periodicidade', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dias">Dias</SelectItem>
                  <SelectItem value="semanas">Semanas</SelectItem>
                  <SelectItem value="meses">Meses</SelectItem>
                  <SelectItem value="horas">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tempo Estimado (min)</Label>
              <Input type="number" value={form.tempo_estimado ?? 0} onChange={(e) => setField('tempo_estimado', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade || 'media'} onValueChange={(value: 'baixa' | 'media' | 'alta' | 'critica') => setField('prioridade', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Última Execução</Label>
              <Input type="datetime-local" value={(form.ultima_execucao || '').slice(0, 16)} onChange={(e) => setField('ultima_execucao', new Date(e.target.value).toISOString())} />
            </div>
            <div className="space-y-2">
              <Label>Próxima Execução (automático)</Label>
              <Input value={new Date(form.proxima_execucao || '').toLocaleString('pt-BR')} disabled />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status || 'programado'} onValueChange={(value) => setField('status', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="executado">Executado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao || ''} onChange={(e) => setField('descricao', e.target.value)} rows={3} />
          </div>

          {/* ═══ PONTOS DA ROTA ═══ */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Pontos da Rota de Lubrificação</h3>
                <p className="text-xs text-muted-foreground">Checklist que será impresso na ficha de execução</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setPontos((prev) => [...prev, emptyPonto()])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
              </Button>
            </div>

            {pontos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                Nenhum ponto cadastrado. Clique em "Adicionar Ponto" para criar o checklist da rota.
              </div>
            )}

            {pontos.map((ponto, index) => (
              <div key={ponto.key} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold text-primary text-sm">{index + 1}</span>
                  <div className="flex gap-1 ml-auto">
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, 1)} disabled={index === pontos.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setPontos((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Código (ex: 8.1.1)" value={ponto.codigo_ponto} onChange={(e) => updatePonto(index, 'codigo_ponto', e.target.value)} />
                  {/* TAG with combobox */}
                  <Popover open={ponto.tagComboOpen} onOpenChange={(o) => updatePonto(index, 'tagComboOpen' as any, o as any)}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between font-normal text-xs h-9 px-2">
                        {ponto.equipamento_tag || 'TAG do ativo...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar TAG..." value={ponto.tagSearch || ''} onValueChange={(v) => updatePonto(index, 'tagSearch' as any, v as any)} />
                        <CommandList>
                          <CommandEmpty>Nenhum equipamento.</CommandEmpty>
                          <CommandGroup>
                            {equipamentosAtivos
                              .filter((eq) => !ponto.tagSearch || eq.tag.toLowerCase().includes((ponto.tagSearch || '').toLowerCase()) || eq.nome.toLowerCase().includes((ponto.tagSearch || '').toLowerCase()))
                              .slice(0, 30)
                              .map((eq) => (
                                <CommandItem key={eq.id} value={eq.tag} onSelect={() => {
                                  updatePonto(index, 'equipamento_tag', eq.tag);
                                  updatePonto(index, 'localizacao', eq.localizacao || '');
                                  updatePonto(index, 'tagComboOpen' as any, false as any);
                                  updatePonto(index, 'tagSearch' as any, '' as any);
                                }}>
                                  <Check className={`mr-2 h-3 w-3 ${ponto.equipamento_tag === eq.tag ? 'opacity-100' : 'opacity-0'}`} />
                                  <span className="font-mono text-xs">{eq.tag}</span>
                                  <span className="ml-1 text-muted-foreground text-xs truncate">{eq.nome}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input placeholder="Localização" value={ponto.localizacao} onChange={(e) => updatePonto(index, 'localizacao', e.target.value)} />
                  <Input placeholder="Tempo (min)" type="number" value={ponto.tempo_estimado_min || ''} onChange={(e) => updatePonto(index, 'tempo_estimado_min', Number(e.target.value))} />
                </div>

                <Input placeholder="Descrição do ponto *" value={ponto.descricao} onChange={(e) => updatePonto(index, 'descricao', e.target.value)} />

                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Lubrificante" value={ponto.lubrificante} onChange={(e) => updatePonto(index, 'lubrificante', e.target.value)} />
                  <Input placeholder="Quantidade" value={ponto.quantidade} onChange={(e) => updatePonto(index, 'quantidade', e.target.value)} />
                  <Input placeholder="Ferramenta" value={ponto.ferramenta} onChange={(e) => updatePonto(index, 'ferramenta', e.target.value)} />
                </div>

                <Input placeholder="Instruções / Recomendações" value={ponto.instrucoes} onChange={(e) => updatePonto(index, 'instrucoes', e.target.value)} />
                <Input placeholder="Ref. manual (ex: MAN-001 pg.42)" value={ponto.referencia_manual} onChange={(e) => updatePonto(index, 'referencia_manual', e.target.value)} />
              </div>
            ))}

            {pontos.length > 0 && (
              <p className="text-xs text-muted-foreground">Tempo total estimado: <strong>{pontos.reduce((a, p) => a + (p.tempo_estimado_min || 0), 0)} min</strong></p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={savePontos.isPending}>{initialData ? 'Salvar Alterações' : 'Criar Plano'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
