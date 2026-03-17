# Smoke Test Operacional - Auth State Machine (17/03/2026)

## Objetivo
Validar ponta a ponta o fluxo de autenticação multi-tenant com estado determinístico de auth (idle/loading/hydrating/authenticated/unauthenticated/error), garantindo:
- ausência de loop entre domínio principal e subdomínio;
- handoff de sessão com session_transfer obrigatório;
- bloqueio por retry_count após tentativas repetidas;
- ausência de redirects prematuros durante hydrating/loading.

## Pré-requisitos
1. Ambiente web em execução (homologação ou produção controlada).
2. Conta tenant válida com vínculo empresa_id.
3. Conta owner válida (SYSTEM_OWNER ou SYSTEM_ADMIN).
4. Um subdomínio válido no padrão slug.gppis.com.br.
5. DevTools disponível para inspeção de URL, hash e Network.

## Evidências a coletar por cenário
1. URL final atingida.
2. Screenshot da tela final.
3. Screenshot/registro de erro (se houver).
4. Logs relevantes no console (quando aplicável).

## Matriz de cenários críticos

### CEN-01 - Login tenant a partir do domínio principal
1. Acessar https://gppis.com.br/login.
2. Autenticar com usuário tenant válido.
3. Observar redirecionamento para o subdomínio da empresa.

Resultado esperado:
1. Navegação para https://slug.gppis.com.br/login com hash contendo session_transfer.
2. Após consumo do transfer, hash limpo da URL.
3. Usuário autenticado em rota protegida (ex.: /dashboard) sem voltar ao login.

### CEN-02 - Sem session_transfer no subdomínio
1. Abrir manualmente https://slug.gppis.com.br/login sem hash de transfer.
2. Garantir que o usuário não esteja autenticado localmente no subdomínio.

Resultado esperado:
1. Redirecionamento para https://gppis.com.br/login com parâmetro next.
2. Não permanecer em loop no subdomínio.

### CEN-03 - Retry count e hard stop anti-loop
1. Forçar falha de handoff (ex.: abrir URL de login cross-domain com retry_count alto).
2. Acessar /login com retry_count=2 (ou maior), sem contexto válido de transfer.

Resultado esperado:
1. Fluxo bloqueado com mensagem de erro de limite de tentativas.
2. Não ocorre redirecionamento infinito entre domínios.

### CEN-04 - Hydrating não pode redirecionar prematuramente
1. Com throttling de rede no browser, autenticar e observar transição inicial.
2. Durante carregamento inicial (hydrating), monitorar se há saltos de rota indevidos.

Resultado esperado:
1. Tela de loading/splash até auth estabilizar.
2. Nenhum redirect para /login ou /dashboard antes de authStatus authenticated.

### CEN-05 - Troca obrigatória de senha
1. Logar com usuário que possua force_password_change ativo.
2. Verificar redirecionamento para /change-password.
3. Atualizar senha válida.

Resultado esperado:
1. Usuário permanece em /change-password até concluir troca.
2. Após sucesso, segue para rota pós-login da role.
3. Não retorna indevidamente para /change-password após refresh.

### CEN-06 - Logout em subdomínio tenant
1. Entrar em contexto autenticado no subdomínio.
2. Executar logout.

Resultado esperado:
1. Sessão local e global finalizadas.
2. Redirecionamento para domínio principal em /login?logout=1.
3. Sem reautenticação residual e sem abrir empresa errada.

### CEN-07 - Acesso com tenant inválido ou mismatch de empresa
1. Tentar autenticar em subdomínio que não corresponde ao tenant do usuário.
2. Tentar acessar subdomínio inválido.

Resultado esperado:
1. Sessão invalidada com bloqueio de acesso.
2. Mensagem de domínio/tenant não autorizado.
3. Encaminhamento seguro para login principal quando aplicável.

### CEN-08 - Owner login e entrada em empresa
1. Acessar domínio owner e autenticar com conta SYSTEM_OWNER/SYSTEM_ADMIN.
2. Selecionar empresa no chooser.

Resultado esperado:
1. Geração de handoff para subdomínio da empresa.
2. Sessão válida no tenant sem loop.
3. Bloqueio para conta sem role owner.

## Checklist de aprovação
1. Todos os cenários CEN-01 a CEN-08 concluídos com status OK.
2. Nenhum loop de redirect identificado.
3. Nenhum redirect durante hydrating/loading.
4. Logs críticos sem erro bloqueante no fluxo de autenticação.

## Registro de execução
Preencher ao final da rodada:
1. Ambiente testado:
2. Data/hora da execução:
3. Responsável:
4. Cenários aprovados:
5. Cenários com falha:
6. Observações:
7. Links para evidências (prints, vídeos, logs):
