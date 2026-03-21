BEGIN;

-- Critical hardening for Supabase Security Advisor errors.
DO $$
BEGIN
  IF to_regclass('public.auth_session_transfer_tokens') IS NOT NULL THEN
    ALTER TABLE public.auth_session_transfer_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.auth_session_transfer_tokens FORCE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.auth_session_transfer_tokens FROM anon;
    REVOKE ALL ON TABLE public.auth_session_transfer_tokens FROM authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_session_transfer_tokens TO service_role;

    DROP POLICY IF EXISTS auth_session_transfer_tokens_service_select ON public.auth_session_transfer_tokens;
    DROP POLICY IF EXISTS auth_session_transfer_tokens_service_manage ON public.auth_session_transfer_tokens;

    CREATE POLICY auth_session_transfer_tokens_service_select
      ON public.auth_session_transfer_tokens
      FOR SELECT
      TO service_role
      USING (true);

    CREATE POLICY auth_session_transfer_tokens_service_manage
      ON public.auth_session_transfer_tokens
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.owner_impersonation_sessions') IS NOT NULL THEN
    ALTER TABLE public.owner_impersonation_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.owner_impersonation_sessions FORCE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.owner_impersonation_sessions FROM anon;
    REVOKE ALL ON TABLE public.owner_impersonation_sessions FROM authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_impersonation_sessions TO service_role;

    DROP POLICY IF EXISTS owner_impersonation_sessions_service_select ON public.owner_impersonation_sessions;
    DROP POLICY IF EXISTS owner_impersonation_sessions_service_manage ON public.owner_impersonation_sessions;

    CREATE POLICY owner_impersonation_sessions_service_select
      ON public.owner_impersonation_sessions
      FOR SELECT
      TO service_role
      USING (true);

    CREATE POLICY owner_impersonation_sessions_service_manage
      ON public.owner_impersonation_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.login_attempts') IS NOT NULL THEN
    ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.login_attempts FROM anon;
    REVOKE ALL ON TABLE public.login_attempts FROM authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.login_attempts TO service_role;

    DROP POLICY IF EXISTS login_attempts_service_select ON public.login_attempts;
    DROP POLICY IF EXISTS login_attempts_service_manage ON public.login_attempts;

    CREATE POLICY login_attempts_service_select
      ON public.login_attempts
      FOR SELECT
      TO service_role
      USING (true);

    CREATE POLICY login_attempts_service_manage
      ON public.login_attempts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.db_cleanup_runs') IS NOT NULL THEN
    ALTER TABLE public.db_cleanup_runs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.db_cleanup_runs FORCE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.db_cleanup_runs FROM anon;
    REVOKE ALL ON TABLE public.db_cleanup_runs FROM authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.db_cleanup_runs TO service_role;

    DROP POLICY IF EXISTS db_cleanup_runs_service_select ON public.db_cleanup_runs;
    DROP POLICY IF EXISTS db_cleanup_runs_service_manage ON public.db_cleanup_runs;

    CREATE POLICY db_cleanup_runs_service_select
      ON public.db_cleanup_runs
      FOR SELECT
      TO service_role
      USING (true);

    CREATE POLICY db_cleanup_runs_service_manage
      ON public.db_cleanup_runs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.db_cleanup_run_items') IS NOT NULL THEN
    ALTER TABLE public.db_cleanup_run_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.db_cleanup_run_items FORCE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.db_cleanup_run_items FROM anon;
    REVOKE ALL ON TABLE public.db_cleanup_run_items FROM authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.db_cleanup_run_items TO service_role;

    DROP POLICY IF EXISTS db_cleanup_run_items_service_select ON public.db_cleanup_run_items;
    DROP POLICY IF EXISTS db_cleanup_run_items_service_manage ON public.db_cleanup_run_items;

    CREATE POLICY db_cleanup_run_items_service_select
      ON public.db_cleanup_run_items
      FOR SELECT
      TO service_role
      USING (true);

    CREATE POLICY db_cleanup_run_items_service_manage
      ON public.db_cleanup_run_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.subscription_payments') IS NOT NULL THEN
    ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.subscription_payments FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS subscription_payments_select ON public.subscription_payments;
    DROP POLICY IF EXISTS subscription_payments_manage ON public.subscription_payments;

    CREATE POLICY subscription_payments_select ON public.subscription_payments
      FOR SELECT USING (
        public.is_control_plane_operator()
        OR EXISTS (
          SELECT 1
          FROM public.subscriptions s
          WHERE s.id = subscription_id
            AND s.empresa_id = public.get_current_empresa_id()
        )
      );

    CREATE POLICY subscription_payments_manage ON public.subscription_payments
      FOR ALL USING (public.is_control_plane_operator())
      WITH CHECK (public.is_control_plane_operator());
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.v_dashboard_kpis') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_dashboard_kpis SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.v_ordens_servico_sla') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_ordens_servico_sla SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.v_custos_orcado_realizado') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_custos_orcado_realizado SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.v_rls_policies_permissive_true') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_rls_policies_permissive_true SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.v_tenant_tables_without_rls') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_tenant_tables_without_rls SET (security_invoker = true)';
  END IF;
END;
$$;

COMMIT;