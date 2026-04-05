import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useNextDocumentNumber } from '@/hooks/useDocumentEngine';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import { useFormDraft } from '@/hooks/useFormDraft';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentos: EquipamentoRow[];
}

const INITIAL_FORM = {
  nome: '',
  descricao: '',
  equipamento_id: '',
  tipo_gatilho: 'TEMPO' as 'TEMPO' | 'CICLO' | 'CONDICAO',
  frequencia_dias: 30,
  frequencia_ciclos: 0,
  condicao_disparo: '',
  tolerancia_antes_dias: 0,
  tolerancia_depois_dias: 0,
  tempo_estimado_min: 60,
  instrucoes: '',
};

export default function PlanoFormDialog({ open, onOpenChange, equipamentos }: Props) {
  const createMutation = useCreatePlanoPreventivo();
  const nextDocNumber = useNextDocumentNumber();
  const [form, setForm] = useState(INITIAL_FORM);
  const { clearDraft: clearPlanoPrevDraft } = useFormDraft('draft:plano-preventivo', form, setForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Gerar código sequencial automático
    const codigo = await nextDocNumber.mutateAsync('PREVENTIVA');

    const equipamentoSelecionado = equipamentos.find((eq) => eq.id === form.equipamento_id);
    await createMutation.mutateAsync({
      ...form,
      codigo,
      equipamento_id: equipamentoSelecionado?.id || null,
      tag: equipamentoSelecionado?.tag || null,
      frequencia_ciclos: form.tipo_gatilho === 'CICLO' ? form.frequencia_ciclos : null,
      condicao_disparo: form.tipo_gatilho === 'CONDICAO' ? form.condicao_disparo : null,
    });

    onOpenChange(false);
    clearPlanoPrevDraft();
    setForm(INITIAL_FORM);
  };

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Plano Preventivo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Equipamento (opcional)</Label>
            <Select
              value={form.equipamento_id || 'none'}
              onValueChange={value => {
                set('equipamento_id', value === 'none' ? '' : value);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar equipamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não vincular agora</SelectItem>
                {equipamentos.filter(e => e.ativo).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.tag} — {e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do Plano *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Manutenção preventiva mensal" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo Gatilho</Label>
              <Select value={form.tipo_gatilho} onValueChange={v => set('tipo_gatilho', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEMPO">Tempo</SelectItem>
                  <SelectItem value="CICLO">Ciclo</SelectItem>
                  <SelectItem value="CONDICAO">Condição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo_gatilho === 'TEMPO' && (
              <div className="space-y-2">
                <Label>Frequência (dias)</Label>
                <Input type="number" value={form.frequencia_dias} onChange={e => set('frequencia_dias', parseInt(e.target.value) || 0)} />
              </div>
            )}
            {form.tipo_gatilho === 'CICLO' && (
              <div className="space-y-2">
                <Label>Frequência (ciclos)</Label>
                <Input type="number" value={form.frequencia_ciclos} onChange={e => set('frequencia_ciclos', parseInt(e.target.value) || 0)} />
              </div>
            )}
            {form.tipo_gatilho === 'CONDICAO' && (
              <div className="space-y-2">
                <Label>Condição de disparo</Label>
                <Input value={form.condicao_disparo} onChange={e => set('condicao_disparo', e.target.value)} placeholder="Ex: Vibração > 10mm/s" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Tempo Est. (min)</Label>
              <Input type="number" value={form.tempo_estimado_min} onChange={e => set('tempo_estimado_min', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tolerância antes (dias)</Label>
              <Input type="number" value={form.tolerancia_antes_dias} onChange={e => set('tolerancia_antes_dias', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Tolerância depois (dias)</Label>
              <Input type="number" value={form.tolerancia_depois_dias} onChange={e => set('tolerancia_depois_dias', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instruções</Label>
            <Textarea value={form.instrucoes} onChange={e => set('instrucoes', e.target.value)} rows={3} placeholder="Instruções detalhadas para execução..." />
          </div>
          <p className="text-xs text-muted-foreground">O código será gerado automaticamente (ex: PR-000001).</p>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={createMutation.isPending || nextDocNumber.isPending}>
              {createMutation.isPending || nextDocNumber.isPending ? 'Criando...' : 'Criar Plano'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
