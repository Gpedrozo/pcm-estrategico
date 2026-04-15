# PLANO DE CORREÇÃO — TERCEIRA AUDITORIA FORENSE 2026-04-14
**Versão:** 1.0  
**Data:** 14 de abril de 2026  
**Baseado em:** Terceira Auditoria Forense Completa (pós-bddcd5a — pré-escala comercial)  
**Estado atual do HEAD:** `012f90e` — docs: plano de correcao auditoria forense 20260414  
**Origin/main:** `bddcd5a` — fix: auditoria forense P0/P1/P2/P3

---

## SUMÁRIO EXECUTIVO DOS PROBLEMAS ENCONTRADOS

| ID | Problema | Classificação |
|---|---|---|
| C1 | `dashboard_summary` RPC SECURITY DEFINER aceita `empresa_id` arbitrário — cross-tenant KPI leak real | 🔴 CRÍTICO |
| C2 | `dashboard_summary` referencia `ordensServico` (camelCase) — tabela não existe no banco | 🔴 CRÍTICO |
| C3 | Diretórios físicos corrompidos `src/lib/diff --git a/` e `src/pages/diff --git a/` no repositório | 🔴 CRÍTICO |
| C4 | `ASAAS_WEBHOOK_TOKEN` não configurado em produção — aceita qualquer POST como pagamento | 🔴 CRÍTICO |
| P1-1 | `useOrdensServico.listar()` com `.limit(500)` sem `count: 'exact'` — truncation silenciosa | 🟠 ALTO |
| P1-2 | Rate limiting in-memory (Map) em `asaas-webhook` — bypassável com múltiplas instâncias Deno | 🟠 ALTO |
| P1-3 | `useOrdensServicoPaginated` e `usePaginatedQuery` existem mas NÃO usados nas páginas principais | 🟠 ALTO |
| P1-4 | `TruncatedDataBanner` componente criado mas NÃO integrado às páginas | 🟠 ALTO |
| P1-5 | `types.ts` desatualizado — 23 tabelas críticas sem tipos TypeScript (billing, dispositivos, mobile, etc.) | 🟠 ALTO |
| P2-1 | `movimentacoes_epi` usada em `useEPIs.ts` mas sem migration identificada e sem tipos | 🟡 MÉDIO |
| P2-2 | `search_equipamentos` RPC lê `auth.jwt()::jsonb->>'empresa_id'` diretamente sem fallback seguro | 🟡 MÉDIO |
| P2-3 | `useDashboardData` e `useDashboardOptimized` — dois hooks paralelos com dados inconsistentes | 🟡 MÉDIO |
| P2-4 | `mecanicos` vs `mecanicos_v2` — duas tabelas para o mesmo conceito, divergência desconhecida | 🟡 MÉDIO |
| P3-1 | `current_empresa_id()` executa até 4 SELECT aninhados por avaliação de RLS — N+1 em escala | 🟡 MÉDIO |
| P3-2 | `enterprise_audit_logs` sem particionamento por tenant/tempo — degradação com 500+ empresas | 🔵 BAIXO |

---

## ANÁLISE DE RISCOS DO PLANO

| ID | Risco Real | Probabilidade | Mitigação |
|---|---|---|---|
| R1 | Corrigir `dashboard_summary` pode quebrar Owner Portal que passa `empresa_id` de outros tenants intencionalmente | Alta | Adicionar `OR public.is_control_plane_operator()` na validação (idêntico ao padrão de segurança existente) |
| R2 | Renomear `ordensServico` na RPC pode quebrar callers que dependiam dos dados errados | Baixa | `useDashboardData` já ignora o erro com fallback — confirmar antes de deployar |
| R3 | Deletar diretórios `diff --git a` pode ter arquivos reais dentro | Baixa | Inspecionar conteúdo completo ANTES de qualquer `git rm` |
| R4 | Regenerar `types.ts` pode incluir novas colunas que quebram spreads com `.strict()` em schemas Zod | Média | Verificar quais schemas usam `.strict()` antes do `gen types` |
| R5 | Mover rate limit de in-memory para banco no `asaas-webhook` pode introduzir latência | Baixa | Query é simples (upsert + check); impacto < 10ms, rate_limits já indexado |
| R6 | Consolidar `mecanicos_v2` sem migrar dados existentes quebra o app mobile permanentemente | **CERTA se dados existirem** | Pré-condição obrigatória: `SELECT COUNT(*) FROM mecanicos_v2` antes de qualquer DROP |
| R7 | Otimizar `current_empresa_id()` para JWT-only pode quebrar usuários sem `empresa_id` no token | Alta | Verificar se custom hook JWT está ativo e popula `empresa_id` antes de alterar a função |
| R8 | Integrar `TruncatedDataBanner` pode causar flash visual em usuários com pouco volume de dados | Baixa | Componente só exibe quando `isTruncated === true` — zero impacto para dados abaixo do limite |

### DECISÕES COM BASE NOS RISCOS

| Item Original | Risco | Decisão |
|---|---|---|
| Validar tenant em `dashboard_summary` | R1: Owner Portal precisa de bypass | **CONDICIONADO:** adicionar `OR public.is_control_plane_operator()` explicitamente |
| Consolidar `mecanicos_v2` | R6: dados podem existir | **ADIADO:** pré-condição de query obrigatória, item P2-4 fica no final da fase |
| Otimizar `current_empresa_id()` para JWT-only | R7: JWT pode não ter claim | **BLOQUEADO** até confirmar custom hook JWT ativo em produção; P3-1 sem código por ora |

---

## ARQUITETURA DO PLANO

```
FASE 0 — Preparação (inspeções sem mudança de código)
FASE C  — CRÍTICO: falhas ativas que afetam segurança e integridade
FASE P1 — ALTO: integridade operacional e dados silenciados
FASE P2 — MÉDIO: manutenibilidade e estabilidade
FASE P3 — BAIXO/BLOQUEADO: melhorias de escala (decisão após confirmação de infra)
```

Cada item contém:
- **Pré-condição** (o que validar antes)
- **Passos atômicos** (um commit = uma mudança)
- **Teste de fumaça** (como confirmar que funcionou)
- **Rollback** (como desfazer em < 2 minutos)

---

## FASE 0 — PREPARAÇÃO (somente leitura — zero risco)

### 0.1 — Inspecionar conteúdo dos diretórios corrompidos

```powershell
Get-ChildItem "src/lib/diff --git a" -Recurse | Select-Object FullName
Get-ChildItem "src/pages/diff --git a" -Recurse | Select-Object FullName
```

**Validação:** Se houver arquivos `.ts`/`.tsx` com código real dentro, analisar cada um antes de qualquer exclusão.  
**Resultado esperado:** Apenas arquivos residuais de patch — nenhum código de produção.

---

### 0.2 — Confirmar estado da tabela `mecanicos_v2` em produção

```sql
-- Executar no SQL Editor do Supabase Dashboard:
SELECT COUNT(*) AS total_mecanicos    FROM public.mecanicos;
SELECT COUNT(*) AS total_mecanicos_v2 FROM public.mecanicos_v2;
-- Se mecanicos_v2 = 0 → consolidação segura (P2-4 pode avançar)
-- Se mecanicos_v2 > 0 → P2-4 bloqueado, investigar divergência primeiro
```

---

### 0.3 — Confirmar se custom hook JWT popula `empresa_id` no token

```sql
-- Verificar se hook de enriquecimento de JWT está ativo:
SELECT * FROM auth.hooks;
-- Esperado: hook que injeta empresa_id no claim customizado
-- Se não encontrado → P3-1 (otimização current_empresa_id) permanece BLOQUEADO
```

---

### 0.4 — Confirmar estado da `dashboard_summary` em produção

```sql
-- Verificar o body atual da função:
SELECT pg_get_functiondef('public.dashboard_summary(uuid)'::regprocedure);
-- Se contém "ordensServico" → C1/C2 confirmados, avançar com correção
```

---

## FASE C — CRÍTICO (corrigir ANTES de qualquer venda)

> **Regra:** Cada item é um commit separado. Testar antes de avançar.

---

### C1 + C2 — Corrigir `dashboard_summary`: tabela errada + cross-tenant

**Arquivo:** `supabase/migrations/20260414000011_fix_dashboard_summary_rpc.sql`

**Problema 1 (C2):** Referencia `ordensServico` (camelCase) — tabela real é `ordens_servico`. A função está quebrada em produção.  
**Problema 2 (C1):** `SECURITY DEFINER` sem validação do chamador — usuário da empresa A pode chamar `dashboard_summary(uuid_empresa_B)` e ver KPIs de outra empresa.

**O que fazer:**

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_summary(p_empresa_id UUID)
RETURNS TABLE (
  online_count        BIGINT,
  executing_count     BIGINT,
  gt_2h_count         BIGINT,
  avg_online_minutes  NUMERIC,
  os_by_status        JSONB,
  cost_last_7_days    NUMERIC,
  top_equipments      JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- VALIDAÇÃO DE TENANT OBRIGATÓRIA
  -- Chamador deve pertencer à empresa OU ser operador de plataforma (SYSTEM_OWNER/SYSTEM_ADMIN)
  IF NOT (
    public.current_empresa_id() = p_empresa_id
    OR public.is_control_plane_operator()
  ) THEN
    RAISE EXCEPTION 'dashboard_summary: acesso negado — tenant não autorizado (empresa_id: %).',
      p_empresa_id;
  END IF;

  RETURN QUERY
  WITH online_stats AS (
    SELECT
      COUNT(*)                                             AS online_count,
      COUNT(CASE WHEN status = 'em_execucao' THEN 1 END)  AS executing,
      COUNT(CASE WHEN minutos_conectado > 120 THEN 1 END)  AS gt_2h,
      AVG(COALESCE(minutos_conectado, 0))::NUMERIC         AS avg_minutes
    FROM public.v_mecanicos_online_agora
    WHERE empresa_id = p_empresa_id
  ),
  os_stats AS (
    SELECT
      jsonb_object_agg(
        COALESCE(status, 'unknown'),
        cnt::TEXT
      ) AS status_dist
    FROM (
      SELECT status, COUNT(*) AS cnt
      FROM public.ordens_servico           -- CORRIGIDO: era ordensServico
      WHERE empresa_id = p_empresa_id
        AND data_fechamento IS NULL
      GROUP BY status
    ) sub
  ),
  cost_stats AS (
    SELECT
      COALESCE(
        SUM(e.custo_mao_obra
          + COALESCE(e.custo_materiais, 0)
          + COALESCE(e.custo_terceiros, 0)),
        0
      )::NUMERIC AS cost_7d
    FROM public.execucoes_os e
    WHERE e.empresa_id = p_empresa_id
      AND e.data_execucao >= (NOW() - INTERVAL '7 days')
  ),
  equip_stats AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',       eq.id,
            'nome',     eq.nome,
            'os_count', sub.os_count
          ) ORDER BY sub.os_count DESC
        ) FILTER (WHERE sub.os_count > 0),
        '[]'::JSONB
      ) AS top_equip
    FROM (
      SELECT os.equipamento_id, COUNT(*) AS os_count
      FROM public.ordens_servico os     -- CORRIGIDO: era ordensServico
      WHERE os.empresa_id = p_empresa_id
        AND os.data_fechamento IS NULL
        AND os.equipamento_id IS NOT NULL
      GROUP BY os.equipamento_id
      ORDER BY os_count DESC
      LIMIT 5
    ) sub
    JOIN public.equipamentos eq ON eq.id = sub.equipamento_id
  )
  SELECT
    ol.online_count,
    ol.executing,
    ol.gt_2h,
    ol.avg_minutes,
    COALESCE(os.status_dist, '{}'::JSONB),
    cs.cost_7d,
    COALESCE(es.top_equip, '[]'::JSONB)
  FROM online_stats    ol
  CROSS JOIN os_stats   os
  CROSS JOIN cost_stats cs
  CROSS JOIN equip_stats es;
END;
$$;

-- Remover índices criados com nome de tabela errado e recriar corretamente
DROP INDEX IF EXISTS idx_ordensservico_data_conclusao_empresa;
DROP INDEX IF EXISTS idx_ordensservico_data_emissao_empresa;
DROP INDEX IF EXISTS idx_ordensservico_status_empresa;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_fechamento_empresa
  ON public.ordens_servico(empresa_id, data_fechamento DESC NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_created_empresa
  ON public.ordens_servico(empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_empresa
  ON public.ordens_servico(empresa_id, status);

DO $$ BEGIN
  RAISE NOTICE '[C1+C2 OK] dashboard_summary: validação de tenant + tabela ordens_servico + índices corretos.';
END $$;

COMMIT;
```

**Pré-condição:** Fase 0.3 confirmou que `is_control_plane_operator()` existe (existe desde a migration de rebuild).  
**Teste de fumaça:**
1. Logar como ADMIN da empresa A → abrir dashboard → KPIs carregam ✔
2. Via SQL editor (como usuário da empresa A): `SELECT * FROM dashboard_summary('uuid-empresa-B')` → deve retornar `EXCEPTION: acesso negado` ✔
3. Via SQL editor (como SYSTEM_OWNER): `SELECT * FROM dashboard_summary('uuid-empresa-B')` → deve retornar dados ✔
4. Owner Portal → empresa qualquer → dashboard → deve funcionar ✔

**Rollback:**
```sql
-- Reverter para versão anterior sem validação (emergência total — NÃO usar em produção):
DROP FUNCTION IF EXISTS public.dashboard_summary(UUID);
-- Reexecutar migration 20260402110000 para restaurar versão original
```

---

### C3 — Remover diretórios físicos corrompidos do repositório

**O que são:** Artefatos criados por uma operação de `git apply`/`git am` malfeita que criou diretórios com nomes de header de patch como diretórios físicos reais.

**Pré-condição:** Executar 0.1 e confirmar que os diretórios não contêm código TypeScript real.

```powershell
cd "C:\Users\Gustavo Pedrozo Pint\pcm-estrategico-clone"

# Inspecionar antes de deletar:
Get-ChildItem "src/lib/diff --git a" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem "src/pages/diff --git a" -Recurse -ErrorAction SilentlyContinue

# Remover do índice git e do disco:
git rm -r --cached "src/lib/diff --git a" 2>$null
git rm -r --cached "src/pages/diff --git a" 2>$null
Remove-Item -Recurse -Force "src/lib/diff --git a" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "src/pages/diff --git a" -ErrorAction SilentlyContinue

git add -A
git commit -m "chore: remove corrupted git-patch artifact directories"
```

**Teste de fumaça:**
```powershell
npx tsc --noEmit            # 0 erros
npm run build               # build completo
npm test                    # testes passam
# Confirmar que os diretórios sumiram:
Test-Path "src/lib/diff --git a"    # deve retornar False
Test-Path "src/pages/diff --git a"  # deve retornar False
```

**Rollback:** `git revert HEAD` (restaura os diretórios — desnecessário na prática)

---

### C4 — Configurar `ASAAS_WEBHOOK_TOKEN` em produção

**Por quê urgente:** Sem o token, `asaas-webhook/index.ts` valida `asaasWebhookToken === ""` como sempre falso — qualquer POST ao endpoint é aceito como evento de pagamento legítimo. Um atacante pode simular `PAYMENT_CONFIRMED` sem pagar.

**Passos (operacional — sem código):**

1. Acessar **painel Asaas → Configurações → Notificações (Webhooks)**
2. Copiar o **Webhook Token** gerado pelo Asaas
3. Acessar **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
4. Criar/atualizar o secret: `ASAAS_WEBHOOK_TOKEN` = `<token copiado do Asaas>`
5. Criar/atualizar: `CORS_ALLOWED_ORIGINS` = `https://gppis.com.br` (ou o domínio de produção real)

**Teste de fumaça:**
- Painel Asaas → Webhooks → "Testar webhook" → Verificar no log da Edge Function que a requisição passou pela validação do token
- Enviar POST sem token via curl → deve retornar `401 Unauthorized`

**Rollback:** Remover o secret (webhook volta sem autenticação — não fazer isso)

---

## FASE P1 — ALTO (corrigir antes de 20+ empresas)

---

### P1-1 — `useOrdensServico.listar()` sem truncation detection

**Arquivo:** `src/services/ordensServico.service.ts`

**Problema:** O método `listar()` usa `.limit(500)` sem `count: 'exact'` — tenants com > 500 O.S. perdem registros silenciosamente. Os outros hooks (`useEquipamentos`, `useMateriais`, `useMecanicos`) foram corrigidos na auditoria anterior. Este ficou para trás.

```typescript
// ANTES (src/services/ordensServico.service.ts — método listar):
  async listar(empresaId: string) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('numero_os', { ascending: false })
      .limit(500);

    if (error) throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
    return data;
  },

// DEPOIS:
  async listar(empresaId: string) {
    const { data, error, count } = await supabase
      .from('ordens_servico')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('numero_os', { ascending: false })
      .limit(500);

    if (error) throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
    return { rows: data ?? [], total: count ?? 0, isTruncated: (count ?? 0) > 500 };
  },
```

**Ajuste complementar em `useOrdensServico.ts`:**

```typescript
// ANTES (src/hooks/useOrdensServico.ts — useOrdensServico):
export function useOrdensServico() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ordens-servico', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.listar(tenantId) as Promise<OrdemServicoRow[]>;
    },
    enabled: !!tenantId,
  });
}

// DEPOIS:
export function useOrdensServico() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ['ordens-servico', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return ordensServicoService.listar(tenantId);
    },
    enabled: !!tenantId,
  });

  return {
    ...query,
    data: query.data?.rows,
    isTruncated: query.data?.isTruncated ?? false,
  };
}
```

**Ajuste em `useOrdensServico.ts` — listarPendentes (mesmo padrão):**

```typescript
// listarPendentes também precisa de count:
  async listarPendentes(empresaId: string) {
    const { data, error, count } = await supabase
      .from('ordens_servico')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .neq('status', 'FECHADA')
      .neq('status', 'CANCELADA')
      .order('prioridade', { ascending: true })
      .order('data_solicitacao', { ascending: true })
      .limit(500);

    if (error) throw new Error(`Falha ao carregar O.S pendentes: ${error.message}`);
    return { rows: data ?? [], total: count ?? 0, isTruncated: (count ?? 0) > 500 };
  },
```

**Pré-condição:** Verificar todos os callers de `ordensServicoService.listar()` para atualizar para `.data` (novo shape `{ rows, total, isTruncated }`).  
**Teste de fumaça:**
- `npx tsc --noEmit` → 0 erros
- Abrir página de O.S. → lista carrega normalmente
- Tenant com < 500 O.S. → `isTruncated = false` (sem banner)

---

### P1-2 — Rate limiting in-memory em `asaas-webhook` — persistir no banco

**Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Problema:** O `requestCounter` é um `Map` em memória da instância Deno. Supabase escala Edge Functions em múltiplas instâncias — cada instância tem seu próprio contador independente. Um atacante distribui 150 requests/min por instância, multiplicando o limite efetivo.

```typescript
// ANTES (asaas-webhook/index.ts — isRateLimited):
const requestCounter = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(req: Request): boolean {
  const now = Date.now();
  const key = requestKey(req);
  const entry = requestCounter.get(key);

  if (!entry || now - entry.windowStart > webhookRateWindowMs) {
    requestCounter.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  requestCounter.set(key, entry);
  return entry.count > webhookRateLimit;
}

// DEPOIS — manter in-memory como primeiro nível (rápido),
// adicionar verificação no banco como segundo nível (distribuída):
async function isRateLimitedPersistent(req: Request, admin: ReturnType<typeof adminClient>): Promise<boolean> {
  const key = requestKey(req);
  const now = Date.now();
  const windowStart = now - webhookRateWindowMs;

  // Checar in-memory primeiro (sem latência)
  const entry = requestCounter.get(key);
  if (entry && now - entry.windowStart <= webhookRateWindowMs) {
    if (entry.count >= webhookRateLimit) return true;
    entry.count += 1;
    requestCounter.set(key, entry);
  } else {
    requestCounter.set(key, { count: 1, windowStart: now });
  }

  // Verificar/upsert no banco para proteção distribuída
  try {
    const { data } = await admin
      .from("rate_limits")
      .upsert(
        { key: `webhook:${key}`, count: 1, window_start: new Date(windowStart).toISOString() },
        { onConflict: "key" }
      )
      .select("count")
      .single();

    if (data && (data as { count: number }).count > webhookRateLimit) return true;
  } catch {
    // Falha no banco → não bloquear (graceful degradation)
  }

  return false;
}
```

**Pré-condição:** Confirmar que a tabela `rate_limits` tem coluna `window_start` — verificar schema antes.  
**Teste de fumaça:**
- Enviar 200 requests rápidos do mesmo IP → 151º deve retornar 429
- Reiniciar a Edge Function → limite persiste (não reseta o contador)

---

### P1-3 — Integrar `TruncatedDataBanner` nas páginas principais

**Arquivos:** `src/pages/OrdensServico.tsx`, `src/pages/Equipamentos.tsx`, `src/pages/Mecanicos.tsx`, `src/pages/Materiais.tsx`

**Problema:** O componente `TruncatedDataBanner` foi criado na auditoria anterior mas não foi integrado às páginas. O estado `isTruncated` existe nos hooks mas não é exibido ao usuário.

**Padrão de integração (aplicar em cada página):**

```tsx
// Importar:
import { TruncatedDataBanner } from '@/components/ui/TruncatedDataBanner';

// Em OrdensServico.tsx — após os hooks de dados:
const { data: ordens, isTruncated: osIsTruncated } = useOrdensServico();

// Na JSX, antes da tabela/lista:
<TruncatedDataBanner visible={osIsTruncated ?? false} limit={500} entity="ordens de serviço" />
```

**Mesmo padrão para:**
- `Equipamentos.tsx` → `isTruncated` de `useEquipamentos()` (já implementado no hook)
- `Mecanicos.tsx` → `isTruncated` de `useMecanicos()` (já implementado no hook)
- `Materiais.tsx` → `isTruncated` de `useMateriais()` (já implementado no hook)

**Teste de fumaça:**
- Tenant com < 500 registros → nenhum banner visível ✔
- Tenant com > 500 registros → banner amarelo aparece com mensagem ✔

---

### P1-4 — Regenerar `types.ts` para cobrir tabelas faltantes

**Problema:** 23 tabelas críticas completamente ausentes dos tipos TypeScript, incluindo:  
`dispositivos_moveis`, `qrcodes_vinculacao`, `execucoes_os_pausas`, `billing_customers`, `billing_invoices`, `subscription_payments`, `company_subscriptions`, `membros_empresa`, `auth_session_transfer_tokens`, `movimentacoes_lubrificante`, `login_attempts`, `platform_metrics`, `saas_metrics_daily`, `os_impressoes`, entre outras.

**Passos:**

```powershell
cd "C:\Users\Gustavo Pedrozo Pint\pcm-estrategico-clone"

# 1. Gerar tipos atualizados:
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts

# 2. Verificar erros de TypeScript imediatamente:
npx tsc --noEmit

# 3. Se houver erros de schema: inspecionar os schemas Zod que usam .strict():
Select-String -Path "src/schemas/*.ts" -Pattern "\.strict\(\)" | Select-Object Filename, Line
```

**Pré-condição (R4):** Confirmar que nenhum schema crítico usa `.strict()` de forma que seria quebrado por novas colunas. Se houver: converter `.strict()` para `.passthrough()` nas interfaces que correspondem a tabelas do banco antes de regenerar.

**Pós-regeneração:** Verificar se `as never`, `as unknown`, e `as any` diminuíram nas queries de billing e dispositivos. Se algum cast manual existia para contornar a falta de tipos, remover.

**Teste de fumaça:**
- `npx tsc --noEmit` → 0 erros
- `npm test` → 301+ testes passando
- `npm run build` → build limpo

---

## FASE P2 — MÉDIO (corrigir antes de estabilização)

---

### P2-1 — Investigar e registrar `movimentacoes_epi`

**Problema:** `useEPIs.ts` usa `supabase.from('movimentacoes_epi')` em múltiplas queries. A tabela não aparece em nenhuma migration principal e não está em `types.ts`. Pode ser um alias de `movimentacoes_materiais` ou uma tabela criada manualmente sem migration.

**Investigação:**

```sql
-- Verificar se a tabela existe e sua estrutura real:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movimentacoes_epi'
ORDER BY ordinal_position;

-- Verificar contagem:
SELECT COUNT(*) FROM public.movimentacoes_epi;

-- Verificar se tem RLS habilitado:
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'movimentacoes_epi';
```

**Ação dependente do resultado:**
- **Se tabela existe com dados** → criar migration para documentar a criação official + adicionar ao `types.ts` via `gen types`
- **Se tabela existe sem dados** → criar migration idempotente com `CREATE TABLE IF NOT EXISTS` alinhada ao schema real
- **Se tabela não existe** → `useEPIs.ts` está usando tabela fantasma — investigar se queries falham silenciosamente e corrigir

---

### P2-2 — Corrigir `search_equipamentos` para usar `current_empresa_id()` com fallback

**Arquivo:** `supabase/migrations/20260414000012_fix_search_equipamentos_tenant.sql`

**Problema:** A RPC lê o JWT diretamente via `(SELECT auth.jwt()::jsonb->>'empresa_id')::UUID`. Se o JWT não tiver esse claim populate (usuários com JWT padrão Supabase sem custom hook), o resultado é NULL, fazendo `empresa_id = NULL` que nunca é verdadeiro — retorna zero resultados sem erro.

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.search_equipamentos(
  search_term TEXT DEFAULT '',
  limit_val   INT  DEFAULT 50,
  offset_val  INT  DEFAULT 0
)
RETURNS TABLE (
  id          UUID,
  nome        TEXT,
  tipo        TEXT,
  fabricante  TEXT,
  modelo      TEXT,
  localizacao TEXT,
  empresa_id  UUID,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  limit_val  := LEAST(GREATEST(limit_val, 1), 50);
  offset_val := GREATEST(offset_val, 0);

  -- Usar current_empresa_id() em vez de JWT direto — resolve pelo mesmo
  -- mecanismo robusto de 4 caminhos (JWT claim → membros_empresa → user_roles → profile)
  v_empresa_id := public.current_empresa_id();

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'search_equipamentos: tenant não resolvido para o usuário atual.';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.tipo,
    e.fabricante,
    e.modelo,
    e.localizacao,
    e.empresa_id,
    COUNT(*) OVER () AS total_count
  FROM public.equipamentos e
  WHERE
    e.empresa_id = v_empresa_id
    AND (
      search_term = ''
      OR e.nome       ILIKE '%' || search_term || '%'
      OR e.localizacao ILIKE '%' || search_term || '%'
      OR e.modelo     ILIKE '%' || search_term || '%'
    )
  ORDER BY
    CASE WHEN e.nome ILIKE search_term THEN 0 ELSE 1 END,
    e.nome
  LIMIT  limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_equipamentos(TEXT, INT, INT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '[P2-2 OK] search_equipamentos: usa current_empresa_id() em vez de JWT direto.';
END $$;

COMMIT;
```

**Teste de fumaça:**
- Buscar equipamento como usuário autenticado → resultados retornam ✔
- Confirmar que apenas equipamentos da empresa do usuário aparecem ✔

---

### P2-3 — Consolidar `useDashboardOptimized` com `useDashboardData`

**Arquivo:** `src/hooks/useDashboardOptimized.ts`

**Problema:** Dois hooks paralelos (`useDashboardData` e `useDashboardOptimized`) fazem chamadas similares e podem retornar dados inconsistentes dependendo de qual componente usa qual. `useDashboardOptimized` usa `dashboard_summary` e views que podem não existir; `useDashboardData` tem a query inline funcional.

**Decisão:**  
1. Verificar quais componentes usam `useDashboardOptimized`
2. Migrar esses componentes para `useDashboardData`
3. Deprecar/remover `useDashboardOptimized`

```powershell
# Encontrar todos os usos de useDashboardOptimized:
Select-String -Path "src/**/*.tsx","src/**/*.ts" -Pattern "useDashboardOptimized" -Recurse | Select-Object Filename, LineNumber, Line
```

**Se zero usos:** simplesmente remover o arquivo.  
**Se houver usos:** substituir cada import por `useDashboardData` e ajustar interface se necessário.

---

### P2-4 — Investigar e consolidar `mecanicos` vs `mecanicos_v2` [BLOQUEADO ATÉ 0.2]

**Pré-condição obrigatória:** `SELECT COUNT(*) FROM mecanicos_v2` deve retornar 0.

**Se COUNT = 0:**

```sql
-- Migration: confirmar uso e criar alias seguro
BEGIN;

-- Verificar se mecanicos_v2 está sendo referenciada por triggers, views ou functions:
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%mecanicos_v2%';

-- Se nenhuma referência → dropar com segurança:
DROP TABLE IF EXISTS public.mecanicos_v2 CASCADE;

DO $$ BEGIN
  RAISE NOTICE '[P2-4 OK] mecanicos_v2 removida — schema consolidado em mecanicos.';
END $$;

COMMIT;
```

**Se COUNT > 0:** Abrir investigação separada — não avançar até entender a origem dos dados e quais processos alimentam essa tabela.

---

## FASE P3 — BAIXO / BLOQUEADO (agendar após confirmação de infra)

---

### P3-1 — Otimizar `current_empresa_id()` [BLOQUEADO ATÉ 0.3]

**Pré-condição:** Custom hook JWT ativo em produção e populando `empresa_id` no token.

**Contexto:** A função executa até 4 SELECT aninhados por linha avaliada por RLS. Com `STABLE`, o PostgreSQL limita a repetições no mesmo statement, mas con múltiplos hooks em paralelo e query plans complexos, o impacto em escala é real.

**Solução se hook JWT ativo:**

```sql
-- Se auth.jwt()->> 'empresa_id' é garantidamente preenchido pelo hook JWT:
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid;
$$;
```

**NÃO executar** sem confirmar 0.3. Se JWT não tiver o claim, todas as queries de todos os usuários começarão a retornar zero resultados — **outage total**.

---

### P3-2 — Planejar particionamento de `enterprise_audit_logs`

**Contexto:** Com 500+ empresas em produção, a tabela pode acumular 25M+ linhas antes do archive job rodar. O pg_cron de archival (migration `20260414000009`) move para `enterprise_audit_logs_archive` semanalmente, mas sem particionamento o scan de `enterprise_audit_logs` cresce continuamente.

**Ação agendada (não executar agora — requer janela de manutenção):**

```sql
-- Após confirmar Supabase suporta pg_partman ou particionamento manual:
-- 1. Criar tabela particionada por range(created_at) mensal
-- 2. Migrar dados existentes
-- 3. Atualizar archive job para trabalhar com partições
-- Complexidade: ALTA — requer downtime ou pg_repack
```

**Por enquanto:** Confirmar que o pg_cron de archival está rodando. Se não ativo, ativar manualmente:

```sql
-- Verificar:
SELECT * FROM cron.job WHERE jobname = 'archive_audit_logs_weekly';
-- Se não existir → reexecutar a migration 20260414000009
```

---

## SUMÁRIO DE EXECUÇÃO

```
FASE 0  (preparação)  → Sem commits, somente queries de diagnóstico
├── 0.1  Inspecionar diretórios corrompidos
├── 0.2  COUNT mecanicos_v2
├── 0.3  Confirmar custom hook JWT
└── 0.4  Confirmar dashboard_summary atual

FASE C  (crítico)     → 3-4 commits
├── C1+C2  Migration + fix dashboard_summary
├── C3     git rm diretórios corrompidos
└── C4     Configurar ASAAS_WEBHOOK_TOKEN (operacional)

FASE P1 (alto)        → 2 commits + 1 regeneração
├── P1-1   ordensServico truncation detection
├── P1-2   rate limit persistente asaas-webhook
├── P1-3   TruncatedDataBanner → páginas
└── P1-4   Regenerar types.ts

FASE P2 (médio)       → 1-3 commits (dependente dos diagnósticos)
├── P2-1  movimentacoes_epi investigação + migration
├── P2-2  Migration search_equipamentos
├── P2-3  Remover useDashboardOptimized
└── P2-4  DROP mecanicos_v2 [se COUNT = 0]

FASE P3 (bloqueado)   → Agendar após confirmação de infra
├── P3-1  current_empresa_id JWT-only [bloqueado até 0.3]
└── P3-2  Particionamento audit_logs [janela de manutenção]
```

---

## CRITÉRIO DE ACEITAÇÃO FINAL

Após todas as fases executadas:

| Check | Validação |
|---|---|
| `npx tsc --noEmit` | 0 erros TypeScript |
| `npm test` | ≥ 301 testes passando |
| `npm run build` | Build limpo, sem avisos de dependência |
| `dashboard_summary('uuid-empresa-alheia')` como tenant diferente | `EXCEPTION: acesso negado` |
| `dashboard_summary` no frontend | KPIs de O.S. aparecem corretamente |
| Diretórios `diff --git a` | Não existem em `src/lib` nem `src/pages` |
| `useOrdensServico` com > 500 O.S. | `isTruncated = true` + banner visível |
| `types.ts` | Cobre `dispositivos_moveis`, `billing_invoices`, `subscription_payments` |
| ASAAS_WEBHOOK_TOKEN | Secret configurado — POST sem token retorna 401 |
