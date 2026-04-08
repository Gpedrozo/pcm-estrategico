import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { EquipamentoRow } from '@/hooks/useEquipamentos';
import type { PlanoLubrificacao } from '@/types/lubrificacao';
import { LubrificacaoPrintTemplate } from '@/components/lubrificacao/LubrificacaoPrintTemplate';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { usePontosPlano } from '@/hooks/usePontosPlano';

const prioridadeCores: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800 border-green-300',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alta: 'bg-orange-100 text-orange-800 border-orange-300',
  critica: 'bg-red-100 text-red-800 border-red-300',
};

const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

function getDaysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

interface LubrificacaoDetalheProps {
  plano: PlanoLubrificacao | null;
  equipamentos: EquipamentoRow[];
  onEdit: (plano: PlanoLubrificacao) => void;
}

export function LubrificacaoDetalhe({ plano, equipamentos, onEdit }: LubrificacaoDetalheProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: empresa } = useDadosEmpresa();
  const { data: pontosPlano } = usePontosPlano(plano?.id);

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
  const daysUntil = getDaysUntil(plano.proxima_execucao);
  const prioridade = plano.prioridade || 'media';

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Badge variant="outline">{plano.status || 'programado'}</Badge>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => handlePrint()}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(plano)}>Editar plano</Button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-xl">{plano.nome}</CardTitle>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${prioridadeCores[prioridade]}`}>
              {prioridadeLabels[prioridade]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{plano.codigo}</p>
          {/* Indicador de vencimento */}
          {daysUntil !== null && (
            <div className="flex items-center gap-1.5 mt-1">
              {daysUntil < 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-semibold text-red-600">VENCIDO há {Math.abs(daysUntil)} dia(s)</span>
                </>
              ) : daysUntil <= 7 ? (
                <>
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-600">Vence em {daysUntil} dia(s)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">Em dia — vence em {daysUntil} dias</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Equipamento:</span> {equipamento ? `${equipamento.tag} - ${equipamento.nome}` : '—'}</div>
          {/* R4: ponto_lubrificacao só aparece quando NÃO há pontos detalhados */}
          {(!pontosPlano || pontosPlano.length === 0) && plano.ponto_lubrificacao && (
            <div><span className="text-muted-foreground">Ponto:</span> {plano.ponto_lubrificacao}</div>
          )}
          <div><span className="text-muted-foreground">Lubrificante:</span> {plano.lubrificante || '—'}</div>
          <div><span className="text-muted-foreground">Periodicidade:</span> {plano.periodicidade || '—'} {plano.tipo_periodicidade || ''}</div>
          <div><span className="text-muted-foreground">Tempo Estimado:</span> {plano.tempo_estimado || 0} min</div>
          <div><span className="text-muted-foreground">Responsável:</span> {plano.responsavel_nome || '—'}</div>
          {/* R6: Prioridade removida daqui — já exibida como badge no header */}
          <div><span className="text-muted-foreground">Última Execução:</span> {plano.ultima_execucao ? new Date(plano.ultima_execucao).toLocaleString('pt-BR') : '—'}</div>
          <div><span className="text-muted-foreground">Próxima Execução:</span> {plano.proxima_execucao ? new Date(plano.proxima_execucao).toLocaleString('pt-BR') : '—'}</div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Escopo / Instruções</p>
          <p className="text-sm mt-1">{plano.descricao || 'Sem descrição.'}</p>
        </div>

        {/* Pontos da Rota */}
        {pontosPlano && pontosPlano.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-sm font-semibold mb-2">Pontos de Lubrificação ({pontosPlano.length}) — Tempo total: {pontosPlano.reduce((s, p) => s + (p.tempo_estimado_min || 0), 0)} min</p>
            <div className="border border-border rounded-lg overflow-hidden max-h-[350px] overflow-auto">
              <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold w-10">Item</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Descrição</th>
                    <th className="text-left px-2 py-1.5 font-semibold w-24">Lubrificante</th>
                    <th className="text-left px-2 py-1.5 font-semibold w-14">Qtd</th>
                    <th className="text-right px-2 py-1.5 font-semibold w-12">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {pontosPlano.map((p, i) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-mono font-bold text-primary">{i + 1}</td>
                      <td className="px-2 py-1.5 min-w-0">
                        <span className="block truncate">{p.descricao}</span>
                        {/* R2: TAG badge só se plano NÃO tem equipamento */}
                        {!plano.equipamento_id && p.equipamento_tag && <Badge variant="secondary" className="mt-0.5 text-[10px]">{p.equipamento_tag}</Badge>}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground truncate">{p.lubrificante && p.lubrificante !== plano.lubrificante ? p.lubrificante : '—'}</td>
                      <td className="px-2 py-1.5 text-muted-foreground truncate">{p.quantidade || '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.tempo_estimado_min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Hidden print template */}
      <div className="hidden">
        <LubrificacaoPrintTemplate ref={printRef} plano={plano} pontos={pontosPlano || []} empresa={empresa} equipamentoNome={equipamento ? `${equipamento.tag} - ${equipamento.nome}` : undefined} />
      </div>
    </Card>
  );
}
