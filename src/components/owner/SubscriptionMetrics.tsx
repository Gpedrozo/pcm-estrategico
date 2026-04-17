import { CreditCard, ShieldCheck, AlertTriangle, Database, Activity } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricTile, SurfaceCard } from '@/pages/owner2/owner2Components'
import { downloadCsv } from '@/pages/owner2/owner2Helpers'
import { Download } from 'lucide-react'
import type { SubscriptionRecord } from '@/hooks/useSubscriptionDetail'

interface Props {
  metrics: {
    totalMrr: number
    paid: number
    late: number
    arpa: number
    ativas: number
    atrasadas: number
    teste: number
    total: number
  }
  paymentStatusChartData: { name: string; value: number }[]
  subscriptions: SubscriptionRecord[]
}

export default function SubscriptionMetrics({ metrics, paymentStatusChartData, subscriptions }: Props) {
  function exportFinanceCsv() {
    const rows = subscriptions.map((s) => [
      String(s.id ?? ''),
      String(s.empresa_id ?? ''),
      String(s.plan_id ?? s.plano_id ?? ''),
      Number(s.amount ?? 0),
      String(s.payment_status ?? ''),
      String(s.status ?? ''),
    ])
    downloadCsv('owner-financeiro.csv', ['id', 'empresa_id', 'plano_id', 'valor', 'payment_status', 'status'], rows)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SurfaceCard title="Resumo financeiro" subtitle="Receita recorrente e status de pagamento">
        <div className="grid gap-2 sm:grid-cols-2">
          <MetricTile label="MRR" value={`R$ ${metrics.totalMrr.toLocaleString('pt-BR')}`} icon={CreditCard} tone="emerald" />
          <MetricTile label="Assinaturas pagas" value={metrics.paid} icon={ShieldCheck} tone="sky" />
          <MetricTile label="Assinaturas atrasadas" value={metrics.late} icon={AlertTriangle} tone="amber" />
          <MetricTile label="ARPA" value={`R$ ${metrics.arpa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`} icon={Database} tone="rose" />
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card p-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Status de pagamento</p>
            <button className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground" onClick={exportFinanceCsv}>
              <Download className="h-3 w-3" /> Exportar CSV
            </button>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentStatusChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:gap-4">
        <MetricTile label="Total assinaturas" value={metrics.total} icon={Activity} tone="sky" />
        <MetricTile label="Ativas" value={metrics.ativas} icon={ShieldCheck} tone="emerald" />
        <MetricTile label="Em atraso" value={metrics.atrasadas} icon={AlertTriangle} tone="amber" />
        <MetricTile label="Teste" value={metrics.teste} icon={Database} tone="violet" />
      </div>
    </div>
  )
}
