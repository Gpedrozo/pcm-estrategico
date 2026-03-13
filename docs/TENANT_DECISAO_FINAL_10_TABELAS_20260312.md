<!-- markdownlint-disable MD032 MD029 -->

# Decisao Final das 10 tabelas sem empresa_id

Data: 2026-03-12
Base: inventario + leitura de migrations/regras de RLS no projeto.

## KEEP_GLOBAL (nao adicionar empresa_id)

1. empresas
- Motivo: cadastro mestre de tenants (control plane).

2. plans
- Motivo: catalogo global de planos SaaS.

3. rbac_roles
- Motivo: catalogo global de papeis do sistema.

4. rbac_permissions
- Motivo: catalogo global de permissoes do sistema.

5. rbac_role_permissions
- Motivo: matriz global role x permission.

6. edge_refactor_contract
- Motivo: tabela tecnica de governanca de edge functions.

## MIGRATE_TO_TENANT (adicionar empresa_id)

1. solicitacoes
- Motivo: dado operacional do tenant (chamados/solicitacoes).

2. solicitacoes_manutencao
- Motivo: dado operacional central do modulo de solicitacoes.

3. subscription_payments
- Motivo: evento financeiro associado a subscription de uma empresa (trilha por tenant).

4. contract_versions
- Motivo: versoes de contrato vinculadas a contrato de uma empresa.

## Observacao importante

Mesmo com tabelas globais sem empresa_id, a auditoria continua obrigatoria com empresa_id alvo quando houver impacto em tenant.

## Resultado esperado apos migracao das 4 tabelas

1. total_tabelas: 60
2. tabelas_com_empresa_id: 54
3. tabelas_tenant_com_rls: 54
4. tabelas_tenant_sem_rls: 0
5. tabelas_sem_empresa_id: 6

Essas 6 restantes serao control plane legitimas.
