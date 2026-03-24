import { ManualSection, StepList, Checklist, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockFormField, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualHistorico() {
  return (
    <ManualSection id="historico" number="07" title="Histórico de O.S">
      <ObjectiveBox>
        Consultar o histórico completo de ordens de serviço com filtros avançados para análise e tomada de decisão.
      </ObjectiveBox>

      <ScreenMockup title="Histórico — Consulta Avançada">
        <div className="flex">
          <MockSidebar activeItem="Histórico" items={["Dashboard", "Emitir O.S", "Fechar O.S", "Histórico"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Histórico de Ordens de Serviço</h3>
            <div className="grid grid-cols-3 gap-2">
              <MockFormField label="Período" type="text" value="01/01/2026 — 16/03/2026" />
              <MockFormField label="Equipamento" type="select" value="Todos" />
              <MockFormField label="Status" type="select" value="Fechadas" />
            </div>
            <div className="flex gap-2">
              <MockButton>Buscar</MockButton>
              <MockButton variant="outline">Exportar Excel</MockButton>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Lead Time Médio</p>
                <p className="text-lg font-bold text-foreground">4.2h</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold text-foreground">R$ 45.320</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Reincidência</p>
                <p className="text-lg font-bold text-destructive">8.5%</p>
              </div>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Histórico no menu lateral.",
          "Definir filtros: período, equipamento, tipo, status.",
          "Analisar indicadores resumidos (lead time, custo, reincidência).",
          "Detalhar O.S específicas para investigação.",
          "Exportar dados para análise externa se necessário.",
        ]}
      />

      <Checklist
        items={[
          "Filtros aplicados corretamente retornam dados esperados.",
          "Indicadores de reincidência monitorados mensalmente.",
          "Dados exportados para relatórios gerenciais.",
        ]}
      />
    </ManualSection>
  );
}
