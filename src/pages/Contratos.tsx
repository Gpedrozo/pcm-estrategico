import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInDays, format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

/* =====================================================
   🔐 CONTROLE DE PERFISSÃO (SIMULAÇÃO)
   Integre depois com seu Auth real
===================================================== */

const currentUser = {
  name: "Admin",
  role: "ADMIN" // ADMIN | GESTOR | VISUALIZADOR
}

const canEdit =
  currentUser.role === "ADMIN" || currentUser.role === "GESTOR"

/* =====================================================
   🧠 VALIDAÇÃO
===================================================== */

const contratoSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  tipo: z.string().min(2, "Tipo obrigatório"),
  fornecedor: z.string().min(2, "Fornecedor obrigatório"),
  status: z.string(),
  dataInicio: z.string(),
  dataFim: z.string().optional(),
  valorTotal: z.coerce.number(),
  valorMensal: z.coerce.number()
})

type ContratoForm = z.infer<typeof contratoSchema>

/* =====================================================
   📄 COMPONENTE
===================================================== */

export default function Contratos() {
  const { toast } = useToast()

  const [contratos, setContratos] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)

  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroFornecedor, setFiltroFornecedor] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContratoForm>({
    resolver: zodResolver(contratoSchema)
  })

  /* =====================================================
     📧 ALERTA AUTOMÁTICO DE VENCIMENTO
  ===================================================== */

  useEffect(() => {
    contratos.forEach((contrato) => {
      if (contrato.dataFim) {
        const dias = differenceInDays(new Date(contrato.dataFim), new Date())
        if (dias <= 15 && dias > 0) {
          toast({
            title: "Contrato próximo do vencimento",
            description: `${contrato.nome} vence em ${dias} dias`,
            variant: "destructive"
          })
        }
      }
    })
  }, [contratos])

  /* =====================================================
     💾 SALVAR
  ===================================================== */

  const onSubmit = (data: ContratoForm) => {
    if (!canEdit) {
      toast({
        title: "Sem permissão",
        description: "Você não pode editar contratos.",
        variant: "destructive"
      })
      return
    }

    if (editing) {
      setContratos((prev) =>
        prev.map((c) =>
          c.id === editing.id ? { ...editing, ...data } : c
        )
      )
      toast({ title: "Contrato atualizado com sucesso" })
    } else {
      setContratos((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ...data }
      ])
      toast({ title: "Contrato criado com sucesso" })
    }

    reset()
    setEditing(null)
  }

  /* =====================================================
     🔍 FILTRO
  ===================================================== */

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      return (
        (filtroStatus ? c.status === filtroStatus : true) &&
        (filtroFornecedor
          ? c.fornecedor
              .toLowerCase()
              .includes(filtroFornecedor.toLowerCase())
          : true)
      )
    })
  }, [contratos, filtroStatus, filtroFornecedor])

  /* =====================================================
     📊 KPI
  ===================================================== */

  const total = contratos.length
  const ativos = contratos.filter((c) => c.status === "Ativo").length
  const valorTotal = contratos.reduce(
    (acc, c) => acc + c.valorTotal,
    0
  )

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Contratos</h1>

      {/* KPI */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p>Total</p>
            <h2 className="text-xl font-bold">{total}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p>Ativos</p>
            <h2 className="text-xl font-bold">{ativos}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p>Valor Total</p>
            <h2 className="text-xl font-bold">
              R$ {valorTotal.toLocaleString()}
            </h2>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <div className="flex gap-4">
        <Select onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrar fornecedor"
          onChange={(e) => setFiltroFornecedor(e.target.value)}
        />
      </div>

      {/* FORM */}
      {canEdit && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input placeholder="Nome" {...register("nome")} />
              <Input placeholder="Tipo" {...register("tipo")} />
              <Input placeholder="Fornecedor" {...register("fornecedor")} />
              <Input type="date" {...register("dataInicio")} />
              <Input type="date" {...register("dataFim")} />
              <Input type="number" placeholder="Valor Total" {...register("valorTotal")} />
              <Input type="number" placeholder="Valor Mensal" {...register("valorMensal")} />

              <Button type="submit">
                {editing ? "Atualizar" : "Cadastrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* LISTA */}
      <div className="space-y-3">
        {contratosFiltrados.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <p className="font-bold">{c.nome}</p>
                <p>{c.fornecedor}</p>
                <p>Status: {c.status}</p>
                {c.dataFim && (
                  <p>
                    Vence em{" "}
                    {format(new Date(c.dataFim), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(c)
                    reset(c)
                  }}
                >
                  Editar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
