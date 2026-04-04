import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer } from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao } from '@/types/lubrificacao';
import { LubrificacaoPrintTemplate } from '@/components/lubrificacao/LubrificacaoPrintTemplate';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';

interface LubrificacaoDetalheProps {
  plano: PlanoLubrificacao | null;
  equipamentos: EquipamentoRow[];
  onEdit: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoDetalhe({ plano, equipamentos, onEdit }: LubrificacaoDetalheProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: empresa } = useDadosEmpresa();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: plano ? `Lubrificacao-${plano.codigo}` : 'Lubrificacao',
    pageStyle: `@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; } }`,
  });

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
          <Button size="sm" variant="outline" className="gap-1" onClick={() => handlePrint()}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
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

      {/* Hidden print template */}
      <div className="hidden">
        <LubrificacaoPrintTemplate ref={printRef} plano={plano} empresa={empresa} />
      </div>
    </Card>
  );
}
