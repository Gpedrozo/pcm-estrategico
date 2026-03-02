BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_control_plane_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT coalesce(public.has_role(auth.uid(), 'MASTER_TI'::public.app_role), false)
      OR coalesce(public.has_role(auth.uid(), 'SYSTEM_OWNER'::public.app_role), false);
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS empresa_id uuid;

UPDATE public.profiles
SET empresa_id = coalesce(
  empresa_id,
  NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
)
WHERE empresa_id IS NULL;

UPDATE public.user_roles ur
SET empresa_id = coalesce(
  ur.empresa_id,
  p.empresa_id,
  (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
)
FROM public.profiles p
WHERE p.id = ur.user_id
  AND ur.empresa_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN empresa_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_empresa_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_empresa_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END $$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.dados_empresa DROP COLUMN IF EXISTS tenant_id;
DROP TABLE IF EXISTS public.tenants CASCADE;

CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role_id)
);

INSERT INTO public.rbac_roles (code, description, is_system)
VALUES
  ('USUARIO', 'Usuário padrão do tenant', true),
  ('ADMIN', 'Administrador do tenant', true),
  ('MASTER_TI', 'Operador técnico global', true),
  ('SYSTEM_OWNER', 'Control plane owner', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions (code, description)
VALUES
  ('tenant.read', 'Ler recursos do tenant'),
  ('tenant.write', 'Escrever recursos do tenant'),
  ('tenant.admin', 'Administrar tenant'),
  ('control_plane.read', 'Ler control plane'),
  ('control_plane.write', 'Administrar control plane'),
  ('security.manage', 'Gerenciar políticas e segurança'),
  ('billing.manage', 'Gerenciar billing e planos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON (
  (r.code = 'USUARIO' AND p.code IN ('tenant.read')) OR
  (r.code = 'ADMIN' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin')) OR
  (r.code = 'MASTER_TI' AND p.code IN ('tenant.read', 'tenant.write', 'control_plane.read', 'security.manage')) OR
  (r.code = 'SYSTEM_OWNER' AND p.code IN ('tenant.read', 'tenant.write', 'tenant.admin', 'control_plane.read', 'control_plane.write', 'security.manage', 'billing.manage'))
)
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_user_roles (user_id, empresa_id, role_id, granted_by)
SELECT ur.user_id, ur.empresa_id, rr.id, auth.uid()
FROM public.user_roles ur
JOIN public.rbac_roles rr ON rr.code = ur.role::text
ON CONFLICT (user_id, empresa_id, role_id) DO NOTHING;

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
      AND (
        uur.empresa_id IS NULL
        OR uur.empresa_id = p_empresa_id
        OR public.is_control_plane_operator()
      )
  );
$$;

ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_roles_read ON public.rbac_roles;
DROP POLICY IF EXISTS rbac_roles_manage ON public.rbac_roles;
CREATE POLICY rbac_roles_read ON public.rbac_roles
FOR SELECT TO authenticated
USING (public.is_control_plane_operator());
CREATE POLICY rbac_roles_manage ON public.rbac_roles
FOR ALL TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_permissions_read ON public.rbac_permissions;
DROP POLICY IF EXISTS rbac_permissions_manage ON public.rbac_permissions;
CREATE POLICY rbac_permissions_read ON public.rbac_permissions
FOR SELECT TO authenticated
USING (public.is_control_plane_operator());
CREATE POLICY rbac_permissions_manage ON public.rbac_permissions
FOR ALL TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_role_permissions_read ON public.rbac_role_permissions;
DROP POLICY IF EXISTS rbac_role_permissions_manage ON public.rbac_role_permissions;
CREATE POLICY rbac_role_permissions_read ON public.rbac_role_permissions
FOR SELECT TO authenticated
USING (public.is_control_plane_operator());
CREATE POLICY rbac_role_permissions_manage ON public.rbac_role_permissions
FOR ALL TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

DROP POLICY IF EXISTS rbac_user_roles_read ON public.rbac_user_roles;
DROP POLICY IF EXISTS rbac_user_roles_manage ON public.rbac_user_roles;
CREATE POLICY rbac_user_roles_read ON public.rbac_user_roles
FOR SELECT TO authenticated
USING (
  public.is_control_plane_operator()
  OR user_id = auth.uid()
  OR empresa_id = public.get_current_empresa_id()
);
CREATE POLICY rbac_user_roles_manage ON public.rbac_user_roles
FOR ALL TO authenticated
USING (public.is_control_plane_operator())
WITH CHECK (public.is_control_plane_operator());

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS correlation_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_email text,
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON public.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_id ON public.audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_read ON public.audit_logs
FOR SELECT TO authenticated
USING (
  public.is_control_plane_operator()
  OR empresa_id = public.get_current_empresa_id()
);
CREATE POLICY audit_logs_insert ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.is_control_plane_operator()
    OR empresa_id = public.get_current_empresa_id()
  )
);

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
    acao,
    tabela,
    registro_id,
    user_id_executor,
    logged_at,
    correlation_id,
    actor_user_id,
    actor_email,
    empresa_id,
    severity,
    source,
    metadata,
    created_at
  )
  VALUES (
    p_action,
    p_table,
    p_record_id,
    auth.uid(),
    now(),
    p_correlation_id,
    auth.uid(),
    auth.jwt() ->> 'email',
    p_empresa_id,
    p_severity,
    p_source,
    p_metadata,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.app_write_audit_log(text, text, text, uuid, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_write_audit_log(text, text, text, uuid, text, text, jsonb, uuid) TO authenticated;

COMMIT;
