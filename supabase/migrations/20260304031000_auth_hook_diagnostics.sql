DO $$
DECLARE
  v_exists_auth_hook boolean;
  v_exists_public_hook boolean;
  v_auth_hook_owner text;
  v_public_hook_owner text;
  v_auth_config_enabled text;
  v_auth_config_uri text;
  v_instances_config text;
BEGIN
  SELECT to_regprocedure('auth.custom_access_token_hook(jsonb)') IS NOT NULL INTO v_exists_auth_hook;
  SELECT to_regprocedure('public.custom_access_token_hook(jsonb)') IS NOT NULL INTO v_exists_public_hook;

  RAISE NOTICE 'diag.auth_hook.exists=%', v_exists_auth_hook;
  RAISE NOTICE 'diag.public_hook.exists=%', v_exists_public_hook;

  IF v_exists_auth_hook THEN
    SELECT pg_get_userbyid(p.proowner)
      INTO v_auth_hook_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth'
      AND p.proname = 'custom_access_token_hook'
    LIMIT 1;

    RAISE NOTICE 'diag.auth_hook.owner=%', COALESCE(v_auth_hook_owner, 'null');
  END IF;

  IF v_exists_public_hook THEN
    SELECT pg_get_userbyid(p.proowner)
      INTO v_public_hook_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'custom_access_token_hook'
    LIMIT 1;

    RAISE NOTICE 'diag.public_hook.owner=%', COALESCE(v_public_hook_owner, 'null');
  END IF;

  IF to_regclass('auth.config') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT hook_custom_access_token_enabled::text, coalesce(hook_custom_access_token_uri::text, ''null'') FROM auth.config LIMIT 1'
      INTO v_auth_config_enabled, v_auth_config_uri;

      RAISE NOTICE 'diag.auth_config.enabled=%', COALESCE(v_auth_config_enabled, 'null');
      RAISE NOTICE 'diag.auth_config.uri=%', COALESCE(v_auth_config_uri, 'null');
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'diag.auth_config.read_error=%', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'diag.auth_config.exists=false';
  END IF;

  IF to_regclass('auth.instances') IS NOT NULL THEN
    BEGIN
      SELECT left(coalesce(raw_base_config, ''), 500)
      INTO v_instances_config
      FROM auth.instances
      LIMIT 1;

      RAISE NOTICE 'diag.auth_instances.raw_base_config_prefix=%', COALESCE(v_instances_config, 'null');
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'diag.auth_instances.read_error=%', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'diag.auth.instances.exists=false';
  END IF;

  IF v_exists_public_hook THEN
    BEGIN
      PERFORM public.custom_access_token_hook('{"claims":{}}'::jsonb);
      RAISE NOTICE 'diag.public_hook.call=ok';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'diag.public_hook.call_error=%', SQLERRM;
    END;
  END IF;
END;
$$;
