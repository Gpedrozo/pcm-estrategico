ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';

CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = COALESCE(_user_id, auth.uid())
      AND role = 'SYSTEM_OWNER'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner_strict(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := COALESCE(_user_id, auth.uid());
  v_require_aal2 boolean := COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'require_aal2', '')::boolean, false);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.user_id = v_user_id
      AND ur.role = 'SYSTEM_OWNER'::public.app_role
      AND au.deleted_at IS NULL
      AND COALESCE(au.banned_until <= now(), true)
      AND (
        NOT v_require_aal2
        OR COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_system_owner_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_system_owners integer;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE')
    AND NEW.role = 'SYSTEM_OWNER'::public.app_role
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
    AND NOT public.is_system_owner_strict() THEN
    RAISE EXCEPTION 'Only SYSTEM_OWNER can grant SYSTEM_OWNER role';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.role = 'SYSTEM_OWNER'::public.app_role
    AND NEW.role <> 'SYSTEM_OWNER'::public.app_role
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
    AND NOT public.is_system_owner_strict() THEN
    RAISE EXCEPTION 'Only SYSTEM_OWNER can revoke SYSTEM_OWNER role';
  END IF;

  IF (
    TG_OP = 'DELETE' AND OLD.role = 'SYSTEM_OWNER'::public.app_role
  ) OR (
    TG_OP = 'UPDATE' AND OLD.role = 'SYSTEM_OWNER'::public.app_role AND NEW.role <> 'SYSTEM_OWNER'::public.app_role
  ) THEN
    SELECT COUNT(*)
    INTO remaining_system_owners
    FROM public.user_roles
    WHERE role = 'SYSTEM_OWNER'::public.app_role
      AND id <> OLD.id;

    IF remaining_system_owners = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last SYSTEM_OWNER';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS guard_system_owner_role_changes ON public.user_roles;
CREATE TRIGGER guard_system_owner_role_changes
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_system_owner_role_changes();

DO $$
DECLARE
  enterprise_table record;
BEGIN
  FOR enterprise_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'enterprise\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM public;', enterprise_table.schemaname, enterprise_table.tablename);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', enterprise_table.schemaname, enterprise_table.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "System owners only" ON %I.%I;', enterprise_table.schemaname, enterprise_table.tablename);
    EXECUTE format(
      'CREATE POLICY "System owners only" ON %I.%I FOR ALL USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());',
      enterprise_table.schemaname,
      enterprise_table.tablename
    );
  END LOOP;
END;
$$;
