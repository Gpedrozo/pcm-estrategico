# PLANO DE CORREÇÃO — AUDITORIA FORENSE 2026-04-14
**Versão:** 1.0  
**Data:** 14 de abril de 2026  
**Baseado em:** Auditoria Forense Completa (pré-escala comercial)  
**Estado atual do HEAD:** `bddcd5a` — fix: auditoria forense P0/P1/P2/P3

---

## SUMÁRIO EXECUTIVO DOS PROBLEMAS ENCONTRADOS

| ID | Problema | Classificação |
|---|---|---|
| C1 | `dashboard_summary` RPC SECURITY DEFINER sem validação de tenant — cross-tenant leak real | 🔴 CRÍTICO |
| C2 | `dashboard_summary` referencia tabela `ordensServico` (camelCase) — tabela inexistente | 🔴 CRÍTICO |
| C3 | Diretórios físicos corrompidos `src/lib/diff --git a/` e `src/pages/diff --git a/` no repositório | 🔴 CRÍTICO |
| C4 | `ASAAS_WEBHOOK_TOKEN` não configurado — webhooks de pagamento aceitam qualquer POST | 🔴 CRÍTICO |
| I1 | `types.ts` desatualizado — 23 tabelas críticas sem tipos (billing, dispositivos, etc.) | 🟠 ALTO |
| I2 | `useOrdensServico.listar()` sem truncation detection — silencia O.S. além de 500 | 🟠 ALTO |
| I3 | Rate limiting in-memory em Edge Functions — bypassável com múltiplas instâncias | 🟠 ALTO |
| I4 | `useOrdensServicoPaginated` e `usePaginatedQuery` existem mas não usados nas páginas | 🟠 ALTO |
| I5 | `TruncatedDataBanner` criado mas não integrado às páginas principais | 🟠 ALTO |
| I6 | `mecanicos` vs `mecanicos_v2` — duas tabelas para o mesmo conceito | 🟡 MÉDIO |
| I7 | `current_empresa_id()` com 4 subqueries por avaliação de RLS — N+1 em escala | 🟡 MÉDIO |
| I8 | `movimentacoes_epi` usada em hooks mas sem migration/type identificada | 🟡 MÉDIO |
| I9 | `search_equipamentos` RPC lê JWT claim diretamente sem fallback seguro | 🟡 MÉDIO |
| I10 | `useDashboardData` e `useDashboardOptimized` — hooks duplicados com dados inconsistentes | 🟡 MÉDIO |

---

## ANÁLISE DE RISCOS DO PLANO

Antes de executar qualquer mudança, os riscos abaixo foram mapeados:

| ID | Risco Real | Probabilidade | Mitigação |
|---|---|---|---|
| R1 | Corrigir `dashboard_summary` com validação de tenant pode quebrar Owner Portal que passa empresa_id de outras empresas intencionalmente | Alta | Adicionar bypass para `is_control_plane_operator()` antes da validação |
| R2 | Renomear `ordensServico` → `ordens_servico` na RPC pode quebrar qualquer caller que dependia dos dados (mesmo que incorretos) | Baixa | Testar useDashboardData antes e depois — ele já ignora o erro com fallback |
| R3 | Deletar diretórios `diff --git a` pode ter arquivos reais dentro | Baixa | Inspecionar conteúdo dos diretórios antes de deletar |
| R4 | Regenerar `types.ts` pode incluir colunas novas que quebram spreads com Zod `.strict()` | Média | Verificar quais schemas usam `.strict()` antes de regenerar |
| R5 | Mover rate limit do asaas-webhook para banco pode introduzir latência no processamento | Baixa | A query é simples (upsert + check); impacto < 10ms |
| R6 | Consolidar `mecanicos_v2` sem migrar dados existentes quebra o app mobile | **CERTA se dados existirem** | Query prévia: verificar se `mecanicos_v2` tem registros antes de qualquer DROP |
| R7 | Otimizar `current_empresa_id()` para JWT-only pode quebrar usuários cujo JWT não tem `empresa_id` embedded | Alta | Verificar se custom hook JWT está ativo e popula `empresa_id` antes de mudar a função |

### DECISÕES COM BASE NOS RISCOS

| Item Original | Risco | Decisão |
|---|---|---|
| Validar tenant em `dashboard_summary` | R1: Owner Portal precisa de bypass | **CONDICIONADO:** adicionar `OR public.is_control_plane_operator()` junto com a validação |
| Consolidar `mecanicos_v2` | R6: dados podem existir | **ADIADO para I6 → pré-condição obrigatória de query** |
| Otimizar `current_empresa_id()` | R7: JWT pode não ter claim | **BLOQUEADO** até confirmar custom hook JWT ativo em produção |

---

## ARQUITETURA DO PLANO

```
FASE 0 — Preparação (blindagem antes de tocar código)
FASE P0 — CRÍTICO: Bugs ativos que afetam segurança e correção de dados
FASE P1 — ALTO: Problemas que afetam integridade operacional
FASE P2 — MÉDIO: Problemas de manutenibilidade e escala
FASE P3 — BAIXO: Melhorias e higiene
```

Cada item tem:
- **Pré-condição** (o que validar antes de começar)
- **Passos atômicos** (um PR = uma mudança)
- **Teste de fumaça** (como validar que não quebrou)
- **Rollback** (como desfazer em < 2 minutos)

---

## FASE 0 — PREPARAÇÃO

### 0.1 — Inspecionar conteúdo dos diretórios corrompidos

**Por quê:** Antes de deletar, confirmar que não há código real dentro.

```powershell
Get-ChildItem "src/lib/diff --git a" -Recurse | Select-Object FullName
Get-ChildItem "src/pages/diff --git a" -Recurse | Select-Object FullName
```

**Validação:** Se os diretórios contiverem arquivos `.ts`/`.tsx` reais, analisar cada um antes de qualquer exclusão.  
**Risco de quebra:** ZERO (somente leitura)

### 0.2 — Confirmar estado da migrations em produção

```sql
-- Executar no SQL Editor do Supabase
SELECT COUNT(*) FROM public.mecanicos;
SELECT COUNT(*) FROM public.mecanicos_v2;
SELECT pg_get_functiondef('public.dashboard_summary(uuid)'::regprocedure);
```

**Validação:** Confirma se `mecanicos_v2` tem dados (bloqueia I6 se sim) e se `dashboard_summary` está como esperado.  
**Risco de quebra:** ZERO (somente leitura)

### 0.3 — Confirmar se custom hook JWT popula `empresa_id`

```sql
-- Verificar se hook de JWT está ativo
SELECT * FROM auth.hooks;
-- Verificar um JWT existente via decode
```

**Validação:** Define se I7 (otimização de `current_empresa_id`) pode avançar ou fica bloqueada.  
**Risco de quebra:** ZERO

---

## FASE P0 — CRÍTICO (corrigir ANTES de qualquer cliente)

> **Regra:** Cada item desta fase é um commit separado. Testar antes de avançar ao próximo.

---

### P0-1 — Corrigir `dashboard_summary` RPC: nome de tabela + validação de tenant

**Arquivo:** `supabase/migrations/20260414000011_fix_dashboard_summary_rpc.sql`

**Problema 1:** Tabela referenciada como `ordensServico` — não existe. Deve ser `ordens_servico`.  
**Problema 2:** Função é `SECURITY DEFINER` e aceita qualquer `empresa_id` sem verificar se o chamador pertence àquela empresa.

**O que fazer:**

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_summary(p_empresa_id UUID)
RETURNS TABLE (
  online_count   BIGINT,
  executing_count BIGINT,
  gt_2h_count    BIGINT,
  avg_online_minutes NUMERIC,
  os_by_status   JSONB,
  cost_last_7_days NUMERIC,
  top_equipments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- VALIDAÇÃO DE TENANT: chamador deve pertencer à empresa OU ser operador de plataforma
  IF NOT (
    public.current_empresa_id() = p_empresa_id
    OR public.is_control_plane_operator()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: tenant inválido para dashboard_summary.';
  END IF;

  RETURN QUERY
  WITH online_stats AS (
    SELECT
      COUNT(*)                                           AS online_count,
      COUNT(CASE WHEN status = 'em_execucao' THEN 1 END) AS executing,
      COUNT(CASE WHEN minutos_conectado > 120 THEN 1 END) AS gt_2h,
      AVG(COALESCE(minutos_conectado, 0))::NUMERIC       AS avg_minutes
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
      FROM public.ordens_servico
      WHERE empresa_id = p_empresa_id
        AND data_fechamento IS NULL
      GROUP BY status
    ) sub
  ),
  cost_stats AS (
    SELECT
      COALESCE(SUM(e.custo_mao_obra + e.custo_materiais + COALESCE(e.custo_terceiros, 0)), 0)::NUMERIC AS cost_7d
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
      FROM public.ordens_servico os
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
  FROM online_stats   ol
  CROSS JOIN os_stats   os
  CROSS JOIN cost_stats cs
  CROSS JOIN equip_stats es;
END;
$$;

-- Remover índices com formato de tabela errado e recriar corretamente
DROP INDEX IF EXISTS idx_ordensservico_data_conclusao_empresa;
DROP INDEX IF EXISTS idx_ordensservico_data_emissao_empresa;
DROP INDEX IF EXISTS idx_ordensservico_status_empresa;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_fechamento_empresa
  ON public.ordens_servico(empresa_id, data_fechamento DESC);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_emissao_empresa
  ON public.ordens_servico(empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_status_empresa
  ON public.ordens_servico(empresa_id, status);

DO $$ BEGIN
  RAISE NOTICE '[P0-1 OK] dashboard_summary corrigida: validação de tenant + tabela ordens_servico + índices.';
END $$;

COMMIT;
```

**Pré-condição:** Fase 0 concluída — Owner Portal usa bypass correto.  
**Teste de fumaça:**
1. Abrir dashboard como ADMIN de empresa A → ver KPIs da empresa A ✓
2. Chamar `SELECT * FROM dashboard_summary('uuid-empresa-B')` como usuário da empresa A → deve receber `EXCEPTION: Acesso negado` ✓
3. Chamar como SYSTEM_OWNER → deve funcionar ✓

**Rollback:**
```sql
-- Recriar a versão original (quebrada mas sem validação de tenant)
-- Apenas necessário se Owner Portal falhar. A versão anterior estava no commit bddcd5a.
```

---

### P0-2 — Remover diretórios corrompidos do repositório

**Por quê:** Artefatos de patch malfeito criam comportamento imprevisível em bundlers, CI e ferramentas de análise estática.

**Pré-condição:** Executar 0.1 e confirmar que os diretórios não contêm código real.

```powershell
cd "C:\Users\Gustavo Pedrozo Pint\pcm-estrategico-clone"
git rm -r --cached "src/lib/diff --git a"
git rm -r --cached "src/pages/diff --git a"
# Se os diretórios existirem fisicamente também:
Remove-Item -Recurse -Force "src/lib/diff --git a" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "src/pages/diff --git a" -ErrorAction SilentlyContinue
git commit -m "chore: remove corrupted git-patch artifact directories"
```

**Teste de fumaça:**
1. `npx tsc --noEmit` → 0 erros ✓
2. `npm run build` → sucesso ✓
3. `Get-ChildItem src/lib, src/pages -Recurse` → nenhum diretório com "diff" no nome ✓

**Rollback:** `git revert HEAD` (restaura os diretórios — mas por que você quereria?)

---

### P0-3 — Configurar `ASAAS_WEBHOOK_TOKEN` em produção

**Por quê:** Sem o token configurado, o webhook aceita qualquer POST como evento de pagamento legítimo. Um atacante pode simular pagamentos confirmados sem pagar.

**Passos (operacional — não é código):**

1. Acessar **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Adicionar: `ASAAS_WEBHOOK_TOKEN` = valor obtido do painel Asaas em `Configurações → Webhooks`
3. Adicionar: `CORS_ALLOWED_ORIGINS` = `https://gppis.com.br,https://app.gppis.com.br` (ajustar conforme domínios reais)

**Validação:** Enviar um POST de teste do painel Asaas → verificar no log da Edge Function que o token está sendo validado.

**Rollback:** Remover o secret do dashboard (webhook volta a aceitar tudo — pior que antes, não fazer isso).

---

## FASE P1 — ALTO (corrigir antes de 20+ empresas)

---

### P1-1 — Adicionar truncation detection em `useOrdensServico`

**Arquivo:** `src/services/ordensServico.service.ts` + `src/hooks/useOrdensServico.ts`

**Problema:** `ordensServicoService.listar()` usa `.limit(500)` sem `count: 'exact'`. Uma empresa com 600+ O.S. silenciosamente perde os registros mais antigos.

**O que fazer:**

Em `src/services/ordensServico.service.ts`, na função `listar()`:
```typescript
// ANTES:
const { data, error } = await supabase
  .from('ordens_servico')
  .select('*')
  .eq('empresa_id', empresaId)
  .order('numero_os', { ascending: false })
  .limit(500);

if (error) throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
return data;

// DEPOIS:
const { data, error, count } = await supabase
  .from('ordens_servico')
  .select('*', { count: 'exact' })
  .eq('empresa_id', empresaId)
  .order('numero_os', { ascending: false })
  .limit(500);

if (error) throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
return { rows: data ?? [], total: count ?? 0 };
```

Em `src/hooks/useOrdensServico.ts`, ajustar `useOrdensServico()`:
```typescript
// Retornar isTruncated junto com os dados
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
  isTruncated: (query.data?.total ?? 0) > 500,
};
```

Integrar `TruncatedDataBanner` na página `src/pages/OrdensServico.tsx` (ou equivalente):
```tsx
<TruncatedDataBanner visible={isTruncated} entity="ordens de serviço" limit={500} />
```

**Pré-condição:** Verificar que nenhum outro caller de `ordensServicoService.listar()` espera array diretamente (sem `.rows`).  
**Teste de fumaça:**
1. `npx tsc --noEmit` → 0 erros ✓
2. Abrir lista de O.S. → sistema funciona normalmente ✓
3. Se empresa tiver > 500 O.S. → banner amarelo aparece ✓

**Rollback:** `git revert HEAD`

---

### P1-2 — Mover rate limiting do `asaas-webhook` para banco persistente

**Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Problema:** O `requestCounter` é um `Map<string, ...>` em memória Deno. Com múltiplas instâncias da Edge Function, cada instância tem seu próprio contador independente — um atacante pode bypass o limite distribuindo requests.

**O que fazer:**

Substituir o bloco de rate limiting in-memory pela função `enforceRateLimit` já existente no `_shared/rateLimit.ts`:

```typescript
// REMOVER:
const webhookRateWindowMs = 60_000;
const webhookRateLimit = 150;
const requestCounter = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(req: Request): boolean {
  /* ... implementação in-memory ... */
}

// ADICIONAR (no handler, logo após verificar o token):
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { adminClient } from "../_shared/auth.ts";

const rl = await enforceRateLimit(adminClient(), {
  scope: "asaas_webhook",
  identifier: requestKey(req),
  maxRequests: 150,
  windowSeconds: 60,
});
if (!rl.allowed) {
  return new Response("Rate limit exceeded", { status: 429 });
}
```

**Pré-condição:** Confirmar que `enforceRateLimit` usa a tabela `ip_rate_limits` (confirmado em `_shared/rateLimit.ts`).  
**Teste de fumaça:**
1. Deploy da função → verificar logs de inicialização sem erro ✓
2. Simular 151 POSTs em 60s → o 151º deve retornar 429 ✓
3. Aguardar 61s → requests voltam a passar ✓

**Rollback:** Reverter o arquivo para a versão anterior com `git revert HEAD`.

---

### P1-3 — Regenerar `types.ts` completo

**Por quê:** 23 tabelas críticas (billing, dispositivos móveis, auth_session_transfer_tokens, etc.) estão completamente ausentes dos tipos TypeScript. Queries a estas tabelas usam `as never` ou `as Record<string, unknown>`, tornando erros de tipo invisíveis até runtime.

**Passos:**

```powershell
# 1. Fazer backup do types.ts atual
Copy-Item src/integrations/supabase/types.ts src/integrations/supabase/types.ts.bak

# 2. Regenerar com supabase CLI (projeto vinculado)
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts

# 3. Verificar TypeScript
npx tsc --noEmit
```

**Pós-regeneração — checar manualmente:**
- Verificar se algum schema Zod usa `.strict()` e agora recebe campos extras do tipo
- Verificar se hooks que faziam `as Record<string, unknown>` agora precisam atualizar o tipo explícito
- Comparar tabelas de billing (subscriptions, billing_invoices, etc.) — atualizar hooks de billing se necessário

**Pré-condição:** Projeto Supabase vinculado localmente (`supabase link --project-ref <ref>`).  
**Teste de fumaça:**
1. `npx tsc --noEmit` → 0 erros ✓
2. `npm run test` → 301+ testes passando ✓
3. `npm run build` → sucesso ✓

**Rollback:**
```powershell
Copy-Item src/integrations/supabase/types.ts.bak src/integrations/supabase/types.ts
npx tsc --noEmit  # verificar que está limpo
```

---

### P1-4 — Integrar `TruncatedDataBanner` nas páginas principais restantes

**Por quê:** O componente foi criado na auditoria anterior mas não está conectado às páginas. Usuários não recebem aviso quando dados estão truncados.

**Páginas a atualizar:**

| Página | Hook | Flag |
|---|---|---|
| `src/pages/Equipamentos.tsx` ou equivalente | `useEquipamentos()` | `isTruncated` |
| `src/pages/Mecanicos.tsx` ou equivalente | `useMecanicos()` | `isTruncated` |
| `src/pages/Materiais.tsx` ou equivalente | `useMateriais()` | `isTruncated` |
| Página de O.S. | `useOrdensServico()` | `isTruncated` (após P1-1) |

**Padrão de integração (idêntico para todas):**
```tsx
import { TruncatedDataBanner } from '@/components/ui/TruncatedDataBanner';

// No componente:
const { data: equipamentos, isTruncated } = useEquipamentos();

// No JSX, antes da tabela/lista:
<TruncatedDataBanner visible={isTruncated} entity="equipamentos" limit={500} />
```

**Pré-condição:** P1-1 concluído (O.S. com isTruncated).  
**Teste de fumaça:**
1. `npx tsc --noEmit` → 0 erros ✓
2. Abrir cada página → sem erros visuais ✓

**Rollback:** `git revert HEAD`

---

## FASE P2 — MÉDIO (corrigir antes de escala)

---

### P2-1 — Investigar e documentar `movimentacoes_epi`

**Problema:** `useEPIs.ts` faz múltiplas queries em `movimentacoes_epi`, mas esta tabela não aparece em nenhuma migration identificada e não está no `types.ts`.

**Passos de investigação:**

```sql
-- Verificar se a tabela existe no banco atual
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'movimentacoes_epi'
);

-- Se existir, ver sua estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movimentacoes_epi'
ORDER BY ordinal_position;
```

**Cenário A — Tabela existe mas sem migration:**
Criar migration retroativa para documentar o schema existente:
```sql
-- supabase/migrations/20260414000012_document_movimentacoes_epi.sql
-- (CREATE TABLE IF NOT EXISTS com o schema exato encontrado)
```

**Cenário B — Tabela não existe:**
O hook referencia uma tabela inexistente — `useEPIs` está em estado quebrado silencioso. Criar a migration para criar a tabela com esquema adequado.

**Pré-condição:** Executar query de verificação acima.  
**Teste de fumaça:** Abrir tela de EPI/estoque → itens carregam sem erro ✓

---

### P2-2 — Corrigir `search_equipamentos` RPC com fallback seguro

**Arquivo:** `supabase/migrations/20260414000013_fix_search_equipamentos_rpc.sql`

**Problema:** A RPC usa `(SELECT auth.jwt()::jsonb->>'empresa_id')::UUID` diretamente. Se o JWT não tiver o claim `empresa_id`, o cast retorna NULL e `e.empresa_id = NULL` não retorna linhas sem lançar erro.

**O que fazer:**

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
  -- Usar current_empresa_id() que já possui fallback seguro para profiles/user_roles
  v_empresa_id := public.current_empresa_id();

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido para search_equipamentos.';
  END IF;

  limit_val  := LEAST(GREATEST(limit_val, 1), 50);
  offset_val := GREATEST(offset_val, 0);

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
      OR e.nome     ILIKE '%' || search_term || '%'
      OR e.localizacao ILIKE '%' || search_term || '%'
      OR e.modelo   ILIKE '%' || search_term || '%'
    )
  ORDER BY
    CASE WHEN e.nome ILIKE search_term THEN 0 ELSE 1 END,
    e.nome
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_equipamentos(TEXT, INT, INT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '[P2-2 OK] search_equipamentos corrigida com current_empresa_id() seguro.';
END $$;

COMMIT;
```

**Teste de fumaça:**
1. Pesquisar equipamento logado como tenant A → retorna apenas equipamentos de A ✓
2. Pesquisar sem estar autenticado → erro de autenticação ✓

---

### P2-3 — Consolidar `useDashboardData` e `useDashboardOptimized`

**Problema:** Dois hooks com propósitos sobrepostos alimentam partes diferentes da UI com dados potencialmente inconsistentes.

**Investigação:**

```powershell
# Verificar quais componentes importam cada hook
Select-String -Path "src/**/*.tsx","src/**/*.ts" -Pattern "useDashboardData|useDashboardOptimized" -Recurse | Select-Object Filename, Line
```

**Decisão baseada no resultado:**
- Se `useDashboardOptimized` tiver 0 callers → **deletar** (dead code)
- Se tiver callers → **migrar** os callers para `useDashboardData` e depois deletar

**Pré-condição:** P0-1 concluído (RPC funcionando).  
**Teste de fumaça:** Dashboard carrega com dados corretos em todas as seções ✓

---

### P2-4 — Investigar status do `mecanicos_v2`

**Problema:** Duas tabelas para mecânicos: `mecanicos` (hooks do frontend) e `mecanicos_v2` (origem desconhecida).

**Passos:**

```sql
-- 1. Quantos registros em cada?
SELECT 'mecanicos'    AS tabela, COUNT(*) FROM public.mecanicos
UNION ALL
SELECT 'mecanicos_v2' AS tabela, COUNT(*) FROM public.mecanicos_v2;

-- 2. Estrutura diferente?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('mecanicos', 'mecanicos_v2')
ORDER BY table_name, ordinal_position;

-- 3. Quais triggers/RPCs referenciam mecanicos_v2?
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc ILIKE '%mecanicos_v2%';
```

**Se `mecanicos_v2` estiver vazia e sem references:** Criar migration para droppá-la.  
**Se tiver dados:** Avaliar migração para `mecanicos` e procedimento de unificação — planejar como sprint separado.

---

## FASE P3 — BAIXO (higiene e evolução)

---

### P3-1 — Documentar plano de otimização de `current_empresa_id()`

**Contexto:** A função executa até 4 subqueries por avaliação de RLS. Com 500+ empresas e queries de alto volume, este é o principal gargalo de escala.

**Pré-condição (bloqueante):** Confirmar que o custom hook JWT do Supabase (`auth.hooks`) está injetando `empresa_id` no JWT. Se SIM, a função pode ser simplificada para apenas ler o claim, eliminando 3 das 4 subqueries.

```sql
-- Versão otimizada (aplicar somente se JWT hook ativo e testado)
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

**Esta item NÃO deve ser executado sem validação prévia.** Documentar aqui como ação futura com pré-condição obrigatória.

---

### P3-2 — Adicionar particionamento ao plano de evolução de `enterprise_audit_logs`

**Contexto:** Com 500 empresas ativas gerando 50.000+ eventos/ano cada, a tabela atingirá 25M+ linhas antes de qualquer archival rodar.

**O que fazer agora (rápido):** Verificar que o job pg_cron de archival da migration `20260414000009` está ativo:

```sql
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname ILIKE '%audit%';
```

**O que planejar para escala:**
- Particionamento por `created_at` (mensal) com `pg_partman`
- Índice composto `(empresa_id, created_at DESC)` em cada partição
- Política de retenção configurável por tenant

---

### P3-3 — Adicionar testes de integração real para RLS

**Contexto:** Os 301 testes atuais são principalmente mocks. Nenhum deles testa RLS com banco real. Um bug de cross-tenant pode passar por todo o CI invisível.

**O que criar:**

```typescript
// src/test/rls-cross-tenant-isolation.integration.test.ts
// Testa que tenant A NÃO pode ler dados do tenant B via PostgREST
// Requer banco de staging com dois tenants seed

describe('RLS cross-tenant isolation', () => {
  it('should not return data from another tenant via direct query', async () => {
    // 1. Login como user do tenant A
    // 2. Tentar SELECT em tabela com empresa_id do tenant B
    // 3. Esperar array vazio
  });
  
  it('should not allow dashboard_summary with foreign empresa_id', async () => {
    // 1. Login como user do tenant A
    // 2. Chamar dashboard_summary(empresa_id_B)
    // 3. Esperar EXCEPTION
  });
});
```

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
Semana 1 — CRÍTICOS (P0)
├── Fase 0:   Preparação e inspeção (30min)
├── P0-1:     Corrigir dashboard_summary RPC            ← COMMIT 1
├── P0-2:     Remover diretórios corrompidos             ← COMMIT 2
└── P0-3:     Configurar ASAAS_WEBHOOK_TOKEN (ops)

Semana 2 — ALTOS (P1)
├── P1-1:     Truncation em useOrdensServico             ← COMMIT 3
├── P1-2:     Rate limit persistente asaas-webhook       ← COMMIT 4
├── P1-3:     Regenerar types.ts                        ← COMMIT 5
└── P1-4:     Integrar TruncatedDataBanner nas páginas  ← COMMIT 6

Semana 3 — MÉDIOS (P2)
├── P2-1:     Investigar movimentacoes_epi              ← COMMIT 7
├── P2-2:     Corrigir search_equipamentos RPC          ← COMMIT 8
├── P2-3:     Consolidar hooks de dashboard             ← COMMIT 9
└── P2-4:     Investigar mecanicos_v2                   ← COMMIT 10

Semana 4+ — BAIXO (P3)
├── P3-1:     Plano otimização current_empresa_id()     ← Documento
├── P3-2:     Verificar pg_cron audit archival ativo    ← Verificação
└── P3-3:     Testes de integração RLS real             ← COMMIT 11+
```

---

## CHECKLIST DE VALIDAÇÃO FINAL (PÓS P0)

Antes de qualquer cliente entrar:

- [ ] `dashboard_summary` retorna erro ao receber empresa_id de outro tenant
- [ ] `dashboard_summary` usa `ordens_servico` — KPIs de O.S. aparecem no dashboard
- [ ] Diretórios `diff --git a` ausentes do repositório
- [ ] `ASAAS_WEBHOOK_TOKEN` configurado no Supabase Dashboard
- [ ] `npm run test` → todos passando
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npm run build` → sucesso

---

## CRITÉRIO DE APROVAÇÃO PARA PRIMEIRA VENDA

| Critério | Obrigatório |
|---|---|
| P0-1 (cross-tenant RPC) | ✅ BLOQUEANTE |
| P0-2 (diretórios corrompidos) | ✅ BLOQUEANTE |
| P0-3 (webhook token) | ✅ BLOQUEANTE |
| P1-1 (truncation OS) | Recomendado |
| P1-3 (types.ts completo) | Recomendado |
| P2-x em diante | Opcional para piloto |

**Com P0-1, P0-2, P0-3 corrigidos:** sistema é defensável para venda para as primeiras empresas piloto.  
**Com P0+P1 corrigidos:** sistema está pronto para operação comercial controlada.  
**Com P0+P1+P2 corrigidos:** sistema está pronto para escala acima de 50 empresas.
