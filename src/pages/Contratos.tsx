import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, Pencil, Printer, Plus } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts"
import { differenceInDays } from "date-fns"
import { useContratos } from "@/hooks/useContratos"

export default function ContratosModulo() {
  const { data: contratos = [] } = useContratos()

  const [selectedContrato, setSelectedContrato] = useState<any>(null)
  const [viewOpen, setViewOpen] = useState(false)

  /* ================= KPI CALCULOS ================= */

  const metrics = useMemo(() => {
    const totalContratos = contratos.length

    const valorTotal = contratos.reduce(
      (acc: number, c: any) => acc + (c.valor_total || 0),
      0
    )

    const valorExecutado = contratos.reduce(
      (acc: number, c: any) => acc + (c.valor_executado || 0),
      0
    )

    const saldoTotal = valorTotal - valorExecutado

    const slaMedio =
      totalContratos > 0
        ? contratos.reduce(
            (acc: number, c: any) => acc + (c.sla_percentual || 0),
            0
          ) / totalContratos
        : 0

    const riscoAlto = contratos.filter(
      (c: any) => c.risco === "ALTO"
    ).length

    const vencendo30 = contratos.filter((c: any) => {
      if (!c.data_fim) return false
      const dias = differenceInDays(new Date(c.data_fim), new Date())
      return dias <= 30 && dias >= 0
    }).length

    return {
      totalContratos,
      valorTotal,
      saldoTotal,
      slaMedio: Math.round(slaMedio),
      riscoAlto,
      vencendo30,
    }
  }, [contratos])

  /* ================= GRAFICOS ================= */

  const financeiroData = contratos.map((c: any) => ({
    name: c.numero_contrato,
    total: c.valor_total || 0,
    executado: c.valor_executado || 0,
  }))

  const statusMap: any = {}
  contratos.forEach((c: any) => {
    statusMap[c.status] = (statusMap[c.status] || 0) + 1
  })

  const statusData = Object.keys(statusMap).map((key) => ({
    name: key,
    value: statusMap[key],
  }))

  const riscoMap: any = { BAIXO: 0, MEDIO: 0, ALTO: 0 }
  contratos.forEach((c: any) => {
    if (riscoMap[c.risco] !== undefined) riscoMap[c.risco]++
  })

  const riscoData = Object.keys(riscoMap).map((key) => ({
    name: key,
    value: riscoMap[key],
  }))

  /* ================= RENDER ================= */

  return (
    <div className="space-y-8">

      {/* KPI GRID */}
      <div className="grid grid-cols-4 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Total de Contratos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {metrics.totalContratos}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor Total da Carteira</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {metrics.valorTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo Contratual</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {metrics.saldoTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.slaMedio} />
            <div className="mt-2 font-bold">
              {metrics.slaMedio}%
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ALERTAS */}
      <div className="flex gap-4">
        {metrics.riscoAlto > 0 && (
          <Badge variant="destructive">
            {metrics.riscoAlto} contratos com risco alto
          </Badge>
        )}

        {metrics.vencendo30 > 0 && (
          <Badge variant="secondary">
            {metrics.vencendo30} vencem em 30 dias
          </Badge>
        )}
      </div>

      {/* GRAFICOS */}
      <div className="grid grid-cols-2 gap-8">

        <Card>
          <CardHeader>
            <CardTitle>Financeiro por Contrato</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeiroData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" />
                <Bar dataKey="executado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {statusData.map((_, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* LISTA DE CONTRATOS */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
        </CardHeader>
        <CardContent>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Nº</th>
                <th>Título</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((contrato: any) => (
                <tr key={contrato.id} className="border-b">
                  <td>{contrato.numero_contrato}</td>
                  <td>{contrato.titulo}</td>
                  <td>
                    {contrato.valor_total?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>{contrato.status}</td>
                  <td className="flex gap-2 py-2">

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        setSelectedContrato(contrato)
                        setViewOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline">
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </CardContent>
      </Card>

      {/* MODAL VISUALIZAR */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>

          {selectedContrato && (
            <div className="space-y-2">
              <p><strong>Número:</strong> {selectedContrato.numero_contrato}</p>
              <p><strong>Título:</strong> {selectedContrato.titulo}</p>
              <p><strong>Valor:</strong> {selectedContrato.valor_total}</p>
              <p><strong>Status:</strong> {selectedContrato.status}</p>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          )}

        </DialogContent>
      </Dialog>

    </div>
  )
}
