import { ManualSection, StepList, Checklist, HighlightBox } from "@/components/manual/ManualSection";
import { ScreenMockup, MockFormField, MockButton } from "@/components/manual/ScreenMockup";

export default function ManualLogin() {
  return (
    <ManualSection id="login" number="01" title="Login e Primeiro Acesso">
      <ScreenMockup title="PCM Estratégico — Tela de Login">
        <div className="flex items-center justify-center py-12 px-6">
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-primary mx-auto flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">P</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">PCM Estratégico</h3>
              <p className="text-[10px] text-muted-foreground">Entre com suas credenciais</p>
            </div>
            <MockFormField label="E-mail" value="joao@empresa.com.br" required />
            <MockFormField label="Senha" value="••••••••" required />
            <MockButton>Entrar</MockButton>
            <p className="text-[10px] text-center text-primary">Esqueceu sua senha?</p>
          </div>
        </div>
      </ScreenMockup>

      <StepList
        steps={[
          "Acessar a URL do sistema (subdomínio da empresa).",
          "Inserir e-mail e senha fornecidos pelo administrador.",
          "No primeiro acesso, redefinir a senha obrigatoriamente.",
          "Verificar se o Dashboard carregou corretamente.",
          "Em caso de erro, usar 'Esqueceu sua senha?' para recuperação.",
        ]}
      />

      <Checklist
        items={[
          "Subdomínio correto da empresa acessado.",
          "Credenciais válidas inseridas.",
          "Senha redefinida no primeiro acesso.",
          "Dashboard exibido sem erros.",
        ]}
      />

      <HighlightBox variant="warning" title="Atenção">
        Nunca compartilhe suas credenciais. O acesso é individual e rastreável pela trilha de auditoria.
      </HighlightBox>
    </ManualSection>
  );
}
