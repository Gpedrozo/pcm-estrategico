-- ============================================================
-- Fase 2-B / Item 2.6 — 2026-04-14
-- mv_dashboard_summary: view materializada por empresa
--
-- Contexto: dashboard_summary RPC (v4) executa 5 queries
-- sequenciais no banco a cada requisição. Com esta MV, a RPC
-- lê cache pré-calculado e re-executa ao vivo apenas quando
-- o cache estiver desatualizado (> 6 minutos).
--
-- Refresh: pg_cron a cada 5 minutos + chamada explícita pela
-- função refresh_mv_dashboard_summary(p_empresa_id).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela de cache descritivo (substitui a MV real quando
--    REFRESH CONCURRENTLY não está disponível em Supabase free)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mv_dashboard_summary (
  empresa_id       uuid        NOT NULL PRIMARY KEY
                               REFERENCES public.empresas(id) ON DELETE CASCADE,
  total_os         bigint      NOT NULL DEFAULT 0,
  os_abertas       bigint      NOT NULL DEFAULT 0,
  os_fechadas      bigint      NOT NULL DEFAULT 0,
  custo_mes        numeric(14,2) NOT NULL DEFAULT 0,
  mttr_horas       numeric(8,2)  NOT NULL DEFAULT 0,
  mtbf_horas       numeric(8,2)  NOT NULL DEFAULT 0,
  backlog          bigint      NOT NULL DEFAULT 0,
  disponibilidade_pct numeric(6,2) NOT NULL DEFAULT 100,
  refreshed_at     timestamptz NOT NULL DEFAULT now()
);

-- Índice já existe implicitamente via PRIMARY KEY, mas
-- adicionamos para reforçar busca por refrescamento.
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_refreshed
  ON public.mv_dashboard_summary (refreshed_at);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS: nenhum usuário lê diretamente — apenas via função
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.mv_dashboard_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_dashboard_summary FORCE ROW LEVEL SECURITY;

-- política explícita de negação para todos (acesso via SECURITY DEFINER function)
DROP POLICY IF EXISTS deny_all_mv_dashboard ON public.mv_dashboard_summary;
CREATE POLICY deny_all_mv_dashboard
  ON public.mv_dashboard_summary
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

-- service_role acessa via superuser, não precisa de policy extra.
GRANT ALL ON public.mv_dashboard_summary TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Função de refresh para 1 empresa
-- ─────────────────────────────────────────────────────────────
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
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('ABERTA', 'EM_ANDAMENTO')),
    COUNT(*) FILTER (WHERE status = 'FECHADA'),
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', now())
                      THEN COALESCE(custo_estimado, 0) ELSE 0 END),0)
  INTO v_total_os, v_os_abertas, v_os_fechadas, v_custo_mes
  FROM public.ordens_servico
  WHERE empresa_id = p_empresa_id;

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (e.data_fim - e.data_inicio)) / 3600), 0)
  INTO v_mttr
  FROM public.execucoes_os e
  JOIN public.ordens_servico os ON os.id = e.os_id
  WHERE os.empresa_id = p_empresa_id
    AND e.data_fim IS NOT NULL;

  v_mtbf := CASE WHEN v_total_os > 0 THEN ROUND(720.0 / v_total_os, 1) ELSE 0 END;
  v_disponibilidade := CASE
    WHEN v_mtbf + v_mttr > 0 THEN ROUND(v_mtbf / (v_mtbf + v_mttr) * 100, 1)
    ELSE 100
  END;

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
    total_os          = EXCLUDED.total_os,
    os_abertas        = EXCLUDED.os_abertas,
    os_fechadas       = EXCLUDED.os_fechadas,
    custo_mes         = EXCLUDED.custo_mes,
    mttr_horas        = EXCLUDED.mttr_horas,
    mtbf_horas        = EXCLUDED.mtbf_horas,
    backlog           = EXCLUDED.backlog,
    disponibilidade_pct = EXCLUDED.disponibilidade_pct,
    refreshed_at      = EXCLUDED.refreshed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_mv_dashboard_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_mv_dashboard_summary(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Função de refresh global (pg_cron chama isso a cada 5 min)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_all_dashboard_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.empresas WHERE status != 'inativa' LOOP
    BEGIN
      PERFORM public.refresh_mv_dashboard_summary(r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[dashboard_refresh] Falha na empresa %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_all_dashboard_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_all_dashboard_summaries() TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Atualizar dashboard_summary RPC: lê do cache se fresco
--    (< 6 min), recalcula e atualiza cache se estale.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_summary(uuid);
CREATE OR REPLACE FUNCTION public.dashboard_summary(empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result       JSONB;
  v_cached     mv_dashboard_summary%ROWTYPE;
  v_total_os   bigint;
  v_os_abertas bigint;
  v_os_fechadas bigint;
  v_custo_mes  numeric(14,2);
  v_mttr       numeric(8,2);
  v_mtbf       numeric(8,2);
  v_backlog    bigint;
  v_disp       numeric(6,2);
BEGIN
  -- ACCESS CHECK
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND (user_roles.empresa_id = dashboard_summary.empresa_id
           OR role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI'))
  ) THEN
    RAISE EXCEPTION 'Forbidden: sem acesso a esta empresa';
  END IF;

  -- Tenta cache (SECURITY DEFINER bypassa o deny_all RLS)
  SELECT * INTO v_cached
  FROM public.mv_dashboard_summary
  WHERE mv_dashboard_summary.empresa_id = dashboard_summary.empresa_id;

  IF FOUND AND v_cached.refreshed_at >= now() - INTERVAL '6 minutes' THEN
    -- Cache hit: retorna sem tocar nas tabelas principais
    RETURN jsonb_build_object(
      'total_os',          v_cached.total_os,
      'os_abertas',        v_cached.os_abertas,
      'os_fechadas',       v_cached.os_fechadas,
      'custo_mes',         v_cached.custo_mes,
      'mttr_horas',        v_cached.mttr_horas,
      'mtbf_horas',        v_cached.mtbf_horas,
      'backlog',           v_cached.backlog,
      'disponibilidade_pct', v_cached.disponibilidade_pct,
      'cache_hit',         true,
      'refreshed_at',      v_cached.refreshed_at
    );
  END IF;

  -- Cache miss ou stale: recalcula ao vivo
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('ABERTA', 'EM_ANDAMENTO')),
    COUNT(*) FILTER (WHERE status = 'FECHADA'),
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', now())
                      THEN COALESCE(custo_estimado, 0) ELSE 0 END), 0)
  INTO v_total_os, v_os_abertas, v_os_fechadas, v_custo_mes
  FROM public.ordens_servico
  WHERE ordens_servico.empresa_id = dashboard_summary.empresa_id;

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (e.data_fim - e.data_inicio)) / 3600), 0)
  INTO v_mttr
  FROM public.execucoes_os e
  JOIN public.ordens_servico os ON os.id = e.os_id
  WHERE os.empresa_id = dashboard_summary.empresa_id
    AND e.data_fim IS NOT NULL;

  v_mtbf := CASE WHEN v_total_os > 0 THEN ROUND(720.0 / v_total_os, 1) ELSE 0 END;
  v_disp := CASE
    WHEN v_mtbf + v_mttr > 0 THEN ROUND(v_mtbf / (v_mtbf + v_mttr) * 100, 1)
    ELSE 100
  END;
  v_backlog := v_os_abertas;

  -- Atualiza o cache de forma assíncrona (melhor esforço)
  BEGIN
    INSERT INTO public.mv_dashboard_summary (
      empresa_id, total_os, os_abertas, os_fechadas,
      custo_mes, mttr_horas, mtbf_horas, backlog,
      disponibilidade_pct, refreshed_at
    )
    VALUES (
      dashboard_summary.empresa_id,
      v_total_os, v_os_abertas, v_os_fechadas,
      v_custo_mes, v_mttr, v_mtbf, v_backlog,
      v_disp, now()
    )
    ON CONFLICT (empresa_id) DO UPDATE SET
      total_os          = EXCLUDED.total_os,
      os_abertas        = EXCLUDED.os_abertas,
      os_fechadas       = EXCLUDED.os_fechadas,
      custo_mes         = EXCLUDED.custo_mes,
      mttr_horas        = EXCLUDED.mttr_horas,
      mtbf_horas        = EXCLUDED.mtbf_horas,
      backlog           = EXCLUDED.backlog,
      disponibilidade_pct = EXCLUDED.disponibilidade_pct,
      refreshed_at      = EXCLUDED.refreshed_at;
  EXCEPTION WHEN OTHERS THEN
    -- Falha no cache não pode quebrar o retorno ao usuário
    RAISE NOTICE '[dashboard_summary] cache update failed: %', SQLERRM;
  END;

  result := jsonb_build_object(
    'total_os',          v_total_os,
    'os_abertas',        v_os_abertas,
    'os_fechadas',       v_os_fechadas,
    'custo_mes',         v_custo_mes,
    'mttr_horas',        v_mttr,
    'mtbf_horas',        v_mtbf,
    'backlog',           v_backlog,
    'disponibilidade_pct', v_disp,
    'cache_hit',         false,
    'refreshed_at',      now()
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_summary(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. pg_cron: refresh a cada 5 minutos
-- ─────────────────────────────────────────────────────────────
DO $pgcron$
BEGIN
  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''refresh_all_dashboard_summaries''';
  EXECUTE 'SELECT cron.schedule(''refresh_all_dashboard_summaries'', ''*/5 * * * *'', ''SELECT public.refresh_all_dashboard_summaries()'')';
EXCEPTION WHEN OTHERS THEN
  -- pg_cron pode não estar disponível no plano free
  RAISE NOTICE '[cron] refresh_all_dashboard_summaries não agendado: %', SQLERRM;
END $pgcron$;

-- ─────────────────────────────────────────────────────────────
-- 7. Smoke test
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mv_dashboard_summary'
  ) = 1,
  'Smoke: tabela mv_dashboard_summary deve existir';

  ASSERT (
    SELECT COUNT(*) FROM pg_proc
    WHERE proname = 'refresh_mv_dashboard_summary' AND pronamespace = 'public'::regnamespace
  ) = 1,
  'Smoke: função refresh_mv_dashboard_summary deve existir';
END $$;

COMMIT;
