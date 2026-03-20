-- Enforce strict tenant RLS in every table with empresa_id.
-- Objective: no row from one company can be visible or mutable by another company.

DO $$
DECLARE
  v_table record;
  v_policy record;
  v_tenant_expr text := 'empresa_id = public.current_empresa_id()';
  v_active_wrap boolean := false;
  v_admin_expr text;
BEGIN
  IF to_regprocedure('public.empresa_is_active(uuid)') IS NOT NULL THEN
    v_tenant_expr := '(empresa_id = public.current_empresa_id() AND public.empresa_is_active(empresa_id))';
    v_active_wrap := true;
  END IF;

  IF to_regprocedure('public.is_control_plane_operator()') IS NOT NULL THEN
    v_admin_expr := 'public.is_control_plane_operator()';
  ELSIF to_regprocedure('public.is_system_master()') IS NOT NULL THEN
    v_admin_expr := 'public.is_system_master()';
  ELSIF to_regprocedure('public.is_master_ti()') IS NOT NULL THEN
    v_admin_expr := 'public.is_master_ti()';
  ELSE
    v_admin_expr := 'false';
  END IF;

  FOR v_table IN
    SELECT c.table_schema, c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'empresa_id'
       AND t.table_type = 'BASE TABLE'
       AND c.table_name <> 'schema_migrations'
     GROUP BY c.table_schema, c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_table.table_schema, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', v_table.table_schema, v_table.table_name);

    -- Remove permissive legacy policies that allow cross-tenant access.
    FOR v_policy IN
      SELECT p.policyname
        FROM pg_policies p
       WHERE p.schemaname = v_table.table_schema
         AND p.tablename = v_table.table_name
         AND (
           lower(coalesce(trim(p.qual), '')) IN ('true', '(true)')
           OR lower(coalesce(trim(p.with_check), '')) IN ('true', '(true)')
         )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_policy.policyname, v_table.table_schema, v_table.table_name);
    END LOOP;

    -- Replace generic tenant policies with deterministic strict policies.
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I.%I', v_table.table_schema, v_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I.%I', v_table.table_schema, v_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I.%I', v_table.table_schema, v_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I.%I', v_table.table_schema, v_table.table_name);

    EXECUTE format(
      'CREATE POLICY tenant_select ON %I.%I FOR SELECT TO authenticated USING ((%s) OR (%s))',
      v_table.table_schema,
      v_table.table_name,
      v_tenant_expr,
      v_admin_expr
    );

    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I.%I FOR INSERT TO authenticated WITH CHECK ((%s) OR (%s))',
      v_table.table_schema,
      v_table.table_name,
      v_tenant_expr,
      v_admin_expr
    );

    EXECUTE format(
      'CREATE POLICY tenant_update ON %I.%I FOR UPDATE TO authenticated USING ((%s) OR (%s)) WITH CHECK ((%s) OR (%s))',
      v_table.table_schema,
      v_table.table_name,
      v_tenant_expr,
      v_admin_expr,
      v_tenant_expr,
      v_admin_expr
    );

    EXECUTE format(
      'CREATE POLICY tenant_delete ON %I.%I FOR DELETE TO authenticated USING ((%s) OR (%s))',
      v_table.table_schema,
      v_table.table_name,
      v_tenant_expr,
      v_admin_expr
    );

    -- Ensure empresa_id defaults to current tenant when not explicitly provided.
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id()', v_table.table_schema, v_table.table_name);

    IF v_active_wrap THEN
      RAISE NOTICE 'RLS strict applied with empresa_is_active to %.%', v_table.table_schema, v_table.table_name;
    ELSE
      RAISE NOTICE 'RLS strict applied to %.%', v_table.table_schema, v_table.table_name;
    END IF;
  END LOOP;
END
$$;

-- Fast verification helpers.
CREATE OR REPLACE VIEW public.v_rls_policies_permissive_true AS
SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.qual,
  p.with_check
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (
    lower(coalesce(trim(p.qual), '')) IN ('true', '(true)')
    OR lower(coalesce(trim(p.with_check), '')) IN ('true', '(true)')
  );

CREATE OR REPLACE VIEW public.v_tenant_tables_without_rls AS
SELECT
  c.table_schema,
  c.table_name
FROM information_schema.columns c
JOIN pg_class cls ON cls.relname = c.table_name
JOIN pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = c.table_schema
WHERE c.table_schema = 'public'
  AND c.column_name = 'empresa_id'
  AND cls.relkind = 'r'
  AND cls.relrowsecurity = false;
