import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAtividadesByPlano, useCreateAtividade, useUpdateAtividade, useDeleteAtividade } from '@/hooks/useAtividadesLubrificacao';
import type { AtividadeLubrificacao } from '@/types/lubrificacao';

export default function AtividadesList({ planoId }: { planoId: string }) {
  const { data: atividades } = useAtividadesByPlano(planoId);
  const create = useCreateAtividade();
  const update = useUpdateAtividade();
  const del = useDeleteAtividade();

  const [editing, setEditing] = useState<AtividadeLubrificacao | null>(null);
  const [novoDesc, setNovoDesc] = useState('');

  const handleCreate = () => {
    if (!novoDesc) return;
    create.mutate({ plano_id: planoId, descricao: novoDesc, tempo_estimado_min: 5, responsavel: null, tipo: 'GERAL', ordem: atividades ? atividades.length + 1 : 1 });
    setNovoDesc('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nova atividade" value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} />
        <Button onClick={handleCreate}>Adicionar</Button>
      </div>

      <div className="space-y-2">
        {!atividades || atividades.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma atividade cadastrada</div>
        ) : (
          atividades.map(a => (
            <div key={a.id} className="p-2 border rounded flex items-start justify-between">
              <div>
                <div className="font-medium">{a.descricao}</div>
                <div className="text-xs text-muted-foreground">{a.tipo} • {a.tempo_estimado_min ?? '—'} min</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(a)}>Editar</Button>
                <Button variant="destructive" onClick={() => del.mutate({ id: a.id, plano_id: planoId })}>Excluir</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div className="p-3 border rounded space-y-2">
          <Label>Descrição</Label>
          <Input value={editing.descricao} onChange={(e) => setEditing({ ...editing, descricao: e.target.value }) as any} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => { update.mutate(editing as any); setEditing(null); }}>Salvar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
