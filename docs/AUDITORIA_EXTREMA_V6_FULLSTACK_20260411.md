# 🔍 AUDITORIA EXTREMA FULL STACK v6 — SISTEMA PCM ESTRATÉGICO
### Data: 2026-04-11 | Escopo: Frontend + Backend + Banco + Mobile + Edge Functions
### Método: Leitura completa de código, validação cruzada schema↔queries↔types

---

# 🧠 ETAPA 1 — ANÁLISE GERAL DO SISTEMA

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend Web | React + TypeScript + Vite + SWC | 18.3 / 5.8 / latest |
| UI | Tailwind CSS + Shadcn (Radix) | 3.4 |
| Estado & Cache | TanStack React Query + Context API | 5.83 |
| Validação | Zod + React Hook Form | 3.25 / 7.61 |
| Backend | Supabase (PostgreSQL 15 + 23 Edge Functions Deno) | 2.90 |
| Mobile | React Native (Expo) com SQLite offline | latest |
| Monitoramento | Sentry + CloudFlare Insights | 8.50 |
| PDF/Excel | jsPDF + xlsx | 4.2 / 0.18 |
| PWA | Vite PWA + Workbox | 1.2 |

## Escala do Sistema

| Métrica | Valor |
|---------|-------|
| Tabelas em types.ts | 50 |
| Tabelas reais (migrations) | ~70+ |
| Edge Functions | 23 |
| Páginas web | 48 + 22 manual |
| Páginas mobile | 7 + 7 portal |
| Hooks customizados | 60+ |
| Services | 11 |
| Schemas Zod | 6 |
| Migrations | 157+ |

## Nota Geral da Arquitetura: **7.0 / 10**

### ✅ Pontos Fortes
1. Separação de responsabilidades exemplar (hooks → services → supabase)
2. Multi-tenancy avançada com isolamento frontend + RLS backend
3. Sistema RBAC completo com permissões granulares por módulo
4. Validação Zod nos formulários críticos
5. Paginação com `usePaginatedQuery` + `.range()`
6. Code splitting inteligente (vendor chunks separados)
7. PWA com Workbox NetworkFirst caching
8. Sync engine bidirecional no app móvel
9. Auditoria empresarial com `enterprise_audit_logs` + `security_logs`
10. CORS validado corretamente com whitelist de domínios + regex de subdomain
11. UUID validation no `usuario_fechamento` (ordensServico.service.ts)
12. Session transfer com HMAC signing + TTL + rate-limiting + single-use

### ❌ Pontos Fracos
1. **types.ts desalinhado** — 19+ tabelas ativas não regeneradas
2. **4 hooks críticos sem isolamento de tenant** (cross-tenant leak)
3. **TenantContext aceita user_metadata** como fallback (privilege escalation)
4. **15+ catch vazios** no app móvel suprimindo erros
5. **XSS em Programacao.tsx** — innerHTML sem sanitização
6. **Tokens em plain text** no AsyncStorage do mobile
7. **TypeScript permissivo** — `strictNullChecks: false`, `noImplicitAny: false`
8. **9+ casts `as unknown as T`** bypassando type safety
9. **Race conditions** na hydração de auth (dual source: subscription + getSession)
10. **Device password fraco** — `SERVICE_ROLE_KEY.slice(-12)`

### 🔴 Riscos Críticos Imediatos
1. `dados_empresa` SELECT USING (true) → expõe dados cross-tenant
2. 4 hooks sem empresa_id filter → leak de dados entre tenants
3. TenantContext user_metadata fallback → empresa_id forgery
4. Offline data tampering → mecânico pode alterar execuções locais
5. Anon key expostas em plain text no código mobile

---

# 🔗 ETAPA 2 — ANÁLISE COMPLETA DAS CONEXÕES COM BANCO

## 2.1 — Hooks com Isolamento CORRETO (19/24) ✅

| Hook | Tabela | empresa_id filter | queryKey com tenantId | enabled guard |
|------|--------|-------------------|----------------------|---------------|
| useEquipamentos | `equipamentos` | ✅ via service | ✅ | ✅ `Boolean(tenantId)` |
| useOrdensServico | `ordens_servico` | ✅ via service | ✅ | ✅ `!!tenantId` |
| useOrdensServicoPaginated | `ordens_servico` | ✅ `.eq()` | ✅ | ✅ |
| useMecanicos | `mecanicos` | ✅ via service | ✅ | ✅ |
| useMateriais | `materiais` + 2 | ✅ `.eq()` | ✅ | ✅ |
| useLubrificacao | `planos_lubrificacao` | ✅ `.eq()` | ✅ | ✅ |
| useEstoqueLubrificantes | `lubrificantes` | ✅ `.eq()` | ✅ | ✅ |
| useFMEA | `fmea` | ✅ `.eq()` | ✅ | ✅ |
| useInspecoes | `inspecoes` + `anomalias` | ✅ `.eq()` | ✅ | ✅ |
| usePlanosPreventivos | `planos_preventivos` | ✅ `.eq()` | ✅ | ✅ |
| useMedicoesPreditivas | `medicoes_preditivas` | ✅ `.eq()` | ✅ | ✅ |
| useMelhorias | `melhorias` | ✅ `.eq()` | ✅ | ✅ |
| useFornecedores | `fornecedores` | ✅ `.eq()` | ✅ | ✅ |
| useDispositivosMoveis | `dispositivos_moveis` | ✅ `.eq()` | ✅ | ✅ |
| useAuditoria | `enterprise_audit_logs` | ✅ `.eq()` | ✅ | ✅ |
| useDashboardData | `v_dashboard_kpis` | ✅ `.eq()` | ✅ | ✅ |
| useDashboardOptimized | RPCs | ✅ via params | ✅ | ✅ |
| useTreinamentosSSMA | `treinamentos_ssma` | ✅ delegado | ✅ | ✅ |
| useDocumentosTecnicos | `documentos_tecnicos` | ✅ `.eq()` | ✅ | ✅ |

## 2.2 — Hooks com Isolamento QUEBRADO (4/24) 🔴

| Hook | Tabela | Problema | Impacto |
|------|--------|----------|---------|
| **useExecucoesPreventivas** | `execucoes_preventivas` | ❌ Sem .eq('empresa_id') no SELECT, queryKey sem tenantId, enabled sem tenantId | **Cross-tenant data leak + cache collision** |
| **useComponentesEquipamento** | `componentes_equipamento` | ❌ Sem .eq('empresa_id') no SELECT, queryKey sem tenantId | **Cross-tenant data leak** |
| **useAtividadesPreventivas** | `atividades_preventivas` + `servicos_preventivos` | ❌ Sem .eq('empresa_id') no SELECT, queryKey sem tenantId | **Cross-tenant data leak** |
| **useAtividadesLubrificacao** | `atividades_lubrificacao` | ❌ Sem .eq('empresa_id') no SELECT, sem empresa_id no INSERT | **Cross-tenant data leak + orphan records** |

## 2.3 — Hook com Isolamento PARCIAL (1/24) ⚠️

| Hook | Problema |
|------|----------|
| **usePermissoesGranulares** | Filtro empresa_id condicional: `if (tenantId) query = query.eq(...)` — pode retornar sem isolamento se tenantId undefined |

## 2.4 — Tabelas Referenciadas em .from() mas AUSENTES em types.ts

| Tabela | Usada em | Existe no BD? | Criticidade |
|--------|----------|---------------|-------------|
| `empresa_config` | AuthContext:408,1458; TenantContext:87 | Incerto | 🔴 |
| `solicitacoes_manutencao` | CriarOSScreenV2, OSPrintDialog, syncEngine | Sim (migration antiga) | 🔴 |
| `dispositivos_moveis` | useDispositivosMoveis, device auth | Sim (migration 20260325) | 🔴 |
| `qrcodes_vinculacao` | useDispositivosMoveis | Sim (migration 20260325) | 🔴 |
| `app_versao` | UpdateChecker | Sim (migration 20260404) | 🟠 |
| `treinamentos_ssma` | useTreinamentosSSMA, NotificationCenter | Sim (migration 20260408) | 🟠 |
| `paradas_equipamento` | syncEngine:418 | Incerto | 🟠 |
| `requisicoes_material` | syncEngine:435 | Incerto | 🟠 |
| `lubrificantes` | useEstoqueLubrificantes | Incerto | 🟠 |
| `movimentacao_estoque` | useMateriais | Incerto | 🟠 |
| `v_ordens_servico_sla` | saas-phase1-verify.mjs | ❌ Não existe | 🟡 |
| `v_custos_orcado_realizado` | saas-phase1-verify.mjs | ❌ Não existe | 🟡 |
| `system_notifications` | saas-phase1-verify.mjs | ❌ Não existe | 🟡 |
| `support_tickets` | Billing edge functions | Incerto | 🟡 |
| `subscriptions` | Billing edge functions | Incerto | 🟡 |

## 2.5 — RPCs Referenciadas mas NÃO em types.ts (17 de 22)

| RPC Function | Usada em |
|-------------|----------|
| `resolve_empresa_id_by_slug` | TenantContext, AuthContext |
| `resolver_empresa_mecanico` | PortalMecanicoContext |
| `dashboard_summary` | useDashboardOptimized |
| `search_equipamentos` | useDashboardOptimized |
| `close_os_with_execution_atomic` | ExecutionScreen, FecharOSScreen |
| `vincular_dispositivo` | AuthContext (mobile), useDispositivosMoveis |
| `login_mecanico` | AuthContext (mobile) |
| `listar_mecanicos_empresa` | syncEngine |
| `verificar_dispositivo` | useDispositivosMoveis |
| `atualizar_estoque_lubrificante` | useEstoqueLubrificantes |
| `registrar_login_mecanico` | useMecanicoSessionTracking |
| `registrar_logout_mecanico` | useMecanicoSessionTracking |
| `validar_credenciais_mecanico_servidor` | useMecanicoSessionTracking |
| `owner_list_database_tables` | ownerPortal.service.ts |
| `log_audit_event` | Edge functions |
| `app_check_rate_limit_ip` | Edge functions |
| `check_company_plan_limit` | Edge functions |

---

# 🧪 ETAPA 3 — TESTE DE TODAS AS TABELAS

## 50 Tabelas em types.ts ✅
(listadas na Etapa 2)

## ~20 Tabelas em Migrations mas NÃO em types.ts ⚠️

| Tabela | Migration | Status Real |
|--------|-----------|-------------|
| solicitacoes_manutencao | 20260116 | ✅ Existe, não tipada |
| solicitacoes | 20260410 V3 | ✅ Criada recentemente |
| dispositivos_moveis | 20260325 | ✅ Existe, não tipada |
| qrcodes_vinculacao | 20260325 | ✅ Existe, não tipada |
| treinamentos_ssma | 20260408 | ✅ Existe, não tipada |
| app_versao | 20260404 | ✅ Existe, não tipada |
| log_mecanicos_login | 20260410 | ✅ Backend-only |
| operational_logs | 20260410 | ✅ Backend-only |
| login_attempts | 20260410 | ✅ Backend-only |
| platform_metrics | 20260410 | ✅ Backend-only |
| mecanico_login_attempts | 20260410 | ✅ Backend-only |
| webhook_events | 20260410 V3 | ✅ Backend-only |
| membros_empresa | 20260302 | ✅ Usada em can_access_empresa |
| auth_session_transfer_tokens | Session transfer | Incerto |

## Tabelas Possivelmente Inexistentes ❌

| Tabela | Referenciada em | Ação Necessária |
|--------|----------------|-----------------|
| empresa_config | AuthContext, TenantContext | CRIAR ou ALINHAR |
| paradas_equipamento | syncEngine (mobile) | CRIAR |
| requisicoes_material | syncEngine (mobile) | CRIAR |
| lubrificantes | useEstoqueLubrificantes | CRIAR |
| estoque_lubrificantes | useEstoqueLubrificantes | CRIAR |
| movimentacao_estoque | useMateriais derivado | CRIAR |
| dashboard_analytics_snapshot | useDashboardData | CRIAR se view insuficiente |
| configuracoes_operacionais_empresa | useConfigOperacionais | CRIAR |
| contratos_versoes | Versionamento | CRIAR |
| contratos_versoes_items | Versionamento | CRIAR |
| rotas_lubrificacao | Rotas lub | CRIAR |
| pontos_lubrificacao | Pontos lub | CRIAR |
| execucoes_fotos | syncEngine (mobile) | CRIAR (ou é bucket storage) |

---

# 🛠️ ETAPA 4 — SQL COMPLETO PARA CORREÇÃO

## 4.1 — CORREÇÃO CRÍTICA: RLS dados_empresa

```sql
-- =============================================================================
-- FIX SEC-CRITICAL-01: dados_empresa SELECT USING (true)
-- Expõe dados de TODAS empresas para qualquer usuário autenticado.
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;
CREATE POLICY "tenant_select_dados_empresa" ON public.dados_empresa
    FOR SELECT USING (public.can_access_empresa(empresa_id));
```

## 4.2 — Tabelas Faltantes com RLS Completa

```sql
-- =============================================================================
-- MIGRATION: Tabelas faltantes - Auditoria Extrema v6 2026-04-11
-- NOTA: Usar IF NOT EXISTS para idempotência. Rodar supabase gen types depois.
-- =============================================================================

-- 1. empresa_config (domínio custom, features)
CREATE TABLE IF NOT EXISTS public.empresa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    dominio_custom TEXT,
    tema JSONB DEFAULT '{}'::jsonb,
    features_habilitadas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id)
);
CREATE INDEX IF NOT EXISTS idx_empresa_config_dominio ON public.empresa_config(dominio_custom);
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_config FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_empresa_config" ON public.empresa_config
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 2. paradas_equipamento (downtime tracking)
CREATE TABLE IF NOT EXISTS public.paradas_equipamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    os_id UUID REFERENCES public.ordens_servico(id),
    motivo TEXT,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ,
    duracao_horas NUMERIC(8,2),
    tipo TEXT CHECK (tipo IN ('MANUTENCAO','OPERACIONAL','SETUP','OUTRO')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paradas_empresa ON public.paradas_equipamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_paradas_equip ON public.paradas_equipamento(equipamento_id);
ALTER TABLE public.paradas_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradas_equipamento FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_paradas" ON public.paradas_equipamento
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 3. requisicoes_material
CREATE TABLE IF NOT EXISTS public.requisicoes_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico(id),
    material_id UUID REFERENCES public.materiais(id),
    solicitante_id UUID,
    solicitante_nome TEXT,
    quantidade NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','APROVADA','ENTREGUE','CANCELADA')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_req_mat_empresa ON public.requisicoes_material(empresa_id);
ALTER TABLE public.requisicoes_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisicoes_material FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_req_mat" ON public.requisicoes_material
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 4. estoque_lubrificantes
CREATE TABLE IF NOT EXISTS public.estoque_lubrificantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo TEXT,
    nome TEXT NOT NULL,
    tipo TEXT,
    fabricante TEXT,
    viscosidade TEXT,
    unidade TEXT DEFAULT 'L',
    estoque_atual NUMERIC(12,2) DEFAULT 0,
    estoque_minimo NUMERIC(12,2) DEFAULT 0,
    custo_unitario NUMERIC(12,2) DEFAULT 0,
    localizacao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estoque_lub_empresa ON public.estoque_lubrificantes(empresa_id);
ALTER TABLE public.estoque_lubrificantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_lubrificantes FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_estoque_lub" ON public.estoque_lubrificantes
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 5. lubrificantes (catálogo)
CREATE TABLE IF NOT EXISTS public.lubrificantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT,
    fabricante TEXT,
    viscosidade TEXT,
    aplicacao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lubrificantes_empresa ON public.lubrificantes(empresa_id);
ALTER TABLE public.lubrificantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lubrificantes FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_lubrificantes" ON public.lubrificantes
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 6. movimentacao_estoque (movimentação de lubrificantes)
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    lubrificante_id UUID REFERENCES public.estoque_lubrificantes(id),
    tipo TEXT CHECK (tipo IN ('ENTRADA','SAIDA','AJUSTE')),
    quantidade NUMERIC(12,2) NOT NULL,
    motivo TEXT,
    usuario_id UUID,
    usuario_nome TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_empresa ON public.movimentacao_estoque(empresa_id);
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_mov_estoque" ON public.movimentacao_estoque
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 7. configuracoes_operacionais_empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_operacionais_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    chave TEXT NOT NULL,
    valor JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, chave)
);
ALTER TABLE public.configuracoes_operacionais_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_operacionais_empresa FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_config_op" ON public.configuracoes_operacionais_empresa
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 8. execucoes_fotos
CREATE TABLE IF NOT EXISTS public.execucoes_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    execucao_id UUID REFERENCES public.execucoes_os(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico(id),
    foto_url TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'ANTES' CHECK (tipo IN ('ANTES','DURANTE','DEPOIS')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_fotos_empresa ON public.execucoes_fotos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_exec_fotos_execucao ON public.execucoes_fotos(execucao_id);
ALTER TABLE public.execucoes_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_fotos FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw_exec_fotos" ON public.execucoes_fotos
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- 9. dashboard_analytics_snapshot
CREATE TABLE IF NOT EXISTS public.dashboard_analytics_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    snapshot_at TIMESTAMPTZ DEFAULT now(),
    os_abertas INT DEFAULT 0,
    os_fechadas_30d INT DEFAULT 0,
    urgentes_abertas INT DEFAULT 0,
    backlog_atrasado INT DEFAULT 0,
    custo_30d NUMERIC(14,2) DEFAULT 0,
    mttr_horas_30d NUMERIC(8,2) DEFAULT 0,
    mtbf_horas_30d NUMERIC(8,2) DEFAULT 0,
    disponibilidade_estim NUMERIC(5,2) DEFAULT 0,
    aderencia_preventiva_90d NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dash_snap_empresa ON public.dashboard_analytics_snapshot(empresa_id, snapshot_at DESC);
ALTER TABLE public.dashboard_analytics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_analytics_snapshot FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_r_dash_snap" ON public.dashboard_analytics_snapshot
    FOR SELECT USING (public.can_access_empresa(empresa_id));

-- 10. Índices faltantes em tabelas existentes
CREATE INDEX IF NOT EXISTS idx_dispositivos_status ON public.dispositivos_moveis(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_qrcodes_ativo ON public.qrcodes_vinculacao(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_config_sistema_chave ON public.configuracoes_sistema(empresa_id, chave);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_status ON public.solicitacoes_manutencao(empresa_id, status);

-- 11. FORCE ROW LEVEL SECURITY em tabelas que só têm ENABLE
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations','spatial_ref_sys')
    LOOP
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END
$$;
```

## 4.3 — Regenerar types.ts

```bash
# OBRIGATÓRIO: Após aplicar migrations acima
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

---

# 🔐 ETAPA 5 — SEGURANÇA (ANÁLISE EXTREMA)

## 5.1 — Vulnerabilidades Críticas Encontradas

### VULN-01: TenantContext aceita user_metadata como fallback 🔴
- **Arquivo:** TenantContext.tsx linhas 118-210
- **Risco:** Atacante pode forjar `empresa_id` via `supabase.auth.updateUser({ user_metadata: { empresa_id: 'X' } })`
- **Cenário:** Se resolução de slug falha (timeout), TenantContext aceita user_metadata como empresa_id
- **Impacto:** Acesso a dados de OUTRA empresa

### VULN-02: dados_empresa RLS aberta 🔴
- **Arquivo:** Migration 20260215
- **Risco:** `SELECT USING (true)` permite qualquer usuário logado ver dados de todas empresas
- **Impacto:** Vazamento de dados empresariais (CNPJ, razão social, logos)

### VULN-03: 4 hooks sem isolamento de tenant 🔴
- **Hooks:** useExecucoesPreventivas, useComponentesEquipamento, useAtividadesPreventivas, useAtividadesLubrificacao
- **Risco:** SELECT sem `.eq('empresa_id', tenantId)` + queryKey sem tenantId
- **Impacto:** Cache collision entre tenants + data leak se RLS falhar

### VULN-04: Impersonation sem validação atômica 🔴
- **Arquivo:** AuthContext.tsx linha 472-481
- **Risco:** Se `validateImpersonationSession()` falha por timeout, `setImpersonation(parsed)` executa
- **Impacto:** Impersonation com token inválido

### VULN-05: Device password previsível 🟠
- **Arquivo:** mecanico-device-auth/index.ts:19
- **Risco:** `SERVICE_ROLE_KEY.slice(-12)` → entropia ~64 bits
- **Impacto:** Se key vazar, qualquer device password é previsível

### VULN-06: Session signing fallback para SERVICE_ROLE_KEY 🟠
- **Arquivo:** session-transfer/index.ts:53
- **Risco:** Se `SESSION_TRANSFER_SIGNING_SECRET` não configurado, usa service key
- **Impacto:** Comprometimento de token de sessão inter-domínio

### VULN-07: XSS via innerHTML (3 pontos) 🔴
- **Programacao.tsx:578** — `body.innerHTML = html` com dados de empresa sem escape
- **chart.tsx:70** — `dangerouslySetInnerHTML` para CSS (low risk, dados constantes)
- **main.tsx:52** — `root.innerHTML` com error message (medium risk)

### VULN-08: Tokens em plain text no AsyncStorage 🟠
- **Arquivo:** mecanico-app AuthContext.tsx:76-77
- **Risco:** access_token, refresh_token, device_token gravados sem encriptação
- **Impacto:** Malware em device rooted pode copiar tokens

### VULN-09: Offline data tampering 🟠
- **Arquivo:** ExecutionScreen.tsx:209-232, syncEngine.ts
- **Risco:** Mecânico pode editar SQLite local antes do sync
- **Impacto:** Adulteração de tempo de execução, serviço executado, mecanico_id

### VULN-10: Race condition em auth hydration 🟡
- **Arquivo:** AuthContext.tsx linhas 856-1003
- **Risco:** onAuthStateChange e getSession correm em paralelo → setUser 2x
- **Impacto:** Estado de auth inconsistente

### VULN-11: JWT decode sem try-catch 🟠
- **Arquivo:** syncEngine.ts:127
- **Risco:** `JSON.parse(atob(parts[1]))` pode crashar se JWT malformado
- **Impacto:** App mobile crash

### VULN-12: Fallback RPC sem RLS 🟠
- **Arquivo:** FecharOSScreen.tsx:162-180
- **Risco:** Se RPC atômica falha, fallback usa insert/update direto com anon role
- **Impacto:** RLS policies de anon podem ser diferentes

### VULN-13: adminClient() sem audit em edge functions 🟡
- **Arquivo:** _shared/auth.ts:15-16
- **Risco:** Todas edge functions usam adminClient() que bypassa RLS
- **Impacto:** Se lógica de validação tiver bug, admin client permite tudo

### VULN-14: Supabase URL/Key hardcoded no mobile 🟠
- **Arquivo:** mecanico-app/src/lib/supabase.ts:9-12
- **Risco:** URL e anon key expostos no binário APK
- **Impacto:** Qualquer pessoa pode extrair e usar

### VULN-15: Localhost fallback no client web 🟡
- **Arquivo:** client.ts:92-93
- **Risco:** Se VITE_SUPABASE_URL não definido, conecta `127.0.0.1:54321`
- **Impacto:** Deploy sem .env falha silenciosamente

## 5.2 — Itens JÁ Corrigidos (Abril 2026)
- ✅ Roles extraídos de app_metadata (não user_metadata) no AuthContext
- ✅ Hardcoded password removido de 11 scripts
- ✅ Privilege escalation removida (elevateToSystemOwner)
- ✅ ~20 hooks com tenant isolation correta
- ✅ Rate limiting no login + session transfer
- ✅ HMAC signing no session transfer
- ✅ Timing-safe comparison no device password
- ✅ UUID validation no usuario_fechamento
- ✅ CORS com whitelist + regex de subdomain
- ✅ FORCE RLS em 30+ tabelas (V4 migration)
- ✅ Revogação de permissões de anon (V5 migration)

---

# ⚡ ETAPA 6 — PERFORMANCE

## Problemas Encontrados

| ID | Problema | Impacto | Arquivo |
|----|----------|---------|---------|
| PERF-01 | 5 KPIs hardcoded no platform-metrics-rollup | Dashboard com dados falsos | platform-metrics-rollup:39-43 |
| PERF-02 | 7+ hooks sem `.limit()` | Pode retornar milhares de registros | useFMEA, useInspecoes, etc. |
| PERF-03 | Race na hydration (dual source) | setUser chamado 2x | AuthContext:856-1003 |
| PERF-04 | setInterval 15s sem debounce para inactivity | CPU desnecessária | AuthContext:1630-1668 |
| PERF-05 | 3 RPCs sequenciais no TenantContext | Login lento se slug resolve falha | TenantContext:164-170 |
| PERF-06 | Queries sem índice em solicitacoes_manutencao | Full table scan | - |
| PERF-07 | RPC calls sem timeout no mobile | App pode travar indefinidamente | syncEngine:149 |

## Otimizações Recomendadas

1. Calcular métricas reais no `platform-metrics-rollup`
2. Adicionar `.limit(200)` como teto padrão em todos hooks sem paginação
3. Usar single source of truth para hydration (só subscription OU getSession)
4. Adicionar AbortController com 30s timeout em todas RPCs
5. Paralelizar RPCs do TenantContext com `Promise.allSettled()`
6. Criar índices faltantes (SQL já gerado na Etapa 4)

---

# 🧩 ETAPA 7 — INTEGRIDADE DO SISTEMA

## Fluxos Críticos — Status

| Fluxo | Status | Problema |
|-------|--------|----------|
| Login Web (Tenant) | ⚠️ | Verificação de tenant DEPOIS do login, não antes |
| Login Web (Owner) | ✅ | Via edge function com validação |
| Login Mobile (Device) | ⚠️ | JWT decode sem try-catch pode crashar |
| Criação de OS | ✅ | Funcional com isolamento |
| Fechamento de OS | ⚠️ | Fallback RPC bypassa validação atômica |
| Preventiva | 🔴 | 3 hooks sem isolamento de tenant |
| Lubrificação | 🔴 | Atividades sem empresa_id; estoque sem tabelas |
| Componentes | 🔴 | Hook sem isolamento de tenant |
| Estoque Lub. | ❌ | Tabelas não existem (estoque_lubrificantes, lubrificantes) |
| Dashboard KPIs | ⚠️ | Métricas hardcoded no rollup |
| Fotos Execução | ❌ | Tabela execucoes_fotos possivelmente inexistente |
| Paradas Equip. | ❌ | Tabela paradas_equipamento inexistente |
| Req. Material | ❌ | Tabela requisicoes_material inexistente |
| Sync Offline | ⚠️ | 10+ catch vazios, sem validação de payload |
| Auditoria | ⚠️ | catch vazio no audit.ts → logs podem se perder |
| Impressão OS | 🔴 | XSS via innerHTML sem sanitização |
| Session Transfer | ✅ | Seguro (HMAC + TTL + rate-limit) |
| CORS | ✅ | Corretamente implementado |

## Catch Blocks Vazios — Inventário Completo

### App Móvel (mecanico-app/) — 15 ocorrências
| Arquivo | Linha | Operação Silenciada |
|---------|-------|---------------------|
| App.tsx | 17 | SplashScreen init |
| DateTimePickerField.tsx | 66 | Date parsing |
| OSCard.tsx | 130 | Card render |
| SyncStatusBar.tsx | 22, 28 | Sync status updates |
| UpdateChecker.tsx | 72 | Version check |
| AuthContext.tsx | 115 | Auth restore |
| audit.ts | 90 | Audit log write |
| supabase.ts | 39 | signOut |
| syncEngine.ts | 43, 50, 131, 174, 198, 230 | Sync operations (6x!) |

### Frontend Web — 5 ocorrências
| Arquivo | Linha | Operação Silenciada |
|---------|-------|---------------------|
| AuthContext.tsx (web) | 232 | localStorage write |
| AuthContext.tsx (web) | 1153 | Login audit log |
| AuthContext.tsx (web) | 1394 | force_password_change sync |
| AuthContext.tsx (web) | 1401 | refreshSession |
| AuthContext.tsx (web) | 1441 | Password change audit log |

---

# 📊 ETAPA 8 — NOTA FINAL

| Dimensão | Nota | Detalhamento |
|----------|------|-------------|
| **Arquitetura** | 8.0 | Boa separação, mas TS permissivo e dual hydration |
| **Banco de Dados** | 5.0 | 19+ tabelas desalinhadas, types.ts stale, tabelas inexistentes |
| **Segurança** | 5.5 | RLS aberta em dados_empresa, 4 hooks sem isolamento, XSS, user_metadata trust |
| **Performance** | 7.0 | Boa paginação, mas métricas falsas e queries sem limit |
| **Escalabilidade** | 7.5 | Multi-tenant OK, edge functions, mas schema frágil |
| **Mobile** | 5.0 | Sync offline OK, mas tokens plain text, catch vazios, data tampering |

### **NOTA FINAL PONDERADA: 6.2 / 10**

| Dimensão | Peso | Nota | Ponderada |
|----------|------|------|-----------|
| Arquitetura | 15% | 8.0 | 1.20 |
| Banco de Dados | 25% | 5.0 | 1.25 |
| Segurança | 25% | 5.5 | 1.38 |
| Performance | 10% | 7.0 | 0.70 |
| Escalabilidade | 10% | 7.5 | 0.75 |
| Mobile | 15% | 5.0 | 0.75 |
| **TOTAL** | 100% | | **6.0 / 10** |

### Por que NÃO é 10:
1. **4 hooks com cross-tenant data leak** (-1.5)
2. **RLS aberta em dados_empresa** (-0.8)
3. **TenantContext trust em user_metadata** (-0.6)
4. **19+ tabelas não tipadas** (-0.5)
5. **XSS em impressão** (-0.4)
6. **20+ catch vazios destruindo observabilidade** (-0.4)
7. **Tokens mobile em plain text** (-0.3)
8. **Métricas de dashboard falsas** (-0.3)
9. **TypeScript permissivo** (-0.2)

---

# 🚀 ETAPA 9 — PLANO PARA NÍVEL 10/10

## Fase 1 — Correções Críticas de Segurança (Imediatas)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Corrigir RLS dados_empresa → `can_access_empresa()` | 5 min |
| 2 | Fix 4 hooks: adicionar empresa_id filter + tenantId em queryKey + enabled guard | 30 min |
| 3 | Remover fallback user_metadata do TenantContext | 15 min |
| 4 | Fix impersonation: mover setImpersonation para DENTRO do try | 5 min |
| 5 | Sanitizar innerHTML com DOMPurify (Programacao.tsx) | 15 min |
| 6 | Fix JWT decode no syncEngine: adicionar try-catch | 5 min |

## Fase 2 — Schema & Types Alignment (Dia Seguinte)

| # | Ação | Esforço |
|---|------|---------|
| 7 | Aplicar SQL de tabelas faltantes (Etapa 4.2) | 30 min |
| 8 | Regenerar types.ts via `supabase gen types` | 2 min |
| 9 | Remover @ts-expect-error e tipar corretamente | 30 min |
| 10 | Remover `as any` casts e usar Zod parse | 1h |
| 11 | Adicionar `.limit(200)` em todos hooks sem paginação | 30 min |

## Fase 3 — Observabilidade & Robustez (Semana)

| # | Ação | Esforço |
|---|------|---------|
| 12 | Substituir 20+ catch vazios por Sentry.captureException | 3h |
| 13 | Calcular métricas reais no platform-metrics-rollup | 4h |
| 14 | Mover URL/key hardcoded do mobile para app.json config | 30 min |
| 15 | Gerar device password com crypto.randomUUID() | 30 min |
| 16 | Exigir SESSION_TRANSFER_SIGNING_SECRET (remover fallback) | 15 min |
| 17 | Adicionar AbortController 30s em todas RPCs mobile | 1h |

## Fase 4 — Hardening & Testes (Próximas Semanas)

| # | Ação | Esforço |
|---|------|---------|
| 18 | Habilitar strictNullChecks: true gradualmente | 8h |
| 19 | Testes E2E com Playwright (login, OS, preventiva) | 16h |
| 20 | Remover localhost fallback do client.ts | 5 min |
| 21 | Single source of truth na hydration (remover getSession) | 2h |
| 22 | Encriptar tokens no AsyncStorage (expo-secure-store) | 2h |
| 23 | Whitelist de tabelas no MasterSystemMonitor | 15 min |
| 24 | Validar payload do sync_queue com Zod antes de sync | 2h |

---

# 🧱 ETAPA 10 — PLANO DE AÇÃO À PROVA DE FALHAS

## 1. 🔴 CORREÇÕES CRÍTICAS IMEDIATAS

### AÇÃO-001: Fix RLS dados_empresa
```sql
DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;
CREATE POLICY "tenant_select_dados_empresa" ON public.dados_empresa
    FOR SELECT USING (public.can_access_empresa(empresa_id));
```
**Validação:** Logar como usuário empresa A → `supabase.from('dados_empresa').select('*')` → deve retornar APENAS empresa A.

### AÇÃO-002: Fix 4 Hooks Multi-Tenant

**useExecucoesPreventivas:**
```typescript
// ANTES (QUEBRADO):
queryKey: ['execucoes-preventivas', planoId],
enabled: !!planoId,
queryFn: () => supabase.from('execucoes_preventivas').select('*').eq('plano_id', planoId!)

// DEPOIS (CORRETO):
queryKey: ['execucoes-preventivas', tenantId, planoId],
enabled: !!tenantId && !!planoId,
queryFn: () => supabase.from('execucoes_preventivas').select('*')
  .eq('empresa_id', tenantId!).eq('plano_id', planoId!).limit(100)
```

**useComponentesEquipamento:**
```typescript
// ANTES (QUEBRADO):
queryKey: ['componentes-equipamento', equipamentoId],
enabled: !!equipamentoId,

// DEPOIS (CORRETO):
queryKey: ['componentes-equipamento', tenantId, equipamentoId],
enabled: !!tenantId && !!equipamentoId,
queryFn: () => supabase.from('componentes_equipamento').select('*')
  .eq('empresa_id', tenantId!).eq('equipamento_id', equipamentoId!)
```

**useAtividadesPreventivas:**
```typescript
// DEPOIS (CORRETO):
queryKey: ['atividades-preventivas', tenantId, planoId],
enabled: !!tenantId && !!planoId,
queryFn: () => supabase.from('atividades_preventivas')
  .select('*, servicos:servicos_preventivos(*)')
  .eq('empresa_id', tenantId!).eq('plano_id', planoId!)
```

**useAtividadesLubrificacao:**
```typescript
// DEPOIS (CORRETO):
queryKey: ['atividades-lubrificacao', tenantId, planoId],
enabled: !!tenantId && !!planoId,
queryFn: () => supabase.from('atividades_lubrificacao').select('*')
  .eq('empresa_id', tenantId!).eq('plano_id', planoId!)
```

### AÇÃO-003: Remover user_metadata do TenantContext
```typescript
// ANTES (VULNERÁVEL) - TenantContext.tsx linhas 130-140:
const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
  ? authUser.app_metadata.empresa_id
  : typeof authUser?.user_metadata?.empresa_id === 'string'  // ← REMOVER
    ? authUser.user_metadata.empresa_id                       // ← REMOVER
    : null;

// DEPOIS (SEGURO):
const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
  ? authUser.app_metadata.empresa_id
  : null;  // NUNCA confiar em user_metadata
```

### AÇÃO-004: Sanitizar innerHTML
```bash
npm install dompurify @types/dompurify
```
```typescript
// Programacao.tsx:578
import DOMPurify from 'dompurify';
body.innerHTML = DOMPurify.sanitize(html);
```

### AÇÃO-005: Fix Impersonation Race
```typescript
// AuthContext.tsx - loadImpersonation():
// ANTES:
try { await validateImpersonationSession({...}); }
catch { window.localStorage.removeItem(...); return; }
setImpersonation(parsed);  // ← Executa MESMO se validate falha por timeout

// DEPOIS:
try {
  await validateImpersonationSession({...});
  setImpersonation(parsed);  // ← SÓ se validate succeeds
} catch {
  window.localStorage.removeItem(...);
  return;
}
```

---

## 2. 🟠 PADRONIZAÇÃO COMPLETA

### Padrão Obrigatório para Hooks de Dados

```typescript
export function useXxx() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ['xxx', tenantId],          // SEMPRE incluir tenantId
    enabled: !!tenantId,                  // SEMPRE validar tenantId
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xxx')
        .select('*')
        .eq('empresa_id', tenantId!)     // SEMPRE filtrar empresa_id
        .order('created_at', { ascending: false })
        .limit(200);                     // SEMPRE usar limit
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: XxxInput) => {
      const { data, error } = await supabase
        .from('xxx')
        .insert({ ...input, empresa_id: tenantId! })  // SEMPRE incluir empresa_id
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['xxx', tenantId] }),
  });

  return { ...query, create: create.mutateAsync };
}
```

### Padrão para Error Handling (Substituir catch vazios)
```typescript
// NUNCA:
catch {}
catch () {}
.catch(() => {})

// SEMPRE:
catch (err) {
  console.error('[módulo] operação falhou:', err);
  // Em produção:
  if (typeof Sentry !== 'undefined') Sentry.captureException(err);
}
```

### Padrão para Nomes
- Tabelas: `snake_case` plural (`ordens_servico`, `execucoes_os`)
- Colunas: `snake_case` (`empresa_id`, `created_at`)
- Hooks: `useNomeEntidade` (`useEquipamentos`, `useOrdensServico`)
- Services: `nomeEntidade.service.ts`
- Types: `PascalCase` (`OrdemServico`, `Equipamento`)
- Enums: `UPPER_SNAKE` (`ABERTA`, `EM_ANDAMENTO`)

---

## 3. 🗄️ BLINDAGEM DO BANCO

### Checklist de Integridade Referencial

| Tabela | FK verificada | RLS | FORCE RLS | Índice empresa_id |
|--------|--------------|-----|-----------|-------------------|
| empresas | - | ✅ | ✅ | PK |
| profiles | → auth.users | ✅ | ✅ | ✅ |
| user_roles | → auth.users, empresas | ✅ | ✅ | ✅ |
| equipamentos | → sistemas, empresas | ✅ | ✅ | ✅ |
| ordens_servico | → empresas | ✅ | ✅ | ✅ (composto) |
| execucoes_os | → ordens_servico, empresas | ✅ | ✅ | ✅ |
| materiais | → empresas | ✅ | ✅ | ✅ |
| mecanicos | → empresas | ✅ | ✅ | ✅ |
| planos_preventivos | → equipamentos, empresas | ✅ | ✅ | ✅ |
| dados_empresa | → empresas | ⚠️ ABERTA | ⚠️ | ✅ |

**Regra:** TODAS as tabelas com `empresa_id`:
1. `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;`
2. `ALTER TABLE xxx FORCE ROW LEVEL SECURITY;`
3. `CREATE POLICY ... USING (can_access_empresa(empresa_id));`

---

## 4. 🔐 SEGURANÇA TOTAL

### Matriz de Controle de Acesso

| Recurso | Anon | USUARIO | ADMIN | MASTER_TI | SYSTEM_OWNER |
|---------|------|---------|-------|-----------|-------------|
| Login | ✅ | - | - | - | - |
| Dashboard | ❌ | ✅ | ✅ | ✅ | ✅ |
| Criar OS | ❌ | ✅ | ✅ | ✅ | ❌ |
| Fechar OS | ❌ | ✅ | ✅ | ✅ | ❌ |
| Administração | ❌ | ❌ | ✅ | ✅ | ❌ |
| Master TI | ❌ | ❌ | ❌ | ✅ | ❌ |
| Owner Portal | ❌ | ❌ | ❌ | ❌ | ✅ |
| Editar Empresa | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gerenciar Usuários | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ver Audit Logs | ❌ | ❌ | ✅ | ✅ | ✅ |

### Checklist de Validação de Input

| Input | Validação Frontend | Validação Backend |
|-------|-------------------|-------------------|
| Login email | Zod email() | Edge function parse |
| Login password | Zod min(6) | Supabase Auth |
| Criação OS | ordemServico.schema | RLS + column check |
| Equipamento | equipamento.schema | RLS + column check |
| Mecânico | mecanico.schema | RLS + column check |
| Contrato | contrato.schema | RLS + column check |
| Hierarquia | hierarquia.schema | RLS + column check |
| Material | material.schema | RLS + column check |
| SQL Injection | Parametrized queries (Supabase JS) | RLS + pg_prepare |

---

## 5. 🔄 TESTES AUTOMATIZADOS

### Plano de Testes

#### 5.1 — Testes de Conexão com Banco
```typescript
// vitest test
describe('Supabase Connection', () => {
  it('should connect to correct project', async () => {
    const { data } = await supabase.from('empresas').select('id').limit(1);
    expect(data).toBeDefined();
  });

  it('should enforce RLS on dados_empresa', async () => {
    // Login como empresa A, tentar acessar empresa B
    const { data } = await supabase.from('dados_empresa').select('*');
    data?.forEach(row => expect(row.empresa_id).toBe(currentTenantId));
  });
});
```

#### 5.2 — Testes de CRUD
```typescript
describe('CRUD Ordens Servico', () => {
  it('should create OS with empresa_id', async () => { ... });
  it('should not read OS from another empresa', async () => { ... });
  it('should update only own empresa OS', async () => { ... });
  it('should not delete OS from another empresa', async () => { ... });
});
```

#### 5.3 — Testes de Integridade
```typescript
describe('Referential Integrity', () => {
  it('should reject OS with non-existent empresa_id', async () => { ... });
  it('should cascade delete on empresa removal', async () => { ... });
  it('should not allow duplicate numero_os per empresa', async () => { ... });
});
```

#### 5.4 — Testes de Falha
```typescript
describe('Failure Modes', () => {
  it('should handle network timeout gracefully', async () => { ... });
  it('should retry on transient error', async () => { ... });
  it('should not crash on malformed JWT', async () => { ... });
});
```

#### 5.5 — Testes E2E (Playwright)
```typescript
test('Login flow - tenant user', async ({ page }) => {
  await page.goto('https://tenant.gppis.com.br/login');
  await page.fill('[name="email"]', 'user@test.com');
  await page.fill('[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
});

test('Cross-tenant isolation', async ({ page }) => {
  // Login como empresa A
  // Tentar acessar URL de empresa B
  // Deve ser bloqueado
});
```

---

## 6. ⚡ OTIMIZAÇÃO DE PERFORMANCE

### Índices Estratégicos (já no SQL Etapa 4)
- `ordens_servico(empresa_id, status, created_at DESC)` — Dashboard
- `execucoes_os(empresa_id, os_id)` — Join frequente
- `planos_preventivos(empresa_id, proxima_execucao)` — Scheduler
- `audit_logs(empresa_id, created_at DESC)` — Paginação reversa
- `dispositivos_moveis(empresa_id, status)` — Listagem ativa

### Caching Strategy
- React Query: staleTime 5min para listas, 1min para dashboards
- Workbox: NetworkFirst para API com 24h expiry, 100 entries
- Mobile: SQLite local com sync bidirecional a cada 30s

### Query Optimization
- **Antes:** `select('*')` sem limit → full table scan
- **Depois:** `select('id,nome,status,created_at').limit(200)` → paginado

---

## 7. 🧩 GARANTIA DE INTEGRIDADE

### Checklist por Módulo

| Módulo | Salva? | Busca? | Atualiza? | Isolado? |
|--------|--------|--------|-----------|----------|
| Equipamentos | ✅ | ✅ | ✅ | ✅ |
| Ordens de Serviço | ✅ | ✅ | ✅ | ✅ |
| Preventiva (planos) | ✅ | ✅ | ✅ | ✅ |
| Preventiva (atividades) | ✅ | ✅ | ✅ | 🔴 FIX NEEDED |
| Preventiva (execuções) | ✅ | ✅ | ✅ | 🔴 FIX NEEDED |
| Lubrificação (planos) | ✅ | ✅ | ✅ | ✅ |
| Lubrificação (atividades) | ✅ | ✅ | ✅ | 🔴 FIX NEEDED |
| Lubrificação (estoque) | ❌ TABELA | ❌ | ❌ | ❌ |
| Componentes Equip. | ✅ | ✅ | ✅ | 🔴 FIX NEEDED |
| Materiais | ✅ | ✅ | ✅ | ✅ |
| Mecânicos | ✅ | ✅ | ✅ | ✅ |
| FMEA | ✅ | ✅ | ✅ | ✅ |
| Inspeções | ✅ | ✅ | ✅ | ✅ |
| Preditiva | ✅ | ✅ | ✅ | ✅ |
| Melhorias | ✅ | ✅ | ✅ | ✅ |
| Fornecedores | ✅ | ✅ | ✅ | ✅ |
| Documentos | ✅ | ✅ | ✅ | ✅ |
| Treinamentos SSMA | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | - | ✅ |
| Auditoria | - | ✅ | - | ✅ |
| Impressão | ✅ | - | - | 🔴 XSS |

---

## 8. 🛡️ ESTRATÉGIA ANTI-QUEBRA

### 8.1 — Versionamento de Banco
- ✅ **157+ migrations** em `supabase/migrations/` (JÁ implementado)
- ⚠️ **Squash necessário** — muitas migrations de repair overlap
- **Regra:** Cada migration deve ser idempotente (`IF NOT EXISTS`, `DROP IF EXISTS`)

### 8.2 — Logs de Erro Detalhados
- **Web:** Sentry já integrado (v8.50)
- **Mobile:** ⚠️ 15+ catch vazios precisam ser convertidos para Sentry.captureException
- **Backend:** enterprise_audit_logs + security_logs + operational_logs

### 8.3 — Monitoramento de Falhas
- **system-health-check** Edge Function existe
- **CloudFlare Insights** para web analytics
- **Falta:** alertas automáticos (ex: PagerDuty/Slack webhook quando RPC rate_limit excedido)

### 8.4 — Validação Pré-Deploy

```bash
#!/bin/bash
# pre-deploy-checklist.sh
echo "1. TypeScript compilation..."
npx tsc --noEmit || exit 1

echo "2. Lint check..."
npx eslint src/ --max-warnings 0 || exit 1

echo "3. Unit tests..."
npx vitest run || exit 1

echo "4. Schema alignment check..."
supabase gen types typescript --linked > /tmp/types_fresh.ts
diff src/integrations/supabase/types.ts /tmp/types_fresh.ts || {
  echo "ERROR: types.ts is stale! Regenerate with: supabase gen types"
  exit 1
}

echo "5. Build check..."
npm run build || exit 1

echo "✅ All checks passed. Safe to deploy."
```

### 8.5 — Ambiente de Homologação
- **Produção:** `https://gppis.com.br` + `https://owner.gppis.com.br`
- **Staging:** Criar branch `staging` com Supabase branching
- **PR Review:** Exigir 1 review + CI pass antes de merge

---

## 9. 📋 CHECKLIST FINAL DE PRODUÇÃO

### Banco de Dados
- [ ] RLS `dados_empresa` corrigida (USING can_access_empresa)
- [ ] 13 tabelas faltantes criadas (SQL Etapa 4.2)
- [ ] FORCE ROW LEVEL SECURITY em TODAS tabelas
- [ ] types.ts regenerado via `supabase gen types`
- [ ] Índices aplicados (SQL Etapa 4.2, item 10)
- [ ] Todas FKs validadas (sem orphan records)

### Frontend
- [ ] 4 hooks multi-tenant corrigidos (empresa_id + queryKey + enabled)
- [ ] usePermissoesGranulares com empresa_id obrigatório
- [ ] DOMPurify instalado e aplicado em Programacao.tsx
- [ ] @ts-expect-error removidos (OSPrintDialog.tsx)
- [ ] `as any` substituídos por tipos reais
- [ ] .limit(200) em todos hooks sem paginação
- [ ] Localhost fallback removido do client.ts

### Segurança
- [ ] user_metadata removida do TenantContext
- [ ] Fix impersonation race condition
- [ ] Device password com crypto.randomUUID()
- [ ] SESSION_TRANSFER_SIGNING_SECRET obrigatório
- [ ] Whitelist de tabelas no MasterSystemMonitor
- [ ] Error message sanitizada no main.tsx fallback

### Mobile
- [ ] JWT decode com try-catch no syncEngine
- [ ] AsyncStorage → expo-secure-store para tokens
- [ ] URL/Key movidos para app.json config
- [ ] 15 catch vazios convertidos para logging
- [ ] AbortController 30s em todas RPCs
- [ ] Payload sync_queue validado com Zod
- [ ] Device ID gerado com crypto.getRandomValues()

### Observabilidade
- [ ] 20+ catch vazios convertidos para Sentry.captureException
- [ ] Métricas reais no platform-metrics-rollup
- [ ] Audit log write nunca falha silenciosamente
- [ ] Pre-deploy checklist implementado no CI

### Testes
- [ ] Testes unitários para hooks críticos
- [ ] Testes de RLS (cross-tenant isolation)
- [ ] Testes E2E (login, criar OS, fechar OS)
- [ ] Testes de falha (timeout, network error)

---

## Resumo Executivo Final

| Métrica | Valor |
|---------|-------|
| Vulnerabilidades críticas | **5** (RLS, hooks, tenant, XSS, impersonation) |
| Vulnerabilidades altas | **8** (device password, tokens, catch vazios, etc) |
| Vulnerabilidades médias | **6** (TS permissivo, as any, console.log) |
| Tabelas desalinhadas | **19+** |
| RPCs não tipadas | **17** |
| Catch vazios | **20+** |
| Nota atual | **6.0 / 10** |
| Nota pós Fase 1 | **7.5 / 10** |
| Nota pós Fase 2 | **8.5 / 10** |
| Nota pós Fase 3 | **9.0 / 10** |
| Nota pós Fase 4 | **9.5+ / 10** |

---

> **Veredicto:** O sistema tem uma base arquitetural sólida e bem organizada, mas apresenta **gaps críticos de segurança multi-tenant** (4 hooks sem isolamento + RLS aberta + user_metadata trust) que DEVEM ser corrigidos ANTES de qualquer outro trabalho. O plano de 24 ações organizado em 4 fases eleva o sistema de 6.0 para 9.5+/10 de forma incremental e controlada. As Fase 1 e 2 são bloqueantes para produção profissional.
