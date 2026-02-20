import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, FileText, DollarSign, Clock, Building2, AlertCircle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { 
  useContratos, 
  useCreateContrato, 
  useUpdateContrato,
  useDeleteContrato,
  type ContratoInsert 
} from '@/hooks/useContratos';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Contratos() {
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<any>(null);

  const [formData, setFormData] = useState<ContratoInsert>({
    numero_contrato: '',
    titulo: '',
    descricao: '',
    fornecedor_id: '',
    tipo: 'SERVICO',
    status: 'ATIVO',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    valor_total: 0,
    valor_mensal: 0,
    sla_atendimento_horas: 4,
    sla_resolucao_horas: 24,
    responsavel_nome: '',
    penalidade_descricao: '',
  });

  const { data: contratos, isLoading } = useContratos();
  const { data: fornecedores } = useFornecedores();
  const createContrato = useCreateContrato();
  const updateContrato = useUpdateContrato();
  const deleteContrato = useDeleteContrato();

  const filteredContratos = contratos?.filter(contrato => {
    if (filterStatus !== 'all' && contrato.status !== filterStatus) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        contrato.numero_contrato.toLowerCase().includes(searchLower) ||
        contrato.titulo.toLowerCase().includes(searchLower) ||
        contrato.fornecedor?.razao_social?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const stats = {
    total: contratos?.length || 0,
    ativos: contratos?.filter(c => c.status === 'ATIVO').length || 0,
    vencendo: contratos?.filter(c => {
      if (!c.data_fim) return false;
      const diasRestantes = differenceInDays(parseISO(c.data_fim), new Date());
      return diasRestantes > 0 && diasRestantes <= 30;
    }).length || 0,
    valorTotal: contratos?.reduce((acc, c) => acc + (c.valor_total || 0), 0) || 0,
  };

  const handleEdit = (contrato: any) => {
    setEditingContrato(contrato);
    setFormData({
      ...contrato,
      data_inicio: contrato.data_inicio?.slice(0, 10),
      data_fim: contrato.data_fim?.slice(0, 10) || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingContrato) {
      await updateContrato.mutateAsync({
        id: editingContrato.id,
        data: formData,
      });
    } else {
      await createContrato.mutateAsync({
        ...formData,
        responsavel_nome: formData.responsavel_nome || user?.email || 'Sistema',
      });
    }

    setIsModalOpen(false);
    setEditingContrato(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      numero_contrato: '',
      titulo: '',
      descricao: '',
      fornecedor_id: '',
      tipo: 'SERVICO',
      status: 'ATIVO',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: '',
      valor_total: 0,
      valor_mensal: 0,
      sla_atendimento_horas: 4,
      sla_resolucao_horas: 24,
      responsavel_nome: '',
      penalidade_descricao: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      await deleteContrato.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratos e Terceiros</h1>
        <Button onClick={() => {
          setEditingContrato(null);
          resetForm();
          setIsModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº Contrato</th>
              <th>Título</th>
              <th>Fornecedor</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredContratos.map((contrato) => (
              <tr key={contrato.id}>
                <td>{contrato.numero_contrato}</td>
                <td>{contrato.titulo}</td>
                <td>{contrato.fornecedor?.razao_social || '-'}</td>
                <td>{contrato.tipo}</td>
                <td>
                  {contrato.valor_total?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td>{contrato.status}</td>
                <td>
                  {contrato.sla_atendimento_horas}h / {contrato.sla_resolucao_horas}h
                </td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(contrato)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(contrato.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              required
              value={formData.numero_contrato}
              onChange={(e) =>
                setFormData({ ...formData, numero_contrato: e.target.value })
              }
              placeholder="Número do contrato"
            />

            <Input
              required
              value={formData.titulo}
              onChange={(e) =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              placeholder="Título"
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingContrato(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={
                  createContrato.isPending || updateContrato.isPending
                }
              >
                {editingContrato
                  ? updateContrato.isPending
                    ? 'Atualizando...'
                    : 'Atualizar Contrato'
                  : createContrato.isPending
                  ? 'Salvando...'
                  : 'Salvar Contrato'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
