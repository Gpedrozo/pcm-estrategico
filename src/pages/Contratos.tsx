import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import toast from "react-hot-toast"
import { format, differenceInDays } from "date-fns"

/* =====================================================
   🔐 CONTROLE DE PERFIL (SIMULAÇÃO)
   Substitua pelo seu auth real (NextAuth / Supabase)
===================================================== */

const currentUser = {
  name: "Admin",
  role: "ADMIN" // ADMIN | GESTOR | VISUALIZADOR
}

const canEdit = currentUser.role === "ADMIN" || currentUser.role === "GESTOR"

/* =====================================================
   🧠 VALIDAÇÃO ZOD
===================================================== */

const contratoSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  tipo: z.string().min(2, "Tipo obrigatório"),
  status: z.string(),
  fornecedor: z.string().min(2, "Fornecedor obrigatório"),
  dataInicio: z.string(),
  dataFim: z.string(),
  valorTotal: z.coerce.number(),
  valorMensal: z.coerce.number()
})

type ContratoForm = z.infer<typeof contratoSchema>

/* =====================================================
   📄 COMPONENTE PRINCIPAL
===================================================== */

export default function Contratos() {
  const [contratos, setContratos] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroFornecedor, setFiltroFornecedor] = useState("")
  const [filtroData, setFiltroData] = useState("")

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
          toast.error(`Contrato ${contrato.nome} vence em ${dias} dias`)
        }
      }
    })
  }, [contratos])

  /* =====================================================
     📥 SALVAR CONTRATO
  ===================================================== */

  const onSubmit = (data: ContratoForm) => {
    if (!canEdit) {
      toast.error("Sem permissão para editar")
      return
    }

    if (editing) {
      setContratos((prev) =>
        prev.map((c) =>
          c.id === editing.id ? { ...editing, ...data } : c
        )
      )
      toast.success("Contrato atualizado")
    } else {
      const novo = {
        id: crypto.randomUUID(),
        ...data
      }
      setContratos((prev) => [...prev, novo])
      toast.success("Contrato criado com sucesso")
    }

    reset()
    setEditing(null)
  }

  /* =====================================================
     🔍 FILTRO INTELIGENTE
  ===================================================== */

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      return (
        (filtroStatus ? c.status === filtroStatus : true) &&
        (filtroFornecedor ? c.fornecedor.includes(filtroFornecedor) : true) &&
        (filtroData ? c.dataFim === filtroData : true)
      )
    })
  }, [contratos, filtroStatus, filtroFornecedor, filtroData])

  /* =====================================================
     📊 KPI
  ===================================================== */

  const totalContratos = contratos.length
  const ativos = contratos.filter((c) => c.status === "Ativo").length
  const valorTotal = contratos.reduce((acc, c) => acc + c.valorTotal, 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Contratos</h1>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <p>Total Contratos</p>
          <h2 className="text-xl font-bold">{totalContratos}</h2>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p>Ativos</p>
          <h2 className="text-xl font-bold">{ativos}</h2>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p>Valor Total</p>
          <h2 className="text-xl font-bold">
            R$ {valorTotal.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-4">
        <select onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Status</option>
          <option>Ativo</option>
          <option>Encerrado</option>
        </select>

        <input
          placeholder="Fornecedor"
          onChange={(e) => setFiltroFornecedor(e.target.value)}
        />

        <input
          type="date"
          onChange={(e) => setFiltroData(e.target.value)}
        />
      </div>

      {/* FORM */}
      {canEdit && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 shadow rounded space-y-4"
        >
          <input placeholder="Nome" {...register("nome")} />
          {errors.nome && <span>{errors.nome.message}</span>}

          <input placeholder="Tipo" {...register("tipo")} />

          <input placeholder="Fornecedor" {...register("fornecedor")} />

          <select {...register("status")}>
            <option>Ativo</option>
            <option>Encerrado</option>
          </select>

          <input type="date" {...register("dataInicio")} />
          <input type="date" {...register("dataFim")} />

          <input type="number" placeholder="Valor Total" {...register("valorTotal")} />
          <input type="number" placeholder="Valor Mensal" {...register("valorMensal")} />

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {editing ? "Atualizar" : "Cadastrar"}
          </button>
        </form>
      )}

      {/* LISTA */}
      <div className="space-y-2">
        {contratosFiltrados.map((c) => (
          <div
            key={c.id}
            className="bg-white p-4 shadow rounded flex justify-between"
          >
            <div>
              <p className="font-bold">{c.nome}</p>
              <p>{c.fornecedor}</p>
              <p>Status: {c.status}</p>
              {c.dataFim && (
                <p>
                  Vencimento: {format(new Date(c.dataFim), "dd/MM/yyyy")}
                </p>
              )}
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setEditing(c)
                  reset(c)
                }}
                className="text-blue-600"
              >
                Editar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
