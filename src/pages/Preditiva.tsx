import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Activity, Thermometer, Gauge, TrendingUp, AlertTriangle, CheckCircle, Printer, Pencil, History } from 'lucide-react';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { PreditivaPrintTemplate } from '@/components/preditiva/PreditivaPrintTemplate';
import { useReactToPrint } from 'react-to-print';
import { PRINT_PAGE_STYLE } from '@/components/print/DocumentPrintBase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { getSupabaseErrorMessage, insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useHistoricoAlteracoesMedicao } from '@/hooks/useMedicoesPreditivas';
import { writeAuditLog } from '@/lib/audit';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useLocation } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MedicaoPreditiva {
  id: string;
  empresa_id?: string;
  equipamento_id?: string | null;
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade?: string | null;
  limite_alerta: number | null;
  limite_critico: number | null;
  status: string;
  observacoes: string | null;
  responsavel_nome: string | null;
  created_at: string;
}

interface OSSuggestionPayload {
  tag: string;
  tipo_medicao: string;
  valor: number;
  unidade?: string | null;
  limite_alerta: number | null;
  limite_critico: number | null;
  status: string;
  observacoes?: string | null;
}

const useMedicoesPreditivas = (tenantId: string | null, allowedTags: string[], allowedEquipamentoIds: string[]) => {
  return useQuery({
    queryKey: ['medicoes_preditivas', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];

      const byTenantQuery = supabase
        .from('medicoes_preditivas')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false });

      const byTenant = await byTenantQuery;

      if (!byTenant.error) {
        return (byTenant.data || []) as MedicaoPreditiva[];
      }

      const message = getSupabaseErrorMessage(byTenant.error).toLowerCase();
      const missingEmpresaIdColumn =
        message.includes("could not find the 'empresa_id' column") ||
        (message.includes('column') && message.includes('empresa_id') && message.includes('does not exist'));

      if (!missingEmpresaIdColumn) {
        throw byTenant.error;
      }

      // Fallback para esquemas antigos sem empresa_id: filtra em memória pelos ativos do tenant.
      console.warn('[Preditiva] Coluna empresa_id ausente — fallback de compatibilidade ativado');
      const allRows = await supabase
        .from('medicoes_preditivas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Security: cap fallback to prevent massive cross-tenant data leak

      if (allRows.error) throw allRows.error;

      const tagSet = new Set(allowedTags.map((tag) => tag.toUpperCase()));
      const eqSet = new Set(allowedEquipamentoIds);

      return ((allRows.data || []) as MedicaoPreditiva[]).filter((item) => {
        const byEquipamento = item.equipamento_id ? eqSet.has(item.equipamento_id) : false;
        const byTag = item.tag ? tagSet.has(item.tag.toUpperCase()) : false;
        return byEquipamento || byTag;
      });
    },
  });
};

const useCreateMedicao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      empresa_id: string;
      tag: string;
      tipo_medicao: string;
      valor: number;
      unidade?: string;
      status: string;
      limite_alerta?: number | null;
      limite_critico?: number | null;
      observacoes?: string;
      responsavel_nome?: string;
      equipamento_id?: string | null;
    }) => {
      const result = await insertWithColumnFallback(
        (payload) =>
          supabase
            .from('medicoes_preditivas')
            .insert(payload)
            .select()
            .single(),
        data as Record<string, unknown>,
      );

      await upsertMaintenanceSchedule({
        tipo: 'preditiva',
        origemId: result.id,
        empresaId: tenantId!,
        equipamentoId: result.equipamento_id || null,
        titulo: `${result.tag} • ${result.tipo_medicao}`,
        descricao: result.observacoes,
        dataProgramada: result.created_at || new Date().toISOString(),
        status: result.status || 'programado',
        responsavel: result.responsavel_nome,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas', tenantId] });
      toast({ title: 'Medição registrada com sucesso' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar medição',
        description: getSupabaseErrorMessage(error) || 'Falha ao gravar medição no banco de dados.',
        variant: 'destructive',
      });
    },
  });
};

export default function Preditiva() {
  const { user, tenantId } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const preditivaPrintRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('medicoes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticidadeFilter, setCriticidadeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trendTag, setTrendTag] = useState('all');
  const [trendTipo, setTrendTipo] = useState('all');
  const [formData, setFormData] = useState({
    tag: '',
    tipo_medicao: 'VIBRACAO',
    valor: 0,
    unidade: 'mm/s',
    limite_alerta: '' as number | '',
    limite_critico: '' as number | '',
    observacoes: '',
  });
  const { clearDraft: clearPreditivaDraft } = useFormDraft('draft:preditiva', formData, setFormData);

  const { data: equipamentos } = useEquipamentos();
  const { data: empresa } = useDadosEmpresa();
  const allowedTags = useMemo(() => (equipamentos || []).map((item) => item.tag), [equipamentos]);
  const allowedEquipamentoIds = useMemo(() => (equipamentos || []).map((item) => item.id), [equipamentos]);
  const { data: medicoes, isLoading } = useMedicoesPreditivas(tenantId, allowedTags, allowedEquipamentoIds);
  const createMutation = useCreateMedicao();
  const createOSMutation = useCreateOrdemServico();
  const [osSuggestion, setOsSuggestion] = useState<OSSuggestionPayload | null>(null);

  // Edit state
  const [editingMedicao, setEditingMedicao] = useState<MedicaoPreditiva | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    tag: '',
    tipo_medicao: 'VIBRACAO',
    valor: 0,
    unidade: 'mm/s',
    limite_alerta: '' as number | '',
    limite_critico: '' as number | '',
    observacoes: '',
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // History state
  const [historyMedicaoId, setHistoryMedicaoId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: historicoAlteracoes, isLoading: loadingHistorico } = useHistoricoAlteracoesMedicao(historyMedicaoId);

  const calendarModalAppliedRef = useRef(false);
  useEffect(() => {
    if (calendarModalAppliedRef.current) return;
    if ((location.state as any)?.dataProgramada) {
      calendarModalAppliedRef.current = true;
      setIsModalOpen(true);
    }
  }, [location.state]);

  const equipamentoByTag = useMemo(() => {
    const map = new Map<string, (typeof equipamentos)[number]>();
    (equipamentos || []).forEach((item) => map.set(item.tag.toUpperCase(), item));
    return map;
  }, [equipamentos]);

  const tiposDisponiveis = useMemo(() => {
    return Array.from(new Set((medicoes || []).map((m) => m.tipo_medicao).filter(Boolean)));
  }, [medicoes]);

  const filteredMedicoes = useMemo(() => {
    return (medicoes || []).filter((m) => {
      const equipamento = equipamentoByTag.get((m.tag || '').toUpperCase());
      const criticidade = (equipamento?.criticidade || '').toUpperCase();

      if (tipoFilter !== 'all' && m.tipo_medicao !== tipoFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (criticidadeFilter !== 'all' && criticidade !== criticidadeFilter) return false;

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (new Date(m.created_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (new Date(m.created_at) > to) return false;
      }

      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        m.tag.toLowerCase().includes(searchLower) ||
        m.tipo_medicao.toLowerCase().includes(searchLower) ||
        (m.observacoes || '').toLowerCase().includes(searchLower)
      );
    });
  }, [medicoes, equipamentoByTag, tipoFilter, statusFilter, criticidadeFilter, dateFrom, dateTo, search]);

  const trendData = useMemo(() => {
    return filteredMedicoes
      .filter((item) => (trendTag === 'all' || item.tag === trendTag) && (trendTipo === 'all' || item.tipo_medicao === trendTipo))
      .slice()
      .reverse()
      .map((item) => ({
        data: new Date(item.created_at).toLocaleDateString('pt-BR'),
        valor: Number(item.valor || 0),
        limite_alerta: Number(item.limite_alerta || 0),
        limite_critico: Number(item.limite_critico || 0),
        tag: item.tag,
      }));
  }, [filteredMedicoes, trendTag, trendTipo]);

  const topCriticos = useMemo(() => {
    const points = new Map<string, { tag: string; critico: number; alerta: number; ultimaData: string | null }>();
    filteredMedicoes.forEach((item) => {
      const current = points.get(item.tag) || { tag: item.tag, critico: 0, alerta: 0, ultimaData: null };
      if (item.status === 'CRITICO') current.critico += 1;
      if (item.status === 'ALERTA') current.alerta += 1;
      if (!current.ultimaData || new Date(item.created_at) > new Date(current.ultimaData)) {
        current.ultimaData = item.created_at;
      }
      points.set(item.tag, current);
    });

    return Array.from(points.values())
      .sort((a, b) => (b.critico * 3 + b.alerta) - (a.critico * 3 + a.alerta))
      .slice(0, 3);
  }, [filteredMedicoes]);

  const alertasAtivos = useMemo(() => {
    return filteredMedicoes.filter((item) => item.status === 'ALERTA' || item.status === 'CRITICO');
  }, [filteredMedicoes]);

  const handlePrintPreditiva = useReactToPrint({
    contentRef: preditivaPrintRef,
    documentTitle: 'Relatorio-Preditiva',
    pageStyle: PRINT_PAGE_STYLE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId) {
      toast({ title: 'Tenant não identificado', variant: 'destructive' });
      return;
    }

    if (!formData.tag) {
      toast({ title: 'TAG obrigatória', description: 'Selecione o equipamento para registrar a medição.', variant: 'destructive' });
      return;
    }

    if (formData.limite_alerta !== '' && formData.limite_critico !== '' && Number(formData.limite_critico) < Number(formData.limite_alerta)) {
      toast({
        title: 'Limites inválidos',
        description: 'O limite crítico deve ser maior ou igual ao limite de alerta.',
        variant: 'destructive',
      });
      return;
    }

    const equipamento = equipamentos?.find((item) => item.tag === formData.tag);

    // Determine status based on value and limits
    let status = 'NORMAL';
    const limiteAlerta = formData.limite_alerta === '' ? null : Number(formData.limite_alerta);
    const limiteCritico = formData.limite_critico === '' ? null : Number(formData.limite_critico);
    if (limiteCritico !== null && formData.valor >= limiteCritico) {
      status = 'CRITICO';
    } else if (limiteAlerta !== null && formData.valor >= limiteAlerta) {
      status = 'ALERTA';
    }

    const createdMedicao = await createMutation.mutateAsync({
      ...formData,
      status,
      unidade: formData.unidade || undefined,
      limite_alerta: limiteAlerta,
      limite_critico: limiteCritico,
      responsavel_nome: user?.nome,
      equipamento_id: equipamento?.id ?? null,
      empresa_id: tenantId, // MUST be last to prevent spread override
    });

    try {
      await writeAuditLog({
        action: 'CREATE_MEDICAO_PREDITIVA',
        table: 'medicoes_preditivas',
        recordId: createdMedicao?.id ?? null,
        empresaId: tenantId,
        severity: status === 'CRITICO' ? 'warning' : 'info',
        source: 'app',
        metadata: {
          tag: formData.tag,
          tipo_medicao: formData.tipo_medicao,
          valor: formData.valor,
          unidade: formData.unidade,
          status,
          usuario_nome: user?.nome || null,
        },
      });
    } catch { /* audit best-effort */ }

    if (status === 'ALERTA' || status === 'CRITICO') {
      setOsSuggestion({
        tag: formData.tag,
        tipo_medicao: formData.tipo_medicao,
        valor: formData.valor,
        unidade: formData.unidade,
        limite_alerta: limiteAlerta,
        limite_critico: limiteCritico,
        status,
        observacoes: formData.observacoes || null,
      });
    }

    setIsModalOpen(false);
    clearPreditivaDraft();
    setFormData({
      tag: '', tipo_medicao: 'VIBRACAO', valor: 0, unidade: 'mm/s',
      limite_alerta: '', limite_critico: '', observacoes: ''
    });
  };

  const openOSSuggestion = async (med: OSSuggestionPayload) => {
    const equipamento = equipamentos?.find((item) => item.tag === med.tag);
    if (!equipamento) {
      toast({
        title: 'Não foi possível abrir O.S',
        description: 'Equipamento da medição não encontrado no tenant atual.',
        variant: 'destructive',
      });
      return;
    }

    await createOSMutation.mutateAsync({
      tipo: 'PREDITIVA',
      prioridade: med.status === 'CRITICO' ? 'URGENTE' : 'ALTA',
      tag: med.tag,
      equipamento: equipamento.nome,
      solicitante: 'Monitoramento Preditivo',
      problema: [
        `Alerta de condição detectado em medição preditiva (${med.status}).`,
        `Tipo: ${med.tipo_medicao}`,
        `Valor medido: ${med.valor} ${med.unidade || '-'}`,
        `Limite alerta: ${med.limite_alerta ?? '-'}`,
        `Limite crítico: ${med.limite_critico ?? '-'}`,
        med.observacoes ? `Observações: ${med.observacoes}` : null,
      ].filter(Boolean).join('\n'),
      tempo_estimado: null,
      usuario_abertura: user?.id ?? null,
    });
  };

  const handleOpenEdit = (med: MedicaoPreditiva) => {
    setEditingMedicao(med);
    setEditFormData({
      tag: med.tag,
      tipo_medicao: med.tipo_medicao,
      valor: med.valor,
      unidade: med.unidade || 'mm/s',
      limite_alerta: med.limite_alerta ?? '',
      limite_critico: med.limite_critico ?? '',
      observacoes: med.observacoes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicao || !tenantId) return;

    setIsEditSubmitting(true);

    try {
      const limiteAlerta = editFormData.limite_alerta === '' ? null : Number(editFormData.limite_alerta);
      const limiteCritico = editFormData.limite_critico === '' ? null : Number(editFormData.limite_critico);

      let status = 'NORMAL';
      if (limiteCritico !== null && editFormData.valor >= limiteCritico) {
        status = 'CRITICO';
      } else if (limiteAlerta !== null && editFormData.valor >= limiteAlerta) {
        status = 'ALERTA';
      }

      const previousValues: Record<string, unknown> = {
        valor: editingMedicao.valor,
        unidade: editingMedicao.unidade,
        limite_alerta: editingMedicao.limite_alerta,
        limite_critico: editingMedicao.limite_critico,
        status: editingMedicao.status,
        observacoes: editingMedicao.observacoes,
        tipo_medicao: editingMedicao.tipo_medicao,
      };

      const updates = {
        valor: editFormData.valor,
        unidade: editFormData.unidade,
        limite_alerta: limiteAlerta,
        limite_critico: limiteCritico,
        status,
        observacoes: editFormData.observacoes || null,
        tipo_medicao: editFormData.tipo_medicao,
      };

      // Build diff for audit
      const changedFields: Record<string, { antes: unknown; depois: unknown }> = {};
      for (const key of Object.keys(updates)) {
        const prev = previousValues[key];
        const next = (updates as Record<string, unknown>)[key];
        if (prev !== next) {
          changedFields[key] = { antes: prev, depois: next };
        }
      }

      await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('medicoes_preditivas')
            .update(payload)
            .eq('id', editingMedicao.id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );

      // Write audit log
      try {
        await writeAuditLog({
          action: 'UPDATE_MEDICAO_PREDITIVA',
          table: 'medicoes_preditivas',
          recordId: editingMedicao.id,
          empresaId: tenantId,
          severity: 'info',
          source: 'app',
          metadata: {
            campos_alterados: changedFields,
            tag: editingMedicao.tag,
            tipo_medicao: editFormData.tipo_medicao,
            usuario_nome: user?.nome || null,
          },
        });
      } catch { /* audit best-effort */ }

      queryClient.invalidateQueries({ queryKey: ['medicoes_preditivas', tenantId] });
      toast({ title: 'Medição atualizada com sucesso' });
      setIsEditModalOpen(false);
      setEditingMedicao(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar medição',
        description: getSupabaseErrorMessage(error) || 'Falha ao atualizar medição.',
        variant: 'destructive',
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleOpenHistory = (medId: string) => {
    setHistoryMedicaoId(medId);
    setIsHistoryOpen(true);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'VIBRACAO': return <Activity className="h-4 w-4" />;
      case 'TEMPERATURA': return <Thermometer className="h-4 w-4" />;
      case 'PRESSAO': return <Gauge className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-success/10 text-success';
      case 'ALERTA': return 'bg-warning/10 text-warning';
      case 'CRITICO': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Stats
  const stats = {
    total: medicoes?.length || 0,
    normal: medicoes?.filter(m => m.status === 'NORMAL').length || 0,
    alerta: medicoes?.filter(m => m.status === 'ALERTA').length || 0,
    critico: medicoes?.filter(m => m.status === 'CRITICO').length || 0,
  };

  if (isLoading) {
    return (
      <div className="module-page space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="module-page space-y-6">
      <div className="module-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manutenção Preditiva</h1>
          <p className="text-muted-foreground">Monitoramento de condição e análise de tendências</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={filteredMedicoes.length === 0} onClick={() => handlePrintPreditiva()}>
                <Printer className="h-4 w-4" />
                Imprimir Relatório
              </Button>
              <div style={{ display: 'none' }}>
                <PreditivaPrintTemplate
                  ref={preditivaPrintRef}
                  medicoes={filteredMedicoes as any}
                  tag={filteredMedicoes.length > 0 ? filteredMedicoes[0].tag : '—'}
                  empresa={empresa}
                />
              </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Medição
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Medições</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm text-success">Normal</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.normal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">Alerta</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.alerta}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">Crítico</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.critico}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="tendencias">Tendência</TabsTrigger>
          <TabsTrigger value="alertas">Alertas Ativos</TabsTrigger>
        </TabsList>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por TAG, tipo, observação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tiposDisponiveis.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="NORMAL">NORMAL</SelectItem>
                <SelectItem value="ALERTA">ALERTA</SelectItem>
                <SelectItem value="CRITICO">CRITICO</SelectItem>
              </SelectContent>
            </Select>

            <Select value={criticidadeFilter} onValueChange={setCriticidadeFilter}>
              <SelectTrigger><SelectValue placeholder="Criticidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas criticidades</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <TabsContent value="medicoes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>TAG</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Limite Alerta</th>
                  <th>Limite Crítico</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicoes.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma medição encontrada</td></tr>
                ) : (
                  filteredMedicoes.map((med) => (
                    <tr key={med.id}>
                      <td className="font-mono text-primary font-medium">{med.tag}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getTipoIcon(med.tipo_medicao)}
                          {med.tipo_medicao}
                        </div>
                      </td>
                      <td className="font-bold">{med.valor} {med.unidade}</td>
                      <td>{med.limite_alerta || '-'} {med.limite_alerta ? med.unidade : ''}</td>
                      <td>{med.limite_critico || '-'} {med.limite_critico ? med.unidade : ''}</td>
                      <td><Badge className={getStatusBadge(med.status)}>{med.status}</Badge></td>
                      <td>{med.responsavel_nome || '-'}</td>
                      <td>{new Date(med.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar medição"
                            onClick={() => handleOpenEdit(med)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Histórico de alterações"
                            onClick={() => handleOpenHistory(med.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tendencias" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Linha de Tendência</span>
                    <div className="flex gap-2 w-full max-w-md">
                      <Select value={trendTag} onValueChange={setTrendTag}>
                        <SelectTrigger><SelectValue placeholder="TAG" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as TAGs</SelectItem>
                          {Array.from(new Set(filteredMedicoes.map((item) => item.tag))).map((tag) => (
                            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={trendTipo} onValueChange={setTrendTipo}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tipos</SelectItem>
                          {tiposDisponiveis.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">Sem dados para os filtros selecionados.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="valor" name="Valor medido" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="limite_alerta" name="Limite alerta" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="limite_critico" name="Limite crítico" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 3 Ativos Críticos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topCriticos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem ativos críticos no período filtrado.</p>
                  ) : topCriticos.map((item, idx) => (
                    <div key={item.tag} className="rounded-lg border border-border p-3">
                      <p className="font-mono font-semibold text-primary">#{idx + 1} {item.tag}</p>
                      <p className="text-xs text-muted-foreground">Críticos: {item.critico} • Alertas: {item.alerta}</p>
                      <p className="text-xs text-muted-foreground">Última medição: {item.ultimaData ? new Date(item.ultimaData).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <div className="space-y-4">
            {alertasAtivos.map(med => (
              <Card key={med.id} className={med.status === 'CRITICO' ? 'border-destructive' : 'border-warning'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${med.status === 'CRITICO' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                        {getTipoIcon(med.tipo_medicao)}
                      </div>
                      <div>
                        <p className="font-mono text-primary font-bold">{med.tag}</p>
                        <p className="text-sm text-muted-foreground">{med.tipo_medicao}</p>
                        <p className="text-xs text-muted-foreground">{med.observacoes || 'Sem observações'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{med.valor} {med.unidade || '-'}</p>
                      <p className="text-xs text-muted-foreground">Alerta: {med.limite_alerta ?? '-'} • Crítico: {med.limite_critico ?? '-'}</p>
                      <Badge className={getStatusBadge(med.status)}>{med.status}</Badge>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          onClick={() => setOsSuggestion({
                            tag: med.tag,
                            tipo_medicao: med.tipo_medicao,
                            valor: Number(med.valor || 0),
                            unidade: med.unidade,
                            limite_alerta: med.limite_alerta,
                            limite_critico: med.limite_critico,
                            status: med.status,
                            observacoes: med.observacoes,
                          })}
                        >
                          Sugerir abertura de O.S
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {alertasAtivos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-lg">Nenhum alerta ativo</p>
                <p className="text-sm">Todos os equipamentos monitorados estão em condições normais</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Medição Preditiva</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG do Equipamento *</Label>
                <Select value={formData.tag} onValueChange={(v) => setFormData({...formData, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag} - {e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Medição *</Label>
                <Select value={formData.tipo_medicao} onValueChange={(v) => setFormData({...formData, tipo_medicao: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIBRACAO">Vibração</SelectItem>
                    <SelectItem value="TEMPERATURA">Temperatura</SelectItem>
                    <SelectItem value="PRESSAO">Pressão</SelectItem>
                    <SelectItem value="CORRENTE">Corrente Elétrica</SelectItem>
                    <SelectItem value="ULTRASSOM">Ultrassom</SelectItem>
                    <SelectItem value="TERMOGRAFIA">Termografia</SelectItem>
                    <SelectItem value="ANALISE_OLEO">Análise de Óleo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Medido *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.valor} 
                  onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={formData.unidade} onValueChange={(v) => setFormData({...formData, unidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm/s">mm/s (Vibração)</SelectItem>
                    <SelectItem value="°C">°C (Temperatura)</SelectItem>
                    <SelectItem value="bar">bar (Pressão)</SelectItem>
                    <SelectItem value="A">A (Corrente)</SelectItem>
                    <SelectItem value="dB">dB (Ultrassom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite de Alerta</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.limite_alerta} 
                  onChange={(e) => setFormData({...formData, limite_alerta: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Crítico</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.limite_critico} 
                  onChange={(e) => setFormData({...formData, limite_critico: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={formData.observacoes} 
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                Registrar Medição
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!osSuggestion} onOpenChange={(open) => !open && setOsSuggestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar abertura de O.S preditiva</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma O.S já preenchida com os dados da medição para a TAG {osSuggestion?.tag}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
            <p><strong>Tipo:</strong> {osSuggestion?.tipo_medicao}</p>
            <p><strong>Status:</strong> {osSuggestion?.status}</p>
            <p><strong>Valor:</strong> {osSuggestion?.valor} {osSuggestion?.unidade || '-'}</p>
            <p><strong>Limite alerta:</strong> {osSuggestion?.limite_alerta ?? '-'}</p>
            <p><strong>Limite crítico:</strong> {osSuggestion?.limite_critico ?? '-'}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!osSuggestion) return;
                await openOSSuggestion(osSuggestion);
                setOsSuggestion(null);
              }}
              disabled={createOSMutation.isPending}
            >
              {createOSMutation.isPending ? 'Abrindo...' : 'Abrir O.S pré-preenchida'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Measurement Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Medição Preditiva</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">TAG: <strong className="text-foreground font-mono">{editingMedicao?.tag}</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Alterações serão registradas no histórico de auditoria.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Medição *</Label>
                <Select value={editFormData.tipo_medicao} onValueChange={(v) => setEditFormData({...editFormData, tipo_medicao: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIBRACAO">Vibração</SelectItem>
                    <SelectItem value="TEMPERATURA">Temperatura</SelectItem>
                    <SelectItem value="PRESSAO">Pressão</SelectItem>
                    <SelectItem value="CORRENTE">Corrente Elétrica</SelectItem>
                    <SelectItem value="ULTRASSOM">Ultrassom</SelectItem>
                    <SelectItem value="TERMOGRAFIA">Termografia</SelectItem>
                    <SelectItem value="ANALISE_OLEO">Análise de Óleo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={editFormData.unidade} onValueChange={(v) => setEditFormData({...editFormData, unidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm/s">mm/s (Vibração)</SelectItem>
                    <SelectItem value="°C">°C (Temperatura)</SelectItem>
                    <SelectItem value="bar">bar (Pressão)</SelectItem>
                    <SelectItem value="A">A (Corrente)</SelectItem>
                    <SelectItem value="dB">dB (Ultrassom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Medido *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.valor}
                  onChange={(e) => setEditFormData({...editFormData, valor: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite de Alerta</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.limite_alerta}
                  onChange={(e) => setEditFormData({...editFormData, limite_alerta: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Crítico</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.limite_critico}
                  onChange={(e) => setEditFormData({...editFormData, limite_critico: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editFormData.observacoes}
                onChange={(e) => setEditFormData({...editFormData, observacoes: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={isEditSubmitting}>
                {isEditSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={(open) => { setIsHistoryOpen(open); if (!open) setHistoryMedicaoId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Alterações</DialogTitle></DialogHeader>
          {loadingHistorico ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !historicoAlteracoes || historicoAlteracoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma alteração registrada para esta medição.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historicoAlteracoes.map((log) => {
                const campos = log.diferenca as Record<string, { antes: unknown; depois: unknown }> | undefined;
                return (
                  <div key={log.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{log.acao === 'UPDATE' ? 'Edição de Medição' : log.acao}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Usuário: {log.usuario_email || 'sistema'}</p>
                    {campos && Object.keys(campos).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(campos).map(([campo, diff]) => (
                          <div key={campo} className="text-xs rounded bg-muted p-2">
                            <span className="font-semibold">{campo}:</span>{' '}
                            <span className="text-destructive line-through">{String(diff.antes ?? '-')}</span>
                            {' → '}
                            <span className="text-success font-medium">{String(diff.depois ?? '-')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}