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
import { Plus, Search, FileText, DollarSign, Clock, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useContratos, useCreateContrato, type ContratoInsert } from '@/hooks/useContratos';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Contratos() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createContrato.mutateAsync({
      ...formData,
      responsavel_nome: formData.responsavel_nome || user?.email || 'Sistema',
    });
    setIsModalOpen(false);
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ATIVO':
        return <Badge className="bg-success/10 text-success">Ativo</Badge>;
      case 'SUSPENSO':
        return <Badge className="bg-warning/10 text-warning">Suspenso</Badge>;
      case 'ENCERRADO':
        return <Badge className="bg-muted text-muted-foreground">Encerrado</Badge>;
      case 'VENCIDO':
        return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDiasRestantes = (dataFim: string | null) => {
    if (!dataFim) return null;
    const dias = differenceInDays(parseISO(dataFim), new Date());
    if (dias < 0) return <span className="text-destructive font-medium">Vencido há {Math.abs(dias)} dias</span>;
    if (dias <= 30) return <span className="text-warning font-medium">{dias} dias restantes</span>;
    return <span className="text-muted-foreground">{dias} dias restantes</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos e Terceiros</h1>
          <p className="text-muted-foreground">Gestão de contratos com fornecedores e prestadores de serviço</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Contratos</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Contratos Ativos</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Vencendo em 30 dias</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.vencendo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-info" />
              <span className="text-sm text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por número, título ou fornecedor..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="SUSPENSO">Suspenso</SelectItem>
            <SelectItem value="ENCERRADO">Encerrado</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº Contrato</th>
              <th>Título</th>
              <th>Fornecedor</th>
              <th>Tipo</th>
              <th>Valor Total</th>
              <th>Vigência</th>
              <th>Status</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {filteredContratos.map(contrato => (
              <tr key={contrato.id}>
                <td className="font-mono font-medium text-primary">{contrato.numero_contrato}</td>
                <td className="font-medium">{contrato.titulo}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {contrato.fornecedor?.nome_fantasia || contrato.fornecedor?.razao_social || '-'}
                  </div>
                </td>
                <td>
                  <Badge variant="outline">{contrato.tipo}</Badge>
                </td>
                <td className="font-mono">
                  {contrato.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '-'}
                </td>
                <td>
                  <div className="text-sm">
                    <div>{format(parseISO(contrato.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</div>
                    <div className="text-muted-foreground">
                      {contrato.data_fim ? getDiasRestantes(contrato.data_fim) : 'Indeterminado'}
                    </div>
                  </div>
                </td>
                <td>{getStatusBadge(contrato.status)}</td>
                <td>
                  <div className="text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Atend: {contrato.sla_atendimento_horas || '-'}h
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Resol: {contrato.sla_resolucao_horas || '-'}h
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredContratos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum contrato encontrado</p>
            <p className="text-sm">Clique em "Novo Contrato" para cadastrar</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Contrato *</Label>
                <Input 
                  required 
                  value={formData.numero_contrato} 
                  onChange={(e) => setFormData({...formData, numero_contrato: e.target.value.toUpperCase()})} 
                  placeholder="CT-2025-001" 
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select 
                  value={formData.fornecedor_id || ''} 
                  onValueChange={(value) => setFormData({...formData, fornecedor_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores?.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia || f.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título do Contrato *</Label>
              <Input 
                required 
                value={formData.titulo} 
                onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                placeholder="Contrato de Manutenção Preventiva" 
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao || ''} 
                onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                placeholder="Descreva o escopo do contrato..." 
                rows={3} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select 
                  value={formData.tipo || ''} 
                  onValueChange={(value) => setFormData({...formData, tipo: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICO">Serviço</SelectItem>
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="MISTO">Misto</SelectItem>
                    <SelectItem value="LOCACAO">Locação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                    <SelectItem value="ENCERRADO">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.data_inicio} 
                  onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input 
                  type="date" 
                  value={formData.data_fim || ''} 
                  onChange={(e) => setFormData({...formData, data_fim: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.valor_total || ''} 
                  onChange={(e) => setFormData({...formData, valor_total: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Mensal (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.valor_mensal || ''} 
                  onChange={(e) => setFormData({...formData, valor_mensal: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SLA Atendimento (horas)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={formData.sla_atendimento_horas || ''} 
                  onChange={(e) => setFormData({...formData, sla_atendimento_horas: parseInt(e.target.value) || undefined})} 
                />
              </div>
              <div className="space-y-2">
                <Label>SLA Resolução (horas)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={formData.sla_resolucao_horas || ''} 
                  onChange={(e) => setFormData({...formData, sla_resolucao_horas: parseInt(e.target.value) || undefined})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Penalidades</Label>
              <Textarea 
                value={formData.penalidade_descricao || ''} 
                onChange={(e) => setFormData({...formData, penalidade_descricao: e.target.value})} 
                placeholder="Descreva as penalidades por descumprimento..." 
                rows={2} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContrato.isPending}>
                {createContrato.isPending ? 'Salvando...' : 'Salvar Contrato'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
