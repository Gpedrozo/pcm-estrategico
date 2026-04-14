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
import { Plus, Search, FileText, DollarSign, AlertCircle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { useFormDraft } from '@/hooks/useFormDraft';

export default function Contratos() {
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<any>(null);

  const [formData, setFormData] = useState<ContratoInsert>({
    numero_contrato: 'AUTO',
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
  const { clearDraft: clearContratoDraft } = useFormDraft('draft:contrato', formData, setFormData);

  const { data: contratos, isLoading } = useContratos();
  const { data: fornecedores } = useFornecedores();
  const createContrato = useCreateContrato();
  const updateContrato = useUpdateContrato();
  const deleteContrato = useDeleteContrato();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

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
      numero_contrato: contrato.numero_contrato,
      titulo: contrato.titulo,
      descricao: contrato.descricao || '',
      fornecedor_id: contrato.fornecedor_id || '',
      tipo: contrato.tipo || 'SERVICO',
      status: contrato.status || 'ATIVO',
      data_inicio: contrato.data_inicio?.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'),
      data_fim: contrato.data_fim?.slice(0, 10) || '',
      valor_total: contrato.valor_total ?? 0,
      valor_mensal: contrato.valor_mensal ?? 0,
      sla_atendimento_horas: contrato.sla_atendimento_horas ?? 4,
      sla_resolucao_horas: contrato.sla_resolucao_horas ?? 24,
      responsavel_nome: contrato.responsavel_nome || '',
      penalidade_descricao: contrato.penalidade_descricao || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = {
      ...formData,
      fornecedor_id: formData.fornecedor_id || null,
      data_fim: formData.data_fim || null,
      descricao: formData.descricao || null,
      responsavel_nome: formData.responsavel_nome || null,
      penalidade_descricao: formData.penalidade_descricao || null,
    };

    if (editingContrato) {
      await updateContrato.mutateAsync({
        id: editingContrato.id,
        ...cleaned,
      });
    } else {
      await createContrato.mutateAsync({
        ...cleaned,
        responsavel_nome: cleaned.responsavel_nome || user?.email || 'Sistema',
      });
    }

    setIsModalOpen(false);
    setEditingContrato(null);
    resetForm();
  };

  const resetForm = () => {
    clearContratoDraft();
    setFormData({
      numero_contrato: 'AUTO',
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
    confirm({
      title: 'Excluir contrato',
      description: 'Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.',
      onConfirm: () => deleteContrato.mutateAsync(id),
    });
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">

      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos e Terceiros</h1>
          <p className="text-muted-foreground">Gestão de contratos com terceiros e prestadores de serviço</p>
        </div>
        <Button onClick={() => {
          setEditingContrato(null);
          resetForm();
          setIsModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Contratos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{stats.ativos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Vencendo em 30d</p>
              <p className="text-2xl font-bold">{stats.vencendo}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">{stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por número, título ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="SUSPENSO">Suspenso</SelectItem>
            <SelectItem value="ENCERRADO">Encerrado</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
            <SelectItem value="RASCUNHO">Rascunho</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
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
                <td>{contrato.fornecedor?.razao_social || contrato.fornecedor?.nome || '-'}</td>
                <td>{contrato.tipo}</td>
                <td>
                  {contrato.valor_total?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td>
                  <Badge variant={
                    contrato.status === 'ATIVO' ? 'default' :
                    contrato.status === 'VENCIDO' || contrato.status === 'CANCELADO' ? 'destructive' :
                    contrato.status === 'SUSPENSO' || contrato.status === 'RASCUNHO' ? 'secondary' :
                    'outline'
                  }>
                    {contrato.status}
                  </Badge>
                </td>
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
            {filteredContratos.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {/* Número + Título */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Contrato</Label>
                {editingContrato ? (
                  <Input value={editingContrato.numero_contrato} disabled className="bg-muted font-mono" />
                ) : (
                  <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted">Gerado automaticamente</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título do contrato"
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do contrato"
                rows={2}
              />
            </div>

            {/* Fornecedor + Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select
                  value={formData.fornecedor_id || undefined}
                  onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.razao_social || f.nome_fantasia || f.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICO">Serviço</SelectItem>
                    <SelectItem value="FORNECIMENTO">Fornecimento</SelectItem>
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="MISTO">Misto</SelectItem>
                    <SelectItem value="LOCACAO">Locação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status + Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                    <SelectItem value="ENCERRADO">Encerrado</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_nome">Responsável</Label>
                <Input
                  id="responsavel_nome"
                  value={formData.responsavel_nome || ''}
                  onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  required
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim || ''}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_total">Valor Total (R$)</Label>
                <Input
                  id="valor_total"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor_total}
                  onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_mensal">Valor Mensal (R$)</Label>
                <Input
                  id="valor_mensal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor_mensal}
                  onChange={(e) => setFormData({ ...formData, valor_mensal: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* SLA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sla_atendimento_horas">SLA Atendimento (horas)</Label>
                <Input
                  id="sla_atendimento_horas"
                  type="number"
                  min="1"
                  value={formData.sla_atendimento_horas}
                  onChange={(e) => setFormData({ ...formData, sla_atendimento_horas: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla_resolucao_horas">SLA Resolução (horas)</Label>
                <Input
                  id="sla_resolucao_horas"
                  type="number"
                  min="1"
                  value={formData.sla_resolucao_horas}
                  onChange={(e) => setFormData({ ...formData, sla_resolucao_horas: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Penalidades */}
            <div className="space-y-2">
              <Label htmlFor="penalidade_descricao">Penalidades</Label>
              <Textarea
                id="penalidade_descricao"
                value={formData.penalidade_descricao || ''}
                onChange={(e) => setFormData({ ...formData, penalidade_descricao: e.target.value })}
                placeholder="Descrição das penalidades contratuais"
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-2">
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
      {ConfirmDialogElement}
    </div>
  );
}
