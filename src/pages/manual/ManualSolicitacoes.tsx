import { ManualSection, StepList, Checklist, FieldTable, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockFormField, MockButton, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualSolicitacoes() {
  return (
    <ManualSection id="solicitacoes" number="03" title="Solicitações de Manutenção">
      <ObjectiveBox>
        Registrar demandas de manutenção de forma padronizada para triagem e atendimento rápido.
      </ObjectiveBox>

      <ScreenMockup title="Solicitações — Lista de Solicitações">
        <div className="flex">
          <MockSidebar activeItem="Solicitações" items={["Dashboard", "Solicitações", "Backlog", "O.S"]} />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Solicitações Recentes</h3>
              <MockButton>+ Nova Solicitação</MockButton>
            </div>
            <MockTable
              headers={["ID", "Descrição", "Solicitante", "Data", "Status"]}
              rows={[
                ["SOL-0142", "Vazamento na bomba BOM-001", "João Silva", "16/03/2026", "Pendente"],
                ["SOL-0141", "Ruído no compressor CMP-003", "Maria Santos", "15/03/2026", "Aprovada"],
                ["SOL-0140", "Troca de rolamento MTR-012", "Carlos R.", "14/03/2026", "Em atendimento"],
              ]}
              highlightRow={0}
            />
          </div>
        </div>
      </ScreenMockup>

      <ScreenMockup title="Nova Solicitação — Formulário">
        <div className="p-4 space-y-3 max-w-lg">
          <h3 className="text-sm font-semibold text-foreground">Abrir Nova Solicitação</h3>
          <MockFormField label="Equipamento / TAG" type="select" value="BOM-001 — Bomba Centrífuga" required />
          <MockFormField label="Tipo de Manutenção" type="select" value="Corretiva" required />
          <MockFormField label="Prioridade" type="select" value="Alta" required />
          <MockFormField label="Descrição do Problema" type="textarea" value="Vazamento no selo mecânico da bomba centrífuga BOM-001. Observado acúmulo de fluido na base." required />
          <div className="flex gap-2">
            <MockButton>Enviar Solicitação</MockButton>
            <MockButton variant="outline">Cancelar</MockButton>
          </div>
        </div>
      </ScreenMockup>

      <FieldTable
        fields={[
          { name: "Equipamento / TAG", description: "Ativo onde o problema foi identificado", required: true },
          { name: "Tipo de Manutenção", description: "Corretiva, preventiva ou preditiva", required: true },
          { name: "Prioridade", description: "Baixa, Média, Alta ou Crítica", required: true },
          { name: "Descrição", description: "Relato detalhado do problema observado", required: true },
          { name: "Anexos", description: "Fotos ou documentos de apoio", required: false },
        ]}
      />

      <StepList
        steps={[
          "Acessar o módulo Solicitações no menu lateral.",
          "Clicar em '+ Nova Solicitação'.",
          "Preencher equipamento, tipo, prioridade e descrição.",
          "Anexar fotos ou documentos, se necessário.",
          "Confirmar e enviar a solicitação.",
          "Acompanhar o status na lista de solicitações.",
        ]}
      />

      <Checklist
        items={[
          "Equipamento selecionado corretamente.",
          "Descrição clara e objetiva do problema.",
          "Prioridade compatível com a urgência real.",
          "Solicitação aparece na lista com status 'Pendente'.",
        ]}
      />
    </ManualSection>
  );
}
