BEGIN;

DO $$
DECLARE
  v_has_auth_config boolean;
  v_sql text;
BEGIN
  SELECT to_regclass('auth.config') IS NOT NULL INTO v_has_auth_config;

  IF v_has_auth_config THEN
    v_sql := 'UPDATE auth.config SET ';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_enabled'
    ) THEN
      v_sql := v_sql || 'hook_custom_access_token_enabled = false, ';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'hook_custom_access_token_uri'
    ) THEN
      v_sql := v_sql || 'hook_custom_access_token_uri = NULL, ';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'config' AND column_name = 'updated_at'
    ) THEN
      v_sql := v_sql || 'updated_at = now(), ';
    END IF;

    v_sql := regexp_replace(v_sql, ',\s*$', '');

    IF v_sql <> 'UPDATE auth.config SET' THEN
      EXECUTE v_sql;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('auth.instances') IS NOT NULL THEN
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
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sem privilégio para atualizar auth.instances';
END;
$$;

COMMIT;
