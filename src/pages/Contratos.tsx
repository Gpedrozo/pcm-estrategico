"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Eye, Printer } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface Contrato {
  id: string
  numero_contrato?: string
  titulo?: string
  status?: string
  fornecedor?: { nome_fantasia?: string }
  valor_total?: number
  valor_executado?: number
  data_fim?: string
  sla_percentual?: number
}

type Perfil = "ADMIN" | "GESTOR" | "VISUALIZADOR"

export default function ContratosPage() {

  /* ================= ESTADO ================= */

  const [contratos, setContratos] = useState<Contrato[]>([])
  const [filtered, setFiltered] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("TODOS")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Contrato | null>(null)
  const [open, setOpen] = useState(false)

  /* 🔐 PERFIL (simulação - pode integrar com auth real) */
  const [perfil] = useState<Perfil>("ADMIN")

  const podeEditar = perfil === "ADMIN" || perfil === "GESTOR"
  const podeExcluir = perfil === "ADMIN"

  /* ================= FETCH ================= */

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/contratos")
        const data = await res.json()
        setContratos(Array.isArray(data) ? data : [])
        setFiltered(Array.isArray(data) ? data : [])
      } catch {
        setContratos([])
        setFiltered([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ================= FILTRO ================= */

  useEffect(() => {
    let result = [...contratos]

    if (statusFilter !== "TODOS") {
      result = result.filter(c => c.status === statusFilter)
    }

    if (search) {
      result = result.filter(c =>
        c.titulo?.toLowerCase().includes(search.toLowerCase())
      )
    }

    setFiltered(result)
  }, [statusFilter, search, contratos])

  /* ================= ALERTA AUTOMÁTICO ================= */

  const contratosVencendo = useMemo(() => {
    const hoje = new Date()
    return contratos.filter(c => {
      if (!c.data_fim) return false
      const diff =
        (new Date(c.data_fim).getTime() - hoje.getTime()) /
        (1000 * 60 * 60 * 24)
      return diff <= 30 && diff >= 0
    })
  }, [contratos])

  useEffect(() => {
    if (contratosVencendo.length > 0) {
      console.log("ALERTA: contratos vencendo", contratosVencendo)
      // Aqui pode integrar com API de email real
    }
  }, [contratosVencendo])

  /* ================= KPI ================= */

  const totalValor = useMemo(
    () =>
      filtered.reduce((acc, c) => acc + (c.valor_total || 0), 0),
    [filtered]
  )

  const saldo = useMemo(
    () =>
      filtered.reduce(
        (acc, c) =>
          acc +
          ((c.valor_total || 0) - (c.valor_executado || 0)),
        0
      ),
    [filtered]
  )

  const slaMedio = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(
      filtered.reduce(
        (acc, c) => acc + (c.sla_percentual || 0),
        0
      ) / filtered.length
    )
  }, [filtered])

  if (loading) {
    return <div className="p-6">Carregando contratos...</div>
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Gestão de Contratos</h1>

      {/* ALERTA VISUAL */}
      {contratosVencendo.length > 0 && (
        <Badge variant="destructive">
          {contratosVencendo.length} contrato(s) vencendo em até 30 dias
        </Badge>
      )}

      {/* FILTROS */}
      <Card>
        <CardContent className="flex gap-4 p-4">
          <Input
            placeholder="Buscar contrato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="ENCERRADO">Encerrado</SelectItem>
            </SelectContent>
          </Select>
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

      {/* GRAFICO SEGURO */}
      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {filtered.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="numero_contrato" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor_total" />
              </BarChart>
            </ResponsiveContainer>
          )}
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
                  <td>R$ {(c.valor_total || 0).toLocaleString()}</td>
                  <td className="flex gap-2 py-2">

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        setSelected(c)
                        setOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {podeEditar && (
                      <Button
                        size="icon"
                        variant="outline"
                      >
                        ✏
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>

                    {podeExcluir && (
                      <Button
                        size="icon"
                        variant="destructive"
                      >
                        🗑
                      </Button>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL */}
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
              <p><strong>Valor:</strong> R$ {(selected.valor_total || 0).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
