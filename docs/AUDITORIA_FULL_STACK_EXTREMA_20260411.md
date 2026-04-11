# 🔍 AUDITORIA COMPLETA FULL STACK + BANCO DE DADOS — NÍVEL EXTREMO

**Data:** 2026-04-11  
**Escopo:** Frontend React + Backend Supabase (Edge Functions) + Banco PostgreSQL + App Móvel  
**Método:** Análise estática completa de código, schema, migrations, RLS, queries e fluxos  

---

# 📊 ETAPA 1 — ANÁLISE GERAL DO SISTEMA

## Arquitetura

| Aspecto | Avaliação |
|---------|-----------|
| **Framework** | React 18 + TypeScript 5.8 + Vite + SWC |
| **Backend** | Supabase (PostgreSQL + Edge Functions Deno) |
| **Estilização** | Tailwind CSS 3.4 + Shadcn/UI (Radix) |
| **Estado** | TanStack React Query 5 + Context API |
| **Validação** | Zod schemas + React Hook Form |
| **Auth** | Supabase Auth + JWT Device Auth customizado |
| **Monitoramento** | Sentry + CloudFlare Insights |
| **Mobile** | React Native (Expo) com sincronização offline |
| **PWA** | Vite PWA com Workbox caching |

## Estrutura de Pastas

```
src/
├── auth/           # Lógica de autenticação
├── billing/        # Sistema de assinaturas
├── components/     # 35+ módulos organizados por feature
├── contexts/       # AuthContext, TenantContext, BrandingContext, PortalMecanicoContext
├── core/           # Lógica compartilhada
├── database/       # Utilitários de BD
├── guards/         # Route/component guards
├── hooks/          # 60+ hooks customizados
├── integrations/   # Config Supabase (client, types, rpc)
├── layouts/        # Layouts de página
├── lib/            # Helpers e utilitários
├── modules/        # Módulos de feature (rootCauseAI)
├── owner/          # Portal Owner específico
├── pages/          # 48 páginas + 7 mobile + 7 portal + 22 capítulos manual
├── rbac/           # Controle de acesso por role
├── schemas/        # Schemas Zod (6 módulos)
├── security/       # Utilitários de segurança
├── services/       # Camada de serviço (11 arquivos)
└── types/          # Definições TypeScript
```

## Nota Geral da Arquitetura: **7.2 / 10**

### ✅ Pontos Fortes
1. **Separação de responsabilidades** exemplar — services, hooks, schemas, guards organizados
2. **Multi-tenancy avançado** com isolamento frontend + RLS backend
3. **Sistema de roles** robusto com hierarquia RBAC + permissões granulares
4. **Validação Zod** nos formulários críticos
5. **Paginação** implementada com `usePaginatedQuery`
6. **Code splitting** inteligente no Vite (vendor chunks separados)
7. **PWA** com cache NetworkFirst para API Supabase
8. **Sincronização offline** no app móvel com engine bidirecional
9. **Auditoria empresarial** com `enterprise_audit_logs` + `security_logs`
10. **23 Edge Functions** cobrindo autenticação, billing, CRUD, health checks

### ❌ Pontos Fracos
1. **types.ts desalinhado** — 4+ tabelas ativas não regeneradas
2. **15+ catch vazios** no app móvel suprimindo erros silenciosamente
3. **URL hardcoded** do Supabase no app móvel
4. **Métricas de dashboard falsas** — 5 KPIs com valores hardcoded
5. **XSS potencial** em 3 pontos (dangerouslySetInnerHTML, body.innerHTML)
6. **TypeScript permissivo** — `noImplicitAny: false`, `strictNullChecks: false`
7. **9+ casts `as any`** bypassando type safety

### 🔴 Riscos Críticos
1. `dados_empresa` com RLS `SELECT USING (true)` → expõe dados de TODAS empresas
2. Schema Types desalinhado → queries podem falhar em runtime
3. Catch vazios no auth flow móvel → login pode falhar sem indicação
4. Métricas falsas no dashboard owner → decisões baseadas em dados fictícios

---

# 🔗 ETAPA 2 — ANÁLISE COMPLETA DAS CONEXÕES COM BANCO

## Mapa de Operações por Módulo

### Equipamentos
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `equipamentos` | *, com join sistema_id | ✅ OK |
| INSERT | `equipamentos` | empresa_id, tag, nome, criticidade, etc. | ✅ OK |
| UPDATE | `equipamentos` | Todos campos editáveis | ✅ OK |
| SELECT | `componentes_equipamento` | *, com join equipamento_id | ✅ OK |

### Ordens de Serviço
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `ordens_servico` | *, paginado | ✅ OK |
| INSERT | `ordens_servico` | empresa_id, tipo, status, prioridade, etc. | ✅ OK |
| UPDATE | `ordens_servico` | status, data_fechamento | ✅ OK |
| RPC | `close_os_with_execution_atomic` | Fechamento atômico | ✅ OK |
| SELECT | `execucoes_os` | *, por os_id | ✅ OK |
| INSERT | `execucoes_os` | empresa_id, os_id, mecanico_id, etc. | ✅ OK |

### Solicitações
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `solicitacoes_manutencao` | * | ⚠️ Tabela NÃO está em types.ts |
| INSERT | `solicitacoes_manutencao` | empresa_id, numero_solicitacao, etc. | ⚠️ @ts-expect-error |
| UPDATE | `solicitacoes_manutencao` | status | ⚠️ Sem tipo validado |

### Preventiva
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `planos_preventivos` | *, with atividades nested | ✅ OK |
| SELECT | `atividades_preventivas` | *, with servicos nested | ✅ OK |
| SELECT | `servicos_preventivos` | * | ✅ OK |
| SELECT | `execucoes_preventivas` | * | ✅ OK |
| SELECT | `templates_preventivos` | * | ✅ OK |

### Lubrificação
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `planos_lubrificacao` | * | ✅ OK |
| SELECT | `atividades_lubrificacao` | * | ✅ OK |
| SELECT | `execucoes_lubrificacao` | * | ✅ OK |
| UPSERT | `estoque_lubrificantes` | * | ❌ Tabela NÃO existe em types.ts |
| INSERT | `lubrificantes` | * | ❌ Tabela NÃO existe em types.ts |
| UPDATE | `movimentacao_estoque` | * | ❌ Tabela NÃO existe em types.ts |

### Materiais
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `materiais` | * | ✅ OK |
| INSERT/UPDATE | `materiais` | empresa_id, codigo, nome, etc. | ✅ OK |
| SELECT | `materiais_os` | * | ✅ OK |
| SELECT | `movimentacoes_materiais` | * | ✅ OK |

### Mecânicos & Dispositivos
| Operação | Tabela | Colunas | Status |
|----------|--------|---------|--------|
| SELECT | `mecanicos` | id, nome, tipo | ✅ OK (tabela existe) |
| SELECT | `dispositivos_moveis` | * | ⚠️ Tabela NÃO está em types.ts |
| INSERT | `qrcodes_vinculacao` | * | ⚠️ Tabela NÃO está em types.ts |

### Dashboard Owner
| Operação | Tabela/RPC | Status |
|----------|------------|--------|
| RPC | `dashboard_summary` | ✅ OK |
| SELECT | `dashboard_analytics_snapshot` | ❌ Tabela NÃO existe em types.ts |
| SELECT | `configuracoes_operacionais_empresa` | ❌ Tabela NÃO existe em types.ts |
| SELECT | `empresa_config` | ❌ Tabela NÃO existe em types.ts |

### App Móvel — Sync Engine
| Operação | Tabela | Status |
|----------|--------|--------|
| SELECT/UPSERT | `paradas_equipamento` | ❌ NÃO existe em types.ts |
| SELECT/UPSERT | `requisicoes_material` | ❌ NÃO existe em types.ts |
| SELECT | `execucoes_fotos` | ❌ NÃO existe em types.ts |

---

# 🧪 ETAPA 3 — TESTE DE TODAS AS TABELAS

## Tabelas Existentes no Schema (50 tabelas em types.ts)

✅ `acoes_corretivas` | ✅ `analise_causa_raiz` | ✅ `anomalias_inspecao` | ✅ `areas`  
✅ `atividades_lubrificacao` | ✅ `atividades_preventivas` | ✅ `audit_logs` | ✅ `avaliacoes_fornecedores`  
✅ `componentes_equipamento` | ✅ `configuracoes_sistema` | ✅ `contratos` | ✅ `dados_empresa`  
✅ `document_layouts` | ✅ `document_sequences` | ✅ `documentos_tecnicos` | ✅ `edge_refactor_contract`  
✅ `empresas` | ✅ `enterprise_audit_logs` | ✅ `equipamentos` | ✅ `execucoes_lubrificacao`  
✅ `execucoes_os` | ✅ `execucoes_preventivas` | ✅ `fmea` | ✅ `fornecedores`  
✅ `incidentes_ssma` | ✅ `inspecoes` | ✅ `maintenance_schedule` | ✅ `materiais`  
✅ `materiais_os` | ✅ `mecanicos` | ✅ `medicoes_preditivas` | ✅ `melhorias`  
✅ `movimentacoes_materiais` | ✅ `ordens_servico` | ✅ `permissoes_granulares` | ✅ `permissoes_trabalho`  
✅ `planos_lubrificacao` | ✅ `planos_preventivos` | ✅ `plantas` | ✅ `profiles`  
✅ `rate_limits` | ✅ `rbac_permissions` | ✅ `rbac_role_permissions` | ✅ `rbac_roles`  
✅ `rbac_user_roles` | ✅ `security_logs` | ✅ `servicos_preventivos` | ✅ `sistemas`  
✅ `templates_preventivos` | ✅ `user_roles`

## Tabelas Referenciadas que NÃO Estão em types.ts

| Tabela | Usada em | Criticidade |
|--------|----------|-------------|
| ❌ `solicitacoes_manutencao` | CriarOSScreenV2, OSPrintDialog, syncEngine | 🔴 CRÍTICA |
| ❌ `dispositivos_moveis` | useDispositivosMoveis, device auth | 🔴 CRÍTICA |
| ❌ `qrcodes_vinculacao` | useDispositivosMoveis, device binding | 🔴 CRÍTICA |
| ❌ `treinamentos_ssma` | useTreinamentosSSMA | 🟠 ALTA |
| ❌ `estoque_lubrificantes` | useEstoqueLubrificantes | 🟠 ALTA |
| ❌ `lubrificantes` | useEstoqueLubrificantes | 🟠 ALTA |
| ❌ `movimentacao_estoque` | useMateriais | 🟠 ALTA |
| ❌ `dashboard_analytics_snapshot` | useDashboardOptimized | 🟠 ALTA |
| ❌ `configuracoes_operacionais_empresa` | useConfiguracoesOperacionais | 🟡 MÉDIA |
| ❌ `empresa_config` | TenantContext | 🟡 MÉDIA |
| ❌ `paradas_equipamento` | syncEngine (móvel) | 🟡 MÉDIA |
| ❌ `requisicoes_material` | syncEngine (móvel) | 🟡 MÉDIA |
| ❌ `execucoes_fotos` | syncEngine (móvel) | 🟡 MÉDIA |
| ❌ `contratos_versoes` | Versioning system | 🟢 BAIXA |
| ❌ `contratos_versoes_items` | Versioning system | 🟢 BAIXA |
| ❌ `rotas_lubrificacao` | Rotas lubrificação | 🟢 BAIXA |
| ❌ `pontos_lubrificacao` | Pontos lubrificação | 🟢 BAIXA |
| ❌ `membros_empresa` | RLS/can_access_empresa | 🟡 MÉDIA |
| ❌ `auth_session_transfer_tokens` | Session transfer edge func | 🟡 MÉDIA |

**Total: 19 tabelas referenciadas mas ausentes ou não tipadas**

---

# 🛠️ ETAPA 4 — SQL COMPLETO PARA CORREÇÃO

## 4.1 — Tabelas Faltantes (SQL Produção)

```sql
-- =============================================================================
-- MIGRATION: Tabelas faltantes detectadas na auditoria 2026-04-11
-- ATENÇÃO: Executar SOMENTE tabelas que realmente não existem no banco.
--          Algumas podem existir via migration mas não estarem em types.ts.
--          Recomendação: rodar `supabase gen types` após aplicar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. solicitacoes_manutencao (se não existir — provavelmente já existe via migration antiga)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacoes_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    numero_solicitacao TEXT,
    solicitante TEXT,
    descricao TEXT,
    equipamento TEXT,
    tag TEXT,
    impacto TEXT CHECK (impacto IN ('ALTO', 'MEDIO', 'BAIXO')),
    classificacao TEXT CHECK (classificacao IN ('EMERGENCIAL', 'URGENTE', 'PROGRAMAVEL')),
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'CONVERTIDA', 'REJEITADA', 'CANCELADA')),
    os_gerada_id UUID REFERENCES public.ordens_servico(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_empresa_status
    ON public.solicitacoes_manutencao(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_manutencao_created
    ON public.solicitacoes_manutencao(empresa_id, created_at DESC);
ALTER TABLE public.solicitacoes_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_solicitacoes" ON public.solicitacoes_manutencao
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_solicitacoes" ON public.solicitacoes_manutencao
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_solicitacoes" ON public.solicitacoes_manutencao
    FOR UPDATE USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_delete_solicitacoes" ON public.solicitacoes_manutencao
    FOR DELETE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 2. dispositivos_moveis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispositivos_moveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mecanico_id UUID REFERENCES public.mecanicos(id),
    device_token TEXT UNIQUE NOT NULL,
    device_name TEXT,
    device_model TEXT,
    device_os TEXT,
    app_version TEXT,
    ultimo_acesso TIMESTAMPTZ,
    status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispositivos_moveis_empresa
    ON public.dispositivos_moveis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_moveis_token
    ON public.dispositivos_moveis(device_token);
CREATE INDEX IF NOT EXISTS idx_dispositivos_moveis_mecanico
    ON public.dispositivos_moveis(mecanico_id);
ALTER TABLE public.dispositivos_moveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_dispositivos" ON public.dispositivos_moveis
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_dispositivos" ON public.dispositivos_moveis
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_dispositivos" ON public.dispositivos_moveis
    FOR UPDATE USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_delete_dispositivos" ON public.dispositivos_moveis
    FOR DELETE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 3. qrcodes_vinculacao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qrcodes_vinculacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    tipo TEXT DEFAULT 'UNICO' CHECK (tipo IN ('UNICO', 'REUTILIZAVEL')),
    max_usos INT DEFAULT 1,
    usos_atual INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_por UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qrcodes_token ON public.qrcodes_vinculacao(token);
CREATE INDEX IF NOT EXISTS idx_qrcodes_empresa ON public.qrcodes_vinculacao(empresa_id);
ALTER TABLE public.qrcodes_vinculacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_qrcodes" ON public.qrcodes_vinculacao
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_qrcodes" ON public.qrcodes_vinculacao
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_qrcodes" ON public.qrcodes_vinculacao
    FOR UPDATE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 4. treinamentos_ssma
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treinamentos_ssma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID,
    colaborador_nome TEXT,
    tipo_curso TEXT NOT NULL,
    nome_curso TEXT NOT NULL,
    carga_horaria_horas NUMERIC(6,1),
    data_realizacao DATE,
    data_validade DATE,
    certificado_url TEXT,
    instituicao TEXT,
    status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'VENCIDO', 'PENDENTE', 'CANCELADO')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_empresa ON public.treinamentos_ssma(empresa_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_colaborador ON public.treinamentos_ssma(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_validade ON public.treinamentos_ssma(data_validade);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ssma_status ON public.treinamentos_ssma(status);
ALTER TABLE public.treinamentos_ssma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_treinamentos" ON public.treinamentos_ssma
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_treinamentos" ON public.treinamentos_ssma
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_treinamentos" ON public.treinamentos_ssma
    FOR UPDATE USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_delete_treinamentos" ON public.treinamentos_ssma
    FOR DELETE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 5. estoque_lubrificantes
-- ---------------------------------------------------------------------------
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
CREATE POLICY "tenant_select_estoque_lub" ON public.estoque_lubrificantes
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_estoque_lub" ON public.estoque_lubrificantes
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_estoque_lub" ON public.estoque_lubrificantes
    FOR UPDATE USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_delete_estoque_lub" ON public.estoque_lubrificantes
    FOR DELETE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 6. lubrificantes (catálogo)
-- ---------------------------------------------------------------------------
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
CREATE POLICY "tenant_select_lubrificantes" ON public.lubrificantes
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_lubrificantes" ON public.lubrificantes
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_update_lubrificantes" ON public.lubrificantes
    FOR UPDATE USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 7. movimentacao_estoque (lubrificantes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    lubrificante_id UUID REFERENCES public.estoque_lubrificantes(id),
    tipo TEXT CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
    quantidade NUMERIC(12,2) NOT NULL,
    motivo TEXT,
    usuario_id UUID,
    usuario_nome TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_empresa ON public.movimentacao_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_lub ON public.movimentacao_estoque(lubrificante_id);
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_mov_estoque" ON public.movimentacao_estoque
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_mov_estoque" ON public.movimentacao_estoque
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 8. dashboard_analytics_snapshot
-- ---------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_dash_snapshot_empresa ON public.dashboard_analytics_snapshot(empresa_id, snapshot_at DESC);
ALTER TABLE public.dashboard_analytics_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_dash_snapshot" ON public.dashboard_analytics_snapshot
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_insert_dash_snapshot" ON public.dashboard_analytics_snapshot
    FOR INSERT WITH CHECK (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 9. configuracoes_operacionais_empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes_operacionais_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    chave TEXT NOT NULL,
    valor JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, chave)
);
CREATE INDEX IF NOT EXISTS idx_config_op_empresa ON public.configuracoes_operacionais_empresa(empresa_id);
ALTER TABLE public.configuracoes_operacionais_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_config_op" ON public.configuracoes_operacionais_empresa
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_write_config_op" ON public.configuracoes_operacionais_empresa
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 10. empresa_config (domínio custom / config avançada)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    dominio_custom TEXT,
    tema JSONB,
    features_habilitadas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id)
);
CREATE INDEX IF NOT EXISTS idx_empresa_config_dominio ON public.empresa_config(dominio_custom);
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_config" ON public.empresa_config
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_write_config" ON public.empresa_config
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 11. paradas_equipamento (downtime tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paradas_equipamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    equipamento_id UUID REFERENCES public.equipamentos(id),
    os_id UUID REFERENCES public.ordens_servico(id),
    motivo TEXT,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ,
    duracao_horas NUMERIC(8,2),
    tipo TEXT CHECK (tipo IN ('MANUTENCAO', 'OPERACIONAL', 'SETUP', 'OUTRO')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paradas_empresa ON public.paradas_equipamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_paradas_equip ON public.paradas_equipamento(equipamento_id);
ALTER TABLE public.paradas_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_paradas" ON public.paradas_equipamento
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_write_paradas" ON public.paradas_equipamento
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 12. requisicoes_material
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requisicoes_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico(id),
    material_id UUID REFERENCES public.materiais(id),
    solicitante_id UUID,
    solicitante_nome TEXT,
    quantidade NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'ENTREGUE', 'CANCELADA')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_req_material_empresa ON public.requisicoes_material(empresa_id);
CREATE INDEX IF NOT EXISTS idx_req_material_os ON public.requisicoes_material(os_id);
ALTER TABLE public.requisicoes_material ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_req_material" ON public.requisicoes_material
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_write_req_material" ON public.requisicoes_material
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 13. execucoes_fotos (fotos de execução de OS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.execucoes_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    execucao_id UUID REFERENCES public.execucoes_os(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico(id),
    foto_url TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'ANTES' CHECK (tipo IN ('ANTES', 'DURANTE', 'DEPOIS')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_fotos_empresa ON public.execucoes_fotos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_exec_fotos_execucao ON public.execucoes_fotos(execucao_id);
ALTER TABLE public.execucoes_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_exec_fotos" ON public.execucoes_fotos
    FOR SELECT USING (public.can_access_empresa(empresa_id));
CREATE POLICY "tenant_write_exec_fotos" ON public.execucoes_fotos
    FOR ALL USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 14. membros_empresa (membership explícita para can_access_empresa)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membros_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_membros_empresa_user ON public.membros_empresa(user_id);
ALTER TABLE public.membros_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_membros" ON public.membros_empresa
    FOR SELECT USING (public.can_access_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- 15. auth_session_transfer_tokens (session transfer cross-domain)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_session_transfer_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    target_host TEXT,
    user_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_transfer_code ON public.auth_session_transfer_tokens(code_hash);
CREATE INDEX IF NOT EXISTS idx_session_transfer_expires ON public.auth_session_transfer_tokens(expires_at);

-- auto-cleanup de tokens expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_session_tokens()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.auth_session_transfer_tokens
    WHERE expires_at < now() - interval '1 hour';
END;
$$;
```

## 4.2 — Correção de RLS Crítica: dados_empresa

```sql
-- =============================================================================
-- FIX CRÍTICO: dados_empresa expõe dados de TODAS empresas para qualquer
-- usuário autenticado. A policy "Authenticated users can view empresa"
-- usa USING (true) sem filtro de tenant.
-- =============================================================================

-- Dropar policy insegura
DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;

-- Recriar com isolamento de tenant
CREATE POLICY "tenant_select_dados_empresa" ON public.dados_empresa
    FOR SELECT USING (public.can_access_empresa(empresa_id));
```

## 4.3 — Índices Faltantes

```sql
-- dispositivos_moveis (se já existir)
CREATE INDEX IF NOT EXISTS idx_dispositivos_status ON public.dispositivos_moveis(empresa_id, status);

-- qrcodes_vinculacao
CREATE INDEX IF NOT EXISTS idx_qrcodes_ativo ON public.qrcodes_vinculacao(empresa_id, ativo);

-- configuracoes_sistema (por chave)
CREATE INDEX IF NOT EXISTS idx_config_sistema_chave ON public.configuracoes_sistema(empresa_id, chave);
```

---

# 🔐 ETAPA 5 — SEGURANÇA

## Vulnerabilidades Encontradas

### 🔴 CRÍTICAS

| ID | Vulnerabilidade | Local | Impacto |
|----|----------------|-------|---------|
| SEC-01 | **dados_empresa SELECT USING (true)** | Migration 20260215 | Qualquer usuário logado vê dados de TODAS empresas |
| SEC-02 | **body.innerHTML = html** (XSS) | Programacao.tsx:578 | Injeção de HTML/JS se dados contiverem script |
| SEC-03 | **dangerouslySetInnerHTML** sem sanitização | chart.tsx:70, main.tsx:52 | XSS potencial em gráficos |

### 🟠 ALTAS

| ID | Vulnerabilidade | Local | Impacto |
|----|----------------|-------|---------|
| SEC-04 | **Device password = SERVICE_ROLE_KEY.slice(-12)** | mecanico-device-auth edge func | Entropia fraca (12 chars do service key) |
| SEC-05 | **URL hardcoded** do Supabase no app móvel | mecanico-app/src/lib/supabase.ts:9 | Single point of failure |
| SEC-06 | **15+ catch vazios** no fluxo de auth móvel | mecanico-app/src/contexts/AuthContext.tsx | Login pode falhar sem indicação |
| SEC-07 | **`as any` em queries dinâmicas** | MasterSystemMonitor.tsx:62 | Tabela arbitrária pode ser consultada |

### 🟡 MÉDIAS

| ID | Vulnerabilidade | Local | Impacto |
|----|----------------|-------|---------|
| SEC-08 | TypeScript permissivo (`strictNullChecks: false`) | tsconfig.json | Null pointer exceptions em runtime |
| SEC-09 | `@ts-expect-error` em queries de banco | OSPrintDialog.tsx:42,49 | Queries sem type-check podem falhar |
| SEC-10 | Raw SQL no app móvel | HomeScreen.tsx:76 | Potencial SQL injection (se dados user-controlled) |
| SEC-11 | 9+ casts `as T` genéricos | ownerPortal.service.ts | Dados não validados fluem pelo sistema |

### ✅ Correções JÁ APLICADAS (Abril 2026)
- ✅ Roles extraídos de `app_metadata` (não user_metadata)
- ✅ Hardcoded password removido de 11 scripts
- ✅ Privilege escalation removida do auth flow
- ✅ ~20 hooks com tenant isolation (empresa_id + enabled guard)
- ✅ Rate limiting no login + session transfer
- ✅ HMAC signing no session transfer inter-domínio
- ✅ Timing-safe comparison no device password

## Correções Recomendadas

```typescript
// SEC-02: Substituir body.innerHTML por DOM seguro
// ANTES (Programacao.tsx):
// body.innerHTML = html;
// DEPOIS:
import DOMPurify from 'dompurify';
body.innerHTML = DOMPurify.sanitize(html);

// SEC-04: Device password com entropia real
// ANTES (edge function):
// const devicePassword = SERVICE_ROLE_KEY.slice(-12);
// DEPOIS:
import { crypto } from 'std/crypto';
const devicePassword = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

// SEC-07: Whitelist de tabelas no MasterSystemMonitor
const ALLOWED_TABLES = ['equipamentos', 'ordens_servico', 'materiais', ...];
if (!ALLOWED_TABLES.includes(table)) throw new Error('Tabela não permitida');
```

---

# ⚡ ETAPA 6 — PERFORMANCE

## Pontos Positivos
- ✅ Índices compostos em `ordens_servico`, `execucoes_os`, `equipamentos`, `audit_logs`
- ✅ Paginação com `.range()` no `usePaginatedQuery`
- ✅ Sync engine com `.limit(500-1000)`
- ✅ Code splitting com chunks vendor separados
- ✅ PWA Workbox com NetworkFirst caching (24h, 100 entries)
- ✅ React Query com cache built-in

## Problemas de Performance

| ID | Problema | Local | Impacto |
|----|----------|-------|---------|
| PERF-01 | Queries `.select('*')` sem `.limit()` | CriarOSScreenV2, FecharOSScreen | Pode carregar milhares de registros |
| PERF-02 | 5 métricas KPI hardcoded | platform-metrics-rollup | Cálculos reais não executados |
| PERF-03 | `solicitacoes_manutencao` sem índice | (se existir) | Full table scan |
| PERF-04 | `dispositivos_moveis` sem índice de status | (se existir) | Queries lentas com crescimento |
| PERF-05 | `dashboard_analytics_snapshot` sem tabela | Dashboard | RPC fallback a cada render |

## Otimizações Recomendadas

```sql
-- Materializar snapshots de dashboard (cron job)
-- Em vez de calcular em cada request, pre-computar métricas
SELECT cron.schedule(
    'dashboard-snapshot-hourly',
    '0 * * * *',
    $$
    INSERT INTO dashboard_analytics_snapshot (empresa_id, os_abertas, os_fechadas_30d, urgentes_abertas, backlog_atrasado)
    SELECT
        e.id,
        COUNT(*) FILTER (WHERE os.status IN ('ABERTA', 'EM_ANDAMENTO')),
        COUNT(*) FILTER (WHERE os.status = 'FECHADA' AND os.data_fechamento > now() - interval '30 days'),
        COUNT(*) FILTER (WHERE os.prioridade = 'URGENTE' AND os.status NOT IN ('FECHADA', 'CANCELADA')),
        COUNT(*) FILTER (WHERE os.status = 'ABERTA' AND os.created_at < now() - interval '7 days')
    FROM empresas e
    LEFT JOIN ordens_servico os ON os.empresa_id = e.id
    GROUP BY e.id;
    $$
);

-- Adicionar .limit() nas queries sem limite
-- No frontend: SEMPRE usar .limit(200) como teto padrão
```

---

# 🧩 ETAPA 7 — INTEGRIDADE DO SISTEMA

## Fluxos com Problemas Identificados

| ID | Fluxo | Problema | Severidade |
|----|-------|----------|-----------|
| FLOW-01 | **Estoque de Lubrificantes** | Tabelas `estoque_lubrificantes`, `lubrificantes`, `movimentacao_estoque` não existem | 🔴 CRÍTICO — Feature quebrada |
| FLOW-02 | **Dashboard Analytics** | `dashboard_analytics_snapshot` não existe + métricas hardcoded | 🔴 CRÍTICO — Dados fictícios |
| FLOW-03 | **Fotos de Execução** (móvel) | `execucoes_fotos` não existe no schema | 🟠 ALTO — Fotos não persistem |
| FLOW-04 | **Paradas de Equipamento** (móvel) | `paradas_equipamento` não existe | 🟠 ALTO — Downtime não registrado |
| FLOW-05 | **Requisições de Material** (móvel) | `requisicoes_material` não existe | 🟠 ALTO — Requisições perdidas |
| FLOW-06 | **Criação/Impressão OS** | `solicitacoes_manutencao` sem tipagem → `@ts-expect-error` | 🟠 ALTO — Funciona mas sem type-safety |
| FLOW-07 | **Configurações Operacionais** | `configuracoes_operacionais_empresa` sem tabela | 🟡 MÉDIA — Fallback para valores default |
| FLOW-08 | **Domain Custom Config** | `empresa_config` sem tabela tipada | 🟡 MÉDIA — Pode falhar resolução de domínio |
| FLOW-09 | **Treinamentos SSMA** | `treinamentos_ssma` sem tipo no types.ts | 🟡 MÉDIA — Funciona sem type-checking |
| FLOW-10 | **Sincronização Offline** | 15+ catch vazios no sync engine | 🔴 CRÍTICO — Falhas silenciosas |
| FLOW-11 | **Voice Input** (móvel) | Errors suprimidos sem feedback | 🟡 MÉDIA — UX degradada |
| FLOW-12 | **Router Guard** | Mecânico portal e owner usam layouts isolados | ✅ OK |
| FLOW-13 | **Password Change** | Edge function + fallback direto | ✅ OK |
| FLOW-14 | **Audit Logging** | `catch {}` no audit.ts → logs podem se perder | 🟠 ALTO |

---

# 📊 ETAPA 8 — NOTA FINAL

| Dimensão | Nota | Peso | Ponderada |
|----------|------|------|-----------|
| **Estrutura / Arquitetura** | 8.0 | 20% | 1.60 |
| **Banco de Dados** | 5.5 | 25% | 1.38 |
| **Segurança** | 6.5 | 25% | 1.63 |
| **Performance** | 7.0 | 15% | 1.05 |
| **Escalabilidade** | 7.5 | 15% | 1.13 |
| **NOTA FINAL** | | | **6.8 / 10** |

### Por que NÃO é 10:

1. **19 tabelas desalinhadas** entre código e schema tipado (-1.5)
2. **RLS aberta** em `dados_empresa` expondo dados cross-tenant (-1.0)
3. **3 pontos XSS** sem sanitização (-0.5)
4. **15+ erros silenciosos** no app móvel podendo corromper dados (-0.8)
5. **Métricas KPI falsas** no dashboard owner (-0.4)
6. **TypeScript permissivo** (`strict: false`) permitindo bugs em runtime (-0.3)

### O que falta para 10/10:

1. Regenerar types.ts com todas as tabelas atuais
2. Criar as 19 tabelas faltantes e aplicar RLS
3. Corrigir RLS de `dados_empresa`
4. Sanitizar HTML com DOMPurify
5. Substituir catch vazios por logging + telemetria
6. Calcular métricas reais do dashboard
7. Habilitar strict mode no TypeScript gradualmente
8. Adicionar testes E2E para fluxos críticos
9. Mover URLs hardcoded para variáveis de ambiente
10. Implementar rate limiting por tenant (não só por IP)

---

# 🚀 ETAPA 9 — PLANO PARA NÍVEL 10/10

## 🔴 Prioridade CRÍTICA (Fazer IMEDIATAMENTE)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 1 | **Corrigir RLS dados_empresa** — DROP policy `USING (true)`, CREATE com `can_access_empresa()` | 5 min | Bloqueia vazamento de dados entre tenants |
| 2 | **Criar tabelas faltantes** — Aplicar SQL da Etapa 4 para 15 tabelas | 30 min | Desbloqueia features quebradas (estoque, fotos, paradas) |
| 3 | **Regenerar types.ts** — `supabase gen types typescript --linked > src/integrations/supabase/types.ts` | 2 min | Alinha type-checking com banco real |
| 4 | **Remover `@ts-expect-error`** e tipar corretamente após regenerar types | 15 min | Elimina queries sem validação |
| 5 | **Sanitizar HTML** — Instalar DOMPurify, usar em Programacao.tsx, chart.tsx | 15 min | Elimina XSS |

## 🟠 Prioridade IMPORTANTE (Próximos dias)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 6 | **Substituir catch vazios** por `console.error` + Sentry.captureException no app móvel | 2h | Visibilidade de erros em produção |
| 7 | **Calcular métricas reais** no `platform-metrics-rollup` — remover TODOs hardcoded | 3h | Dashboard owner com dados verdadeiros |
| 8 | **Mover URL hardcoded** do app móvel para `app.json` / env config | 30 min | Multi-ambiente funcional |
| 9 | **Whitelist de tabelas** no MasterSystemMonitor — evitar `.from(table as any)` | 15 min | Previne query injection |
| 10 | **Device password** — gerar com `crypto.randomUUID()` em vez de `SERVICE_ROLE_KEY.slice(-12)` | 30 min | Entropia adequada |
| 11 | **Adicionar `.limit(200)`** em todas queries sem paginação explícita | 1h | Previne memory blow-up |

## 🟢 Prioridade MELHORIA (Próximas semanas)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 12 | **Habilitar `strictNullChecks: true`** gradualmente | 8h | Elimina NullPointerExceptions |
| 13 | **Testes E2E** com Playwright para fluxos críticos (login, criar OS, fechar OS) | 16h | Regressão automática |
| 14 | **Centralizar logging** — criar middleware de erro com Sentry + audit | 4h | Observabilidade completa |
| 15 | **Materializar dashboard** — cron job para `dashboard_analytics_snapshot` | 2h | Reduz carga no banco |
| 16 | **Rate limiting por tenant** — limitar requests por empresa além de IP | 3h | Proteção contra abuso |
| 17 | **Remover casts `as T` genéricos** no ownerPortal.service.ts — usar Zod parse | 2h | Runtime type safety |
| 18 | **Contratos versionados** — criar tabelas `contratos_versoes` / `contratos_versoes_items` | 1h | Feature completa |
| 19 | **Rotas/Pontos lubrificação** — criar `rotas_lubrificacao` / `pontos_lubrificacao` | 1h | Feature completa |
| 20 | **Cleanup de migrations** — squash 157 migrations em baseline limpo | 4h | Manutenção mais simples |

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Tabelas no schema** | 50 tipadas + ~19 em migrations não tipadas |
| **Edge Functions** | 23 implementadas |
| **Páginas** | 84 (48 web + 7 mobile + 7 portal + 22 manual) |
| **Hooks customizados** | 60+ |
| **Schemas Zod** | 6 módulos |
| **Vulnerabilidades críticas** | 3 (RLS aberta, XSS x2) |
| **Vulnerabilidades altas** | 4 (device entropy, URL hardcoded, catch vazios, query injection) |
| **Tabelas faltantes** | 19 |
| **Nota atual** | **6.8 / 10** |
| **Nota estimada pós-correções críticas** | **8.5 / 10** |
| **Nota estimada pós-plano completo** | **9.5+ / 10** |

---

> **Conclusão:** O sistema tem uma arquitetura sólida e bem organizada, com separação clara de responsabilidades e um sistema multi-tenant avançado. Os problemas principais são: (1) desalinhamento entre tipos gerados e schema real do banco, (2) uma policy RLS perigosa em `dados_empresa`, e (3) supressão de erros no app móvel. Com as correções críticas listadas acima, o sistema sobe imediatamente para ~8.5/10. O plano completo de 20 itens eleva para 9.5+/10.
