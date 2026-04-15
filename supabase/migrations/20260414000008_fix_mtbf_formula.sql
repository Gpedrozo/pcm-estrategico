-- ============================================================
-- Fix P0 — MTBF formula incorreta em refresh_mv_dashboard_summary
--
-- Problema: MTBF = 720 / total_os (ERRADO)
--   - 720 é um mês fixo qualquer (não reflete período real)
--   - denomina por TODAS as OS, não só corretivas
--
-- Correção: MTBF = horas_de_operação / nº_de_falhas_corretivas_fechadas
--   onde horas_de_operação = intervalo desde a primeira OS da empresa
--   e nº_de_falhas = corretivas fechadas nos últimos 12 meses
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_mv_dashboard_summary(
  p_empresa_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_os         bigint;
  v_os_abertas       bigint;
  v_os_fechadas      bigint;
  v_custo_mes        numeric(14,2);
  v_mttr             numeric(8,2);
  v_mtbf             numeric(8,2);
  v_disponibilidade  numeric(6,2);
  v_corretivas       bigint;
  v_primeira_os      timestamptz;
  v_horas_operacao   numeric(12,2);
BEGIN
  -- ── Contadores gerais ────────────────────────────────────────
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('ABERTA', 'EM_ANDAMENTO')),
    COUNT(*) FILTER (WHERE status = 'FECHADA'),
    COALESCE(
      SUM(CASE WHEN created_at >= date_trunc('month', now())
               THEN COALESCE(custo_estimado, 0) ELSE 0 END),
      0
    ),
    MIN(created_at)
  INTO v_total_os, v_os_abertas, v_os_fechadas, v_custo_mes, v_primeira_os
  FROM public.ordens_servico
  WHERE empresa_id = p_empresa_id;

  -- ── MTTR: tempo médio de execução de OS corretivas fechadas ──
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (e.data_fim - e.data_inicio)) / 3600.0),
    0
  )
  INTO v_mttr
  FROM public.execucoes_os e
  JOIN public.ordens_servico os ON os.id = e.os_id
  WHERE os.empresa_id = p_empresa_id
    AND e.data_fim IS NOT NULL
    AND e.data_inicio IS NOT NULL;

  -- ── MTBF correto ─────────────────────────────────────────────
  -- Contamos falhas: apenas OS do tipo CORRETIVA com status FECHADA
  -- nos últimos 12 meses para janela representativa
  SELECT COUNT(*)
  INTO v_corretivas
  FROM public.ordens_servico
  WHERE empresa_id   = p_empresa_id
    AND tipo         = 'CORRETIVA'
    AND status       = 'FECHADA'
    AND created_at  >= now() - INTERVAL '12 months';

  -- Horas de operação = desde a primeira OS (ou 730h = 1 mês se recente)
  v_horas_operacao := CASE
    WHEN v_primeira_os IS NOT NULL
    THEN GREATEST(
      730.0,
      EXTRACT(EPOCH FROM (now() - v_primeira_os)) / 3600.0
    )
    ELSE 730.0
  END;

  -- MTBF = horas de operação / número de falhas corretivas
  v_mtbf := CASE
    WHEN v_corretivas > 0 THEN ROUND(v_horas_operacao / v_corretivas, 1)
    ELSE ROUND(v_horas_operacao, 1)  -- sem falhas = MTBF = tempo total (excelente)
  END;

  -- ── Disponibilidade via fórmula clássica MTBF/(MTBF+MTTR) ───
  v_disponibilidade := CASE
    WHEN v_mtbf + v_mttr > 0 THEN ROUND(v_mtbf / (v_mtbf + v_mttr) * 100, 1)
    ELSE 100
  END;

  -- ── Upsert no cache ──────────────────────────────────────────
  INSERT INTO public.mv_dashboard_summary (
    empresa_id, total_os, os_abertas, os_fechadas,
    custo_mes, mttr_horas, mtbf_horas, backlog,
    disponibilidade_pct, refreshed_at
  )
  VALUES (
    p_empresa_id, v_total_os, v_os_abertas, v_os_fechadas,
    v_custo_mes, v_mttr, v_mtbf, v_os_abertas,
    v_disponibilidade, now()
  )
  ON CONFLICT (empresa_id) DO UPDATE SET
    total_os            = EXCLUDED.total_os,
    os_abertas          = EXCLUDED.os_abertas,
    os_fechadas         = EXCLUDED.os_fechadas,
    custo_mes           = EXCLUDED.custo_mes,
    mttr_horas          = EXCLUDED.mttr_horas,
    mtbf_horas          = EXCLUDED.mtbf_horas,
    backlog             = EXCLUDED.backlog,
    disponibilidade_pct = EXCLUDED.disponibilidade_pct,
    refreshed_at        = EXCLUDED.refreshed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_mv_dashboard_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_mv_dashboard_summary(uuid) TO service_role;

-- Forçar refresh imediato de todos os tenants ativos
-- para que os valores antigos (incorretos) sejam substituídos
SELECT public.refresh_all_dashboard_summaries();
