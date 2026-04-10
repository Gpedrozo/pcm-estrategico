# 🔒 AUDITORIA RLS COMPLETA — PCM Estratégico Supabase
**Data:** 10/04/2026  
**Auditor:** Senior Database Security Auditor  
**Escopo:** Todas as tabelas `public.*` com análise de todas as 130+ migrações

---

## SUMÁRIO EXECUTIVO

| Severidade | Qtd | Descrição |
|:---:|:---:|---|
| 🔴 CRÍTICO | 8 | Vazamento cross-tenant confirmado, acesso irrestrito |
| 🟠 ALTO | 6 | FORCE RLS ausente, isolamento fraco |
| 🟡 MÉDIO | 5 | Inconsistências de padrão, riscos teóricos |
| ✅ OK | ~50 | Isolamento correto via `can_access_empresa()` ou `current_empresa_id()` |

---

## 1. DEFINIÇÃO ATUAL DE `can_access_empresa()`

**Arquivo definitivo:** `20260405000000_fix_device_jwt_empresa_id_all_tables.sql`

```sql
CREATE OR REPLACE FUNCTION public.can_access_empresa(p_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    p_empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR p_empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR p_empresa_id = NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', '')::uuid
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
               AND ur.role IN ('SYSTEM_OWNER','SYSTEM_ADMIN','MASTER_TI'))
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
               AND ur.empresa_id = p_empresa_id)
  );
$$;
```

**Grants:** `authenticated` apenas (anon revogado) ✅

### ⚠️ RISCO: `secure_rls_baseline.sql` (sem timestamp)

Este arquivo redefine `can_access_empresa(uuid)` **SEM** suporte a JWT:
```sql
-- Versão REGRESSIVA — NÃO checa JWT!
select auth.uid() is not null and (
  exists (... ur.role IN ('SYSTEM_OWNER','SYSTEM_ADMIN','MASTER_TI'))
  or exists (... ur.empresa_id = p_empresa_id)
);
```

**Se aplicado após 20260405000000**, quebraria o fluxo device auth (mobile app).  
**Recomendação:** Renomear para `20260410999999_secure_rls_baseline.sql` com a versão correta da função, ou deletar.

---

## 2. 🔴 VULNERABILIDADES CRÍTICAS

### VULN-RLS-01: `audit_logs` — Todos os logs visíveis para todos
**Migração:** `20260409200000_portal_mecanico_web_login_fix.sql:149-152`  
```sql
CREATE POLICY audit_logs_secdef_insert ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY audit_logs_secdef_select ON public.audit_logs FOR SELECT USING (true);
```
- **Impacto:** Qualquer `authenticated` user vê TODOS os audit_logs de TODAS as empresas
- **Dados expostos:** actor_email, action, table_name, record_id, metadata (old/new data)
- **FORCE RLS:** ❌ NÃO
- **Fix:** Substituir por `USING (public.can_access_empresa(empresa_id))`

---

### VULN-RLS-02: `log_mecanicos_login` — INSERT aberto cross-tenant
**Migração:** `20260409200000:119`  
```sql
CREATE POLICY log_mecanicos_login_device_insert FOR INSERT WITH CHECK (true);
```
**Coexiste com:** `log_mecanicos_login_tenant FOR ALL USING(can_access_empresa(empresa_id))` (20260410200000)  
- **Impacto:** Como policies permissivas são OR'd no Postgres, o `WITH CHECK(true)` permite INSERT para QUALQUER empresa_id
- **Fix:** `DROP POLICY log_mecanicos_login_device_insert`; o `log_mecanicos_login_tenant` já cobre INSERT

---

### VULN-RLS-03: Tabelas globais com `FOR ALL USING(true)` SEM restrição de role
**Migração:** `20260323100000_create_all_missing_tables.sql:908-920`  
```sql
CREATE POLICY "service_role_all_planos" ON public.planos FOR ALL USING (true);
CREATE POLICY "service_role_all_plans" ON public.plans FOR ALL USING (true);
CREATE POLICY "service_role_all_ip_rate_limits" ON public.ip_rate_limits FOR ALL USING (true);
CREATE POLICY "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily FOR ALL USING (true);
```
⚠️ **Estas policies NÃO têm `TO service_role`!** Apesar do nome, aplicam-se a TODAS as roles.

| Tabela | Risco |
|--------|-------|
| `planos` | Qualquer user pode CRUD todos os planos de assinatura |
| `plans` | Idem — mas sobescrito parcialmente por `plans_system_select/write` (OR'd = irrelevante) |
| `ip_rate_limits` | Qualquer user pode deletar rate limits de qualquer IP |
| `saas_metrics_daily` | Qualquer user pode ver/alterar métricas da plataforma |

**Fix:** Adicionar `TO service_role` ou substituir por `is_system_operator()`.

> **Nota:** `login_attempts`, `auth_session_transfer_tokens` também tinham esse problema mas foram **corrigidas** pela migration `20260321013000_security_advisor_critical_fixes.sql` com policies `TO service_role` + FORCE RLS.

---

### VULN-RLS-04: `lubrificantes` e `movimentacoes_lubrificante` — Tenant isolation QUEBRADA
**Migração:** `20260404090000_lubrificacao_estoque_and_fields.sql`  
```sql
CREATE POLICY "lubrificantes_tenant_isolation" ON lubrificantes
  USING (empresa_id = (current_setting('request.jwt.claims', true)::json->>'empresa_id')::uuid);
```
- **`current_setting('request.jwt.claims')`** NÃO é setado pelo Supabase client padrão
- No contexto PostgREST, `request.jwt.claims` pode estar vazio, resultando em `NULL::uuid`
- `empresa_id = NULL` é sempre FALSE → tabela pode estar **totalmente bloqueada**
- Ou em certas configs, pode retornar string não-UUID → erro runtime
- **NÃO** checar `app_metadata` → device auth mobile NÃO funciona
- **FORCE RLS:** ❌ NÃO
- **Fix:** Substituir ambas as tabelas por `can_access_empresa(empresa_id)`

---

### VULN-RLS-05: `medicoes_preditivas` — UPDATE aberto cross-tenant
**Migração:** `20260404020200_preditiva_update_rls_and_audit.sql`  
```sql
CREATE POLICY "tenant_update_medicoes_preditivas"
  ON public.medicoes_preditivas FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
```
- **Impacto:** Qualquer authenticated user pode UPDATE qualquer medição preditiva de qualquer empresa
- Sobrepõe policies mais restritivas existentes (OR permissivo)
- **Fix:** Substituir por `USING (public.can_access_empresa(empresa_id))`

---

### VULN-RLS-06: `mecanicos_rate_limit_state` e `mecanicos_blocked_devices` — RLS habilitada sem policies
**Migração:** `20260409200000:107-108`  
```sql
ALTER TABLE public.mecanicos_rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mecanicos_blocked_devices ENABLE ROW LEVEL SECURITY;
-- NENHUMA CREATE POLICY para estas tabelas!
```
- **Impacto:** Tabelas completamente bloqueadas para `authenticated` e `anon`
- Somente `service_role` (bypass RLS) consegue operar
- Se RPCs ou triggers SECURITY DEFINER acessam → funciona, mas acesso direto falha
- **Fix:** Se operadas apenas por RPCs/triggers security definer, está OK. Se não, adicionar policies.

---

### VULN-RLS-07: `log_validacoes_senha` e `log_tentativas_login` — Somente INSERT aberto
**Migração:** `20260409200000:116-122`  
```sql
CREATE POLICY log_validacoes_insert ON public.log_validacoes_senha FOR INSERT WITH CHECK (true);
CREATE POLICY log_tentativas_insert ON public.log_tentativas_login FOR INSERT WITH CHECK (true);
```
- `WITH CHECK (true)` no INSERT = qualquer user pode inserir log falso para qualquer empresa
- Sem policy SELECT = tabelas bloqueadas para leitura
- **FORCE RLS:** ❌ NÃO
- **Fix:** Restringir INSERT a `service_role` ou via `can_access_empresa(empresa_id)`

---

### VULN-RLS-08: `empresas` expõe dados via `anon` SELECT
**Migração:** `20260317062000_empresas_slug_public_lookup_policy.sql`  
```sql
CREATE POLICY empresas_select_by_slug_anon ON public.empresas
  FOR SELECT TO anon
  USING (slug IS NOT NULL AND length(trim(slug)) > 0);
```
- **Impacto:** Usuários não-autenticados podem enumerar TODAS as empresas com slug
- Expõe: `id`, `nome`, `slug`, `cnpj`, `status`, `max_dispositivos_moveis`, etc.
- **Mitigação parcial:** Usar RPC `resolve_empresa_id_by_slug()` que retorna apenas o UUID
- **Fix:** Restringir colunas visíveis via view ou limitar a RPC apenas

---

## 3. 🟠 VULNERABILIDADES ALTAS

### VULN-RLS-09: Maioria das tabelas sem `FORCE ROW LEVEL SECURITY`

`FORCE RLS` garante que **mesmo o table owner** respeita RLS. Sem FORCE, functions/triggers rodando como owner bypassa policies.

**Tabelas com FORCE (via 20260312 dynamic sweep + fixups):** Todas com `empresa_id` existentes antes de março/2026 ✅

**Tabelas criadas DEPOIS sem FORCE:**

| Tabela | Criada em | FORCE? |
|--------|-----------|--------|
| `dispositivos_moveis` | 20260325 | ❌ |
| `qrcodes_vinculacao` | 20260325 | ❌ |
| `paradas_equipamento` | 20260404 | ❌ |
| `requisicoes_material` | 20260404 | ❌ |
| `rotas_lubrificacao` | 20260404 | ❌ |
| `rotas_lubrificacao_pontos` | 20260404 | ❌ |
| `lubrificantes` | 20260404 | ❌ |
| `movimentacoes_lubrificante` | 20260404 | ❌ |
| `treinamentos_ssma` | 20260408 | ❌ |
| `contracts` | 20260405 | ❌ |
| `contract_versions` | 20260405 | ❌ |
| `app_versao` | 20260404 | ❌ |
| `audit_logs` | 20260409 | ❌ |
| `profiles` | 20260116 | ❌ |
| `user_roles` | 20260116 | ❌ |
| `security_logs` | 20260116 | ❌ |
| `rate_limits` | 20260116 | ❌ |

**Fix:** Executar `ALTER TABLE ... FORCE ROW LEVEL SECURITY` para todas.

---

### VULN-RLS-10: Isolamento via `profiles.empresa_id` é FRACO

Várias tabelas usam este padrão:
```sql
USING (empresa_id IN (
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
))
```

**Problema:** `profiles.empresa_id` é um campo single-value. Se um user pertence a MÚLTIPLAS empresas (via `user_roles` ou `membros_empresa`), este padrão **restringe demais** (mostra apenas 1 empresa). Pior: se o user trocar de empresa no JWT mas não atualizar profiles, fica inconsistente.

**Tabelas afetadas:**
- `dispositivos_moveis` (4 policies)
- `qrcodes_vinculacao` (4 policies)
- `treinamentos_ssma` (4 policies)
- `contracts` (SELECT)
- `contract_versions` (SELECT)

**Fix:** Substituir por `can_access_empresa(empresa_id)` para consistência.

---

### VULN-RLS-11: `rotas_lubrificacao*` policies com JWT parsing excessivamente complexo

**Migração:** `20260407180000_fix_rotas_lubrificacao_rls_jwt.sql`

A policy tenta 4 claims diferentes + 4 role paths:
```sql
USING (empresa_id = NULLIF(COALESCE(
  auth.jwt() ->> 'empresa_id',
  auth.jwt() ->> 'tenant_id',
  auth.jwt() -> 'app_metadata' ->> 'empresa_id',
  auth.jwt() -> 'app_metadata' ->> 'tenant_id'
), '')::uuid
OR UPPER(COALESCE(
  auth.jwt() ->> 'role',
  auth.jwt() ->> 'user_role',
  auth.jwt() -> 'app_metadata' ->> 'role',
  auth.jwt() -> 'user_metadata' ->> 'role', ''
)) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN'))
```

**Problemas:**
- `auth.jwt() ->> 'role'` no Supabase retorna a role Postgres (`authenticated`/`anon`), NÃO a role da aplicação
- Se alguém injetar `role: SYSTEM_OWNER` via custom claims, bypassa isolamento
- Não usa `can_access_empresa()` nem `user_roles` table
- **Fix:** Substituir por `can_access_empresa(empresa_id)`

---

### VULN-RLS-12: `mecanicos` policy usa JWT `role` claim diretamente
**Migração:** `20260404080100_fix_mecanicos_rls_device_jwt_path.sql`
```sql
CREATE POLICY mecanicos_select_tenant ON public.mecanicos
  FOR SELECT TO authenticated USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN')
  );
```
Mesmo problema: `auth.jwt() ->> 'role'` é a role Postgres, não app role.  
**Fix:** Substituir admin check por `public.is_system_operator()` ou `can_access_empresa()`.

---

### VULN-RLS-13: `contracts` — authenticated users não podem UPDATE/INSERT/DELETE
**Migração:** `20260405235000_create_contracts_and_versions.sql`
```sql
-- Apenas service_role tem FOR ALL
CREATE POLICY contracts_service_all ON public.contracts FOR ALL TO service_role USING (true);
-- Authenticated só tem SELECT
CREATE POLICY contracts_tenant_select ON public.contracts FOR SELECT TO authenticated ...;
```
Não é vulnerabilidade de segurança, mas impacto funcional: tenants não podem criar/editar contratos via client.

---

### VULN-RLS-14: `app_versao` — SELECT aberto para `anon`
**Migração:** `20260404120000_app_versao_table.sql`
```sql
CREATE POLICY app_versao_select ON public.app_versao
  FOR SELECT TO anon, authenticated USING (true);
```
**Avaliação:** Tabela contém apenas versão do app e URL de download. **Risco aceito** — funciona como endpoint público para verificação de versão.

---

## 4. TABELA COMPLETA: STATUS RLS POR TABELA

### Legenda
- ✅ = Correto e seguro
- ⚠️ = Funcional mas com ressalvas
- 🔴 = Vulnerável / Precisa fix imediato
- 🔒 = Bloqueado (sem policies = locked out)

### 4.1 Tabelas Core (empresa_id obrigatório)

| # | Tabela | RLS | FORCE | Mecanismo de isolamento | Policy final (migração) | Status |
|---|--------|:---:|:-----:|------------------------|------------------------|:------:|
| 1 | `empresas` | ✅ | ✅¹ | `is_control_plane_operator()` + `user_roles` | `20260324120000` | ✅ |
| 2 | `ordens_servico` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 3 | `execucoes_os` | ✅ | ✅¹ | Join via `ordens_servico.empresa_id` | `secure_rls_baseline` | ✅ |
| 4 | `execucoes_os_pausas` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 5 | `materiais` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 6 | `materiais_os` | ✅ | ✅¹ | Join via `ordens_servico.empresa_id` | `secure_rls_baseline` | ✅ |
| 7 | `equipamentos` | ✅ | ✅¹ | JWT + `can_access_empresa()` | `20260404090100` | ✅ |
| 8 | `mecanicos` | ✅ | ✅¹ | JWT direto + JWT `role` check | `20260404080100` | 🟠² |
| 9 | `areas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 10 | `plantas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 11 | `sistemas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 12 | `dados_empresa` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 13 | `empresa_config` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 14 | `contratos` | ✅ | ✅¹ | `can_access_empresa(empresa_id)` | `secure_rls_baseline` | ✅ |
| 15 | `fornecedores` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 16 | `componentes_equipamento` | ✅ | ❌ | `user_roles.empresa_id` | `20260324110000` | ⚠️ |
| 17 | `planos_lubrificacao` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 18 | `atividades_lubrificacao` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 19 | `execucoes_lubrificacao` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 20 | `movimentacoes_materiais` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 21 | `auditoria` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 22 | `configuracoes_sistema` | ✅ | ✅¹ | `is_system_owner()` | `20260301053500` | ⚠️³ |
| 23 | `ai_root_cause_analysis` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 24 | `document_layouts` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 25 | `document_sequences` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 26 | `planos_preventivos` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 27 | `atividades_preventivas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 28 | `servicos_preventivos` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 29 | `execucoes_preventivas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 30 | `templates_preventivos` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 31 | `medicoes_preditivas` | ✅ | ✅¹ | `current_empresa_id()` + **UPDATE USING(true)** | `20260404020200` | 🔴⁴ |
| 32 | `inspecoes` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 33 | `anomalias_inspecao` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 34 | `fmea` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 35 | `analise_causa_raiz` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 36 | `acoes_corretivas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 37 | `melhorias` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 38 | `documentos_tecnicos` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 39 | `permissoes_trabalho` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 40 | `incidentes_ssma` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 41 | `historico_manutencao` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 42 | `indicadores_kpi` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 43 | `maintenance_schedule` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 44 | `membros_empresa` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 45 | `enterprise_audit_logs` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 46 | `feature_flags` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 47 | `subscriptions` | ✅ | ✅¹ | `is_system_operator() OR can_access_empresa()` | `20260302241000` | ✅ |
| 48 | `support_tickets` | ✅ | ✅¹ | `is_system_operator() OR can_access_empresa()` | `20260302241000` | ✅ |
| 49 | `assinaturas` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 50 | `company_subscriptions` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 51 | `company_usage_metrics` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 52 | `billing_customers` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 53 | `billing_invoices` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 54 | `avaliacoes_fornecedores` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 55 | `permissoes_granulares` | ✅ | ✅¹ | `current_empresa_id()` + admin | `20260312193000` | ✅ |
| 56 | `solicitacoes` | ✅ | ✅ | `can_access_empresa(empresa_id)` | `20260410210000` | ✅ |

> ¹ FORCE via sweep dinâmico em `20260312193000`  
> ² `mecanicos`: usa `auth.jwt() ->> 'role'` (role Postgres, NÃO app role) — ver VULN-RLS-12  
> ³ `configuracoes_sistema`: policy `is_system_owner()` only — tenants sem acesso  
> ⁴ `medicoes_preditivas`: UPDATE policy tem `USING(true)` - cross-tenant write

### 4.2 Tabelas criadas APÓS sweep dinâmico (20260325+)

| # | Tabela | RLS | FORCE | Mecanismo | Status |
|---|--------|:---:|:-----:|-----------|:------:|
| 57 | `dispositivos_moveis` | ✅ | ❌ | `profiles.empresa_id` subquery | 🟠 |
| 58 | `qrcodes_vinculacao` | ✅ | ❌ | `profiles.empresa_id` subquery | 🟠 |
| 59 | `paradas_equipamento` | ✅ | ❌ | `user_roles.empresa_id` subquery | ⚠️ |
| 60 | `requisicoes_material` | ✅ | ❌ | `user_roles.empresa_id` subquery | ⚠️ |
| 61 | `rotas_lubrificacao` | ✅ | ❌ | JWT multi-path complexo | 🟠 |
| 62 | `rotas_lubrificacao_pontos` | ✅ | ❌ | Subquery via `rotas_lubrificacao` | 🟠 |
| 63 | `lubrificantes` | ✅ | ❌ | `current_setting('request.jwt.claims')` | 🔴 |
| 64 | `movimentacoes_lubrificante` | ✅ | ❌ | `current_setting('request.jwt.claims')` | 🔴 |
| 65 | `treinamentos_ssma` | ✅ | ❌ | `profiles.empresa_id` subquery | 🟠 |
| 66 | `contracts` | ✅ | ❌ | `profiles.empresa_id` + `service_role ALL` | ⚠️ |
| 67 | `contract_versions` | ✅ | ❌ | Join `contracts.profiles` | ⚠️ |
| 68 | `app_versao` | ✅ | ❌ | `USING(true)` SELECT (intencional) | ✅⁵ |

> ⁵ Risco aceito — tabela pública de versão do app

### 4.3 Tabelas de Log/Operação

| # | Tabela | RLS | FORCE | Policies | Status |
|---|--------|:---:|:-----:|----------|:------:|
| 69 | `audit_logs` | ✅ | ❌ | SELECT USING(true), INSERT CHECK(true) | 🔴 |
| 70 | `log_mecanicos_login` | ✅ | ✅ | `can_access_empresa` + INSERT CHECK(true) | 🔴 |
| 71 | `log_validacoes_senha` | ✅ | ❌ | INSERT CHECK(true) somente | 🔴 |
| 72 | `log_tentativas_login` | ✅ | ❌ | INSERT CHECK(true) somente | 🔴 |
| 73 | `mecanicos_rate_limit_state` | ✅ | ❌ | NENHUMA policy | 🔒 |
| 74 | `mecanicos_blocked_devices` | ✅ | ❌ | NENHUMA policy | 🔒 |
| 75 | `mecanico_login_attempts` | ✅ | ✅ | NENHUMA policy (service_role only) | ✅⁶ |
| 76 | `operational_logs` | ✅ | ❌⁷ | `current_empresa_id()` (se empresa_id NOT NULL) | ⚠️ |
| 77 | `security_logs` | ✅ | ❌ | `has_role('ADMIN')` SELECT, INSERT CHECK(true) | ⚠️ |
| 78 | `rate_limits` | ✅ | ❌ | `auth.uid() = user_id` | ⚠️ |

> ⁶ Operada exclusivamente via RPCs security definer  
> ⁷ `empresa_id` é nullable — rows com NULL escapam tenant filter

### 4.4 Tabelas Globais/Plataforma (sem empresa_id tenant)

| # | Tabela | RLS | FORCE | Policies | Status |
|---|--------|:---:|:-----:|----------|:------:|
| 79 | `profiles` | ✅ | ❌ | `auth.uid() = id` (self only) | ⚠️ |
| 80 | `user_roles` | ✅ | ❌ | `auth.uid() = user_id` (self only) | ⚠️ |
| 81 | `plans` | ✅ | ❌ | `is_system_operator()` + `USING(true)` (ORed!) | 🔴 |
| 82 | `planos` | ✅ | ❌ | `USING(true)` FOR ALL sem role | 🔴 |
| 83 | `platform_metrics` | ✅ | ❌ | `is_system_operator()` + `USING(true)` (ORed!) | 🔴 |
| 84 | `system_owner_allowlist` | ✅ | ❌ | `is_system_operator()` + `USING(true)` (ORed!) | 🔴 |
| 85 | `ip_rate_limits` | ✅ | ❌ | `USING(true)` FOR ALL sem role | 🔴 |
| 86 | `saas_metrics_daily` | ✅ | ❌ | `USING(true)` FOR ALL sem role | 🔴 |
| 87 | `login_attempts` | ✅ | ✅ | `service_role` only (fix 20260321) | ✅ |
| 88 | `auth_session_transfer_tokens` | ✅ | ✅ | `service_role` only (fix 20260321) | ✅ |
| 89 | `owner_impersonation_sessions` | ✅ | ✅ | `service_role` only (fix 20260321) | ✅ |
| 90 | `db_cleanup_runs` | ✅ | ✅ | `service_role` only (fix 20260321) | ✅ |
| 91 | `db_cleanup_run_items` | ✅ | ✅ | `service_role` only (fix 20260321) | ✅ |
| 92 | `subscription_payments` | ✅ | ✅ | `is_control_plane_operator()` + empresa match | ✅ |
| 93 | `webhook_events` | ✅ | ✅ | Nenhuma policy auth (service_role only) | ✅ |
| 94 | `permissoes` | ✅ | ❌ | Provável USING(true) ou sem policies | ⚠️ |
| 95 | `role_permissions` | ✅ | ❌ | Provável USING(true) ou sem policies | ⚠️ |
| 96 | `system_error_events` | ✅ | ❌ | empresa_id nullable | ⚠️ |

---

## 5. PADRÕES PERIGOSOS DETECTADOS

### 5.1 Múltiplos mecanismos de tenant isolation (INCONSISTÊNCIA)

```
PADRÃO A: can_access_empresa(empresa_id)     → 9 tabelas (secure_rls_baseline)  ✅ IDEAL
PADRÃO B: empresa_id = current_empresa_id()  → ~40 tabelas (20260312 sweep)     ✅ OK
PADRÃO C: empresa_id IN (user_roles)         → ~45 tabelas (20260323)           ⚠️ OK
PADRÃO D: empresa_id IN (profiles)           → 8 tabelas                        🟠 FRACO
PADRÃO E: JWT direto parsing                 → 4 tabelas (mecanicos, rotas)     🟠 FRÁGIL
PADRÃO F: current_setting('request.jwt...')  → 2 tabelas (lubrificantes)        🔴 QUEBRADO
PADRÃO G: current_setting('app.current...')  → 0 (corrigido por 20260407)       ✅ FIX APLICADO
```

**Nota sobre Padrão B vs C:** Ambos são funcionais. O sweep dinâmico de 20260312 usa `current_empresa_id()` que resolve empresa via JWT (com fallback user_roles + profiles). A migration 20260323 usa subquery em `user_roles` diretamente. Ambos coexistem como policies permissivas (ORed), o que é aceitável.

### 5.2 Policies `USING(true)` remanescentes

| Tabela | Policy | Tipo | Migração | Risco |
|--------|--------|------|----------|-------|
| `audit_logs` | `audit_logs_secdef_select` | SELECT | 20260409 | 🔴 Cross-tenant |
| `audit_logs` | `audit_logs_secdef_insert` | INSERT | 20260409 | 🔴 Cross-tenant |
| `medicoes_preditivas` | `tenant_update_medicoes_preditivas` | UPDATE | 20260404 | 🔴 Cross-tenant |
| `log_mecanicos_login` | `log_mecanicos_login_device_insert` | INSERT | 20260409 | 🔴 Cross-tenant |
| `log_validacoes_senha` | `log_validacoes_insert` | INSERT | 20260409 | 🔴 No isolation |
| `log_tentativas_login` | `log_tentativas_insert` | INSERT | 20260409 | 🔴 No isolation |
| `plans` | `service_role_all_plans` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `planos` | `service_role_all_planos` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `platform_metrics` | `service_role_all_platform_metrics` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `system_owner_allowlist` | `service_role_all_system_owner_allowlist` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `ip_rate_limits` | `service_role_all_ip_rate_limits` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `saas_metrics_daily` | `service_role_all_saas_metrics_daily` | ALL | 20260323 | 🔴 Sem `TO service_role` |
| `app_versao` | `app_versao_select` | SELECT | 20260404 | ✅ Intencional |
| `security_logs` | `System can insert logs` | INSERT | 20260116 | ⚠️ |

### 5.3 Views sem `security_invoker = true`

Views herdam a role do owner, não do caller. Sem `security_invoker = true`, RLS das tabelas base é IGNORADO.

**Views com fix aplicado (20260321013000):**
- `v_dashboard_kpis` ✅
- `v_ordens_servico_sla` ✅
- `v_custos_orcado_realizado` ✅
- `v_rls_policies_permissive_true` ✅
- `v_tenant_tables_without_rls` ✅

**Views sem fix verificado (criadas depois):**
- `v_mecanicos_online_agora` — ⚠️ Pode vazar dados cross-tenant
- `v_relatorio_mecanicos_sessoes` — ⚠️ Pode vazar dados cross-tenant
- `v_devices_bloqueados` — ⚠️ Pode vazar dados cross-tenant
- `v_audit_logs_recent` — ⚠️ Pode vazar dados cross-tenant

---

## 6. PLANO DE CORREÇÃO (PRIORIZADO)

### P0 — Corrigir HOJE (vazamento ativo)

```sql
-- 1. audit_logs: restringir SELECT/INSERT
DROP POLICY IF EXISTS audit_logs_secdef_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_secdef_insert ON public.audit_logs;
CREATE POLICY audit_logs_tenant_select ON public.audit_logs
  FOR SELECT TO authenticated USING (public.can_access_empresa(empresa_id));
CREATE POLICY audit_logs_tenant_insert ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.can_access_empresa(empresa_id));
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 2. log_mecanicos_login: remover INSERT aberto
DROP POLICY IF EXISTS log_mecanicos_login_device_insert ON public.log_mecanicos_login;
-- log_mecanicos_login_tenant já cobre INSERT via can_access_empresa

-- 3. medicoes_preditivas: remover UPDATE aberto
DROP POLICY IF EXISTS "tenant_update_medicoes_preditivas" ON public.medicoes_preditivas;
-- tenant_update de 20260312 já cobre com current_empresa_id()

-- 4. Tabelas globais: adicionar TO service_role
DROP POLICY IF EXISTS "service_role_all_planos" ON public.planos;
CREATE POLICY service_role_all_planos ON public.planos FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_role_all_plans" ON public.plans;
CREATE POLICY service_role_all_plans ON public.plans FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_role_all_ip_rate_limits" ON public.ip_rate_limits;
CREATE POLICY service_role_all_ip_rate_limits ON public.ip_rate_limits FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_role_all_saas_metrics_daily" ON public.saas_metrics_daily;
CREATE POLICY service_role_all_saas_metrics_daily ON public.saas_metrics_daily FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_role_all_platform_metrics" ON public.platform_metrics;
CREATE POLICY service_role_all_platform_metrics ON public.platform_metrics FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_role_all_system_owner_allowlist" ON public.system_owner_allowlist;
CREATE POLICY service_role_all_system_owner_allowlist ON public.system_owner_allowlist FOR ALL TO service_role USING (true);

-- 5. lubrificantes + movimentacoes_lubrificante: fix broken isolation
DROP POLICY IF EXISTS "lubrificantes_tenant_isolation" ON public.lubrificantes;
DROP POLICY IF EXISTS "lubrificantes_insert" ON public.lubrificantes;
DROP POLICY IF EXISTS "lubrificantes_update" ON public.lubrificantes;
DROP POLICY IF EXISTS "lubrificantes_delete" ON public.lubrificantes;
CREATE POLICY lubrificantes_tenant ON public.lubrificantes
  FOR ALL TO authenticated
  USING (public.can_access_empresa(empresa_id))
  WITH CHECK (public.can_access_empresa(empresa_id));
ALTER TABLE public.lubrificantes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimentacoes_lub_tenant_isolation" ON public.movimentacoes_lubrificante;
DROP POLICY IF EXISTS "movimentacoes_lub_insert" ON public.movimentacoes_lubrificante;
CREATE POLICY movimentacoes_lub_tenant ON public.movimentacoes_lubrificante
  FOR ALL TO authenticated
  USING (public.can_access_empresa(empresa_id))
  WITH CHECK (public.can_access_empresa(empresa_id));
ALTER TABLE public.movimentacoes_lubrificante FORCE ROW LEVEL SECURITY;

-- 6. log_validacoes_senha + log_tentativas_login: restringir INSERT
DROP POLICY IF EXISTS log_validacoes_insert ON public.log_validacoes_senha;
CREATE POLICY log_validacoes_service_insert ON public.log_validacoes_senha
  FOR INSERT TO service_role WITH CHECK (true);
ALTER TABLE public.log_validacoes_senha FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log_tentativas_insert ON public.log_tentativas_login;
CREATE POLICY log_tentativas_service_insert ON public.log_tentativas_login
  FOR INSERT TO service_role WITH CHECK (true);
ALTER TABLE public.log_tentativas_login FORCE ROW LEVEL SECURITY;
```

### P1 — Corrigir esta semana

```sql
-- 1. FORCE RLS em todas as tabelas sem FORCE
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'dispositivos_moveis','qrcodes_vinculacao','paradas_equipamento',
    'requisicoes_material','rotas_lubrificacao','rotas_lubrificacao_pontos',
    'treinamentos_ssma','contracts','contract_versions',
    'app_versao','componentes_equipamento','profiles','user_roles',
    'security_logs','rate_limits','mecanicos_rate_limit_state',
    'mecanicos_blocked_devices','operational_logs','system_error_events',
    'planos','plans','platform_metrics','system_owner_allowlist',
    'ip_rate_limits','saas_metrics_daily','permissoes','role_permissions'
  ]) LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 2. Padronizar dispositivos_moveis/qrcodes para can_access_empresa
-- (substituir profiles.empresa_id subquery)

-- 3. Padronizar treinamentos_ssma para can_access_empresa

-- 4. Verificar/aplicar security_invoker em views recentes
ALTER VIEW IF EXISTS public.v_mecanicos_online_agora SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_relatorio_mecanicos_sessoes SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_devices_bloqueados SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_audit_logs_recent SET (security_invoker = true);

-- 5. Fix mecanicos/rotas_lubrificacao: substituir JWT role check por is_system_operator()
```

### P2 — Padronização futura

- Convergir TODOS os mecanismos para `can_access_empresa(empresa_id)` como padrão único
- Eliminar `current_empresa_id()` em favor de `can_access_empresa()` (já que can_access_empresa verifica membership diretamente)
- Adicionar DELETE policies onde faltam
- Remover arquivo `secure_rls_baseline.sql` ou renomear com timestamp correto

---

## 7. INVENTÁRIO DE FUNÇÕES DE AUTORIZAÇÃO

| Função | Propósito | Usada por | Status |
|--------|-----------|-----------|:------:|
| `can_access_empresa(uuid)` | Verifica JWT + user_roles | secure_rls_baseline, fix_device_jwt | ✅ PRIMÁRIA |
| `current_empresa_id()` | Resolve empresa do JWT/user_roles/profiles | 20260312 sweep policies | ✅ FUNCIONAL |
| `get_current_empresa_id()` | Idem com mais fallbacks | Algumas RPCs | ✅ FUNCIONAL |
| `is_system_operator(uuid)` | SYSTEM_OWNER/ADMIN/MASTER_TI check | Owner tables, control plane | ✅ |
| `is_control_plane_operator()` | Alias para is_system_operator | empresas, admin tables | ✅ |
| `is_system_owner(uuid)` | SYSTEM_OWNER only | configuracoes_sistema | ✅ |
| `is_master_ti()` | MASTER_TI + SYSTEM_OWNER | Legacy compat | ✅ |
| `has_role(uuid, app_role)` | General role check | Legacy policies | ✅ |
| `empresa_is_active(uuid)` | Verifica status ativo | 20260312 (se existir) | ✅ OPCIONAL |

---

## 8. RESUMO FINAL

**Total de tabelas auditadas:** ~96  
**Tabelas com RLS habilitada:** ~96 (100%) ✅  
**Tabelas com FORCE RLS:** ~50 (~52%) ⚠️  
**Tabelas com vazamento cross-tenant confirmado:** 8 🔴  
**Tabelas com isolamento quebrado:** 2 (lubrificantes) 🔴  
**Tabelas bloqueadas (sem policies):** 2 🔒  
**Policies USING(true) perigosas ativas:** 14 🔴  

### Risco geral: 🔴 ALTO
Os dados de audit_logs, medições preditivas e tabelas de planos estão acessíveis cross-tenant. As correções P0 devem ser aplicadas imediatamente via nova migração.
