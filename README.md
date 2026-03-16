# PCM Estrategico

Plataforma SaaS multi-tenant para Planejamento e Controle de Manutencao (PCM), com foco em operacao industrial, governanca, indicadores e rastreabilidade.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + Radix UI
- Supabase (Auth, Postgres, Edge Functions)
- TanStack Query
- Vitest

## Requisitos

- Node.js 18+
- npm 9+

## Execucao local

```sh
npm install
npm run dev
```

Aplicacao local: http://localhost:8080

## Build e validacao

```sh
npm run test -- --run
npm run build
```

Ou fluxo completo:

```sh
npm run validate:full
```

## Variaveis de ambiente

Use o arquivo `.env.example` como base e crie seu `.env` local.

Variaveis principais:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY)
- VITE_OWNER_SUPABASE_URL
- VITE_OWNER_SUPABASE_PUBLISHABLE_KEY (ou VITE_OWNER_SUPABASE_ANON_KEY)
- VITE_TENANT_BASE_DOMAIN
- VITE_OWNER_DOMAIN

## Estrutura principal

- src/pages: paginas de modulo
- src/components: componentes visuais e de dominio
- src/hooks: acesso de dados e regras de tela
- src/services: servicos de backend/edge functions
- src/contexts: autenticacao, tenant, branding
- src/modules/rootCauseAI: modulo de IA
- supabase/functions: funcoes edge
- supabase/migrations: evolucao de schema e seguranca

## Manual de operacao no sistema

- Tenant: /manuais-operacao
- Owner: /manuais-operacao

O manual foi integrado ao app e pode ser usado para treinamento operacional por perfil.

## Seguranca

- Nao versionar `.env`
- Usar RLS com isolamento por `empresa_id`
- Aplicar rotacao de chaves ao detectar exposicao de segredo
