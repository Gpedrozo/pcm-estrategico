BEGIN;

CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN event;
END;
$$;

REVOKE ALL ON FUNCTION auth.custom_access_token_hook(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO supabase_admin;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook(jsonb) TO service_role;

DO $$
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
END;
$$;

COMMIT;
