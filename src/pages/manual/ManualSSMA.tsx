import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockTable, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualSSMA() {
  return (
    <ManualSection id="ssma" number="19" title="SSMA — Segurança, Saúde e Meio Ambiente">
      <ObjectiveBox>
        Registrar incidentes, quase-incidentes, controlar permissões de trabalho e gerenciar treinamentos obrigatórios (NRs) com alertas de vencimento.
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

      <ScreenMockup title="SSMA — Controle de Treinamentos e NRs">
        <div className="flex">
          <MockSidebar activeItem="SSMA" items={["Dashboard", "Custos", "Relatórios", "SSMA"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Treinamentos / NRs</h3>
              <MockButton variant="primary">+ Novo Treinamento</MockButton>
            </div>
            <MockTable
              headers={["Colaborador", "Tipo", "Curso", "Realização", "Validade", "Status"]}
              rows={[
                ["João Silva", "NR-35", "Trabalho em Altura", "10/01/2026", "10/01/2028", "✅ Válido"],
                ["Maria Santos", "NR-10", "Seg. Elétrica", "05/03/2025", "05/04/2026", "⚠️ Vencendo"],
                ["Pedro Lima", "NR-33", "Espaço Confinado", "12/06/2024", "12/06/2025", "❌ Vencido"],
              ]}
              highlightRow={2}
            />
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acesse a aba 'Treinamentos / NRs' no módulo SSMA.",
          "Clique em '+ Novo Treinamento' e preencha: colaborador, tipo de NR, data de realização e validade.",
          "Defina quantos dias antes do vencimento o sistema deve alertar (padrão: 30 dias).",
          "O sistema calcula automaticamente o status: Válido, Vencendo ou Vencido.",
          "Alertas aparecem automaticamente no sino de notificações quando cursos estão próximos do vencimento.",
        ]}
      />

      <HighlightBox variant="warning" title="Conformidade Legal">
        Treinamentos de NRs possuem validade legal (NR-1 Art. 16). O não cumprimento pode gerar multas do MTE e impedir a execução de atividades críticas. Mantenha os cursos sempre em dia.
      </HighlightBox>
    </ManualSection>
  );
}
