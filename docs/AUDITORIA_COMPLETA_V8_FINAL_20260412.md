# 🔍 AUDITORIA COMPLETA DO SISTEMA — V8 FINAL
**PCM Estratégico · 12/04/2026**
**Ciclo:** Auditoria #2 (re-auditoria após V7+V8)

---

## ETAPA 1 — ARQUITETURA E STACK TECNOLÓGICO

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | TailwindCSS + shadcn/ui + Lucide Icons |
| Estado | TanStack Query v5 (server state) + useState/useContext (local) |
| Validação | Zod |
| Roteamento | React Router v6 (lazy loading em 70+ rotas) |
| Backend | Supabase (PostgreSQL 15 + Auth + Storage + RLS) |
| Edge Functions | 23 funções Deno (supabase/functions/) |
| Multi-tenancy | `empresa_id` isolation via `can_access_empresa()` SECURITY DEFINER |
| Auth | Edge function `auth-login` (rate limit 5/5min) + Supabase Auth |
| Testes | Vitest + @testing-library/react |

### Arquitetura
- **SPA** com code-splitting via React.lazy em todas as rotas
- **Multi-tenant SaaS** com isolamento por `empresa_id` via RLS
- **RBAC** híbrido: frontend guards (`RoleGuard`, `SystemOwnerGuard`) + RLS via `has_permission()` RPC
- **Hierarquia de roles**: SYSTEM_OWNER > SYSTEM_ADMIN > MASTER_TI > ADMIN > SUPER > USER > FINANCEIRO

### Números
- 70+ rotas lazy-loaded
- 55+ hooks React
- 23 edge functions
- 12+ services
- 110+ migrations
- 51 tabelas em types.ts / ~96 tabelas reais no banco

---

## ETAPA 2 — MAPEAMENTO DE CONEXÕES COM BANCO

### Hooks → Tabelas (principais)
| Hook | Tabelas | Padrão |
|------|---------|--------|
| `useDashboardData` | ordens_servico, execucoes_os, solicitacoes, v_dashboard_kpis | 5 queries paralelas |
| `useOrdensServico` | ordens_servico, execucoes_os | service + mutations |
| `useExecucoesOS` | execucoes_os (+ RPC `close_os_with_execution_atomic`) | RPC atômico |
| `useMecanicos` | mecanicos | CRUD + ativo filter |
| `useEquipamentos` | equipamentos, componentes_equipamento | nested queries |
| `useSolicitacoes` | solicitacoes OU solicitacoes_manutencao (dynamic) | insertWithColumnFallback |
| `usePermission` | RPC `has_permission` | role check |
| `useMecanicoSessionTracking` | RPC `validar_credenciais_mecanico_servidor` + `registrar_login_mecanico` | session mgmt |

### Padrões detectados
- **N+1**: `useDashboardData` dispara ~5 queries em paralelo (aceitável para SPA)
- **Dynamic table names**: `useSolicitacoes` escolhe tabela em runtime (risco se não sanitizado)
- **insertWithColumnFallback**: mecanismo de fallback que mascara erros de schema mismatch
- **callRpc wrapper**: abstração para RPCs com error handling
- **Unbounded selects**: vários hooks fazem `.select('*')` sem `.range()` ou `.limit()`

---

## ETAPA 3 — INVENTÁRIO DE TABELAS

### types.ts (51 tabelas tipadas)
acoes_corretivas, analise_causa_raiz, anomalias_inspecao, areas, atividades_lubrificacao, atividades_preventivas, audit_logs, avaliacoes_fornecedores, componentes_equipamento, configuracoes_sistema, contratos, dados_empresa, document_layouts, document_sequences, documentos_tecnicos, edge_refactor_contract, empresa_config, empresas, enterprise_audit_logs, equipamentos, execucoes_lubrificacao, execucoes_os, execucoes_preventivas, fmea, fornecedores, incidentes_ssma, inspecoes, maintenance_schedule, materiais, materiais_os, mecanicos, medicoes_preditivas, melhorias, movimentacoes_materiais, ordens_servico, permissoes_granulares, permissoes_trabalho, planos_lubrificacao, planos_preventivos, plantas, profiles, rate_limits, rbac_permissions, rbac_role_permissions, rbac_roles, rbac_user_roles, security_logs, servicos_preventivos, sistemas, templates_preventivos, user_roles

### Tabelas no banco mas NÃO em types.ts (~45 gaps)
- Auth-related: log_validacoes_senha, log_mecanicos_login, log_tentativas_login, mecanico_login_attempts, login_attempts
- Rate limiting: mecanicos_rate_limit_state, mecanicos_blocked_devices
- Dispositivos: dispositivos_moveis, qrcodes_vinculacao
- Subscriptions: subscriptions, plans, planos, assinaturas
- Lubrificação: rotas_lubrificacao, rotas_lubrificacao_pontos, lubrificantes, movimentacoes_lubrificante
- Operational: operational_logs, platform_metrics, webhook_events, support_tickets
- SSMA: treinamentos_ssma, paradas_equipamento, requisicoes_material
- Misc: app_versao, solicitacoes_manutencao, solicitacoes

### ⚠️ Anomalias
- `edge_refactor_contract` em types.ts mas **não usada no frontend**
- `mecanicos` em types.ts falta colunas: `codigo_acesso`, `especialidade`, `custo_hora`, `senha_hash`
- `solicitacoes` vs `solicitacoes_manutencao` — dupla tabela para mesma funcionalidade

---

## ETAPA 4 — ANÁLISE PROFUNDA DE SEGURANÇA

### 🔴 VULNERABILIDADES CRÍTICAS

#### SEC-CRIT-001: GRANT SELECT ON ALL TABLES TO anon (CORRIGIDA em V8)
- **Origin**: Migration 20260323100000
- **Impact**: anon role podia ler TODAS tabelas onde RLS não bloqueava
- **Fix V8**: `REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon` + regrant seletivo
- **Status**: ✅ CORRIGIDO

#### SEC-CRIT-002: USING(true) em 30+ tabelas de negócio (CORRIGIDA em V8)
- **Origin**: Migrations legadas (20260116013455 etc.)
- **Impact**: Sem isolamento multi-tenant — cross-tenant data leak
- **Fix V8**: Loop remove policies USING(true) + recria com `can_access_empresa(empresa_id)`
- **Status**: ✅ CORRIGIDO (incluindo `solicitacoes_manutencao`, corrigido nesta auditoria)

#### SEC-CRIT-003: RPC `validar_credenciais_mecanico_servidor` usava plaintext
- **Descoberto nesta auditoria**: A função comparava `v_mecanico.senha_acesso != p_senha_acesso` (plaintext!)
- **Impact**: Senhas de mecânicos armazenadas e comparadas em texto claro
- **Fix V8**: Reescrita da RPC para usar `crypt(p_senha_acesso, v_mecanico.senha_hash)` (bcrypt)
- **Status**: ✅ CORRIGIDO nesta sessão

#### SEC-CRIT-004: Frontend comparação plaintext de senha (client-side)
- **PainelMecanico.tsx**: `if ((mecanico.senha_acesso || '') !== senha)`
- **PortalMecanicoOS.tsx**: mesmo padrão
- **Impact**: Senha trafega do banco para o client, comparação no JS
- **Fix**: Migrado para RPC `verificar_senha_mecanico` (server-side bcrypt)
- **Status**: ✅ CORRIGIDO nesta sessão

#### SEC-CRIT-005: Edge function `mecanico-device-auth` comparação plaintext
- **Original**: `.select("id, senha_acesso")` + `timingSafeCompare(mec.senha_acesso, senhaInput)`
- **Fix**: Migrado para RPC `verificar_senha_mecanico`
- **Status**: ✅ CORRIGIDO nesta sessão

### 🟠 VULNERABILIDADES ALTAS

#### SEC-HIGH-001: `validar_credenciais_mecanico_servidor` era acessível por anon
- **Original**: `GRANT EXECUTE ... TO authenticated, anon`
- **Impact**: Atacante anon podia brute-force senhas de mecânicos
- **Fix V8**: Revogado de anon, mantido apenas authenticated + service_role
- **Status**: ✅ CORRIGIDO

#### SEC-HIGH-002: `owner-data-control` permite purga total sem soft-delete
- **Edge function**: Actions `delete_company`, `purge_table_data`
- **Impact**: Dados podem ser irreversivelmente apagados sem audit trail
- **Status**: ⚠️ PENDENTE — necessita flag `deleted_at` com restore RPC

#### SEC-HIGH-003: Edge functions sem validação de input
- `analisar-causa-raiz`: Nenhuma validação de parâmetros
- `generate-preventive-os`: Wildcard params aceitos
- `owner-portal-admin`: Dynamic action dispatch
- **Status**: ⚠️ PENDENTE

### 🟡 VULNERABILIDADES MÉDIAS

#### SEC-MED-001: `senha_acesso` coluna ainda existe no banco
- Coluna mantida para compatibilidade — conteúdo NULL (nulificado em V5)
- **Plan**: DROP na V9 após confirmação que zero consumers referenciam
- **Status**: ⏳ Planejado para V9

#### SEC-MED-002: rate_limits sem limpeza automática
- Tabela cresce indefinidamente
- **Status**: ⚠️ PENDENTE

---

## ETAPA 5 — ANÁLISE DE PERFORMANCE

### 🔴 Problemas Críticos
| Issue | Local | Impact |
|-------|-------|--------|
| 5 queries paralelas no Dashboard | `useDashboardData.ts` | ~5 roundtrips ao DB por page load |
| Unbounded SELECTs | Múltiplos hooks (`useEquipamentos`, `useMecanicos`) | Sem `.limit()` — pode carregar 10k+ rows |
| O(n) filtragem em useMemo | `PainelMecanico.tsx`, `PortalMecanicoOS.tsx` | Filter em array completo no client |

### ✅ Pontos Positivos
- TanStack Query com `staleTime` configurado em vários hooks
- `useOrdensServico` usa service layer com paginação
- View `v_dashboard_kpis` agrega dados server-side

### Indexes adicionados (V8)
- `idx_solicitacoes_manut_empresa_status` — (empresa_id, status)
- `idx_solicitacoes_empresa_status` — (empresa_id, status)
- `idx_profiles_empresa_status_v8` — partial index (status != 'excluido')
- `idx_user_roles_empresa_id_v8` — (empresa_id)
- `idx_execucoes_os_ordem_id` — (ordem_servico_id)

---

## ETAPA 6 — INTEGRIDADE DE DADOS E TRANSAÇÕES

### 🔴 Problemas
| Issue | Local | Risco |
|-------|-------|-------|
| `close_os_with_execution_atomic` sem validação de erro no hook | `useExecucoesOS.ts:113` | RPC falha silenciosamente |
| INSERT sem constraint de unicidade em `execucoes_os` | Migrations | Execuções duplicadas possíveis |
| `insertWithColumnFallback` mascara erros | Múltiplos hooks | Schema mismatch não detectado |

### ✅ Pontos Positivos
- `close_os_with_execution_atomic` é uma RPC SECURITY DEFINER com transação
- `onError` handlers presentes em `useOrdensServico` e `useSolicitacoes`
- Audit logs registram mutações críticas

---

## ETAPA 7 — COBERTURA DE TESTES

### Resumo
| Métrica | Valor |
|---------|-------|
| Arquivos de teste | 21 |
| Testes unitários | ~8 |
| Testes de integração | ~6 |
| Testes de smoke | ~4 |
| Testes de edge functions | 0 |
| Testes de RLS | 0 |
| Cobertura estimada | **~15%** |

### ⚠️ Gaps Críticos
- **Zero testes para edge functions** — 23 funções sem coverage
- **Zero testes de RLS policies** — multi-tenant isolation não testado
- **Zero testes para `validar_credenciais_mecanico_servidor`** (fluxo mais crítico)
- `example.test.ts` é placeholder

### ✅ Presentes
- Smoke tests para auth, hooks, services
- Schema validation para equipamentos
- Regression tests para owner2-encoding e owner-modules

---

## ETAPA 8 — NOTA CONSOLIDADA

### Scorecard (0-10)

| Dimensão | Nota | Justificativa |
|----------|------|---------------|
| **Segurança** | 6.5 → **7.5** | V7+V8 corrigiram GRANT anon, USING(true), plaintext senha. Restam: owner-data-control purge, edge function input validation |
| **Performance** | 6.0 | N+1 aceitável mas unbounded SELECTs são risco em escala |
| **Integridade** | 6.5 | RPC close atômico ✅ mas erro silencioso no hook. insertWithColumnFallback mascara |
| **Multi-tenancy** | 5.5 → **8.0** | V8 aplicou can_access_empresa em 33 tabelas + FORCE RLS em 36 auxiliares |
| **Testes** | 3.0 | 15% coverage, zero edge function/RLS tests |
| **Manutenibilidade** | 6.5 | types.ts desatualizado (51 vs 96 tabelas), 1 página órfã |
| **RBAC** | 7.5 | Frontend guards + RLS enforcement via has_permission(). Sólido |
| **Observabilidade** | 7.0 | audit_logs, security_logs, log_validacoes_senha. Boa base |

### **NOTA GERAL: 6.5 → 7.2 / 10**

**Melhoria de +0.7** pontos graças às correções V7+V8. Principais avanços:
- Eliminação de comparação plaintext de senha (3 camadas: frontend, edge function, RPC)
- Revogação de GRANT SELECT global de anon
- Substituição de USING(true) por can_access_empresa em 33+ tabelas
- FORCE RLS em 36 tabelas auxiliares

**Bloqueios para 8.0+:**
- Cobertura de testes abaixo de 50%
- Edge functions sem validação de input
- `owner-data-control` permite purga destrutiva
- Unbounded SELECTs em hooks

---

## ETAPA 9 — PLANO DE EVOLUÇÃO

### Roadmap para 10/10

| Sprint | Objetivo | Nota Alvo |
|--------|----------|-----------|
| **V9** (1 semana) | DROP `senha_acesso`, validação de input em edge functions, testes RLS | 8.0 |
| **V10** (2 semanas) | Cobertura de testes > 50%, paginação em todos hooks, types.ts sync | 8.5 |
| **V11** (2 semanas) | Soft-delete em owner-data-control, retry logic, deduplicação | 9.0 |
| **V12** (2 semanas) | CDC/event sourcing, testes E2E, observabilidade APM | 9.5 |
| **V13** (1 semana) | Penetration testing, auditoria externa, documentation | 10.0 |

---

## ETAPA 10 — PLANO DE AÇÃO À PROVA DE FALHAS

### 10.1 🔴 CORREÇÕES CRÍTICAS IMEDIATAS

#### ✅ EXECUTADAS NESTA AUDITORIA

| # | Correção | Status |
|---|----------|--------|
| 1 | V8 migração: `qual = 'true'` → detecta `'(true)'` também | ✅ Aplicado |
| 2 | V8 migração: `roles` comparison com `@>` array operator | ✅ Aplicado |
| 3 | V8 migração: `solicitacoes_manutencao` adicionada à cleanup list | ✅ Aplicado |
| 4 | V8 migração: políticas redundantes (SELECT+ALL) → policy única FOR ALL | ✅ Aplicado |
| 5 | V8 migração: RPC `validar_credenciais_mecanico_servidor` reescrita para bcrypt | ✅ Aplicado |
| 6 | V8 migração: Revogação de acesso anon à RPC de validação | ✅ Aplicado |
| 7 | `PainelMecanico.tsx`: comparação plaintext → RPC `verificar_senha_mecanico` | ✅ Aplicado |
| 8 | `PortalMecanicoOS.tsx`: comparação plaintext → RPC `verificar_senha_mecanico` | ✅ Aplicado |
| 9 | Edge function `mecanico-device-auth`: plaintext → RPC bcrypt | ✅ Aplicado |

#### ⏳ PRÓXIMAS AÇÕES (V9)

| # | Correção | Risco | Esforço |
|---|----------|-------|---------|
| 10 | DROP coluna `mecanicos.senha_acesso` após confirmar zero consumers | ALTO | 1h |
| 11 | Validação de input em `analisar-causa-raiz` (Zod schema) | MÉDIO | 2h |
| 12 | Validação de input em `generate-preventive-os` | MÉDIO | 2h |
| 13 | Soft-delete em `owner-data-control` (flag `deleted_at`) | ALTO | 4h |
| 14 | Hook `useExecucoesOS`: validar retorno de RPC `close_os_with_execution_atomic` | ALTO | 1h |

### 10.2 🟠 PADRONIZAÇÃO COMPLETA

| Área | Status Atual | Ação | Prioridade |
|------|-------------|------|-----------|
| `types.ts` | 51/96 tabelas tipadas | Regenerar com `supabase gen types` | ALTA |
| `mecanicos` type | Falta `codigo_acesso`, `especialidade`, `custo_hora`, `senha_hash` | Sync automático | ALTA |
| Dynamic table names (`useSolicitacoes`) | Escolha em runtime | Sanitizar com allowlist | MÉDIA |
| `insertWithColumnFallback` | Mascara erros | Logging explícito de fallback | MÉDIA |
| Página `MecanicosMonitoramento.tsx` | Órfã (sem rota) | Remover ou rotear | BAIXA |
| `edge_refactor_contract` table | Em types.ts mas não usada | Avaliar remoção | BAIXA |

### 10.3 🗄️ BLINDAGEM DO BANCO

#### Já aplicado (V7+V8)
- ✅ REVOKE SELECT global de anon
- ✅ FORCE RLS em 36 tabelas auxiliares
- ✅ DROP USING(true) + recriação com `can_access_empresa()` em 33 tabelas
- ✅ Indexes de performance em 5 tabelas
- ✅ Migração de senha plaintext → bcrypt

#### Pendente
| Item | SQL | Urgência |
|------|-----|----------|
| Constraint UNIQUE em `execucoes_os(ordem_servico_id, mecanico_id, created_at)` | `ALTER TABLE execucoes_os ADD CONSTRAINT ...` | ALTA |
| Cleanup job para `rate_limits` (TTL 30 dias) | `pg_cron` job | MÉDIA |
| Cleanup job para `log_validacoes_senha` (TTL 90 dias) | `pg_cron` job | MÉDIA |
| Partitioning em `audit_logs` por mês | `CREATE TABLE audit_logs_YYYY_MM PARTITION OF ...` | BAIXA (performance) |
| View materializada `mv_dashboard_summary` | Substituir 5 queries do dashboard | MÉDIA |

### 10.4 🔐 SEGURANÇA TOTAL

| Camada | Item | Status |
|--------|------|--------|
| **Auth** | Rate limiting login (5/5min) | ✅ Implementado |
| **Auth** | Brute force protection mecânico | ✅ V8 bcrypt + rate limit |
| **RLS** | can_access_empresa em tabelas core | ✅ 33 tabelas |
| **RLS** | FORCE RLS em auxiliares | ✅ 36 tabelas |
| **Grants** | anon revogado globalmente | ✅ V8 |
| **Edge** | JWT validation em todas functions | ⚠️ 2 sem JWT (cron triggers) |
| **Edge** | Input validation | ⚠️ 3 functions sem Zod |
| **RBAC** | has_permission() RPC | ✅ Enforcement server-side |
| **Data** | Plaintext passwords eliminados | ✅ V8 bcrypt migration |
| **Data** | `owner-data-control` purge | ❌ FALTA soft-delete |
| **Infra** | Anon key rotation | ✅ Rotacionada em 22/06 |

### 10.5 🔄 TESTES AUTOMATIZADOS

#### SUITE MÍNIMA NECESSÁRIA (Bloqueia 8.0)

| Teste | Tipo | Esforço | Prioridade |
|-------|------|---------|-----------|
| `verificar_senha_mecanico` RPC retorna `true/false` correto | Integration | 2h | 🔴 CRÍTICA |
| `validar_credenciais_mecanico_servidor` com bcrypt | Integration | 2h | 🔴 CRÍTICA |
| `can_access_empresa` bloqueia cross-tenant | Integration | 3h | 🔴 CRÍTICA |
| `auth-login` rate limiting (429 após 5 tentativas) | Integration | 2h | ALTA |
| `mecanico-device-auth` com RPC bcrypt | Unit | 2h | ALTA |
| `close_os_with_execution_atomic` idempotency | Integration | 2h | ALTA |
| RBAC `has_permission` para cada role | Unit | 3h | MÉDIA |
| `owner-data-control` soft-delete behavior | Integration | 2h | MÉDIA |
| Smoke test de TODAS edge functions (health check) | Smoke | 4h | MÉDIA |
| E2E: fluxo completo cadastro → OS → execução → fechamento | E2E | 8h | BAIXA |

#### Meta de Cobertura
| Sprint | Coverage Alvo | Foco |
|--------|--------------|------|
| V9 | 30% | RPCs + RLS + auth |
| V10 | 50% | Hooks + mutations + edge functions |
| V11 | 70% | E2E + regressão |

### 10.6 ⚡ OTIMIZAÇÃO DE PERFORMANCE

| Ação | Impacto | Esforço | Prioridade |
|------|---------|---------|-----------|
| Adicionar `.limit(1000)` em todos hooks unbounded | ALTO | 2h | 🔴 IMEDIATA |
| Substituir 5 queries do dashboard por view `mv_dashboard_summary` | ALTO | 4h | ALTA |
| Paginação em `useEquipamentos`, `useMecanicos`, `useFornecedores` | ALTO | 6h | ALTA |
| React.memo em componentes de lista pesados | MÉDIO | 3h | MÉDIA |
| Dedup de queries TanStack (queryKey normalization) | BAIXO | 2h | BAIXA |
| CDN para assets estáticos (imagens/PDFs) | MÉDIO | 4h | BAIXA |

### 10.7 🧩 GARANTIA DE INTEGRIDADE

| Regra | Implementação | Status |
|-------|--------------|--------|
| OS não pode fechar sem execução | `close_os_with_execution_atomic` RPC | ✅ |
| Mecânico inativo não pode logar | Verificação em `validar_credenciais_mecanico_servidor` | ✅ |
| Dispositivo bloqueado bloqueia login | `mecanicos_blocked_devices` check | ✅ |
| Rate limit por dispositivo | `mecanicos_rate_limit_state` | ✅ |
| Execução duplicada prevenida | ❌ FALTA constraint UNIQUE | ⚠️ |
| Rollback em erro de mutation | ❌ FALTA retry + compensação | ⚠️ |
| Sequência de document numbers | `document_sequences` + trigger | ✅ |
| Audit trail completo | `audit_logs` + `enterprise_audit_logs` | ✅ |

### 10.8 🛡️ ESTRATÉGIA ANTI-QUEBRA

#### Regras de Deploy

```
ANTES de qualquer deploy à produção:
1. [ ] npm run build (zero errors)
2. [ ] npm run test (zero failures)
3. [ ] supabase db lint (zero warnings)
4. [ ] Validar que migration não altera schema auth.*
5. [ ] Validar que migration tem smoke test no final
6. [ ] Testar login de mecânico após migration
7. [ ] Testar acesso cross-tenant (deve falhar)
8. [ ] Testar resolução de domínio/slug anon
```

#### Guardrails de Código

| Regra | Enforcement |
|-------|------------|
| Toda mutation deve ter `onError` handler | ESLint custom rule |
| Toda RPC SECURITY DEFINER deve ter `SET search_path = public` | Migration lint |
| Todo hook Supabase deve filtrar por `empresa_id` | Code review checklist |
| Toda edge function deve validar JWT | `requireUser()` shared helper |
| Nenhuma query unbounded em produção | `.limit()` obrigatório |
| Nenhuma comparação de senha client-side | Banido via lint/grep |

#### Rollback Plan

| Cenário | Ação |
|---------|------|
| V8 migration falha | `supabase migration repair --status reverted 20260411300000` |
| Login de mecânico quebra | Revert RPC via `CREATE OR REPLACE` com versão anterior |
| Cross-tenant leak detectado | Emergency: `ALTER TABLE X ENABLE ROW LEVEL SECURITY; ALTER TABLE X FORCE ROW LEVEL SECURITY;` |
| Edge function down | Revert via `supabase functions deploy <name>` com versão anterior |

### 10.9 📋 CHECKLIST FINAL DE PRODUÇÃO

#### ✅ PRONTO PARA DEPLOY (V8)

- [x] REVOKE SELECT global de anon executado
- [x] 33 tabelas com policies `can_access_empresa()` (substituiu USING(true))
- [x] 36 tabelas auxiliares com FORCE RLS
- [x] RPC `validar_credenciais_mecanico_servidor` usa bcrypt
- [x] `PainelMecanico.tsx` usa RPC server-side para validação
- [x] `PortalMecanicoOS.tsx` usa RPC server-side para validação
- [x] Edge function `mecanico-device-auth` usa RPC bcrypt
- [x] Acesso anon revogado de RPCs de autenticação
- [x] 5 indexes de performance criados
- [x] Smoke test no final da migration
- [x] Detection de `USING(true)` corrigida para incluir `(true)` com parênteses

#### ⚠️ REQUER AÇÃO PÓS-DEPLOY

- [ ] Regenerar `types.ts` com `supabase gen types typescript --linked`
- [ ] Executar testes de smoke em staging
- [ ] Validar login de mecânico (web + mobile)
- [ ] Validar que anon não pode ler tabelas sensíveis
- [ ] Validar cross-tenant isolation
- [ ] Monitorar `log_validacoes_senha` por 24h para falhas bcrypt
- [ ] Monitorar `audit_logs` para ações suspeitas

#### ❌ BLOQUEIOS PARA V9

- [ ] DROP `mecanicos.senha_acesso` (após confirmação zero consumers)
- [ ] Input validation em 3 edge functions
- [ ] Soft-delete em `owner-data-control`
- [ ] Cobertura de testes > 30%
- [ ] `.limit()` em todos hooks unbounded

---

## RESUMO DE ALTERAÇÕES DESTA AUDITORIA

### Arquivos Modificados

| Arquivo | Alteração |
|---------|----------|
| `supabase/migrations/20260411300000_auditoria_v8_critical_hardening.sql` | 5 bugs corrigidos: qual detection, array comparison, solicitacoes_manutencao, redundant policies, RPC bcrypt rewrite |
| `src/pages/PainelMecanico.tsx` | Comparação plaintext → RPC `verificar_senha_mecanico` (async) |
| `src/pages/PortalMecanicoOS.tsx` | Comparação plaintext → RPC `verificar_senha_mecanico` (async) |
| `supabase/functions/mecanico-device-auth/index.ts` | SELECT+timingSafeCompare → RPC `verificar_senha_mecanico` |

### Bugs Encontrados e Corrigidos na V8

| # | Bug | Severidade | Correção |
|---|-----|-----------|---------|
| 1 | `qual = 'true'` não detecta `'(true)'` (PostgreSQL serializa com parênteses) | 🔴 CRÍTICO | `lower(coalesce(trim(qual), '')) IN ('true', '(true)')` |
| 2 | `roles != '{service_role}'` comparação string vs name[] | 🟡 MÉDIO | `NOT (roles @> ARRAY['service_role']::name[])` |
| 3 | `solicitacoes_manutencao` ausente da lista de cleanup SEC-CRITICAL-002 | 🔴 CRÍTICO | Adicionada ao array junto com `solicitacoes` |
| 4 | Policies redundantes: `v8_tenant_select_X` (SELECT) + `v8_tenant_write_X` (ALL) | 🟡 MÉDIO | Policy única `v8_tenant_all_X` (FOR ALL) |
| 5 | SEC-004 DROP `senha_acesso` PREMATURO — RPC ainda usa plaintext | 🔴 CRITICAL | RPC reescrita com bcrypt + fallback on-the-fly migration |
| 6 | Frontend `PainelMecanico.tsx` comparação plaintext client-side | 🔴 CRITICAL | Migrado para `supabase.rpc('verificar_senha_mecanico', ...)` |
| 7 | Frontend `PortalMecanicoOS.tsx` comparação plaintext client-side | 🔴 CRITICAL | Idem |
| 8 | Edge function `mecanico-device-auth` SELECT senha_acesso + timingSafeCompare | 🔴 CRITICAL | Migrado para RPC `verificar_senha_mecanico` |
| 9 | Smoke test verificava DROP de coluna (que não ocorre mais) | 🟡 MÉDIO | Verifica presença de `senha_hash` na definição da RPC |

---

**Documento gerado em:** 12/04/2026
**Próxima auditoria:** Após deploy V8 + V9
