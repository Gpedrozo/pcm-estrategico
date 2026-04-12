import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSignature, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContratoRow {
  id: string;
  numero_contrato: string;
  titulo: string;
  tipo: string | null;
  status: string | null;
  data_inicio: string;
  data_fim: string | null;
  valor_total: number | null;
  valor_mensal: number | null;
  sla_atendimento_horas: number | null;
  sla_resolucao_horas: number | null;
  responsavel_nome: string | null;
  fornecedor?: { nome?: string | null; razao_social?: string | null; nome_fantasia?: string | null } | null;
}

interface Props {
  contratos: ContratoRow[];
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'ATIVO': return '#22c55e';
    case 'VENCIDO': return '#ef4444';
    case 'A_VENCER': return '#f59e0b';
    case 'CANCELADO': return '#6b7280';
    default: return '#3b82f6';
  }
}

export function FornecedoresContratoPanel({ contratos }: Props) {
  const hoje = useMemo(() => new Date(), []);

  const enriquecidos = useMemo(() => contratos.map((c) => {
    const diasParaVencer = c.data_fim
      ? differenceInDays(parseISO(c.data_fim), hoje)
      : null;
    let statusCalc = c.status;
    if (c.data_fim) {
      if (diasParaVencer !== null && diasParaVencer < 0) statusCalc = 'VENCIDO';
      else if (diasParaVencer !== null && diasParaVencer <= 30) statusCalc = 'A_VENCER';
    }
    const nomeFornecedor = c.fornecedor?.nome_fantasia || c.fornecedor?.razao_social || c.fornecedor?.nome || '—';
    return { ...c, diasParaVencer, statusCalc, nomeFornecedor };
  }), [contratos, hoje]);

  const ativos = enriquecidos.filter((c) => c.statusCalc === 'ATIVO').length;
  const aVencer = enriquecidos.filter((c) => c.statusCalc === 'A_VENCER').length;
  const vencidos = enriquecidos.filter((c) => c.statusCalc === 'VENCIDO').length;
  const valorTotal = enriquecidos.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4 text-primary" />
          Contratos & Fornecedores
        </CardTitle>
        <CardDescription>Validade, SLA e valor dos contratos ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xl font-bold text-primary">{contratos.length}</p>
            <p className="text-xs text-muted-foreground">Total Contratos</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{ativos}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${aVencer > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${aVencer > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{aVencer}</p>
            <p className="text-xs text-muted-foreground">Vencendo em 30d</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${vencidos > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
            <p className={`text-xl font-bold ${vencidos > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{vencidos}</p>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-lg font-bold text-primary">{fmt(valorTotal)}</p>
          <p className="text-xs text-muted-foreground">Valor Total em Contratos</p>
        </div>

        {/* Alertas vencendo */}
        {aVencer > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Contratos Vencendo em Breve
            </p>
            <div className="space-y-2">
              {enriquecidos.filter((c) => c.statusCalc === 'A_VENCER').map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded border px-3 py-2 bg-amber-50/50 dark:bg-amber-950/10">
                  <div>
                    <p className="text-xs font-medium">{c.titulo}</p>
                    <p className="text-xs text-muted-foreground">{c.nomeFornecedor} — {c.numero_contrato}</p>
                  </div>
                  <Badge className="text-xs bg-amber-500/10 text-amber-600">
                    {c.diasParaVencer}d restantes
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista todos */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Todos os Contratos</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {enriquecidos
              .sort((a, b) => (a.diasParaVencer ?? 9999) - (b.diasParaVencer ?? 9999))
              .map((c) => {
                const cor = getStatusColor(c.statusCalc);
                return (
                  <div key={c.id} className="flex items-center justify-between rounded border px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.titulo}</p>
                      <p className="text-xs text-muted-foreground">{c.nomeFornecedor}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      {c.data_fim && (
                        <span className="text-xs text-muted-foreground">
                          até {format(parseISO(c.data_fim), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      )}
                      {c.valor_mensal && (
                        <Badge variant="outline" className="text-xs h-5">{fmt(Number(c.valor_mensal))}/mês</Badge>
                      )}
                      <Badge className="text-xs h-5" style={{ backgroundColor: cor + '20', color: cor }}>
                        {c.statusCalc || 'N/D'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {contratos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum contrato cadastrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
