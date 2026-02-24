import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePlanoLubrificacao } from '@/hooks/useLubrificacao';
import type { PlanoLubrificacaoInsert } from '@/types/lubrificacao';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function PlanoFormDialog({ open, onOpenChange }: Props) {
  const create = useCreatePlanoLubrificacao();

  const handleCreate = async () => {
    const payload: PlanoLubrificacaoInsert = {
      codigo: `L-${Date.now()}`,
      nome: 'Novo Plano',
      tempo_estimado_min: 10,
      ativo: true,
    } as any;
    create.mutate(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Plano de Lubrificação</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
