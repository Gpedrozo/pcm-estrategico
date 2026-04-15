-- ============================================================
-- Fase 2-C / Item 2.8 — 2026-04-14
-- Soft-delete em empresas: delete_company passa a marcar
-- (deleted_at, deleted_by) em vez de apagar imediatamente.
-- Hard-delete real ocorre após 30 dias via pg_cron.
-- Inclui RPC de restore para window de 30 dias.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Colunas de soft-delete em empresas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid        DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_empresas_deleted_at
  ON public.empresas (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Atualiza RLS para excluir empresas soft-deletadas do acesso
--    normal (só SYSTEM_OWNER pode ver)
-- ─────────────────────────────────────────────────────────────
-- A policy principal de acesso a empresas geralmente vem de
-- migrations anteriores. Aqui adicionamos uma policy restritiva
-- que bloqueia registros deleted_at IS NOT NULL para roles
-- non-owner.
DROP POLICY IF EXISTS deny_soft_deleted_empresas ON public.empresas;
CREATE POLICY deny_soft_deleted_empresas
  ON public.empresas
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: soft_delete_empresa (chamada pelo owner-portal-admin)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_empresa(
  p_empresa_id  uuid,
  p_actor_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa empresas%ROWTYPE;
BEGIN
  -- Somente SYSTEM_OWNER / SYSTEM_ADMIN pode invocar
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_actor_id
      AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Forbidden: apenas SYSTEM_OWNER ou SYSTEM_ADMIN podem excluir empresas';
  END IF;

  SELECT * INTO v_empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada: %', p_empresa_id;
  END IF;

  IF v_empresa.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Empresa % já foi marcada para exclusão em %', p_empresa_id, v_empresa.deleted_at;
  END IF;

  UPDATE public.empresas
  SET
    deleted_at = now(),
    deleted_by = p_actor_id,
    status     = 'deleted',
    updated_at = now()
  WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'empresa_id',   p_empresa_id,
    'empresa_nome', v_empresa.nome,
    'deleted_at',   now(),
    'purge_after',  (now() + INTERVAL '30 days')::text,
    'action',       'soft_deleted'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_empresa(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_empresa(uuid, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: restore_empresa (janela de 30 dias)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_empresa(
  p_empresa_id uuid,
  p_actor_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa empresas%ROWTYPE;
BEGIN
  -- Somente SYSTEM_OWNER / SYSTEM_ADMIN pode restaurar
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_actor_id
      AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Forbidden: apenas SYSTEM_OWNER ou SYSTEM_ADMIN podem restaurar empresas';
  END IF;

  -- Bypass RESTRICTIVE policy: busca diretamente pelo service_role context
  SELECT * INTO v_empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada: %', p_empresa_id;
  END IF;

  IF v_empresa.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Empresa % não está marcada para exclusão — restauração desnecessária.', p_empresa_id;
  END IF;

  IF v_empresa.deleted_at < now() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'Janela de restauração expirada para a empresa % (excluída em %)',
      p_empresa_id, v_empresa.deleted_at;
  END IF;

  UPDATE public.empresas
  SET
    deleted_at = NULL,
    deleted_by = NULL,
    status     = 'active',
    updated_at = now()
  WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'empresa_id',   p_empresa_id,
    'empresa_nome', v_empresa.nome,
    'restored_at',  now(),
    'action',       'restored'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_empresa(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_empresa(uuid, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Função de hard-delete após 30 dias (chamada pelo pg_cron)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_empresas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, nome, deleted_at
    FROM public.empresas
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - INTERVAL '30 days'
  LOOP
    BEGIN
      -- Registra intenção antes de deletar
      INSERT INTO public.enterprise_audit_logs (
        empresa_id, action_type, severity, source, details
      ) VALUES (
        r.id,
        'SYSTEM_HARD_DELETE_EMPRESA',
        'critical',
        'purge_soft_deleted_empresas',
        jsonb_build_object(
          'empresa_id', r.id,
          'empresa_nome', r.nome,
          'soft_deleted_at', r.deleted_at,
          'purged_at', now()
        )
      );

      DELETE FROM public.empresas WHERE id = r.id;

      RAISE NOTICE '[purge] Empresa % (%) hard-deletada após 30 dias.', r.nome, r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[purge] Falha ao hard-deletar empresa %: % — será retentado no próximo ciclo.', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_soft_deleted_empresas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_soft_deleted_empresas() TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. pg_cron: hard-delete diário às 03:00 UTC
-- ─────────────────────────────────────────────────────────────
DO $pgcron$
BEGIN
  EXECUTE 'SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = ''purge_soft_deleted_empresas''';
  EXECUTE 'SELECT cron.schedule(''purge_soft_deleted_empresas'', ''0 3 * * *'', ''SELECT public.purge_soft_deleted_empresas()'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[cron] purge_soft_deleted_empresas não agendado: %', SQLERRM;
END $pgcron$;

-- ─────────────────────────────────────────────────────────────
-- 7. Smoke test
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND column_name IN ('deleted_at', 'deleted_by')
  ) = 2,
  'Smoke: colunas deleted_at e deleted_by devem existir em empresas';

  ASSERT (
    SELECT COUNT(*) FROM pg_proc
    WHERE proname = 'soft_delete_empresa' AND pronamespace = 'public'::regnamespace
  ) = 1,
  'Smoke: função soft_delete_empresa deve existir';

  ASSERT (
    SELECT COUNT(*) FROM pg_proc
    WHERE proname = 'restore_empresa' AND pronamespace = 'public'::regnamespace
  ) = 1,
  'Smoke: função restore_empresa deve existir';
END $$;

COMMIT;
