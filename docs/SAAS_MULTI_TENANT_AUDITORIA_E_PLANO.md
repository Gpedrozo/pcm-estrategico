# Auditoria Inicial e Plano de Migração SaaS Multi-tenant

## Escopo da auditoria
Fonte: análise estática dos arquivos em `supabase/migrations/*.sql` e referências em `src/**`.

## Resumo executivo
- **Total de tabelas operacionais auditadas:** 42
- **Tabelas sem `empresa_id`:** 42/42 (situação anterior à nova migration)
- **RLS:** habilitado na maior parte das tabelas
- **Policies:** predominantemente permissivas (`USING (true)`), sem isolamento por tenant
- **Risco crítico identificado:** potencial de acesso cruzado entre empresas

## Tabelas auditadas (status anterior)

### Núcleo operacional (uso no código: alto)
`areas`, `auditoria`, `equipamentos`, `execucoes_os`, `materiais`, `materiais_os`, `mecanicos`, `movimentacoes_materiais`, `ordens_servico`, `plantas`, `sistemas`.

### Módulos operacionais (uso no código: alto/médio)
`solicitacoes_manutencao`, `planos_preventivos`, `atividades_preventivas`, `servicos_preventivos`, `templates_preventivos`, `execucoes_preventivas`, `planos_lubrificacao`, `atividades_lubrificacao`, `execucoes_lubrificacao`, `medicoes_preditivas`, `inspecoes`, `anomalias_inspecao`, `fmea`, `analise_causa_raiz`, `acoes_corretivas`, `melhorias`, `fornecedores`, `contratos`, `avaliacoes_fornecedores`, `permissoes_trabalho`, `incidentes_ssma`, `documentos_tecnicos`, `componentes_equipamento`.

### Configuração/segurança/documentos (uso no código: médio/baixo)
`configuracoes_sistema`, `dados_empresa`, `document_sequences`, `document_layouts`, `permissoes_granulares`, `security_logs`, `rate_limits`, `ai_root_cause_analysis`, `profiles`, `user_roles`.

## Principais achados
1. Ausência de coluna de tenant (`empresa_id`) em tabelas operacionais.
2. Policies permissivas sem filtro por tenant.
3. Falta de trilha de auditoria enterprise dedicada para ações críticas multi-tenant.
4. Falta de trava explícita para promoção indevida ao papel `MASTER_TI`.

---

## Plano de migração aplicado
Migration: `supabase/migrations/20260301032000_enterprise_multitenant_foundation.sql`

### ETAPA 1 — Auditoria
- Mapeamento de tabelas, RLS, policies e uso em código concluído (este documento).

### ETAPA 2 — Padronização multi-tenant
- Criação da tabela `public.empresas`.
- Inclusão de `empresa_id` em tabelas operacionais.
- Backfill por vínculo de usuário criador e relacionamento entre tabelas.
- Validação de inconsistências antes de `NOT NULL` (migration falha com mensagem explícita se detectar linhas órfãs).
- Índices e FKs para `empresa_id`.

### ETAPA 3 — Isolamento RLS
- Remoção de policies anteriores nas tabelas-alvo.
- Criação de policies padrão por tabela:
  - `tenant_select`
  - `tenant_insert`
  - `tenant_update`
  - `tenant_delete`
- Regra de acesso: `empresa_id = get_current_empresa_id()` com override para `MASTER_TI`.

### ETAPA 4 — Triggers de proteção
- Trigger para bloquear `INSERT/UPDATE` sem `empresa_id`.
- Trigger para impedir alteração manual de `empresa_id`.
- Trigger para log automático em `enterprise_audit_logs`.
- Função `detect_cross_tenant_access` para detecção de acesso cruzado.

### ETAPA 5/6 — Revisões e hardening
- Inclusão de `must_change_password` em `profiles`.
- Trigger `prevent_master_ti_promotion` para bloquear promoção indevida.
- Função `weekly_tenant_integrity_check` para checagem semanal de integridade.

### ETAPA 7 — Limpeza e otimização
- Nesta entrega, **sem remoção destrutiva** de tabelas/colunas.
- Limpeza física fica condicionada ao resultado da auditoria em produção.

### ETAPA 8 — Testes obrigatórios
- Adicionado teste automatizado de presença dos artefatos críticos da migration (arquivo de teste no Vitest).

---

## Lista de tabelas alteradas
- `profiles`, `user_roles`
- `areas`, `auditoria`, `equipamentos`, `execucoes_os`, `materiais`, `materiais_os`, `mecanicos`, `movimentacoes_materiais`, `ordens_servico`, `plantas`, `sistemas`
- `solicitacoes_manutencao`, `planos_preventivos`, `medicoes_preditivas`, `inspecoes`, `anomalias_inspecao`, `fmea`, `analise_causa_raiz`, `acoes_corretivas`, `melhorias`
- `fornecedores`, `contratos`, `avaliacoes_fornecedores`, `permissoes_trabalho`, `incidentes_ssma`, `documentos_tecnicos`, `configuracoes_sistema`, `componentes_equipamento`
- `atividades_preventivas`, `servicos_preventivos`, `templates_preventivos`, `execucoes_preventivas`
- `planos_lubrificacao`, `atividades_lubrificacao`, `execucoes_lubrificacao`
- `document_sequences`, `document_layouts`, `ai_root_cause_analysis`, `permissoes_granulares`, `security_logs`, `rate_limits`, `dados_empresa`

## Lista de tabelas criadas
- `empresas`
- `enterprise_audit_logs`

## Lista de policies criadas (padrão)
- `tenant_select`
- `tenant_insert`
- `tenant_update`
- `tenant_delete`
- `enterprise_audit_logs_select`
- `enterprise_audit_logs_insert`

## Lista de funções/triggers criadas
- Funções:
  - `get_current_empresa_id`
  - `is_master_ti`
  - `enforce_empresa_id_protection`
  - `log_enterprise_audit`
  - `detect_cross_tenant_access`
  - `prevent_master_ti_promotion`
  - `weekly_tenant_integrity_check`
- Triggers:
  - `trg_enforce_empresa_id` (em tabelas operacionais)
  - `trg_enterprise_audit` (em tabelas operacionais)
  - `trg_prevent_master_ti_promotion` (em `user_roles`)

## Tabelas órfãs/mock/redundantes (candidatas para etapa posterior)
- Candidatas com baixo uso no código: `rate_limits`, `security_logs`, `ai_root_cause_analysis`.
- A remoção **não foi executada** nesta entrega por segurança/integridade.
