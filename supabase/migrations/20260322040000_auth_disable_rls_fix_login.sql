CREATE OR REPLACE FUNCTION public.auth_role_membership_full_probe()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_members jsonb := '[]'::jsonb;
  rec record;
BEGIN
  FOR rec IN
    SELECT r.rolname as member_role, m.rolname as parent_role
    FROM pg_auth_members am
    JOIN pg_roles r ON r.oid = am.member
    JOIN pg_roles m ON m.oid = am.roleid
    WHERE r.rolname IN ('postgres','supabase_auth_admin','supabase_admin','authenticator','service_role','anon','authenticated')
       OR m.rolname IN ('postgres','supabase_auth_admin','supabase_admin','authenticator','service_role','anon','authenticated')
    ORDER BY r.rolname, m.rolname
  LOOP
    v_members := v_members || jsonb_build_array(jsonb_build_object('member',rec.member_role,'parent',rec.parent_role));
  END LOOP;
  RETURN jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'memberships', v_members,
    'postgres_can_set_supabase_admin', pg_has_role('postgres','supabase_admin','SET'),
    'postgres_can_set_auth_admin', pg_has_role('postgres','supabase_auth_admin','SET'),
    'supabase_admin_bypassrls', (SELECT rolbypassrls FROM pg_roles WHERE rolname='supabase_admin'),
    'supabase_admin_superuser', (SELECT rolsuper FROM pg_roles WHERE rolname='supabase_admin')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.auth_role_membership_full_probe() TO service_role, anon, authenticated;