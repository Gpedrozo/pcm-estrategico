# Tenant Checklist Funcional

Data: 2026-03-12

## Objetivo
Validar isolamento por empresa em leitura, escrita, atualizacao e exclusao.

## Pre-requisitos
- Duas empresas de teste: EMPRESA_A e EMPRESA_B.
- Dois usuarios comuns, um em cada empresa.
- Um usuario MASTER_TI ou OWNER para suporte operacional.

## Casos obrigatorios
1. Login EMPRESA_A nao visualiza dados da EMPRESA_B em listagens principais.
2. Login EMPRESA_B nao visualiza dados da EMPRESA_A em listagens principais.
3. Criacao de registro em EMPRESA_A grava empresa_id da EMPRESA_A.
4. Criacao de registro em EMPRESA_B grava empresa_id da EMPRESA_B.
5. Atualizacao de registro da EMPRESA_A por usuario da EMPRESA_B deve falhar.
6. Exclusao de registro da EMPRESA_A por usuario da EMPRESA_B deve falhar.
7. Consultas RPC/Edge Functions com empresa_id divergente devem retornar forbidden/empty.
8. Troca de tenant por impersonation deve refletir apenas dados da empresa alvo.
9. Encerrar impersonation deve voltar ao escopo original.
10. Exclusao de empresa deve remover dependencias e nao violar FK.

## SQL de apoio
Executar o roteiro em docs/TENANT_VALIDACAO_OPERACIONAL_20260312.sql antes e depois dos testes.

## Criterio de aprovacao
- Nenhum vazamento de dados entre empresas.
- Nenhuma tabela tenant sem empresa_id, sem RLS ou com policy permissiva.
- Fluxo de delete_company concluido sem erro de FK.
