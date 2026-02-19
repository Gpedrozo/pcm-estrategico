import { useState, useMemo } from 'react';
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

type StatusType = 'ATIVO' | 'SUSPENSO' | 'ENCERRADO' | 'VENCIDO';

export default function Contratos() {
  const { user } = useAuth();
  const { data: contratos, isLoading } = useContratos();
  const { data: fornecedores } = useFornecedores();
  const createContrato = useCreateContrato();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const initialForm: ContratoInsert = {
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
  };

  const [formData, setFormData] = useState<ContratoInsert>(initialForm);

  /* ================================
     FUNÇÕES INTELIGENTES
  =================================*/

  const getStatusReal = (contrato: any): StatusType => {
    if (contrato.data_fim) {
      const dias = differenceInDays(parseISO(contrato.data_fim), new Date());
      if (dias < 0) return 'VENCIDO';
    }
    return contrato.status;
  };

  const calcularValorMensalAutomatico = () => {
    if (formData.data_inicio && formData.data_fim && formData.valor_total) {
      const dias = differenceInDays(parseISO(formData.data_fim), parseISO(formData.data_inicio));
      if (dias > 0) {
        const meses = dias / 30;
        return Number((formData.valor_total / meses).toFixed(2));
      }
    }
    return 0;
  };

  /* ================================
     MEMOIZAÇÕES (PERFORMANCE)
  =================================*/

  const filteredContratos = useMemo(() => {
    if (!contratos) return [];

    return contratos.filter((contrato) => {
      const statusReal = getStatusReal(contrato);

      if (filterStatus !== 'all' && statusReal !== filterStatus) return false;

      if (search) {
        const s = search.toLowerCase();
        return (
          contrato.numero_contrato?.toLowerCase().includes(s) ||
          contrato.titulo?.toLowerCase().includes(s) ||
          contrato.fornecedor?.razao_social?.toLowerCase().includes(s)
        );
      }

      return true;
    });
  }, [contratos, search, filterStatus]);

  const stats = useMemo(() => {
    if (!contratos) {
      return { total: 0, ativos: 0, vencendo: 0, valorTotal: 0, valorMensal: 0 };
    }

    return {
      total: contratos.length,
      ativos: contratos.filter(c => getStatusReal(c) === 'ATIVO').length,
      vencendo: contratos.filter(c => {
        if (!c.data_fim) return false;
        const dias = differenceInDays(parseISO(c.data_fim), new Date());
        return dias > 0 && dias <= 30;
      }).length,
      valorTotal: contratos.reduce((acc, c) => acc + (c.valor_total || 0), 0),
      valorMensal: contratos.reduce((acc, c) => acc + (c.valor_mensal || 0), 0),
    };
  }, [contratos]);

  /* ================================
     SUBMIT ROBUSTO
  =================================*/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero_contrato || !formData.titulo) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const duplicado = contratos?.some(
      c => c.numero_contrato === formData.numero_contrato
    );

    if (duplicado) {
      alert('Já existe contrato com esse número.');
      return;
    }

    const valorMensalAuto = calcularValorMensalAutomatico();

    await createContrato.mutateAsync({
      ...formData,
      valor_mensal: formData.valor_mensal || valorMensalAuto,
      responsavel_nome: formData.responsavel_nome || user?.email || 'Sistema',
    });

    setFormData(initialForm);
    setIsModalOpen(false);
  };

  const getStatusBadge = (status: StatusType) => {
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
    if (!dataFim) return 'Indeterminado';
    const dias = differenceInDays(parseISO(dataFim), new Date());
    if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
    return `${dias} dias restantes`;
  };

  /* ================================
     LOADING
  =================================*/

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

  /* ================================
     RENDER
  =================================*/

  return (
    <div className="space-y-6">

      {/* HEADER */}
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

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Total
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Ativos
          </div>
          <p className="text-2xl font-bold text-success">{stats.ativos}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Vencendo
          </div>
          <p className="text-2xl font-bold text-warning">{stats.vencendo}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-info" />
            Total R$
          </div>
          <p className="text-2xl font-bold">
            {stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </CardContent></Card>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-4 bg-card border rounded-lg p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
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

      {/* TABELA */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Título</th>
              <th>Fornecedor</th>
              <th>Valor</th>
              <th>Vigência</th>
              <th>Status</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {filteredContratos.map((contrato) => {
              const statusReal = getStatusReal(contrato);

              return (
                <tr key={contrato.id}>
                  <td className="font-mono text-primary">
                    {contrato.numero_contrato}
                  </td>
                  <td>{contrato.titulo}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {contrato.fornecedor?.nome_fantasia ||
                        contrato.fornecedor?.razao_social || '-'}
                    </div>
                  </td>
                  <td className="font-mono">
                    {contrato.valor_total?.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="text-sm">
                    {format(parseISO(contrato.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    <div className="text-muted-foreground">
                      {getDiasRestantes(contrato.data_fim)}
                    </div>
                  </td>
                  <td>{getStatusBadge(statusReal)}</td>
                  <td className="text-xs">
                    At: {contrato.sla_atendimento_horas || '-'}h <br />
                    Rs: {contrato.sla_resolucao_horas || '-'}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número *</Label>
                <Input
                  required
                  value={formData.numero_contrato}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_contrato: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={formData.fornecedor_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}
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
                  setFormData({ ...formData, valor_total: Number(e.target.value) })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContrato.isPending}>
                {createContrato.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
