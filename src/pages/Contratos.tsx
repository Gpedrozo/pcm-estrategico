import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

/* ==============================
   SUPABASE CLIENT (LOCAL SAFE)
============================== */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/* ==============================
   TYPES
============================== */

interface Contrato {
  id: string
  nome: string
  tipo: string
  status: string
  data_inicio: string
  data_fim: string | null
  valor_total: number
  valor_mensal: number
  sla_atendimento: number
  sla_resolucao: number
  penalidades: string | null
  created_at: string
}

/* ==============================
   COMPONENT
============================== */

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)

  const [form, setForm] = useState({
    nome: "",
    tipo: "Serviço",
    status: "Ativo",
    data_inicio: "",
    data_fim: "",
    valor_total: 0,
    valor_mensal: 0,
    sla_atendimento: 0,
    sla_resolucao: 0,
    penalidades: ""
  })

  /* ==============================
     LOAD
  ============================== */

  async function carregarContratos() {
    setLoading(true)

    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setContratos(data as Contrato[])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarContratos()
  }, [])

  /* ==============================
     FORM HANDLERS
  ============================== */

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name.includes("valor") || name.includes("sla")
        ? Number(value)
        : value
    }))
  }

  function resetForm() {
    setForm({
      nome: "",
      tipo: "Serviço",
      status: "Ativo",
      data_inicio: "",
      data_fim: "",
      valor_total: 0,
      valor_mensal: 0,
      sla_atendimento: 0,
      sla_resolucao: 0,
      penalidades: ""
    })
  }

  /* ==============================
     SAVE
  ============================== */

  async function salvarContrato() {
    if (!form.nome || !form.data_inicio) {
      alert("Preencha nome e data de início.")
      return
    }

    if (editando) {
      await supabase
        .from("contratos")
        .update(form)
        .eq("id", editando.id)
    } else {
      await supabase
        .from("contratos")
        .insert([form])
    }

    setOpenModal(false)
    setEditando(null)
    resetForm()
    carregarContratos()
  }

  /* ==============================
     DELETE
  ============================== */

  async function excluirContrato(id: string) {
    if (!confirm("Deseja excluir este contrato?")) return

    await supabase
      .from("contratos")
      .delete()
      .eq("id", id)

    carregarContratos()
  }

  /* ==============================
     EDIT
  ============================== */

  function editarContrato(c: Contrato) {
    setEditando(c)
    setForm({
      ...c,
      data_fim: c.data_fim || ""
    })
    setOpenModal(true)
  }

  /* ==============================
     RENDER
  ============================== */

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestão de Contratos</h1>

        <button
          onClick={() => {
            resetForm()
            setEditando(null)
            setOpenModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Novo Contrato
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">Status</th>
                <th className="p-2">Vigência</th>
                <th className="p-2">Valor Total</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {contratos.map((c) => {
                const vencido =
                  c.data_fim &&
                  new Date(c.data_fim) < new Date()

                return (
                  <tr key={c.id} className={vencido ? "bg-red-50" : ""}>
                    <td className="p-2">{c.nome}</td>
                    <td className="p-2">{c.status}</td>
                    <td className="p-2">
                      {c.data_inicio} até {c.data_fim || "Indeterminado"}
                    </td>
                    <td className="p-2">R$ {c.valor_total}</td>
                    <td className="p-2 space-x-3">
                      <button
                        onClick={() => editarContrato(c)}
                        className="text-blue-600"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => excluirContrato(c.id)}
                        className="text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-[650px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editando ? "Editar Contrato" : "Novo Contrato"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} />
              <input name="tipo" placeholder="Tipo" value={form.tipo} onChange={handleChange} />
              <input name="status" placeholder="Status" value={form.status} onChange={handleChange} />
              <input type="date" name="data_inicio" value={form.data_inicio} onChange={handleChange} />
              <input type="date" name="data_fim" value={form.data_fim} onChange={handleChange} />
              <input type="number" name="valor_total" value={form.valor_total} onChange={handleChange} placeholder="Valor Total" />
              <input type="number" name="valor_mensal" value={form.valor_mensal} onChange={handleChange} placeholder="Valor Mensal" />
              <input type="number" name="sla_atendimento" value={form.sla_atendimento} onChange={handleChange} placeholder="SLA Atendimento (h)" />
              <input type="number" name="sla_resolucao" value={form.sla_resolucao} onChange={handleChange} placeholder="SLA Resolução (h)" />
              <textarea name="penalidades" value={form.penalidades} onChange={handleChange} placeholder="Penalidades" className="col-span-2" />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setOpenModal(false)}>
                Cancelar
              </button>

              <button
                onClick={salvarContrato}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
