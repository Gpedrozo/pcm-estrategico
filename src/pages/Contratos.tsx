import { useEffect, useState } from "react"
import { supabase } from "@/integracoes/supabase/client"

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
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)

  const [form, setForm] = useState<any>({
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

  async function carregarContratos() {
    setLoading(true)
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setContratos(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarContratos()
  }, [])

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function salvarContrato() {
    if (!form.nome || !form.data_inicio) {
      alert("Preencha os campos obrigatórios")
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

    carregarContratos()
  }

  async function excluirContrato(id: string) {
    if (!confirm("Deseja excluir este contrato?")) return
    await supabase.from("contratos").delete().eq("id", id)
    carregarContratos()
  }

  function editarContrato(contrato: Contrato) {
    setEditando(contrato)
    setForm(contrato)
    setOpenModal(true)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestão de Contratos</h1>
        <button
          onClick={() => setOpenModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Novo Contrato
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th>Nome</th>
              <th>Status</th>
              <th>Vigência</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => {
              const vencido =
                c.data_fim &&
                new Date(c.data_fim) < new Date()

              return (
                <tr key={c.id} className={vencido ? "bg-red-50" : ""}>
                  <td>{c.nome}</td>
                  <td>{c.status}</td>
                  <td>
                    {c.data_inicio} até {c.data_fim || "Indeterminado"}
                  </td>
                  <td>R$ {c.valor_total}</td>
                  <td className="space-x-2">
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
      )}

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-[600px]">
            <h2 className="text-xl font-bold mb-4">
              {editando ? "Editar Contrato" : "Novo Contrato"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} />
              <input name="tipo" placeholder="Tipo" value={form.tipo} onChange={handleChange} />
              <input name="status" placeholder="Status" value={form.status} onChange={handleChange} />
              <input type="date" name="data_inicio" value={form.data_inicio} onChange={handleChange} />
              <input type="date" name="data_fim" value={form.data_fim || ""} onChange={handleChange} />
              <input name="valor_total" type="number" value={form.valor_total} onChange={handleChange} />
              <input name="valor_mensal" type="number" value={form.valor_mensal} onChange={handleChange} />
              <input name="sla_atendimento" type="number" value={form.sla_atendimento} onChange={handleChange} />
              <input name="sla_resolucao" type="number" value={form.sla_resolucao} onChange={handleChange} />
              <textarea name="penalidades" value={form.penalidades || ""} onChange={handleChange} placeholder="Penalidades" className="col-span-2" />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setOpenModal(false)}>Cancelar</button>
              <button onClick={salvarContrato} className="bg-blue-600 text-white px-4 py-2 rounded">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
