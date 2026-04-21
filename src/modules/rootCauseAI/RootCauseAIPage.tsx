import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Loader2, History, Sparkles, RefreshCw, CalendarDays, Trash2, Printer, Wrench, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAllComponentes, type ComponenteEquipamento } from '@/hooks/useComponentesEquipamento';
import { useAIAnalysisHistory, useGenerateAnalysis, useDeleteAnalysis } from './useRootCauseAI';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useCreateMelhoria } from '@/hooks/useMelhorias';
import { useCreatePlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useCreateAtividade, useCreateServico } from '@/hooks/useAtividadesPreventivas';
import { useCreatePlanoLubrificacao } from '@/hooks/useLubrificacao';
import { useCreatePontoPlano } from '@/hooks/usePontosPlano';
import { useUpsertMaintenanceSchedule } from '@/hooks/useMaintenanceSchedule';
import { useNextDocumentNumber } from '@/hooks/useDocumentEngine';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import { PrintableReport } from './components/PrintableReport';
import type { AnalysisResponse, PreventivePlanSuggestion } from './types';

interface RootCauseOSContextRow {
  id: string;
  numero_os: number | null;
  problema: string;
  descricao_execucao: string | null;
  causa_raiz: string | null;
  acao_corretiva: string | null;
  modo_falha: string | null;
  prioridade: string;
  status: string;
  tipo: string;
  data_solicitacao: string;
}

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const safeText = (value: unknown) => String(value ?? '').trim();

const buildEvidenceLines = (rows: RootCauseOSContextRow[]) =>
  rows
    .slice(0, 20)
    .map((os, index) => {
      const numero = os.numero_os ? `OS ${os.numero_os}` : `OS ${index + 1}`;
      const problema = safeText(os.problema) || 'Sem problema informado';
      const resolucao = safeText(os.descricao_execucao || os.acao_corretiva || os.causa_raiz) || 'Sem resolução registrada';
      return `${numero} | Problema: ${problema} | Resolução: ${resolucao}`;
    });

const resolveBestComponent = (
  componentes: ComponenteEquipamento[],
  evidenceTexts: string[],
) => {
  if (!componentes || componentes.length === 0) return null;
  const corpus = normalizeSearchText(evidenceTexts.join(' | '));

  const scored = componentes.map((comp) => {
    const aliases = [comp.nome, comp.codigo, comp.tipo, comp.fabricante || '', comp.modelo || '']
      .map((item) => normalizeSearchText(safeText(item)))
      .filter((item) => item.length >= 3);

    const score = aliases.reduce((acc, alias) => {
      if (!alias) return acc;
      return corpus.includes(alias) ? acc + Math.max(2, alias.length / 5) : acc;
    }, 0);

    return { comp, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0 ? scored[0].comp : null;
};

const buildPreventiveChecklist = (componentName: string) => [
  { id: crypto.randomUUID(), descricao: `Inspecionar condição geral de ${componentName}`, obrigatorio: true, concluido: false },
  { id: crypto.randomUUID(), descricao: 'Verificar reaperto e alinhamento mecânico', obrigatorio: true, concluido: false },
  { id: crypto.randomUUID(), descricao: 'Registrar vibração, temperatura e ruído', obrigatorio: true, concluido: false },
  { id: crypto.randomUUID(), descricao: 'Comparar medições com limites de alerta e crítico', obrigatorio: true, concluido: false },
  { id: crypto.randomUUID(), descricao: 'Executar intervenção corretiva prevista se fora de padrão', obrigatorio: true, concluido: false },
  { id: crypto.randomUUID(), descricao: 'Registrar evidências e liberar ativo para operação', obrigatorio: true, concluido: false },
];

const normalizePlanSuggestion = (input: unknown, selectedTag: string): PreventivePlanSuggestion | undefined => {
  if (!input || typeof input !== 'object') return undefined;
  const source = input as Partial<PreventivePlanSuggestion>;
  const confidence = Number(source.confidence_to_create_plan ?? 0);
  const inferredShouldCreate = Boolean(source.should_create_plan) || confidence >= 60;

  return {
    should_create_plan: inferredShouldCreate,
    plan_name: source.plan_name || `Plano IA - ${selectedTag}`,
    trigger_type: source.trigger_type === 'CICLO' || source.trigger_type === 'CONDICAO' ? source.trigger_type : 'TEMPO',
    suggested_frequency_days: Number(source.suggested_frequency_days ?? null) || null,
    strategic_reason: source.strategic_reason || 'Recorrência detectada pela análise de IA.',
    recurring_component: source.recurring_component || 'Componente crítico',
    recurrence_interval_days: Number(source.recurrence_interval_days ?? null) || null,
    stock_recommendations: Array.isArray(source.stock_recommendations) ? source.stock_recommendations : [],
    expected_downtime_reduction_hours: Number(source.expected_downtime_reduction_hours ?? null) || null,
    confidence_to_create_plan: Number.isFinite(confidence) ? confidence : undefined,
    deterministic_triggered: Boolean(source.deterministic_triggered),
    source_evidence: Array.isArray(source.source_evidence) ? source.source_evidence : [],
  };
};

export default function RootCauseAIPage() {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<AnalysisResponse | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const { user, tenantId } = useAuth();
  const { toast } = useToast();

  const { data: equipamentos } = useEquipamentos();
  const selectedEquipment = equipamentos?.find((item) => item.tag === selectedTag) || null;
  const { data: allComponentes } = useAllComponentes(selectedEquipment?.id || undefined);
  const { data: history, isLoading: historyLoading } = useAIAnalysisHistory(selectedTag || undefined);
  const generateMutation = useGenerateAnalysis();
  const deleteMutation = useDeleteAnalysis();
  const createOSMutation = useCreateOrdemServico();
  const createMelhoriaMutation = useCreateMelhoria();
  const createPlanoPreventivoMutation = useCreatePlanoPreventivo();
  const createAtividadeMutation = useCreateAtividade();
  const createServicoMutation = useCreateServico();
  const createPlanoLubrificacaoMutation = useCreatePlanoLubrificacao();
  const createPontoPlanoMutation = useCreatePontoPlano();
  const upsertMaintenanceScheduleMutation = useUpsertMaintenanceSchedule();
  const nextDocNumber = useNextDocumentNumber();

  const normalizeComponentType = (raw: string | undefined | null): string => {
    if (!raw) return 'compressor';
    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (normalized.includes('compressor')) return 'compressor';
    if (normalized.includes('motor')) return 'motor';
    if (normalized.includes('bomba')) return 'bomba';
    if (normalized.includes('redutor')) return 'redutor';
    if (normalized.includes('rolamento')) return 'rolamento';
    return 'generico';
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta análise?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (currentResult?.analysis.id === id) setCurrentResult(null);
      },
    });
  };

  const handleGenerate = async () => {
    if (!selectedTag) return;
    const result = await generateMutation.mutateAsync({
      tag: selectedTag,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
    setCurrentResult(result);
  };

  const handleCreateCorrectiveOS = async () => {
    if (!selectedTag || !currentResult) return;

    const equipamento = selectedEquipment;
    if (!equipamento) {
      toast({
        title: 'Equipamento não encontrado',
        description: 'Não foi possível localizar o ativo para abrir a O.S.',
        variant: 'destructive',
      });
      return;
    }

    await createOSMutation.mutateAsync({
      tipo: 'CORRETIVA',
      prioridade: currentResult.analysis.criticality === 'Crítico' ? 'URGENTE' : 'ALTA',
      tag: selectedTag,
      equipamento: equipamento.nome,
      solicitante: user?.nome || 'Análise IA',
      problema: [
        `Abertura automática a partir de análise IA de causa raiz (${currentResult.analysis.criticality}).`,
        `Hipótese principal: ${currentResult.analysis.main_hypothesis}`,
        currentResult.analysis.recommended_solution ? `Solução recomendada: ${currentResult.analysis.recommended_solution}` : null,
      ].filter(Boolean).join('\n'),
      usuario_abertura: user?.id || null,
    });

    toast({
      title: 'O.S criada a partir da IA',
      description: 'A recomendação foi convertida em ordem de serviço corretiva.',
    });
  };

  const handleCreateMelhoria = async () => {
    if (!selectedTag || !currentResult) return;

    const equipamento = selectedEquipment;
    const improvements = currentResult.analysis.recommended_improvements || [];
    const suggestedTitle = improvements[0] || `Melhoria baseada em RCA - ${selectedTag}`;

    await createMelhoriaMutation.mutateAsync({
      titulo: suggestedTitle.slice(0, 120),
      descricao: [
        `Origem: Inteligência de Causa Raiz para TAG ${selectedTag}.`,
        `Hipótese principal: ${currentResult.analysis.main_hypothesis}`,
        currentResult.analysis.recommended_solution ? `Solução recomendada: ${currentResult.analysis.recommended_solution}` : null,
        improvements.length > 0 ? `Melhorias sugeridas:\n- ${improvements.join('\n- ')}` : null,
      ].filter(Boolean).join('\n\n'),
      tipo: 'KAIZEN',
      equipamento_id: equipamento?.id ?? null,
      tag: selectedTag,
      proponente_nome: user?.nome || 'Sistema IA',
      proponente_id: user?.id || null,
      beneficios: currentResult.analysis.summary || null,
    });

    toast({
      title: 'Melhoria registrada',
      description: 'A recomendação da IA foi convertida em iniciativa de melhoria.',
    });
  };

  const handleCreatePreventivePlan = async () => {
    if (!selectedTag || !currentResult) return;

    const suggestion = normalizePlanSuggestion(currentResult.analysis.preventive_plan_suggestion, selectedTag);
    if (!suggestion?.should_create_plan) {
      toast({
        title: 'Dados insuficientes para plano automático',
        description: 'A IA ainda não identificou recorrência forte para criar plano preventivo automaticamente.',
      });
      return;
    }

    const equipamento = selectedEquipment;
    const codigo = await nextDocNumber.mutateAsync('PREVENTIVA');
    const freq = Math.max(7, Math.min(365, Number(suggestion.suggested_frequency_days ?? Math.floor((currentResult.mtbf_days ?? 45) * 0.7))));

    const componente = suggestion.recurring_component || 'componente crítico';
    const instrucoesGeradas = [
      `Executar o checklist de atividades e sub-atividades deste plano para o componente ${componente}.`,
      'Registrar evidências e anomalias durante a execução.',
      currentResult.analysis.recommended_solution ? `Base técnica: ${currentResult.analysis.recommended_solution}` : null,
    ].filter(Boolean).join(' ');

    const planoCriado = await createPlanoPreventivoMutation.mutateAsync({
      codigo,
      nome: suggestion.plan_name || `Plano IA - ${selectedTag}`,
      descricao: `Plano sugerido por IA para reduzir falhas recorrentes do componente ${suggestion.recurring_component || 'crítico'}.`,
      equipamento_id: equipamento?.id ?? null,
      tag: selectedTag,
      tipo_gatilho: suggestion.trigger_type || 'TEMPO',
      frequencia_dias: suggestion.trigger_type === 'TEMPO' ? freq : null,
      tempo_estimado_min: 90,
      instrucoes: instrucoesGeradas,
    });

    let populadoPorTemplate = false;

    try {
      const { data, error } = await supabase.functions.invoke('montar-plano-da-template', {
        body: {
          plano_id: planoCriado.id,
          tipo_componente: normalizeComponentType(suggestion.recurring_component),
        },
      });

      if (!error) {
        const atividadesInseridas = Number((data as { atividadesInseridas?: number } | null)?.atividadesInseridas || 0);
        const servicosInseridos = Number((data as { servicosInseridos?: number } | null)?.servicosInseridos || 0);
        populadoPorTemplate = atividadesInseridas > 0 || servicosInseridos > 0;
      }
    } catch {
      populadoPorTemplate = false;
    }

    if (!populadoPorTemplate) {
      const preventiveActions = (currentResult.analysis.preventive_actions || []).filter(Boolean);
      const stockRecommendations = (suggestion.stock_recommendations || []).filter(Boolean);
      const fallbackActions = preventiveActions.length
        ? preventiveActions
        : [
            `Inspecionar condição geral do ${componente}`,
            `Validar parâmetros operacionais do ${componente}`,
            `Registrar resultado da inspeção e liberar equipamento`,
          ];

      const atividadeExecucao = await createAtividadeMutation.mutateAsync({
        plano_id: planoCriado.id,
        nome: 'Execução preventiva orientada por IA',
        ordem: 1,
      });

      for (let i = 0; i < fallbackActions.length; i += 1) {
        await createServicoMutation.mutateAsync({
          atividade_id: atividadeExecucao.id,
          descricao: fallbackActions[i],
          tempo_estimado_min: 15,
          ordem: i + 1,
          _plano_id: planoCriado.id,
        });
      }

      if (stockRecommendations.length > 0) {
        const atividadeMateriais = await createAtividadeMutation.mutateAsync({
          plano_id: planoCriado.id,
          nome: 'Preparação de materiais e sobressalentes',
          ordem: 2,
        });

        for (let i = 0; i < stockRecommendations.length; i += 1) {
          await createServicoMutation.mutateAsync({
            atividade_id: atividadeMateriais.id,
            descricao: stockRecommendations[i],
            tempo_estimado_min: 10,
            ordem: i + 1,
            _plano_id: planoCriado.id,
          });
        }
      }
    }

    toast({
      title: 'Plano preventivo criado',
      description: populadoPorTemplate
        ? 'Plano criado com atividades e sub-atividades preenchidas por template.'
        : 'Plano criado com atividades e sub-atividades estruturadas automaticamente.',
    });
  };

  const handleCreateStructuredPlanBundle = async () => {
    if (!selectedTag || !currentResult || !tenantId) return;
    if (!selectedEquipment) {
      toast({
        title: 'Equipamento não encontrado',
        description: 'Selecione um equipamento válido para estruturar os planos.',
        variant: 'destructive',
      });
      return;
    }

    let osQuery = supabase
      .from('ordens_servico')
      .select('id,numero_os,problema,descricao_execucao,causa_raiz,acao_corretiva,modo_falha,prioridade,status,tipo,data_solicitacao')
      .eq('empresa_id', tenantId)
      .eq('tag', selectedTag)
      .order('data_solicitacao', { ascending: false })
      .limit(120);

    if (dateFrom) osQuery = osQuery.gte('data_solicitacao', `${dateFrom}T00:00:00`);
    if (dateTo) osQuery = osQuery.lte('data_solicitacao', `${dateTo}T23:59:59`);

    const { data: osRowsRaw, error: osError } = await osQuery;
    if (osError) {
      toast({ title: 'Erro ao estruturar planos', description: osError.message, variant: 'destructive' });
      return;
    }

    const osRows = (osRowsRaw || []) as RootCauseOSContextRow[];
    const evidenceTexts = [
      currentResult.analysis.summary,
      currentResult.analysis.main_hypothesis,
      currentResult.analysis.recommended_solution || '',
      ...(currentResult.analysis.possible_causes || []),
      ...(currentResult.analysis.preventive_actions || []),
      ...osRows.flatMap((os) => [os.problema, os.descricao_execucao || '', os.causa_raiz || '', os.acao_corretiva || '', os.modo_falha || '']),
    ].filter(Boolean);

    const matchedComponent = resolveBestComponent(allComponentes || [], evidenceTexts);
    const componentLabel = matchedComponent?.nome || normalizePlanSuggestion(currentResult.analysis.preventive_plan_suggestion, selectedTag)?.recurring_component || 'Componente crítico';
    const evidenceLines = buildEvidenceLines(osRows);
    const strategicReason = normalizePlanSuggestion(currentResult.analysis.preventive_plan_suggestion, selectedTag)?.strategic_reason
      || currentResult.analysis.summary
      || 'Recorrência detectada na análise de O.S.';

    const failuresByProblem = new Map<string, number>();
    for (const row of osRows) {
      const key = normalizeSearchText(row.problema || '').slice(0, 120);
      if (!key) continue;
      failuresByProblem.set(key, (failuresByProblem.get(key) || 0) + 1);
    }
    const topPatterns = [...failuresByProblem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([problem, count]) => `Padrão recorrente (${count}x): ${problem}`);

    const preventiveCode = await nextDocNumber.mutateAsync('PREVENTIVA');
    const lubricationCode = await nextDocNumber.mutateAsync('LUBRIFICACAO');
    const inspectionCode = await nextDocNumber.mutateAsync('INSPECAO');
    const predictiveCode = await nextDocNumber.mutateAsync('PREDITIVA');

    const baseFreqDays = Math.max(7, Math.min(120, Math.round((currentResult.mtbf_days || 30) * 0.7)));
    const preventiveChecklist = buildPreventiveChecklist(componentLabel);
    const created: string[] = [];
    const failures: string[] = [];

    try {
      const preventive = await createPlanoPreventivoMutation.mutateAsync({
        codigo: preventiveCode,
        nome: `Plano IA Estruturado - ${selectedTag} - ${componentLabel}`.slice(0, 120),
        descricao: `Plano preventivo estruturado por IA para ${componentLabel}, baseado em histórico de falhas e resoluções de O.S.`,
        equipamento_id: selectedEquipment.id,
        tag: selectedTag,
        tipo_gatilho: 'TEMPO',
        frequencia_dias: baseFreqDays,
        tempo_estimado_min: 120,
        especialidade: matchedComponent?.tipo || 'MECANICA',
        checklist: preventiveChecklist,
        instrucoes: [
          `Contexto estratégico: ${strategicReason}`,
          `Componente-alvo na árvore estrutural: ${componentLabel}${matchedComponent?.codigo ? ` (${matchedComponent.codigo})` : ''}`,
          topPatterns.length ? `Padrões identificados:\n- ${topPatterns.join('\n- ')}` : null,
          evidenceLines.length ? `Evidências de O.S analisadas:\n- ${evidenceLines.join('\n- ')}` : null,
          `Ações obrigatórias:\n- Executar checklist técnico completo\n- Registrar medições e tendência\n- Validar critério de aceitação antes da liberação`,
        ].filter(Boolean).join('\n\n'),
      });
      created.push(`preventiva (${preventive.codigo})`);

      // Auto-popular plano com atividades e serviços a partir do template
      try {
        const componentType = (matchedComponent?.tipo || 'compressor').toLowerCase();
        const populateResp = await supabase.functions.invoke('montar-plano-da-template', {
          body: {
            plano_id: preventive.id,
            tipo_componente: componentType,
            empresa_id: tenantId,
          },
        });

        if (populateResp.data?.success) {
          console.log(`[RCA] Plano auto-populado: ${populateResp.data.stats?.atividadesInseridas || 0} atividades, ${populateResp.data.stats?.servicosInseridos || 0} serviços`);
        } else {
          console.warn(`[RCA] Auto-população parcial ou falhada:`, populateResp.data?.message);
        }
      } catch (populateErr) {
        console.warn(`[RCA] Erro ao chamar função de auto-população:`, populateErr instanceof Error ? populateErr.message : 'desconhecido');
        // Não falha o fluxo principal se a auto-população falhar
      }
    } catch (error) {
      failures.push(`preventiva: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    try {
      const lubrication = await createPlanoLubrificacaoMutation.mutateAsync({
        codigo: lubricationCode,
        nome: `Plano IA Lubrificação - ${selectedTag} - ${componentLabel}`.slice(0, 120),
        equipamento_id: selectedEquipment.id,
        descricao: `Plano de lubrificação orientado por IA para reduzir desgaste e atrito em ${componentLabel}.`,
        ponto_lubrificacao: componentLabel,
        lubrificante: 'Graxa EP2',
        periodicidade: Math.max(7, Math.min(45, Math.round(baseFreqDays * 0.5))),
        tipo_periodicidade: 'dias',
        tempo_estimado: 45,
        prioridade: currentResult.analysis.criticality === 'Crítico' ? 'critica' : 'alta',
        responsavel_nome: user?.nome || 'Equipe PCM',
        status: 'programado',
        ativo: true,
      });

      const basePoint = matchedComponent?.codigo || selectedTag;
      await createPontoPlanoMutation.mutateAsync({
        plano_id: lubrication.id,
        descricao: `Ponto principal de lubrificação em ${componentLabel}`,
        codigo_ponto: `${basePoint}-P1`.slice(0, 30),
        equipamento_tag: selectedTag,
        localizacao: selectedEquipment.localizacao || 'Linha principal',
        lubrificante: 'Graxa EP2',
        quantidade: '5 g',
        ferramenta: 'Pistola de graxa',
        tempo_estimado_min: 10,
        instrucoes: 'Limpar ponto, aplicar quantidade especificada e registrar condição visual.',
        requer_parada: false,
        ordem: 1,
      });

      await createPontoPlanoMutation.mutateAsync({
        plano_id: lubrication.id,
        descricao: `Ponto secundário de lubrificação em ${componentLabel}`,
        codigo_ponto: `${basePoint}-P2`.slice(0, 30),
        equipamento_tag: selectedTag,
        localizacao: selectedEquipment.localizacao || 'Linha principal',
        lubrificante: 'Graxa EP2',
        quantidade: '5 g',
        ferramenta: 'Pistola de graxa',
        tempo_estimado_min: 10,
        instrucoes: 'Verificar presença de contaminação e reaplicar conforme padrão.',
        requer_parada: false,
        ordem: 2,
      });

      created.push(`lubrificação (${lubrication.codigo})`);
    } catch (error) {
      failures.push(`lubrificação: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    const nextInspectionDate = new Date();
    nextInspectionDate.setDate(nextInspectionDate.getDate() + Math.max(3, Math.round(baseFreqDays * 0.35)));
    try {
      await upsertMaintenanceScheduleMutation.mutateAsync({
        tipo: 'inspecao',
        origemId: `ia-inspecao-${selectedEquipment.id}-${Date.now()}`,
        empresaId: tenantId,
        equipamentoId: selectedEquipment.id,
        titulo: `${inspectionCode} • Plano IA de Inspeção - ${selectedTag}`,
        descricao: [
          `Inspeção orientada por IA para ${componentLabel}.`,
          `Foco de inspeção: ${currentResult.analysis.main_hypothesis}.`,
          evidenceLines.length ? `Base O.S:\n- ${evidenceLines.slice(0, 8).join('\n- ')}` : null,
        ].filter(Boolean).join('\n\n'),
        dataProgramada: nextInspectionDate.toISOString(),
        status: 'programado',
        responsavel: user?.nome || 'Equipe PCM',
      });
      created.push(`inspeção (${inspectionCode})`);
    } catch (error) {
      failures.push(`inspeção: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    const nextPredictiveDate = new Date();
    nextPredictiveDate.setDate(nextPredictiveDate.getDate() + Math.max(2, Math.round(baseFreqDays * 0.25)));
    try {
      await upsertMaintenanceScheduleMutation.mutateAsync({
        tipo: 'preditiva',
        origemId: `ia-preditiva-${selectedEquipment.id}-${Date.now()}`,
        empresaId: tenantId,
        equipamentoId: selectedEquipment.id,
        titulo: `${predictiveCode} • Plano IA Preditivo - ${selectedTag}`,
        descricao: [
          `Plano preditivo orientado para ${componentLabel}.`,
          'Medições recomendadas: vibração, temperatura, corrente e ruído.',
          `Critério de escalonamento: abrir O.S corretiva se tendência exceder limite de alerta por 2 ciclos.`,
        ].join('\n\n'),
        dataProgramada: nextPredictiveDate.toISOString(),
        status: 'programado',
        responsavel: user?.nome || 'Equipe PCM',
      });
      created.push(`preditiva (${predictiveCode})`);
    } catch (error) {
      failures.push(`preditiva: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    if (created.length > 0 && failures.length === 0) {
      toast({
        title: 'Pacote de planos estruturado com sucesso',
        description: `Criados: ${created.join(', ')}.`,
      });
      return;
    }

    if (created.length > 0) {
      toast({
        title: 'Pacote criado com ressalvas',
        description: `Criados: ${created.join(', ')}. Falhas: ${failures.join(' | ')}`,
      });
      return;
    }

    toast({
      title: 'Falha ao criar pacote estruturado',
      description: failures.join(' | ') || 'Não foi possível criar os planos.',
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="screen-only">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          Inteligência de Causa Raiz (IA)
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise inteligente de padrões de falha e causa raiz baseada no histórico de O.S.
        </p>
      </div>

      {/* Controls */}
      <Card className="screen-only">
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Equipamento</CardTitle>
          <CardDescription>
            Escolha uma TAG e o período para analisar o histórico de manutenção com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Equipamento (TAG)</Label>
              <Select value={selectedTag} onValueChange={(val) => { setSelectedTag(val); setCurrentResult(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma TAG" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos?.filter(e => e.ativo).map(equip => (
                    <SelectItem key={equip.id} value={equip.tag}>
                      <span className="font-mono font-medium">{equip.tag}</span>
                      <span className="text-muted-foreground ml-2">— {equip.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium">Período da análise:</span>
            </div>
            <div className="flex-1">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground mb-1 block">Data Início</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground mb-1 block">Data Fim</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedTag || generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Análise Inteligente
                </>
              )}
            </Button>
          </div>
          {!dateFrom && !dateTo && (
            <p className="text-xs text-muted-foreground italic">Sem período definido: a IA analisará todo o histórico do equipamento.</p>
          )}
        </CardContent>
      </Card>

      {/* Current result */}
      {currentResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between screen-only">
            <h2 className="text-xl font-semibold">Resultado da Análise</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-3 w-3" /> Imprimir Relatório
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void handleCreateMelhoria()}
                disabled={createMelhoriaMutation.isPending}
              >
                {createMelhoriaMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                Criar Melhoria
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void handleCreateCorrectiveOS()}
                disabled={createOSMutation.isPending}
              >
                {createOSMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
                Abrir O.S
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void handleCreatePreventivePlan()}
                disabled={createPlanoPreventivoMutation.isPending || nextDocNumber.isPending}
              >
                {(createPlanoPreventivoMutation.isPending || nextDocNumber.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarDays className="h-3 w-3" />}
                Criar Plano Preventivo
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => void handleCreateStructuredPlanBundle()}
                disabled={
                  nextDocNumber.isPending
                  || createPlanoPreventivoMutation.isPending
                  || createPlanoLubrificacaoMutation.isPending
                  || createPontoPlanoMutation.isPending
                  || upsertMaintenanceScheduleMutation.isPending
                }
              >
                {(nextDocNumber.isPending
                  || createPlanoPreventivoMutation.isPending
                  || createPlanoLubrificacaoMutation.isPending
                  || createPontoPlanoMutation.isPending
                  || upsertMaintenanceScheduleMutation.isPending)
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Sparkles className="h-3 w-3" />}
                Gerar Pacote Estruturado IA
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending} className="gap-2">
                <RefreshCw className="h-3 w-3" /> Regenerar
              </Button>
            </div>
          </div>
          <div className="screen-only">
            <AnalysisResultCard
              summary={currentResult.analysis.summary}
              possibleCauses={currentResult.analysis.possible_causes}
              mainHypothesis={currentResult.analysis.main_hypothesis}
              recommendedSolution={currentResult.analysis.recommended_solution}
              preventiveActions={currentResult.analysis.preventive_actions}
              recommendedImprovements={currentResult.analysis.recommended_improvements}
              recurrenceInsights={currentResult.analysis.recurrence_insights}
              crossModuleFindings={currentResult.analysis.cross_module_findings}
              planningPriorityScore={currentResult.analysis.planning_priority_score}
              preventivePlanSuggestion={normalizePlanSuggestion(currentResult.analysis.preventive_plan_suggestion, selectedTag)}
              strategicDecisionSupport={currentResult.analysis.strategic_decision_support}
              criticality={currentResult.analysis.criticality}
              confidenceScore={currentResult.analysis.confidence_score}
              osCount={currentResult.os_count}
              mtbfDays={currentResult.mtbf_days}
              generatedAt={currentResult.analysis.generated_at}
            />
          </div>

          {/* Hidden print-only report */}
          <PrintableReport
            tag={selectedTag}
            equipamentoNome={equipamentos?.find(e => e.tag === selectedTag)?.nome}
            summary={currentResult.analysis.summary}
            possibleCauses={currentResult.analysis.possible_causes}
            mainHypothesis={currentResult.analysis.main_hypothesis}
            recommendedSolution={currentResult.analysis.recommended_solution}
            preventiveActions={currentResult.analysis.preventive_actions}
            recommendedImprovements={currentResult.analysis.recommended_improvements}
            criticality={currentResult.analysis.criticality}
            confidenceScore={currentResult.analysis.confidence_score}
            osCount={currentResult.os_count}
            mtbfDays={currentResult.mtbf_days}
            generatedAt={currentResult.analysis.generated_at}
            dateFrom={dateFrom || undefined}
            dateTo={dateTo || undefined}
          />
        </div>
      )}

      {/* History */}
      {selectedTag && (
        <div className="screen-only">
          <Separator />
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <History className="h-5 w-5" /> Histórico de Análises
            </h2>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCurrentResult({
                      analysis: {
                        id: item.id,
                        generated_at: item.generated_at,
                        summary: item.summary || '',
                        possible_causes: (item.possible_causes as string[]) || [],
                        main_hypothesis: item.main_hypothesis || '',
                        recommended_solution: item.recommended_solution || item.raw_response?.analysis?.recommended_solution || item.raw_response?.structured_analysis?.recommended_solution || '',
                        preventive_actions: (item.preventive_actions as string[]) || [],
                        recommended_improvements: (item.recommended_improvements as string[]) || item.raw_response?.analysis?.recommended_improvements || item.raw_response?.structured_analysis?.recommended_improvements || [],
                        recurrence_insights: item.raw_response?.analysis?.recurrence_insights || item.raw_response?.structured_analysis?.recurrence_insights || [],
                        cross_module_findings: item.raw_response?.analysis?.cross_module_findings || item.raw_response?.structured_analysis?.cross_module_findings || [],
                        planning_priority_score: item.raw_response?.analysis?.planning_priority_score || item.raw_response?.structured_analysis?.planning_priority_score || undefined,
                        preventive_plan_suggestion: normalizePlanSuggestion(item.raw_response?.analysis?.preventive_plan_suggestion || item.raw_response?.structured_analysis?.preventive_plan_suggestion, selectedTag),
                        strategic_decision_support: item.raw_response?.analysis?.strategic_decision_support || item.raw_response?.structured_analysis?.strategic_decision_support || undefined,
                        criticality: item.criticality || 'Médio',
                        confidence_score: item.confidence_score || 0,
                      },
                      os_count: item.os_count ?? null,
                      mtbf_days: item.mtbf_days ?? null,
                    })}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.main_hypothesis || 'Análise sem hipótese'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.generated_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.criticality || '—'}</Badge>
                        <span className="text-sm font-bold text-primary">{item.confidence_score || 0}%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma análise anterior encontrada para esta TAG.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
