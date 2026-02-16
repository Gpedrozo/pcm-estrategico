import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Loader2, History, Sparkles, RefreshCw } from 'lucide-react';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useAIAnalysisHistory, useGenerateAnalysis } from './useRootCauseAI';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import type { AnalysisResponse } from './types';

export default function RootCauseAIPage() {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<AnalysisResponse | null>(null);

  const { data: equipamentos } = useEquipamentos();
  const { data: history, isLoading: historyLoading } = useAIAnalysisHistory(selectedTag || undefined);
  const generateMutation = useGenerateAnalysis();

  const handleGenerate = async () => {
    if (!selectedTag) return;
    const result = await generateMutation.mutateAsync(selectedTag);
    setCurrentResult(result);
  };

  const osCountForTag = equipamentos?.find(e => e.tag === selectedTag) ? '—' : '—';

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
            Escolha uma TAG para analisar o histórico de manutenção com IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
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
                      os_count: 0,
                      mtbf_days: 0,
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
