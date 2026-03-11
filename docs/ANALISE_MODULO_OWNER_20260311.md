# Analise detalhada do modulo Owner (2026-03-11)

## 1) Estado atual

Arquitetura em camadas:

- UI de portal em [src/pages/Owner.tsx](src/pages/Owner.tsx) e [src/layouts/OwnerPortalLayout.tsx](src/layouts/OwnerPortalLayout.tsx)
- Hooks de orquestracao em [src/hooks/useOwnerPortal.ts](src/hooks/useOwnerPortal.ts)
- Service de chamadas remotas em [src/services/ownerPortal.service.ts](src/services/ownerPortal.service.ts)
- Backend operacional central em [supabase/functions/owner-portal-admin/index.ts](supabase/functions/owner-portal-admin/index.ts)

Pontos fortes:

- Um backend unico para operacoes globais (owner-portal-admin)
- Cobertura funcional ampla (empresas, usuarios, planos, assinaturas, contratos, auditoria)
- Modo de impersonacao e trilhas de auditoria

## 2) Riscos e lacunas

- Acoplamento alto de acoes em uma unica edge function (complexidade crescente).
- Duplicacao de blocos no arquivo da edge function, aumentando risco de regressao.
- Falta de operacoes padronizadas para dry-run e rollback em operacoes destrutivas.
- Falta de jobs assincronos para operacoes pesadas (limpeza grande roda inline).
- Falta de checklist operacional no proprio modulo para confirmar pre-condicoes antes de limpeza.

## 3) Melhorias aplicadas nesta etapa

- Data Control para Owner Master no modulo Sistema com:
- listagem de tabelas e volume
- limpeza por empresa
- limpeza de tabela
- exclusao completa de empresa (sem apagar banco)
- Confirmacoes explicitas por frase e por nome da empresa.
- Restricao de acoes destrutivas para Owner Master.
- Auditoria dedicada das acoes destrutivas.

## 4) Melhorias recomendadas (curto prazo)

1. Dry-run nas operacoes destrutivas.

- Mostrar impacto estimado antes de executar (contagem por tabela e por usuario).

1. Confirmacao em duas etapas.

- 1a etapa: frase + selecao do alvo.
- 2a etapa: token temporario de confirmacao com expiracao curta.

1. Fila de jobs para limpeza pesada.

- Enfileirar limpeza em background e disponibilizar progresso (0-100%).

1. Snapshot/log tecnico.

- Persistir em tabela de operacoes owner: quem executou, quando, alvo, resultado, contagens e erros.

## 5) Melhorias recomendadas (medio prazo)

1. Modularizar edge function owner.

- Separar por dominio: empresas, usuarios, contratos, data-control.

1. RBAC Owner refinado.

- Diferenciar SYSTEM_OWNER e SYSTEM_ADMIN por escopo de risco.

1. Politica de seguranca operacional.

- Janela de manutencao para operacoes destrutivas em producao.
- Bloqueio de execucao fora de horario permitido.

1. Modo recovery.

- Ferramenta de restauracao logica por tenant (quando houver backup/snapshot disponivel).

## 6) Governanca recomendada para Data Control

- Nao permitir drop de banco.
- Permitir purge com auditoria obrigatoria e confirmacao reforcada.
- Exigir owner master para operacoes irreversiveis.
- Exibir aviso de irreversibilidade em toda acao de limpeza.
