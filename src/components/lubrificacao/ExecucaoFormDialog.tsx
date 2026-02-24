import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCreateExecucaoLubrificacao } from '@/hooks/useLubrificacao';

export default function ExecucaoFormDialog({ open, onOpenChange, planoId }: { open: boolean; onOpenChange: (v: boolean) => void; planoId: string }) {
  const [observacoes, setObservacoes] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const create = useCreateExecucaoLubrificacao();

  const handleSave = () => {
    create.mutate({ plano_id: planoId, observacoes: observacoes || null, quantidade_utilizada: quantidade === '' ? null : Number(quantidade) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Execução</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quantidade utilizada</Label>
            <Input value={quantidade as any} onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
