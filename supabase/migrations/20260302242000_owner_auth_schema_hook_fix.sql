BEGIN;

DO $$
BEGIN
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

    EXECUTE 'REVOKE ALL ON FUNCTION auth.custom_access_token_hook(jsonb) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO supabase_admin';
    EXECUTE 'GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO service_role';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para alterar auth.custom_access_token_hook; seguindo com hardening via auth.instances';
    WHEN undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'Schema auth indisponível para hook; seguindo com hardening via auth.instances';
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    IF to_regclass('auth.instances') IS NULL THEN
      RETURN;
    END IF;

    UPDATE auth.instances
    SET raw_base_config = (
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
      )::text
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para atualizar auth.instances';
    WHEN undefined_table OR invalid_schema_name THEN
      RAISE NOTICE 'Tabela auth.instances indisponível';
  END;
END;
$$;

COMMIT;
