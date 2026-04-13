import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ShieldAlert, AlertTriangle, FileWarning, Calendar, GraduationCap, Trash2, HardHat, FileSearch2, BarChart3, Printer, FileSpreadsheet, FileText, PackagePlus, PackageMinus, ArrowDown, ArrowUp, RotateCcw, Users, Edit2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useIncidentesSSMA, useCreateIncidenteSSMA, usePermissoesTrabalho, useCreatePermissaoTrabalho } from '@/hooks/useSSMA';
import { useEPIs, useCreateEPI, useEntregasEPI, useCreateEntregaEPI, useMovimentacoesEPI, useCreateMovimentacaoEPI, calcularSaldoMovimentacao, type TipoMovimentacaoEPI } from '@/hooks/useEPIs';
import { useFichasSeguranca, useCreateFichaSeguranca, useUpdateFichaSeguranca } from '@/hooks/useFichasSeguranca';
import {
  useTreinamentosSSMA,
  useCreateTreinamentoSSMA,
  useDeleteTreinamentoSSMA,
  diasParaVencer,
  TIPO_CURSO_LABELS,
  type TipoCurso,
  type TreinamentoSSMARow,
} from '@/hooks/useTreinamentosSSMA';
import { useAPR, useCreateAPR, useDeleteAPR, CLASSIFICACAO_LABELS } from '@/hooks/useAPR';
import { useColaboradoresSSMA, useCreateColaboradorSSMA, useUpdateColaboradorSSMA, useDeleteColaboradorSSMA, STATUS_COLABORADOR_LABELS, type ColaboradorSSMARow, type StatusColaborador } from '@/hooks/useColaboradoresSSMA';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAuth } from '@/contexts/AuthContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useDadosEmpresa } from '@/hooks/useDadosEmpresa';
import { SSMADashboard } from '@/components/ssma/SSMADashboard';
import { FichaEPIPrintTemplate } from '@/components/ssma/FichaEPIPrintTemplate';
import { FISPQDocumentos, type DocumentoAnexo } from '@/components/ssma/FISPQDocumentos';
import { FISPQPrintTemplate } from '@/components/ssma/FISPQPrintTemplate';
import {
  exportIncidentesPDF, exportIncidentesXLSX,
  exportTreinamentosPDF, exportTreinamentosXLSX,
  exportEstoqueEPIPDF, exportEstoqueEPIXLSX,
  exportFISPQsXLSX,
} from '@/lib/ssmaExport';
import type { FichaSegurancaRow } from '@/hooks/useFichasSeguranca';

export default function SSMA() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isIncidenteModalOpen, setIsIncidenteModalOpen] = useState(false);
  const [isPTModalOpen, setIsPTModalOpen] = useState(false);
  const [isTreinamentoModalOpen, setIsTreinamentoModalOpen] = useState(false);
  const [isEPIModalOpen, setIsEPIModalOpen] = useState(false);
  const [isEntregaEPIModalOpen, setIsEntregaEPIModalOpen] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);
  const [isAPRModalOpen, setIsAPRModalOpen] = useState(false);
  const [isMovimentacaoEPIModalOpen, setIsMovimentacaoEPIModalOpen] = useState(false);
  const [isColaboradorModalOpen, setIsColaboradorModalOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<ColaboradorSSMARow | null>(null);

  // Estados para impressão de Ficha EPI
  const [fichaEPIColaborador, setFichaEPIColaborador] = useState('');
  const [isFichaEPIPrintOpen, setIsFichaEPIPrintOpen] = useState(false);
  const fichaEPIPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintFichaEPI = useReactToPrint({ contentRef: fichaEPIPrintRef });

  // Estados para impressão de FISPQ
  const [fichaParaImprimir, setFichaParaImprimir] = useState<FichaSegurancaRow | null>(null);
  const fispqPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintFISPQ = useReactToPrint({ contentRef: fispqPrintRef });

  // Configuração de alerta de validade do CA (dias antes do vencimento)
  const [diasAlertaCA, setDiasAlertaCA] = useState<number>(() => {
    const saved = localStorage.getItem('ssma:diasAlertaCA');
    return saved ? parseInt(saved, 10) : 30;
  });
  const [showCAConfig, setShowCAConfig] = useState(false);
  const [diasAlertaCAInput, setDiasAlertaCAInput] = useState(diasAlertaCA);
  const [epiView, setEpiView] = useState<'estoque' | 'entregas' | 'movimentacoes' | 'colaboradores' | 'documentos'>('estoque');
  const [epiFiltroRapido, setEpiFiltroRapido] = useState<'TODOS' | 'CRITICOS' | 'ESTOQUE_BAIXO' | 'CA_VENCIDO'>('TODOS');

  const calcularStatusCA = (validade_ca: string | null): 'VALIDO' | 'PROXIMO' | 'VENCIDO' => {
    if (!validade_ca) return 'VALIDO';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const val = new Date(validade_ca + 'T00:00:00');
    if (val < hoje) return 'VENCIDO';
    const diff = Math.ceil((val.getTime() - hoje.getTime()) / 86400000);
    if (diff <= diasAlertaCA) return 'PROXIMO';
    return 'VALIDO';
  };

  const handleSalvarAlertaCA = () => {
    const v = Math.max(1, Math.min(365, diasAlertaCAInput));
    setDiasAlertaCA(v);
    setDiasAlertaCAInput(v);
    localStorage.setItem('ssma:diasAlertaCA', String(v));
    setShowCAConfig(false);
  };

  const { data: empresa } = useDadosEmpresa();

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
    colaborador_id: '',
    quantidade: 1,
    data_entrega: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
  });

  const [colaboradorForm, setColaboradorForm] = useState({
    nome: '',
    funcao: '',
    setor: '',
    matricula: '',
    data_admissao: '',
    status: 'ATIVO' as StatusColaborador,
  });

  const [movimentacaoEPIForm, setMovimentacaoEPIForm] = useState({
    epi_id: '',
    tipo: 'ENTRADA' as TipoMovimentacaoEPI,
    quantidade: 1,
    motivo: '',
    documento_ref: '',
    colaborador_nome: '',
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

  const [aprForm, setAPRForm] = useState({
    atividade: '',
    local_setor: '',
    data_analise: new Date().toISOString().split('T')[0],
    responsavel: user?.nome || '',
    perigo: '',
    risco: '',
    probabilidade: 3,
    severidade: 3,
    medidas_controle: '',
    responsavel_acao: '',
    prazo_acao: '',
    observacoes: '',
  });

  const { data: incidentes, isLoading: loadingIncidentes } = useIncidentesSSMA();
  const { data: permissoes, isLoading: loadingPT } = usePermissoesTrabalho();
  const { data: treinamentos, isLoading: loadingTreinamentos } = useTreinamentosSSMA();
  const { data: epis, isLoading: loadingEPIs } = useEPIs();
  const { data: entregasEPI } = useEntregasEPI();
  const { data: movimentacoesEPI } = useMovimentacoesEPI();
  const { data: colaboradoresSSMA, isLoading: loadingColaboradores } = useColaboradoresSSMA();
  const { data: fichas, isLoading: loadingFichas } = useFichasSeguranca();
  const { data: aprs, isLoading: loadingAPR } = useAPR();
  const { data: equipamentos } = useEquipamentos();
  const createIncidente = useCreateIncidenteSSMA();
  const createPT = useCreatePermissaoTrabalho();
  const createTreinamento = useCreateTreinamentoSSMA();
  const deleteTreinamento = useDeleteTreinamentoSSMA();
  const createEPI = useCreateEPI();
  const createEntregaEPI = useCreateEntregaEPI();
  const createMovimentacaoEPI = useCreateMovimentacaoEPI();
  const createColaborador = useCreateColaboradorSSMA();
  const updateColaborador = useUpdateColaboradorSSMA();
  const deleteColaborador = useDeleteColaboradorSSMA();
  const createFicha = useCreateFichaSeguranca();
  const updateFicha = useUpdateFichaSeguranca();
  const createAPR = useCreateAPR();
  const deleteAPR = useDeleteAPR();

  // Callback para salvar arquivo/anexos na FISPQ
  const handleFichaDocumentoSalvo = (fichaId: string, arquivo_url: string | null, documentos_anexos: DocumentoAnexo[]) => {
    updateFicha.mutate({ id: fichaId, arquivo_url, documentos_anexos: documentos_anexos as unknown });
  };

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
    // Se colaborador selecionado do cadastro, usa nome dele; senão mantém texto livre
    const colaboradorSelecionado = colaboradoresLista.find(c => c.id === entregaForm.colaborador_id);
    const nomeColaborador = colaboradorSelecionado?.nome || entregaForm.colaborador_nome;
    await createEntregaEPI.mutateAsync({
      epi_id: entregaForm.epi_id,
      colaborador_nome: nomeColaborador,
      quantidade: entregaForm.quantidade,
      data_entrega: entregaForm.data_entrega,
      motivo: entregaForm.motivo || null,
      observacoes: entregaForm.observacoes || null,
    });
    setIsEntregaEPIModalOpen(false);
    setEntregaForm({ epi_id: '', colaborador_nome: '', colaborador_id: '', quantidade: 1, data_entrega: new Date().toISOString().split('T')[0], motivo: '', observacoes: '' });
  };

  const handleSubmitColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingColaborador) {
      await updateColaborador.mutateAsync({
        id: editingColaborador.id,
        nome: colaboradorForm.nome,
        funcao: colaboradorForm.funcao || null,
        setor: colaboradorForm.setor || null,
        matricula: colaboradorForm.matricula || null,
        data_admissao: colaboradorForm.data_admissao || null,
        status: colaboradorForm.status,
      });
    } else {
      await createColaborador.mutateAsync({
        nome: colaboradorForm.nome,
        funcao: colaboradorForm.funcao || null,
        setor: colaboradorForm.setor || null,
        matricula: colaboradorForm.matricula || null,
        data_admissao: colaboradorForm.data_admissao || null,
        status: colaboradorForm.status,
      });
    }
    setIsColaboradorModalOpen(false);
    setEditingColaborador(null);
    setColaboradorForm({ nome: '', funcao: '', setor: '', matricula: '', data_admissao: '', status: 'ATIVO' });
  };

  const handleEditColaborador = (c: ColaboradorSSMARow) => {
    setEditingColaborador(c);
    setColaboradorForm({
      nome: c.nome,
      funcao: c.funcao || '',
      setor: c.setor || '',
      matricula: c.matricula || '',
      data_admissao: c.data_admissao || '',
      status: c.status,
    });
    setIsColaboradorModalOpen(true);
  };

  const handleSubmitMovimentacaoEPI = async (e: React.FormEvent) => {
    e.preventDefault();
    const epi = epis?.find((item) => item.id === movimentacaoEPIForm.epi_id);
    if (!epi) return;

    const { saldo_antes, saldo_depois } = calcularSaldoMovimentacao(
      epi.estoque_atual,
      movimentacaoEPIForm.tipo,
      movimentacaoEPIForm.quantidade,
    );

    await createMovimentacaoEPI.mutateAsync({
      epi_id: movimentacaoEPIForm.epi_id,
      tipo: movimentacaoEPIForm.tipo,
      quantidade: movimentacaoEPIForm.quantidade,
      saldo_antes,
      saldo_depois,
      motivo: movimentacaoEPIForm.motivo || null,
      documento_ref: movimentacaoEPIForm.documento_ref || null,
      colaborador_nome: movimentacaoEPIForm.colaborador_nome || null,
    });

    setIsMovimentacaoEPIModalOpen(false);
    setMovimentacaoEPIForm({
      epi_id: '',
      tipo: 'ENTRADA',
      quantidade: 1,
      motivo: '',
      documento_ref: '',
      colaborador_nome: '',
    });
  };

  const handleSubmitAPR = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAPR.mutateAsync({
      atividade: aprForm.atividade,
      local_setor: aprForm.local_setor || null,
      data_analise: aprForm.data_analise,
      responsavel: aprForm.responsavel,
      perigo: aprForm.perigo,
      risco: aprForm.risco,
      probabilidade: aprForm.probabilidade,
      severidade: aprForm.severidade,
      medidas_controle: aprForm.medidas_controle || null,
      responsavel_acao: aprForm.responsavel_acao || null,
      prazo_acao: aprForm.prazo_acao || null,
      observacoes: aprForm.observacoes || null,
    });

    setIsAPRModalOpen(false);
    setAPRForm({
      atividade: '',
      local_setor: '',
      data_analise: new Date().toISOString().split('T')[0],
      responsavel: user?.nome || '',
      perigo: '',
      risco: '',
      probabilidade: 3,
      severidade: 3,
      medidas_controle: '',
      responsavel_acao: '',
      prazo_acao: '',
      observacoes: '',
    });
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

  const episLista = epis || [];
  const entregasLista = entregasEPI || [];
  const movimentacoesLista = movimentacoesEPI || [];
  const colaboradoresLista = colaboradoresSSMA || [];
  const colaboradoresAtivos = colaboradoresLista.filter(c => c.status === 'ATIVO');

  const episAtivos = episLista.filter((item) => item.ativo);
  const episEstoqueBaixo = episAtivos.filter((item) => item.estoque_atual <= item.estoque_minimo);
  const episCAVencido = episAtivos.filter((item) => calcularStatusCA(item.validade_ca) === 'VENCIDO');
  const episCAProximo = episAtivos.filter((item) => calcularStatusCA(item.validade_ca) === 'PROXIMO');
  const episCriticos = episAtivos.filter((item) => {
    const statusCA = calcularStatusCA(item.validade_ca);
    return item.estoque_atual <= item.estoque_minimo || statusCA === 'VENCIDO';
  });

  const entregasUltimos30Dias = entregasLista.filter((item) => {
    const data = new Date(`${item.data_entrega}T00:00:00`);
    const diffDias = (Date.now() - data.getTime()) / 86400000;
    return diffDias >= 0 && diffDias <= 30;
  }).length;

  const episFiltrados = episLista.filter((item) => {
    const s = search.trim().toLowerCase();
    const passouBusca = !s
      || item.nome.toLowerCase().includes(s)
      || item.categoria.toLowerCase().includes(s)
      || (item.numero_ca || '').toLowerCase().includes(s);

    if (!passouBusca) return false;

    const statusCA = calcularStatusCA(item.validade_ca);

    if (epiFiltroRapido === 'ESTOQUE_BAIXO') {
      return item.estoque_atual <= item.estoque_minimo;
    }

    if (epiFiltroRapido === 'CA_VENCIDO') {
      return statusCA === 'VENCIDO';
    }

    if (epiFiltroRapido === 'CRITICOS') {
      return item.estoque_atual <= item.estoque_minimo || statusCA === 'VENCIDO';
    }

    return true;
  });

  const episFiltradosOrdenados = [...episFiltrados].sort((a, b) => {
    const statusA = calcularStatusCA(a.validade_ca);
    const statusB = calcularStatusCA(b.validade_ca);

    const pesoA = (a.estoque_atual <= a.estoque_minimo ? 2 : 0) + (statusA === 'VENCIDO' ? 2 : statusA === 'PROXIMO' ? 1 : 0);
    const pesoB = (b.estoque_atual <= b.estoque_minimo ? 2 : 0) + (statusB === 'VENCIDO' ? 2 : statusB === 'PROXIMO' ? 1 : 0);

    if (pesoA !== pesoB) return pesoB - pesoA;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  const entregasFiltradas = entregasLista.filter((item) => {
    const epiNome = episLista.find((epi) => epi.id === item.epi_id)?.nome || '';
    const s = search.trim().toLowerCase();
    if (!s) return true;

    return item.colaborador_nome.toLowerCase().includes(s)
      || epiNome.toLowerCase().includes(s)
      || (item.motivo || '').toLowerCase().includes(s);
  });

  const movimentacoesFiltradas = movimentacoesLista.filter((item) => {
    const epiNome = episLista.find((epi) => epi.id === item.epi_id)?.nome || '';
    const s = search.trim().toLowerCase();
    if (!s) return true;

    return item.tipo.toLowerCase().includes(s)
      || epiNome.toLowerCase().includes(s)
      || (item.motivo || '').toLowerCase().includes(s)
      || (item.documento_ref || '').toLowerCase().includes(s)
      || (item.colaborador_nome || '').toLowerCase().includes(s);
  });

  const treinamentosLista = treinamentos || [];
  const treinamentosFiltrados = treinamentosLista.filter((item) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;

    return item.colaborador_nome.toLowerCase().includes(s)
      || item.nome_curso.toLowerCase().includes(s)
      || item.tipo_curso.toLowerCase().includes(s);
  });

  const isLoading = loadingIncidentes || loadingPT || loadingTreinamentos || loadingEPIs || loadingFichas || loadingAPR;

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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões de Trabalho</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos / NRs</TabsTrigger>
            <TabsTrigger value="epis">EPIs</TabsTrigger>
            <TabsTrigger value="fichas">FISPQs</TabsTrigger>
            <TabsTrigger value="apr">APR</TabsTrigger>
          </TabsList>
          {activeTab === 'incidentes' ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsIncidenteModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Registrar Incidente
              </Button>
              <Button variant="outline" size="icon" title="Exportar PDF" onClick={() => exportIncidentesPDF(incidentes || [])}>
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Exportar XLSX" onClick={() => exportIncidentesXLSX(incidentes || [])}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </div>
          ) : activeTab === 'permissoes' ? (
            <Button onClick={() => setIsPTModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Nova Permissão
            </Button>
          ) : activeTab === 'treinamentos' ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsTreinamentoModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Novo Treinamento
              </Button>
              <Button variant="outline" size="icon" title="Exportar PDF" onClick={() => exportTreinamentosPDF(treinamentos || [])}>
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Exportar XLSX" onClick={() => exportTreinamentosXLSX(treinamentos || [])}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </div>
          ) : activeTab === 'epis' ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsEPIModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Cadastrar EPI
              </Button>
              <Button variant="outline" onClick={() => setIsEntregaEPIModalOpen(true)} className="gap-2">
                <PackageMinus className="h-4 w-4" />Registrar Entrega
              </Button>
              <Button variant="secondary" onClick={() => setIsMovimentacaoEPIModalOpen(true)} className="gap-2">
                <PackagePlus className="h-4 w-4" />Movimentar Estoque
              </Button>
              <Button variant="outline" size="icon" title="Exportar PDF" onClick={() => exportEstoqueEPIPDF(epis || [])}>
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Exportar XLSX" onClick={() => exportEstoqueEPIXLSX(epis || [])}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </div>
          ) : activeTab === 'fichas' ? (
            <div className="flex gap-2">
              <Button onClick={() => setIsFichaModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Nova FISPQ
              </Button>
              <Button variant="outline" size="icon" title="Exportar XLSX" onClick={() => exportFISPQsXLSX(fichas || [])}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </div>
          ) : activeTab === 'apr' ? (
            <Button onClick={() => setIsAPRModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Nova APR
            </Button>
          ) : null}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-4">
          <SSMADashboard
            incidentes={incidentes || []}
            permissoes={permissoes || []}
            treinamentos={treinamentos || []}
            epis={epis || []}
            fichas={fichas || []}
            entregasEPI={entregasLista}
            colaboradores={colaboradoresLista}
          />
        </TabsContent>

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
                {treinamentosLista.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum treinamento registrado</td></tr>
                ) : treinamentosFiltrados.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum treinamento encontrado para o filtro atual</td></tr>
                ) : (
                  treinamentosFiltrados.map((tr) => {
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
        <TabsContent value="epis" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">EPIs Ativos</p>
              <p className="text-2xl font-bold mt-1">{episAtivos.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estoque Baixo</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{episEstoqueBaixo.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">CA Vencido</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{episCAVencido.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">CA Próximo ({diasAlertaCA}d)</p>
              <p className="text-2xl font-bold mt-1 text-warning">{episCAProximo.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Entregas (30 dias)</p>
              <p className="text-2xl font-bold mt-1 text-primary">{entregasUltimos30Dias}</p>
            </div>
            {(() => {
              const ativos = colaboradoresLista.filter((c: any) => c.ativo !== false);
              const comEntrega = new Set(entregasLista.map((e: any) => (e.colaborador_id || e.nome_colaborador || '').toString().toLowerCase()));
              const ativosComEntrega = ativos.filter((c: any) => comEntrega.has(c.id) || comEntrega.has((c.nome || '').toLowerCase()));
              const pct = ativos.length > 0 ? Math.round((ativosComEntrega.length / ativos.length) * 100) : 0;
              return (
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobertura EPI</p>
                  <p className={`text-2xl font-bold mt-1 ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>{pct}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ativosComEntrega.length}/{ativos.length} colab.</p>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={epiFiltroRapido === 'TODOS' ? 'default' : 'outline'} size="sm" onClick={() => setEpiFiltroRapido('TODOS')}>
                Todos
              </Button>
              <Button variant={epiFiltroRapido === 'CRITICOS' ? 'destructive' : 'outline'} size="sm" onClick={() => setEpiFiltroRapido('CRITICOS')}>
                Críticos ({episCriticos.length})
              </Button>
              <Button variant={epiFiltroRapido === 'ESTOQUE_BAIXO' ? 'destructive' : 'outline'} size="sm" onClick={() => setEpiFiltroRapido('ESTOQUE_BAIXO')}>
                Estoque Baixo ({episEstoqueBaixo.length})
              </Button>
              <Button variant={epiFiltroRapido === 'CA_VENCIDO' ? 'destructive' : 'outline'} size="sm" onClick={() => setEpiFiltroRapido('CA_VENCIDO')}>
                CA Vencido ({episCAVencido.length})
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-muted-foreground">Validade CA:</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Em Dia</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />Próximo</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Vencido</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => { setDiasAlertaCAInput(diasAlertaCA); setShowCAConfig(!showCAConfig); }}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Configurar Alerta CA
              </Button>
            </div>
          </div>

          {showCAConfig && (
            <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">Alertar quando CA vencer em:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={diasAlertaCAInput}
                    onChange={(e) => setDiasAlertaCAInput(Number(e.target.value))}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">dias antes do vencimento</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  CA com validade em até {diasAlertaCAInput} dias ficará amarelo; CA vencido ficará vermelho; demais ficam verde.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSalvarAlertaCA}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCAConfig(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <Tabs value={epiView} onValueChange={(value) => setEpiView(value as 'estoque' | 'entregas' | 'movimentacoes' | 'colaboradores' | 'documentos')}>
            <TabsList>
              <TabsTrigger value="estoque">Estoque de EPIs</TabsTrigger>
              <TabsTrigger value="entregas">Entregas</TabsTrigger>
              <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
              <TabsTrigger value="colaboradores" className="gap-1.5"><Users className="h-3.5 w-3.5" />Colaboradores</TabsTrigger>
              <TabsTrigger value="documentos" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="mt-4 space-y-4">
              {episCriticos.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Itens críticos exigem ação imediata</p>
                      <p className="text-sm text-muted-foreground">
                        {episCriticos.slice(0, 4).map((item) => item.nome).join(', ')}
                        {episCriticos.length > 4 ? ` e mais ${episCriticos.length - 4}` : ''}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>CA</th>
                      <th>Fabricante</th>
                      <th>Validade CA</th>
                      <th>Status CA</th>
                      <th>Estoque</th>
                      <th>Mínimo</th>
                      <th>Status Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episFiltradosOrdenados.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum EPI encontrado para os filtros atuais</td></tr>
                    ) : (
                      episFiltradosOrdenados.map((epi) => {
                        const estoqueBaixo = epi.estoque_atual <= epi.estoque_minimo;
                        const estoqueAlerta = !estoqueBaixo && epi.estoque_atual <= epi.estoque_minimo + 2;
                        const statusCA = calcularStatusCA(epi.validade_ca);

                        return (
                          <tr key={epi.id}>
                            <td className="font-medium">{epi.nome}</td>
                            <td><Badge variant="outline">{epi.categoria.replace(/_/g, ' ')}</Badge></td>
                            <td className="font-mono">{epi.numero_ca || '—'}</td>
                            <td>{epi.fabricante || '—'}</td>
                            <td>
                              {epi.validade_ca ? new Date(`${epi.validade_ca}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                            </td>
                            <td>
                              {statusCA === 'VENCIDO' ? (
                                <Badge variant="destructive">Vencido</Badge>
                              ) : statusCA === 'PROXIMO' ? (
                                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Próximo</Badge>
                              ) : (
                                <Badge className="bg-success/10 text-success">Em dia</Badge>
                              )}
                            </td>
                            <td className={`font-mono font-bold ${estoqueBaixo ? 'text-destructive' : estoqueAlerta ? 'text-warning' : 'text-success'}`}>
                              {epi.estoque_atual}
                            </td>
                            <td className="font-mono">{epi.estoque_minimo}</td>
                            <td>
                              {estoqueBaixo ? (
                                <Badge variant="destructive">Estoque Baixo</Badge>
                              ) : estoqueAlerta ? (
                                <Badge className="bg-warning/10 text-warning">Reposição Próxima</Badge>
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
            </TabsContent>

            <TabsContent value="entregas" className="mt-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">Últimas Entregas de EPI</h3>
                  <span className="text-xs text-muted-foreground">Exibindo até 40 registros mais recentes</span>
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
                    {entregasFiltradas.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma entrega encontrada</td></tr>
                    ) : (
                      entregasFiltradas.slice(0, 40).map((ent) => {
                        const epiNome = episLista.find((item) => item.id === ent.epi_id)?.nome || ent.epi_id.slice(0, 8);
                        return (
                          <tr key={ent.id}>
                            <td className="font-medium">{epiNome}</td>
                            <td>{ent.colaborador_nome}</td>
                            <td className="font-mono">{ent.quantidade}</td>
                            <td>{new Date(ent.data_entrega).toLocaleDateString('pt-BR')}</td>
                            <td className="max-w-[220px] truncate">{ent.motivo || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="movimentacoes" className="mt-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <h3 className="font-semibold">Movimentações de Estoque (Entrada, Saída e Ajuste)</h3>
                </div>
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>EPI</th>
                      <th>Tipo</th>
                      <th>Qtd</th>
                      <th>Saldo Antes</th>
                      <th>Saldo Depois</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoesFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</td></tr>
                    ) : (
                      movimentacoesFiltradas.slice(0, 50).map((mov) => {
                        const epiNome = episLista.find((item) => item.id === mov.epi_id)?.nome || mov.epi_id.slice(0, 8);
                        return (
                          <tr key={mov.id}>
                            <td>{new Date(mov.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="font-medium">{epiNome}</td>
                            <td>
                              <Badge variant="outline" className="gap-1">
                                {mov.tipo === 'ENTRADA' ? (
                                  <ArrowDown className="h-3 w-3 text-success" />
                                ) : mov.tipo === 'SAIDA' ? (
                                  <ArrowUp className="h-3 w-3 text-destructive" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 text-warning" />
                                )}
                                {mov.tipo}
                              </Badge>
                            </td>
                            <td className="font-mono">{mov.quantidade}</td>
                            <td className="font-mono">{mov.saldo_antes}</td>
                            <td className="font-mono font-bold">{mov.saldo_depois}</td>
                            <td className="max-w-[260px] truncate">{mov.motivo || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── SUBTAB COLABORADORES ──────────────────── */}
            <TabsContent value="colaboradores" className="mt-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <h3 className="font-semibold">Cadastro de Colaboradores</h3>
                    <Badge variant="secondary">{colaboradoresLista.length}</Badge>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingColaborador(null); setColaboradorForm({ nome: '', funcao: '', setor: '', matricula: '', data_admissao: '', status: 'ATIVO' }); setIsColaboradorModalOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" />Novo Colaborador
                  </Button>
                </div>
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Função</th>
                      <th>Setor</th>
                      <th>Matrícula</th>
                      <th>Admissão</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingColaboradores ? (
                      <tr><td colSpan={7} className="py-8"><Skeleton className="h-6 w-48 mx-auto" /></td></tr>
                    ) : colaboradoresLista.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum colaborador cadastrado. Use o botão acima para cadastrar.</td></tr>
                    ) : (
                      colaboradoresLista
                        .filter(c => {
                          if (!search) return true;
                          const s = search.trim().toLowerCase();
                          return c.nome.toLowerCase().includes(s)
                            || (c.funcao || '').toLowerCase().includes(s)
                            || (c.setor || '').toLowerCase().includes(s)
                            || (c.matricula || '').toLowerCase().includes(s);
                        })
                        .map((c) => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.nome}</td>
                          <td>{c.funcao || '—'}</td>
                          <td>{c.setor || '—'}</td>
                          <td className="font-mono">{c.matricula || '—'}</td>
                          <td>{c.data_admissao ? new Date(c.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td>
                            <Badge variant={c.status === 'ATIVO' ? 'default' : c.status === 'AFASTADO' ? 'secondary' : 'destructive'}>
                              {STATUS_COLABORADOR_LABELS[c.status]}
                            </Badge>
                          </td>
                          <td className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleEditColaborador(c)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover" onClick={() => deleteColaborador.mutate(c.id)} disabled={deleteColaborador.isPending}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── SUBTAB DOCUMENTOS EPI ─────────────────── */}
            <TabsContent value="documentos" className="mt-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <h3 className="font-semibold">Fichas de EPI por Colaborador</h3>
                    </div>
                    {colaboradoresAtivos.length > 0 && (() => {
                      const nomesComEntrega = new Set(entregasLista.map(e => e.colaborador_nome.toLowerCase()));
                      const comEPI = colaboradoresAtivos.filter(c => nomesComEntrega.has(c.nome.toLowerCase())).length;
                      const semEPI = colaboradoresAtivos.length - comEPI;
                      return (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge className="bg-success/10 text-success">{comEPI} documentados</Badge>
                          {semEPI > 0 && <Badge variant="destructive">{semEPI} pendentes</Badge>}
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione um colaborador para gerar e imprimir sua Ficha de Controle e Responsabilidade de EPI (NR-06).
                    A ficha é gerada em A4 com todas as entregas registradas e espaço para assinatura.
                  </p>
                </div>
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Função</th>
                      <th>Setor</th>
                      <th>Matrícula</th>
                      <th>Status</th>
                      <th>Entregas</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Listar colaboradores com entregas (do cadastro + nomes avulsos)
                      const colabMap = new Map<string, { nome: string; funcao: string; setor: string; matricula: string; totalEntregas: number; fromCadastro: boolean }>();
                      // Primeiro: colaboradores do cadastro (incluindo os SEM entrega)
                      colaboradoresLista.filter(c => c.status === 'ATIVO').forEach(c => {
                        const entregasCol = entregasLista.filter(e => e.colaborador_nome === c.nome);
                        colabMap.set(c.nome.toLowerCase(), {
                          nome: c.nome,
                          funcao: c.funcao || '',
                          setor: c.setor || '',
                          matricula: c.matricula || '',
                          totalEntregas: entregasCol.length,
                          fromCadastro: true,
                        });
                      });
                      // Segundo: nomes avulsos que não estão no cadastro
                      entregasLista.forEach(e => {
                        const key = e.colaborador_nome.toLowerCase();
                        if (!colabMap.has(key)) {
                          colabMap.set(key, {
                            nome: e.colaborador_nome,
                            funcao: '',
                            setor: '',
                            matricula: '',
                            totalEntregas: entregasLista.filter(x => x.colaborador_nome === e.colaborador_nome).length,
                            fromCadastro: false,
                          });
                        }
                      });

                      const lista = Array.from(colabMap.values())
                        .filter(c => {
                          if (!search) return true;
                          const s = search.trim().toLowerCase();
                          return c.nome.toLowerCase().includes(s) || c.funcao.toLowerCase().includes(s) || c.setor.toLowerCase().includes(s);
                        })
                        .sort((a, b) => {
                          // Pendentes primeiro, depois por nome
                          if (a.totalEntregas === 0 && b.totalEntregas > 0) return -1;
                          if (a.totalEntregas > 0 && b.totalEntregas === 0) return 1;
                          return a.nome.localeCompare(b.nome, 'pt-BR');
                        });

                      if (lista.length === 0) {
                        return (
                          <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado. Cadastre colaboradores na aba "Colaboradores".</td></tr>
                        );
                      }

                      return lista.map((c) => (
                        <tr key={c.nome}>
                          <td className="font-medium">
                            {c.nome}
                            {!c.fromCadastro && <span className="text-[10px] text-muted-foreground ml-1">(avulso)</span>}
                          </td>
                          <td>{c.funcao || '—'}</td>
                          <td>{c.setor || '—'}</td>
                          <td className="font-mono">{c.matricula || '—'}</td>
                          <td>
                            {c.totalEntregas > 0 ? (
                              <Badge className="bg-success/10 text-success">Documentado</Badge>
                            ) : (
                              <Badge variant="destructive">Pendente</Badge>
                            )}
                          </td>
                          <td>
                            <Badge variant={c.totalEntregas > 0 ? 'default' : 'secondary'}>
                              {c.totalEntregas} {c.totalEntregas === 1 ? 'entrega' : 'entregas'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-7"
                              disabled={c.totalEntregas === 0}
                              onClick={() => {
                                setFichaEPIColaborador(c.nome);
                                setIsFichaEPIPrintOpen(true);
                                setTimeout(() => {
                                  handlePrintFichaEPI();
                                  setIsFichaEPIPrintOpen(false);
                                }, 300);
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Imprimir Ficha
                            </Button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
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
                  <th>Documentos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fichas?.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma FISPQ cadastrada</td></tr>
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
                      <td>
                        <FISPQDocumentos
                          fichaId={ficha.id}
                          arquivoUrl={(ficha as any).arquivo_url || null}
                          documentosAnexos={((ficha as any).documentos_anexos as DocumentoAnexo[]) || []}
                          onSalvar={handleFichaDocumentoSalvo}
                        />
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setFichaParaImprimir(ficha);
                            setTimeout(() => handlePrintFISPQ(), 200);
                          }}
                          title="Imprimir FISPQ"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="apr" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Atividade</th>
                  <th>Local/Setor</th>
                  <th>Perigo</th>
                  <th>Risco</th>
                  <th>Prob.</th>
                  <th>Sev.</th>
                  <th>Grau</th>
                  <th>Classificação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(aprs?.length ?? 0) === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma APR cadastrada</td></tr>
                ) : (
                  aprs?.filter((apr) => {
                    if (!search) return true;
                    const s = search.toLowerCase();
                    return apr.atividade.toLowerCase().includes(s) || apr.perigo.toLowerCase().includes(s) || apr.risco.toLowerCase().includes(s);
                  }).map((apr) => (
                    <tr key={apr.id}>
                      <td className="font-medium max-w-[180px] truncate">{apr.atividade}</td>
                      <td>{apr.local_setor || '—'}</td>
                      <td className="max-w-[180px] truncate">{apr.perigo}</td>
                      <td className="max-w-[180px] truncate">{apr.risco}</td>
                      <td className="font-mono">{apr.probabilidade}</td>
                      <td className="font-mono">{apr.severidade}</td>
                      <td className="font-mono font-bold">{apr.grau_risco}</td>
                      <td><Badge variant="outline">{CLASSIFICACAO_LABELS[apr.classificacao] || apr.classificacao}</Badge></td>
                      <td><Badge className={getStatusBadge(apr.status)}>{apr.status}</Badge></td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteAPR.mutate(apr.id)}
                          disabled={deleteAPR.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
              {colaboradoresAtivos.length > 0 ? (
                <Select value={entregaForm.colaborador_id} onValueChange={(v) => {
                  if (v === '__manual__') {
                    setEntregaForm({...entregaForm, colaborador_id: '', colaborador_nome: ''});
                  } else {
                    const col = colaboradoresLista.find(c => c.id === v);
                    setEntregaForm({...entregaForm, colaborador_id: v, colaborador_nome: col?.nome || ''});
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                  <SelectContent>
                    {colaboradoresAtivos.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}{c.funcao ? ` — ${c.funcao}` : ''}{c.matricula ? ` (${c.matricula})` : ''}</SelectItem>
                    ))}
                    <SelectItem value="__manual__">✏️ Digitar manualmente</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(colaboradoresAtivos.length === 0 || entregaForm.colaborador_id === '') && !entregaForm.colaborador_id && (
                <Input value={entregaForm.colaborador_nome} onChange={(e) => setEntregaForm({...entregaForm, colaborador_nome: e.target.value})} required={!entregaForm.colaborador_id} placeholder="Nome completo do colaborador" />
              )}
              {colaboradoresAtivos.length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre colaboradores na aba "Colaboradores" para usar a seleção rápida.</p>
              )}
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

      {/* Colaborador SSMA Modal */}
      <Dialog open={isColaboradorModalOpen} onOpenChange={(open) => { setIsColaboradorModalOpen(open); if (!open) setEditingColaborador(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitColaborador} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={colaboradorForm.nome} onChange={(e) => setColaboradorForm({...colaboradorForm, nome: e.target.value})} required placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Função / Cargo</Label>
                <Input value={colaboradorForm.funcao} onChange={(e) => setColaboradorForm({...colaboradorForm, funcao: e.target.value})} placeholder="Ex: Mecânico Industrial" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={colaboradorForm.setor} onChange={(e) => setColaboradorForm({...colaboradorForm, setor: e.target.value})} placeholder="Ex: Manutenção" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={colaboradorForm.matricula} onChange={(e) => setColaboradorForm({...colaboradorForm, matricula: e.target.value})} placeholder="Ex: MAT-0001" />
              </div>
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={colaboradorForm.data_admissao} onChange={(e) => setColaboradorForm({...colaboradorForm, data_admissao: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={colaboradorForm.status} onValueChange={(v) => setColaboradorForm({...colaboradorForm, status: v as StatusColaborador})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="AFASTADO">Afastado</SelectItem>
                  <SelectItem value="DESLIGADO">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createColaborador.isPending || updateColaborador.isPending}>
                {editingColaborador ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setIsColaboradorModalOpen(false); setEditingColaborador(null); }}>Cancelar</Button>
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

      <Dialog open={isMovimentacaoEPIModalOpen} onOpenChange={setIsMovimentacaoEPIModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Movimentação de Estoque de EPI</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitMovimentacaoEPI} className="space-y-4">
            <div className="space-y-2">
              <Label>EPI *</Label>
              <Select value={movimentacaoEPIForm.epi_id} onValueChange={(v) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, epi_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
                <SelectContent>
                  {epis?.filter(e => e.ativo).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome} (Estoque: {e.estoque_atual})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movimentacaoEPIForm.tipo} onValueChange={(v: TipoMovimentacaoEPI) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">ENTRADA</SelectItem>
                    <SelectItem value="SAIDA">SAIDA</SelectItem>
                    <SelectItem value="DEVOLUCAO">DEVOLUCAO</SelectItem>
                    <SelectItem value="AJUSTE">AJUSTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{movimentacaoEPIForm.tipo === 'AJUSTE' ? 'Novo Saldo' : 'Quantidade'}</Label>
                <Input
                  type="number"
                  min={movimentacaoEPIForm.tipo === 'AJUSTE' ? 0 : 1}
                  value={movimentacaoEPIForm.quantidade}
                  onChange={(e) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, quantidade: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Documento Ref.</Label>
              <Input value={movimentacaoEPIForm.documento_ref} onChange={(e) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, documento_ref: e.target.value })} placeholder="Ex: NF 12345" />
            </div>
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Input value={movimentacaoEPIForm.colaborador_nome} onChange={(e) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, colaborador_nome: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={movimentacaoEPIForm.motivo} onChange={(e) => setMovimentacaoEPIForm({ ...movimentacaoEPIForm, motivo: e.target.value })} placeholder="Ex: Compra, ajuste de inventário" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createMovimentacaoEPI.isPending}>Registrar Movimentação</Button>
              <Button type="button" variant="outline" onClick={() => setIsMovimentacaoEPIModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAPRModalOpen} onOpenChange={setIsAPRModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova APR - Análise Preliminar de Risco</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitAPR} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Atividade *</Label>
                <Input value={aprForm.atividade} onChange={(e) => setAPRForm({ ...aprForm, atividade: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Local/Setor</Label>
                <Input value={aprForm.local_setor} onChange={(e) => setAPRForm({ ...aprForm, local_setor: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={aprForm.responsavel} onChange={(e) => setAPRForm({ ...aprForm, responsavel: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={aprForm.data_analise} onChange={(e) => setAPRForm({ ...aprForm, data_analise: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Perigo *</Label>
                <Textarea value={aprForm.perigo} onChange={(e) => setAPRForm({ ...aprForm, perigo: e.target.value })} rows={2} required />
              </div>
              <div className="space-y-2">
                <Label>Risco *</Label>
                <Textarea value={aprForm.risco} onChange={(e) => setAPRForm({ ...aprForm, risco: e.target.value })} rows={2} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Probabilidade (1-5)</Label>
                <Input type="number" min={1} max={5} value={aprForm.probabilidade} onChange={(e) => setAPRForm({ ...aprForm, probabilidade: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>Severidade (1-5)</Label>
                <Input type="number" min={1} max={5} value={aprForm.severidade} onChange={(e) => setAPRForm({ ...aprForm, severidade: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medidas de Controle</Label>
              <Textarea value={aprForm.medidas_controle} onChange={(e) => setAPRForm({ ...aprForm, medidas_controle: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável pela Ação</Label>
                <Input value={aprForm.responsavel_acao} onChange={(e) => setAPRForm({ ...aprForm, responsavel_acao: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Prazo da Ação</Label>
                <Input type="date" value={aprForm.prazo_acao} onChange={(e) => setAPRForm({ ...aprForm, prazo_acao: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={aprForm.observacoes} onChange={(e) => setAPRForm({ ...aprForm, observacoes: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={createAPR.isPending}>Registrar APR</Button>
              <Button type="button" variant="outline" onClick={() => setIsAPRModalOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="hidden">
        {fichaParaImprimir && (
          <FISPQPrintTemplate ref={fispqPrintRef} ficha={fichaParaImprimir} empresa={empresa} />
        )}
        {isFichaEPIPrintOpen && entregasEPI && (() => {
          const colCadastro = colaboradoresLista.find(c => c.nome === fichaEPIColaborador);
          const entregasComEPI = entregasEPI
            .filter((e) => e.colaborador_nome === fichaEPIColaborador)
            .map(e => ({ ...e, epi: episLista.find(ep => ep.id === e.epi_id) }));
          return (
            <FichaEPIPrintTemplate
              ref={fichaEPIPrintRef}
              colaboradorNome={fichaEPIColaborador}
              colaboradorFuncao={colCadastro?.funcao || ''}
              colaboradorSetor={colCadastro?.setor || ''}
              colaboradorMatricula={colCadastro?.matricula || ''}
              entregas={entregasComEPI}
              empresa={empresa}
              primeiraEntrega
            />
          );
        })()}
      </div>
    </div>
  );
}
