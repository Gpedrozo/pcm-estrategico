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
import { useAIAnalysisHistory, useGenerateAnalysis, useDeleteAnalysis } from './useRootCauseAI';
import { useCreateOrdemServico } from '@/hooks/useOrdensServico';
import { useCreateMelhoria } from '@/hooks/useMelhorias';
import { useCreatePlanoPreventivo } from '@/hooks/usePlanosPreventivos';
import { useNextDocumentNumber } from '@/hooks/useDocumentEngine';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import { PrintableReport } from './components/PrintableReport';
import type { AnalysisResponse } from './types';

export default function RootCauseAIPage() {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<AnalysisResponse | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: equipamentos } = useEquipamentos();
  const { data: history, isLoading: historyLoading } = useAIAnalysisHistory(selectedTag || undefined);
  const generateMutation = useGenerateAnalysis();
  const deleteMutation = useDeleteAnalysis();
  const createOSMutation = useCreateOrdemServico();
  const createMelhoriaMutation = useCreateMelhoria();
  const createPlanoPreventivoMutation = useCreatePlanoPreventivo();
  const nextDocNumber = useNextDocumentNumber();

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

    const equipamento = equipamentos?.find((item) => item.tag === selectedTag);
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

    const equipamento = equipamentos?.find((item) => item.tag === selectedTag);
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

    const suggestion = currentResult.analysis.preventive_plan_suggestion;
    if (!suggestion?.should_create_plan) {
      toast({
        title: 'Dados insuficientes para plano automático',
        description: 'A IA ainda não identificou recorrência forte para criar plano preventivo automaticamente.',
      });
      return;
    }

    const equipamento = equipamentos?.find((item) => item.tag === selectedTag);
    const codigo = await nextDocNumber.mutateAsync('PREVENTIVA');
    const freq = Math.max(7, Math.min(365, Number(suggestion.suggested_frequency_days ?? Math.floor((currentResult.mtbf_days ?? 45) * 0.7))));

    const instrucoesGeradas = [
      `Origem: Inteligência IA para TAG ${selectedTag}.`,
      `Componente recorrente: ${suggestion.recurring_component || 'N/A'}.`,
      `Motivo estratégico: ${suggestion.strategic_reason || 'Reduzir recorrência de falha.'}`,
      currentResult.analysis.recommended_solution ? `Solução corretiva base: ${currentResult.analysis.recommended_solution}` : null,
      currentResult.analysis.preventive_actions?.length ? `Ações preventivas:\n- ${currentResult.analysis.preventive_actions.join('\n- ')}` : null,
      suggestion.stock_recommendations?.length ? `Recomendação de estoque:\n- ${suggestion.stock_recommendations.join('\n- ')}` : null,
    ].filter(Boolean).join('\n\n');

    await createPlanoPreventivoMutation.mutateAsync({
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

    toast({
      title: 'Plano preventivo criado',
      description: 'A recomendação estratégica da IA foi convertida em plano preventivo.',
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
              preventivePlanSuggestion={currentResult.analysis.preventive_plan_suggestion}
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
                        preventive_plan_suggestion: item.raw_response?.analysis?.preventive_plan_suggestion || item.raw_response?.structured_analysis?.preventive_plan_suggestion || undefined,
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
