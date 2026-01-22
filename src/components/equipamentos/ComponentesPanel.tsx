import { useState } from 'react';
import { Plus, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ComponenteTree } from './ComponenteTree';
import { ComponenteFormDialog } from './ComponenteFormDialog';
import { 
  ComponenteEquipamento,
  useComponentesEquipamento,
  useAllComponentes,
  useDeleteComponente,
  useDuplicateComponente,
  TIPOS_COMPONENTE,
} from '@/hooks/useComponentesEquipamento';
import { useAuth } from '@/contexts/AuthContext';

interface ComponentesPanelProps {
  equipamentoId: string;
  equipamentoTag: string;
}

export function ComponentesPanel({ equipamentoId, equipamentoTag }: ComponentesPanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.tipo === 'ADMIN';

  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingComponente, setEditingComponente] = useState<ComponenteEquipamento | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [deleteComponente, setDeleteComponente] = useState<ComponenteEquipamento | null>(null);
  const [duplicateComponente, setDuplicateComponente] = useState<ComponenteEquipamento | null>(null);

  const { data: componentesTree, isLoading } = useComponentesEquipamento(equipamentoId);
  const { data: allComponentes } = useAllComponentes(equipamentoId);
  const deleteMutation = useDeleteComponente();
  const duplicateMutation = useDuplicateComponente();

  const handleNew = () => {
    setEditingComponente(null);
    setParentIdForNew(null);
    setFormOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingComponente(null);
    setParentIdForNew(parentId);
    setFormOpen(true);
  };

  const handleEdit = (componente: ComponenteEquipamento) => {
    setEditingComponente(componente);
    setParentIdForNew(null);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteComponente) {
      await deleteMutation.mutateAsync(deleteComponente.id);
      setDeleteComponente(null);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (duplicateComponente) {
      const newCodigo = `${duplicateComponente.codigo}-COPIA`;
      await duplicateMutation.mutateAsync({ componente: duplicateComponente, newCodigo });
      setDuplicateComponente(null);
    }
  };

  // Filter logic for tree display
  const filterComponentes = (componentes: ComponenteEquipamento[]): ComponenteEquipamento[] => {
    return componentes.map(comp => {
      const filteredChildren = comp.children ? filterComponentes(comp.children) : [];
      const matchesSearch = !search || 
        comp.nome.toLowerCase().includes(search.toLowerCase()) ||
        comp.codigo.toLowerCase().includes(search.toLowerCase());
      const matchesTipo = tipoFilter === 'all' || comp.tipo === tipoFilter;
      
      if ((matchesSearch && matchesTipo) || filteredChildren.length > 0) {
        return { ...comp, children: filteredChildren };
      }
      return null;
    }).filter(Boolean) as ComponenteEquipamento[];
  };

  const filteredTree = componentesTree ? filterComponentes(componentesTree) : [];

  // Stats
  const totalComponentes = allComponentes?.length || 0;
  const tiposCounts = allComponentes?.reduce((acc, comp) => {
    acc[comp.tipo] = (acc[comp.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const parentOptions = allComponentes?.map(c => ({
    id: c.id,
    nome: c.nome,
    codigo: c.codigo,
  })) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Componentes do Equipamento</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {totalComponentes} componente{totalComponentes !== 1 ? 's' : ''} cadastrado{totalComponentes !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Componente
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS_COMPONENTE.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label} {tiposCounts[tipo.value] ? `(${tiposCounts[tipo.value]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Component Tree */}
        <ComponenteTree
          componentes={filteredTree}
          onEdit={handleEdit}
          onDelete={setDeleteComponente}
          onDuplicate={setDuplicateComponente}
          onAddChild={handleAddChild}
          isAdmin={isAdmin}
        />

        {/* Form Dialog */}
        <ComponenteFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          equipamentoId={equipamentoId}
          componente={editingComponente}
          parentId={parentIdForNew}
          parentOptions={parentOptions}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteComponente} onOpenChange={() => setDeleteComponente(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o componente "{deleteComponente?.nome}"?
                {deleteComponente?.children && deleteComponente.children.length > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Atenção: Todos os subcomponentes também serão excluídos!
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate Confirmation */}
        <AlertDialog open={!!duplicateComponente} onOpenChange={() => setDuplicateComponente(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicar Componente</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja criar uma cópia do componente "{duplicateComponente?.nome}"?
                O novo componente terá o código "{duplicateComponente?.codigo}-COPIA".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDuplicateConfirm}>
                Duplicar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
