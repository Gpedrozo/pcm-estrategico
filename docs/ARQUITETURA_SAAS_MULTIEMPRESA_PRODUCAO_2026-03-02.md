# Arquitetura SaaS Multiempresa (CMMS/PCM) — Produção

## 1) Visão de Camadas

### Interface (Frontend)
- Stack: React + TypeScript + Vite
- Responsabilidade: UX, fluxo de tela, validação superficial
- Proibição: regra de negócio crítica no cliente

### API / Services (Backend)
- Stack: Supabase Edge Functions (Deno)
- Responsabilidade: orquestração de casos de uso, aplicação de políticas de acesso, escrita controlada
- Endpoints principais:
  - `owner-portal-admin`
  - `company-membership`
  - `maintenance-os-service`
  - `platform-metrics-rollup`

### Banco de Dados
- Stack: PostgreSQL (Supabase)
- Responsabilidade: domínio, integridade referencial, RLS, auditoria e índices

---

## 2) Modelo Multiempresa (Tenant-first)

### Entidades obrigatórias
- `empresas`
- `usuarios`
- `membros_empresa`
- `permissoes`
- `planos`
- `assinaturas`

### Entidades operacionais com `empresa_id`
- `ativos`, `tags_ativos`
- `ordens_servico`, `execucoes_os`, `historico_manutencao`
- `planos_manutencao`, `tarefas_plano`, `checklists`
- `pecas/estoque` (implementado no legado como `materiais`, `movimentacoes_materiais`)
- `falhas`, `causas`, `acoes_corretivas`
- `indicadores_kpi`

---

## 3) RBAC profissional

### Roles globais
- `SYSTEM_OWNER`
- `SYSTEM_ADMIN`

### Roles por empresa
- `OWNER`
- `MANAGER`
- `PLANNER`
- `TECHNICIAN`
- `VIEWER`

### Tabelas
- `user_roles` (atribuição de role por usuário/empresa)
- `permissoes`
- `role_permissions`

### Funções centrais
- `is_system_operator(...)`
- `can_access_empresa(...)`
- `has_permission_v2(...)`
- `current_empresa_id()`

---

## 4) Owner Portal global

### Domínio
- `owner.gppis.com.br`

### Capacidades backend
- Listagem e gestão de empresas
- Bloqueio de empresa
- Alteração de plano
- Estatísticas globais de plataforma
- Promoção de admin global

### Tabelas de suporte
- `system_owner_allowlist`
- `platform_metrics`
- `audit_logs`

---

## 5) Segurança e Compliance

### RLS
- Habilitado em tabelas operacionais
- Política tenant: usuário acessa somente empresa vinculada
- Exceção controlada: `SYSTEM_OWNER` / `SYSTEM_ADMIN` (escopo global)

### Auditoria
- Trigger `audit_log_change()`
- Log automático de `INSERT/UPDATE/DELETE`
- Eventos de login/logout via camada de autenticação

### Princípios
- deny-by-default
- sem `SELECT` público
- tokens JWT exigidos nas Edge Functions sensíveis

---

## 6) Escalabilidade (10k empresas / 100k usuários / milhões de OS)

### Estratégias
- Índices compostos por `empresa_id + status + created_at`
- Índices para membership, roles e auditoria
- Métricas agregadas em `platform_metrics`
- Escritas críticas concentradas em funções de serviço

### Leituras pesadas
- projeções e snapshots por data
- possibilidade de materialized views e fila assíncrona no próximo ciclo

---

## 7) Padrões arquiteturais adotados

- Domain Driven Design (por contexto: manutenção, auth, rbac, billing, owner)
- Service Layer (Edge Functions)
- Repository pattern (via clients e funções SQL seguras)

Estrutura alvo no frontend/backend compartilhado:
- `src/core`
- `src/modules`
- `src/services`
- `src/database`
- `src/auth`
- `src/rbac`
- `src/billing`

---

## 8) Entregáveis implementados neste ciclo

1. Migration principal de backend SaaS:
- `supabase/migrations/20260302240000_saas_professional_multiempresa_backend.sql`

2. Edge Functions novas:
- `supabase/functions/owner-portal-admin/index.ts`
- `supabase/functions/company-membership/index.ts`
- `supabase/functions/maintenance-os-service/index.ts`
- `supabase/functions/platform-metrics-rollup/index.ts`
- Shared layer:
  - `supabase/functions/_shared/auth.ts`
  - `supabase/functions/_shared/response.ts`

3. Configuração de functions:
- `supabase/config.toml`

---

## 9) Operação recomendada (go-live)

1. Aplicar migrations no ambiente alvo.
2. Publicar/redeploy Edge Functions.
3. Atualizar tipos Supabase do frontend.
4. Executar smoke tests por role (`SYSTEM_OWNER`, `OWNER`, `TECHNICIAN`, `VIEWER`).
5. Ativar rotina de `platform-metrics-rollup` (scheduler).

---

## 10) Resultado

Backend multiempresa SaaS industrial com isolamento por tenant, RBAC robusto, Owner Portal com governança global, trilha de auditoria, base para billing Stripe e estrutura escalável para produção.
