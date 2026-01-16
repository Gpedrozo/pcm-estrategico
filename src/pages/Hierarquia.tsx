import { useState } from 'react';
import { 
  Building2, 
  Layers, 
  Cpu, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePlantas,
  useCreatePlanta,
  useUpdatePlanta,
  useDeletePlanta,
  useAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
  useSistemas,
  useCreateSistema,
  useUpdateSistema,
  useDeleteSistema,
  PlantaRow,
  PlantaInsert,
  AreaRow,
  AreaInsert,
  SistemaRow,
  SistemaInsert,
} from '@/hooks/useHierarquia';

type EntityType = 'planta' | 'area' | 'sistema';

export default function Hierarquia() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<EntityType>('planta');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  
  // Queries
  const { data: plantas, isLoading: loadingPlantas } = usePlantas();
  const { data: areas, isLoading: loadingAreas } = useAreas();
  const { data: sistemas, isLoading: loadingSistemas } = useSistemas();
  
  // Mutations - Plantas
  const createPlanta = useCreatePlanta();
  const updatePlanta = useUpdatePlanta();
  const deletePlanta = useDeletePlanta();
  
  // Mutations - Áreas
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  
  // Mutations - Sistemas
  const createSistema = useCreateSistema();
  const updateSistema = useUpdateSistema();
  const deleteSistema = useDeleteSistema();
  
  const isLoading = loadingPlantas || loadingAreas || loadingSistemas;
  
  // Filter data based on search
  const filteredPlantas = plantas?.filter(p => 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const filteredAreas = areas?.filter(a => 
    a.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.planta as any)?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const filteredSistemas = sistemas?.filter(s => 
    s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.area as any)?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      ativo: true,
      planta_id: plantas?.[0]?.id || '',
      area_id: areas?.[0]?.id || '',
    });
    setIsModalOpen(true);
  };
  
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };
  
  const openDeleteDialog = (item: any) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    const isEditing = !!editingItem;
    
    try {
      if (activeTab === 'planta') {
        if (isEditing) {
          await updatePlanta.mutateAsync({ id: editingItem.id, ...formData });
        } else {
          await createPlanta.mutateAsync(formData as PlantaInsert);
        }
      } else if (activeTab === 'area') {
        if (isEditing) {
          await updateArea.mutateAsync({ id: editingItem.id, ...formData });
        } else {
          await createArea.mutateAsync(formData as AreaInsert);
        }
      } else if (activeTab === 'sistema') {
        if (isEditing) {
          await updateSistema.mutateAsync({ id: editingItem.id, ...formData });
        } else {
          await createSistema.mutateAsync(formData as SistemaInsert);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleDelete = async () => {
    if (!deletingItem) return;
    
    try {
      if (activeTab === 'planta') {
        await deletePlanta.mutateAsync(deletingItem.id);
      } else if (activeTab === 'area') {
        await deleteArea.mutateAsync(deletingItem.id);
      } else if (activeTab === 'sistema') {
        await deleteSistema.mutateAsync(deletingItem.id);
      }
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const getTabIcon = (tab: EntityType) => {
    switch (tab) {
      case 'planta': return Building2;
      case 'area': return Layers;
      case 'sistema': return Cpu;
    }
  };
  
  const getTabLabel = (tab: EntityType) => {
    switch (tab) {
      case 'planta': return 'Plantas';
      case 'area': return 'Áreas';
      case 'sistema': return 'Sistemas';
    }
  };
  
  const isSubmitting = 
    createPlanta.isPending || updatePlanta.isPending ||
    createArea.isPending || updateArea.isPending ||
    createSistema.isPending || updateSistema.isPending;
  
  const isDeleting = 
    deletePlanta.isPending || deleteArea.isPending || deleteSistema.isPending;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hierarquia de Ativos</h1>
          <p className="text-muted-foreground">
            Estrutura ISO 14224: Planta → Área → Sistema → Equipamento
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo {activeTab === 'planta' ? 'Planta' : activeTab === 'area' ? 'Área' : 'Sistema'}
        </Button>
      </div>
      
      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList className="grid w-full grid-cols-3">
          {(['planta', 'area', 'sistema'] as EntityType[]).map((tab) => {
            const Icon = getTabIcon(tab);
            const count = tab === 'planta' ? plantas?.length : tab === 'area' ? areas?.length : sistemas?.length;
            return (
              <TabsTrigger key={tab} value={tab} className="gap-2">
                <Icon className="h-4 w-4" />
                {getTabLabel(tab)}
                <Badge variant="secondary" className="ml-1">{count || 0}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {/* Plantas Tab */}
        <TabsContent value="planta">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Endereço</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlantas.length > 0 ? (
                  filteredPlantas.map((planta) => (
                    <tr key={planta.id}>
                      <td className="font-mono font-medium text-primary">{planta.codigo}</td>
                      <td className="font-medium">{planta.nome}</td>
                      <td className="text-muted-foreground">{planta.endereco || '-'}</td>
                      <td>{planta.responsavel || '-'}</td>
                      <td>
                        <Badge variant={planta.ativo ? 'default' : 'secondary'}>
                          {planta.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(planta)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(planta)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma planta cadastrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        {/* Áreas Tab */}
        <TabsContent value="area">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Planta</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAreas.length > 0 ? (
                  filteredAreas.map((area) => (
                    <tr key={area.id}>
                      <td className="font-mono font-medium text-primary">{area.codigo}</td>
                      <td className="font-medium">{area.nome}</td>
                      <td>
                        <Badge variant="outline">{(area.planta as any)?.nome || '-'}</Badge>
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate">
                        {area.descricao || '-'}
                      </td>
                      <td>
                        <Badge variant={area.ativo ? 'default' : 'secondary'}>
                          {area.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(area)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(area)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma área cadastrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        {/* Sistemas Tab */}
        <TabsContent value="sistema">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Área</th>
                  <th>Função Principal</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSistemas.length > 0 ? (
                  filteredSistemas.map((sistema) => (
                    <tr key={sistema.id}>
                      <td className="font-mono font-medium text-primary">{sistema.codigo}</td>
                      <td className="font-medium">{sistema.nome}</td>
                      <td>
                        <Badge variant="outline">{(sistema.area as any)?.nome || '-'}</Badge>
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate">
                        {sistema.funcao_principal || '-'}
                      </td>
                      <td>
                        <Badge variant={sistema.ativo ? 'default' : 'secondary'}>
                          {sistema.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(sistema)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(sistema)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum sistema cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar' : 'Nova'} {getTabLabel(activeTab).slice(0, -1)}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados {activeTab === 'planta' ? 'da planta' : activeTab === 'area' ? 'da área' : 'do sistema'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Parent select for areas and sistemas */}
            {activeTab === 'area' && (
              <div className="space-y-2">
                <Label htmlFor="planta_id">Planta *</Label>
                <Select
                  value={formData.planta_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, planta_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantas?.filter(p => p.ativo).map((planta) => (
                      <SelectItem key={planta.id} value={planta.id}>
                        {planta.codigo} - {planta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {activeTab === 'sistema' && (
              <div className="space-y-2">
                <Label htmlFor="area_id">Área *</Label>
                <Select
                  value={formData.area_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas?.filter(a => a.ativo).map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.codigo} - {area.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="Ex: PLANTA-01"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
            </div>
            
            {/* Planta-specific fields */}
            {activeTab === 'planta' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Endereço da planta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel || ''}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>
              </>
            )}
            
            {/* Area/Sistema description */}
            {(activeTab === 'area' || activeTab === 'sistema') && (
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição detalhada"
                  rows={3}
                />
              </div>
            )}
            
            {/* Sistema function */}
            {activeTab === 'sistema' && (
              <div className="space-y-2">
                <Label htmlFor="funcao_principal">Função Principal</Label>
                <Input
                  id="funcao_principal"
                  value={formData.funcao_principal || ''}
                  onChange={(e) => setFormData({ ...formData, funcao_principal: e.target.value })}
                  placeholder="Ex: Geração de energia"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t">
              <Label htmlFor="ativo">Status Ativo</Label>
              <Switch
                id="ativo"
                checked={formData.ativo ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !formData.codigo || !formData.nome}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingItem?.nome}"? 
              Esta ação não pode ser desfeita e todos os itens filhos serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
