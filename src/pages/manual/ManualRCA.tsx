import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockFormField } from "@/components/manual/ScreenMockup";

export default function ManualRCA() {
  return (
    <ManualSection id="rca" number="14" title="Análise de Causa Raiz (RCA)">
      <ObjectiveBox>
        Eliminar causa raiz de falhas recorrentes para evitar reincidência.
      </ObjectiveBox>

      <ScreenMockup title="RCA — Investigação de Causa Raiz">
        <div className="flex">
          <MockSidebar activeItem="RCA" items={["FMEA/RCM", "RCA", "Inteligência IA", "Melhorias"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">RCA — OS-0085 / BOM-001</h3>
            <div className="space-y-3">
              <MockFormField label="Problema" type="textarea" value="Falha recorrente no rolamento da bomba centrífuga BOM-001. Terceira troca em 6 meses." required />
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">5 Porquês</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">1.</span> Por que o rolamento falhou? → Desgaste prematuro.</p>
                  <p><span className="font-medium text-foreground">2.</span> Por que houve desgaste prematuro? → Lubrificação inadequada.</p>
                  <p><span className="font-medium text-foreground">3.</span> Por que a lubrificação foi inadequada? → Frequência insuficiente.</p>
                  <p><span className="font-medium text-foreground">4.</span> Por que a frequência era insuficiente? → Plano baseado em recomendação genérica.</p>
                  <p><span className="font-medium text-foreground">5.</span> Por que se usou recomendação genérica? → Falta de análise de condição operacional.</p>
                </div>
              </div>
              <MockFormField label="Causa Raiz Identificada" type="textarea" value="Frequência de lubrificação definida sem considerar condição operacional severa (alta temperatura e carga)." />
              <MockFormField label="Ação Corretiva" type="textarea" value="Ajustar plano de lubrificação para frequência semanal com graxa de alta temperatura. Incluir monitoramento preditivo de temperatura." />
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Definir o problema com dados e contexto.",
          "Investigar causa raiz usando metodologia (5 Porquês, Ishikawa, etc.).",
          "Documentar cada nível de investigação.",
          "Definir ação corretiva com dono e prazo.",
          "Validar eficácia da ação no período seguinte.",
        ]}
      />

      <HighlightBox variant="tip" title="Boa Prática">
        Toda falha com 2+ ocorrências no mesmo equipamento em 6 meses deve obrigatoriamente passar por RCA.
      </HighlightBox>
    </ManualSection>
  );
}
