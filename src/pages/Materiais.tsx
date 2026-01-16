import { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Loader2,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  useMateriais,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useMovimentacoes,
  useCreateMovimentacao,
  MaterialRow,
  MaterialInsert,
  MovimentacaoInsert,
} from '@/hooks/useMateriais';

const UNIDADES = ['UN', 'PC', 'CX', 'KG', 'L', 'M', 'M²', 'M³', 'PAR', 'JG', 'KIT'];

export default function Materiais() {
  const { isAdmin, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'materiais' | 'movimentacoes'>('materiais');
  const [showOnlyBaixoEstoque, setShowOnlyBaixoEstoque] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovimentacaoModalOpen, setIsMovimentacaoModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRow | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialRow | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<Partial<MaterialInsert>>({});
  const [movFormData, setMovFormData] = useState<Partial<MovimentacaoInsert>>({});
  
  // Queries
  const { data: materiais, isLoading: loadingMateriais } = useMateriais();
  const { data: movimentacoes, isLoading: loadingMovimentacoes } = useMovimentacoes();
  
  // Mutations
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createMovimentacao = useCreateMovimentacao();
  
  // Filter materials
  const filteredMateriais = materiais?.filter(m => {
    const matchesSearch = 
      m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showOnlyBaixoEstoque) {
      return matchesSearch && m.estoque_atual <= m.estoque_minimo;
    }
    return matchesSearch;
  }) || [];
  
  const filteredMovimentacoes = movimentacoes?.filter(mov => {
    const material = mov.material as any;
    return (
      material?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];
  
  const materiaisBaixoEstoque = materiais?.filter(m => m.estoque_atual <= m.estoque_minimo && m.ativo) || [];
  
  const openCreateModal = () => {
    setEditingMaterial(null);
    setFormData({
      ativo: true,
      unidade: 'UN',
      custo_unitario: 0,
      estoque_atual: 0,
      estoque_minimo: 0,
    });
    setIsModalOpen(true);
  };
  
  const openEditModal = (material: MaterialRow) => {
    setEditingMaterial(material);
    setFormData({ ...material });
    setIsModalOpen(true);
  };
  
  const openDeleteDialog = (material: MaterialRow) => {
    setDeletingMaterial(material);
    setIsDeleteDialogOpen(true);
  };
  
  const openMovimentacaoModal = (material: MaterialRow, tipo: 'ENTRADA' | 'SAIDA') => {
    setSelectedMaterial(material);
    setMovFormData({
      material_id: material.id,
      tipo,
      quantidade: 0,
      custo_unitario: material.custo_unitario,
      usuario_nome: user?.nome || '',
    });
    setIsMovimentacaoModalOpen(true);
  };
  
  const handleSubmit = async () => {
    try {
      if (editingMaterial) {
        await updateMaterial.mutateAsync({ id: editingMaterial.id, ...formData });
      } else {
        await createMaterial.mutateAsync(formData as MaterialInsert);
      }
      setIsModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleDelete = async () => {
    if (!deletingMaterial) return;
    try {
      await deleteMaterial.mutateAsync(deletingMaterial.id);
      setIsDeleteDialogOpen(false);
      setDeletingMaterial(null);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleMovimentacao = async () => {
    if (!selectedMaterial) return;
    try {
      const custo_total = (movFormData.quantidade || 0) * (movFormData.custo_unitario || 0);
      await createMovimentacao.mutateAsync({
        ...movFormData,
        custo_total,
        usuario_nome: user?.nome || 'Sistema',
      } as MovimentacaoInsert);
      setIsMovimentacaoModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };
  
  const isSubmitting = createMaterial.isPending || updateMaterial.isPending;
  const isDeleting = deleteMaterial.isPending;
  const isMovSubmitting = createMovimentacao.isPending;
  
  if (loadingMateriais) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Materiais</h1>
          <p className="text-muted-foreground">
            Controle de estoque e movimentações
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Material
        </Button>
      </div>
      
      {/* Low Stock Alert */}
      {materiaisBaixoEstoque.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium text-foreground">
              {materiaisBaixoEstoque.length} material(is) com estoque baixo
            </p>
            <p className="text-sm text-muted-foreground">
              {materiaisBaixoEstoque.map(m => m.codigo).join(', ')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setShowOnlyBaixoEstoque(!showOnlyBaixoEstoque)}
          >
            {showOnlyBaixoEstoque ? 'Ver todos' : 'Ver apenas baixo estoque'}
          </Button>
        </div>
      )}
      
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="materiais" className="gap-2">
            <Package className="h-4 w-4" />
            Materiais
            <Badge variant="secondary">{materiais?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2">
            <History className="h-4 w-4" />
            Movimentações
          </TabsTrigger>
        </TabsList>
        
        {/* Materiais Tab */}
        <TabsContent value="materiais">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Unidade</th>
                  <th className="text-right">Custo Unit.</th>
                  <th className="text-right">Estoque</th>
                  <th className="text-right">Mínimo</th>
                  <th>Localização</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriais.length > 0 ? (
                  filteredMateriais.map((material) => {
                    const isBaixoEstoque = material.estoque_atual <= material.estoque_minimo;
                    return (
                      <tr key={material.id}>
                        <td className="font-mono font-medium text-primary">{material.codigo}</td>
                        <td className="font-medium">{material.nome}</td>
                        <td>{material.unidade}</td>
                        <td className="text-right font-mono">{formatCurrency(material.custo_unitario)}</td>
                        <td className={`text-right font-mono font-medium ${isBaixoEstoque ? 'text-destructive' : ''}`}>
                          {material.estoque_atual}
                        </td>
                        <td className="text-right font-mono text-muted-foreground">{material.estoque_minimo}</td>
                        <td className="text-muted-foreground">{material.localizacao || '-'}</td>
                        <td>
                          <Badge variant={material.ativo ? 'default' : 'secondary'}>
                            {material.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success hover:text-success"
                              onClick={() => openMovimentacaoModal(material, 'ENTRADA')}
                              title="Entrada"
                            >
                              <ArrowDownCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openMovimentacaoModal(material, 'SAIDA')}
                              title="Saída"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(material)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(material)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum material cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        {/* Movimentações Tab */}
        <TabsContent value="movimentacoes">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tipo</th>
                  <th>Material</th>
                  <th className="text-right">Quantidade</th>
                  <th className="text-right">Custo Unit.</th>
                  <th className="text-right">Custo Total</th>
                  <th>Usuário</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovimentacoes.length > 0 ? (
                  filteredMovimentacoes.map((mov) => (
                    <tr key={mov.id}>
                      <td className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td>
                        <Badge 
                          variant={mov.tipo === 'ENTRADA' ? 'default' : mov.tipo === 'SAIDA' ? 'destructive' : 'secondary'}
                          className="gap-1"
                        >
                          {mov.tipo === 'ENTRADA' && <ArrowDownCircle className="h-3 w-3" />}
                          {mov.tipo === 'SAIDA' && <ArrowUpCircle className="h-3 w-3" />}
                          {mov.tipo}
                        </Badge>
                      </td>
                      <td>
                        <span className="font-mono text-primary">{(mov.material as any)?.codigo}</span>
                        <span className="ml-2 text-muted-foreground">{(mov.material as any)?.nome}</span>
                      </td>
                      <td className="text-right font-mono font-medium">{mov.quantidade}</td>
                      <td className="text-right font-mono">{formatCurrency(mov.custo_unitario || 0)}</td>
                      <td className="text-right font-mono font-medium">{formatCurrency(mov.custo_total || 0)}</td>
                      <td>{mov.usuario_nome}</td>
                      <td className="text-muted-foreground max-w-xs truncate">{mov.observacao || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create/Edit Material Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Editar Material' : 'Novo Material'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="Ex: MAT-001"
                  disabled={!!editingMaterial}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <Select
                  value={formData.unidade || 'UN'}
                  onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((un) => (
                      <SelectItem key={un} value={un}>{un}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do material"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custo_unitario">Custo Unitário</Label>
                <Input
                  id="custo_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.custo_unitario || 0}
                  onChange={(e) => setFormData({ ...formData, custo_unitario: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_atual">Estoque Atual</Label>
                <Input
                  id="estoque_atual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estoque_atual || 0}
                  onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                <Input
                  id="estoque_minimo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estoque_minimo || 0}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao || ''}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                placeholder="Ex: Almoxarifado A, Prateleira 3"
              />
            </div>
            
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
              {editingMaterial ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Movimentação Modal */}
      <Dialog open={isMovimentacaoModalOpen} onOpenChange={setIsMovimentacaoModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movFormData.tipo === 'ENTRADA' ? (
                <ArrowDownCircle className="h-5 w-5 text-success" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              )}
              {movFormData.tipo === 'ENTRADA' ? 'Entrada de Material' : 'Saída de Material'}
            </DialogTitle>
            <DialogDescription>
              {selectedMaterial?.codigo} - {selectedMaterial?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Estoque atual</p>
              <p className="text-2xl font-bold font-mono">
                {selectedMaterial?.estoque_atual} {selectedMaterial?.unidade}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mov_quantidade">Quantidade *</Label>
                <Input
                  id="mov_quantidade"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movFormData.quantidade || ''}
                  onChange={(e) => setMovFormData({ ...movFormData, quantidade: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov_custo">Custo Unitário</Label>
                <Input
                  id="mov_custo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={movFormData.custo_unitario || ''}
                  onChange={(e) => setMovFormData({ ...movFormData, custo_unitario: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mov_observacao">Observação</Label>
              <Input
                id="mov_observacao"
                value={movFormData.observacao || ''}
                onChange={(e) => setMovFormData({ ...movFormData, observacao: e.target.value })}
                placeholder="Motivo da movimentação"
              />
            </div>
            
            {movFormData.quantidade && movFormData.quantidade > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Novo estoque após movimentação</p>
                <p className="text-2xl font-bold font-mono">
                  {movFormData.tipo === 'ENTRADA' 
                    ? (selectedMaterial?.estoque_atual || 0) + (movFormData.quantidade || 0)
                    : (selectedMaterial?.estoque_atual || 0) - (movFormData.quantidade || 0)
                  } {selectedMaterial?.unidade}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovimentacaoModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMovimentacao} 
              disabled={isMovSubmitting || !movFormData.quantidade || movFormData.quantidade <= 0}
              variant={movFormData.tipo === 'ENTRADA' ? 'default' : 'destructive'}
            >
              {isMovSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar {movFormData.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
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
              Tem certeza que deseja excluir o material "{deletingMaterial?.nome}"? 
              Esta ação não pode ser desfeita.
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
