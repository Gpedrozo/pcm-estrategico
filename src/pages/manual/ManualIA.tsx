import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualIA() {
  return (
    <ManualSection id="inteligencia-ia" number="15" title="Inteligência Artificial">
      <ObjectiveBox>
        Apoiar diagnóstico técnico e priorização de investigações com análise assistida por IA.
      </ObjectiveBox>

      <ScreenMockup title="IA — Diagnóstico Assistido">
        <div className="flex">
          <MockSidebar activeItem="Inteligência IA" items={["FMEA/RCM", "RCA", "Inteligência IA", "Melhorias"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Análise de IA — BOM-001</h3>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">IA</span>
                </div>
                <p className="text-sm font-semibold text-foreground">Diagnóstico Gerado</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p><strong>Padrão identificado:</strong> 3 falhas em rolamento nos últimos 6 meses com intervalo decrescente (90 → 60 → 45 dias).</p>
                <p><strong>Possíveis causas:</strong></p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>Lubrificação insuficiente para condição operacional (85% de probabilidade)</li>
                  <li>Desalinhamento progressivo do acoplamento (62%)</li>
                  <li>Rolamento de especificação inadequada para carga (41%)</li>
                </ul>
                <p><strong>Recomendação:</strong> Priorizar análise de vibração + revisão do plano de lubrificação.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <MockButton>Converter em RCA</MockButton>
              <MockButton variant="outline">Gerar O.S Preventiva</MockButton>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Selecionar o contexto do problema (TAG, histórico de falhas).",
          "Rodar análise assistida por IA.",
          "Revisar recomendações e probabilidades.",
          "Converter em plano de ação técnico (RCA, O.S, melhoria).",
        ]}
      />

      <HighlightBox variant="info">
        A IA é uma ferramenta de apoio. Todas as recomendações devem ser validadas por profissional técnico antes de virar ação.
      </HighlightBox>
    </ManualSection>
  );
}
