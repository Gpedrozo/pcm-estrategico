-- Fix any remaining public tables with empresa_id and RLS disabled.
-- This migration is idempotent and only touches unresolved tables.

DO $$
DECLARE
  v_table record;
  v_tenant_expr text := 'empresa_id = public.current_empresa_id()';
  v_admin_expr text;
  v_remaining integer;
BEGIN
  IF to_regprocedure('public.empresa_is_active(uuid)') IS NOT NULL THEN
    v_tenant_expr := '(empresa_id = public.current_empresa_id() AND public.empresa_is_active(empresa_id))';
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
    JOIN pg_class cls ON cls.relname = c.table_name
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND cls.relkind = 'r'
      AND cls.relrowsecurity = false
    GROUP BY c.table_schema, c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_table.table_schema, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', v_table.table_schema, v_table.table_name);

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

    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id()', v_table.table_schema, v_table.table_name);

    RAISE NOTICE 'RLS fixed for %.%', v_table.table_schema, v_table.table_name;
  END LOOP;

  SELECT COUNT(*)
    INTO v_remaining
  FROM information_schema.columns c
  JOIN pg_class cls ON cls.relname = c.table_name
  JOIN pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = c.table_schema
  WHERE c.table_schema = 'public'
    AND c.column_name = 'empresa_id'
    AND cls.relkind = 'r'
    AND cls.relrowsecurity = false;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Ainda restam % tabelas com empresa_id sem RLS habilitado', v_remaining;
  END IF;
END
$$;
