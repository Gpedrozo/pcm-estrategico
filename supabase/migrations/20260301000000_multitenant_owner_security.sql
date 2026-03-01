BEGIN;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'MASTER_TI';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (slug, name)
SELECT 'default', 'Tenant Default'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'default');

INSERT INTO public.tenants (slug, name)
SELECT 'owner', 'Owner Portal'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'owner');

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
    (SELECT id FROM public.tenants WHERE slug = 'default' LIMIT 1)
  );
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_read ON public.tenants;
CREATE POLICY tenants_read ON public.tenants FOR SELECT USING (true);

DO $$
DECLARE
  r record;
  default_tenant uuid;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants WHERE slug = 'default' LIMIT 1;

  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('tenants')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT %L', r.tablename, default_tenant);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', r.tablename);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', r.tablename);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', r.tablename || '_tenant_id_idx', r.tablename);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON public.%I', r.tablename);
    EXECUTE format('CREATE POLICY tenant_isolation ON public.%I USING (tenant_id = public.current_tenant_id())', r.tablename);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON public.%I FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id())', r.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, nome, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email), v_tenant_id);

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'USUARIO', v_tenant_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.current_tenant_id()
  )
$$;

COMMIT;
