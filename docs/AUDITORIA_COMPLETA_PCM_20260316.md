# AUDITORIA COMPLETA - PCM ESTRATEGICO

Data: 16/03/2026  
Escopo: frontend React/TS + Supabase (migrations, edge functions, auth, RBAC, multi-tenant)

---

## RESUMO EXECUTIVO

Status geral: BOM com riscos pontuais de seguranca e governanca.

Achados de maior severidade:

1. CRITICA: arquivo .env estava versionado no Git.
2. ALTA: NotificationCenter fazia consultas e realtime sem filtro explicito de empresa no frontend (defesa em profundidade insuficiente).
3. MEDIA: alto volume de consultas Supabase espalhadas fora de uma service layer unica por dominio (dificulta auditoria e padronizacao).
4. MEDIA: uso extensivo de any (138 ocorrencias), reduzindo confiabilidade da tipagem e seguranca de dados.

Correcoes aplicadas nesta auditoria:

1. .env removido do rastreamento Git (sem apagar local).
2. .gitignore endurecido para ignorar .env e variantes.
3. criado .env.example com placeholders.
4. NotificationCenter hardenizado com filtro por empresa_id em queries e subscription.

---

## FASE 1 - MAPEAMENTO COMPLETO DO SISTEMA

## 1.1 Arquitetura

Estrutura principal identificada em src:

- auth
- billing
- components
- contexts
- core
- database
- guards
- hooks
- integrations
- layouts
- lib
- modules
- owner
- pages
- rbac
- schemas
- security
- services
- test
- types

Observacoes:

- architecture style predominante: page + hooks + contexts + service parcial.
- ha mistura de feature-based e camada horizontal.

## Rotas mapeadas

Arquivo central: src/App.tsx

Rotas Owner:
- /login
- /change-password
- /forgot-password
- /reset-password
- /
- /manuais-operacao
- /manuais-operacao/usuario
- /manuais-operacao/admin
- /manuais-operacao/master-ti

Rotas Tenant principais:
- /
- /login
- /change-password
- /forgot-password
- /reset-password
- /instalar
- /dashboard
- /solicitacoes
- /os/nova
- /os/fechar
- /os/historico
- /backlog
- /programacao
- /preventiva
- /preditiva
- /inspecoes
- /fmea
- /rca
- /melhorias
- /hierarquia
- /equipamentos
- /mecanicos
- /materiais
- /fornecedores
- /contratos
- /documentos
- /lubrificacao
- /custos
- /relatorios
- /ssma
- /usuarios
- /auditoria
- /suporte
- /empresa/configuracoes
- /admin/arquivos-owner
- /master-ti
- /inteligencia-causa-raiz
- /manuais-operacao
- /manuais-operacao/usuario
- /manuais-operacao/admin
- /manuais-operacao/master-ti

## Autenticacao

- Supabase Auth em src/contexts/AuthContext.tsx.
- Persistencia de sessao localStorage (cliente Supabase em src/integrations/supabase/client.ts).
- Fluxos: login, signup, logout, troca de senha, forgot/reset.
- Fluxo de handoff/session_transfer implementado para cenarios owner/tenant.

## RBAC

- Tipo de role em src/lib/security.ts (AppRole).
- effectiveRole calculado por getEffectiveRole.
- Guards: EnvironmentGuard, MasterTIGuard, SystemOwnerGuard, OwnerOnlyRoute.
- Permissao granular: usePermission via RPC has_permission.

## Chamadas Supabase

- alto volume de supabase.from distribuido em hooks e componentes.
- owner usa service layer em src/services/ownerPortal.service.ts + edge function owner-portal-admin.
- realtime identificado em NotificationCenter.

## Variaveis de ambiente sensiveis

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY
- VITE_OWNER_SUPABASE_URL
- VITE_OWNER_SUPABASE_PUBLISHABLE_KEY / VITE_OWNER_SUPABASE_ANON_KEY
- VITE_SUPABASE_PROJECT_ID
- VITE_TENANT_BASE_DOMAIN
- VITE_OWNER_DOMAIN
- VITE_OWNER_MASTER_EMAIL
- VITE_OWNER_PREVIEW

---

## 1.2 Tecnologias e dependencias

Stack confirmada:

- React 18.3.1
- TypeScript 5.8.x
- Vite 5.4.x
- Tailwind CSS 3.4.x
- Supabase JS 2.90.x
- TanStack Query 5.x
- Radix UI + shadcn
- Zod
- React Hook Form
- Recharts
- Lucide

Pontos de auditoria de dependencias:

- Nao foram detectados pacotes claramente duplicados de funcionalidade critica.
- Existem bibliotecas utilitarias de dominio amplo (ex.: xlsx, jspdf) que merecem auditoria de uso por bundle size.
- Recomendado rodar rotina mensal:
  - npm outdated
  - npm audit --production

---

## 1.3 Banco de dados (Supabase)

Fonte de verdade utilizada:

- supabase/migrations/*
- docs/RELATORIO_FINAL_AUDITORIA_MULTI_TENANT.md
- docs/SAAS_MULTI_TENANT_AUDITORIA_E_PLANO.md
- docs/MODULE_DB_USAGE_AUDIT_20260313.md

Diagnostico consolidado:

- Historicamente houve gaps multi-tenant, mas migrations de hardening foram adicionadas em marco/2026.
- RLS e empresa_id aparecem como padrao aplicado nas tabelas operacionais segundo relatorios internos.
- Persistem necessidades de verificacao continua em producao para evitar regressao.

Verificacao obrigatoria recomendada apos cada release:

- select * from public.weekly_tenant_integrity_check();

---

## FASE 2 - MAPEAMENTO DE FUNCIONALIDADES

## 2.1 Auth e autorizacao

- Login/Logout: AuthContext + Supabase Auth.
- Recuperacao de senha: rotas /forgot-password e /reset-password.
- Guards: OwnerOnlyRoute, EnvironmentGuard, MasterTIGuard, SystemOwnerGuard.
- Roles: SYSTEM_OWNER, SYSTEM_ADMIN, MASTER_TI, ADMIN, USUARIO, SOLICITANTE e outras de dominio.

## 2.2 Modulo Owner (prioridade maxima)

Arquivos-chave:

- src/pages/Owner.tsx
- src/hooks/useOwnerPortal.ts
- src/services/ownerPortal.service.ts
- src/owner/OwnerLogin.tsx
- src/layouts/OwnerPortalLayout.tsx
- supabase/functions/owner-portal-admin
- supabase/functions/owner-companies
- supabase/functions/owner-users
- supabase/functions/owner-audit
- supabase/functions/owner-billing
- supabase/functions/owner-data-control

Capacidades observadas:

- listar empresas globalmente
- listar usuarios globalmente
- gerir planos/assinaturas/contratos
- auditoria owner
- impersonacao de empresa
- operacoes de controle de dados

## 2.3 Admin

- gestao de usuarios da empresa
- configuracoes da empresa
- auditoria
- CRUDs operacionais (OS, preventiva, preditiva, materiais, etc.)

## 2.4 Usuario

- operacao do fluxo de manutencao e consultas conforme papel e permissoes.

## 2.5 Dashboards e indicadores

- dashboard tenant e dashboard owner
- graficos via Recharts
- risco funcional conhecido: componentes de grafico em testes sem dimensao de container (warning recorrente, nao bloqueante)

## 2.6 CRUDs

Mapeados por hooks/pages em:

- ordens_servico
- solicitacoes_manutencao
- equipamentos
- materiais
- mecanicos
- preventiva/preditiva/lubrificacao
- RCA/FMEA/melhorias
- contratos/fornecedores/documentos

## 2.7 Modulo IA

- src/modules/rootCauseAI/*
- rota: /inteligencia-causa-raiz
- integracao via hooks e tipo raw_response ainda com any em pontos especificos.

---

## FASE 3 - AUDITORIA DE SEGURANCA MULTI-TENANT

## 3.1 Verificacoes obrigatorias (status)

- [x] .env no repositorio: detectado e corrigido nesta auditoria.
- [x] .env no .gitignore: corrigido nesta auditoria.
- [ ] validacao automatica de todas queries com empresa_id explicito no frontend: parcial.
- [ ] validacao automatica de RLS em todas as tabelas no banco real de producao: pendente de execucao SQL online.

## 3.2 Checklist de seguranca

- [x] .env nao deve ficar versionado: corrigido.
- [x] .env ignore ativo: corrigido.
- [~] credenciais hardcoded: nao observadas em codigo app, mas era necessario remover .env versionado.
- [x] sessao em mecanismo do Supabase Auth.
- [~] rotas protegidas: guardadas em boa parte, revisar rotas auxiliares em cada release.
- [~] roles no backend: depende de RLS/functions; recomendado reforco de testes integrados.
- [~] logs sensiveis: logger estruturado existe, mas ainda ha console.error/console.log pontuais.

## 3.3 Vulnerabilidades e severidade

### VULN-001
- Severidade: CRITICA
- Descricao: arquivo .env versionado no git.
- Impacto: exposicao de chaves/segredos de ambiente.
- Correcao aplicada:
  - remover .env do rastreamento
  - endurecer .gitignore
  - adicionar .env.example
- Acao obrigatoria adicional:
  - rotacionar imediatamente todas as chaves expostas.

### VULN-002
- Severidade: ALTA
- Descricao: NotificationCenter sem filtro explicito por empresa_id nas consultas e realtime.
- Impacto: dependencia exclusiva de RLS sem defesa em profundidade no frontend.
- Correcao aplicada: filtros empresa_id adicionados.

SQL recomendado (defesa adicional no banco, se ainda nao existir):

```sql
alter table public.ordens_servico enable row level security;
create policy if not exists ordens_servico_tenant_select
on public.ordens_servico
for select
using (empresa_id = public.get_current_empresa_id());
```

---

## FASE 4 - BUGS E CORRECOES

## BUG-001
- Arquivo: .gitignore e raiz do repo
- Causa raiz: padrao de ignore nao cobria .env.
- Correcao: incluir .env e .env.* + .env.example.
- Impacto: reduz risco de vazamento de credenciais.

## BUG-002
- Arquivo: src/components/notifications/NotificationCenter.tsx
- Causa raiz: consultas sem filtro explicito por tenant e subscription ampla.
- Correcao: .eq('empresa_id', user.tenantId) e filter de realtime por empresa.
- Impacto: reforco de isolamento tenant e menor superficie de erro.

---

## FASE 5 - REFATORACAO (PLANO ESTRUTURAL)

Prioridade 1 (seguranca e coerencia):

1. Consolidar acessos Supabase por dominio em service layer por modulo (hooks apenas orquestram).
2. Bloquear novos usos diretos de supabase.from em components/pages via lint rule.
3. Criar suite de testes multi-tenant automatizada (A/B tenant) para CRUDs criticos.

Prioridade 2 (tipagem):

1. reduzir any (138 ocorrencias).
2. tipar payloads de hooks de dominio com Zod + inferred types.
3. remover casts inseguros em owner e dashboard.

Prioridade 3 (organizacao):

1. mover para feature-based em modulos de negocio:
   - /modules/os
   - /modules/planejamento
   - /modules/analises
   - /modules/cadastros
   - /modules/owner
2. manter padrao: components/hooks/services/types/utils por modulo.

Prioridade 4 (performance):

1. revisao de renders de Owner.tsx (arquivo muito grande).
2. split de tabs do owner em componentes lazy por aba.
3. memoizacao de transformacoes de dados de graficos.

---

## FASE 6 - LOGS E ERROS

Status atual:

- logger estruturado ja existe em src/lib/logger.ts.
- ainda ha console.error e pads de erro heterogeneos.

Padrao recomendado:

1. substituir console.* por logger em codigo de dominio.
2. padrao unico de erro de UI: toast + logger.error.
3. adicionar correlation_id/trace_id em responses de edge functions owner.

---

## DELTA DE ALTERACOES EXECUTADAS NESTA AUDITORIA

1. arquivo: .gitignore
   - adicionados:
     - .env
     - .env.*
     - !.env.example
     - !.env.*.example

2. arquivo: .env.example
   - criado template de variaveis de ambiente.

3. comando de seguranca executado:
   - git rm --cached .env

4. arquivo: src/components/notifications/NotificationCenter.tsx
   - queries filtradas por empresa_id.
   - subscription realtime filtrada por empresa_id.

Validacao:

- build de producao executado com sucesso apos correcoes.

---

## PROXIMOS PASSOS RECOMENDADOS (EXECUTAVEIS)

1. Rotacionar todas as chaves presentes no .env antigo (acao imediata).
2. Rodar auditoria SQL em producao para confirmar RLS/empresa_id em todas as tabelas realmente usadas.
3. Implementar lint rule de proibicao de supabase.from fora de services.
4. Executar refatoracao do Owner por abas/componentes (reduz risco de regressao).
5. Abrir sprint de tipagem para eliminar anys de maior risco (owner, hooks operacionais, relatorios).
