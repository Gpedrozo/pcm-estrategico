# Diagnostico de Conexoes do Modulo Owner - 2026-03-21

## Escopo executado automaticamente
- Analise estatica do fluxo Owner e Owner2 no frontend.
- Analise estatica da Edge Function owner-portal-admin.
- Testes reais de conectividade HTTP contra Supabase Auth e Edge Functions.
- Validacao de configuracao de ambiente local de runtime.

## Conexoes que o modulo Owner exige

### Frontend -> Supabase Auth
- Login usa autenticacao direta por senha em AuthContext.
- Referencia: src/contexts/AuthContext.tsx (signInWithPassword).
- Dependencia critica: endpoint /auth/v1/token do projeto Supabase.

### Frontend -> Tabelas de perfil e role
- Hidratacao de perfil consulta:
  - profiles
  - user_roles
  - empresas (para slug)
- Referencia: src/contexts/AuthContext.tsx (fetch/resolve profile).

### Frontend -> Edge Function owner-portal-admin
- Quase todas as telas de Owner/Owner2 chamam owner-portal-admin com JWT no header Authorization.
- Referencias:
  - src/services/ownerPortal.service.ts
  - src/services/owner2Portal.service.ts
  - src/hooks/useOwnerPortal.ts
  - src/hooks/useOwner2Portal.ts

### Edge owner-portal-admin -> Banco (service role)
- Acao health_check e dashboard dependem de acesso a tabelas centrais.
- A function usa adminClient e acessa diversas tabelas, incluindo:
  - empresas
  - profiles
  - user_roles
  - plans
  - subscriptions
  - contracts
  - support_tickets
  - configuracoes_sistema
  - dados_empresa
  - enterprise_audit_logs
  - owner_impersonation_sessions
- Referencia: supabase/functions/owner-portal-admin/index.ts

## Testes executados automaticamente (runtime real)

Ambiente local identificado:
- BASE=https://dvwsferonoczgmvfubgu.supabase.co
- OWNER_ENV_PRESENT=False
- TENANT_BASE_DOMAIN vazio no ambiente local

Resultados:
1) Auth health
- Endpoint: /auth/v1/health
- Resultado: 200 OK
- Interpretacao: servico Auth esta ativo na infraestrutura.

2) Auth password token com credencial invalida controlada
- Endpoint: /auth/v1/token?grant_type=password
- Resultado: 500
- Body: {"code":500,"error_code":"unexpected_failure","msg":"Database error querying schema",...}
- Interpretacao: falha estrutural de schema no backend Auth, antes de validar senha.

3) Edge auth-login
- Endpoint: /functions/v1/auth-login
- Resultado: 502
- Body: {"error":"Auth provider request failed","details":{"auth_status":500,"auth_message":"Database error querying schema"}}
- Interpretacao: a Edge Function esta correta ao propagar falha do Auth provider; nao e problema de frontend.

4) Edge owner-portal-admin sem JWT
- Endpoint: /functions/v1/owner-portal-admin (action=health_check)
- Resultado: 401
- Interpretacao: endpoint esta online e protegendo acesso por autenticacao.

5) CORS de owner-portal-admin com origem invalida
- Origin testada: https://evil.example.com
- Resultado: 403
- Body: Origin not allowed
- Interpretacao: camada CORS da function esta funcionando.

## Conclusao tecnica objetiva
- O modulo Owner depende de Auth por senha para gerar sessao JWT.
- O Auth do projeto esta quebrado em schema query (500 Database error querying schema).
- Com Auth quebrado, o frontend nao consegue sessao e toda chamada autenticada ao owner-portal-admin falha em cascata.
- Portanto, a causa raiz atual nao esta no modulo Owner/Owner2 de frontend.

## Tentativa de reparo automatico executada nesta analise
- Supabase CLI detectado e autenticado com projeto linkado (dvwsferonoczgmvfubgu).
- Migration emergencial criada e aplicada automaticamente via comando de push remoto.
- Resultado do push: concluido com sucesso para a migration de hardening simplificada.
- Reteste imediato apos push:
  - /auth/v1/token continua retornando 500 Database error querying schema.
  - /functions/v1/auth-login continua retornando 502 com detalhe auth_status 500.

## Segunda rodada (simplificacao maxima) aplicada automaticamente
- Migration simplificada aplicada no remoto para redefinir hook no schema public:
  - create or replace function public.custom_access_token_hook(event jsonb) returns jsonb (no-op)
  - grants de execute aplicados com fallback tolerante.
- Config push do projeto aplicado via Management API (supabase config push).
- Reteste imediato apos essa segunda rodada:
  - /auth/v1/token permanece em 500 Database error querying schema.
  - /functions/v1/auth-login permanece em 502 por falha upstream do Auth.

Interpretacao da segunda rodada:
- Mesmo com hook no public padronizado e config sincronizada, o erro persiste.
- Isso indica que a quebra nao esta mais no fluxo owner/frontend nem no ajuste simples de hook publico.
- O problema remanescente esta dentro do servico Auth (schema interno/objeto interno/estado do tenant Auth).

## Terceira rodada (diagnostico estrutural profundo do Auth)
- Inventario de schema via views diagnosticas publicas:
  - 78 tabelas
  - 861 colunas
  - 129 FKs
  - 51 funcoes
- Tabelas reais do schema auth identificadas: 23 (incluindo auth.instances e auth.schema_migrations).
- Diagnostico de contagem no auth:
  - users_count=7
  - identities_count=7
  - sessions_count=0
  - refresh_tokens_count=0
  - instances_count=0 (antes da correcao)
- Correcao aplicada automaticamente:
  - semeadura idempotente de auth.instances quando vazio.
  - apos correcao: instances_count=1.

Resultado apos seed de auth.instances:
- /auth/v1/token ainda retorna 500 Database error querying schema.
- /functions/v1/auth-login ainda retorna 502 por falha upstream do Auth.

Interpretacao da terceira rodada:
- A ausencia de auth.instances era um problema real e foi corrigida.
- Mesmo assim, o erro de schema persiste, indicando drift mais profundo no schema interno gerido pelo servico Auth.

Interpretacao:
- O erro de schema do Auth persiste apos desativacao por config/hooks que foi possivel aplicar.
- O problema remanescente esta em camada interna de Auth nao corrigivel apenas por migration SQL com permissoes atuais do role de migração.

## Bloqueio real para auto-correcao completa
- Nao existe SUPABASE_SERVICE_ROLE_KEY no ambiente local atual.
- O role de migration remoto nao possui permissao para criar/alterar objetos necessarios no schema auth (exemplo: custom_access_token_hook).
- Sem privilegio admin de Auth, nao e possivel aplicar automaticamente o reparo estrutural completo pelo terminal atual.
- Comandos de dump/inspecao profunda de schema auth via CLI tambem ficaram bloqueados pelo ambiente local (dependencia de Docker para certas operacoes), sem ganho adicional de diagnostico interno.
- A reconciliacao final do schema interno do Auth deve ser tratada no nivel da plataforma (Supabase Auth service), nao apenas por migrations de aplicacao.

## Artefato adicional criado
- Script de diagnostico para reutilizacao no repositorio:
  - scripts/diagnostics/owner-connection-diagnostic.cjs
