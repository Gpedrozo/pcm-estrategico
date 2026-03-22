BEGIN;

DO $$
DECLARE
  v_has_auth_config boolean;
  v_has_auth_instances boolean;
BEGIN
  -- 1) Force no-op hooks (auth/public) when permissions allow.
  BEGIN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = auth, public
      AS $hook$
      BEGIN
        RETURN event;
      END;
      $hook$
    $fn$;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'auth.custom_access_token_hook could not be altered in this environment.';
  END;

  BEGIN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $hook$
      BEGIN
        RETURN event;
      END;
      $hook$
    $fn$;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'public.custom_access_token_hook could not be altered in this environment.';
  END;

  -- 2) Apply grants only for roles that exist in the project.
  BEGIN
    IF to_regprocedure('auth.custom_access_token_hook(jsonb)') IS NOT NULL THEN
      EXECUTE 'REVOKE ALL ON FUNCTION auth.custom_access_token_hook(jsonb) FROM PUBLIC';
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO postgres';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO supabase_admin';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO service_role';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO authenticator';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO supabase_auth_admin';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO authenticated';
      END IF;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_function THEN
      RAISE NOTICE 'Could not update grants for auth.custom_access_token_hook.';
  END;

  BEGIN
    IF to_regprocedure('public.custom_access_token_hook(jsonb)') IS NOT NULL THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC';
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_admin';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticator';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated';
      END IF;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_function THEN
      RAISE NOTICE 'Could not update grants for public.custom_access_token_hook.';
  END;

  -- 3) Disable custom access token hook in auth.config (newer/legacy columns).
  v_has_auth_config := to_regclass('auth.config') IS NOT NULL;
  IF v_has_auth_config THEN
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_enabled'
      ) THEN
        EXECUTE 'UPDATE auth.config SET hook_custom_access_token_enabled = false';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_uri'
      ) THEN
        EXECUTE 'UPDATE auth.config SET hook_custom_access_token_uri = NULL';
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'No privilege to update auth.config.';
    END;
  END IF;

  -- 4) Disable hook in auth.instances raw_base_config JSON (all known key variants).
  v_has_auth_instances := to_regclass('auth.instances') IS NOT NULL;
  IF v_has_auth_instances THEN
    BEGIN
      UPDATE auth.instances
      SET raw_base_config = (
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(NULLIF(raw_base_config, '')::jsonb, '{}'::jsonb),
                    '{HOOK_CUSTOM_ACCESS_TOKEN_ENABLED}',
                    'false'::jsonb,
                    true
                  ),
                  '{hook_custom_access_token_enabled}',
                  'false'::jsonb,
                  true
                ),
                '{HOOK_CUSTOM_ACCESS_TOKEN_URI}',
                'null'::jsonb,
                true
              ),
              '{hook_custom_access_token_uri}',
              'null'::jsonb,
              true
            ),
            '{hooks}',
            '{}'::jsonb,
            true
          ),
          '{hook}',
          '{}'::jsonb,
          true
        )::text
      );
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'No privilege to update auth.instances.';
    END;
  END IF;

  -- 5) Best-effort disable in auth.hooks table if present in this project.
  BEGIN
    IF to_regclass('auth.hooks') IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'hooks' AND column_name = 'enabled'
      ) THEN
        EXECUTE 'UPDATE auth.hooks SET enabled = false';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'hooks' AND column_name = 'uri'
      ) THEN
        EXECUTE 'UPDATE auth.hooks SET uri = NULL';
      END IF;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'No privilege to update auth.hooks.';
    WHEN undefined_table OR undefined_column THEN
      RAISE NOTICE 'auth.hooks shape not available in this project.';
  END;
END;
$$;

-- Diagnostics snapshot
DO $$
DECLARE
  v_auth_hook_exists boolean := to_regprocedure('auth.custom_access_token_hook(jsonb)') IS NOT NULL;
  v_public_hook_exists boolean := to_regprocedure('public.custom_access_token_hook(jsonb)') IS NOT NULL;
BEGIN
  RAISE NOTICE 'diag.auth_hook_exists=%', v_auth_hook_exists;
  RAISE NOTICE 'diag.public_hook_exists=%', v_public_hook_exists;
END;
$$;

COMMIT;
