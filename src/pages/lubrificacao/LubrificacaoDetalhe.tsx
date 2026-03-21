import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao } from '@/types/lubrificacao';

interface LubrificacaoDetalheProps {
  plano: PlanoLubrificacao | null;
  equipamentos: EquipamentoRow[];
  onEdit: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoDetalhe({ plano, equipamentos, onEdit }: LubrificacaoDetalheProps) {
  if (!plano) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Selecione um plano para visualizar os detalhes.
        </CardContent>
      </Card>
    );
  }

  const equipamento = equipamentos.find((item) => item.id === plano.equipamento_id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">{plano.nome}</CardTitle>
          <p className="text-sm text-muted-foreground">{plano.codigo}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{plano.status || 'programado'}</Badge>
          <Button size="sm" variant="outline" onClick={() => onEdit(plano)}>Editar plano</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Equipamento:</span> {equipamento ? `${equipamento.tag} - ${equipamento.nome}` : '—'}</div>
          <div><span className="text-muted-foreground">TAG vinculada:</span> {plano.tag || equipamento?.tag || '—'}</div>
          <div><span className="text-muted-foreground">Rota / Estrutura:</span> {plano.localizacao || equipamento?.localizacao || '—'}</div>
          <div><span className="text-muted-foreground">Ponto:</span> {plano.ponto_lubrificacao || plano.ponto || '—'}</div>
          <div><span className="text-muted-foreground">Lubrificante:</span> {plano.lubrificante || plano.tipo_lubrificante || '—'}</div>
          <div><span className="text-muted-foreground">Quantidade:</span> {plano.quantidade ?? '—'}</div>
          <div><span className="text-muted-foreground">Periodicidade:</span> {plano.periodicidade || plano.periodicidade_valor || '—'} {plano.tipo_periodicidade || plano.periodicidade_tipo || ''}</div>
          <div><span className="text-muted-foreground">Tempo Estimado:</span> {plano.tempo_estimado || plano.tempo_estimado_min || 0} min</div>
          <div><span className="text-muted-foreground">Responsável:</span> {plano.responsavel || '—'}</div>
          <div><span className="text-muted-foreground">Prioridade:</span> {plano.prioridade || 'media'}</div>
          <div><span className="text-muted-foreground">Última Execução:</span> {plano.ultima_execucao ? new Date(plano.ultima_execucao).toLocaleString('pt-BR') : '—'}</div>
          <div><span className="text-muted-foreground">Próxima Execução:</span> {plano.proxima_execucao ? new Date(plano.proxima_execucao).toLocaleString('pt-BR') : '—'}</div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Descrição</p>
          <p className="text-sm mt-1">{plano.descricao || plano.observacoes || 'Sem descrição.'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
