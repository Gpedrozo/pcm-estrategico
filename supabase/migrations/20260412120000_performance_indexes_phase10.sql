-- ============================================================
-- Performance indexes for Phase 10/10 hardening
-- All indexes use IF NOT EXISTS for idempotency
-- ============================================================

-- 1. ordens_servico: filtro principal do Dashboard + listagem
CREATE INDEX IF NOT EXISTS idx_os_empresa_status
  ON public.ordens_servico (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_os_empresa_created_desc
  ON public.ordens_servico (empresa_id, created_at DESC);

-- 2. execucoes_os: join com OS
CREATE INDEX IF NOT EXISTS idx_execucoes_os_empresa_osid
  ON public.execucoes_os (empresa_id, os_id);

-- 3. medicoes_preditivas: tela Preditiva
CREATE INDEX IF NOT EXISTS idx_medicoes_pred_empresa_equip
  ON public.medicoes_preditivas (empresa_id, equipamento_id);

-- 4. enterprise_audit_logs: auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created
  ON public.enterprise_audit_logs (empresa_id, created_at DESC);

-- 5. equipamentos: busca por TAG
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_tag
  ON public.equipamentos (empresa_id, tag);

-- 6. solicitacoes_manutencao: solicitações pendentes
CREATE INDEX IF NOT EXISTS idx_solic_manut_empresa_status
  ON public.solicitacoes_manutencao (empresa_id, status);
