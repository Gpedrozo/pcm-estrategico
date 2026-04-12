import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Phone, User, Trash2, Loader2, AlertTriangle, Wrench, CalendarRange, ClipboardCheck, Download, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Eye, EyeOff, Palmtree, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useMecanicos,
  useCreateMecanico,
  useUpdateMecanico,
  useDeleteMecanico,
  type MecanicoRow,
} from '@/hooks/useMecanicos';
import { useExecucoesOS } from '@/hooks/useExecucoesOS';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useAuth } from '@/contexts/AuthContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { mecanicoSchema } from '@/schemas/mecanico.schema';
import { useToast } from '@/hooks/use-toast';

type TipoMecanico = 'PROPRIO' | 'TERCEIRIZADO' | 'INTERNO';

type SortColumn = 'nome' | 'tipo' | 'especialidade' | 'custo_hora' | 'ativo';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

function isProprio(tipo: string | null | undefined): boolean {
  return tipo === 'PROPRIO' || tipo === 'INTERNO';
}

function tipoLabel(tipo: string | null | undefined): string {
  if (isProprio(tipo)) return 'Próprio';
  if (tipo === 'TERCEIRIZADO') return 'Terceirizado';
  return tipo || '-';
}

function isEmFerias(mec: MecanicoRow): boolean {
  if (!mec.ferias_inicio || !mec.ferias_fim) return false;
  const now = new Date();
  return now >= new Date(mec.ferias_inicio) && now <= new Date(mec.ferias_fim);
}

function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface FormData {
  nome: string;
  telefone: string;
  tipo: TipoMecanico | '';
  especialidade: string;
  custo_hora: string;
  codigo_acesso: string;
  senha: string;
  escala_trabalho: string;
  folgas_planejadas: string;
  ferias_inicio: string;
  ferias_fim: string;
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  telefone: '',
  tipo: '',
  especialidade: '',
  custo_hora: '',
  codigo_acesso: '',
  senha: '',
  escala_trabalho: '',
  folgas_planejadas: '',
  ferias_inicio: '',
  ferias_fim: '',
  ativo: true,
};

export default function Mecanicos() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<TipoMecanico | ''>('');
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMec, setEditingMec] = useState<MecanicoRow | null>(null);
  const [deletingMec, setDeletingMec] = useState<MecanicoRow | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showSenha, setShowSenha] = useState(false);
  const { clearDraft: clearMecanicoDraft } = useFormDraft('draft:mecanico', formData, setFormData);

  const { data: mecanicos, isLoading, error } = useMecanicos();
  const { data: execucoes } = useExecucoesOS();
  const { data: ordens } = useOrdensServico();
  const createMutation = useCreateMecanico();
  const updateMutation = useUpdateMecanico();
  const deleteMutation = useDeleteMecanico();

  // Filter → Sort → Paginate
  const filteredMecanicos = useMemo(() => {
    let list = (mecanicos || []).filter(mec => {
      if (filterTipo) {
        if (filterTipo === 'PROPRIO' || filterTipo === 'INTERNO') {
          if (!isProprio(mec.tipo)) return false;
        } else if (mec.tipo !== filterTipo) return false;
      }
      if (filterAtivo === 'ativo' && !mec.ativo) return false;
      if (filterAtivo === 'inativo' && mec.ativo) return false;
      if (!search) return true;
      return mec.nome.toLowerCase().includes(search.toLowerCase()) ||
             mec.especialidade?.toLowerCase().includes(search.toLowerCase());
    });

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'nome': cmp = a.nome.localeCompare(b.nome); break;
        case 'tipo': cmp = (tipoLabel(a.tipo)).localeCompare(tipoLabel(b.tipo)); break;
        case 'especialidade': cmp = (a.especialidade || '').localeCompare(b.especialidade || ''); break;
        case 'custo_hora': cmp = (a.custo_hora || 0) - (b.custo_hora || 0); break;
        case 'ativo': cmp = (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [mecanicos, filterTipo, filterAtivo, search, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredMecanicos.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMecanicos = filteredMecanicos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page on filter change
  const handleFilterChange = useCallback(() => setCurrentPage(1), []);

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDir('asc'); }
  };

  const SortHeader = ({ col, children }: { col: SortColumn; children: React.ReactNode }) => (
    <th
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => toggleSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortColumn === col ? 'text-foreground' : 'text-muted-foreground/40'}`} />
      </div>
    </th>
  );

  const indicadores = useMemo(() => {
    const total = (mecanicos || []).length;
    const ativos = (mecanicos || []).filter((m) => m.ativo).length;
    const emFeriasAgora = (mecanicos || []).filter((m) => isEmFerias(m)).length;

    const byMecanico = new Map<string, { qtd: number; minutos: number }>();
    (execucoes || []).forEach((exec) => {
      const id = exec.mecanico_id || '';
      if (!id) return;
      const prev = byMecanico.get(id) || { qtd: 0, minutos: 0 };
      prev.qtd += 1;
      prev.minutos += Number(exec.tempo_execucao_liquido || exec.tempo_execucao || 0);
      byMecanico.set(id, prev);
    });

    const ranking = (mecanicos || [])
      .map((m) => {
        const stat = byMecanico.get(m.id) || { qtd: 0, minutos: 0 };
        const osAtribuidas = (ordens || []).filter((o) => o.mecanico_responsavel_id === m.id && !['FECHADA', 'CANCELADA'].includes((o.status || '').toUpperCase())).length;
        return {
          id: m.id,
          nome: m.nome,
          qtd: stat.qtd,
          horas: stat.minutos / 60,
          abertas: osAtribuidas,
        };
      })
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 3);

    return { total, ativos, emFeriasAgora, ranking };
  }, [mecanicos, execucoes, ordens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation before submit
    const zodPayload = {
      nome: formData.nome,
      telefone: formData.telefone ? formData.telefone.replace(/\D/g, '') : null,
      tipo: formData.tipo || 'PROPRIO',
      especialidade: formData.especialidade || null,
      custo_hora: formData.custo_hora ? parseFloat(formData.custo_hora) : null,
      codigo_acesso: formData.codigo_acesso || null,
      senha_hash: formData.senha || null,
      escala_trabalho: formData.escala_trabalho || null,
      folgas_planejadas: formData.folgas_planejadas || null,
      ferias_inicio: formData.ferias_inicio || null,
      ferias_fim: formData.ferias_fim || null,
      ativo: formData.ativo,
    };

    const parsed = mecanicoSchema.safeParse(zodPayload);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      toast({ title: 'Validação', description: firstError?.message || 'Dados inválidos', variant: 'destructive' });
      return;
    }

    const payload = parsed.data;

    if (editingMec) {
      await updateMutation.mutateAsync({ id: editingMec.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    
    setIsModalOpen(false);
    clearMecanicoDraft();
    setFormData(initialFormData);
    setEditingMec(null);
    setShowSenha(false);
  };

  const handleEdit = (mec: MecanicoRow) => {
    setEditingMec(mec);
    setFormData({
      nome: mec.nome,
      telefone: mec.telefone ? formatPhoneMask(mec.telefone) : '',
      tipo: (mec.tipo === 'INTERNO' ? 'PROPRIO' : mec.tipo) as TipoMecanico,
      especialidade: mec.especialidade || '',
      custo_hora: mec.custo_hora?.toString() || '',
      codigo_acesso: mec.codigo_acesso || '',
      senha: '',
      escala_trabalho: mec.escala_trabalho || '',
      folgas_planejadas: mec.folgas_planejadas || '',
      ferias_inicio: mec.ferias_inicio || '',
      ferias_fim: mec.ferias_fim || '',
      ativo: mec.ativo,
    });
    setShowSenha(false);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingMec(null);
    setFormData(initialFormData);
    setShowSenha(false);
    setIsModalOpen(true);
  };

  const generateCodigoAcesso = () => {
    const nextNum = (mecanicos?.length || 0) + 1;
    setFormData(prev => ({ ...prev, codigo_acesso: `MEC-${String(nextNum).padStart(3, '0')}` }));
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Tipo', 'Especialidade', 'Código Acesso', 'Escala', 'Férias Início', 'Férias Fim', 'Custo/Hora', 'Status'];
    const rows = filteredMecanicos.map(m => [
      m.nome,
      m.telefone || '',
      tipoLabel(m.tipo),
      m.especialidade || '',
      m.codigo_acesso || '',
      m.escala_trabalho || '',
      m.ferias_inicio ? new Date(m.ferias_inicio).toLocaleDateString('pt-BR') : '',
      m.ferias_fim ? new Date(m.ferias_fim).toLocaleDateString('pt-BR') : '',
      m.custo_hora != null ? Number(m.custo_hora).toFixed(2) : '',
      m.ativo ? 'Ativo' : 'Inativo',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mecanicos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (mec: MecanicoRow) => {
    setDeletingMec(mec);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingMec) {
      await deleteMutation.mutateAsync(deletingMec.id);
      setDeleteDialogOpen(false);
      setDeletingMec(null);
    }
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar mecânicos</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="module-page space-y-6">
      {/* Header */}
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mecânicos</h1>
          <p className="text-muted-foreground">
            Cadastro de mecânicos próprios e terceirizados • {mecanicos?.length || 0} registros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredMecanicos.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Mecânico
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Mecânicos cadastrados</p>
          <p className="text-2xl font-bold">{indicadores.total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Mecânicos ativos</p>
          <p className="text-2xl font-bold text-success">{indicadores.ativos}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Em férias agora</p>
            {indicadores.emFeriasAgora > 0 && <Palmtree className="h-4 w-4 text-warning" />}
          </div>
          <p className="text-2xl font-bold text-warning">{indicadores.emFeriasAgora}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Top executor</p>
          <p className="text-lg font-semibold truncate">{indicadores.ranking[0]?.nome || '-'}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Ranking operacional (últimas execuções)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {indicadores.ranking.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <p className="font-medium truncate">{item.nome}</p>
              <p className="text-xs text-muted-foreground mt-1">Execuções: {item.qtd}</p>
              <p className="text-xs text-muted-foreground">Horas produtivas: {item.horas.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">O.S atribuídas em aberto: {item.abertas}</p>
            </div>
          ))}
          {indicadores.ranking.length === 0 && (
            <div className="text-sm text-muted-foreground">Sem dados de execução suficientes.</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              className="pl-9"
            />
          </div>
          <Select 
            value={filterTipo || 'all'} 
            onValueChange={(value) => { setFilterTipo(value === 'all' ? '' : value as TipoMecanico); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="PROPRIO">Próprio</SelectItem>
              <SelectItem value="TERCEIRIZADO">Terceirizado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterAtivo}
            onValueChange={(value) => { setFilterAtivo(value as 'all' | 'ativo' | 'inativo'); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Apenas ativos</SelectItem>
              <SelectItem value="inativo">Apenas inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <SortHeader col="nome">Nome</SortHeader>
              {isAdmin && <th>Telefone</th>}
              <SortHeader col="tipo">Tipo</SortHeader>
              <SortHeader col="especialidade">Especialidade</SortHeader>
              <th>Código</th>
              <th>Escala</th>
              <th>Férias</th>
              <SortHeader col="custo_hora">Custo/Hora</SortHeader>
              <th>Último Login</th>
              <SortHeader col="ativo">Status</SortHeader>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMecanicos.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum mecânico encontrado
                </td>
              </tr>
            ) : (
              paginatedMecanicos.map((mec) => {
                const emFerias = isEmFerias(mec);
                return (
                <tr key={mec.id} className={emFerias ? 'bg-warning/5' : undefined}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${emFerias ? 'bg-warning/20' : 'bg-muted'}`}>
                        {emFerias ? <Palmtree className="h-4 w-4 text-warning" /> : <User className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <span className="font-medium">{mec.nome}</span>
                        {emFerias && <span className="ml-2 text-xs text-warning font-medium">Em férias</span>}
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      {mec.telefone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {formatPhoneMask(mec.telefone)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      isProprio(mec.tipo)
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}>
                      {tipoLabel(mec.tipo)}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {mec.especialidade || '-'}
                  </td>
                  <td className="font-mono text-xs">{mec.codigo_acesso || '-'}</td>
                  <td className="text-xs text-muted-foreground">{mec.escala_trabalho || '-'}</td>
                  <td className="text-xs text-muted-foreground">
                    {mec.ferias_inicio && mec.ferias_fim
                      ? `${new Date(mec.ferias_inicio).toLocaleDateString('pt-BR')} - ${new Date(mec.ferias_fim).toLocaleDateString('pt-BR')}`
                      : '-'}
                  </td>
                  <td>
                    {mec.custo_hora ? (
                      <span className="font-mono text-sm">
                        R$ {Number(mec.custo_hora).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {mec.ultimo_login_portal ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(mec.ultimo_login_portal).toLocaleDateString('pt-BR')}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      mec.ativo 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {mec.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(mec)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(mec)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {filteredMecanicos.length} resultado{filteredMecanicos.length !== 1 ? 's' : ''} • Página {safePage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-1">…</span>}
                    <Button
                      variant={p === safePage ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[2rem]"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  </span>
                ))
              }
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMec ? 'Editar Mecânico' : 'Novo Mecânico'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo ou razão social"
                required
                minLength={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoMecanico })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROPRIO">Próprio</SelectItem>
                    <SelectItem value="TERCEIRIZADO">Terceirizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhoneMask(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_acesso">Código de Acesso (portal)</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo_acesso"
                    value={formData.codigo_acesso}
                    onChange={(e) => setFormData({ ...formData, codigo_acesso: e.target.value.toUpperCase() })}
                    placeholder="Ex: MEC-001"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={generateCodigoAcesso} title="Gerar código automaticamente">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha (portal do mecânico)</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder={editingMec ? '(manter atual)' : 'Definir senha'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSenha(!showSenha)}
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {editingMec && <p className="text-xs text-muted-foreground">Deixe em branco para não alterar</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="escala_trabalho">Escala de trabalho</Label>
                <Input
                  id="escala_trabalho"
                  value={formData.escala_trabalho}
                  onChange={(e) => setFormData({ ...formData, escala_trabalho: e.target.value })}
                  placeholder="Ex: 12x36, Seg-Sex 07:00-17:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folgas_planejadas">Folgas/finais de semana/feriados</Label>
                <Input
                  id="folgas_planejadas"
                  value={formData.folgas_planejadas}
                  onChange={(e) => setFormData({ ...formData, folgas_planejadas: e.target.value })}
                  placeholder="Ex: Domingos + feriados nacionais"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ferias_inicio" className="flex items-center gap-2"><CalendarRange className="h-4 w-4" />Férias início</Label>
                <Input
                  id="ferias_inicio"
                  type="date"
                  value={formData.ferias_inicio}
                  onChange={(e) => setFormData({ ...formData, ferias_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ferias_fim" className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Férias fim</Label>
                <Input
                  id="ferias_fim"
                  type="date"
                  value={formData.ferias_fim}
                  onChange={(e) => setFormData({ ...formData, ferias_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                  placeholder="Ex: Mecânica Geral"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo_hora">Custo/Hora (R$)</Label>
                <Input
                  id="custo_hora"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.custo_hora}
                  onChange={(e) => setFormData({ ...formData, custo_hora: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {editingMec && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo">Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.ativo ? 'Mecânico ativo no sistema' : 'Mecânico inativo'}
                  </p>
                </div>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={!formData.nome || !formData.tipo || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMec ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o mecânico{' '}
              <span className="font-bold text-foreground">{deletingMec?.nome}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
