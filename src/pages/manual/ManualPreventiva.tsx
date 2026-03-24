import { ManualSection, StepList, Checklist, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualPreventiva() {
  return (
    <ManualSection id="preventiva" number="09" title="Manutenção Preventiva">
      <ObjectiveBox>
        Gerenciar planos de manutenção preventiva com periodicidade, aderência e execução controlada.
      </ObjectiveBox>

      <ScreenMockup title="Preventiva — Planos Ativos">
        <div className="flex">
          <MockSidebar activeItem="Preventiva" items={["Programação", "Preventiva", "Preditiva", "Lubrificação"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Planos de Manutenção Preventiva</h3>
            <MockTable
              headers={["Plano", "Equipamento", "Periodicidade", "Próxima Exec.", "Aderência"]}
              rows={[
                ["PREV-001", "BOM-001", "Mensal", "20/03/2026", "92%"],
                ["PREV-002", "CMP-003", "Trimestral", "01/04/2026", "100%"],
                ["PREV-003", "MTR-012", "Semanal", "18/03/2026", "85%"],
                ["PREV-004", "RED-005", "Mensal", "25/03/2026", "78%"],
              ]}
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Planos Ativos</p>
                <p className="text-lg font-bold text-foreground">24</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Aderência Geral</p>
                <p className="text-lg font-bold text-green-600">89%</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Atrasados</p>
                <p className="text-lg font-bold text-destructive">3</p>
              </div>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Preventiva no menu lateral.",
          "Revisar planos ativos e próximas execuções.",
          "Verificar aderência de cada plano ao cronograma.",
          "Gerar O.S preventivas para execuções pendentes.",
          "Registrar execução e atualizar status.",
        ]}
      />

      <Checklist
        items={[
          "Todos os planos com periodicidade definida.",
          "Aderência geral acima de 85%.",
          "Nenhum plano atrasado sem justificativa.",
        ]}
      />
    </ManualSection>
  );
}
