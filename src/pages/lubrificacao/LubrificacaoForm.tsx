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
import { Hash, Loader2, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check, Copy, ChevronDown, Lock, Camera } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-border rounded-lg p-4 space-y-4">
      <legend className="px-2 text-sm font-semibold text-primary tracking-wide uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

const formatMinHHMM = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}min`;
};

interface PontoForm {
  key: string;
  descricao: string;
  equipamento_tag: string;
  localizacao: string;
  lubrificante: string;
  lubOverride: boolean;
  quantidade: string;
  ferramenta: string;
  tempo_estimado_min: number;
  instrucoes: string;
  referencia_manual: string;
  requer_parada: boolean;
  imagem_url: string;
  expanded: boolean;
  tagComboOpen?: boolean;
  tagSearch?: string;
}

const emptyPonto = (lubrificantePadrao?: string): PontoForm => ({
  key: `${Date.now()}-${Math.random()}`,
  descricao: '',
  equipamento_tag: '',
  localizacao: '',
  lubrificante: lubrificantePadrao || '',
  lubOverride: false,
  quantidade: '',
  ferramenta: '',
  tempo_estimado_min: 0,
  instrucoes: '',
  referencia_manual: '',
  requer_parada: false,
  imagem_url: '',
  expanded: false,
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
  }, [open, initialData, dataProgramada]);
  useEffect(() => {
    if (!open) return;
    if (initialData && pontosDB && pontosDB.length > 0) {
      const lubPadrao = initialData.lubrificante || '';
      setPontos(pontosDB.map((p) => ({
        key: p.id,
        descricao: p.descricao,
        equipamento_tag: p.equipamento_tag || '',
        localizacao: p.localizacao || '',
        lubrificante: p.lubrificante || '',
        lubOverride: !!(p.lubrificante && p.lubrificante !== lubPadrao),
        quantidade: p.quantidade || '',
        ferramenta: p.ferramenta || '',
        tempo_estimado_min: p.tempo_estimado_min,
        instrucoes: p.instrucoes || '',
        referencia_manual: p.referencia_manual || '',
        requer_parada: p.requer_parada ?? false,
        imagem_url: p.imagem_url || '',
        expanded: false,
      })));
    } else if (!initialData) {
      setPontos([]);
    }
  }, [open, initialData, pontosDB]);

  useEffect(() => {
    if (!open || initialData) return;
    nextNumber.mutate('LUBRIFICACAO', {
  }, [open, initialData, nextNumber]);

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

  const updatePonto = (index: number, field: keyof PontoForm, value: string | number | boolean) => {
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

    // Validate pontos: all must have descricao
    const invalidPontos = pontos.filter((p) => !p.descricao);
    if (invalidPontos.length > 0) {
      toast({ title: 'Pontos incompletos', description: `${invalidPontos.length} ponto(s) sem descrição. Preencha ou remova-os.`, variant: 'destructive' });
      return;
    }

    const isValidUuid = (v: unknown): v is string =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    try {
      const result = await onSubmit({
        ...form,
        equipamento_id: isValidUuid(form.equipamento_id) ? form.equipamento_id : null,
        responsavel_nome: form.responsavel_nome || null,
        proxima_execucao: form.proxima_execucao,
      });

      // Save pontos after plano is persisted
      const planoId = initialData?.id || result?.id;
      if (planoId && pontos.length > 0) {
        const pontosPayload: RotaPontoInsert[] = pontos.map((p, i) => ({
          plano_id: planoId,
          rota_id: null,
          ordem: i,
          codigo_ponto: `P${i + 1}`,
          descricao: p.descricao,
          equipamento_tag: p.equipamento_tag || null,
          localizacao: p.localizacao || null,
          lubrificante: p.lubOverride ? (p.lubrificante || null) : (form.lubrificante || null),
          quantidade: p.quantidade || null,
          ferramenta: p.ferramenta || null,
          tempo_estimado_min: p.tempo_estimado_min || 0,
          instrucoes: p.instrucoes || null,
          referencia_manual: p.referencia_manual || null,
          requer_parada: p.requer_parada,
          imagem_url: p.imagem_url || null,
        }));
        try {
          await savePontos.mutateAsync({ planoId, pontos: pontosPayload });
        } catch (pontoErr) {
          throw new Error(`Plano salvo, mas falha ao salvar pontos: ${pontoErr instanceof Error ? pontoErr.message : String(pontoErr)}`);
        }
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ═══ SEÇÃO 1: IDENTIFICAÇÃO ═══ */}
          <FormSection title="Identificação">
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
                <Label>Nome do Plano *</Label>
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
              {/* R4: ponto_lubrificacao só aparece quando NÃO há pontos detalhados */}
              {pontos.length === 0 && (
                <div className="space-y-2">
                  <Label>Ponto de Lubrificação (plano simples)</Label>
                  <Input value={form.ponto_lubrificacao || ''} onChange={(e) => setField('ponto_lubrificacao', e.target.value)} placeholder="Ex: Mancal lado acoplamento" />
                </div>
              )}
            </div>
          </FormSection>

          {/* ═══ SEÇÃO 2: LUBRIFICAÇÃO ═══ */}
          <FormSection title="Lubrificação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lubrificante Padrão</Label>
                <Input value={form.lubrificante || ''} onChange={(e) => setField('lubrificante', e.target.value)} placeholder="Ex: Graxa Mobil EP2" />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={form.responsavel_nome || ''} onChange={(e) => setField('responsavel_nome', e.target.value)} />
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

            <div className="space-y-2">
              <Label>Escopo / Instruções Gerais</Label>
              <Textarea value={form.descricao || ''} onChange={(e) => setField('descricao', e.target.value)} rows={3} />
            </div>
          </FormSection>

          {/* ═══ SEÇÃO 3: PROGRAMAÇÃO ═══ */}
          <FormSection title="Programação">
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
                <Label>{pontos.length > 0 ? `Tempo Estimado (soma dos pontos: ${form.tempo_estimado || 0} min)` : 'Tempo Estimado (min)'}</Label>
                <Input type="number" value={form.tempo_estimado ?? 0} onChange={(e) => setField('tempo_estimado', Number(e.target.value) || 0)} disabled={pontos.length > 0} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Última Execução</Label>
                <Input type="datetime-local" value={(form.ultima_execucao || '').slice(0, 16)} onChange={(e) => setField('ultima_execucao', new Date(e.target.value).toISOString())} />
              </div>
              <div className="space-y-2">
                <Label>Próxima Execução (automático)</Label>
                <Input value={new Date(form.proxima_execucao || '').toLocaleString('pt-BR')} disabled />
              </div>
            </div>
          </FormSection>

          {/* ═══ PONTOS DE LUBRIFICAÇÃO ═══ */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Pontos de Lubrificação</h3>
                <p className="text-xs text-muted-foreground">Checklist que será impresso na ficha de execução</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setPontos((prev) => [...prev, emptyPonto(form.lubrificante || '')])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
              </Button>
            </div>

            {pontos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                Nenhum ponto cadastrado. Clique em "Adicionar Ponto" para criar o checklist.
              </div>
            )}

            {pontos.map((ponto, index) => (
              <div key={ponto.key} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                {/* Header: nº + actions */}
                <div className="flex items-center gap-2 mb-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold text-primary text-sm">Item {index + 1}</span>
                  <div className="flex gap-1 ml-auto">
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePonto(index, 1)} disabled={index === pontos.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                      const src = pontos[index];
                      const dup: PontoForm = { ...src, key: `${Date.now()}-${Math.random()}` };
                      setPontos((prev) => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]);
                    }} title="Duplicar ponto">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setPontos((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Linha 1: Descrição + Tempo (+ TAG/Local se multi-ativo) */}
                <div className={`grid gap-2 ${!form.equipamento_id ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-[1fr_80px]'}`}>
                  <Input placeholder="Descrição do componente / ponto *" value={ponto.descricao} onChange={(e) => updatePonto(index, 'descricao', e.target.value)} className={!form.equipamento_id ? 'md:col-span-2' : ''} />
                  {/* R2: TAG e Localização só aparecem quando plano NÃO tem equipamento */}
                  {!form.equipamento_id && (
                    <Popover open={ponto.tagComboOpen} onOpenChange={(o) => updatePonto(index, 'tagComboOpen', o)}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between font-normal text-xs h-9 px-2">
                          {ponto.equipamento_tag || 'TAG do ativo...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Buscar TAG..." value={ponto.tagSearch || ''} onValueChange={(v) => updatePonto(index, 'tagSearch', v)} />
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
                                    updatePonto(index, 'tagComboOpen', false);
                                    updatePonto(index, 'tagSearch', '');
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
                  )}
                  <Input placeholder="Tempo (min)" type="number" value={ponto.tempo_estimado_min || ''} onChange={(e) => updatePonto(index, 'tempo_estimado_min', Number(e.target.value))} className="w-full" />
                </div>

                {/* Linha 2: Quantidade + Método/Ferramenta + Instruções + Lub override */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Quantidade" value={ponto.quantidade} onChange={(e) => updatePonto(index, 'quantidade', e.target.value)} />
                  <Input placeholder="Método / Ferramenta" value={ponto.ferramenta} onChange={(e) => updatePonto(index, 'ferramenta', e.target.value)} />
                  <Input placeholder="Instruções / Recomendações" value={ponto.instrucoes} onChange={(e) => updatePonto(index, 'instrucoes', e.target.value)} className="md:col-span-2" />
                </div>

                {/* R3: Lubrificante herdado do plano */}
                <div className="flex items-center gap-2 text-xs">
                  {!ponto.lubOverride ? (
                    <>
                      <span className="text-muted-foreground">Lubrificante: <strong>{form.lubrificante || '(não definido no plano)'}</strong> (herdado do plano)</span>
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => updatePonto(index, 'lubOverride', true)}>
                        Lubrificante diferente?
                      </Button>
                    </>
                  ) : (
                    <div className="flex gap-2 items-center w-full">
                      <Input placeholder="Lubrificante específico" value={ponto.lubrificante} onChange={(e) => updatePonto(index, 'lubrificante', e.target.value)} className="flex-1" />
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs whitespace-nowrap" onClick={() => {
                        updatePonto(index, 'lubOverride', false);
                        updatePonto(index, 'lubrificante', form.lubrificante || '');
                      }}>
                        Usar padrão
                      </Button>
                    </div>
                  )}
                </div>

                {/* Linha 3 (collapsible): Ref. manual + Local + requer_parada + imagem */}
                {(ponto.referencia_manual || ponto.expanded || (!form.equipamento_id && ponto.localizacao) || ponto.requer_parada || ponto.imagem_url) && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {!form.equipamento_id && <Input placeholder="Localização" value={ponto.localizacao} onChange={(e) => updatePonto(index, 'localizacao', e.target.value)} />}
                      <Input placeholder="Ref. manual (ex: MAN-001 pg.42)" value={ponto.referencia_manual} onChange={(e) => updatePonto(index, 'referencia_manual', e.target.value)} />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`parada-${index}`}
                          checked={ponto.requer_parada}
                          onCheckedChange={(v) => updatePonto(index, 'requer_parada', !!v)}
                        />
                        <label htmlFor={`parada-${index}`} className="text-xs flex items-center gap-1 cursor-pointer">
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
                )}
                {!ponto.expanded && !ponto.referencia_manual && (
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => updatePonto(index, 'expanded', true)}>
                    <ChevronDown className="h-3 w-3 mr-1" /> Mais campos
                  </Button>
                )}
              </div>
            ))}

            {pontos.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 flex flex-wrap gap-4 text-xs">
                <span>Pontos: <strong>{pontos.length}</strong></span>
                <span>Tempo total: <strong>{formatMinHHMM(pontos.reduce((a, p) => a + (p.tempo_estimado_min || 0), 0))}</strong></span>
                <span>Lubrificantes distintos: <strong>{new Set(pontos.map((p) => p.lubOverride ? p.lubrificante : form.lubrificante).filter(Boolean)).size}</strong></span>
              </div>
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
