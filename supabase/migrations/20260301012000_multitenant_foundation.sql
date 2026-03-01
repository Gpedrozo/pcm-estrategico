-- SaaS multi-tenant foundation (global + company roles) with hardened role management.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'empresa_role') THEN
    CREATE TYPE public.empresa_role AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'USER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role') THEN
    CREATE TYPE public.global_role AS ENUM ('MASTER_TI');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.empresa_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.empresa_role NOT NULL DEFAULT 'USER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.global_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.global_role NOT NULL DEFAULT 'MASTER_TI',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_executor uuid,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id uuid,
  logged_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure at least one company exists
INSERT INTO public.empresas (id, nome)
SELECT gen_random_uuid(), COALESCE((SELECT de.nome_empresa FROM public.dados_empresa de LIMIT 1), 'Empresa Padrao')
WHERE NOT EXISTS (SELECT 1 FROM public.empresas);

-- Data migration from legacy user_roles to new model (idempotent)
INSERT INTO public.global_roles (user_id, role)
SELECT ur.user_id, 'MASTER_TI'::public.global_role
FROM public.user_roles ur
WHERE ur.role = 'MASTER_TI'::public.app_role
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
SELECT
  (SELECT e.id FROM public.empresas e ORDER BY e.created_at ASC LIMIT 1),
  p.id,
  CASE
    WHEN ur.role = 'MASTER_TI'::public.app_role THEN 'OWNER'::public.empresa_role
    WHEN ur.role = 'ADMIN'::public.app_role THEN 'ADMIN'::public.empresa_role
    ELSE 'USER'::public.empresa_role
  END
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ON CONFLICT (empresa_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_global_role(_user_id uuid, _role public.global_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.global_roles gr
    WHERE gr.user_id = _user_id
      AND gr.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_empresa_role(
  _user_id uuid,
  _empresa_id uuid,
  _role public.empresa_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.user_id = _user_id
      AND eu.empresa_id = _empresa_id
      AND (
        eu.role = _role
        OR (eu.role = 'OWNER'::public.empresa_role)
        OR (eu.role = 'ADMIN'::public.empresa_role AND _role IN ('MANAGER'::public.empresa_role, 'USER'::public.empresa_role))
        OR (eu.role = 'MANAGER'::public.empresa_role AND _role = 'USER'::public.empresa_role)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_empresa_role_change_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_is_master boolean := public.has_global_role(v_actor, 'MASTER_TI'::public.global_role);
  v_is_owner boolean := public.has_empresa_role(v_actor, COALESCE(NEW.empresa_id, OLD.empresa_id), 'OWNER'::public.empresa_role);
  v_is_admin boolean := public.has_empresa_role(v_actor, COALESCE(NEW.empresa_id, OLD.empresa_id), 'ADMIN'::public.empresa_role);
  v_target_role public.empresa_role := COALESCE(NEW.role, OLD.role);
BEGIN
  IF v_is_master THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_is_owner THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_is_admin THEN
    IF v_target_role IN ('OWNER'::public.empresa_role, 'ADMIN'::public.empresa_role) THEN
      RAISE EXCEPTION 'ADMIN nao pode promover para ADMIN/OWNER';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Acesso negado para alteracao de papel de empresa';
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_empresa_role_change_allowed ON public.empresa_usuarios;
CREATE TRIGGER trg_assert_empresa_role_change_allowed
  BEFORE INSERT OR UPDATE OR DELETE ON public.empresa_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_empresa_role_change_allowed();

CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id_executor, acao, tabela, registro_id)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NULLIF(
      COALESCE(
        to_jsonb(NEW) ->> 'id',
        to_jsonb(OLD) ->> 'id',
        to_jsonb(NEW) ->> 'user_id',
        to_jsonb(OLD) ->> 'user_id'
      ),
      ''
    )::uuid
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_empresa_usuarios ON public.empresa_usuarios;
CREATE TRIGGER trg_audit_empresa_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.empresa_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

DROP TRIGGER IF EXISTS trg_audit_global_roles ON public.global_roles;
CREATE TRIGGER trg_audit_global_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.global_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master can manage global roles" ON public.global_roles;
CREATE POLICY "Master can manage global roles"
ON public.global_roles
FOR ALL
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Users can read own global role" ON public.global_roles;
CREATE POLICY "Users can read own global role"
ON public.global_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Tenant members can read companies" ON public.empresas;
CREATE POLICY "Tenant members can read companies"
ON public.empresas
FOR SELECT
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = empresas.id
      AND eu.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Master can manage companies" ON public.empresas;
CREATE POLICY "Master can manage companies"
ON public.empresas
FOR ALL
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Tenant members can read company users" ON public.empresa_usuarios;
CREATE POLICY "Tenant members can read company users"
ON public.empresa_usuarios
FOR SELECT
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = empresa_usuarios.empresa_id
      AND eu.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owner and master can manage company users" ON public.empresa_usuarios;
CREATE POLICY "Owner and master can manage company users"
ON public.empresa_usuarios
FOR ALL
USING (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'OWNER'::public.empresa_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'ADMIN'::public.empresa_role)
)
WITH CHECK (
  public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'OWNER'::public.empresa_role)
  OR public.has_empresa_role(auth.uid(), empresa_usuarios.empresa_id, 'ADMIN'::public.empresa_role)
);

DROP POLICY IF EXISTS "Audit visible to master and owners" ON public.audit_logs;
CREATE POLICY "Audit visible to master and owners"
ON public.audit_logs
FOR SELECT
USING (public.has_global_role(auth.uid(), 'MASTER_TI'::public.global_role));

DROP POLICY IF EXISTS "Audit insert by system" ON public.audit_logs;
CREATE POLICY "Audit insert by system"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Multi-tenant consolidated users view
DROP VIEW IF EXISTS public.users_full;
CREATE VIEW public.users_full AS
SELECT
  p.id,
  au.email,
  eu.empresa_id,
  eu.role AS role_empresa,
  gr.role AS role_global,
  p.nome,
  p.created_at,
  p.updated_at,
  CASE
    WHEN gr.role = 'MASTER_TI'::public.global_role THEN 'MASTER_TI'::public.app_role
    WHEN eu.role IN ('OWNER'::public.empresa_role, 'ADMIN'::public.empresa_role) THEN 'ADMIN'::public.app_role
    ELSE 'USUARIO'::public.app_role
  END AS role
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN public.empresa_usuarios eu ON eu.user_id = p.id
LEFT JOIN public.global_roles gr ON gr.user_id = p.id;

GRANT SELECT ON public.users_full TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_role(uuid, public.global_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_empresa_role(uuid, uuid, public.empresa_role) TO authenticated;

-- Integrity checker for tenant hardening
CREATE OR REPLACE FUNCTION public.tenant_integrity_check()
RETURNS TABLE(check_name text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    'tables_without_rls'::text,
    COUNT(*)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT IN ('schema_migrations')
    AND c.relrowsecurity = false

  UNION ALL

  SELECT
    'business_tables_without_empresa_id'::text,
    COUNT(*)
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('empresas', 'empresa_usuarios', 'global_roles', 'audit_logs', 'profiles', 'user_roles', 'auditoria')
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema
        AND c.table_name = t.table_name
        AND c.column_name = 'empresa_id'
    );
$$;

GRANT EXECUTE ON FUNCTION public.tenant_integrity_check() TO authenticated;
