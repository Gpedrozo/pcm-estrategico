import { useState } from 'react';
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
import { Plus, Search, Edit, Phone, User, Trash2, Loader2, AlertTriangle, Wrench, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useMecanicos,
  useCreateMecanico,
  useUpdateMecanico,
  useDeleteMecanico,
  type MecanicoRow,
} from '@/hooks/useMecanicos';
import { useAuth } from '@/contexts/AuthContext';

type TipoMecanico = 'PROPRIO' | 'TERCEIRIZADO';

interface FormData {
  nome: string;
  telefone: string;
  tipo: TipoMecanico | '';
  especialidade: string;
  custo_hora: string;
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  telefone: '',
  tipo: '',
  especialidade: '',
  custo_hora: '',
  ativo: true,
};

export default function Mecanicos() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<TipoMecanico | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMec, setEditingMec] = useState<MecanicoRow | null>(null);
  const [deletingMec, setDeletingMec] = useState<MecanicoRow | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: mecanicos, isLoading, error } = useMecanicos();
  const createMutation = useCreateMecanico();
  const updateMutation = useUpdateMecanico();
  const deleteMutation = useDeleteMecanico();

  const filteredMecanicos = mecanicos?.filter(mec => {
    if (filterTipo && mec.tipo !== filterTipo) return false;
    if (!search) return true;
    return mec.nome.toLowerCase().includes(search.toLowerCase()) ||
           mec.especialidade?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      nome: formData.nome,
      telefone: formData.telefone || null,
      tipo: formData.tipo || 'PROPRIO',
      especialidade: formData.especialidade || null,
      custo_hora: formData.custo_hora ? parseFloat(formData.custo_hora) : null,
      ativo: formData.ativo,
    };

    if (editingMec) {
      await updateMutation.mutateAsync({ id: editingMec.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    
    setIsModalOpen(false);
    setFormData(initialFormData);
    setEditingMec(null);
  };

  const handleEdit = (mec: MecanicoRow) => {
    setEditingMec(mec);
    setFormData({
      nome: mec.nome,
      telefone: mec.telefone || '',
      tipo: mec.tipo as TipoMecanico,
      especialidade: mec.especialidade || '',
      custo_hora: mec.custo_hora?.toString() || '',
      ativo: mec.ativo,
    });
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingMec(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
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
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mecânicos</h1>
          <p className="text-muted-foreground">
            Cadastro de mecânicos próprios e terceirizados • {mecanicos?.length || 0} registros
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Mecânico
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select 
            value={filterTipo || 'all'} 
            onValueChange={(value) => setFilterTipo(value === 'all' ? '' : value as TipoMecanico)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PROPRIO">Próprio</SelectItem>
              <SelectItem value="TERCEIRIZADO">Terceirizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nome</th>
              {isAdmin && <th>Telefone</th>}
              <th>Tipo</th>
              <th>Especialidade</th>
              <th>Custo/Hora</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredMecanicos.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum mecânico encontrado
                </td>
              </tr>
            ) : (
              filteredMecanicos.map((mec) => (
                <tr key={mec.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{mec.nome}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      {mec.telefone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {mec.telefone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      mec.tipo === 'PROPRIO'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}>
                      {mec.tipo === 'PROPRIO' ? 'Próprio' : 'Terceirizado'}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {mec.especialidade || '-'}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
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
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
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
