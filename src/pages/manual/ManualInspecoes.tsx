import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualInspecoes() {
  return (
    <ManualSection id="inspecoes" number="12" title="Inspeções">
      <ObjectiveBox>
        Controlar rotinas de inspeção para detecção precoce de anomalias e alimentar programação de manutenção.
      </ObjectiveBox>

      <ScreenMockup title="Inspeções — Rotinas Ativas">
        <div className="flex">
          <MockSidebar activeItem="Inspeções" items={["Preventiva", "Preditiva", "Lubrificação", "Inspeções"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Rotinas de Inspeção</h3>
            <MockTable
              headers={["Rota", "Área", "Itens", "Frequência", "Anomalias", "Última Exec."]}
              rows={[
                ["INSP-001", "Bombeamento", "8 itens", "Diária", "2 ⚠", "16/03/2026"],
                ["INSP-002", "Compressores", "12 itens", "Diária", "0", "16/03/2026"],
                ["INSP-003", "Elétrica", "6 itens", "Semanal", "1 ⚠", "14/03/2026"],
                ["INSP-004", "Caldeiraria", "10 itens", "Semanal", "0", "12/03/2026"],
              ]}
              highlightRow={0}
            />
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Inspeções no menu lateral.",
          "Consultar rotas de inspeção e seus itens de verificação.",
          "Executar inspeção e registrar condição de cada item.",
          "Reportar anomalias encontradas para gerar ações.",
        ]}
      />
    </ManualSection>
  );
}
