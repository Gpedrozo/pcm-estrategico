import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualProgramacao() {
  return (
    <ManualSection id="programacao" number="08" title="Programação de Manutenção">
      <ObjectiveBox>
        Planejar e distribuir as atividades de manutenção na semana, otimizando alocação de recursos.
      </ObjectiveBox>

      <ScreenMockup title="Programação — Calendário Semanal">
        <div className="flex">
          <MockSidebar activeItem="Programação" items={["Dashboard", "Backlog", "Programação", "Preventiva"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Semana 11 — Mar/2026</h3>
              <MockButton variant="outline">Semana Anterior</MockButton>
            </div>
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {["Seg 16", "Ter 17", "Qua 18", "Qui 19", "Sex 20"].map((dia) => (
                <div key={dia} className="rounded border border-border p-2 space-y-1">
                  <p className="font-semibold text-foreground text-center">{dia}</p>
                  {dia === "Seg 16" && (
                    <>
                      <div className="rounded bg-destructive/10 text-destructive p-1 text-[9px]">OS-0085 BOM-001 ★</div>
                      <div className="rounded bg-primary/10 text-primary p-1 text-[9px]">OS-0082 CMP-003</div>
                    </>
                  )}
                  {dia === "Ter 17" && (
                    <div className="rounded bg-green-500/10 text-green-700 p-1 text-[9px]">PREV-021 Filtros</div>
                  )}
                  {dia === "Qua 18" && (
                    <div className="rounded bg-primary/10 text-primary p-1 text-[9px]">OS-0078 MTR-012</div>
                  )}
                  {dia === "Qui 19" && (
                    <div className="rounded bg-green-500/10 text-green-700 p-1 text-[9px]">PREV-022 Lubrif.</div>
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border p-2 flex items-center gap-3">
              <p className="text-xs text-muted-foreground">Capacidade:</p>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "62%" }} />
              </div>
              <p className="text-xs font-semibold text-foreground">5/8 mecânicos alocados</p>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Revisar demandas do backlog e preventivas programadas.",
          "Distribuir atividades no calendário semanal.",
          "Verificar capacidade disponível (mecânicos e ferramentas).",
          "Priorizar itens críticos nos primeiros dias da semana.",
          "Ajustar programação conforme mudanças no cenário operacional.",
        ]}
      />
    </ManualSection>
  );
}
