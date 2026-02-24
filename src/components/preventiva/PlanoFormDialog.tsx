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
    tag: '',
    tipo_gatilho: 'TEMPO' as 'TEMPO' | 'CICLO' | 'CONDICAO',
    frequencia_dias: 30,
    tempo_estimado_min: 60,
    especialidade: '',
    instrucoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(form);
    onOpenChange(false);
    setForm({ codigo: '', nome: '', descricao: '', tag: '', tipo_gatilho: 'TEMPO', frequencia_dias: 30, tempo_estimado_min: 60, especialidade: '', instrucoes: '' });
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
              <Label>TAG Equipamento</Label>
              <Select value={form.tag} onValueChange={v => set('tag', v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {equipamentos.filter(e => e.ativo).map(e => (
                    <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2">
              <Label>Frequência (dias)</Label>
              <Input type="number" value={form.frequencia_dias} onChange={e => set('frequencia_dias', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Tempo Est. (min)</Label>
              <Input type="number" value={form.tempo_estimado_min} onChange={e => set('tempo_estimado_min', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instruções</Label>
            <Textarea value={form.instrucoes} onChange={e => set('instrucoes', e.target.value)} rows={3} placeholder="Instruções detalhadas para execução..." />
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
