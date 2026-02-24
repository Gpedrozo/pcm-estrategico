import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Camera } from 'lucide-react';
import type { PlanoLubrificacao } from '@/types/lubrificacao';
import { useCreateExecucaoLubrificacao, useExecucoesByPlanoLubrificacao } from '@/hooks/useLubrificacao';
import ExecucaoFormDialog from '@/components/lubrificacao/ExecucaoFormDialog';

export default function PlanoDetailPanel({ plano }: { plano: PlanoLubrificacao }) {
  const { data: execucoes } = useExecucoesByPlanoLubrificacao(plano.id);
  const createExec = useCreateExecucaoLubrificacao();
  const [openExec, setOpenExec] = React.useState(false);

  const handleGenerate = () => {
    createExec.mutate({ plano_id: plano.id });
  };
  return (
    <div className="h-full overflow-auto">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{plano.nome}</h2>
            <p className="text-sm text-muted-foreground">Código: {plano.codigo}</p>
            {plano.tag && <p className="text-sm text-muted-foreground">TAG: {plano.tag}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost"><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p><strong>Equipamento:</strong> {plano.equipamento_id || '—'}</p>
          <p><strong>Localização:</strong> {plano.localizacao || '—'}</p>
          <p><strong>Ponto:</strong> {plano.ponto || '—'}</p>
          <p><strong>Lubrificante:</strong> {plano.tipo_lubrificante || '—'}</p>
          <p><strong>Quantidade prevista:</strong> {plano.quantidade ?? '—'}</p>
          <p><strong>Periodicidade:</strong> {plano.periodicidade_valor || '—'} {plano.periodicidade_tipo || ''}</p>
          <p><strong>Tempo estimado:</strong> {plano.tempo_estimado_min} min</p>
        </div>

        <div className="mt-4">
          <h3 className="font-medium">Instruções</h3>
          <p className="text-sm text-muted-foreground">{plano.instrucoes || 'Nenhuma instrução cadastrada.'}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Execuções: <span className="font-semibold">{execucoes?.length || 0}</span></div>
            <div className="flex gap-2">
              <Button variant="outline"><Camera className="h-4 w-4" /> Fotos</Button>
              <Button variant="outline" onClick={handleGenerate}>Gerar Tarefa</Button>
              <Button onClick={() => setOpenExec(true)}>Registrar Execução</Button>
            </div>
          </div>
        </div>
      </Card>
      <ExecucaoFormDialog open={openExec} onOpenChange={setOpenExec} planoId={plano.id} />
    </div>
  );
}
