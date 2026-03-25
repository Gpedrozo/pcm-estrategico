import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert } from '@/types/lubrificacao';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import { useNextDocumentNumber } from '@/hooks/useDocumentEngine';
import { Hash, Loader2 } from 'lucide-react';

interface LubrificacaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentos: EquipamentoRow[];
  initialData?: PlanoLubrificacao | null;
  onSubmit: (data: PlanoLubrificacaoInsert) => Promise<void>;
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
  const nextNumber = useNextDocumentNumber();
  const [form, setForm] = useState<PlanoLubrificacaoInsert>({
    codigo: '',
    nome: '',
    equipamento_id: null,
    tag: null,
    localizacao: null,
    ponto_lubrificacao: '',
    descricao: '',
    lubrificante: '',
    quantidade: 0,
    periodicidade: 30,
    tipo_periodicidade: 'dias',
    tempo_estimado: 60,
    responsavel: '',
    prioridade: 'media',
    ultima_execucao: new Date().toISOString(),
    proxima_execucao: addPeriod(new Date().toISOString(), 'dias', 30),
    status: 'programado',
    ativo: true,
  });

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
        tag: null,
        localizacao: null,
        ponto_lubrificacao: '',
        descricao: '',
        lubrificante: '',
        quantidade: 0,
        periodicidade: 30,
        tipo_periodicidade: 'dias',
        tempo_estimado: 60,
        responsavel: '',
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
      tag: initialData.tag,
      localizacao: initialData.localizacao,
      ponto_lubrificacao: initialData.ponto_lubrificacao || initialData.ponto || '',
      descricao: initialData.descricao || initialData.observacoes || '',
      lubrificante: initialData.lubrificante || initialData.tipo_lubrificante || '',
      quantidade: initialData.quantidade,
      periodicidade: initialData.periodicidade || initialData.periodicidade_valor || 30,
      tipo_periodicidade: initialData.tipo_periodicidade || 'dias',
      tempo_estimado: initialData.tempo_estimado || initialData.tempo_estimado_min || 60,
      responsavel: initialData.responsavel,
      prioridade: initialData.prioridade || 'media',
      ultima_execucao: initialData.ultima_execucao || new Date().toISOString(),
      proxima_execucao: initialData.proxima_execucao || new Date().toISOString(),
      status: initialData.status || 'programado',
      ativo: initialData.ativo,
    });
  }, [open, initialData]);

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

  const setField = <K extends keyof PlanoLubrificacaoInsert>(key: K, value: PlanoLubrificacaoInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await onSubmit({
      ...form,
      tag: form.tag || null,
      localizacao: form.localizacao || null,
      periodicidade_valor: Number(form.periodicidade || 0),
      periodicidade_tipo: (form.tipo_periodicidade || 'dias').toUpperCase() as 'DIAS' | 'SEMANAS' | 'MESES' | 'HORAS',
      tempo_estimado_min: Number(form.tempo_estimado || 0),
      ponto: form.ponto_lubrificacao,
      observacoes: form.descricao,
      tipo_lubrificante: form.lubrificante,
      proxima_execucao: form.proxima_execucao,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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

                  const equipamento = equipamentos.find((item) => item.id === value);
                  setForm((prev) => ({
                    ...prev,
                    equipamento_id: value,
                    tag: equipamento?.tag || prev.tag || null,
                    localizacao: equipamento?.localizacao || prev.localizacao || null,
                  }));
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
              <Label>TAG vinculada (opcional)</Label>
              <Input value={form.tag || ''} onChange={(e) => setField('tag', e.target.value || null)} placeholder="Ex: EQ-1001" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rota / Setor / Estrutura (opcional)</Label>
              <Input value={form.localizacao || ''} onChange={(e) => setField('localizacao', e.target.value || null)} placeholder="Ex: Linha 2 > Misturador > Mancal A" />
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
              <Label>Quantidade</Label>
              <Input type="number" step="0.01" value={form.quantidade ?? 0} onChange={(e) => setField('quantidade', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel || ''} onChange={(e) => setField('responsavel', e.target.value)} />
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initialData ? 'Salvar Alterações' : 'Criar Plano'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
