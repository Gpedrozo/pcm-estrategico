import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Printer 
} from 'lucide-react'

import { 
  useContratos, 
  useCreateContrato, 
  useUpdateContrato,
  type ContratoInsert 
} from '@/hooks/useContratos'

import { useFornecedores } from '@/hooks/useFornecedores'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

export default function Contratos() {

  const { user } = useAuth()
  const { data: contratos, isLoading } = useContratos()
  const { data: fornecedores } = useFornecedores()

  const createContrato = useCreateContrato()
  const updateContrato = useUpdateContrato()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const [selectedContrato, setSelectedContrato] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

  const initialForm: ContratoInsert = {
    numero_contrato: '',
    titulo: '',
    descricao: '',
    fornecedor_id: null,
    tipo: 'SERVICO',
    status: 'ATIVO',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: null,
    valor_total: 0,
    valor_mensal: 0,
    sla_atendimento_horas: 4,
    sla_resolucao_horas: 24,
    responsavel_nome: '',
    penalidade_descricao: '',
  }

  const [formData, setFormData] = useState<ContratoInsert>(initialForm)

  /* ===================================
     ABRIR MODAL NOVO
  ==================================== */

  const openNew = () => {
    setIsEditing(false)
    setFormData(initialForm)
    setIsModalOpen(true)
  }

  /* ===================================
     EDITAR
  ==================================== */

  const openEdit = (contrato: any) => {
    setIsEditing(true)
    setSelectedContrato(contrato)

    setFormData({
      ...contrato,
      fornecedor_id: contrato.fornecedor_id || null,
      data_fim: contrato.data_fim || null
    })

    setIsModalOpen(true)
  }

  /* ===================================
     VISUALIZAR
  ==================================== */

  const openView = (contrato: any) => {
    setSelectedContrato(contrato)
    setIsViewOpen(true)
  }

  /* ===================================
     IMPRIMIR
  ==================================== */

  const handlePrint = () => {
    window.print()
  }

  /* ===================================
     SALVAR
  ==================================== */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.numero_contrato || !formData.titulo) {
      alert('Preencha os campos obrigatórios')
      return
    }

    const payload = {
      ...formData,
      fornecedor_id: formData.fornecedor_id || null,
      valor_total: Number(formData.valor_total) || 0,
      valor_mensal: Number(formData.valor_mensal) || 0,
      responsavel_nome:
        formData.responsavel_nome || user?.email || 'Sistema'
    }

    if (isEditing && selectedContrato) {
      await updateContrato.mutateAsync({
        id: selectedContrato.id,
        data: payload
      })
    } else {
      await createContrato.mutateAsync(payload)
    }

    setIsModalOpen(false)
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Contratos</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Título</th>
              <th>Fornecedor</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratos?.map((contrato) => (
              <tr key={contrato.id}>
                <td>{contrato.numero_contrato}</td>
                <td>{contrato.titulo}</td>
                <td>
                  {contrato.fornecedor?.nome_fantasia ||
                    contrato.fornecedor?.razao_social ||
                    '-'}
                </td>
                <td>
                  {contrato.valor_total?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
                <td className="flex gap-2">

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openView(contrato)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEdit(contrato)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <Label>Número *</Label>
              <Input
                required
                value={formData.numero_contrato}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numero_contrato: e.target.value
                  })
                }
              />
            </div>

            <div>
              <Label>Título *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    titulo: e.target.value
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>

              <Button type="submit">
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL VISUALIZAR */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
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

              <Button onClick={handlePrint} className="mt-4">
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
