# PLANO DE CORREÇÃO SEGURA — PCM ESTRATÉGICO (v2 — Revisado)

> **Princípio #1:** Nenhuma correção pode quebrar funcionalidade existente.  
> **Princípio #2:** Cada passo é reversível em minutos.  
> **Princípio #3:** Validar ANTES e DEPOIS de cada mudança.  
> **Princípio #4:** Uma mudança por vez. Nunca empilhar fixes sem testar entre eles.

---

## ⚠️ ANÁLISE HONESTA DE RISCOS RESIDUAIS

> **Risco zero não existe.** Qualquer mudança em produção carrega risco. O que podemos
> fazer é tornar cada risco IDENTIFICÁVEL, REVERSÍVEL e ISOLADO.

### RISCOS REAIS QUE ESTE PLANO ENFRENTA

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | **Revogar `anon` de RPCs de mecânico QUEBRA login do portal mecânico** | **CERTA** | Portal mecânico para de funcionar | **CONFIRMADO:** PortalMecanicoContext chama `validar_credenciais_mecanico_servidor` com client ANON (sem auth). **NÃO REVOGAR.** Adicionar rate limit interno na RPC em vez disso. |
| R2 | **Remover `user_metadata` do AuthContext e algum usuário não ter dados em `user_roles`/`app_metadata`** | Média-Alta | Usuário perde acesso ao sistema | Consulta SQL obrigatória ANTES: listar todos users que dependem de `user_metadata`. Migrar para `user_roles` primeiro. |
| R3 | **Fix de `dashboard_summary` com access check bloqueia owner que não tem entry em `user_roles`** | Média | Dashboard do owner fica vazio | Consulta SQL pré-voo: verificar que owner TEM entry em `user_roles` com role SYSTEM_OWNER. Criar se não tiver. |
| R4 | **Remover fallback da `Preditiva.tsx` deixa tela silenciosamente vazia (sem erro visível)** | Alta se schema antigo | Mecânico/Admin vê tela vazia sem explicação | **NÃO remover fallback.** Em vez disso, filtrar no fallback usando `tenantId` local + adicionar warning visual. |
| R5 | **Fix de RLS em `lubrificantes` pode LIBERAR acesso que estava BLOQUEADO por policy quebrada** | Baixa | Dados ficam visíveis que antes não eram (melhoria, não quebra) | Verificar estado atual com SELECT count antes e depois. |
| R6 | **Dois deploys simultâneos (SQL + Edge Function) geram janela de inconsistência** | Baixa | Requests durante deploy podem falhar | Deploy em horário de baixo uso (madrugada). SQL primeiro, edge function depois. Nunca junto. |
| R7 | **Frontend deploy troca `empresa_id` de posição no spread e Zod `.strict()` rejeita o campo extra** | Muito Baixa | INSERT falha | Verificar se Zod usa `.strict()` ou `.passthrough()` antes de mudar spread order. |
| R8 | **FORCE ROW LEVEL SECURITY bloqueia queries de migrations/cron jobs que rodam como owner** | Baixa | Jobs de manutenção falham silenciosamente | Testar cada tabela individualmente. Cron jobs em Supabase usam `service_role` (não table owner), então provavelmente OK. |
| R9 | **Unique constraint falha se existem dados duplicados `(tipo, origem_id)` cross-tenant** | Média | Migration falha, precisa resolver duplicatas | Query de pré-validação obrigatória: `GROUP BY tipo, origem_id HAVING COUNT(DISTINCT empresa_id) > 1` |
| R10 | **Device-auth JWTs dependem de `user_metadata.empresa_id` em `can_access_empresa()`** | **CERTA** | Se removermos `user_metadata` de `can_access_empresa()`, dispositivos perdem acesso | **CONFIRMADO:** Device JWTs têm `empresa_id` em `app_metadata` E `user_metadata`. `can_access_empresa()` checa ambos. **NÃO MUDAR `can_access_empresa()`** — é a função RLS, não o AuthContext. |

### DECISÕES REVISADAS COM BASE NOS RISCOS

| Plano Original | Risco Descoberto | Nova Decisão |
|---|---|---|
| Revogar `anon` de RPCs mecânico | R1: Quebra login mecânico 100% | **CANCELADO.** Adicionar rate limit DENTRO da RPC. |
| Remover `user_metadata` do AuthContext sem pré-check | R2: Usuários perdem acesso | **CONDICIONADO** a query SQL prévia. Se > 0 dependentes → migrar primeiro. |
| Remover fallback da Preditiva.tsx | R4: Tela vazia sem erro | **SUBSTITUÍDO** por fallback que filtra por `tenantId` do contexto. |
| Mudar `can_access_empresa()` | R10: Quebra device-auth | **CANCELADO.** Função RLS fica como está. Fixes são no AuthContext (frontend). |

---

## ARQUITETURA DO PLANO

```
FASE 0 — Preparação (blindagem antes de tocar código)
FASE 1 — SQL puro (banco) — Não toca frontend, não quebra UI
FASE 2 — Edge Functions (backend) — Não toca frontend
FASE 3 — Frontend (contextos + hooks) — Mudanças cirúrgicas
FASE 4 — Mobile — Build separado
FASE 5 — Credenciais & Higiene — Pós-tudo
```

Cada fase tem:
- **Pré-condição** (o que validar antes de começar)
- **Passos atômicos** (um commit = uma mudança)
- **Teste de fumaça** (como validar que não quebrou)
- **Rollback** (como desfazer em < 2 minutos)

---

## FASE 0 — PREPARAÇÃO (Estimativa: 2-3 horas)

### 0.1 — Criar testes de fumaça automatizados

**Por quê:** O projeto tem 0 testes. Precisamos de uma rede de segurança ANTES de mudar qualquer coisa.

**O que criar:**

```
src/tests/
  smoke-auth.test.ts          → Testa que AuthContext monta sem crash
  smoke-hooks.test.ts         → Testa que hooks retornam estrutura esperada
  smoke-services.test.ts      → Testa que services exportam funções corretas
  smoke-supabase-mock.test.ts → Mock do supabase client
```

**Escopo dos testes:**
- NÃO testam lógica de negócio (isso viria depois)
- Testam que imports funcionam, componentes montam, funções existem
- Se algum fix quebrar uma assinatura de função ou um import, o teste falha

**Validação:** `npm run test` → todos passam  
**Risco de quebra:** ZERO (só adiciona arquivos, não muda nada existente)

### 0.2 — Snapshot do banco de produção

```sql
-- Executar no SQL Editor do Supabase ANTES de qualquer migration
SELECT schemaname, tablename, 
       (SELECT COUNT(*) FROM information_schema.columns c 
        WHERE c.table_schema = t.schemaname AND c.table_name = t.tablename) as col_count
FROM pg_tables t 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Salvar output em docs/SNAPSHOT_PRE_FIX_20260410.json
```

**Validação:** Arquivo gerado com ~70 tabelas listadas  
**Risco de quebra:** ZERO (somente leitura)

### 0.3 — Criar branch dedicada

```bash
git checkout -b fix/security-audit-v4-safe
```

Todas as mudanças vão nessa branch. Main permanece intocada até PR aprovado.

**Risco de quebra:** ZERO

---

## FASE 1 — SQL PURO (BANCO DE DADOS)

> **Regra de ouro:** Toda mudança SQL nesta fase é ADITIVA ou de POLICY.
> Não altera colunas, não remove tabelas, não muda functions que o frontend chama diretamente.

### Subfase 1A — Fixes de RLS (SOMENTE policies de SELECT/UPDATE)

**Por que é seguro:** Policies de RLS são camada de segurança EXTRA. Torná-las mais restritivas nunca quebra uma query — no máximo retorna menos linhas (que é o comportamento correto).

---

#### 1A.1 — Fix `audit_logs` SELECT USING(true)

```sql
-- ANTES: qualquer autenticado lê todos os audit logs
-- DEPOIS: cada tenant lê apenas os seus

BEGIN;

DROP POLICY IF EXISTS "audit_logs_policy" ON audit_logs;

CREATE POLICY "audit_logs_tenant_select"
  ON audit_logs FOR SELECT
  USING (
    empresa_id IS NOT NULL AND can_access_empresa(empresa_id)
  );

CREATE POLICY "audit_logs_platform_select"
  ON audit_logs FOR SELECT
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

COMMIT;
```

**Teste de fumaça:**
1. Login como ADMIN de um tenant → verificar que tela de auditoria (se existir) ainda carrega
2. Login como SYSTEM_OWNER → verificar que vê logs de plataforma
3. Query direta: `SELECT COUNT(*) FROM audit_logs` como autenticado → deve retornar somente logs do tenant

**Rollback (< 1 min):**
```sql
DROP POLICY IF EXISTS "audit_logs_tenant_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_platform_select" ON audit_logs;
CREATE POLICY "audit_logs_policy" ON audit_logs FOR SELECT USING (true);
```

**⚠️ Possível efeito colateral:** Se algum componente frontend espera ver logs de TODOS os tenants como um admin normal, vai mostrar lista vazia. Mas isso é o comportamento CORRETO. Se perceber regressão visual, o rollback resolve em 1 minuto.

---

#### 1A.2 — Fix tabelas de plataforma (plans, ip_rate_limits, etc.)

```sql
BEGIN;

-- plans: manter leitura pública (necessário para tela de preços/planos),
-- mas restringir escrita a service_role
DROP POLICY IF EXISTS "plans_policy" ON plans;
DROP POLICY IF EXISTS "plans_all" ON plans;
CREATE POLICY "plans_read_any" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_write_service" ON plans FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "plans_update_service" ON plans FOR UPDATE TO service_role USING (true);
CREATE POLICY "plans_delete_service" ON plans FOR DELETE TO service_role USING (true);

COMMIT;
```

**Por que é seguro:** Frontend SÓ lê planos (exibe lista de preços). Nunca insere/atualiza/deleta. Escrita é feita exclusivamente por edge functions com service_role.

**Teste de fumaça:**
1. Acessar tela de planos/assinatura → planos ainda aparecem
2. Tentar INSERT direto via REST API com token autenticado → deve falhar ✓

**Rollback:**
```sql
DROP POLICY IF EXISTS "plans_read_any" ON plans;
DROP POLICY IF EXISTS "plans_write_service" ON plans;
DROP POLICY IF EXISTS "plans_update_service" ON plans;
DROP POLICY IF EXISTS "plans_delete_service" ON plans;
CREATE POLICY "plans_all" ON plans FOR ALL USING (true);
```

**Repetir mesmo padrão para:** `ip_rate_limits`, `saas_metrics_daily`, `platform_metrics`, `system_owner_allowlist`

> Para cada tabela: avaliar se frontend lê diretamente. Se sim → manter SELECT para authenticated. Se não → restringir tudo a service_role.

---

#### 1A.3 — Fix `medicoes_preditivas` UPDATE USING(true)

```sql
BEGIN;
DROP POLICY IF EXISTS "update_medicao" ON medicoes_preditivas;
CREATE POLICY "medicoes_preditivas_update_tenant"
  ON medicoes_preditivas FOR UPDATE
  USING (can_access_empresa(empresa_id))
  WITH CHECK (can_access_empresa(empresa_id));
COMMIT;
```

**Por que é seguro:** Frontend já filtra por `empresa_id` antes de fazer UPDATE. Estamos apenas adicionando a mesma validação no banco.

**Teste de fumaça:**
1. Abrir tela Preditiva → editar uma medição → salvar → deve funcionar
2. Verificar que não há erro 403 na operação normal

**Rollback:**
```sql
DROP POLICY IF EXISTS "medicoes_preditivas_update_tenant" ON medicoes_preditivas;
CREATE POLICY "update_medicao" ON medicoes_preditivas FOR UPDATE USING (true);
```

---

#### 1A.4 — Fix `lubrificantes` e `movimentacoes_lubrificante` (JWT claims quebrados)

**⚠️ ATENÇÃO ESPECIAL:** Esta é a mais arriscada da Fase 1 porque as policies atuais usam `current_setting('request.jwt.claims')` que pode estar SEMPRE negando acesso. Mudar para `can_access_empresa()` pode LIBERAR acesso que antes estava bloqueado, ou pode corrigir um bug que impedia acesso legítimo.

**Procedimento de pré-validação:**
```sql
-- ANTES de mudar, verificar o estado atual:
-- Como autenticado de um tenant com lubrificantes:
SELECT COUNT(*) FROM lubrificantes;
-- Se retornar 0 e o tenant TEM lubrificantes → policy atual está QUEBRADA
-- Se retornar N > 0 → policy atual funciona (JWT claim está preenchido)
```

**Se policy atual está QUEBRADA (retorna 0):**
A mudança VAI liberar acesso que deveria existir. Isso é uma MELHORIA, não uma quebra.

**Se policy atual FUNCIONA (retorna N > 0):**
A mudança mantém o acesso existente com mecanismo mais confiável. Neutro.

```sql
BEGIN;

-- Drop policies existentes de lubrificantes
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies 
           WHERE tablename = 'lubrificantes' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON lubrificantes', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "lubrificantes_tenant_all" ON lubrificantes 
  FOR ALL USING (can_access_empresa(empresa_id)) 
  WITH CHECK (can_access_empresa(empresa_id));

COMMIT;
```

**Rollback:** Restaurar policies anteriores (anotar quais existiam ANTES de executar).

---

#### 1A.5 — Fix `log_mecanicos_login` INSERT WITH CHECK(true) duplicado

```sql
BEGIN;
-- Remover SOMENTE a policy permissiva, manter a que tem check de tenant
DROP POLICY IF EXISTS "insert_any" ON log_mecanicos_login;
DROP POLICY IF EXISTS "log_mecanicos_login_insert_any" ON log_mecanicos_login;
COMMIT;
```

**Por que é seguro:** A policy com check de tenant continua existindo. As edge functions usam service_role que bypassa RLS. Somente acesso direto via anon/authenticated fica restrito.

**Teste de fumaça:** Login de mecânico no portal → verificar que log é criado normalmente.

---

#### 1A.6 — FORCE ROW LEVEL SECURITY

```sql
-- Executar individualmente para cada tabela, testando entre cada uma
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
-- Testar → OK?
ALTER TABLE public.ordens_servico FORCE ROW LEVEL SECURITY;
-- Testar → OK?
-- ... continuar tabela por tabela
```

**Por que é seguro:** `FORCE ROW LEVEL SECURITY` afeta SOMENTE table owners (superusers). Usuários autenticados e anon já são controlados por `ENABLE ROW LEVEL SECURITY`. Na prática, em Supabase gerenciado, isso não tem efeito funcional — é defense-in-depth.

**⚠️ Se algo quebrar:** Significa que alguma query está rodando como table owner (não deveria). Rollback:
```sql
ALTER TABLE public.<tabela> NO FORCE ROW LEVEL SECURITY;
```

---

### Subfase 1B — Fix do RPC `dashboard_summary` (IDOR)

**⚠️ RISCO MODERADO:** Estamos alterando uma function que o frontend chama diretamente.

**Estratégia: Adicionar check SEM mudar o retorno.**

```sql
CREATE OR REPLACE FUNCTION dashboard_summary(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  result JSONB;
  -- ... variáveis existentes mantidas identicamente ...
BEGIN
  -- ← ÚNICA ADIÇÃO: check de acesso
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND (empresa_id = p_empresa_id 
           OR role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI'))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- ... resto da função EXATAMENTE como estava ...
```

**Por que é seguro:** O check verifica `user_roles`. Em uso normal, o frontend SEMPRE passa o `empresa_id` do próprio tenant, que está em `user_roles`. O check só bloqueia acesso cross-tenant (que não deveria acontecer).

**Possível quebra:** Se o SYSTEM_OWNER não tiver entry em `user_roles`, a condição `role IN ('SYSTEM_OWNER', ...)` cubre isso.

**Teste de fumaça:**
1. Login como admin de um tenant → Dashboard carrega normalmente
2. Login como SYSTEM_OWNER → Dashboard carrega normalmente
3. Verificar console do browser → sem erros 500/403

**Rollback:** `DROP FUNCTION dashboard_summary(UUID)` + recriar versão anterior.

---

### Subfase 1C — RPCs de mecânico (ANON — NÃO REVOGAR)

> **⚠️ INVESTIGAÇÃO CONCLUÍDA — RISCO R1 CONFIRMADO:**
> `PortalMecanicoContext.tsx` chama `validar_credenciais_mecanico_servidor` e
> `resolver_empresa_mecanico` com o Supabase client **ANON** (sem autenticação).
> O mecânico ainda NÃO tem JWT quando chama essas RPCs — é o fluxo de login dele.
>
> **REVOGAR `anon` = PORTAL MECÂNICO PARA DE FUNCIONAR. NÃO FAZER.**

**Alternativa segura — Rate limit DENTRO da RPC (sem revogar grant):**

```sql
-- Criar tabela de rate limit se não existir (da migration V3)
CREATE TABLE IF NOT EXISTS mecanico_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  empresa_id UUID,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_mla_ip_time 
  ON mecanico_login_attempts(ip_address, attempted_at);

-- Adicionar check no INÍCIO do body de validar_credenciais_mecanico_servidor:
-- (antes de qualquer comparação de senha)

-- Rate limit: max 10 tentativas por IP nos últimos 15 minutos
DECLARE v_recent_attempts INT;
BEGIN
  SELECT COUNT(*) INTO v_recent_attempts
  FROM mecanico_login_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - interval '15 minutes'
    AND success = false;
  
  IF v_recent_attempts >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Try again later.';
  END IF;
  
  -- ... resto da validação existente ...
  
  -- No final, registrar tentativa:
  INSERT INTO mecanico_login_attempts (ip_address, empresa_id, success)
  VALUES (p_ip_address, p_empresa_id, v_login_success);
END;
```

**Por que é seguro:** Não muda grants, não muda interface. Apenas adiciona check interno.

**Teste de fumaça:**
1. Portal mecânico → login com credenciais corretas → funciona ✓
2. Login com senha errada 10x → bloqueado temporariamente ✓
3. Após 15 min → desbloqueado ✓

**Rollback:** Recriar a function SEM o rate limit check (versão anterior).

**⚠️ DEPENDÊNCIA:** A RPC precisa receber `p_ip_address`. Se não recebe, adicionar como parâmetro OPCIONAL com default `NULL`:
```sql
-- Se parâmetro não existir, pular rate limit (backward compatible)
IF p_ip_address IS NOT NULL THEN
  -- check rate limit
END IF;
```

---

### Subfase 1D — Fix `maintenance_schedule` unique constraint

**⚠️ RISCO: Se existirem registros duplicados `(tipo, origem_id)` de empresas diferentes, o novo constraint FALHARÁ.**

**Pré-validação OBRIGATÓRIA:**
```sql
-- Verificar se existem conflitos ANTES de criar constraint
SELECT tipo, origem_id, COUNT(DISTINCT empresa_id) as empresas
FROM maintenance_schedule
GROUP BY tipo, origem_id
HAVING COUNT(DISTINCT empresa_id) > 1;
```

- Se retornar 0 linhas → seguro criar constraint
- Se retornar linhas → NÃO criar constraint até resolver duplicatas

```sql
-- Somente se pré-validação passar:
BEGIN;
ALTER TABLE maintenance_schedule 
  DROP CONSTRAINT IF EXISTS maintenance_schedule_tipo_origem_id_key;
ALTER TABLE maintenance_schedule 
  ADD CONSTRAINT maintenance_schedule_tipo_origem_empresa_key 
  UNIQUE (tipo, origem_id, empresa_id);
COMMIT;
```

**Rollback:**
```sql
ALTER TABLE maintenance_schedule DROP CONSTRAINT maintenance_schedule_tipo_origem_empresa_key;
ALTER TABLE maintenance_schedule ADD CONSTRAINT maintenance_schedule_tipo_origem_id_key UNIQUE (tipo, origem_id);
```

---

## FASE 2 — EDGE FUNCTIONS (BACKEND)

> **Regra:** Cada edge function é independente. Atualizar UMA por vez. Testar. Próxima.

### 2.1 — Fix `auth-forgot-password` Open Redirect

**Mudança:** Adicionar validação de `redirect_to` contra allowlist de domínios.

```typescript
// ADICIONAR antes de usar redirectTo:
const ALLOWED_HOSTS = ['gppis.com.br', 'www.gppis.com.br'];

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(host)) return true;
    return host.endsWith('.gppis.com.br') && !host.includes('..');
  } catch { return false; }
}

const redirectTo = (rawRedirect && isAllowedRedirect(rawRedirect)) 
  ? rawRedirect 
  : fallbackRedirect;
```

**Por que é seguro:** Se a validação rejeitar URLs legítimas, o fallback é usado → email funciona com URL padrão. Nunca falha completamente.

**Teste de fumaça:** 
1. Esquecer senha no domínio principal → email chega com link correto
2. Esquecer senha em subdomínio → email chega com link correto

**Rollback:** Reverter deploy da edge function para versão anterior.

---

### 2.2 — Fix `company-membership` Privilege Escalation

**Mudança:** Adicionar whitelist de roles no `upsert_member`.

```typescript
// ADICIONAR antes do upsert:
const TENANT_ASSIGNABLE_ROLES = ['ADMIN', 'USUARIO', 'TECHNICIAN', 'SOLICITANTE'];

if (body.action === 'upsert_member') {
  if (!TENANT_ASSIGNABLE_ROLES.includes(body.role)) {
    return fail(`Role "${body.role}" not allowed for tenant assignment`, 400, null, req);
  }
  // ... resto existente
}
```

**Por que é seguro:** Em uso normal, o frontend só envia roles da lista permitida. Esta validação só bloqueia tentativas de escalação.

**⚠️ Possível efeito colateral:** Se o frontend enviar role com casing diferente (ex: `admin` em vez de `ADMIN`), pode bloquear. 

**Mitigação:** Normalizar antes de validar:
```typescript
const normalizedRole = String(body.role).toUpperCase().trim();
if (!TENANT_ASSIGNABLE_ROLES.includes(normalizedRole)) { ... }
```

**Teste de fumaça:** Adicionar membro a uma empresa como ADMIN → deve funcionar normalmente.

---

### 2.3 — Fix `session-transfer` Hardcoded Secret

**Mudança mínima:** Remover fallback string literal.

```typescript
function statelessSigningSecret() {
  const configured = (Deno.env.get("SESSION_TRANSFER_SIGNING_SECRET") ?? "").trim();
  if (configured) return configured;
  const fallback = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!fallback) throw new Error("No signing secret configured");  // ← MUDANÇA
  return fallback;
}
```

**Por que é seguro:** `SUPABASE_SERVICE_ROLE_KEY` SEMPRE existe em ambiente Supabase. O fallback `"session-transfer-fallback-secret"` nunca seria usado em produção. Estamos apenas removendo o caso impossível.

---

### 2.4 — Fix `system-health-check` IDOR

**Mudança:** Adicionar verificação de que a API key pertence ao tenant solicitado.

```typescript
// ALTERNATIVA SEGURA: validar que caller é owner
const { user, error: authErr } = await requireUser(req, admin);
if (authErr || !user) {
  // Manter fallback de API key para monitoramento externo
  // mas limitar a tabelas não-sensíveis
}
```

**⚠️ Esta correção requer entender melhor quem chama este endpoint.** Se for um serviço de monitoramento externo com API key, restringir pode quebrar o monitoramento.

**Abordagem segura:** 
1. Adicionar log para identificar quem chama este endpoint em produção
2. Esperar 1 semana coletando dados
3. Depois aplicar restrição com base nos dados reais

---

## FASE 3 — FRONTEND (CONTEXTOS + HOOKS)

> **Regra:** Nunca mudar mais de 1 arquivo por commit. Testar após cada commit.
> **Ordem:** Contextos PRIMEIRO (fonte de verdade), hooks DEPOIS.

### 3.1 — Fix AuthContext — Remover `user_metadata` (VULN-AUTH-01/02/03)

**⚠️ RISCO R2 + R10 — Esta é a mudança mais arriscada do plano inteiro.**

> **CONFIRMADO:** `can_access_empresa()` (a função RLS do banco) TAMBÉM lê
> `user_metadata.empresa_id`. Ela NÃO deve ser mudada — é usada por device-auth JWTs.
>
> O fix é SOMENTE no `AuthContext.tsx` (frontend). O banco continua aceitando
> `user_metadata` como fonte válida via `can_access_empresa()`.

**ETAPA OBRIGATÓRIA ANTES DE MEXER NO CÓDIGO — Migration de dados:**

```sql
-- PASSO 1: Identificar quem depende SOMENTE de user_metadata
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as user_meta_role,
  u.raw_user_meta_data->>'empresa_id' as user_meta_empresa,
  u.raw_app_meta_data->>'role' as app_meta_role,
  u.raw_app_meta_data->>'empresa_id' as app_meta_empresa,
  (SELECT ur.role FROM user_roles ur WHERE ur.user_id = u.id LIMIT 1) as db_role,
  (SELECT ur.empresa_id FROM user_roles ur WHERE ur.user_id = u.id LIMIT 1) as db_empresa
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' IS NOT NULL
   OR u.raw_user_meta_data->>'empresa_id' IS NOT NULL;

-- PASSO 2: Para cada user que TEM user_metadata mas NÃO tem user_roles:
-- (gerar INSERTs automaticamente)
INSERT INTO user_roles (user_id, empresa_id, role)
SELECT 
  u.id,
  (u.raw_user_meta_data->>'empresa_id')::uuid,
  UPPER(u.raw_user_meta_data->>'role')
FROM auth.users u
WHERE u.raw_user_meta_data->>'empresa_id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- PASSO 3: Verificar que agora TODOS têm entry em user_roles
SELECT COUNT(*) as orfãos
FROM auth.users u
WHERE u.raw_user_meta_data->>'empresa_id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
-- DEVE RETORNAR 0. Se > 0, investigar manualmente antes de prosseguir.
```

**Decisão baseada no resultado:**
- **0 órfãos** → ✅ Seguro remover `user_metadata` do AuthContext
- **> 0 órfãos** → 🚫 NÃO remover. Resolver órfãos primeiro, re-executar query.

**Mudança no código (somente após 0 órfãos confirmados):**

```typescript
// extractRolesFromMetadata — REMOVER linhas:
// collect(metadata?.user_metadata?.role);
// collect(metadata?.user_metadata?.roles);

// extractEmpresaIdFromMetadata — MUDAR de:
const candidate = metadata?.app_metadata?.empresa_id 
  ?? metadata?.user_metadata?.empresa_id;
// PARA:
const candidate = metadata?.app_metadata?.empresa_id;

// extractEmpresaSlugFromMetadata — MESMO padrão
// extractForcePasswordChangeFromMetadata — MESMO padrão
```

> **NOTA:** NÃO mudar `can_access_empresa()` no banco. Ela continua lendo
> `user_metadata` para suportar device-auth JWTs. O fix é SOMENTE no
> frontend (onde `supabase.auth.updateUser()` é o vetor de ataque).

**Teste de fumaça EXTENSIVO:**
1. Login como SYSTEM_OWNER → mantém acesso owner
2. Login como ADMIN de um tenant → vê dados do tenant
3. Login como USUARIO → acessa normalmente
4. Login de mecânico (portal) → funciona
5. Criar NOVO usuário via signup → funciona
6. Verificar console → sem erros

**Rollback:** `git revert <commit>` → redeploy

---

### 3.2 — Fix AuthContext — Remover owner fallback elevation (VULN-AUTH-04)

**Mudança:**

```typescript
// REMOVER ou comentar este bloco:
// const ownerBackendAllowed = await verifyOwnerBackendAccess(token);
// if (ownerBackendAllowed) {
//   return elevateToSystemOwner(profileData);
// }

// SUBSTITUIR por:
return profileData; // Retorna o que o DB retornou, sem elevação
```

**⚠️ RISCO:** Se o SYSTEM_OWNER real depende deste fallback para acessar o painel owner (porque seu role no DB está inconsistente), ele vai perder acesso.

**Pré-validação:**
```sql
-- Verificar que o owner tem role correto em user_roles
SELECT * FROM user_roles WHERE user_id = '17f0750b-0773-4ac2-8e72-d868a69c8c49';
-- Deve retornar role = 'SYSTEM_OWNER'
```

Se NÃO retornar SYSTEM_OWNER:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('17f0750b-0773-4ac2-8e72-d868a69c8c49', 'SYSTEM_OWNER')
ON CONFLICT (user_id, empresa_id) DO UPDATE SET role = 'SYSTEM_OWNER';
```

**Teste:** Login do owner → mantém acesso total ao painel.

---

### 3.3 — Fix Hooks — Adicionar `.eq('empresa_id', tenantId)` (VULN-LUB-01..06, PERM-01..03, etc.)

**Estratégia: UM hook por commit. Testar cada um.**

**Ordem de prioridade (do menos arriscado ao mais):**

| # | Hook | Risco | Motivo |
|---|------|-------|--------|
| 1 | `usePermissoesGranulares` | Baixo | Usado somente no admin de permissões |
| 2 | `useDispositivosMoveis` | Baixo | Usado somente no admin de dispositivos |
| 3 | `useSolicitacoes` | Baixo | CRUD simples |
| 4 | `useUsuarios` | Médio | Usado em tela de gestão de usuários |
| 5 | `useLubrificacao` | Alto | Automatiza execuções e cria OS |

**Padrão de mudança (exemplo useLubrificacao):**

```typescript
// ANTES:
const { data } = await supabase.from('execucoes_lubrificacao')
  .select('*')
  .eq('plano_id', planoId!)
  .order('data_execucao', { ascending: false }).limit(50);

// DEPOIS (adição cirúrgica):
const { data } = await supabase.from('execucoes_lubrificacao')
  .select('*')
  .eq('plano_id', planoId!)
  .eq('empresa_id', tenantId)  // ← ÚNICA ADIÇÃO
  .order('data_execucao', { ascending: false }).limit(50);
```

**Por que é seguro:** Se os dados já pertencem ao tenant, `.eq('empresa_id', tenantId)` não muda nada no resultado. É um filtro redundante que não elimina dados legítimos.

**Exceção para INSERT:** Adicionar `empresa_id: tenantId` no payload:
```typescript
// ANTES:
const payload = { plano_id: p.id, data_execucao: nowIso, status: 'PENDENTE' };
// DEPOIS:
const payload = { plano_id: p.id, data_execucao: nowIso, status: 'PENDENTE', empresa_id: tenantId };
```

**⚠️ Risco do INSERT:** Se a tabela NÃO tem coluna `empresa_id`, o INSERT falha. Mas a função `insertWithColumnFallback` do projeto lida com isso (remove colunas inexistentes). Portanto: seguro.

**Teste de fumaça por hook:**
1. Abrir a tela que usa o hook
2. Listar dados → aparecem normalmente
3. Criar/editar/deletar um registro → funciona
4. Verificar console → sem erros

---

### 3.4 — Fix Hooks — Adicionar `.limit()` em queries unbounded

**Mudança em 16+ hooks:**
```typescript
// ADICIONAR ao final de queries SELECT:
.limit(1000)
```

**Por que é seguro:** Supabase já tem default limit de 1000. Estamos apenas tornando explícito. Para o uso normal, nenhum tenant tem > 1000 registros de um mesmo tipo.

**⚠️ Possível efeito colateral:** Se um tenant TEM > 1000 registros e a UI esperava ver todos, vai mostrar apenas 1000. Mas isso é melhor que um OOM crash.

---

### 3.5 — Fix `Preditiva.tsx` — Tornar fallback seguro (NÃO remover)

> **⚠️ RISCO R4 CONFIRMADO:** Remover o fallback faz a tela ficar silenciosamente
> vazia (loading infinito). O componente não tem error boundary ou toast de erro.

**Mudança (tornar fallback seguro em vez de remover):**
```typescript
// ANTES (fallback sem empresa_id — vaza dados cross-tenant):
const allRows = await supabase
  .from('medicoes_preditivas')
  .select('*')
  .order('created_at', { ascending: false });

// DEPOIS (fallback COM filtering seguro + warning):
console.warn('[Preditiva] Coluna empresa_id ausente — fallback de compatibilidade ativado');
const allRows = await supabase
  .from('medicoes_preditivas')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(500);  // ← Limitar dano mesmo no fallback

// Filtrar SOMENTE registros que correspondam aos equipamentos do tenant
// (allowedEquipamentoIds já vem filtrado pelo tenant no nível superior)
```

**Por que é seguro:** mantém funcionalidade existente, apenas adiciona `.limit(500)` como proteção contra data leak massivo. O filtro em memória por `allowedEquipamentoIds` já limita aos equipamentos do tenant — mas dados raw ficam no network tab. Esta é uma solução TEMPORÁRIA até a coluna `empresa_id` existir nessa tabela.

**Solução definitiva (Sprint 2):** Adicionar coluna `empresa_id` à tabela `medicoes_preditivas` se não existir, popular via backfill, e remover o fallback.
---

### 3.6 — Fix spread order (empresa_id antes de spread)

**Mudança em ordensServico.service.ts e useLubrificacao.ts:**
```typescript
// ANTES:
const payload = { empresa_id: empresaId, ...validated };
// DEPOIS:
const payload = { ...validated, empresa_id: empresaId }; // empresa_id POR ÚLTIMO
```

**Por que é seguro:** O resultado é idêntico para payloads normais (sem empresa_id em validated). Só muda comportamento para payloads maliciosos.

---

## FASE 4 — MOBILE APP

> **Regra:** Mudanças no mobile requerem novo build + distribuição de APK.
> Planejar como release separada.

### 4.1 — Coisas que NÃO requerem novo APK (backend-only)

- ✅ Fixes de RLS (Fase 1) protegem o mobile automaticamente
- ✅ Fixes de RPCs (Fase 1) protegem o mobile automaticamente
- ✅ Fixes de Edge Functions (Fase 2) protegem o mobile automaticamente

### 4.2 — Coisas que REQUEREM novo APK (agendar para sprint dedicada)

| Fix | Descrição | Risco |
|-----|-----------|-------|
| Migrar tokens para SecureStore | Trocar AsyncStorage por expo-secure-store | Médio — pode perder sessão ativa |
| Fix sync order (push antes de pull) | Mudar lógica do syncEngine | Alto — pode perder dados offline |
| Criptografia SQLite | Adicionar expo-sqlite-encrypted | Alto — requer migration do DB local |

**Recomendação:** Agendar mobile para sprint separada após web estar estável. Backend fixes protegem o mobile independentemente.

---

## FASE 5 — CREDENCIAIS & HIGIENE

### 5.1 — Rotação de senhas (URGENTE — FAZER ANTES DE TUDO)

**⚠️ EXCEÇÃO À REGRA DE FASES:** Isso deve ser feito IMEDIATAMENTE, antes de qualquer outra mudança, porque as senhas já estão expostas no git history.

**Procedimento:**

1. Abrir Supabase Dashboard → Authentication → Users
2. Localizar `pedrozo@gppis.com.br`
3. Enviar email de reset de senha
4. Owner define NOVA senha (diferente de `@Gpp280693`)
5. Repetir para `coopertradicao@gmail.com`

**Risco de quebra:** ZERO no sistema. Apenas o owner precisa lembrar a nova senha.

### 5.2 — Scripts com senha hardcoded

**NÃO deletar os scripts.** Apenas substituir a senha por variável de ambiente:

```javascript
// ANTES:
const password = '@Gpp280693';
// DEPOIS:
const password = process.env.OWNER_PASSWORD;
if (!password) throw new Error('OWNER_PASSWORD env var required');
```

**Risco:** ZERO — scripts de debug/teste, não afetam produção.

### 5.3 — Git history cleanup (AGENDAR — NÃO fazer junto com fixes)

O cleanup do git history é uma operação destrutiva que reescreve commits. Fazer DEPOIS que todas as correções estiverem prontas e estáveis.

```bash
# SOMENTE após tudo testado e em produção:
# 1. Certificar que TODOS os devs estão cientes
# 2. Usar BFG Repo-Cleaner:
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## CHECKLIST DE EXECUÇÃO

### Pré-condições (antes de começar QUALQUER fase):
- [ ] Branch `fix/security-audit-v4-safe` criada
- [ ] Senhas de produção já rotacionadas (5.1)
- [ ] Snapshot do banco salvo (0.2)
- [ ] Testes de fumaça implementados (0.1)
- [ ] Build atual passa: `npm run validate:full` ✓

### Para CADA passo individual:
```
[ ] Ler o código que vai mudar (entender contexto)
[ ] Executar pré-validação (se indicada)
[ ] Fazer a mudança mínima
[ ] Commit com mensagem descritiva: "fix(security): <o que fez>"
[ ] Executar teste de fumaça
[ ] Se falhou → rollback imediato → investigar
[ ] Se passou → anotar como concluído → próximo passo
```

### Pós-condições (após completar todas as fases):
- [ ] Todos os testes de fumaça passam
- [ ] `npm run validate:full` passa
- [ ] Build de produção gerado com sucesso
- [ ] PR criado com todos os commits
- [ ] Teste manual em staging/preview
- [ ] Merge em main
- [ ] Deploy em produção
- [ ] Verificação pós-deploy (telas críticas)

---

## ORDEM DE EXECUÇÃO RESUMIDA

```
DIA 0 (IMEDIATO — 30 min):
  5.1 Rotacionar senhas

DIA 1 (Preparação — 2-3h):
  0.1 Criar testes de fumaça
  0.2 Snapshot do banco
  0.3 Branch dedicada

DIA 2 (SQL — Meio dia):
  1A.1 Fix audit_logs RLS
  1A.2 Fix tabelas plataforma RLS
  1A.3 Fix medicoes_preditivas RLS
  1A.4 Fix lubrificantes RLS
  1A.5 Fix log_mecanicos_login
  1A.6 FORCE ROW LEVEL SECURITY

DIA 3 (SQL + Edge — Meio dia):
  1B   Fix dashboard_summary IDOR
  1C   Avaliar + revogar anon de RPCs
  1D   Fix maintenance_schedule constraint
  2.1  Fix auth-forgot-password redirect
  2.2  Fix company-membership escalation
  2.3  Fix session-transfer secret

DIA 4 (Frontend — 1 dia):
  3.1  Fix AuthContext user_metadata (após validação completa)
  3.2  Fix owner fallback elevation
  3.3  Fix hooks empresa_id (1 por 1)
  3.4  Fix hooks .limit()
  3.5  Fix Preditiva.tsx fallback
  3.6  Fix spread order

DIA 5 (Cleanup — Meio dia):
  5.2  Scripts hardcoded → env vars
  PR review
  Merge → Deploy

SPRINT SEPARADA (1-2 semanas depois):
  Fase 4 — Mobile fixes
  5.3 — Git history cleanup
```

---

## REGRAS DE OURO

1. **Se não tem certeza → NÃO aplique.** Pule para o próximo item. Volte depois com mais contexto.

2. **Se o teste de fumaça falhar → Rollback imediato.** Não tente consertar em cima. Revert, investigue, e tente de novo.

3. **Um commit = Uma mudança.** Nunca misture fix de RLS com fix de hook no mesmo commit. Se precisar reverter, quer reverter 1 coisa, não 10.

4. **SQL é mais seguro que código.** Policies de RLS podem ser trocadas em segundos sem deploy. Código frontend precisa de build + deploy. Priorize SQL.

5. **Backend protege o frontend.** Se o banco está seguro (RLS correto), o frontend inseguro não consegue exfiltrar dados. Por isso: fases 1-2 antes da fase 3.

6. **Mobile é protegido pelo backend.** Fixes no banco e edge functions protegem o app mobile automaticamente, sem novo APK. Mobile fixes cosméticos podem esperar.

---

*Documento gerado em 10/04/2026. Baseado na Auditoria V3 (108 vulns) + V4 (189 vulns).*
