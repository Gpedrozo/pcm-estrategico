import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OSRow {
  data_solicitacao: string | null;
  data_conclusao: string | null;
  status: string;
  tipo: string;
}

interface ExecucaoRow {
  data_execucao: string | null;
  tempo_execucao: number;
}

interface Props {
  ordensServico: OSRow[];
  execucoes: ExecucaoRow[];
  meses?: number;
}

interface MesKPI {
  mes: string;
  mttr: number;
  mtbf: number;
  disponibilidade: number;
  corretivas: number;
  preventivas: number;
  aderencia: number;
}

function calcMes(
  os: OSRow[],
  exec: ExecucaoRow[],
  start: Date,
  end: Date,
): MesKPI {
  const label = format(start, 'MMM/yy', { locale: ptBR });

  const osDoMes = os.filter((o) => {
    const d = o.data_solicitacao ? parseISO(o.data_solicitacao) : null;
    return d && d >= start && d <= end;
  });
  const execDoMes = exec.filter((e) => {
    const d = e.data_execucao ? parseISO(e.data_execucao) : null;
    return d && d >= start && d <= end;
  });

  const corretivas = osDoMes.filter((o) => o.tipo === 'CORRETIVA').length;
  const preventivas = osDoMes.filter((o) => o.tipo === 'PREVENTIVA').length;
  const preventProgrm = osDoMes.filter((o) => o.tipo === 'PREVENTIVA').length;
  const preventExec = osDoMes.filter((o) => o.tipo === 'PREVENTIVA' && o.status === 'FECHADA').length;

  const tempos = execDoMes.filter((e) => e.tempo_execucao > 0).map((e) => e.tempo_execucao);
  const mttr = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length / 60 : 0;
  const mtbf = corretivas > 0 ? (30 * 24) / corretivas : 720;
  const disponibilidade = mtbf > 0 ? (mtbf / (mtbf + Math.max(mttr, 0.01))) * 100 : 99;
  const aderencia = preventProgrm > 0 ? (preventExec / preventProgrm) * 100 : 100;

  return {
    mes: label,
    mttr: Number(mttr.toFixed(1)),
    mtbf: Number(mtbf.toFixed(0)),
    disponibilidade: Number(disponibilidade.toFixed(1)),
    corretivas,
    preventivas,
    aderencia: Number(aderencia.toFixed(1)),
  };
}

export function HistoricoKPIsTendencia({ ordensServico, execucoes, meses = 12 }: Props) {
  const serie = useMemo((): MesKPI[] => {
    const resultado: MesKPI[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const ref = subMonths(new Date(), i);
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      resultado.push(calcMes(ordensServico, execucoes, start, end));
    }
    return resultado;
  }, [ordensServico, execucoes, meses]);

  const tendDisp = useMemo(() => {
    if (serie.length < 3) return 'estavel';
    const ultimos = serie.slice(-3).map((s) => s.disponibilidade);
    const media = ultimos.reduce((a, b) => a + b, 0) / ultimos.length;
    const primeiro = ultimos[0];
    if (media - primeiro > 1) return 'subindo';
    if (primeiro - media > 1) return 'caindo';
    return 'estavel';
  }, [serie]);

  const badgeColor = tendDisp === 'subindo'
    ? 'bg-green-500/10 text-green-600'
    : tendDisp === 'caindo'
    ? 'bg-red-500/10 text-red-600'
    : 'bg-gray-500/10 text-gray-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Histórico de KPIs — Últimos {meses} Meses
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Evolução mensal dos indicadores principais
          <Badge className={badgeColor}>
            Disponibilidade {tendDisp === 'subindo' ? '↑ Melhorando' : tendDisp === 'caindo' ? '↓ Caindo' : '→ Estável'}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disponibilidade + Aderência */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Disponibilidade & Aderência (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={serie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="disponibilidade" name="Disponibilidade" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="aderencia" name="Aderência Prev." stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MTTR + MTBF */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">MTTR (h) & Corretivas (un.)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={serie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="mttr" name="MTTR (h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="corretivas" name="Corretivas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
