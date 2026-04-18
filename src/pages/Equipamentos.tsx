import { useRef, useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, Search, Tag, Edit, Trash2, Loader2, AlertTriangle, CheckCircle, 
  AlertCircle, Building2, Eye, Settings2, FileText, Wrench, Download, Upload, QrCode,
  Timer, Clock, CalendarClock
} from 'lucide-react';
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
import { ComponentesPanel } from '@/components/equipamentos/ComponentesPanel';
import { EquipamentoQRCodeDialog } from '@/components/equipamentos/EquipamentoQRCode';
import { generateEquipmentTemplate, generateEquipmentTechnicalTemplate, parseEquipmentFile } from '@/lib/reportGenerator';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useCreateComponente } from '@/hooks/useComponentesEquipamento';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useExecucoesOS } from '@/hooks/useExecucoesOS';

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
  temporario: boolean;
  data_vencimento: string;
  origem: string;
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
  temporario: false,
  data_vencimento: '',
  origem: 'proprio',
};

export default function Equipamentos() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipamentoRow | null>(null);
  const [deletingEquip, setDeletingEquip] = useState<EquipamentoRow | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<EquipamentoRow | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const { clearDraft: clearEquipDraft } = useFormDraft('draft:equipamento', formData, setFormData);
  const [importing, setImporting] = useState(false);
  const [qrEquip, setQrEquip] = useState<EquipamentoRow | null>(null);
  const [tempActionEquip, setTempActionEquip] = useState<EquipamentoRow | null>(null);
  const [tempActionType, setTempActionType] = useState<'permanente' | 'estender' | 'inativar' | null>(null);
  const [tempExtendDate, setTempExtendDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: equipamentos, isLoading, error } = useEquipamentos();
  const { data: sistemas } = useSistemas();
  const createMutation = useCreateEquipamento();
  const updateMutation = useUpdateEquipamento();
  const deleteMutation = useDeleteEquipamento();
  const createComponenteMutation = useCreateComponente();
  const { data: ordensServico } = useOrdensServico();
  const { data: execucoesOS } = useExecucoesOS();

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
        temporario: formData.temporario,
        data_vencimento: formData.temporario && formData.data_vencimento ? formData.data_vencimento : null,
        origem: formData.temporario ? formData.origem : 'proprio',
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
        temporario: formData.temporario,
        data_vencimento: formData.temporario && formData.data_vencimento ? formData.data_vencimento : null,
        origem: formData.temporario ? formData.origem : 'proprio',
      });
    }
    
    setIsModalOpen(false);
    clearEquipDraft();
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
      temporario: equip.temporario || false,
      data_vencimento: equip.data_vencimento || '',
      origem: equip.origem || 'proprio',
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

  const handleViewDetails = (equip: EquipamentoRow) => {
    setSelectedEquip(equip);
  };

  const handleTempAction = async () => {
    if (!tempActionEquip || !tempActionType) return;
    try {
      if (tempActionType === 'permanente') {
        await updateMutation.mutateAsync({
          id: tempActionEquip.id,
          temporario: false,
          data_vencimento: null,
          origem: 'proprio',
        });
      } else if (tempActionType === 'estender') {
        if (!tempExtendDate) return;
        await updateMutation.mutateAsync({
          id: tempActionEquip.id,
          data_vencimento: tempExtendDate,
        });
      } else if (tempActionType === 'inativar') {
        await updateMutation.mutateAsync({
          id: tempActionEquip.id,
          ativo: false,
        });
      }
      setTempActionEquip(null);
      setTempActionType(null);
      setTempExtendDate('');
    } catch {
      // toast já tratado pelo hook
    }
  };

  const getVencimentoStatus = (equip: EquipamentoRow) => {
    if (!equip.temporario || !equip.data_vencimento) return null;
    const dias = Math.ceil((new Date(equip.data_vencimento).getTime() - Date.now()) / 86400000);
    if (dias < 0) return { label: `Vencido há ${Math.abs(dias)}d`, color: 'bg-destructive/10 text-destructive border-destructive/20' };
    if (dias <= 7) return { label: `Vence em ${dias}d`, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' };
    return { label: `Vence em ${dias}d`, color: 'bg-info/10 text-info border-info/20' };
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
      <div className="module-page space-y-6">
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
    <div className="module-page space-y-6">
      {/* Header */}
      <div className="module-page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-muted-foreground">
            Cadastro de TAGs, equipamentos e componentes • {equipamentos?.length || 0} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => generateEquipmentTemplate()} className="gap-2">
            <Download className="h-4 w-4" />
            Modelo Padrão
          </Button>
          <Button variant="outline" onClick={() => generateEquipmentTechnicalTemplate()} className="gap-2">
            <Download className="h-4 w-4" />
            Modelo Técnico
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImporting(true);
            try {
              const { valid, componentesByTag, errors } = await parseEquipmentFile(file);
              // Check for duplicate TAGs
              const existingTags = new Set(equipamentos?.map(eq => eq.tag) || []);
              const equipMap = new Map<string, EquipamentoRow>();
              (equipamentos || []).forEach((eq) => equipMap.set(eq.tag, eq));
              const toInsert = valid.filter(v => {
                if (existingTags.has(v.tag)) {
                  return true;
                }
                return true;
              });
              for (const eq of toInsert) {
                if (!existingTags.has(eq.tag)) {
                  const created = await createMutation.mutateAsync(eq);
                  equipMap.set(created.tag, created);
                  existingTags.add(created.tag);
                }

                const targetEquip = equipMap.get(eq.tag);
                const comps = componentesByTag[eq.tag] || [];
                if (targetEquip && comps.length > 0) {
                  // Ordena do mais raso para o mais profundo: pais inseridos antes dos filhos
                  const sorted = [...comps].sort((a, b) => {
                    const dA = (a.nivelCode || '').split('.').length;
                    const dB = (b.nivelCode || '').split('.').length;
                    return dA - dB;
                  });
                  // nivelCode -> UUID gerado no banco para resolver parent_id dos filhos
                  const nivelToId = new Map<string, string>();
                  for (const comp of sorted) {
                    const parent_id = comp.parentNivelCode
                      ? (nivelToId.get(comp.parentNivelCode) ?? null)
                      : null;
                    const created = await createComponenteMutation.mutateAsync({
                      equipamento_id: targetEquip.id,
                      parent_id,
                      codigo: comp.codigo,
                      nome: comp.nome,
                      tipo: comp.tipo || 'OUTRO',
                      fabricante: comp.fabricante,
                      modelo: comp.modelo,
                      quantidade: comp.quantidade,
                      observacoes: comp.observacoes,
                      especificacoes: comp.especificacoes,
                    });
                    if (created?.id && comp.nivelCode) {
                      nivelToId.set(comp.nivelCode, created.id);
                    }
                  }
                }
              }
              toast({
                title: 'Importação Concluída',
                description: `${toInsert.length} ativos processados, ${Object.values(componentesByTag).flat().length} componentes processados, ${errors.length} rejeitados.${errors.length > 0 ? '\n' + errors.map(e => `Linha ${e.row}: ${e.reason}`).join('; ') : ''}`,
              });
            } catch (err: any) {
              toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
            } finally {
              setImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar (Padrão/Técnico)
          </Button>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Equipamento
          </Button>
        </div>
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
                className="bg-card border border-border rounded-lg p-4 hover:shadow-industrial-lg transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(equip)}
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
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(equip)} aria-label="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setQrEquip(equip)} title="QR Code">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(equip)} aria-label="Editar equipamento">
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
                  {equip.temporario && (
                    <>
                      <span className="text-xs font-medium px-2 py-1 rounded border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {equip.origem === 'locado' ? 'Locado' : equip.origem === 'terceiro' ? 'Terceiro' : 'Temporário'}
                      </span>
                      {(() => {
                        const vs = getVencimentoStatus(equip);
                        return vs ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded border flex items-center gap-1 ${vs.color}`}>
                            <Clock className="h-3 w-3" />
                            {vs.label}
                          </span>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Equipment Details Sheet */}
      <Sheet open={!!selectedEquip} onOpenChange={(open) => !open && setSelectedEquip(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          {selectedEquip && (
            <>
              {(() => {
                const osDoEquip = (ordensServico || []).filter((os) => os.tag === selectedEquip.tag);
                const execByOs = new Map((execucoesOS || []).map((exec) => [exec.os_id, exec]));
                const total = osDoEquip.length;
                const abertas = osDoEquip.filter((os) => os.status !== 'FECHADA' && os.status !== 'CANCELADA').length;
                const fechadas = osDoEquip.filter((os) => os.status === 'FECHADA').length;
                const preventivas = osDoEquip.filter((os) => os.tipo === 'PREVENTIVA').length;
                const corretivas = osDoEquip.filter((os) => os.tipo === 'CORRETIVA').length;

                const minutosTotal = osDoEquip.reduce((acc, os) => acc + Number(execByOs.get(os.id)?.tempo_execucao || 0), 0);
                const minutosPreventiva = osDoEquip
                  .filter((os) => os.tipo === 'PREVENTIVA')
                  .reduce((acc, os) => acc + Number(execByOs.get(os.id)?.tempo_execucao || 0), 0);
                const minutosCorretiva = osDoEquip
                  .filter((os) => os.tipo === 'CORRETIVA')
                  .reduce((acc, os) => acc + Number(execByOs.get(os.id)?.tempo_execucao || 0), 0);

                const allByTag = new Map<string, number>();
                (ordensServico || [])
                  .filter((os) => os.tipo === 'CORRETIVA')
                  .forEach((os) => allByTag.set(os.tag, (allByTag.get(os.tag) || 0) + 1));

                const totalCorretivasEmpresa = Array.from(allByTag.values()).reduce((acc, v) => acc + v, 0);
                const percentualFalhas = totalCorretivasEmpresa > 0 ? ((corretivas / totalCorretivasEmpresa) * 100) : 0;
                const ranking = Array.from(allByTag.entries())
                  .sort((a, b) => b[1] - a[1])
                  .findIndex(([tag]) => tag === selectedEquip.tag) + 1;

                const toDuration = (minutes: number) => {
                  const h = Math.floor(minutes / 60);
                  const m = minutes % 60;
                  return h > 0 ? `${h}h ${m}min` : `${m}min`;
                };

                return (
              <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="font-mono text-xl">{selectedEquip.tag}</SheetTitle>
                    <p className="text-muted-foreground">{selectedEquip.nome}</p>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="componentes" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="componentes" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Componentes
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="manutencao" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    Manutenção
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="componentes" className="mt-4">
                  <ComponentesPanel 
                    equipamentoId={selectedEquip.id} 
                    equipamentoTag={selectedEquip.tag}
                  />
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Dados do Equipamento</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">TAG</p>
                        <p className="font-mono font-medium">{selectedEquip.tag}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedEquip.nome}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Criticidade</p>
                        <Badge variant="outline" className={getCriticidadeBadge(selectedEquip.criticidade)}>
                          {selectedEquip.criticidade}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nível de Risco</p>
                        <Badge variant="outline" className={getRiscoBadge(selectedEquip.nivel_risco).bg}>
                          {selectedEquip.nivel_risco}
                        </Badge>
                      </div>
                      {selectedEquip.localizacao && (
                        <div>
                          <p className="text-muted-foreground">Localização</p>
                          <p className="font-medium">{selectedEquip.localizacao}</p>
                        </div>
                      )}
                      {selectedEquip.fabricante && (
                        <div>
                          <p className="text-muted-foreground">Fabricante</p>
                          <p className="font-medium">{selectedEquip.fabricante}</p>
                        </div>
                      )}
                      {selectedEquip.modelo && (
                        <div>
                          <p className="text-muted-foreground">Modelo</p>
                          <p className="font-medium">{selectedEquip.modelo}</p>
                        </div>
                      )}
                      {selectedEquip.numero_serie && (
                        <div>
                          <p className="text-muted-foreground">Número de Série</p>
                          <p className="font-mono font-medium">{selectedEquip.numero_serie}</p>
                        </div>
                      )}
                      {getHierarchyPath(selectedEquip) && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Hierarquia</p>
                          <p className="font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {getHierarchyPath(selectedEquip)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-2" onClick={() => setQrEquip(selectedEquip)}>
                      <QrCode className="h-4 w-4" />
                      Gerar QR Code
                    </Button>
                  </div>

                  {selectedEquip.temporario && (
                    <Card className="border-amber-300 dark:border-amber-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <Timer className="h-4 w-4" />
                          Ativo Temporário
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Origem</p>
                            <p className="font-medium capitalize">{selectedEquip.origem || 'locado'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Permanência até</p>
                            <p className="font-medium">
                              {selectedEquip.data_vencimento
                                ? new Date(selectedEquip.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')
                                : '—'}
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const vs = getVencimentoStatus(selectedEquip);
                          return vs ? (
                            <div className={`rounded-md border p-2 text-xs font-medium flex items-center gap-1.5 ${vs.color}`}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {vs.label}
                            </div>
                          ) : null;
                        })()}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              setTempActionEquip(selectedEquip);
                              setTempActionType('permanente');
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Tornar Permanente
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              setTempActionEquip(selectedEquip);
                              setTempActionType('estender');
                              setTempExtendDate(selectedEquip.data_vencimento || '');
                            }}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Estender Prazo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => {
                              setTempActionEquip(selectedEquip);
                              setTempActionType('inativar');
                            }}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Inativar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="manutencao" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">O.S do Ativo</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{total}</p>
                          <p className="text-xs text-muted-foreground">Abertas: {abertas} • Fechadas: {fechadas}</p>
                          <p className="text-xs text-muted-foreground">Taxa fechamento: {total > 0 ? ((fechadas / total) * 100).toFixed(1) : '0.0'}%</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo de Parada</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{toDuration(minutosTotal)}</p>
                          <p className="text-xs text-muted-foreground">Preventiva: {toDuration(minutosPreventiva)}</p>
                          <p className="text-xs text-muted-foreground">Corretiva: {toDuration(minutosCorretiva)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Falhas no Contexto da Empresa</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{percentualFalhas.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Participação em corretivas</p>
                          <p className="text-xs text-muted-foreground">Ranking de criticidade: #{ranking > 0 ? ranking : '-'}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Resumo de O.S por Tipo</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-md border border-border p-3"><p className="text-muted-foreground">Corretivas</p><p className="font-semibold">{corretivas}</p></div>
                        <div className="rounded-md border border-border p-3"><p className="text-muted-foreground">Preventivas</p><p className="font-semibold">{preventivas}</p></div>
                        <div className="rounded-md border border-border p-3"><p className="text-muted-foreground">Abertas</p><p className="font-semibold">{abertas}</p></div>
                        <div className="rounded-md border border-border p-3"><p className="text-muted-foreground">Fechadas</p><p className="font-semibold">{fechadas}</p></div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Últimas O.S do Ativo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {osDoEquip.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem O.S vinculadas a esta TAG.</p>
                        ) : (
                          <div className="space-y-2">
                            {osDoEquip.slice(0, 8).map((os) => (
                              <div key={os.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                                <div>
                                  <p className="font-mono font-semibold text-primary">OS {os.numero_os}</p>
                                  <p className="text-muted-foreground">{os.tipo} • {os.status}</p>
                                </div>
                                <div className="text-right">
                                  <p>{new Date(os.data_solicitacao).toLocaleDateString('pt-BR')}</p>
                                  <p className="text-xs text-muted-foreground">{Number(execByOs.get(os.id)?.tempo_execucao || 0)} min</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
              </>
              );
              })()}
            </>
          )}
        </SheetContent>
      </Sheet>

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
                      const area = sistema.area as { codigo?: string; planta?: { codigo?: string } } | undefined;
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

            {/* Ativo Temporário */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="temporario"
                  checked={formData.temporario}
                  onChange={(e) => setFormData({ ...formData, temporario: e.target.checked, ...(!e.target.checked && { data_vencimento: '', origem: 'proprio' }) })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="temporario" className="flex items-center gap-1.5 cursor-pointer">
                  <Timer className="h-4 w-4 text-amber-500" />
                  Ativo Temporário (locado / emprestado)
                </Label>
              </div>
              {formData.temporario && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Origem</Label>
                    <Select value={formData.origem} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locado">Locado</SelectItem>
                        <SelectItem value="terceiro">Terceiro / Emprestado</SelectItem>
                        <SelectItem value="proprio">Próprio (temporário)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data_vencimento">Permanência até *</Label>
                    <Input
                      id="data_vencimento"
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              )}
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

      {/* QR Code Dialog */}
      {qrEquip && (
        <EquipamentoQRCodeDialog
          equipamento={qrEquip}
          open={!!qrEquip}
          onOpenChange={(open) => !open && setQrEquip(null)}
        />
      )}

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

      {/* Ação sobre Ativo Temporário */}
      <Dialog open={!!tempActionEquip && !!tempActionType} onOpenChange={(open) => { if (!open) { setTempActionEquip(null); setTempActionType(null); setTempExtendDate(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tempActionType === 'permanente' && <><CheckCircle className="h-5 w-5 text-primary" /> Tornar Permanente</>}
              {tempActionType === 'estender' && <><CalendarClock className="h-5 w-5 text-amber-500" /> Estender Prazo</>}
              {tempActionType === 'inativar' && <><AlertTriangle className="h-5 w-5 text-destructive" /> Inativar Ativo</>}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            TAG: <span className="font-mono font-bold text-foreground">{tempActionEquip?.tag}</span> — {tempActionEquip?.nome}
          </p>
          {tempActionType === 'permanente' && (
            <p className="text-sm">O ativo será convertido para permanente (próprio). A data de vencimento será removida.</p>
          )}
          {tempActionType === 'estender' && (
            <div className="space-y-2">
              <p className="text-sm">Informe a nova data de permanência:</p>
              <Input
                type="date"
                value={tempExtendDate}
                onChange={(e) => setTempExtendDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          {tempActionType === 'inativar' && (
            <p className="text-sm">O ativo será inativado. Ele não aparecerá mais na seleção de equipamentos, mas todo o histórico de O.S será preservado.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              variant={tempActionType === 'inativar' ? 'destructive' : 'default'}
              onClick={handleTempAction}
              disabled={updateMutation.isPending || (tempActionType === 'estender' && !tempExtendDate)}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
            <Button variant="outline" onClick={() => { setTempActionEquip(null); setTempActionType(null); }}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
