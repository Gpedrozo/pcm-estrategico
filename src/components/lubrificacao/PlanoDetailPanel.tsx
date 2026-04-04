import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Camera, Printer } from 'lucide-react';
import type { PlanoLubrificacao } from '@/types/lubrificacao';
import { useCreateExecucaoLubrificacao, useExecucoesByPlanoLubrificacao } from '@/hooks/useLubrificacao';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { usePontosPlano } from '@/hooks/usePontosPlano';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import ExecucaoFormDialog from '@/components/lubrificacao/ExecucaoFormDialog';
import AtividadesList from '@/components/lubrificacao/AtividadesList';
import { LubrificacaoPrintTemplate } from './LubrificacaoPrintTemplate';
import { PrintPreviewDialog } from '@/components/print/PrintPreviewDialog';

export default function PlanoDetailPanel({ plano }: { plano: PlanoLubrificacao }) {
  const { data: execucoes } = useExecucoesByPlanoLubrificacao(plano.id);
  const { data: empresa } = useDadosEmpresa();
  const { data: pontosPlano } = usePontosPlano(plano.id);
  const { data: equipamentos } = useEquipamentos();
  const createExec = useCreateExecucaoLubrificacao();
  const [openExec, setOpenExec] = React.useState(false);

  const equipamento = equipamentos?.find((e) => e.id === plano.equipamento_id);
  const equipamentoLabel = equipamento ? `${equipamento.tag} - ${equipamento.nome}` : '—';

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
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost"><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p><strong>Equipamento:</strong> {equipamentoLabel}</p>
          <p><strong>Ponto:</strong> {plano.ponto_lubrificacao || '—'}</p>
          <p><strong>Lubrificante:</strong> {plano.lubrificante || '—'}</p>
          <p><strong>Periodicidade:</strong> {plano.periodicidade || '—'} {plano.tipo_periodicidade || ''}</p>
          <p><strong>Tempo estimado:</strong> {plano.tempo_estimado || 0} min</p>
        </div>

        <div className="mt-4">
          <h3 className="font-medium">Descrição</h3>
          <p className="text-sm text-muted-foreground">{plano.descricao || 'Sem descrição.'}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Execuções: <span className="font-semibold">{execucoes?.length || 0}</span></div>
            <div className="flex gap-2 flex-wrap">
              <PrintPreviewDialog
                title="Ficha de Lubrificação"
                subtitle={plano.nome}
                documentTitle={`Lubrificacao-${plano.codigo}`}
                trigger={
                  <Button variant="outline" className="gap-1">
                    <Printer className="h-4 w-4" /> Imprimir
                  </Button>
                }
              >
                {(ref) => <LubrificacaoPrintTemplate ref={ref} plano={plano} pontos={pontosPlano || []} empresa={empresa} equipamentoNome={equipamentoLabel !== '—' ? equipamentoLabel : undefined} />}
              </PrintPreviewDialog>
              <Button variant="outline"><Camera className="h-4 w-4" /> Fotos</Button>
              <Button variant="outline" onClick={handleGenerate}>Gerar Tarefa</Button>
              <Button onClick={() => setOpenExec(true)}>Registrar Execução</Button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Atividades</h3>
            <AtividadesList planoId={plano.id} />
          </div>
        </div>
      </Card>
      <ExecucaoFormDialog open={openExec} onOpenChange={setOpenExec} planoId={plano.id} />
    </div>
  );
}
