import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Loader2, History, Sparkles, RefreshCw, CalendarDays, Trash2 } from 'lucide-react';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAIAnalysisHistory, useGenerateAnalysis, useDeleteAnalysis } from './useRootCauseAI';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import type { AnalysisResponse } from './types';

export default function RootCauseAIPage() {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<AnalysisResponse | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data: equipamentos } = useEquipamentos();
  const { data: history, isLoading: historyLoading } = useAIAnalysisHistory(selectedTag || undefined);
  const generateMutation = useGenerateAnalysis();
  const deleteMutation = useDeleteAnalysis();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          Inteligência de Causa Raiz (IA)
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise inteligente de padrões de falha e causa raiz baseada no histórico de O.S.
        </p>
      </div>

      {/* Controls */}
      <Card>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Resultado da Análise</h2>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending} className="gap-2">
              <RefreshCw className="h-3 w-3" /> Regenerar
            </Button>
          </div>
          <AnalysisResultCard
            summary={currentResult.analysis.summary}
            possibleCauses={currentResult.analysis.possible_causes}
            mainHypothesis={currentResult.analysis.main_hypothesis}
            preventiveActions={currentResult.analysis.preventive_actions}
            criticality={currentResult.analysis.criticality}
            confidenceScore={currentResult.analysis.confidence_score}
            osCount={currentResult.os_count}
            mtbfDays={currentResult.mtbf_days}
            generatedAt={currentResult.analysis.generated_at}
          />
        </div>
      )}

      {/* History */}
      {selectedTag && (
        <>
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
                        preventive_actions: (item.preventive_actions as string[]) || [],
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
        </>
      )}
    </div>
  );
}
