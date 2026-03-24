import { ManualSection, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup } from "@/components/manual/ScreenMockup";

const perfis = [
  {
    nome: "SOLICITANTE",
    cor: "bg-blue-500",
    descricao: "Abre solicitações de manutenção. Visão limitada ao próprio fluxo.",
    acesso: ["Abrir solicitações", "Acompanhar status", "Visualizar Dashboard básico"],
  },
  {
    nome: "USUÁRIO",
    cor: "bg-green-500",
    descricao: "Operador de manutenção. Executa e fecha ordens de serviço.",
    acesso: [
      "Tudo do Solicitante",
      "Emitir e fechar O.S",
      "Backlog e programação",
      "Preventiva, preditiva, inspeções",
      "Histórico de O.S",
    ],
  },
  {
    nome: "ADMIN",
    cor: "bg-orange-500",
    descricao: "Gestor de manutenção. Acessa dados gerenciais e configura o sistema.",
    acesso: [
      "Tudo do Usuário",
      "Gestão de usuários",
      "Custos e relatórios",
      "FMEA, RCA, melhorias",
      "SSMA",
      "Configurações da empresa",
    ],
  },
  {
    nome: "MASTER TI",
    cor: "bg-red-500",
    descricao: "Administrador técnico total. Acesso irrestrito e configuração avançada.",
    acesso: [
      "Tudo do Admin",
      "Painel Master TI",
      "Auditoria completa",
      "Configuração técnica do tenant",
      "Suporte e diagnóstico",
    ],
  },
];

export default function ManualPerfis() {
  return (
    <ManualSection id="perfis" number="02" title="Perfis e Permissões">
      <ScreenMockup title="Sistema de Perfis — Hierarquia de Acesso">
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Hierarquia de Perfis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {perfis.map((p) => (
              <div key={p.nome} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${p.cor}`} />
                  <span className="text-xs font-bold text-foreground">{p.nome}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{p.descricao}</p>
                <ul className="space-y-1">
                  {p.acesso.map((a, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="text-primary">•</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </ScreenMockup>

      <HighlightBox variant="info" title="Princípio do Menor Privilégio">
        Cada usuário deve ter apenas o nível de acesso necessário para sua função.
        Perfis são atribuídos pelo Admin ou Master TI.
      </HighlightBox>
    </ManualSection>
  );
}
