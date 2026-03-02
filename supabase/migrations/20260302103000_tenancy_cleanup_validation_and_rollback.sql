BEGIN;

CREATE TABLE IF NOT EXISTS public.migration_validation_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  validation_started_at timestamptz NOT NULL DEFAULT now(),
  validation_ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.migration_validation_windows (migration_name, validation_ends_at, status, notes)
SELECT
  '20260302093000_series_a_foundation_unified_tenancy_rbac_audit',
  now() + interval '14 days',
  'open',
  'Janela de validação para remoção de tenant_id/tenants com plano de rollback funcional.'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.migration_validation_windows
  WHERE migration_name = '20260302093000_series_a_foundation_unified_tenancy_rbac_audit'
    AND status = 'open'
);

CREATE TABLE IF NOT EXISTS public.legacy_tenant_rollback_snapshot (
  empresa_id uuid PRIMARY KEY,
  tenant_slug text NOT NULL,
  tenant_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.legacy_tenant_rollback_snapshot (empresa_id, tenant_slug, tenant_name)
SELECT
  e.id,
  coalesce(nullif(regexp_replace(lower(e.slug), '[^a-z0-9_-]', '-', 'g'), ''), 'tenant-' || left(e.id::text, 8)) AS tenant_slug,
  e.nome
FROM public.empresas e
ON CONFLICT (empresa_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rollback_unified_tenancy_to_legacy()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_default_tenant uuid;
BEGIN
  CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  INSERT INTO public.tenants (id, slug, name)
  SELECT empresa_id, tenant_slug, tenant_name
  FROM public.legacy_tenant_rollback_snapshot
  ON CONFLICT (id) DO UPDATE
    SET slug = excluded.slug,
        name = excluded.name;

  SELECT id INTO v_default_tenant
  FROM public.tenants
  ORDER BY created_at ASC
  LIMIT 1;

  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE public.dados_empresa ADD COLUMN IF NOT EXISTS tenant_id uuid;

  UPDATE public.profiles p
  SET tenant_id = coalesce(p.tenant_id, p.empresa_id, v_default_tenant)
  WHERE p.tenant_id IS NULL;

  UPDATE public.user_roles ur
  SET tenant_id = coalesce(ur.tenant_id, ur.empresa_id, v_default_tenant)
  WHERE ur.tenant_id IS NULL;

  UPDATE public.dados_empresa de
  SET tenant_id = coalesce(de.tenant_id, de.id, v_default_tenant)
  WHERE de.tenant_id IS NULL;

  INSERT INTO public.audit_logs (action, table_name, record_id, source, severity, metadata)
  VALUES (
    'ROLLBACK_TENANCY_EXECUTED',
    'tenants',
    NULL,
    'migration',
    'critical',
    jsonb_build_object('at', now())
  );

  RETURN 'Rollback legacy tenancy scaffold executado com sucesso';
END;
$$;

COMMIT;
