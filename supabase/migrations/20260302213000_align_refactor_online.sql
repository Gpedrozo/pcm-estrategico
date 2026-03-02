-- 20260302213000_align_refactor_online.sql
-- Alinhamento idempotente do refatoramento no Supabase online

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.ordens_servico
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE IF EXISTS public.planos_preventivos
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE IF EXISTS public.execucoes_os
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

DO $$
DECLARE
  v_fk_column text;
BEGIN
  SELECT c.column_name
  INTO v_fk_column
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'ordens_servico'
    AND c.column_name IN ('created_by', 'usuario_abertura', 'user_id')
  ORDER BY CASE c.column_name
    WHEN 'created_by' THEN 1
    WHEN 'usuario_abertura' THEN 2
    WHEN 'user_id' THEN 3
    ELSE 99
  END
  LIMIT 1;

  IF v_fk_column IS NOT NULL THEN
    EXECUTE format(
      $f$
      UPDATE public.ordens_servico os
      SET empresa_id = COALESCE(
        os.empresa_id,
        (SELECT p.empresa_id FROM public.profiles p WHERE p.id = os.%I LIMIT 1),
        (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
      )
      WHERE os.empresa_id IS NULL
      $f$,
      v_fk_column
    );
  ELSE
    UPDATE public.ordens_servico os
    SET empresa_id = COALESCE(
      os.empresa_id,
      (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
    )
    WHERE os.empresa_id IS NULL;
  END IF;
END
$$;

UPDATE public.planos_preventivos pp
SET empresa_id = COALESCE(
  pp.empresa_id,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
)
WHERE pp.empresa_id IS NULL;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  source text NOT NULL DEFAULT 'app',
  severity text NOT NULL DEFAULT 'info',
  actor_user_id uuid,
  actor_email text,
  correlation_id uuid DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  table_name text,
  operation text,
  record_id text,
  actor_id uuid,
  action_type text,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'system',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created
  ON public.audit_logs (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_created
  ON public.enterprise_audit_logs (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_status
  ON public.ordens_servico (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_planos_preventivos_empresa_proxima
  ON public.planos_preventivos (empresa_id, proxima_execucao);

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
    (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1),
    (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_permission_code text,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_roles uur
    JOIN public.rbac_role_permissions urp ON urp.role_id = uur.role_id
    JOIN public.rbac_permissions p ON p.id = urp.permission_id
    WHERE uur.user_id = auth.uid()
      AND p.code = p_permission_code
      AND (uur.empresa_id IS NULL OR uur.empresa_id = p_empresa_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_action text,
  p_table text,
  p_record_id text DEFAULT NULL,
  p_empresa_id uuid DEFAULT public.get_current_empresa_id(),
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'app',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  INSERT INTO public.audit_logs (
    action, table_name, record_id, empresa_id, severity, source,
    actor_user_id, actor_email, correlation_id, metadata, created_at
  )
  VALUES (
    p_action, p_table, p_record_id, p_empresa_id, p_severity, p_source,
    auth.uid(), auth.jwt() ->> 'email', p_correlation_id, p_metadata, now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read_audit_logs ON public.audit_logs;
CREATE POLICY tenant_read_audit_logs
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  empresa_id = public.get_current_empresa_id()
  OR public.has_permission('control_plane.read', public.get_current_empresa_id())
);

DROP POLICY IF EXISTS tenant_insert_audit_logs ON public.audit_logs;
CREATE POLICY tenant_insert_audit_logs
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id = public.get_current_empresa_id()
  OR public.has_permission('control_plane.write', public.get_current_empresa_id())
);

DROP POLICY IF EXISTS tenant_read_enterprise_audit_logs ON public.enterprise_audit_logs;
CREATE POLICY tenant_read_enterprise_audit_logs
ON public.enterprise_audit_logs FOR SELECT
TO authenticated
USING (
  empresa_id = public.get_current_empresa_id()
  OR public.has_permission('control_plane.read', public.get_current_empresa_id())
);

COMMIT;
