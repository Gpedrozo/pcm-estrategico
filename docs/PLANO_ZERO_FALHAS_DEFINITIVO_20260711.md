# PLANO DEFINITIVO ZERO-FALHAS — PCM Estratégico
## Full Stack + Banco de Dados + Mobile

> **Data:** 2026-07-11
> **Baseline:** Auditoria Extrema V6 (2026-04-11) + Verificação cruzada com 42 repo-memories
> **Estado Atual Verificado:** Código-fonte lido e validado via subagents em 2026-07-11
> **Objetivo:** Garantir ZERO Falhas, Erros, Divergências, Quebras e Conflitos

---

## ÍNDICE

| # | Seção | Itens |
|---|-------|-------|
| 1 | [Isolamento Multi-Tenant (Frontend)](#1-isolamento-multi-tenant-frontend) | 6 |
| 2 | [Isolamento Multi-Tenant (Backend/RLS)](#2-isolamento-multi-tenant-backendrls) | 3 |
| 3 | [XSS e Sanitização](#3-xss-e-sanitização) | 4 |
| 4 | [Configuração Insegura / Credenciais](#4-configuração-insegura--credenciais) | 5 |
| 5 | [Edge Functions](#5-edge-functions) | 3 |
| 6 | [Mobile App (mecanico-app)](#6-mobile-app-mecanico-app) | 5 |
| 7 | [Alinhamento Schema ↔ Types](#7-alinhamento-schema--types) | 3 |
| 8 | [TypeScript / Type Safety](#8-typescript--type-safety) | 3 |
| 9 | [Métricas e Dados Falsos](#9-métricas-e-dados-falsos) | 1 |
| 10 | [UX / Race Conditions](#10-ux--race-conditions) | 2 |
| 11 | [Validação e Testes](#11-validação-e-testes) | 4 |
| 12 | [Checklist de Deploy](#12-checklist-de-deploy) | 8 |
| **TOTAL** | | **47 itens** |

---

## LEGENDA DE PRIORIDADE

| Tag | Significado | SLA |
|-----|-------------|-----|
| 🔴 P0 | **CRÍTICO** — Vazamento de dados cross-tenant, XSS, credencial exposta | Corrigir ANTES do próximo deploy |
| 🟠 P1 | **ALTO** — Funcionalidade quebrada, dados falsos, race condition | Corrigir na sprint atual |
| 🟡 P2 | **MÉDIO** — Melhoria de segurança, debt técnico com risco | Corrigir em até 30 dias |
| 🟢 P3 | **BAIXO** — Melhoria de qualidade, padronização | Backlog priorizado |

---

## STATUS DAS CORREÇÕES JÁ APLICADAS (NÃO REFAZER)

As seguintes correções foram **CONFIRMADAS** em memória + código e **NÃO** devem ser refeitas:

| Fix | Onde | Quando |
|-----|------|--------|
| `user_metadata` trust removido do AuthContext | `src/contexts/AuthContext.tsx` | V4 (2026-04-10) |
| Owner elevation removido | `src/contexts/AuthContext.tsx` | V4 |
| Spread order corrigido em 7 locais | Hooks + contexts | V4 |
| `empresa_id` filter em usePermissoesGranulares | `src/hooks/usePermissoesGranulares.ts` | V4 |
| `empresa_id` filter em useLubrificacao | `src/hooks/useLubrificacao.ts` | V4 |
| Tenant isolation em useAuditoria | `src/hooks/useAuditoria.ts` | V4 |
| Tenant isolation em useDispositivosMoveis | `src/hooks/useDispositivosMoveis.ts` | V4 |
| Tenant isolation em useOfflineSync | `src/hooks/useOfflineSync.ts` | V4 |
| FORCE RLS em 30+ tabelas | Migration V4 (20260410220000) | V4 |
| Rate limiting em 6 edge functions | Edge functions | V5 |
| REVOKE anon de funções diagnósticas | Migration V5 (20260411000000) | V5 |
| Credenciais removidas de 28+ scripts | docs/*.sql, scripts/ | V5 |
| Impersonation race fix | `AuthContext.tsx` L476-485 | V5 |

---

## 1. ISOLAMENTO MULTI-TENANT (FRONTEND)

### 1.1 🔴 P0 — useExecucoesPreventivas: SELECT sem empresa_id

**Arquivo:** `src/hooks/useExecucoesPreventivas.ts`
**Problema:** `useExecucoesByPlano()` filtra apenas por `plano_id`, sem `empresa_id`. queryKey não inclui `tenantId`. `enabled` não checa `!!tenantId`. UPDATE não injeta `empresa_id`.
**Risco:** Usuário de empresa A pode ver execuções preventivas de empresa B se souber o `plano_id`.

**Correção:**
```typescript
// ANTES (vulnerável)
export function useExecucoesByPlano(planoId: string | null) {
  return useQuery({
    queryKey: ['execucoes-preventivas', planoId],
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_preventivas')
        .select('*')
        .eq('plano_id', planoId!)
        .order('data_execucao', { ascending: false })
        .limit(50);

// DEPOIS (seguro)
export function useExecucoesByPlano(planoId: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['execucoes-preventivas', planoId, tenantId],
    enabled: !!planoId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_preventivas')
        .select('*')
        .eq('plano_id', planoId!)
        .eq('empresa_id', tenantId!)
        .order('data_execucao', { ascending: false })
        .limit(50);
```

**Validação:** Após fix, inspecionar React Query devtools e confirmar que queryKey muda ao trocar de empresa.

---

### 1.2 🔴 P0 — useComponentesEquipamento: SELECT sem empresa_id

**Arquivo:** `src/hooks/useComponentesEquipamento.ts`
**Problema:** Filtra apenas `equipamento_id`, sem tenant. queryKey e enabled sem `tenantId`. UPDATE sem `empresa_id`. Sem `.limit()`.

**Correção:**
```typescript
// queryKey: ['componentes-equipamento', equipamentoId, tenantId]
// enabled: !!equipamentoId && !!tenantId
// queryFn: adicionar .eq('empresa_id', tenantId!).limit(500)
// UPDATE: adicionar empresa_id no payload de update
```

---

### 1.3 🔴 P0 — useAtividadesPreventivas: SELECT sem empresa_id

**Arquivo:** `src/hooks/useAtividadesPreventivas.ts`
**Problema:** `useAtividadesByPlano()` filtra apenas `plano_id`. Mesmos gaps: queryKey, enabled, limit.

**Correção:** Mesmo padrão do item 1.1. Adicionar `.eq('empresa_id', tenantId!)`, incluir `tenantId` no queryKey e enabled.

---

### 1.4 🔴 P0 — useAtividadesLubrificacao: SELECT + INSERT sem empresa_id

**Arquivo:** `src/hooks/useAtividadesLubrificacao.ts`
**Problema:** **MAIS GRAVE** — além do SELECT sem filtro, o INSERT (`useCreateAtividade`) obtém `tenantId` mas **não o usa no payload**. Uma atividade pode ser criada sem `empresa_id`, ficando "órfã" ou acessível por qualquer tenant.

**Correção:**
```typescript
// INSERT: wrapping payload com empresa_id
mutationFn: async (input) => {
  return insertWithColumnFallback(
    async (payload) =>
      supabase
        .from('atividades_lubrificacao')
        .insert(payload)
        .select()
        .single(),
    { ...input, empresa_id: tenantId } as Record<string, unknown>,
  ) as Promise<AtividadeLubrificacao>;
```

---

### 1.5 🟠 P1 — TenantContext: fallback para user_metadata

**Arquivo:** `src/contexts/TenantContext.tsx` (linhas 102-106, 158-160, 228-230)
**Problema:** Se resolução por slug falhar, o contexto cai em `user_metadata.empresa_id` e `user_metadata.empresa_slug`. Qualquer usuário pode forjar via `supabase.auth.updateUser({ data: { empresa_id: 'uuid-alheio' } })`.

**Correção:**
```typescript
// ANTES
const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
  ? authUser.app_metadata.empresa_id
  : typeof authUser?.user_metadata?.empresa_id === 'string'
    ? authUser.user_metadata.empresa_id  // ← VULNERÁVEL
    : null;

// DEPOIS — remover fallback user_metadata
const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
  ? authUser.app_metadata.empresa_id
  : null;  // user_metadata NÃO é trusted
```

**Atenção:** Remover nos 3 locais (linhas ~102, ~158, ~228). Garantir que `app_metadata` é setado via trigger de backend (não editável pelo client).

---

### 1.6 🟡 P2 — Padronizar filtro condicional em todos os hooks

**Padrão de referência:** `usePermissoesGranulares.ts`
```typescript
if (tenantId) query = query.eq('empresa_id', tenantId);
```

**Hooks restantes para auditar e padronizar (verificar 1-a-1):**
- useEquipamentos, useMecanicos, useMateriais, useOrdensServico, useHierarquia
- Cada um deve ter: `tenantId` no queryKey, `!!tenantId` no enabled, `.eq('empresa_id', tenantId)` no SELECT

---

## 2. ISOLAMENTO MULTI-TENANT (BACKEND/RLS)

### 2.1 🔴 P0 — dados_empresa: RLS policy USING(true) expõe todos os registros

**Tabela:** `public.dados_empresa`
**Problema:** Política `"Authenticated users can view empresa" USING (true)` ativa desde migration 20260215. Migration 20260301 adicionou `is_system_owner()` mas **NÃO removeu** a política USING(true). A política aberta tem precedência.

**Correção SQL:**
```sql
-- Migration: fix_dados_empresa_rls_using_true
BEGIN;

-- 1. Remover política vulnerável
DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;

-- 2. Criar política segura
CREATE POLICY "tenant_select_own_empresa"
  ON public.dados_empresa
  FOR SELECT
  USING (
    id IN (
      SELECT empresa_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
    OR public.is_system_owner()
  );

-- 3. Garantir FORCE RLS
ALTER TABLE public.dados_empresa FORCE ROW LEVEL SECURITY;

COMMIT;
```

**Validação:** Após aplicar, logar com usuario de empresa A e tentar `supabase.from('dados_empresa').select('*')` — deve retornar APENAS a própria empresa.

---

### 2.2 🟠 P1 — Verificar RLS em tabelas sem policy explícita

**Tabelas a verificar no Supabase Dashboard (SQL Editor):**
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

Qualquer tabela com `rowsecurity = false` que contenha `empresa_id` é um vazamento.

---

### 2.3 🟡 P2 — RPC functions sem validação empresa_id

**17 RPCs referenciadas no código sem tipo em types.ts:**
`resolve_empresa_id_by_slug`, `dashboard_summary`, `close_os_with_execution_atomic`, `get_equipment_tree`, `recalculate_os_costs`, `generate_equipment_qr_batch`, `sync_pull`, `sync_push`, `generate_daily_lubricant_schedule`, `create_plano_preventivo_completo`, `get_upcoming_preventive_schedule`, `mark_programacao_executada`, `get_overdue_plans`, `get_preventive_compliance_rate`, `get_all_upcoming_schedules`, `calculate_equipment_availability`, `get_reliability_metrics`

**Ação:** Para cada RPC, verificar no SQL se existe `WHERE empresa_id = (SELECT empresa_id FROM user_roles WHERE user_id = auth.uid())` ou equivalente.

---

## 3. XSS E SANITIZAÇÃO

### 3.1 🔴 P0 — Programacao.tsx: innerHTML sem sanitização

**Arquivo:** `src/pages/Programacao.tsx` (linha 578)
**Problema:** `body.innerHTML = html` onde `html` contém dados da empresa (nome, endereço, cidade) sem escape.

**Correção:**
```bash
npm install dompurify
npm install -D @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

// Linha 578
body.innerHTML = DOMPurify.sanitize(html);
```

---

### 3.2 🟠 P1 — main.tsx: innerHTML com mensagem de erro

**Arquivo:** `src/main.tsx` (linhas 52-60)
**Problema:** `${message}` injetado em `.innerHTML` sem escape. Se backend retornar HTML, executa.

**Correção:**
```typescript
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// Na renderização:
root.innerHTML = `...${escapeHtml(message)}...`;
```

---

### 3.3 🟡 P2 — chart.tsx: dangerouslySetInnerHTML

**Arquivo:** `src/components/ui/chart.tsx` (linhas 70-81)
**Status:** Risco condicional. Injeta apenas CSS de cores definidas em config. **Se** as cores vierem de input do usuário (ex: customização de tema), é vulnerável.

**Ação:** Validar que `itemConfig.color` é sempre um valor hex/rgb hardcoded na config, nunca user input. Se houver dúvida, adicionar regex de validação:
```typescript
const isValidCssColor = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.]+\)|hsla?\([\d\s%,.]+\))$/.test(color);
```

---

### 3.4 🟢 P3 — Auditar todos os usos de innerHTML no projeto

```bash
# Buscar ocorrências adicionais
grep -rn "innerHTML\|dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.ts"
```

---

## 4. CONFIGURAÇÃO INSEGURA / CREDENCIAIS

### 4.1 🔴 P0 — Supabase client.ts: fallback localhost + hardcoded key

**Arquivo:** `src/integrations/supabase/client.ts` (linhas 126-132)
**Problema:**
```typescript
const fallbackUrl = 'http://127.0.0.1:54321'
const fallbackKey = isTestEnvironment ? 'test-key' : 'runtime-fallback-key'
```
Em produção, se env vars estiverem vazias, o cliente aponta para localhost.

**Correção:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, { ... });
```

---

### 4.2 🔴 P0 — mecanico-app: URL + ANON_KEY hardcoded

**Arquivo:** `mecanico-app/src/lib/supabase.ts` (linhas 1-5)
**Problema:** URL e chave anon do Supabase hardcoded diretamente no código-fonte.

**Correção:**
```typescript
// mecanico-app/.env
EXPO_PUBLIC_SUPABASE_URL=https://dvwsferonoczgmvfubgu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

// mecanico-app/src/lib/supabase.ts
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

---

### 4.3 🟠 P1 — Rotação da ANON_KEY (já exposta em commit history)

**Status:** A anon key está em commits anteriores do git. Mesmo movendo para `.env`, a chave atual já foi exposta.

**Ação:**
1. Gerar nova anon key no Supabase Dashboard → Settings → API
2. Atualizar em: Vercel/hosting, `.env.local`, mobile app config
3. Invalidar a chave antiga
4. Já registrado em `/memories/repo/anon-key-rotated-2026-06-22.md`

---

### 4.4 🟠 P1 — Definir SESSION_TRANSFER_SIGNING_SECRET em produção

**Arquivo:** `supabase/functions/session-transfer/index.ts`
**Problema:** Sem a env var `SESSION_TRANSFER_SIGNING_SECRET`, usa `SUPABASE_SERVICE_ROLE_KEY` como fallback de assinatura.

**Ação:** No Supabase Dashboard → Edge Functions → Secrets:
```
SESSION_TRANSFER_SIGNING_SECRET=<gerar com openssl rand -hex 32>
```

---

### 4.5 🟡 P2 — Definir ASAAS_WEBHOOK_TOKEN e DOMAIN_SYNC_SECRET

**Pendente desde V5.** Verificar no Supabase Dashboard se estão configurados.

---

## 5. EDGE FUNCTIONS

### 5.1 🔴 P0 — mecanico-device-auth: device password com entropia baixa

**Arquivo:** `supabase/functions/mecanico-device-auth/index.ts` (linha 19)
**Problema:** `SERVICE_ROLE_KEY.slice(-12)` — apenas 12 chars da service key como segredo. Brute-force facilitado.

**Correção:**
```typescript
async function devicePassword(deviceToken: string): Promise<string> {
  const secret = Deno.env.get("DEVICE_AUTH_SECRET") 
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", keyData, encoder.encode(deviceToken));
  return `pcm-da-${btoa(String.fromCharCode(...new Uint8Array(signature))).slice(0, 32)}`;
}
```

**Ação adicional:** Criar secret `DEVICE_AUTH_SECRET` no Supabase Dashboard.

---

### 5.2 🟠 P1 — platform-metrics-rollup: 5 KPIs hardcoded

**Arquivo:** `supabase/functions/platform-metrics-rollup/index.ts` (linhas 39-44)
**Problema:** `disponibilidade_pct: 99.5`, `mtbf_horas: 120`, `mttr_horas: 6`, `cumprimento_plano_pct: 93.5` são valores fake.

**Correção:** Implementar queries reais:
```typescript
// backlog_horas: SUM(horas_estimadas) FROM ordens_servico WHERE status IN ('aberta','em_andamento')
// disponibilidade_pct: (total_horas - horas_parada) / total_horas * 100 FROM equipamentos
// mtbf_horas: AVG(intervalo_entre_falhas) FROM execucoes_os WHERE tipo = 'corretiva'
// mttr_horas: AVG(horas_execucao) FROM execucoes_os WHERE tipo = 'corretiva'
// cumprimento_plano_pct: COUNT(executados) / COUNT(planejados) * 100 FROM programacao_preventiva
```

---

### 5.3 🟡 P2 — Rate limiting: verificar se todas as edge functions têm

**Já aplicado em V5 para 6 functions.** Verificar se as seguintes também têm:
- `platform-metrics-rollup`
- `backup-automation`
- `sync-pull`, `sync-push`

---

## 6. MOBILE APP (mecanico-app)

### 6.1 🔴 P0 — Tokens JWT em AsyncStorage (plaintext)

**Arquivo:** `mecanico-app/src/contexts/AuthContext.tsx` (linhas 83-84, 134, 159, 222)
**Problema:** `access_token`, `refresh_token`, `device_token`, `mecanico_codigo` salvos em `AsyncStorage` sem criptografia. Em Android rooted ou iOS jailbroken, dados acessíveis.

**Correção:**
```bash
npx expo install expo-secure-store
```

```typescript
import * as SecureStore from 'expo-secure-store';

// Substituir TODOS os AsyncStorage.setItem/getItem/removeItem de tokens:
await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
```

**Nota:** Dados não-sensíveis (preferências, cache) podem continuar em AsyncStorage.

---

### 6.2 🟠 P1 — syncEngine.ts: 4 empty catch blocks

**Arquivo:** `mecanico-app/src/lib/syncEngine.ts`
**Problema:** Linhas 43, 198, 230, 539 têm catch blocks que engolem erros silenciosamente.

**Correção:** Adicionar logging mínimo:
```typescript
catch (err) {
  console.error('[syncEngine] listener error:', err);
}
```

---

### 6.3 🟠 P1 — Offline data tampering sem validação de payload

**Problema:** SQLite local armazena dados que são sincronizados para o backend. Se o dispositivo for comprometido, payloads podem ser manipulados.

**Mitigação:**
1. Backend (RLS) já filtra por `empresa_id` — **VERIFICAR** que as tabelas de sync têm RLS ativo
2. Adicionar hash de integridade no sync payload:
```typescript
const hash = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(payload)));
```
3. Validar no edge function `sync-push` que o hash confere

---

### 6.4 🟡 P2 — Hardcoded URLs no mobile

Verificar se existem outras URLs hardcoded além de `supabase.ts`:
```bash
grep -rn "dvwsferonoczgmvfubgu\|supabase\.co\|gppis\.com" mecanico-app/src/ --include="*.ts" --include="*.tsx"
```

---

### 6.5 🟢 P3 — Reinstalar APK necessário

Após qualquer alteração em:
- `mecanico-app/src/lib/supabase.ts` (URLs)
- `mecanico-app/src/contexts/AuthContext.tsx` (storage)
- `mecanico-app/src/lib/syncEngine.ts` (sync logic)

→ **SIM**, reinstalação do APK é obrigatória (EAS build).

---

## 7. ALINHAMENTO SCHEMA ↔ TYPES

### 7.1 🟠 P1 — 17 tabelas ausentes em types.ts

**Arquivo:** `src/integrations/supabase/types.ts`
**Tabelas faltantes (confirmadas):**
1. empresa_config
2. solicitacoes_manutencao (existe como `solicitacoes` no DB)
3. dispositivos_moveis
4. qrcodes_vinculacao
5. treinamentos_ssma
6. app_versao
7. paradas_equipamento
8. requisicoes_material
9. estoque_lubrificantes
10. lubrificantes
11. movimentacao_estoque
12. execucoes_fotos
13. dashboard_analytics_snapshot
14. configuracoes_operacionais_empresa
15. membros_empresa
16. support_tickets
17. subscriptions

**Correção:**
```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

**Atenção:** Após regenerar, verificar se customizações manuais no types.ts foram sobrescritas.

---

### 7.2 🟠 P1 — 2 @ts-expect-error desnecessários

**Arquivo:** `src/components/os/OSPrintDialog.tsx` (linhas 42, 49)
- Linha 42: `solicitacoes_manutencao` — corrigir referência para `solicitacoes` (nome real da tabela)
- Linha 49: `execucoes_os` — **JÁ EXISTE** em types.ts, remover o @ts-expect-error

---

### 7.3 🟡 P2 — 17 RPCs sem definição em types.ts

Após `supabase gen types`, verificar se as RPCs aparecem na seção `Functions` do types.ts gerado. Se não, criar types manuais.

---

## 8. TYPESCRIPT / TYPE SAFETY

### 8.1 🟡 P2 — strictNullChecks desabilitado

**Arquivo:** `tsconfig.app.json`
```json
"strict": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noImplicitAny": false,
```

**Plano de migração gradual:**
1. Fase 1: Habilitar `"strictNullChecks": true` — corrigir erros resultantes
2. Fase 2: Habilitar `"noImplicitAny": true`
3. Fase 3: Habilitar `"strict": true`

**Estimativa de impacto:** ~200-500 erros novos na Fase 1 (comum em projetos deste tamanho).

---

### 8.2 🟡 P2 — 20 `as any` em hooks

**Arquivos afetados:**
| Arquivo | Ocorrências |
|---------|-------------|
| useComponentesEquipamento.ts | 2 |
| useEquipamentos.ts | 2 |
| useHierarquia.ts | 6 |
| useMateriais.ts | 2 |
| useMecanicos.ts | 2 |
| useOrdensServico.ts | 2 |
| useOwner2Portal.ts | 3 |
| useSupportTickets.ts | 1 |

**Ação:** Após regenerar types.ts (item 7.1), muitos `as any` podem ser substituídos por tipos corretos.

---

### 8.3 🟢 P3 — Remover @ts-expect-error obsoletos

Após types.ts regenerado, buscar e remover todos os `@ts-expect-error` que já têm tipo definido.

---

## 9. MÉTRICAS E DADOS FALSOS

### 9.1 🟠 P1 — Dashboard mostra métricas hardcoded

**Impacto:** Gestores tomam decisões baseadas em dados falsos (MTBF=120h, MTTR=6h, Disponibilidade=99.5%).

**Ação:** Ver correção detalhada no item 5.2.

---

## 10. UX / RACE CONDITIONS

### 10.1 🟡 P2 — RoleGuard: flash de tela em branco

**Arquivo:** `src/guards/RoleGuard.tsx`
**Problema:** Retorna `null` durante loading, causando flash branco.

**Correção:**
```typescript
if (isLoading || isHydrating || authStatus === 'idle' || authStatus === 'loading' || authStatus === 'hydrating') {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

---

### 10.2 🟢 P3 — EnvironmentGuard: verificar hostname em produção

**Status:** Funcional. Apenas garantir que `OWNER_HOSTNAME` está correto para o domínio de produção (`owner.gppis.com.br`).

---

## 11. VALIDAÇÃO E TESTES

### 11.1 🔴 P0 — Teste de isolamento multi-tenant (manual)

**Procedimento:**
1. Criar 2 empresas de teste: EmpresaA e EmpresaB
2. Criar 1 usuário em cada empresa
3. Logar como UsuarioA
4. Tentar acessar dados de EmpresaB via:
   - Console do browser: `supabase.from('dados_empresa').select('*')`
   - Console do browser: `supabase.from('equipamentos').select('*')`
   - Console do browser: `supabase.from('ordens_servico').select('*')`
5. **Esperado:** Apenas dados da EmpresaA devem retornar
6. **Se falhar:** Parar deploy, investigar RLS

---

### 11.2 🟠 P1 — Teste de XSS (manual)

**Procedimento:**
1. Em `dados_empresa.nome`, inserir: `<img src=x onerror=alert('XSS')>`
2. Acessar página de Programação
3. **Esperado:** Texto exibido sem executar script
4. **Se falhar:** DOMPurify não foi aplicado corretamente

---

### 11.3 🟠 P1 — Teste de types alignment

**Procedimento:**
```bash
npx tsc --noEmit
```
Zero erros = types alinhados.

---

### 11.4 🟡 P2 — Testes automatizados (vitest)

**Estado atual:** vitest.config.ts existe. Verificar cobertura:
```bash
npx vitest --coverage
```

**Meta:** Cobertura mínima de 60% em `src/hooks/` e `src/contexts/`.

---

## 12. CHECKLIST DE DEPLOY

### Pré-deploy obrigatório:

- [ ] **12.1** 🔴 Corrigir 4 hooks sem isolamento (itens 1.1-1.4)
- [ ] **12.2** 🔴 Corrigir dados_empresa RLS (item 2.1)
- [ ] **12.3** 🔴 Instalar DOMPurify + sanitizar Programacao.tsx (item 3.1)
- [ ] **12.4** 🔴 Remover fallback localhost do client.ts (item 4.1)
- [ ] **12.5** 🔴 Mover credenciais hardcoded do mobile (item 4.2)
- [ ] **12.6** 🔴 Fix device password entropy (item 5.1)
- [ ] **12.7** 🔴 Migrar tokens para SecureStore no mobile (item 6.1)
- [ ] **12.8** 🟠 Regenerar types.ts (item 7.1)

### Pós-deploy:

- [ ] Executar teste de isolamento (item 11.1)
- [ ] Executar teste de XSS (item 11.2)
- [ ] Verificar logs do Sentry por 24h
- [ ] Confirmar que React Query devtools mostra queryKeys com tenantId

---

## ORDEM DE EXECUÇÃO RECOMENDADA

| Fase | Itens | Tipo | Risco de Quebra |
|------|-------|------|-----------------|
| **Fase 1** | 2.1, 1.1-1.4, 1.5 | SQL migration + hooks frontend | BAIXO (aditivo) |
| **Fase 2** | 3.1, 3.2, 4.1 | DOMPurify + config | BAIXO |
| **Fase 3** | 5.1, 4.4, 4.2 | Edge functions + secrets | BAIXO (backend only) |
| **Fase 4** | 6.1, 6.2 | Mobile app | REQUER novo APK |
| **Fase 5** | 7.1, 7.2, 8.2 | Types + cleanup | ZERO (tipagem only) |
| **Fase 6** | 11.1-11.4 | Testes de validação | ZERO (read-only) |
| **Fase 7** | 8.1, 5.2, 10.1 | strict mode, KPIs, UX | MÉDIO (muitos erros TS) |

---

## RESUMO EXECUTIVO

| Prioridade | Quantidade | Status |
|------------|-----------|--------|
| 🔴 P0 CRÍTICO | 11 itens | BLOQUEIA DEPLOY |
| 🟠 P1 ALTO | 13 itens | Sprint atual |
| 🟡 P2 MÉDIO | 12 itens | 30 dias |
| 🟢 P3 BAIXO | 5 itens | Backlog |
| **TOTAL** | **41 itens únicos** | |

**Nota de segurança:** Os 11 itens P0 representam **vulnerabilidades ativas em produção**. Qualquer um deles pode resultar em vazamento de dados entre tenants ou execução de código malicioso. A correção da Fase 1 (RLS + hooks) é a mais impactante e deve ser aplicada imediatamente.

---

*Documento gerado automaticamente via auditoria de código-fonte real. Todos os achados foram verificados por leitura direta dos arquivos em 2026-07-11.*
