import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualSSMA() {
  return (
    <ManualSection id="ssma" number="19" title="SSMA — Segurança, Saúde e Meio Ambiente">
      <ObjectiveBox>
        Registrar incidentes, quase-incidentes e controlar permissões de trabalho.
      </ObjectiveBox>

      <ScreenMockup title="SSMA — Registro de Incidentes">
        <div className="flex">
          <MockSidebar activeItem="SSMA" items={["Dashboard", "Custos", "Relatórios", "SSMA"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Incidentes e Permissões</h3>
              <MockButton variant="danger">+ Registrar Incidente</MockButton>
            </div>
            <MockTable
              headers={["ID", "Tipo", "Local", "Severidade", "Data", "Status"]}
              rows={[
                ["INC-023", "Quase-incidente", "Sala de Bombas", "Moderada", "15/03/2026", "Em tratativa"],
                ["INC-022", "Incidente", "Área de Compressores", "Alta", "10/03/2026", "Concluído"],
                ["PT-018", "Permissão de Trabalho", "Caldeira", "—", "16/03/2026", "Ativa"],
              ]}
              highlightRow={0}
            />
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Registrar incidente ou quase-incidente com detalhes do evento.",
          "Definir severidade e controles aplicados.",
          "Abrir permissão de trabalho quando aplicável.",
          "Encerrar com tratativa documentada e lições aprendidas.",
        ]}
      />

      <HighlightBox variant="warning" title="Obrigatório">
        Todo incidente com lesão ou potencial de lesão grave deve ser registrado em até 24 horas. Permissões de trabalho são obrigatórias para serviços a quente, espaço confinado e trabalho em altura.
      </HighlightBox>
    </ManualSection>
  );
}
