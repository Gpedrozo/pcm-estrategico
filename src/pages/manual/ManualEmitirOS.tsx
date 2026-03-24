import { ManualSection, StepList, Checklist, FieldTable, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockFormField, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualEmitirOS() {
  return (
    <ManualSection id="emitir-os" number="05" title="Emitir Ordem de Serviço">
      <ObjectiveBox>
        Formalizar a demanda de manutenção em uma Ordem de Serviço com todos os dados necessários para execução.
      </ObjectiveBox>

      <ScreenMockup title="Nova O.S — Formulário de Emissão">
        <div className="flex">
          <MockSidebar activeItem="Emitir O.S" items={["Dashboard", "Solicitações", "Backlog", "Emitir O.S", "Fechar O.S"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Emitir Nova Ordem de Serviço</h3>
            <div className="grid grid-cols-2 gap-3">
              <MockFormField label="Equipamento / TAG" type="select" value="BOM-001 — Bomba Centrífuga" required />
              <MockFormField label="Tipo de Manutenção" type="select" value="Corretiva" required />
              <MockFormField label="Prioridade" type="select" value="Alta" required />
              <MockFormField label="Mecânico Responsável" type="select" value="João Silva" required />
              <MockFormField label="Prazo de Execução" type="text" value="17/03/2026" required />
              <MockFormField label="Solicitação Origem" type="text" value="SOL-0142" />
            </div>
            <MockFormField label="Descrição do Serviço" type="textarea" value="Substituir selo mecânico da bomba centrífuga BOM-001. Verificar alinhamento após montagem." required />
            <div className="flex gap-2">
              <MockButton>Emitir O.S</MockButton>
              <MockButton variant="outline">Salvar Rascunho</MockButton>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <FieldTable
        fields={[
          { name: "Equipamento / TAG", description: "Ativo que receberá o serviço", required: true },
          { name: "Tipo de Manutenção", description: "Corretiva, preventiva, preditiva ou melhoria", required: true },
          { name: "Prioridade", description: "Emergência, Alta, Média ou Baixa", required: true },
          { name: "Mecânico Responsável", description: "Profissional designado para execução", required: true },
          { name: "Prazo de Execução", description: "Data limite para conclusão", required: true },
          { name: "Descrição do Serviço", description: "Detalhamento técnico do serviço a ser executado", required: true },
          { name: "Solicitação Origem", description: "Referência à solicitação que originou a O.S", required: false },
        ]}
      />

      <StepList
        steps={[
          "Acessar o módulo 'Emitir O.S' no menu lateral.",
          "Selecionar equipamento e tipo de manutenção.",
          "Definir prioridade e prazo.",
          "Designar mecânico responsável.",
          "Descrever detalhadamente o serviço.",
          "Emitir a O.S ou salvar como rascunho.",
        ]}
      />

      <Checklist
        items={[
          "Equipamento correto selecionado.",
          "Mecânico disponível para o prazo definido.",
          "Descrição técnica suficiente para execução autônoma.",
          "O.S emitida aparece no backlog do mecânico.",
        ]}
      />
    </ManualSection>
  );
}
