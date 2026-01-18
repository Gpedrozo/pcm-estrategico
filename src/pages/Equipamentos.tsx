import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Tag, Edit, Trash2, Loader2, AlertTriangle, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  useEquipamentos, 
  useCreateEquipamento, 
  useUpdateEquipamento, 
  useDeleteEquipamento,
  type EquipamentoRow 
} from '@/hooks/useEquipamentos';
import { useSistemas } from '@/hooks/useHierarquia';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  tag: string;
  nome: string;
  criticidade: string;
  nivel_risco: string;
  localizacao: string;
  fabricante: string;
  modelo: string;
  numero_serie: string;
  sistema_id: string;
}

const initialFormData: FormData = {
  tag: '',
  nome: '',
  criticidade: 'C',
  nivel_risco: 'BAIXO',
  localizacao: '',
  fabricante: '',
  modelo: '',
  numero_serie: '',
  sistema_id: '',
};

export default function Equipamentos() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipamentoRow | null>(null);
  const [deletingEquip, setDeletingEquip] = useState<EquipamentoRow | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: equipamentos, isLoading, error } = useEquipamentos();
  const { data: sistemas } = useSistemas();
  const createMutation = useCreateEquipamento();
  const updateMutation = useUpdateEquipamento();
  const deleteMutation = useDeleteEquipamento();

  const filteredEquipamentos = equipamentos?.filter(eq => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return eq.tag.toLowerCase().includes(searchLower) || 
           eq.nome.toLowerCase().includes(searchLower) ||
           eq.localizacao?.toLowerCase().includes(searchLower) ||
           eq.fabricante?.toLowerCase().includes(searchLower) ||
           eq.sistema?.nome?.toLowerCase().includes(searchLower);
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEquip) {
      await updateMutation.mutateAsync({
        id: editingEquip.id,
        nome: formData.nome,
        criticidade: formData.criticidade,
        nivel_risco: formData.nivel_risco,
        localizacao: formData.localizacao || null,
        fabricante: formData.fabricante || null,
        modelo: formData.modelo || null,
        numero_serie: formData.numero_serie || null,
        sistema_id: formData.sistema_id || null,
      });
    } else {
      await createMutation.mutateAsync({
        tag: formData.tag,
        nome: formData.nome,
        criticidade: formData.criticidade,
        nivel_risco: formData.nivel_risco,
        localizacao: formData.localizacao || null,
        fabricante: formData.fabricante || null,
        modelo: formData.modelo || null,
        numero_serie: formData.numero_serie || null,
        sistema_id: formData.sistema_id || null,
      });
    }
    
    setIsModalOpen(false);
    setFormData(initialFormData);
    setEditingEquip(null);
  };

  const handleEdit = (equip: EquipamentoRow) => {
    setEditingEquip(equip);
    setFormData({
      tag: equip.tag,
      nome: equip.nome,
      criticidade: equip.criticidade,
      nivel_risco: equip.nivel_risco,
      localizacao: equip.localizacao || '',
      fabricante: equip.fabricante || '',
      modelo: equip.modelo || '',
      numero_serie: equip.numero_serie || '',
      sistema_id: equip.sistema_id || '',
    });
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingEquip(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (equip: EquipamentoRow) => {
    setDeletingEquip(equip);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingEquip) {
      await deleteMutation.mutateAsync(deletingEquip.id);
      setDeleteDialogOpen(false);
      setDeletingEquip(null);
    }
  };

  const getCriticidadeBadge = (criticidade: string) => {
    const styles: Record<string, string> = {
      'A': 'bg-destructive/10 text-destructive border-destructive/20',
      'B': 'bg-warning/10 text-warning border-warning/20',
      'C': 'bg-success/10 text-success border-success/20',
    };
    return styles[criticidade] || styles['C'];
  };

  const getRiscoBadge = (risco: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      'CRITICO': { bg: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-3 w-3" /> },
      'ALTO': { bg: 'bg-warning/10 text-warning', icon: <AlertCircle className="h-3 w-3" /> },
      'MEDIO': { bg: 'bg-info/10 text-info', icon: <AlertCircle className="h-3 w-3" /> },
      'BAIXO': { bg: 'bg-success/10 text-success', icon: <CheckCircle className="h-3 w-3" /> },
    };
    return styles[risco] || styles['BAIXO'];
  };

  const getHierarchyPath = (equip: EquipamentoRow) => {
    if (!equip.sistema) return null;
    const sistema = equip.sistema;
    const area = sistema.area;
    const planta = area?.planta;
    
    const parts = [];
    if (planta) parts.push(planta.codigo);
    if (area) parts.push(area.codigo);
    if (sistema) parts.push(sistema.codigo);
    
    return parts.join(' → ');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Erro ao carregar equipamentos</h2>
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
          <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-muted-foreground">
            Cadastro de TAGs e equipamentos • {equipamentos?.length || 0} registros
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por TAG, nome, local, fabricante ou sistema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredEquipamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card border border-border rounded-lg">
          <Tag className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum equipamento encontrado</h3>
          <p className="text-muted-foreground">
            {search ? 'Tente ajustar sua busca' : 'Cadastre o primeiro equipamento'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipamentos.map((equip) => {
            const riscoBadge = getRiscoBadge(equip.nivel_risco);
            const hierarchyPath = getHierarchyPath(equip);
            return (
              <div
                key={equip.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-industrial-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Tag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-primary">{equip.tag}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{equip.nome}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(equip)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteClick(equip)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {hierarchyPath && (
                    <p className="truncate flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {hierarchyPath}
                    </p>
                  )}
                  {equip.localizacao && (
                    <p className="truncate">📍 {equip.localizacao}</p>
                  )}
                  {equip.fabricante && (
                    <p className="truncate">🏭 {equip.fabricante}</p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded border ${getCriticidadeBadge(equip.criticidade)}`}>
                    Criticidade {equip.criticidade}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded flex items-center gap-1 ${riscoBadge.bg}`}>
                    {riscoBadge.icon}
                    {equip.nivel_risco}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    equip.ativo 
                      ? 'bg-success/10 text-success' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {equip.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEquip ? 'Editar Equipamento' : 'Novo Equipamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag">TAG *</Label>
                <Input
                  id="tag"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value.toUpperCase() })}
                  placeholder="Ex: COMP-001"
                  required
                  disabled={!!editingEquip}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticidade">Criticidade</Label>
                <Select 
                  value={formData.criticidade} 
                  onValueChange={(value) => setFormData({ ...formData, criticidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Alta</SelectItem>
                    <SelectItem value="B">B - Média</SelectItem>
                    <SelectItem value="C">C - Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Equipamento *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Descrição do equipamento"
                required
              />
            </div>

            {/* Sistema (Hierarquia) */}
            <div className="space-y-2">
              <Label htmlFor="sistema_id" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Sistema (Hierarquia)
              </Label>
              <Select 
                value={formData.sistema_id || "none"} 
                onValueChange={(value) => setFormData({ ...formData, sistema_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sistema (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {sistemas?.filter(s => s.ativo).map((sistema) => {
                    const area = sistema.area as any;
                    const planta = area?.planta;
                    const path = [planta?.codigo, area?.codigo, sistema.codigo].filter(Boolean).join(' → ');
                    return (
                      <SelectItem key={sistema.id} value={sistema.id}>
                        {path} - {sistema.nome}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vincule a um sistema da hierarquia (Planta → Área → Sistema)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nivel_risco">Nível de Risco</Label>
                <Select 
                  value={formData.nivel_risco} 
                  onValueChange={(value) => setFormData({ ...formData, nivel_risco: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICO">Crítico</SelectItem>
                    <SelectItem value="ALTO">Alto</SelectItem>
                    <SelectItem value="MEDIO">Médio</SelectItem>
                    <SelectItem value="BAIXO">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  placeholder="Ex: Sala de Máquinas"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fabricante">Fabricante</Label>
                <Input
                  id="fabricante"
                  value={formData.fabricante}
                  onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  placeholder="Ex: WEG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex: W22"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_serie">Número de Série</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="Ex: SN123456789"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEquip ? 'Salvar Alterações' : 'Cadastrar'}
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
              Tem certeza que deseja excluir o equipamento{' '}
              <span className="font-bold text-foreground">{deletingEquip?.tag}</span>?
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
