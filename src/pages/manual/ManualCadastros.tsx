import { ManualSection, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup } from "@/components/manual/ScreenMockup";

const modulos = [
  { nome: "Hierarquia", desc: "Estrutura funcional: planta → área → sistema → equipamento", exemplos: "Planta SP, Área de Utilidades, Sistema de Bombeamento" },
  { nome: "Equipamentos", desc: "Cadastro detalhado de ativos com TAG, modelo, fabricante", exemplos: "BOM-001, CMP-003, MTR-012" },
  { nome: "Mecânicos", desc: "Profissionais e equipes de manutenção", exemplos: "João Silva — Mecânico Sr., Equipe A" },
  { nome: "Materiais", desc: "Peças, insumos e sobressalentes com código e estoque", exemplos: "Rolamento 6210, Graxa EP-2, Selo Mecânico" },
  { nome: "Fornecedores", desc: "Empresas prestadoras e fornecedoras", exemplos: "SKF Brasil, Lubrax" },
  { nome: "Contratos", desc: "Contratos de manutenção e prestação de serviço", exemplos: "CTR-2026-001 Manutenção Preditiva" },
  { nome: "Documentos Técnicos", desc: "Manuais, desenhos técnicos, procedimentos", exemplos: "Manual BOM-001, Procedimento de Alinhamento" },
];

export default function ManualCadastros() {
  return (
    <ManualSection id="cadastros" number="17" title="Cadastros Estruturais">
      <ObjectiveBox>
        Garantir base de dados consistente para toda a operação de manutenção.
      </ObjectiveBox>

      <ScreenMockup title="Cadastros — Visão Geral dos Módulos">
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Módulos de Cadastro</h3>
          <div className="grid grid-cols-1 gap-2">
            {modulos.map((m) => (
              <div key={m.nome} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{m.nome.slice(0, 3).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Ex: {m.exemplos}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScreenMockup>

      <HighlightBox variant="tip" title="Regra Geral">
        Todo cadastro deve ter padrão de nomenclatura, dono do dado e revisão periódica. Dados inconsistentes comprometem todo o fluxo operacional.
      </HighlightBox>
    </ManualSection>
  );
}
