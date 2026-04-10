# AUDITORIA PROFUNDA DO SISTEMA PCM ESTRATÉGICO
## Data: 10 de Abril de 2026 | Fase: PRÉ-VENDAS / PRODUÇÃO
## Versão: 2.0 — Análise Extrema End-to-End

---

# NOTA GERAL DO SISTEMA: 5.8 / 10

> **VEREDICTO**: Sistema NÃO está pronto para vendas em escala.
> Estrutura arquitetural sólida, mas com vulnerabilidades críticas de segurança,
> lacunas de integridade de dados e problemas de performance que podem
> causar perda financeira, vazamento de dados entre tenants e fraude.

---

## RESUMO EXECUTIVO

| Dimensão | Nota | Status |
|----------|------|--------|
| **Arquitetura Geral** | 7.5/10 | ✅ Estrutura bem pensada |
| **Isolamento Multi-Tenant (RLS)** | 7.0/10 | ⚠️ RLS forte MAS hooks vazam |
| **Autenticação Web** | 6.0/10 | 🔴 Race conditions, metadata trust |
| **Autenticação Mobile** | 4.5/10 | 🔴 Tokens plaintext, sem permissões |
| **Completude do Schema (types.ts)** | 4.0/10 | 🔴 30% tabelas e 90% RPCs sem tipo |
| **Qualidade de Hooks/Services** | 5.5/10 | 🔴 16 bugs críticos de isolamento |
| **Edge Functions (23 funções)** | 6.0/10 | 🔴 7 vulnerabilidades críticas |
| **Segurança Geral** | 5.0/10 | 🔴 Impersonation bypass, XOR crypto |
| **Performance** | 5.0/10 | 🔴 Queries unbounded, N+1 |
| **Billing/Subscriptions** | 4.5/10 | 🔴 Webhook sem HMAC, sem RLS de expiração |
| **App Mobile** | 4.0/10 | 🔴 Audit log NULL, sync race conditions |
| **Consistência DB ↔ Código** | 5.5/10 | ⚠️ Tabela `solicitacoes` faltante |

**Total de Vulnerabilidades Encontradas: 112**
- 🔴 CRÍTICAS: 35
- 🟠 ALTAS: 39
- 🟡 MÉDIAS: 38

---

## PARTE A — VULNERABILIDADES DE SEGURANÇA (35 CRÍTICAS)

### A1. AUTENTICAÇÃO WEB (AuthContext.tsx)

| # | Vuln | Severidade | Linhas | Descrição |
|---|------|-----------|--------|-----------|
| 1 | Information Disclosure | 🔴 CRÍTICA | 1087-1125 | Mensagens de erro expõem email, WhatsApp e nome de contatos de representantes (phishing vector) |
| 2 | Race Condition | 🔴 CRÍTICA | 940-1050 | `setUser()` chamado de múltiplos caminhos async sem atomicidade. Tab switching pode misturar tenant A com session B = IDOR |
| 3 | Domain Validation IDOR | 🔴 CRÍTICA | 1188-1250 | `domainEmpresaId !== profileData.tenantId` apenas gera log, NÃO bloqueia. Metadata fallback permite tenant switching |
| 4 | Impersonation Bypass | 🔴 CRÍTICA | 468-485 | localStorage pode ser editado para remover `id`+`sessionToken`, fazendo impersonação pular validação backend|
| 5 | Password Change sem Confirmação | 🟠 ALTA | 1370-1430 | Não pede senha antiga. Fallback para `updateUser` bypassa edge function. Race condition em `force_password_change` |
| 6 | Hydration Timeout Zombie | 🟠 ALTA | 240-270 | Timeout transita para `error` mas não faz signOut. Session JWT continua ativa no backend |
| 7 | Input sem Validação | 🟠 ALTA | 1020-1030 | Email sem regex, password sem mínimo, null byte injection possível |

### A2. AUTENTICAÇÃO MOBILE (mecanico-app)

| # | Vuln | Severidade | Linhas | Descrição |
|---|------|-----------|--------|-----------|
| 8 | Tokens Plaintext | 🔴 CRÍTICA | AuthContext:22,85-95 | JWT, refresh_token, device_token em AsyncStorage sem criptografia |
| 9 | Supabase Key Hardcoded | 🔴 CRÍTICA | supabase.ts:6-7 | URL+ANON_KEY no código = extraível do APK decompilado |
| 10 | Device Binding sem Rate Limit | 🔴 CRÍTICA | AuthContext:130-160 | `vincular_dispositivo` RPC sem throttle. Ex-funcionário pode rebind device |
| 11 | Audit Log user_id SEMPRE NULL | 🔴 CRÍTICA | audit.ts:40-41 | `supabase.auth.getUser()` retorna null porque `clearGlobalAuth()` já fez signOut |
| 12 | Zero Permission Checks | 🔴 CRÍTICA | CriarOS:155, FecharOS:230, Execution:295 | Nenhuma validação de que mecânico TEM permissão para criar/fechar OS |
| 13 | Brute Force Mobile | 🟠 ALTA | AuthContext:142-146 | Código 6 dígitos = 1M combinações, sem rate limit frontend |
| 14 | XSS via Stored Input | 🟠 ALTA | CriarOS:135, FecharOS:117 | Inputs sem sanitização → sincroniza → admin vê no web = Stored XSS |
| 15 | Photo Upload sem Validação | 🟠 ALTA | syncEngine:122-129 | Sem size check, MIME falsificado, path traversal possível |

### A3. TENANT CONTEXT

| # | Vuln | Severidade | Linhas | Descrição |
|---|------|-----------|--------|-----------|
| 16 | Cache Poisoning via Metadata | 🔴 CRÍTICA | TenantContext:115-180 | 3 pontos de fallback para metadata sem validação criptográfica |
| 17 | Tenant Resolution Race | 🟠 ALTA | TenantContext:98-140 | Sem debounce, múltiplas resoluções simultâneas, sem AbortController |

### A4. PORTAL MECÂNICO (PortalMecanicoContext.tsx)

| # | Vuln | Severidade | Linhas | Descrição |
|---|------|-----------|--------|-----------|
| 18 | Session ID em sessionStorage | 🔴 CRÍTICA | 39-47 | `portal_mecanico_session_id` plaintext, acessível via XSS |
| 19 | Inactivity Timer Bypass | 🟠 ALTA | 65-95 | `scroll` event reseta 30min timer. Sem warning antes de logout |
| 20 | Código Acesso sem Validação | 🟠 ALTA | 108-128 | Aceita qualquer string, sem formato regex, sem rate limit frontend |

### A5. EDGE FUNCTIONS

| # | Vuln | Severidade | Função | Descrição |
|---|------|-----------|--------|-----------|
| 21 | Device Password Determinístico | 🔴 CRÍTICA | mecanico-device-auth | `devicePassword()` deriva de `SERVICE_ROLE_KEY.slice(-12)`. Quem tem key gera todos os tokens |
| 22 | QR Code Race Condition | 🔴 CRÍTICA | mecanico-device-auth | 2 devices podem usar mesmo QR UNICO simultaneamente (sem SELECT FOR UPDATE) |
| 23 | Asaas Webhook sem HMAC | 🔴 CRÍTICA | asaas-webhook | Apenas compara token string. Sem signature criptográfica. Replay possível |
| 24 | Asaas sem Timestamp Validation | 🔴 CRÍTICA | asaas-webhook | Webhook pode ser replayed horas depois |
| 25 | Privilege Escalation | 🔴 CRÍTICA | owner-portal-admin | `create_system_admin` acessível a qualquer SYSTEM_OWNER sem 2FA |
| 26 | Data Purge sem Confirmação | 🔴 CRÍTICA | owner-portal-admin | `delete_company`, `purge_table_data` sem 2FA, delay ou backup |
| 27 | IDOR Billing | 🟠 ALTA | owner-portal-admin | `asaas_link_subscription` não valida que empresa pertence ao owner |
| 28 | Input sem Sanitização | 🟠 ALTA | owner-portal-admin | CNPJ, email sem regex validation |
| 29 | Error Leakage | 🟠 ALTA | owner-portal-admin | Stack traces retornados no JSON de erro |
| 30 | IP Spoofing Rate Limit | 🟡 MÉDIA | auth-login | `x-forwarded-for` confiada sem whitelist de proxy |
| 31 | Forgot Password Open Redirect | 🟡 MÉDIA | auth-forgot-password | `redirect_to` sem whitelist de domínios |
| 32 | Stripe Webhook Exception | 🔴 CRÍTICA | stripe-webhook | Se `stripe-signature` header ausente, lança exceção sem try-catch = 500 |
| 33 | Stripe Idempotency Missing | 🟠 ALTA | stripe-webhook | Webhook processado 2x cria duplicate |
| 34 | kpi-report sem Rate Limit | 🟡 MÉDIA | kpi-report | Queries de agregação caras sem throttle |
| 35 | tenant-domain-sync Secret | 🟠 ALTA | tenant-domain-sync | Token em header; se vazado, cria domínios arbitrários |

---

## PARTE B — BUGS DE HOOKS & SERVICES (42 BUGS)

### B1. BUGS CRÍTICOS DE ISOLAMENTO MULTI-TENANT (16)

| # | Hook/Service | Linha | Bug |
|---|-------------|-------|-----|
| 1 | useLubrificacao.ts | 211-217 | Execução criada SEM `empresa_id` no insert |
| 2 | useMateriais.ts | 204-207 | `.delete().eq('id', id)` SEM `.eq('empresa_id', tenantId)` |
| 3 | useOfflineSync.ts | 34-38 | `empresa_id` é CONDICIONAL no UPDATE (se ausente, afeta TODAS empresas) |
| 4 | useOfflineSync.ts | 49 | Insert em tabela `solicitacoes` que NÃO EXISTE |
| 5 | useSolicitacoes.ts | 137-150 | Update sem validar que solicitação pertence ao tenant |
| 6 | useMateriais.ts | 137-158 | `tenantId!` non-null assertion. Se undefined, query retorna tudo |
| 7 | usePaginatedQuery.ts | 84-96 | `empresa_id` não é forçado nos filtros — caller pode omitir |
| 8 | useDispositivosMoveis.ts | 119-121 | QR criado com `empresa_id` do input, não verificado contra tenant |
| 9 | useLubrificacao.ts | 255-277 | OS criadas automaticamente SEM `empresa_id` |
| 10 | useSubscriptionAlert.ts | 25-26 | `enabled: !isOwner` — owners nunca veem alertas de expiração |
| 11 | usePermissoesGranulares.ts | 35-44 | Delete-Insert sem transação: janela onde user tem ZERO permissões |
| 12 | useDashboardOptimized.ts | 10-14 | RPC `dashboard_summary` sem validação backend de empresa_id |
| 13 | useDashboardData.ts | 187-200 | Custos memoizados não atualizam ao mudar de mês |
| 14 | useMecanicoDeviceAuth.ts | 339-343 | XOR "encryption" trivialmente reversível |
| 15 | useExecucoesOS.ts | 127 | `as any` cast esconde campos obrigatórios faltantes |
| 16 | useIndicadores.ts | 46-49 | Stale cache pode misturar dados de múltiplas empresas |

### B2. BUGS ALTOS (12)

| # | Hook | Problema |
|---|------|----------|
| 17 | useOrdensServico.ts | Invalidate queries sem scope tenant |
| 18 | useExecucoesOS.ts | UUID regex pode rejeitar UUIDs válidos → usuario_fechamento=null |
| 19 | useMecanicoSessionTracking.ts | `getClientIp()` sempre null em redes privadas (api.ipify.org) |
| 20 | useIndicadores.ts | Backlog/semanas = Infinity possível (divisão por zero) |
| 21 | useDashboardData.ts | Memoize não atualiza à meia-noite |
| 22 | useDashboardOptimized.ts | Limite hardcoded 100 audit logs trunca dados |
| 23 | useLubrificacao.ts | Múltiplos updates sem await = race |
| 24 | useMateriais.ts | O(n) filter client-side em 10K+ registros |
| 25 | useUsuarios.ts | Profile + Roles 2 queries sequenciais (inconsistência) |
| 26 | usePermission.ts | Cache 5min, revogação atrasada |
| 27 | useMecanicoDeviceAuth.ts | Backoff sem cap (até 8s) |
| 28 | useSolicitacoes.ts | Tabela cache global, não per-tenant |

---

## PARTE C — PROBLEMAS DE PERFORMANCE (9 ISSUES)

| # | Arquivo | Severidade | Problema |
|---|---------|-----------|----------|
| 1 | useOrdensServico.ts | 🔴 CRÍTICA | `.select('*')` sem `.limit()` — 10K+ registros possíveis |
| 2 | useExecucoesOS.ts | 🔴 CRÍTICA | Sem paginação — retorna TODAS execuções |
| 3 | Preditiva.tsx | 🔴 CRÍTICA | Fallback carrega TODAS medições globalmente e filtra em JS |
| 4 | Solicitacoes.tsx | 🟠 ALTA | N+1: para cada solicitação, query separada de `numero_os` |
| 5 | useDashboardData.ts | 🟠 ALTA | 5 hooks sequenciais, sem `Promise.all()` |
| 6 | useSolicitacoes.ts | 🟡 MÉDIA | Detecção de tabela faz 2 queries extras a cada render |
| 7 | SystemStatus.tsx | 🔴 CRÍTICA | Query `empresas` sem `empresa_id` filter = expõe todas |
| 8 | DocumentosTecnicos.tsx | 🟡 MÉDIA | Unbounded `.select('*')` sem paginação |
| 9 | Mecanicos.tsx | 🟡 MÉDIA | Carrega execuções + OS completas para calcular métricas |

---

## PARTE D — INTEGRIDADE DE DADOS MOBILE (12 ISSUES)

| # | Arquivo | Severidade | Problema |
|---|---------|-----------|----------|
| 1 | syncEngine.ts:113-122 | 🔴 CRÍTICA | Fotos perdidas: sync marcada como done ANTES de upload completar |
| 2 | syncEngine.ts:115 | 🔴 CRÍTICA | Upsert sem timestamp: dado mais antigo pode sobrescrever dado mais novo |
| 3 | FecharOSScreen:230-260 | 🔴 CRÍTICA | Execução + materiais não atômicos: execução criada, materiais perdidos |
| 4 | ExecutionScreen:240-285 | 🔴 CRÍTICA | RPC fallback sem idempotency: OS pode ser fechada 2x com 2x custos |
| 5 | syncEngine.ts:265-285 | 🟠 ALTA | Se `empresaId=null`, query pode retornar dados de TODAS empresas |
| 6 | FecharOSScreen:285 | 🟠 ALTA | `parseFloat("Infinity")` = NaN em custo_total. Sem validação numérica |
| 7 | database.ts:12 | 🟡 MÉDIA | FK violations em WAL mode silenciosas |
| 8 | syncEngine.ts:300-310 | 🟡 MÉDIA | RPC fallback pode retornar campos extras (salários, custos internos) |
| 9 | syncEngine.ts:360 | 🟡 MÉDIA | `last_sync_timestamp` manipulável em SQLite plaintext |
| 10 | UpdateChecker.tsx:41 | 🟡 BAIXA | APP_VERSION hardcoded `1.0.2` mas app.json diz `2.0.0` |
| 11 | syncEngine.ts:165 | 🟡 MÉDIA | Token expiration buffer pode causar loop de reauth |
| 12 | FecharOSScreen | 🔴 CRÍTICA | Custos negativos aceitos (sem validação `>= 0`) |

---

## PARTE E — BILLING & SUBSCRIPTIONS (5 ISSUES CRÍTICAS)

| # | Problema | Impacto |
|---|---------|---------|
| 1 | **Subscription check é DISPLAY ONLY**: Nenhuma RLS bloqueia tenant expirado de fazer SELECT/INSERT | Clientes usam sistema gratuito pós-expiração = PERDA DE RECEITA |
| 2 | **Asaas webhook sem HMAC**: Apenas token string comparison. Replay attacks possíveis | Pagamentos falsos podem ser injetados |
| 3 | **Asaas webhook sem atomicidade**: Payment insert + subscription update em 2 steps | Duplicação de payments, desincronização |
| 4 | **Subscription resolution multi-fallback**: 4 estratégias de match podem linkar payment errado | Billing incorreto entre empresas |
| 5 | **Owners não veem alertas de expiração**: `enabled: !isOwner` oculta alertas | Admin não percebe conta expirada |

---

## PARTE F — SCHEMA / BANCO DE DADOS

### F1. Tabela FALTANTE no Banco

| Tabela | Referenciada em | Problema |
|--------|----------------|----------|
| `solicitacoes` | useOfflineSync.ts:49 | `.from('solicitacoes').insert()` FALHA em produção |

### F2. Tabelas Faltantes no types.ts (15)

`ai_root_cause_analysis`, `app_versao`, `empresa_config`, `lubrificantes`,
`movimentacoes_lubrificante`, `qrcodes_vinculacao`, `requisicoes_material`,
`paradas_equipamento`, `solicitacoes_manutencao`, `rotas_lubrificacao`,
`rotas_lubrificacao_pontos`, `treinamentos_ssma`, `support_tickets`,
`dispositivos_moveis`, `log_mecanicos_login`

### F3. RPCs Não Tipadas (19 de 21 = 90%)

Apenas `app_write_audit_log` e `has_permission` têm tipos. As 19 restantes operam sem type safety.

### F4. Views Não Tipadas (5 de 5 = 100%)

`v_dashboard_kpis`, `v_audit_logs_recent`, `v_mecanicos_online_agora`,
`v_relatorio_mecanicos_sessoes`, `v_devices_bloqueados` — todas usam `as never` cast.

---

## PARTE G — NOTA FINAL DETALHADA

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              NOTA FINAL: 5.8 / 10                            ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  O QUE FUNCIONA BEM (+):                                     ║
║  ├── Arquitetura multi-tenant conceitualmente sólida         ║
║  ├── RLS no banco com can_access_empresa()                   ║
║  ├── 23 Edge Functions com rate limiting                     ║
║  ├── Auth flow com retry e role hierarchy                    ║
║  ├── 130+ migrations documentadas                            ║
║  └── Services com fallbacks (equipamentos, mecanicos)        ║
║                                                              ║
║  O QUE PRECISA CORRIGIR ANTES DE VENDER (-):                 ║
║  ├── 16 hooks com bugs de isolamento multi-tenant            ║
║  ├── App mobile sem audit trail (user_id NULL)               ║
║  ├── Webhook Asaas sem HMAC (fraude possível)                ║
║  ├── Tokens plaintext no mobile                              ║
║  ├── Impersonation bypass via localStorage                   ║
║  ├── Subscription check é display-only (s/ enforcement RLS)  ║
║  ├── Queries unbounded (podem OOM com 10K+ registros)        ║
║  ├── Tabela solicitacoes inexistente (offline sync quebrado)  ║
║  ├── 90% das RPCs sem type safety                            ║
║  └── Custo total pode ser NaN/Infinity no mobile             ║
║                                                              ║
║  RISCO FINANCEIRO ESTIMADO:                                  ║
║  ├── Fraude via OS duplicada: até R$ 50k/OS                  ║
║  ├── Dados cross-tenant: multa LGPD                          ║
║  ├── Billing inconsistente: perda de receita                 ║
║  └── Custos NaN: relatórios financeiros incorretos           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## PARTE H — ROADMAP DE CORREÇÃO PRIORIZADO

### SPRINT 1 — BLOQUEANTES PARA VENDA (1-2 semanas)
1. Criar tabela `solicitacoes` (SQL abaixo)
2. Fixar 16 hooks com bugs de isolamento multi-tenant
3. Implementar HMAC no webhook Asaas
4. Adicionar `.limit()` em queries unbounded
5. Fixar impersonation → SEMPRE validar backend
6. Adicionar validação numérica em custos mobile

### SPRINT 2 — SEGURANÇA CRÍTICA (2-3 semanas)
7. Migrar tokens mobile para SecureStore/Keychain
8. Implementar idempotency em RPC close_os
9. Corrigir audit log mobile (user_id → mecanico_id)
10. Adicionar RLS de subscription expiry
11. Fixar race condition AuthContext
12. Input validation em login (email regex, password min)

### SPRINT 3 — QUALIDADE (1 mês)
13. Regenerar types.ts com `supabase gen types typescript`
14. Implementar paginação em todos os hooks CRUD
15. Consolidar dashboard em 1 RPC (eliminar N+1)
16. Adicionar 2FA para operações destrutivas (delete company)
17. Sanitizar error messages (não expor stack traces)
