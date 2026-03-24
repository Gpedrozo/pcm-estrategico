import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualFMEA() {
  return (
    <ManualSection id="fmea-rcm" number="13" title="FMEA / RCM">
      <ObjectiveBox>
        Mapear modos de falha e reforçar estratégia de manutenção centrada em confiabilidade.
      </ObjectiveBox>

      <ScreenMockup title="Análise FMEA — Matriz de Risco">
        <div className="flex">
          <MockSidebar activeItem="FMEA/RCM" items={["FMEA/RCM", "RCA", "Inteligência IA", "Melhorias"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">FMEA — BOM-001 Bomba Centrífuga</h3>
            <MockTable
              headers={["Modo de Falha", "Severidade", "Ocorrência", "Detecção", "RPN", "Ação"]}
              rows={[
                ["Falha no rolamento", "8", "6", "4", "192", "Troca preventiva"],
                ["Desalinhamento", "6", "5", "3", "90", "Alinhamento a laser"],
                ["Cavitação", "9", "3", "5", "135", "Ajuste de NPSH"],
                ["Vazamento no selo", "7", "4", "6", "168", "Inspeção quinzenal"],
              ]}
              highlightRow={0}
            />
            <div className="text-xs text-muted-foreground">
              RPN = Severidade × Ocorrência × Detecção — Priorizar ações onde RPN &gt; 100
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Definir ativo ou processo alvo da análise.",
          "Identificar modos de falha possíveis.",
          "Avaliar Severidade (1-10), Ocorrência (1-10) e Detecção (1-10).",
          "Calcular RPN (Risk Priority Number).",
          "Priorizar ações preventivas para RPNs mais altos.",
        ]}
      />

      <HighlightBox variant="info" title="Referência">
        O RPN deve ser reavaliado após implementação das ações. O objetivo é reduzir sistematicamente o risco de falhas críticas.
      </HighlightBox>
    </ManualSection>
  );
}
