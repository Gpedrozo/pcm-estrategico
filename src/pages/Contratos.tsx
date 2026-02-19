import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, FileText, DollarSign, Building2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useContratos, useCreateContrato, type ContratoInsert } from '@/hooks/useContratos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useAuth } from '@/contexts/AuthContext'
import { format, differenceInDays, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type StatusType = 'ATIVO' | 'SUSPENSO' | 'ENCERRADO' | 'VENCIDO'

export default function Contratos() {
  const { user } = useAuth()
  const { data: contratos, isLoading } = useContratos()
  const { data: fornecedores } = useFornecedores()
  const createContrato = useCreateContrato()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ================================
     FORM INICIAL CORRIGIDO
  =================================*/

  const initialForm: ContratoInsert = {
    numero_contrato: '',
    titulo: '',
    descricao: '',
    fornecedor_id: null, // 🔥 AGORA É NULL
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

  /* ================================
     FUNÇÕES
  =================================*/

  const getStatusReal = (contrato: any): StatusType => {
    if (contrato.data_fim) {
      const data = parseISO(contrato.data_fim)
      if (isValid(data)) {
        const dias = differenceInDays(data, new Date())
        if (dias < 0) return 'VENCIDO'
      }
    }
    return contrato.status
  }

  const calcularValorMensalAutomatico = () => {
    if (
      formData.data_inicio &&
      formData.data_fim &&
      formData.valor_total > 0
    ) {
      const inicio = parseISO(formData.data_inicio)
      const fim = parseISO(formData.data_fim)

      if (isValid(inicio) && isValid(fim)) {
        const dias = differenceInDays(fim, inicio)
        if (dias > 0) {
          const meses = dias / 30
          return Number((formData.valor_total / meses).toFixed(2))
        }
      }
    }
    return 0
  }

  /* ================================
     FILTRO
  =================================*/

  const filteredContratos = useMemo(() => {
    if (!contratos) return []

    return contratos.filter((contrato) => {
      const statusReal = getStatusReal(contrato)

      if (filterStatus !== 'all' && statusReal !== filterStatus) return false

      if (search) {
        const s = search.toLowerCase()
        return (
          contrato.numero_contrato?.toLowerCase().includes(s) ||
          contrato.titulo?.toLowerCase().includes(s) ||
          contrato.fornecedor?.razao_social?.toLowerCase().includes(s)
        )
      }

      return true
    })
  }, [contratos, search, filterStatus])

  /* ================================
     SUBMIT 100% CORRIGIDO
  =================================*/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.numero_contrato || !formData.titulo) {
      alert('Preencha os campos obrigatórios.')
      return
    }

    const duplicado = contratos?.some(
      (c) => c.numero_contrato === formData.numero_contrato
    )

    if (duplicado) {
      alert('Já existe contrato com esse número.')
      return
    }

    const valorMensalAuto = calcularValorMensalAutomatico()

    await createContrato.mutateAsync({
      ...formData,

      // 🔥 UUID NUNCA MAIS VAI VAZIO
      fornecedor_id:
        formData.fornecedor_id && formData.fornecedor_id !== ''
          ? formData.fornecedor_id
          : null,

      // 🔥 DATAS SEGURAS
      data_fim: formData.data_fim || null,

      // 🔥 NUMBERS SEGUROS
      valor_total: Number(formData.valor_total) || 0,
      valor_mensal:
        Number(formData.valor_mensal) > 0
          ? Number(formData.valor_mensal)
          : valorMensalAuto,

      responsavel_nome:
        formData.responsavel_nome || user?.email || 'Sistema',
    })

    setFormData(initialForm)
    setIsModalOpen(false)
  }

  /* ================================
     LOADING
  =================================*/

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  /* ================================
     RENDER
  =================================*/

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos e Terceiros</h1>
          <p className="text-muted-foreground">
            Gestão estratégica de contratos
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContratos.map((contrato) => {
              const statusReal = getStatusReal(contrato)

              return (
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
                      currency: 'BRL',
                    })}
                  </td>
                  <td>
                    <Badge>{statusReal}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
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
                    numero_contrato: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div>
              <Label>Fornecedor</Label>
              <Select
                value={formData.fornecedor_id ?? ''}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    fornecedor_id: v || null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_fantasia || f.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Valor Total</Label>
              <Input
                type="number"
                value={formData.valor_total || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    valor_total: Number(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={createContrato.isPending}
              >
                {createContrato.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
