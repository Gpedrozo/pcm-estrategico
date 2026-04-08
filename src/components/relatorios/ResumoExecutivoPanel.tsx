import { Activity, AlertTriangle, ArrowRight, Clock, DollarSign, FileText, Percent, TrendingUp, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ResumoData {
  totalOS: number;
  corretivas: number;
  preventivas: number;
  pctPreventiva: number;
  pctCorretiva: number;
  mttr: number;
  mtbf: number;
  disponibilidade: number;
  backlogQtd: number;
  backlogDias: number;
  custoTotal: number;
  totalAlertas: number;
  alertasCriticos: number;
}

interface ResumoExecutivoPanelProps {
  dados: ResumoData | null;
}

export function ResumoExecutivoPanel({ dados }: ResumoExecutivoPanelProps) {
  if (!dados) return null;

  const statusGeral = dados.alertasCriticos >= 2 ? 'critico' : dados.totalAlertas > 0 ? 'atencao' : 'normal';
  const statusConfig = {
    critico: { label: 'Situação Crítica', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40', icon: AlertTriangle },
    atencao: { label: 'Requer Atenção', cor: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: Activity },
    normal: { label: 'Operação Normal', cor: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40', icon: TrendingUp },
  }[statusGeral];

  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resumo Executivo — Visão Geral
          </CardTitle>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bg}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.cor}`} />
            <span className={`text-sm font-semibold ${statusConfig.cor}`}>{statusConfig.label}</span>
            {dados.totalAlertas > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{dados.totalAlertas} alerta{dados.totalAlertas > 1 ? 's' : ''}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* Total OS */}
          <MetricaResumo
            label="Total OS"
            valor={dados.totalOS.toString()}
            icon={<FileText className="h-4 w-4" />}
            sub={`${dados.pctPreventiva}% prev · ${dados.pctCorretiva}% corr`}
          />

          {/* MTTR */}
          <MetricaResumo
            label="MTTR"
            valor={`${dados.mttr.toFixed(1)}h`}
            icon={<Clock className="h-4 w-4" />}
            alerta={dados.mttr > 2}
          />

          {/* MTBF */}
          <MetricaResumo
            label="MTBF"
            valor={`${dados.mtbf.toFixed(0)}h`}
            icon={<Wrench className="h-4 w-4" />}
            alerta={dados.mtbf < 500}
          />

          {/* Disponibilidade */}
          <MetricaResumo
            label="Disponibilidade"
            valor={`${dados.disponibilidade.toFixed(1)}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            alerta={dados.disponibilidade < 95}
          />

          {/* Backlog */}
          <MetricaResumo
            label="Backlog"
            valor={`${dados.backlogQtd} OS`}
            icon={<AlertTriangle className="h-4 w-4" />}
            sub={`~${dados.backlogDias} dias`}
            alerta={dados.backlogQtd > 10}
          />

          {/* % Preventiva */}
          <MetricaResumo
            label="% Preventiva"
            valor={`${dados.pctPreventiva}%`}
            icon={<Percent className="h-4 w-4" />}
            alerta={dados.pctPreventiva < 40}
          />

          {/* Custo Total */}
          <MetricaResumo
            label="Custo Mês"
            valor={`R$ ${(dados.custoTotal / 1000).toFixed(1)}k`}
            icon={<DollarSign className="h-4 w-4" />}
            alerta={dados.custoTotal > 50000}
          />
        </div>

        {/* Barra de contexto */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <ArrowRight className="h-3 w-3" />
          <span>
            <strong>Contexto:</strong> Do total de {dados.totalOS} ordens de serviço, {dados.pctPreventiva}% são preventivas e {dados.pctCorretiva}% corretivas.
            {dados.pctCorretiva > 60 && ' A proporção de corretivas está alta — indica necessidade de fortalecer o programa preventivo.'}
            {dados.backlogQtd > 10 && ` Backlog de ${dados.backlogQtd} OS (~${dados.backlogDias} dias) requer atenção na capacidade da equipe.`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricaResumo({ label, valor, icon, sub, alerta }: { label: string; valor: string; icon: React.ReactNode; sub?: string; alerta?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center p-3 rounded-lg border ${alerta ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900' : 'border-border bg-muted/30'}`}>
      <div className={`mb-1 ${alerta ? 'text-red-500' : 'text-muted-foreground'}`}>{icon}</div>
      <span className={`text-lg font-bold ${alerta ? 'text-red-700 dark:text-red-400' : ''}`}>{valor}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</span>}
    </div>
  );
}
