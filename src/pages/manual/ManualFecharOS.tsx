import { ManualSection, StepList, Checklist, FieldTable, ObjectiveBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockSidebar, MockFormField, MockButton, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualFecharOS() {
  return (
    <ManualSection id="fechar-os" number="06" title="Fechar Ordem de Serviço">
      <ObjectiveBox>
        Encerrar a O.S com registro completo de execução, materiais utilizados e validação técnica.
      </ObjectiveBox>

      <ScreenMockup title="Fechar O.S — Formulário de Encerramento">
        <div className="flex">
          <MockSidebar activeItem="Fechar O.S" items={["Dashboard", "Emitir O.S", "Fechar O.S", "Histórico"]} />
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Fechar O.S — OS-0085</h3>
            <div className="grid grid-cols-2 gap-3">
              <MockFormField label="Data de Início" type="text" value="16/03/2026 08:00" required />
              <MockFormField label="Data de Término" type="text" value="16/03/2026 14:30" required />
              <MockFormField label="Tempo de Parada (h)" type="text" value="6.5" required />
              <MockFormField label="Causa da Falha" type="select" value="Desgaste natural" required />
            </div>
            <MockFormField label="Parecer Técnico" type="textarea" value="Selo mecânico substituído. Alinhamento verificado com relógio comparador — dentro da tolerância. Teste de estanqueidade aprovado." required />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Materiais Utilizados</p>
              <MockTable
                headers={["Material", "Código", "Qtd", "Custo Unit."]}
                rows={[
                  ["Selo Mecânico 2\"", "MAT-0025", "1", "R$ 850,00"],
                  ["Junta Plana NBR", "MAT-0112", "2", "R$ 15,00"],
                  ["Graxa EP-2", "MAT-0008", "0.5 kg", "R$ 22,00"],
                ]}
              />
            </div>

            <MockFormField label="Observações" type="textarea" value="Recomendado incluir ponto de monitoramento de vibração neste equipamento." />
            <div className="flex gap-2">
              <MockButton variant="success">Fechar O.S</MockButton>
              <MockButton variant="outline">Salvar Parcial</MockButton>
            </div>
          </div>
        </div>
      </ScreenMockup>

      <FieldTable
        fields={[
          { name: "Data de Início / Término", description: "Período real de execução do serviço", required: true },
          { name: "Tempo de Parada", description: "Horas em que o equipamento ficou indisponível", required: true },
          { name: "Causa da Falha", description: "Classificação padronizada da causa", required: true },
          { name: "Parecer Técnico", description: "Descrição técnica do que foi feito", required: true },
          { name: "Materiais Utilizados", description: "Lista de peças e insumos consumidos", required: false },
          { name: "Observações", description: "Recomendações ou alertas adicionais", required: false },
        ]}
      />

      <StepList
        steps={[
          "Localizar a O.S na lista de ordens em execução.",
          "Preencher data de início e término reais.",
          "Registrar tempo de parada do equipamento.",
          "Classificar a causa da falha.",
          "Descrever o parecer técnico detalhado.",
          "Adicionar materiais utilizados com quantidades.",
          "Fechar a O.S ou salvar como parcial.",
        ]}
      />

      <Checklist
        items={[
          "Datas de início e término registradas corretamente.",
          "Parecer técnico descreve o que foi feito (não apenas o problema).",
          "Materiais e custos lançados corretamente.",
          "Causa da falha classificada para alimentar indicadores.",
          "O.S aparece no histórico com status 'Fechada'.",
        ]}
      />
    </ManualSection>
  );
}
