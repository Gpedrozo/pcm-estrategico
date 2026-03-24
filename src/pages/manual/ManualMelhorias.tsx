import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualMelhorias() {
  return (
    <ManualSection id="melhorias" number="16" title="Melhorias">
      <ObjectiveBox>
        Registrar e acompanhar melhorias de confiabilidade e redução de custo.
      </ObjectiveBox>

      <ScreenMockup title="Melhorias — Acompanhamento">
        <div className="flex">
          <MockSidebar activeItem="Melhorias" items={["FMEA/RCM", "RCA", "Inteligência IA", "Melhorias"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Propostas de Melhoria</h3>
              <MockButton>+ Nova Proposta</MockButton>
            </div>
            <MockTable
              headers={["ID", "Descrição", "Ganho Esperado", "Responsável", "Prazo", "Status"]}
              rows={[
                ["MEL-012", "Upgrade selo mecânico BOM-001", "Redução 40% corretivas", "Carlos R.", "30/04/2026", "Em andamento"],
                ["MEL-011", "Sistema de alarme vibração", "Detecção antecipada", "Maria S.", "15/04/2026", "Aprovada"],
                ["MEL-010", "Melhoria na ventilação sala compressores", "Redução temperatura", "João P.", "01/03/2026", "Concluída"],
              ]}
            />
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Abrir proposta de melhoria com descrição técnica.",
          "Definir ganho esperado (confiabilidade, custo, segurança).",
          "Nomear responsável e prazo de implementação.",
          "Acompanhar status e validar resultado após implementação.",
        ]}
      />
    </ManualSection>
  );
}
