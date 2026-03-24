import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualLubrificacao() {
  return (
    <ManualSection id="lubrificacao" number="11" title="Lubrificação">
      <ObjectiveBox>
        Controlar planos de lubrificação com tipo de lubrificante, frequência e registro de execução.
      </ObjectiveBox>

      <ScreenMockup title="Lubrificação — Planos">
        <div className="flex">
          <MockSidebar activeItem="Lubrificação" items={["Preventiva", "Preditiva", "Lubrificação", "Inspeções"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Planos de Lubrificação</h3>
            <MockTable
              headers={["TAG", "Ponto", "Lubrificante", "Frequência", "Última Exec.", "Próxima"]}
              rows={[
                ["BOM-001", "Rolamento", "Graxa EP-2", "Semanal", "10/03/2026", "17/03/2026"],
                ["CMP-003", "Cilindro", "Óleo ISO 68", "Mensal", "01/03/2026", "01/04/2026"],
                ["MTR-012", "Mancal", "Graxa EP-2", "Quinzenal", "05/03/2026", "19/03/2026"],
                ["RED-005", "Engrenagem", "Óleo ISO 220", "Trimestral", "15/01/2026", "15/04/2026"],
              ]}
            />
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Lubrificação no menu lateral.",
          "Revisar planos cadastrados e próximas execuções.",
          "Executar lubrificação conforme plano e registrar no sistema.",
          "Monitorar aderência ao cronograma de lubrificação.",
        ]}
      />
    </ManualSection>
  );
}
