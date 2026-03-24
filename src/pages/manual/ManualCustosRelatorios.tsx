import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualCustosRelatorios() {
  return (
    <ManualSection id="custos-relatorios" number="18" title="Custos e Relatórios">
      <ObjectiveBox>
        Consolidar visão técnica-financeira para decisão gerencial.
      </ObjectiveBox>

      <ScreenMockup title="Custos — Visão Consolidada">
        <div className="flex">
          <MockSidebar activeItem="Custos" items={["Dashboard", "Custos", "Relatórios", "SSMA"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Custos de Manutenção — Março/2026</h3>
              <MockButton variant="outline">Exportar PDF</MockButton>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Mão de Obra</p>
                <p className="text-lg font-bold text-foreground">R$ 12.450</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Materiais</p>
                <p className="text-lg font-bold text-foreground">R$ 8.320</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Terceiros</p>
                <p className="text-lg font-bold text-foreground">R$ 5.100</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center bg-primary/5">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-primary">R$ 25.870</p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Custo por Equipamento (Top 5)</p>
              <div className="space-y-2">
                {[
                  { tag: "BOM-001", val: 85 },
                  { tag: "CMP-003", val: 62 },
                  { tag: "MTR-012", val: 45 },
                  { tag: "RED-005", val: 30 },
                  { tag: "VNT-008", val: 18 },
                ].map((item) => (
                  <div key={item.tag} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">{item.tag}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.val}%` }} />
                    </div>
                    <span className="text-xs text-foreground w-16 text-right">R$ {(item.val * 48).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Selecionar período de análise.",
          "Avaliar custos por categoria (MO, materiais, terceiros).",
          "Cruzar com indicadores de MTBF, MTTR e backlog.",
          "Identificar equipamentos com maior custo de manutenção.",
          "Definir plano de ação gerencial baseado nos dados.",
        ]}
      />
    </ManualSection>
  );
}
