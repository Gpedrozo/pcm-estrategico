<!-- markdownlint-disable MD032 MD029 -->

# Smoke Test A/B + Reset Owner Only

Data: 2026-03-12

## 1) Objetivo

1. Validar isolamento tenant real (empresa A nao acessa B).
2. Validar trilha de auditoria por empresa_id.
3. Depois, limpar dados para homologacao final mantendo apenas o owner.

## 2) Ordem de execucao

1. Execute SQL de auditoria final:
   - docs/TENANT_FASE_FINAL_AUDITORIA_TOTAL_20260312.sql
2. Rode teste funcional A/B no frontend:
   - Empresa A cria dados.
   - Empresa B nao visualiza dados da A.
3. Execute reset owner-only:
   - docs/SQL_RESET_HOMOLOGACAO_OWNER_ONLY_20260312.sql

## 3) Teste funcional A/B (manual)

1. Criar Empresa A e Empresa B no Owner.
2. Criar usuario Admin_TI para A e para B.
3. Logar como Admin_TI da A:
   - criar 1 solicitacao
   - criar/editar 1 OS
   - criar/editar 1 equipamento
   - gerar 1 alteracao em contrato/assinatura (se aplicavel)
4. Logar como Admin_TI da B e validar:
   - nao enxerga registros criados pela A
   - nao consegue editar IDs da A via UI/API
5. Voltar no Owner e consultar logs:
   - cada acao deve ter empresa_id correspondente
   - sem eventos cross-tenant

## 4) Criterios de aceite

1. Isolamento: 100 por cento sem vazamento entre A e B.
2. Auditoria: eventos com empresa_id, actor_id, table_name e operation.
3. Banco resetado para homologacao: apenas owner ativo.

## 5) Observacao sobre senha do owner

1. Este processo preserva seu usuario owner por email.
2. Senha nao e alterada via SQL de forma insegura.
3. Se precisar redefinir senha, use o fluxo oficial do Supabase Auth (Dashboard/Admin API).
