import { ManualSection, StepList, ObjectiveBox, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockTable } from "@/components/manual/ScreenMockup";

export default function ManualAdministracao() {
  return (
    <ManualSection id="administracao" number="20" title="Administração e Governança">
      <ObjectiveBox>
        Gerenciar usuários, auditoria, configurações do tenant e suporte técnico.
      </ObjectiveBox>

      <h3 className="text-base font-semibold text-foreground">Gestão de Usuários</h3>
      <ScreenMockup title="Administração — Usuários">
        <div className="p-4 space-y-3">
          <MockTable
            headers={["Nome", "Email", "Perfil", "Status", "Último Acesso"]}
            rows={[
              ["João Silva", "joao@empresa.com", "Usuário", "Ativo", "16/03/2026 08:45"],
              ["Maria Santos", "maria@empresa.com", "Admin", "Ativo", "15/03/2026 17:30"],
              ["Carlos R.", "carlos@empresa.com", "Solicitante", "Ativo", "14/03/2026 09:00"],
            ]}
          />
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Revisar acessos periodicamente.",
          "Ajustar perfil conforme função real do colaborador.",
          "Desativar usuários desligados imediatamente.",
        ]}
      />

      <h3 className="text-base font-semibold text-foreground">Trilha de Auditoria</h3>
      <ScreenMockup title="Auditoria — Trilha de Ações">
        <div className="p-4 space-y-3">
          <MockTable
            headers={["Data/Hora", "Usuário", "Ação", "Módulo", "Detalhes"]}
            rows={[
              ["16/03 08:45", "João Silva", "Login", "Autenticação", "Acesso bem-sucedido"],
              ["16/03 08:50", "João Silva", "Criação", "Solicitações", "SOL-0142 criada"],
              ["16/03 09:15", "Maria Santos", "Emissão", "Ordens de Serviço", "OS-0085 emitida"],
              ["15/03 17:20", "Maria Santos", "Atualização", "Usuários", "Perfil de Carlos alterado"],
            ]}
          />
        </div>
      </ScreenMockup>

      <HighlightBox variant="info">
        A trilha de auditoria é imutável. Consulte por período, usuário ou tipo de ação. Registre tratativa para qualquer desvio identificado.
      </HighlightBox>
    </ManualSection>
  );
}
