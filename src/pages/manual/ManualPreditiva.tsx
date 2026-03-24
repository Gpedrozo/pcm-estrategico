import { ManualSection, StepList, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualPreditiva() {
  return (
    <ManualSection id="preditiva" number="10" title="Manutenção Preditiva">
      <ObjectiveBox>
        Monitorar condições operacionais dos ativos e antecipar falhas com base em medições e tendências.
      </ObjectiveBox>

      <ScreenMockup title="Preditiva — Monitoramento de Condição">
        <div className="flex">
          <MockSidebar activeItem="Preditiva" items={["Programação", "Preventiva", "Preditiva", "Lubrificação"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Medições Preditivas</h3>
            <MockTable
              headers={["TAG", "Tipo", "Último Valor", "Limite", "Tendência", "Alerta"]}
              rows={[
                ["BOM-001", "Vibração", "4.2 mm/s", "4.5 mm/s", "↑ Crescente", "⚠ Atenção"],
                ["CMP-003", "Temperatura", "72°C", "90°C", "→ Estável", "✓ Normal"],
                ["MTR-012", "Vibração", "6.8 mm/s", "4.5 mm/s", "↑ Crescente", "🔴 Crítico"],
                ["RED-005", "Análise Óleo", "Normal", "—", "→ Estável", "✓ Normal"],
              ]}
              highlightRow={2}
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Pontos Monitorados</p>
                <p className="text-lg font-bold text-foreground">48</p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Em Atenção</p>
                <p className="text-lg font-bold text-warning">5</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Críticos</p>
                <p className="text-lg font-bold text-destructive">2</p>
              </div>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar o módulo Preditiva no menu lateral.",
          "Revisar medições recentes e seus alertas.",
          "Priorizar ativos com tendência crescente ou fora do limite.",
          "Gerar O.S corretiva ou preventiva para ativos críticos.",
        ]}
      />
    </ManualSection>
  );
}
