# Arquitetura SaaS Multiempresa (Produção)

Data: 2026-03-02

## Visão geral

Este documento descreve a arquitetura do PCM Estratégico em modelo SaaS multiempresa, com um único projeto Supabase, isolamento por RLS e governança global via Owner Portal.

## Princípios

- Single source of truth no banco de dados.
- Isolamento por empresa usando `empresa_id`.
- Controle de acesso por roles e permissões granulares.
- Auditoria obrigatória para ações sensíveis.
- Segurança com deny-by-default.

## Frontend

### Stack frontend

- React
- TypeScript
- Vite
- TanStack Query
- shadcn/ui

### Diretrizes

- Regras críticas não ficam apenas no cliente.
- Toda operação sensível passa por validação de backend.
- Rotas owner e tenant são separadas por domínio e guardas.

## Backend

### Stack backend

- Supabase Postgres
- Supabase Auth
- RLS
- Edge Functions (Deno)

### Serviços principais

- `owner-portal-admin`
- `company-membership`
- `maintenance-os-service`
- `platform-metrics-rollup`

## Modelo de dados

### Entidades de governança

- `empresas`
- `empresa_config`
- `user_roles`
- `permissoes`
- `audit_logs`

### Entidades comerciais

- `plans`
- `subscriptions`
- `support_tickets`

### Entidades operacionais

- Ativos, planos e execuções de manutenção.
- OS, backlog, inspeções e medições.
- FMEA, RCA, melhorias e indicadores.

## RBAC e RLS

### Roles globais

- `SYSTEM_OWNER`
- `SYSTEM_ADMIN`

### Roles por empresa

- `OWNER`
- `MANAGER`
- `PLANNER`
- `TECHNICIAN`
- `VIEWER`

### Regras de acesso

- Usuário tenant acessa apenas a própria `empresa_id`.
- `SYSTEM_OWNER` e `SYSTEM_ADMIN` têm escopo global controlado.
- Toda policy usa funções auxiliares para centralizar regra.

## Owner Portal

### Objetivo

Centralizar operações globais de plataforma sem quebrar isolamento tenant.

### Capacidades

- Gestão de empresas.
- Gestão de planos e assinaturas.
- Gestão global de usuários.
- Auditoria consolidada.
- Suporte e parâmetros de sistema.

## Integração de ambientes

### Política de conexão

- Owner e tenants usam o mesmo projeto Supabase por padrão.
- Override por domínio owner é opcional e somente para cenários especiais.

### Variáveis de ambiente

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`)
- `VITE_OWNER_DOMAIN` (opcional)
- `VITE_OWNER_SUPABASE_URL` (opcional)
- `VITE_OWNER_SUPABASE_PUBLISHABLE_KEY` (opcional)

Backend (Edge Functions):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Observabilidade e auditoria

- Logs de eventos críticos em `audit_logs`.
- Rastreabilidade de alteração por ator, ação e entidade.
- Métricas de plataforma consolidadas por rollup.

## Checklist de produção

- Migrations aplicadas e versionadas.
- RLS habilitado em tabelas sensíveis.
- Roles globais conferidas para usuários owner.
- Variáveis de ambiente alinhadas entre domínio owner e tenant.
- Build e testes de sessão/rotas aprovados.
