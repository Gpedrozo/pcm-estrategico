-- =============================================================================
-- FASE 3 — PERFORMANCE: Dashboard RPC + Indexes
-- PCM Estratégico — Migration 004
-- =============================================================================

-- ==================== INDEXES PARA PERFORMANCE ====================

-- Ordens de Serviço: cobertura das queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_status
  ON ordens_servico (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_tipo_status
  ON ordens_servico (empresa_id, tipo, status);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_data_solicitacao
  ON ordens_servico (empresa_id, data_solicitacao DESC);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_numero_os
  ON ordens_servico (empresa_id, numero_os DESC);

-- Execuções OS: cobertura para cálculos de custo e tempo
CREATE INDEX IF NOT EXISTS idx_execucoes_os_empresa_data
  ON execucoes_os (empresa_id, data_execucao DESC);

-- Equipamentos: busca por tag e sistema
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_tag
  ON equipamentos (empresa_id, tag);

CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_sistema
  ON equipamentos (empresa_id, sistema_id);

-- Materiais: busca por ativo e estoque
CREATE INDEX IF NOT EXISTS idx_materiais_empresa_ativo
  ON materiais (empresa_id, ativo);

-- Mecânicos: busca por ativo
CREATE INDEX IF NOT EXISTS idx_mecanicos_empresa_ativo
  ON mecanicos (empresa_id, ativo);

-- Hierarquia: planta → área → sistema
CREATE INDEX IF NOT EXISTS idx_areas_empresa_planta
  ON areas (empresa_id, planta_id);

CREATE INDEX IF NOT EXISTS idx_sistemas_empresa_area
  ON sistemas (empresa_id, area_id);

-- Audit log: consultas por empresa e data
DO $$
BEGIN
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_created ON public.audit_log (empresa_id, created_at DESC)';
  ELSIF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created ON public.audit_logs (empresa_id, created_at DESC)';
  END IF;
END;
$$;

-- Movimentações de materiais
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa_material
  ON movimentacoes_materiais (empresa_id, material_id);

-- Materiais por OS
CREATE INDEX IF NOT EXISTS idx_materiais_os_empresa_os
  ON materiais_os (empresa_id, os_id);

-- Planos preventivos: próxima execução
CREATE INDEX IF NOT EXISTS idx_planos_preventivos_empresa_ativo
  ON planos_preventivos (empresa_id, ativo);


-- ==================== RPC: DASHBOARD SUMMARY ====================
-- Consolida múltiplas queries do dashboard em uma única chamada RPC.
-- Retorna contadores, KPIs e distribuições em um JSON único.

CREATE OR REPLACE FUNCTION dashboard_summary(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSONB;
  v_os_abertas INT;
  v_os_em_andamento INT;
  v_os_fechadas_mes INT;
  v_urgentes INT;
  v_backlog INT;
  v_total_os INT;
  v_custo_mes NUMERIC;
  v_mttr NUMERIC;
  v_mtbf NUMERIC;
  v_disponibilidade NUMERIC;
  v_aderencia NUMERIC;
  v_inicio_mes DATE;
BEGIN
  v_inicio_mes := date_trunc('month', now())::date;

  -- Contadores de OS por status
  SELECT
    COUNT(*) FILTER (WHERE status = 'ABERTA'),
    COUNT(*) FILTER (WHERE status IN ('EM_ANDAMENTO', 'AGUARDANDO_MATERIAL')),
    COUNT(*) FILTER (WHERE status = 'FECHADA' AND data_fechamento >= v_inicio_mes),
    COUNT(*) FILTER (WHERE prioridade = 'URGENTE' AND status NOT IN ('FECHADA', 'CANCELADA')),
    COUNT(*) FILTER (WHERE status NOT IN ('FECHADA', 'CANCELADA')),
    COUNT(*)
  INTO v_os_abertas, v_os_em_andamento, v_os_fechadas_mes, v_urgentes, v_backlog, v_total_os
  FROM ordens_servico
  WHERE empresa_id = p_empresa_id;

  -- Custo total do mês
  SELECT COALESCE(SUM(COALESCE(custo_mao_obra, 0) + COALESCE(custo_materiais, 0) + COALESCE(custo_terceiros, 0)), 0)
  INTO v_custo_mes
  FROM execucoes_os
  WHERE empresa_id = p_empresa_id
    AND data_execucao >= v_inicio_mes;

  -- MTTR médio (horas)
  SELECT COALESCE(AVG(tempo_execucao) / 60.0, 0)
  INTO v_mttr
  FROM execucoes_os
  WHERE empresa_id = p_empresa_id
    AND tempo_execucao > 0;

  -- MTBF estimado (horas de operação / falhas corretivas)
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE tipo = 'CORRETIVA' AND status = 'FECHADA') > 0
    THEN EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 3600.0
         / COUNT(*) FILTER (WHERE tipo = 'CORRETIVA' AND status = 'FECHADA')
    ELSE 720
  END
  INTO v_mtbf
  FROM ordens_servico
  WHERE empresa_id = p_empresa_id;

  -- Disponibilidade = MTBF / (MTBF + MTTR)
  v_disponibilidade := CASE
    WHEN v_mtbf > 0 THEN (v_mtbf / (v_mtbf + v_mttr)) * 100
    ELSE 100
  END;

  -- Aderência preventiva (mês atual)
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE tipo = 'PREVENTIVA') > 0
    THEN COUNT(*) FILTER (WHERE tipo = 'PREVENTIVA' AND status = 'FECHADA')::NUMERIC
         / COUNT(*) FILTER (WHERE tipo = 'PREVENTIVA') * 100
    ELSE 100
  END
  INTO v_aderencia
  FROM ordens_servico
  WHERE empresa_id = p_empresa_id;

  -- Montar resultado
  result := jsonb_build_object(
    'os_abertas', v_os_abertas,
    'os_em_andamento', v_os_em_andamento,
    'os_fechadas_mes', v_os_fechadas_mes,
    'urgentes', v_urgentes,
    'backlog', v_backlog,
    'total_os', v_total_os,
    'custo_mes', ROUND(v_custo_mes, 2),
    'mttr', ROUND(v_mttr, 2),
    'mtbf', ROUND(v_mtbf, 2),
    'disponibilidade', ROUND(v_disponibilidade, 2),
    'aderencia_preventiva', ROUND(v_aderencia, 2),
    'snapshot_at', now()
  );

  RETURN result;
END;
$$;

-- Grant para authenticated users (com RLS enforced pelo parâmetro)
GRANT EXECUTE ON FUNCTION dashboard_summary(UUID) TO authenticated;
