import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useMecanicos } from '@/hooks/useMecanicos';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import { useFormDraft } from '@/hooks/useFormDraft';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentos: EquipamentoRow[];
}

export default function PlanoFormDialog({ open, onOpenChange, equipamentos }: Props) {
  const createMutation = useCreatePlanoPreventivo();
  const { data: mecanicos } = useMecanicos();
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    equipamento_id: '',
    tag: '',
    tipo_gatilho: 'TEMPO' as 'TEMPO' | 'CICLO' | 'CONDICAO',
    frequencia_dias: 30,
    frequencia_ciclos: 0,
    condicao_disparo: '',
    tolerancia_antes_dias: 0,
    tolerancia_depois_dias: 0,
    tempo_estimado_min: 60,
    especialidade: '',
    instrucoes: '',
    checklist: '',
    materiais_previstos: '',
  });
  const { clearDraft: clearPlanoPrevDraft } = useFormDraft('draft:plano-preventivo', form, setForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const equipamentoSelecionado = equipamentos.find((e) => e.id === form.equipamento_id);
    const checklistArr = form.checklist.trim() ? form.checklist.split('\n').map(s => s.trim()).filter(Boolean) : null;
    const materiaisArr = form.materiais_previstos.trim() ? form.materiais_previstos.split('\n').map(s => s.trim()).filter(Boolean) : null;
    await createMutation.mutateAsync({
      ...form,
      equipamento_id: equipamentoSelecionado?.id || null,
      tag: equipamentoSelecionado?.tag || form.tag || null,
      frequencia_ciclos: form.tipo_gatilho === 'CICLO' ? form.frequencia_ciclos : null,
      condicao_disparo: form.tipo_gatilho === 'CONDICAO' ? form.condicao_disparo : null,
      checklist: checklistArr,
      materiais_previstos: materiaisArr,
    });

    onOpenChange(false);
    clearPlanoPrevDraft();
    setForm({ codigo: '', nome: '', descricao: '', equipamento_id: '', tag: '', tipo_gatilho: 'TEMPO', frequencia_dias: 30, frequencia_ciclos: 0, condicao_disparo: '', tolerancia_antes_dias: 0, tolerancia_depois_dias: 0, tempo_estimado_min: 60, especialidade: '', instrucoes: '', checklist: '', materiais_previstos: '' });
  };

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Plano Preventivo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} required placeholder="PP-001" />
            </div>
            <div className="space-y-2">
              <Label>Equipamento (opcional)</Label>
              <Select
                value={form.equipamento_id || 'none'}
                onValueChange={value => {
                  if (value === 'none') {
                    set('equipamento_id', '');
                    return;
                  }
                  const equipamento = equipamentos.find((item) => item.id === value);
                  set('equipamento_id', value);
                  set('tag', equipamento?.tag || '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não vincular agora</SelectItem>
                  {equipamentos.filter(e => e.ativo).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.tag} - {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>TAG (opcional)</Label>
            <Input value={form.tag} onChange={e => set('tag', e.target.value.toUpperCase())} placeholder="Ex: EQ-1001" />
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
          <div className="space-y-2">
            <Label>Checklist (um item por linha)</Label>
            <Textarea value={form.checklist} onChange={e => set('checklist', e.target.value)} rows={3} placeholder="Verificar nível de óleo&#10;Inspecionar correias&#10;Testar alarmes" />
          </div>
          <div className="space-y-2">
            <Label>Materiais previstos (um por linha)</Label>
            <Textarea value={form.materiais_previstos} onChange={e => set('materiais_previstos', e.target.value)} rows={2} placeholder="Óleo SAE 40 – 2L&#10;Filtro modelo XYZ" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Plano'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
