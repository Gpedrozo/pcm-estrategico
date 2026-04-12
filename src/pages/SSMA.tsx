import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ShieldAlert, AlertTriangle, FileWarning, Calendar, GraduationCap, Trash2, HardHat, FileSearch2 } from 'lucide-react';
import { useIncidentesSSMA, useCreateIncidenteSSMA, usePermissoesTrabalho, useCreatePermissaoTrabalho } from '@/hooks/useSSMA';
import { useEPIs, useCreateEPI, useEntregasEPI, useCreateEntregaEPI } from '@/hooks/useEPIs';
import { useFichasSeguranca, useCreateFichaSeguranca } from '@/hooks/useFichasSeguranca';
import {
  useTreinamentosSSMA,
  useCreateTreinamentoSSMA,
  useDeleteTreinamentoSSMA,
  diasParaVencer,
  TIPO_CURSO_LABELS,
  type TipoCurso,
  type TreinamentoSSMARow,
} from '@/hooks/useTreinamentosSSMA';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useFormDraft } from '@/hooks/useFormDraft';

export default function SSMA() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('incidentes');
  const [isIncidenteModalOpen, setIsIncidenteModalOpen] = useState(false);
  const [isPTModalOpen, setIsPTModalOpen] = useState(false);
  const [isTreinamentoModalOpen, setIsTreinamentoModalOpen] = useState(false);
  const [isEPIModalOpen, setIsEPIModalOpen] = useState(false);
  const [isEntregaEPIModalOpen, setIsEntregaEPIModalOpen] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);

  const [incidenteForm, setIncidenteForm] = useState({
    tipo: 'QUASE_ACIDENTE' as 'ACIDENTE' | 'QUASE_ACIDENTE' | 'INCIDENTE_AMBIENTAL' | 'DESVIO',
    descricao: '',
    local_ocorrencia: '',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    severidade: 'MODERADO' as 'LEVE' | 'MODERADO' | 'GRAVE' | 'FATAL',
    pessoas_envolvidas: '',
    acoes_imediatas: '',
    dias_afastamento: 0,
  });
  const { clearDraft: clearIncidenteDraft } = useFormDraft('draft:ssma-incidente', incidenteForm, setIncidenteForm);

  const [ptForm, setPTForm] = useState({
    tipo: 'TRABALHO_QUENTE' as 'GERAL' | 'TRABALHO_ALTURA' | 'ESPACO_CONFINADO' | 'TRABALHO_QUENTE' | 'ELETRICA' | 'ESCAVACAO',
    descricao_servico: '',
    tag: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    executante_nome: '',
    supervisor_nome: user?.nome || '',
    riscos_identificados: '',
    medidas_controle: '',
    epis_requeridos: '',
  });
  const { clearDraft: clearPTDraft } = useFormDraft('draft:ssma-pt', ptForm, setPTForm);

  const [treinamentoForm, setTreinamentoForm] = useState({
    colaborador_nome: '',
    tipo_curso: '' as TipoCurso | '',
    nome_curso: '',
    instituicao: '',
    carga_horaria: 0,
    data_realizacao: new Date().toISOString().split('T')[0],
    data_validade: '',
    dias_alerta_antes: 30,
    numero_certificado: '',
    observacoes: '',
  });
  const { clearDraft: clearTreinamentoDraft } = useFormDraft('draft:ssma-treinamento', treinamentoForm, setTreinamentoForm);

  const [epiForm, setEPIForm] = useState({
    nome: '',
    categoria: 'PROTECAO_CABECA' as string,
    numero_ca: '',
    fabricante: '',
    validade_ca: '',
    estoque_atual: 0,
    estoque_minimo: 0,
  });

  const [entregaForm, setEntregaForm] = useState({
    epi_id: '',
    colaborador_nome: '',
    quantidade: 1,
    data_entrega: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
  });

  const [fichaForm, setFichaForm] = useState({
    nome_produto: '',
    codigo: '',
    fabricante: '',
    classificacao_ghs: '',
    perigos_principais: '',
    medidas_emergencia: '',
    primeiros_socorros: '',
    armazenamento: '',
    epi_recomendado: '',
    data_validade: '',
  });

  const { data: incidentes, isLoading: loadingIncidentes } = useIncidentesSSMA();
  const { data: permissoes, isLoading: loadingPT } = usePermissoesTrabalho();
  const { data: treinamentos, isLoading: loadingTreinamentos } = useTreinamentosSSMA();
  const { data: epis, isLoading: loadingEPIs } = useEPIs();
  const { data: entregasEPI } = useEntregasEPI();
  const { data: fichas, isLoading: loadingFichas } = useFichasSeguranca();
  const { data: equipamentos } = useEquipamentos();
  const createIncidente = useCreateIncidenteSSMA();
  const createPT = useCreatePermissaoTrabalho();
  const createTreinamento = useCreateTreinamentoSSMA();
  const deleteTreinamento = useDeleteTreinamentoSSMA();
  const createEPI = useCreateEPI();
  const createEntregaEPI = useCreateEntregaEPI();
  const createFicha = useCreateFichaSeguranca();

  const handleSubmitIncidente = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncidente.mutateAsync({
      ...incidenteForm,
      equipamento_id: null,
      tag: null,
      testemunhas: null,
      causas_imediatas: null,
      causas_basicas: null,
      custo_estimado: null,
      status: 'ABERTO',
      responsavel_id: user?.id || null,
      responsavel_nome: user?.nome || null,
    });
    setIsIncidenteModalOpen(false);
    clearIncidenteDraft();
    setIncidenteForm({
      tipo: 'QUASE_ACIDENTE', descricao: '', local_ocorrencia: '',
      data_ocorrencia: new Date().toISOString().split('T')[0], severidade: 'MODERADO',
      pessoas_envolvidas: '', acoes_imediatas: '', dias_afastamento: 0
    });
  };

  const handleSubmitPT = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPT.mutateAsync({
      ...ptForm,
    });
    setIsPTModalOpen(false);
    clearPTDraft();
    setPTForm({
      tipo: 'TRABALHO_QUENTE', descricao_servico: '', tag: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
      executante_nome: '', supervisor_nome: user?.nome || '',
      riscos_identificados: '', medidas_controle: '', epis_requeridos: ''
    });
  };

  const handleSubmitTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTreinamento.mutateAsync({
      ...treinamentoForm,
      tipo_curso: (treinamentoForm.tipo_curso || 'OUTRO') as TipoCurso,
      carga_horaria: treinamentoForm.carga_horaria || null,
      data_validade: treinamentoForm.data_validade || null,
      instituicao: treinamentoForm.instituicao || null,
      numero_certificado: treinamentoForm.numero_certificado || null,
      observacoes: treinamentoForm.observacoes || null,
    });
    setIsTreinamentoModalOpen(false);
    clearTreinamentoDraft();
    setTreinamentoForm({
      colaborador_nome: '', tipo_curso: '' as TipoCurso | '', nome_curso: '',
      instituicao: '', carga_horaria: 0,
      data_realizacao: new Date().toISOString().split('T')[0],
      data_validade: '', dias_alerta_antes: 30,
      numero_certificado: '', observacoes: '',
    });
  };

  const handleSubmitEPI = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEPI.mutateAsync({
      nome: epiForm.nome,
      categoria: epiForm.categoria,
      numero_ca: epiForm.numero_ca || null,
      fabricante: epiForm.fabricante || null,
      validade_ca: epiForm.validade_ca || null,
      estoque_atual: epiForm.estoque_atual,
      estoque_minimo: epiForm.estoque_minimo,
    });
    setIsEPIModalOpen(false);
    setEPIForm({ nome: '', categoria: 'PROTECAO_CABECA', numero_ca: '', fabricante: '', validade_ca: '', estoque_atual: 0, estoque_minimo: 0 });
  };

  const handleSubmitEntregaEPI = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEntregaEPI.mutateAsync({
      epi_id: entregaForm.epi_id,
      colaborador_nome: entregaForm.colaborador_nome,
      quantidade: entregaForm.quantidade,
      data_entrega: entregaForm.data_entrega,
      motivo: entregaForm.motivo || null,
      observacoes: entregaForm.observacoes || null,
    });
    setIsEntregaEPIModalOpen(false);
    setEntregaForm({ epi_id: '', colaborador_nome: '', quantidade: 1, data_entrega: new Date().toISOString().split('T')[0], motivo: '', observacoes: '' });
  };

  const handleSubmitFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFicha.mutateAsync({
      nome_produto: fichaForm.nome_produto,
      codigo: fichaForm.codigo || null,
      fabricante: fichaForm.fabricante || null,
      classificacao_ghs: fichaForm.classificacao_ghs || null,
      perigos_principais: fichaForm.perigos_principais || null,
      medidas_emergencia: fichaForm.medidas_emergencia || null,
      primeiros_socorros: fichaForm.primeiros_socorros || null,
      armazenamento: fichaForm.armazenamento || null,
      epi_recomendado: fichaForm.epi_recomendado || null,
      data_validade: fichaForm.data_validade || null,
    });
    setIsFichaModalOpen(false);
    setFichaForm({ nome_produto: '', codigo: '', fabricante: '', classificacao_ghs: '', perigos_principais: '', medidas_emergencia: '', primeiros_socorros: '', armazenamento: '', epi_recomendado: '', data_validade: '' });
  };

  const getStatusTreinamentoBadge = (status: string) => {
    const styles: Record<string, string> = {
      'VALIDO': 'bg-success/10 text-success',
      'PROXIMO_VENCIMENTO': 'bg-warning/10 text-warning',
      'VENCIDO': 'bg-destructive/10 text-destructive',
    };
    return styles[status] || '';
  };

  const getStatusTreinamentoLabel = (status: string) => {
    const labels: Record<string, string> = {
      'VALIDO': 'Válido',
      'PROXIMO_VENCIMENTO': 'Vencendo',
      'VENCIDO': 'Vencido',
    };
    return labels[status] || status;
  };

  const getTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'ACIDENTE': 'bg-destructive text-destructive-foreground',
      'QUASE_ACIDENTE': 'bg-warning text-warning-foreground',
      'INCIDENTE': 'bg-info/10 text-info',
      'DESVIO': 'bg-muted text-muted-foreground',
    };
    return styles[tipo] || '';
  };

  const getPTTipoBadge = (tipo: string) => {
    const styles: Record<string, string> = {
      'TRABALHO_QUENTE': 'bg-orange-500/10 text-orange-500',
      'ESPACO_CONFINADO': 'bg-red-500/10 text-red-500',
      'ALTURA': 'bg-blue-500/10 text-blue-500',
      'ELETRICA': 'bg-yellow-500/10 text-yellow-500',
      'ESCAVACAO': 'bg-amber-500/10 text-amber-500',
    };
    return styles[tipo] || '';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'ABERTO': 'bg-warning/10 text-warning',
      'EM_INVESTIGACAO': 'bg-info/10 text-info',
      'AGUARDANDO_ACOES': 'bg-primary/10 text-primary',
      'ENCERRADO': 'bg-success/10 text-success',
      'PENDENTE': 'bg-muted text-muted-foreground',
      'APROVADA': 'bg-success/10 text-success',
      'EM_EXECUCAO': 'bg-info/10 text-info',
      'CONCLUIDA': 'bg-primary/10 text-primary',
      'CANCELADA': 'bg-destructive/10 text-destructive',
    };
    return styles[status] || '';
  };

  const isLoading = loadingIncidentes || loadingPT || loadingTreinamentos || loadingEPIs || loadingFichas;

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
          <h1 className="text-2xl font-bold text-foreground">SSMA - Saúde, Segurança e Meio Ambiente</h1>
          <p className="text-muted-foreground">Gestão de incidentes, permissões de trabalho, treinamentos, EPIs e fichas de segurança</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Acidentes (Ano)</p>
          </div>
          <p className="text-2xl font-bold text-destructive">{incidentes?.filter(i => i.tipo === 'ACIDENTE').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Quase Acidentes</p>
          </div>
          <p className="text-2xl font-bold text-warning">{incidentes?.filter(i => i.tipo === 'QUASE_ACIDENTE').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-info" />
            <p className="text-sm text-muted-foreground">Incidentes Abertos</p>
          </div>
          <p className="text-2xl font-bold text-info">{incidentes?.filter(i => i.status === 'ABERTO').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-success" />
            <p className="text-sm text-muted-foreground">PTs Vigentes</p>
          </div>
          <p className="text-2xl font-bold text-success">{permissoes?.filter(p => p.status === 'APROVADA' || p.status === 'EM_EXECUCAO').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Cursos Vencendo</p>
          </div>
          <p className="text-2xl font-bold text-warning">{treinamentos?.filter(t => t.status === 'PROXIMO_VENCIMENTO').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Cursos Vencidos</p>
          </div>
          <p className="text-2xl font-bold text-destructive">{treinamentos?.filter(t => t.status === 'VENCIDO').length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">EPIs Estoque Baixo</p>
          </div>
          <p className="text-2xl font-bold text-primary">{epis?.filter(e => e.ativo && e.estoque_atual <= e.estoque_minimo).length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FileSearch2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">FISPQs Ativas</p>
          </div>
          <p className="text-2xl font-bold">{fichas?.filter(f => f.ativo).length || 0}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões de Trabalho</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos / NRs</TabsTrigger>
            <TabsTrigger value="epis">EPIs</TabsTrigger>
            <TabsTrigger value="fichas">FISPQs</TabsTrigger>
          </TabsList>
          {activeTab === 'incidentes' ? (
            <Button onClick={() => setIsIncidenteModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Registrar Incidente
            </Button>
          ) : activeTab === 'permissoes' ? (
            <Button onClick={() => setIsPTModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Nova Permissão
            </Button>
          ) : activeTab === 'treinamentos' ? (
            <Button onClick={() => setIsTreinamentoModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Novo Treinamento
            </Button>
          ) : activeTab === 'epis' ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsEPIModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Cadastrar EPI
              </Button>
              <Button variant="outline" onClick={() => setIsEntregaEPIModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Registrar Entrega
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsFichaModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Nova FISPQ
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <TabsContent value="incidentes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Local</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {incidentes?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum incidente registrado</td></tr>
                ) : (
                  incidentes?.map((inc) => (
                    <tr key={inc.id}>
                      <td className="font-mono font-medium">{inc.numero_incidente}</td>
                      <td><Badge className={getTipoBadge(inc.tipo)}>{inc.tipo?.replace('_', ' ')}</Badge></td>
                      <td className="max-w-[200px] truncate">{inc.descricao}</td>
                      <td>{inc.local_ocorrencia || '-'}</td>
                      <td><Badge variant={inc.severidade === 'GRAVE' || inc.severidade === 'FATAL' ? 'destructive' : 'secondary'}>{inc.severidade}</Badge></td>
                      <td><Badge className={getStatusBadge(inc.status)}>{inc.status?.replace('_', ' ')}</Badge></td>
                      <td>{new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="permissoes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nº PT</th>
                  <th>Tipo</th>
                  <th>Serviço</th>
                  <th>Executante</th>
                  <th>Validade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {permissoes?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma permissão registrada</td></tr>
                ) : (
                  permissoes?.map((pt) => (
                    <tr key={pt.id}>
                      <td className="font-mono font-medium">{pt.numero_pt}</td>
                      <td><Badge className={getPTTipoBadge(pt.tipo)}>{pt.tipo?.replace('_', ' ')}</Badge></td>
                      <td className="max-w-[200px] truncate">{pt.descricao_servico}</td>
                      <td>{pt.executante_nome}</td>
                      <td>{new Date(pt.data_inicio).toLocaleDateString('pt-BR')} - {new Date(pt.data_fim).toLocaleDateString('pt-BR')}</td>
                      <td><Badge className={getStatusBadge(pt.status)}>{pt.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="treinamentos" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Curso</th>
                  <th>Realização</th>
                  <th>Validade</th>
                  <th>Dias p/ Vencer</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {treinamentos?.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum treinamento registrado</td></tr>
                ) : (
                  treinamentos
                    ?.filter(t => {
                      if (!search) return true;
                      const s = search.toLowerCase();
                      return t.colaborador_nome.toLowerCase().includes(s)
                        || t.nome_curso.toLowerCase().includes(s)
                        || t.tipo_curso.toLowerCase().includes(s);
                    })
                    .map((tr) => {
                      const dias = diasParaVencer(tr.data_validade);
                      return (
                        <tr key={tr.id}>
                          <td className="font-medium">{tr.colaborador_nome}</td>
                          <td><Badge variant="outline">{tr.tipo_curso}</Badge></td>
                          <td className="max-w-[200px] truncate">{tr.nome_curso}</td>
                          <td>{new Date(tr.data_realizacao).toLocaleDateString('pt-BR')}</td>
                          <td>{tr.data_validade ? new Date(tr.data_validade).toLocaleDateString('pt-BR') : 'Sem validade'}</td>
                          <td className="font-mono">
                            {dias !== null ? (
                              <span className={dias <= 0 ? 'text-destructive font-bold' : dias <= 30 ? 'text-warning font-bold' : 'text-success'}>
                                {dias <= 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                              </span>
                            ) : '—'}
                          </td>
                          <td><Badge className={getStatusTreinamentoBadge(tr.status)}>{getStatusTreinamentoLabel(tr.status)}</Badge></td>
                          <td>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteTreinamento.mutate(tr.id)}
                              disabled={deleteTreinamento.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── TAB EPIs ────────────────────────────────── */}
        <TabsContent value="epis" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>CA</th>
                  <th>Fabricante</th>
                  <th>Validade CA</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {epis?.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum EPI cadastrado</td></tr>
                ) : (
                  epis?.filter(e => {
                    if (!search) return true;
                    const s = search.toLowerCase();
                    return e.nome.toLowerCase().includes(s) || e.categoria.toLowerCase().includes(s) || (e.numero_ca || '').toLowerCase().includes(s);
                  }).map((epi) => {
                    const estoqueBaixo = epi.estoque_atual <= epi.estoque_minimo;
                    return (
                      <tr key={epi.id}>
                        <td className="font-medium">{epi.nome}</td>
                        <td><Badge variant="outline">{epi.categoria.replace(/_/g, ' ')}</Badge></td>
                        <td className="font-mono">{epi.numero_ca || '—'}</td>
                        <td>{epi.fabricante || '—'}</td>
                        <td>{epi.validade_ca ? new Date(epi.validade_ca).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className={`font-mono font-bold ${estoqueBaixo ? 'text-destructive' : 'text-success'}`}>{epi.estoque_atual}</td>
                        <td className="font-mono">{epi.estoque_minimo}</td>
                        <td>
                          {estoqueBaixo ? (
                            <Badge variant="destructive">Estoque Baixo</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success">OK</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Últimas Entregas */}
          {(entregasEPI?.length ?? 0) > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden mt-4">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Últimas Entregas de EPI</h3>
              </div>
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>EPI</th>
                    <th>Colaborador</th>
                    <th>Qtd</th>
                    <th>Data Entrega</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasEPI?.slice(0, 20).map((ent) => {
                    const epiNome = epis?.find(e => e.id === ent.epi_id)?.nome || ent.epi_id.slice(0, 8);
                    return (
                      <tr key={ent.id}>
                        <td className="font-medium">{epiNome}</td>
                        <td>{ent.colaborador_nome}</td>
                        <td className="font-mono">{ent.quantidade}</td>
                        <td>{new Date(ent.data_entrega).toLocaleDateString('pt-BR')}</td>
                        <td className="max-w-[200px] truncate">{ent.motivo || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── TAB FISPQs ──────────────────────────────── */}
        <TabsContent value="fichas" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Fabricante</th>
                  <th>Classif. GHS</th>
                  <th>EPI Recomendado</th>
                  <th>Validade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fichas?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma FISPQ cadastrada</td></tr>
                ) : (
                  fichas?.filter(f => {
                    if (!search) return true;
                    const s = search.toLowerCase();
                    return f.nome_produto.toLowerCase().includes(s) || (f.codigo || '').toLowerCase().includes(s) || (f.fabricante || '').toLowerCase().includes(s);
                  }).map((ficha) => (
                    <tr key={ficha.id}>
                      <td className="font-mono">{ficha.codigo || '—'}</td>
                      <td className="font-medium">{ficha.nome_produto}</td>
                      <td>{ficha.fabricante || '—'}</td>
                      <td>{ficha.classificacao_ghs || '—'}</td>
                      <td className="max-w-[200px] truncate">{ficha.epi_recomendado || '—'}</td>
                      <td>{ficha.data_validade ? new Date(ficha.data_validade).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        {ficha.ativo ? (
                          <Badge className="bg-success/10 text-success">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Incidente Modal */}
      <Dialog open={isIncidenteModalOpen} onOpenChange={setIsIncidenteModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Incidente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitIncidente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={incidenteForm.tipo} onValueChange={(v: any) => setIncidenteForm({...incidenteForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACIDENTE">Acidente</SelectItem>
                    <SelectItem value="QUASE_ACIDENTE">Quase Acidente</SelectItem>
                    <SelectItem value="INCIDENTE_AMBIENTAL">Incidente Ambiental</SelectItem>
                    <SelectItem value="DESVIO">Desvio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={incidenteForm.severidade} onValueChange={(v: any) => setIncidenteForm({...incidenteForm, severidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEVE">Leve</SelectItem>
                    <SelectItem value="MODERADO">Moderado</SelectItem>
                    <SelectItem value="GRAVE">Grave</SelectItem>
                    <SelectItem value="FATAL">Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Ocorrência</Label>
                <Input type="date" value={incidenteForm.data_ocorrencia} onChange={(e) => setIncidenteForm({...incidenteForm, data_ocorrencia: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={incidenteForm.local_ocorrencia} onChange={(e) => setIncidenteForm({...incidenteForm, local_ocorrencia: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={incidenteForm.descricao} onChange={(e) => setIncidenteForm({...incidenteForm, descricao: e.target.value})} rows={3} required />
            </div>
            <div className="space-y-2">
              <Label>Pessoas Envolvidas</Label>
              <Input value={incidenteForm.pessoas_envolvidas} onChange={(e) => setIncidenteForm({...incidenteForm, pessoas_envolvidas: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Ações Imediatas</Label>
              <Textarea value={incidenteForm.acoes_imediatas} onChange={(e) => setIncidenteForm({...incidenteForm, acoes_imediatas: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createIncidente.isPending}>Registrar</Button>
              <Button type="button" variant="outline" onClick={() => setIsIncidenteModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PT Modal */}
      <Dialog open={isPTModalOpen} onOpenChange={setIsPTModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Permissão de Trabalho</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitPT} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Trabalho *</Label>
                <Select value={ptForm.tipo} onValueChange={(v: any) => setPTForm({...ptForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERAL">Geral</SelectItem>
                    <SelectItem value="TRABALHO_QUENTE">Trabalho a Quente</SelectItem>
                    <SelectItem value="ESPACO_CONFINADO">Espaço Confinado</SelectItem>
                    <SelectItem value="TRABALHO_ALTURA">Trabalho em Altura</SelectItem>
                    <SelectItem value="ELETRICA">Eletricidade</SelectItem>
                    <SelectItem value="ESCAVACAO">Escavação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TAG Equipamento</Label>
                <Select value={ptForm.tag} onValueChange={(v) => setPTForm({...ptForm, tag: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {equipamentos?.filter(e => e.ativo).map(e => (
                      <SelectItem key={e.id} value={e.tag}>{e.tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição do Serviço *</Label>
              <Textarea value={ptForm.descricao_servico} onChange={(e) => setPTForm({...ptForm, descricao_servico: e.target.value})} rows={2} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={ptForm.data_inicio} onChange={(e) => setPTForm({...ptForm, data_inicio: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={ptForm.data_fim} onChange={(e) => setPTForm({...ptForm, data_fim: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Executante *</Label>
                <Input value={ptForm.executante_nome} onChange={(e) => setPTForm({...ptForm, executante_nome: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Supervisor *</Label>
                <Input value={ptForm.supervisor_nome} onChange={(e) => setPTForm({...ptForm, supervisor_nome: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Riscos Identificados</Label>
              <Textarea value={ptForm.riscos_identificados} onChange={(e) => setPTForm({...ptForm, riscos_identificados: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Medidas de Controle</Label>
              <Textarea value={ptForm.medidas_controle} onChange={(e) => setPTForm({...ptForm, medidas_controle: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>EPIs Requeridos</Label>
              <Input value={ptForm.epis_requeridos} onChange={(e) => setPTForm({...ptForm, epis_requeridos: e.target.value})} placeholder="Ex: Capacete, luvas, óculos..." />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createPT.isPending}>Criar Permissão</Button>
              <Button type="button" variant="outline" onClick={() => setIsPTModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Treinamento Modal */}
      <Dialog open={isTreinamentoModalOpen} onOpenChange={setIsTreinamentoModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Treinamento / Curso</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTreinamento} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Colaborador *</Label>
              <Input value={treinamentoForm.colaborador_nome} onChange={(e) => setTreinamentoForm({...treinamentoForm, colaborador_nome: e.target.value})} required placeholder="Ex: João da Silva" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Curso</Label>
                <Select value={treinamentoForm.tipo_curso} onValueChange={(v: any) => {
                  const label = TIPO_CURSO_LABELS[v as TipoCurso] || v;
                  setTreinamentoForm({...treinamentoForm, tipo_curso: v, nome_curso: label});
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NR-05">NR-05 — CIPA</SelectItem>
                    <SelectItem value="NR-06">NR-06 — EPI</SelectItem>
                    <SelectItem value="NR-10">NR-10 — Segurança Elétrica</SelectItem>
                    <SelectItem value="NR-11">NR-11 — Movimentação de Cargas</SelectItem>
                    <SelectItem value="NR-12">NR-12 — Máquinas e Equipamentos</SelectItem>
                    <SelectItem value="NR-13">NR-13 — Caldeiras e Vasos de Pressão</SelectItem>
                    <SelectItem value="NR-17">NR-17 — Ergonomia</SelectItem>
                    <SelectItem value="NR-20">NR-20 — Inflamáveis</SelectItem>
                    <SelectItem value="NR-23">NR-23 — Proteção Incêndios</SelectItem>
                    <SelectItem value="NR-33">NR-33 — Espaço Confinado</SelectItem>
                    <SelectItem value="NR-35">NR-35 — Trabalho em Altura</SelectItem>
                    <SelectItem value="CIPA">CIPA</SelectItem>
                    <SelectItem value="BRIGADA">Brigada de Incêndio</SelectItem>
                    <SelectItem value="PRIMEIRO_SOCORRO">Primeiro Socorro</SelectItem>
                    <SelectItem value="EMPILHADEIRA">Operador Empilhadeira</SelectItem>
                    <SelectItem value="PONTE_ROLANTE">Ponte Rolante</SelectItem>
                    <SelectItem value="INTEGRACAO">Integração de Segurança</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Carga Horária (h)</Label>
                <Input type="number" min={0} value={treinamentoForm.carga_horaria || ''} onChange={(e) => setTreinamentoForm({...treinamentoForm, carga_horaria: parseInt(e.target.value) || 0})} placeholder="Ex: 40" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Curso *</Label>
              <Input value={treinamentoForm.nome_curso} onChange={(e) => setTreinamentoForm({...treinamentoForm, nome_curso: e.target.value})} required placeholder="Ex: NR-35 Trabalho em Altura - Reciclagem" />
            </div>
            <div className="space-y-2">
              <Label>Instituição / Instrutor</Label>
              <Input value={treinamentoForm.instituicao} onChange={(e) => setTreinamentoForm({...treinamentoForm, instituicao: e.target.value})} placeholder="Ex: SENAI, empresa interna..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Realização *</Label>
                <Input type="date" value={treinamentoForm.data_realizacao} onChange={(e) => setTreinamentoForm({...treinamentoForm, data_realizacao: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Data de Validade</Label>
                <Input type="date" value={treinamentoForm.data_validade} onChange={(e) => setTreinamentoForm({...treinamentoForm, data_validade: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alertar (dias antes)</Label>
                <Input type="number" min={1} max={365} value={treinamentoForm.dias_alerta_antes} onChange={(e) => setTreinamentoForm({...treinamentoForm, dias_alerta_antes: parseInt(e.target.value) || 30})} />
              </div>
              <div className="space-y-2">
                <Label>Nº Certificado</Label>
                <Input value={treinamentoForm.numero_certificado} onChange={(e) => setTreinamentoForm({...treinamentoForm, numero_certificado: e.target.value})} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={treinamentoForm.observacoes} onChange={(e) => setTreinamentoForm({...treinamentoForm, observacoes: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createTreinamento.isPending}>Registrar Treinamento</Button>
              <Button type="button" variant="outline" onClick={() => setIsTreinamentoModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EPI Modal */}
      <Dialog open={isEPIModalOpen} onOpenChange={setIsEPIModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar EPI</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEPI} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do EPI *</Label>
              <Input value={epiForm.nome} onChange={(e) => setEPIForm({...epiForm, nome: e.target.value})} required placeholder="Ex: Capacete de Segurança classe B" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={epiForm.categoria} onValueChange={(v) => setEPIForm({...epiForm, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROTECAO_CABECA">Proteção Cabeça</SelectItem>
                    <SelectItem value="PROTECAO_OLHOS">Proteção Olhos/Face</SelectItem>
                    <SelectItem value="PROTECAO_AUDITIVA">Proteção Auditiva</SelectItem>
                    <SelectItem value="PROTECAO_RESPIRATORIA">Proteção Respiratória</SelectItem>
                    <SelectItem value="PROTECAO_MAOS">Proteção Mãos</SelectItem>
                    <SelectItem value="PROTECAO_PES">Proteção Pés</SelectItem>
                    <SelectItem value="PROTECAO_CORPO">Proteção Corpo</SelectItem>
                    <SelectItem value="PROTECAO_QUEDAS">Proteção Quedas</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº CA</Label>
                <Input value={epiForm.numero_ca} onChange={(e) => setEPIForm({...epiForm, numero_ca: e.target.value})} placeholder="Ex: 12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Input value={epiForm.fabricante} onChange={(e) => setEPIForm({...epiForm, fabricante: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Validade CA</Label>
                <Input type="date" value={epiForm.validade_ca} onChange={(e) => setEPIForm({...epiForm, validade_ca: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input type="number" min={0} value={epiForm.estoque_atual} onChange={(e) => setEPIForm({...epiForm, estoque_atual: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input type="number" min={0} value={epiForm.estoque_minimo} onChange={(e) => setEPIForm({...epiForm, estoque_minimo: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createEPI.isPending}>Cadastrar EPI</Button>
              <Button type="button" variant="outline" onClick={() => setIsEPIModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Entrega EPI Modal */}
      <Dialog open={isEntregaEPIModalOpen} onOpenChange={setIsEntregaEPIModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Entrega de EPI</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEntregaEPI} className="space-y-4">
            <div className="space-y-2">
              <Label>EPI *</Label>
              <Select value={entregaForm.epi_id} onValueChange={(v) => setEntregaForm({...entregaForm, epi_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
                <SelectContent>
                  {epis?.filter(e => e.ativo).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome} (CA: {e.numero_ca || 'N/A'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Input value={entregaForm.colaborador_nome} onChange={(e) => setEntregaForm({...entregaForm, colaborador_nome: e.target.value})} required placeholder="Nome completo do colaborador" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={entregaForm.quantidade} onChange={(e) => setEntregaForm({...entregaForm, quantidade: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <Label>Data da Entrega</Label>
                <Input type="date" value={entregaForm.data_entrega} onChange={(e) => setEntregaForm({...entregaForm, data_entrega: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={entregaForm.motivo} onChange={(e) => setEntregaForm({...entregaForm, motivo: e.target.value})} placeholder="Ex: Substituição por desgaste" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={entregaForm.observacoes} onChange={(e) => setEntregaForm({...entregaForm, observacoes: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createEntregaEPI.isPending}>Registrar Entrega</Button>
              <Button type="button" variant="outline" onClick={() => setIsEntregaEPIModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ficha de Segurança (FISPQ) Modal */}
      <Dialog open={isFichaModalOpen} onOpenChange={setIsFichaModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar FISPQ / Ficha de Segurança</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitFicha} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={fichaForm.codigo} onChange={(e) => setFichaForm({...fichaForm, codigo: e.target.value})} placeholder="Ex: FISPQ-001" />
              </div>
              <div className="space-y-2">
                <Label>Nome do Produto *</Label>
                <Input value={fichaForm.nome_produto} onChange={(e) => setFichaForm({...fichaForm, nome_produto: e.target.value})} required placeholder="Ex: Óleo lubrificante SAE 15W40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Input value={fichaForm.fabricante} onChange={(e) => setFichaForm({...fichaForm, fabricante: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Classificação GHS</Label>
                <Input value={fichaForm.classificacao_ghs} onChange={(e) => setFichaForm({...fichaForm, classificacao_ghs: e.target.value})} placeholder="Ex: Inflamável Cat. 3" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Principais Perigos</Label>
              <Textarea value={fichaForm.perigos_principais} onChange={(e) => setFichaForm({...fichaForm, perigos_principais: e.target.value})} rows={2} placeholder="Descreva os perigos do produto..." />
            </div>
            <div className="space-y-2">
              <Label>Medidas de Emergência</Label>
              <Textarea value={fichaForm.medidas_emergencia} onChange={(e) => setFichaForm({...fichaForm, medidas_emergencia: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Primeiros Socorros</Label>
              <Textarea value={fichaForm.primeiros_socorros} onChange={(e) => setFichaForm({...fichaForm, primeiros_socorros: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Armazenamento</Label>
                <Textarea value={fichaForm.armazenamento} onChange={(e) => setFichaForm({...fichaForm, armazenamento: e.target.value})} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>EPI Recomendado</Label>
                <Textarea value={fichaForm.epi_recomendado} onChange={(e) => setFichaForm({...fichaForm, epi_recomendado: e.target.value})} rows={2} placeholder="Ex: Luvas nitrílicas, óculos..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Validade da Ficha</Label>
              <Input type="date" value={fichaForm.data_validade} onChange={(e) => setFichaForm({...fichaForm, data_validade: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createFicha.isPending}>Cadastrar FISPQ</Button>
              <Button type="button" variant="outline" onClick={() => setIsFichaModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
