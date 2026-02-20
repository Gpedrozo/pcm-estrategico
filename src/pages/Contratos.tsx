"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Eye, Pencil, Printer, FileDown } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"

interface Contrato {
  id: string
  numero_contrato: string
  titulo: string
  status: string
  fornecedor?: { nome_fantasia?: string }
  valor_total: number
  valor_executado?: number
  data_inicio?: string
  data_fim?: string
  risco?: string
  sla_percentual?: number
  aditivos?: any[]
}

export default function ContratosPage() {

  const [contratos, setContratos] = useState<Contrato[]>([])
  const [filtered, setFiltered] = useState<Contrato[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [fornecedorFilter, setFornecedorFilter] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Contrato | null>(null)
  const [open, setOpen] = useState(false)

  /* ================= FETCH ================= */

  useEffect(() => {
    fetch("/api/contratos")
      .then(res => res.json())
      .then(data => {
        setContratos(data || [])
        setFiltered(data || [])
      })
      .catch(() => setContratos([]))
  }, [])

  /* ================= FILTRO ================= */

  useEffect(() => {
    let result = contratos

    if (statusFilter)
      result = result.filter(c => c.status === statusFilter)

    if (fornecedorFilter)
      result = result.filter(c =>
        c.fornecedor?.nome_fantasia === fornecedorFilter
      )

    if (search)
      result = result.filter(c =>
        c.titulo?.toLowerCase().includes(search.toLowerCase())
      )

    setFiltered(result)
  }, [statusFilter, fornecedorFilter, search, contratos])

  /* ================= KPI ================= */

  const totalValor = useMemo(
    () => filtered.reduce((acc, c) => acc + (c.valor_total || 0), 0),
    [filtered]
  )

  const saldo = useMemo(
    () =>
      filtered.reduce(
        (acc, c) => acc + (c.valor_total - (c.valor_executado || 0)),
        0
      ),
    [filtered]
  )

  const slaMedio = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(
      filtered.reduce((acc, c) => acc + (c.sla_percentual || 0), 0) /
        filtered.length
    )
  }, [filtered])

  /* ================= EXPORT EXCEL ================= */

  function exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(filtered)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos")
    XLSX.writeFile(workbook, "contratos.xlsx")
  }

  /* ================= EXPORT PDF ================= */

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Relatório de Contratos", 14, 20)

    let y = 30
    filtered.forEach(c => {
      doc.text(`${c.numero_contrato} - ${c.titulo}`, 14, y)
      y += 8
    })

    doc.save("contratos.pdf")
  }

  /* ================= WEBHOOK ALERT ================= */

  async function sendWebhook(contrato: Contrato) {
    await fetch("/api/webhook-alerta", {
      method: "POST",
      body: JSON.stringify(contrato),
    })
    alert("Webhook enviado!")
  }

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Gestão de Contratos</h1>

      {/* FILTROS */}
      <Card>
        <CardContent className="flex gap-4 p-4">
          <Input
            placeholder="Buscar contrato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <Select onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="ENCERRADO">Encerrado</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportExcel}>
            <FileDown className="mr-2 h-4 w-4" /> Excel
          </Button>

          <Button onClick={exportPDF}>
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground">Valor Total</div>
            <div className="text-2xl font-bold">
              R$ {totalValor.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground">Saldo</div>
            <div className="text-2xl font-bold">
              R$ {saldo.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground">SLA Médio</div>
            <Progress value={slaMedio} />
            <div className="font-bold mt-2">{slaMedio}%</div>
          </CardContent>
        </Card>
      </div>

      {/* GRAFICO */}
      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="numero_contrato" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valor_total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TABELA */}
      <Card>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Nº</th>
                <th>Título</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b">
                  <td>{c.numero_contrato}</td>
                  <td>{c.titulo}</td>
                  <td>{c.fornecedor?.nome_fantasia || "-"}</td>
                  <td>R$ {c.valor_total?.toLocaleString()}</td>
                  <td className="flex gap-2 py-2">

                    <Button size="icon" variant="outline" onClick={() => { setSelected(c); setOpen(true) }}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline" onClick={() => sendWebhook(c)}>
                      ⚠
                    </Button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL DETALHES + ADITIVOS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-2">
              <p><strong>Número:</strong> {selected.numero_contrato}</p>
              <p><strong>Título:</strong> {selected.titulo}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Valor:</strong> R$ {selected.valor_total}</p>

              <h3 className="font-bold mt-4">Histórico de Aditivos</h3>
              {selected.aditivos?.length ? (
                selected.aditivos.map((a: any, i: number) => (
                  <div key={i} className="border p-2 rounded">
                    {a.descricao}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Sem aditivos</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
